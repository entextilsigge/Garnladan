-- ---------------------------------------------------------------------------
-- Lägger till en explicit ordningskolumn för färgvarianter.
--
-- Utan den här returnerar Postgres/PostgREST product_variants i en
-- odefinierad ordning (inte nödvändigtvis insättningsordning) — upptäckt
-- vid test: efter en produktredigering (som tar bort och lägger till om
-- alla varianter, se updateProduct i lib/data/productStore.ts) kom
-- färgerna tillbaka i alfabetisk ordning istället för den ordning admin
-- ursprungligen la in dem i, vilket skulle synas som att färgprickarna på
-- produktsidan bytt ordning efter varje sparande.
--
-- Kör i Supabase SQL Editor efter 0001_initial_schema.sql.
-- ---------------------------------------------------------------------------

alter table product_variants add column position int not null default 0;

-- Fyll i en stabil ordning för redan seedad data, baserat på nuvarande
-- (odefinierade) radordning — bättre än att alla har position 0.
with numbered as (
  select id, row_number() over (partition by product_id order by id) - 1 as rn
  from product_variants
)
update product_variants
set position = numbered.rn
from numbered
where product_variants.id = numbered.id;
