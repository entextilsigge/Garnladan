-- ---------------------------------------------------------------------------
-- Fraktjakt-integration (uppdrag 15).
--
-- settings: två admin-konfigurerbara shipping_product_id (Fraktjakts eget
-- tjänste-id, hittas via GET https://api.fraktjakt.se/shipping_products/xml_list)
-- — ett för "PostNord — ombud" och ett för "PostNord — hemleverans". Måste
-- sättas manuellt av admin eftersom id:na är kontospecifika (beror på vilka
-- tjänster som aktiverats i Fraktjakt-kontot) — går inte att gissa/hårdkoda.
--
-- orders: Fraktjakts egna sändnings-id + access_code sparas så att
-- fraktsedeln (etikett-PDF) kan hämtas på nytt när som helst utan att skapa
-- en ny sändning — se lib/fraktjakt.ts.
-- ---------------------------------------------------------------------------

alter table settings add column fraktjakt_ombud_product_id int;
alter table settings add column fraktjakt_hem_product_id int;

alter table orders add column fraktjakt_shipment_id int;
alter table orders add column fraktjakt_access_code text;
