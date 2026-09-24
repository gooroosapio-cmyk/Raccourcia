#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Repetition du lot payload-unique sur le catalogue V5 reconstitue.
#
# Monte un cluster neuf, applique toutes les migrations, charge le replica
# de production et les lots V5 — l'etat actuel de la production — puis passe
# le lot payload-unique deux fois. Controle ensuite, carte par carte, que le
# texte servi a chaque IA est le texte canonique et qu'il est identique a
# celui que cette IA recevait avant. Enchaine le lot qui archive les
# variantes par IA, et verifie que rien de ce qui est servi ne change.
#
#   ./tests/db/repetition-payload-unique.sh
# ---------------------------------------------------------------------------
set -euo pipefail

PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKDIR="${PGTEST_DIR:-/tmp/raccourcia-payload}"
DATA_DIR="$WORKDIR/data"; SOCKET_DIR="$WORKDIR/socket"; DB_NAME="raccourcia_payload"

cleanup() { "$PG_BIN/pg_ctl" -D "$DATA_DIR" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORKDIR"; }
trap cleanup EXIT
rm -rf "$WORKDIR"; mkdir -p "$DATA_DIR" "$SOCKET_DIR"

RUNAS=""
if [[ "$(id -u)" -eq 0 ]]; then
  RUNAS="setpriv --reuid=postgres --regid=postgres --clear-groups"
  chown -R postgres:postgres "$WORKDIR"
fi
run() { if [[ -n "$RUNAS" ]]; then $RUNAS "$@"; else "$@"; fi }

run "$PG_BIN/initdb" -D "$DATA_DIR" -U postgres --auth=trust --no-sync >/dev/null
run "$PG_BIN/pg_ctl" -D "$DATA_DIR" -o "-k $SOCKET_DIR -h '' -c fsync=off" -w start >/dev/null
export PGHOST="$SOCKET_DIR" PGUSER=postgres
PSQL=("$PG_BIN/psql" -v ON_ERROR_STOP=1 -q --no-psqlrc -h "$SOCKET_DIR" -U postgres -d "$DB_NAME")
run "$PG_BIN/createdb" -h "$SOCKET_DIR" -U postgres "$DB_NAME"

echo "==> Socle"
run "${PSQL[@]}" >/dev/null < "$ROOT/tests/db/supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do run "${PSQL[@]}" >/dev/null < "$f"; done
run "${PSQL[@]}" >/dev/null < "$ROOT/tests/db/fixtures.sql"


echo "==> Replica de production et catalogue V5"
run "${PSQL[@]}" >/dev/null < "$ROOT/tests/db/replica-v5.sql"
for f in "$ROOT"/supabase/seed/catalogue-final-v5/*.sql; do run "${PSQL[@]}" >/dev/null < "$f"; done

# Ce que chaque IA recevait avant : la reference a laquelle comparer.
run "${PSQL[@]}" -c "
create table public.avant_payload as
select p.id as prompt_id, a.key as ia, pv.payload
from public.prompts p
join public.prompt_variants v on v.prompt_id = p.id
join public.ai_providers a on a.id = v.provider_id and a.is_active
join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
where p.catalog_version = 'v5';" >/dev/null

for passe in 1 2; do
  echo "==> Passe $passe sur le lot payload-unique"
  for f in "$ROOT"/supabase/seed/payload-unique/*.sql; do
    run "${PSQL[@]}" < "$f"
  done
done

echo "==> Controles"
run "${PSQL[@]}" -c "
do \$verif\$
declare
  v_cartes integer; v_universelles integer; v_versions integer;
  v_ecarts integer; v_non_servies integer; v_actif boolean; v_hors_v5 integer;
begin
  select count(*) into v_cartes from public.prompts where catalog_version = 'v5';

  select count(*), count(pv.id) into v_universelles, v_versions
  from public.prompt_variants v
  join public.ai_providers a on a.id = v.provider_id and a.key = 'universel'
  left join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current;
  if v_universelles <> v_cartes or v_versions <> v_cartes then
    raise exception '% variantes universelles et % versions courantes pour % cartes.',
      v_universelles, v_versions, v_cartes;
  end if;

  -- Une passe de plus ne double rien.
  if (select count(*) from public.prompt_versions pv
        join public.prompt_variants v on v.id = pv.variant_id
        join public.ai_providers a on a.id = v.provider_id and a.key = 'universel') <> v_cartes then
    raise exception 'La seconde passe a ecrit une version de plus.';
  end if;

  -- Pour chaque IA, la variante servie est l'universelle.
  select count(*) into v_non_servies
  from public.prompts p cross join (values ('chatgpt'), ('gemini'), ('claude')) ia(k)
  where p.catalog_version = 'v5'
    and public.variante_servie(p.id, ia.k) is distinct from (
      select v.id from public.prompt_variants v
      join public.ai_providers a on a.id = v.provider_id and a.key = 'universel'
      where v.prompt_id = p.id);
  if v_non_servies > 0 then
    raise exception '% couples (carte, IA) ne servent pas la variante universelle.', v_non_servies;
  end if;

  -- Et le texte servi est celui que chaque IA recevait deja : rien ne change
  -- pour le membre, sinon que le texte ne depend plus de son IA.
  select count(*) into v_ecarts
  from public.avant_payload av
  join public.prompt_versions pv on pv.variant_id = public.variante_servie(av.prompt_id, av.ia)
    and pv.is_current
  where pv.payload is distinct from av.payload;
  if v_ecarts > 0 then
    raise exception '% textes servis different de ce que l IA recevait avant.', v_ecarts;
  end if;

  select is_active into v_actif from public.ai_providers where key = 'universel';
  if v_actif then raise exception 'Le fournisseur universel est actif.'; end if;

  -- Les cartes archivees, qui portent des textes divergents, ne sont pas touchees.
  select count(*) into v_hors_v5
  from public.prompt_variants v
  join public.ai_providers a on a.id = v.provider_id and a.key = 'universel'
  join public.prompts p on p.id = v.prompt_id
  where p.catalog_version is distinct from 'v5';
  if v_hors_v5 > 0 then
    raise exception '% cartes hors V5 ont recu une variante universelle.', v_hors_v5;
  end if;

  raise notice 'Payload unique : % cartes, un texte chacune, identique a l ancien pour les trois IA.', v_cartes;
end \$verif\$;"

# La suite : les variantes par IA s'archivent. Deux passes, meme exigence.
for passe in 1 2; do
  echo "==> Passe $passe sur le lot archiver-variantes-par-ia"
  for f in "$ROOT"/supabase/seed/archiver-variantes-par-ia/*.sql; do
    run "${PSQL[@]}" < "$f"
  done
done

echo "==> Controles apres archivage"
run "${PSQL[@]}" -c "
do \$verif\$
declare v_ecarts integer; v_publiees integer;
begin
  -- Le texte servi a chaque IA n'a pas bouge d'un caractere.
  select count(*) into v_ecarts
  from public.avant_payload av
  join public.prompt_versions pv on pv.variant_id = public.variante_servie(av.prompt_id, av.ia)
    and pv.is_current
  where pv.payload is distinct from av.payload;
  if v_ecarts > 0 then
    raise exception '% textes servis ont change avec l archivage.', v_ecarts;
  end if;

  select count(*) into v_publiees
  from public.prompt_variants v
  join public.ai_providers a on a.id = v.provider_id and a.key <> 'universel'
  join public.prompts p on p.id = v.prompt_id and p.catalog_version = 'v5'
  where v.status = 'published';
  if v_publiees > 0 then
    raise exception '% variantes par IA restent publiees sur des cartes V5.', v_publiees;
  end if;

  raise notice 'Archivage : variantes par IA archivees, textes servis inchanges.';
end \$verif\$;"
