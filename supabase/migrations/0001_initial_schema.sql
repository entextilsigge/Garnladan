-- ---------------------------------------------------------------------------
-- Garnladan — initialt Supabase-schema (uppdrag 13).
--
-- Kör hela filen i Supabase Dashboard → SQL Editor → New query, en gång,
-- mot ett NYTT/tomt Supabase-projekt. Idempotent-säker att köra igen är
-- den INTE (CREATE TABLE utan IF NOT EXISTS) — kör bara en gång per projekt.
--
-- Ersätter samtliga data/*.json-filer (som kraschar med EROFS i Vercels
-- serverless-miljö — skrivskyddat filsystem i produktion).
-- ---------------------------------------------------------------------------

-- Krävs för gen_random_uuid()
create extension if not exists pgcrypto;

-- =============================================================================
-- PRODUKTER
-- =============================================================================

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null,
  price numeric not null,
  compare_at_price numeric,
  cost_price numeric not null default 0,
  tagline text not null default '',
  description text not null default '',
  composition text not null default '',
  fibers text[] not null default '{}',
  weight_class text not null,
  meterage int not null default 0,
  grams int not null default 0,
  needle_size text not null default '',
  gauge text not null default '',
  care text not null default '',
  is_new boolean not null default false,
  popularity int not null default 0,
  image_url text,
  -- Uppladdade produktfoton (Vercel Blob) — samma form som tidigare
  -- Product.images: [{id, url, pathname}]. Enkel array-metadata, ingen
  -- egen tabell behövs eftersom den bara läses/skrivs som en helhet.
  images jsonb not null default '[]',
  -- Concurrency-skydd (uppdrag 12, nu på databasnivå): bumpas vid varje
  -- UPDATE. Ett sparande som skickar en gammal version avvisas av
  -- applikationskoden (UPDATE ... WHERE id = $1 AND version = $2).
  version int not null default 1,
  updated_at timestamptz not null default now()
);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  hex text not null,
  color_group text not null,
  stock int not null default 0 check (stock >= 0),
  unique (product_id, name)
);
create index product_variants_product_id_idx on product_variants(product_id);

-- =============================================================================
-- ORDRAR
-- =============================================================================

create table orders (
  -- Behåller det befintliga, kundvända ordernummer-formatet ("GL-XXXXXX")
  -- som textnyckel istället för ett internt uuid, eftersom det redan
  -- används i URL:er (packsedel, bekräftelsesida) och mejl.
  id text primary key,
  created_at timestamptz not null default now(),
  status text not null default 'vantar_packning',
  payment_status text not null default 'pending',
  payment_intent_id text,
  tracking_number text,
  customer_first_name text not null,
  customer_last_name text not null,
  customer_email text not null,
  customer_address text not null,
  customer_postal_code text not null,
  customer_city text not null,
  shipping_method text not null,
  shipping_label text not null,
  payment_method text not null,
  subtotal numeric not null,
  shipping_cost numeric not null,
  total numeric not null,
  attribution_source text not null default 'direkt',
  attribution_medium text not null default 'okänt',
  attribution_campaign text not null default 'okänd',
  -- Nycklar ("slug::colorName") för orderrader vars lager redan lagts
  -- tillbaka, så en rad inte krediteras dubbelt vid flera delåterbetalningar.
  restocked_item_keys text[] not null default '{}'
);
create index orders_created_at_idx on orders(created_at desc);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references orders(id) on delete cascade,
  slug text not null,
  name text not null,
  color_name text not null,
  quantity int not null,
  unit_price numeric not null
);
create index order_items_order_id_idx on order_items(order_id);

create table order_refunds (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  -- Stripes refund-id sätts först när Stripe-anropet faktiskt lyckats
  -- (se create_refund/finalize_refund nedan) — null medan en återbetalning
  -- är 'pending'.
  stripe_refund_id text,
  amount numeric not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now()
);
create index order_refunds_order_id_idx on order_refunds(order_id);

-- =============================================================================
-- CHECKOUT-SESSIONER (den akuta EROFS-kraschen)
-- =============================================================================

create table checkout_sessions (
  session_id text primary key,
  created_at timestamptz not null default now(),
  -- items/shipping/attribution sparas som jsonb — bärs bara vidare
  -- oförändrat mellan skapande och konsumtion, frågas aldrig på fältnivå.
  items jsonb not null,
  shipping jsonb not null,
  payment_method text not null,
  subtotal numeric not null,
  shipping_cost numeric not null,
  amount numeric not null,
  attribution jsonb not null
);

-- =============================================================================
-- KAMPANJER
-- =============================================================================

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null,
  start_date date not null,
  end_date date not null,
  budget numeric
);

-- =============================================================================
-- NYHETSBREV
-- =============================================================================

create table newsletter_subscribers (
  email text primary key,
  subscribed_at timestamptz not null default now()
);

-- =============================================================================
-- INSTÄLLNINGAR (singleton-tabell — alltid exakt en rad)
-- =============================================================================

create table settings (
  id int primary key default 1 check (id = 1),
  ombud_price numeric not null default 49,
  hem_price numeric not null default 89,
  free_shipping_enabled boolean not null default true,
  free_shipping_threshold numeric not null default 499
);
insert into settings (id) values (1);

-- =============================================================================
-- WEBHOOK-IDEMPOTENS (uppdrag 10 — filbaserad koll ersatt med unik constraint)
-- =============================================================================

create table webhook_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);

-- =============================================================================
-- FELLOGG
-- =============================================================================

create table error_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  message text not null,
  context text
);
create index error_logs_created_at_idx on error_logs(created_at desc);

-- =============================================================================
-- ATOMÄRA FUNKTIONER
-- =============================================================================

-- Lagerskydd (uppdrag 10): verifierar samtliga rader i en order INNAN någon
-- skrivning görs (allt-eller-inget), och låser varje berörd rad (FOR UPDATE)
-- för att stänga exakt det race som fil-baserade readAll/writeAll inte
-- kunde skydda mot över flera serverless-instanser. Hela funktionsanropet
-- är en enda transaktion — antingen committar allt, eller så rullas allt
-- tillbaka (t.ex. om ett senare item i loopen saknar täckning).
create or replace function reserve_stock(items jsonb)
returns jsonb
language plpgsql
as $$
declare
  item jsonb;
  v_stock int;
  v_name text;
begin
  -- Verifieringspass — låser varje rad så att en annan samtidig transaktion
  -- måste vänta tills den här är klar (commit eller rollback) innan den kan
  -- läsa/ändra samma rad.
  for item in select * from jsonb_array_elements(items)
  loop
    select pv.stock into v_stock
    from product_variants pv
    join products p on p.id = pv.product_id
    where p.slug = item->>'slug' and pv.name = item->>'colorName'
    for update;

    if v_stock is null then
      return jsonb_build_object(
        'ok', false,
        'error', coalesce(item->>'name', item->>'slug') || ' (' || (item->>'colorName') || ') hittades inte.'
      );
    end if;

    if v_stock < (item->>'quantity')::int then
      return jsonb_build_object(
        'ok', false,
        'error', coalesce(item->>'name', item->>'slug') || ' (' || (item->>'colorName') ||
          ') finns tyvärr inte i tillräckligt antal längre — lagret har ändrats sedan du lade den i varukorgen.'
      );
    end if;
  end loop;

  -- Skrivningspass — vi vet nu att samtliga rader har täckning.
  for item in select * from jsonb_array_elements(items)
  loop
    update product_variants pv
    set stock = pv.stock - (item->>'quantity')::int
    from products p
    where p.id = pv.product_id
      and p.slug = item->>'slug'
      and pv.name = item->>'colorName';
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;

-- Dubbel-återbetalningsskydd (uppdrag 8), tvåfas eftersom Stripe-anropet
-- (extern, långsamt, kan misslyckas) måste ske MELLAN kontroll och
-- slutgiltig bokföring:
--   1. reserve_refund   — låser ordern, kontrollerar återstående belopp
--                         (räknar även redan PENDING återbetalningar, så en
--                         andra samtidig förfrågan ser den första
--                         reservationen), infogar en 'pending'-rad.
--   2. (applikationskod anropar stripe.refunds.create HÄR, utanför
--      transaktionen — en DB-transaktion ska aldrig hålla ett lås öppet
--      över ett långsamt nätverksanrop)
--   3a. finalize_refund — Stripe lyckades: markera raden 'completed',
--       uppdatera orderns betalstatus.
--   3b. cancel_refund_reservation — Stripe misslyckades: ta bort
--       reservationen så beloppet blir tillgängligt igen.
create or replace function reserve_refund(p_order_id text, p_amount numeric, p_refund_id text)
returns jsonb
language plpgsql
as $$
declare
  v_total numeric;
  v_already_reserved numeric;
  v_remaining numeric;
begin
  select total into v_total from orders where id = p_order_id for update;
  if v_total is null then
    return jsonb_build_object('ok', false, 'error', 'Ordern hittades inte.');
  end if;

  select coalesce(sum(amount), 0) into v_already_reserved
  from order_refunds
  where order_id = p_order_id and status in ('pending', 'completed');

  v_remaining := v_total - v_already_reserved;

  if p_amount > v_remaining + 0.01 then
    return jsonb_build_object(
      'ok', false,
      'error', 'Beloppet överstiger vad som återstår att återbetala (' || v_remaining || ' kr).'
    );
  end if;

  insert into order_refunds (id, order_id, amount, status)
  values (p_refund_id, p_order_id, p_amount, 'pending');

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function finalize_refund(p_refund_id text, p_stripe_refund_id text)
returns jsonb
language plpgsql
as $$
declare
  v_order_id text;
  v_total numeric;
  v_completed numeric;
  v_new_status text;
begin
  update order_refunds
  set status = 'completed', stripe_refund_id = p_stripe_refund_id
  where id = p_refund_id
  returning order_id into v_order_id;

  if v_order_id is null then
    return jsonb_build_object('ok', false, 'error', 'Återbetalningsreservationen hittades inte.');
  end if;

  select total into v_total from orders where id = v_order_id;
  select coalesce(sum(amount), 0) into v_completed
  from order_refunds where order_id = v_order_id and status = 'completed';

  v_new_status := case when v_completed >= v_total then 'refunded' else 'partially_refunded' end;
  update orders set payment_status = v_new_status where id = v_order_id;

  return jsonb_build_object('ok', true, 'paymentStatus', v_new_status);
end;
$$;

create or replace function cancel_refund_reservation(p_refund_id text)
returns void
language sql
as $$
  delete from order_refunds where id = p_refund_id and status = 'pending';
$$;

-- Webhook-idempotens: unik constraint gör "har vi sett detta event.id förut"
-- till en atomär INSERT ... ON CONFLICT DO NOTHING istället för en
-- separat läs-sen-skriv (som teoretiskt kunde racea). Returnerar true om
-- eventet var NYTT (skulle processas), false om det redan fanns (skippa).
create or replace function mark_webhook_event_processed(p_event_id text)
returns boolean
language plpgsql
as $$
begin
  insert into webhook_events (event_id) values (p_event_id)
  on conflict (event_id) do nothing;
  return found;
end;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table products enable row level security;
alter table product_variants enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_refunds enable row level security;
alter table checkout_sessions enable row level security;
alter table campaigns enable row level security;
alter table newsletter_subscribers enable row level security;
alter table settings enable row level security;
alter table webhook_events enable row level security;
alter table error_logs enable row level security;

-- Enda publika läsvägen: produkter + färgvarianter, via anon-nyckeln.
-- Allt annat (inklusive ALL skrivning, även på produkter — admin-ändringar
-- sker uteslutande via service-role-nyckeln som kringgår RLS helt) har
-- ingen policy alls, vilket i Postgres RLS betyder "neka allt" som default.
create policy "Publik läsning av produkter" on products
  for select using (true);
create policy "Publik läsning av färgvarianter" on product_variants
  for select using (true);
