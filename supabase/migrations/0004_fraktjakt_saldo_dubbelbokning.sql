-- ---------------------------------------------------------------------------
-- Tillägg till Fraktjakt-integrationen (uppdrag 15):
--
--   1. Saldovarning — Fraktjakts API saknar en balance/saldo-endpoint
--      (kontrollerat mot den officiella API-dokumentationen v4.10.1 —
--      "Status API" är bara en drifts-koll (ALIVE/DEAD), inget kontosaldo).
--      Bygger därför en egen uppskattning: en logg över varje bokad frakts
--      UPPSKATTADE kostnad (Fraktjakts faktiskt debiterade belopp
--      returneras inte av Shipment- eller Track & Trace-API:erna vi
--      använder) plus en admin-inmatad "senast påfyllt till X kr"-
--      referenspunkt. Se lib/data/fraktjaktBalanceStore.ts.
--
--   2. Dubbelbokningsskydd — atomärt DB-lås (samma tvåfas-mönster som
--      reserve_refund i 0001_initial_schema.sql: lås INNAN det långsamma
--      externa Fraktjakt-anropet, som görs UTANFÖR transaktionen) så att
--      två nästan samtidiga "Skapa fraktsedel"-anrop för samma order inte
--      kan boka två sändningar. Se app/api/admin/orders/[id]/fraktsedel/route.ts.
-- ---------------------------------------------------------------------------

alter table settings add column fraktjakt_balance_threshold numeric not null default 500;
alter table settings add column fraktjakt_last_topup_amount numeric not null default 0;
alter table settings add column fraktjakt_last_topup_at timestamptz;

-- Uppskattad kostnad per fraktsedel, per tjänst — INTE Fraktjakts faktiska
-- pris (går inte att hämta via API:erna vi använder för bokning/spårning),
-- utan ett admin-inmatat schablonvärde som bara används för saldovarningen.
-- Default = samma belopp som kassans flat rate-pris, ett rimligt
-- startvärde tills admin justerat det mot verklig fakturering från
-- Fraktjakt.
alter table settings add column fraktjakt_estimated_cost_ombud numeric not null default 49;
alter table settings add column fraktjakt_estimated_cost_hem numeric not null default 89;

create table fraktjakt_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references orders(id) on delete cascade,
  shipment_id int not null,
  estimated_cost numeric not null,
  booked_at timestamptz not null default now()
);
create index fraktjakt_shipments_booked_at_idx on fraktjakt_shipments(booked_at desc);
alter table fraktjakt_shipments enable row level security;

-- "Bokning pågår"-lås för dubbelbokningsskyddet — null i normalfallet,
-- sätts till now() av reserve_fraktjakt_booking() precis innan det externa
-- Fraktjakt-anropet görs, och nollställs igen av antingen
-- release_fraktjakt_booking_lock() (vid fel) eller samma UPDATE som sparar
-- den lyckade sändningen (se saveFraktjaktShipment i lib/data/orderStore.ts).
alter table orders add column fraktjakt_booking_locked_at timestamptz;

-- Reserverar rätten att boka en fraktsedel för en order INNAN det externa
-- Fraktjakt-anropet görs:
--   - Redan bokad (fraktjakt_shipment_id satt) och INTE en medveten
--     ombokning (p_force) → kortslut, returnera den befintliga fraktsedeln
--     utan att någon kod ens försöker ringa Fraktjakt.
--   - Ett "bokning pågår"-lås yngre än 2 minuter finns redan → en annan
--     samtidig förfrågan hann före, avvisa den här.
--   - Annars → sätt låset och ge klartecken. Låser bara SELECT-raden under
--     denna enda transaktion (funktionsanropet), precis som reserve_refund
--     — det externa API-anropet sker sedan UTANFÖR transaktionen.
-- Ett lås äldre än 2 minuter (t.ex. efter en kraschad serverless-instans
-- mitt i ett Fraktjakt-anrop) räknas som övergivet och kan tas om, så en
-- riktig bugg aldrig kan låsa en order permanent.
create or replace function reserve_fraktjakt_booking(p_order_id text, p_force boolean default false)
returns jsonb
language plpgsql
as $$
declare
  v_shipment_id int;
  v_access_code text;
  v_tracking_number text;
  v_locked_at timestamptz;
begin
  select fraktjakt_shipment_id, fraktjakt_access_code, tracking_number, fraktjakt_booking_locked_at
  into v_shipment_id, v_access_code, v_tracking_number, v_locked_at
  from orders where id = p_order_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Ordern hittades inte.');
  end if;

  if not p_force and v_shipment_id is not null then
    return jsonb_build_object(
      'ok', false,
      'alreadyBooked', true,
      'shipmentId', v_shipment_id,
      'accessCode', v_access_code,
      'trackingNumber', v_tracking_number
    );
  end if;

  if v_locked_at is not null and v_locked_at > now() - interval '2 minutes' then
    return jsonb_build_object(
      'ok', false,
      'error', 'En bokning pågår redan för den här ordern hos Fraktjakt — vänta en liten stund och försök igen.'
    );
  end if;

  update orders set fraktjakt_booking_locked_at = now() where id = p_order_id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function release_fraktjakt_booking_lock(p_order_id text)
returns void
language sql
as $$
  update orders set fraktjakt_booking_locked_at = null where id = p_order_id;
$$;
