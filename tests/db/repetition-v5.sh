#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Repetition generale de la refonte V5 sur un Postgres jetable.
#
# Monte un cluster neuf, applique toutes les migrations, charge un replica de
# la production (memes identifiants, memes statuts, memes visuels), puis passe
# les 40 lots — deux fois, parce qu'un lot qui n'est pas rejouable n'est pas
# un lot.
#
#   ./tests/db/repetition-v5.sh
# ---------------------------------------------------------------------------
set -euo pipefail

PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKDIR="${PGTEST_DIR:-/tmp/raccourcia-v5}"
DATA_DIR="$WORKDIR/data"; SOCKET_DIR="$WORKDIR/socket"; DB_NAME="raccourcia_v5"

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

echo "==> Replica de production"
run "${PSQL[@]}" >/dev/null < "$ROOT/tests/db/replica-v5.sql"
run "${PSQL[@]}" -c "select 'avant : '||count(*)||' cartes, '||
  (select count(*) from public.prompt_media)||' visuels' from public.prompts;"

for passe in 1 2; do
  echo "==> Passe $passe sur les lots"
  for f in "$ROOT"/supabase/seed/catalogue-final-v5/*.sql; do
    printf '    %s' "$(basename "$f")"
    if run "${PSQL[@]}" >/dev/null < "$f"; then echo "  ok"; else echo "  ECHEC"; exit 1; fi
  done
done

echo "==> Etat final"
run "${PSQL[@]}" -c "select status, count(*) from public.prompts where catalog_version='v5' group by 1 order by 1;"
# Le rayon d'une carte est la racine de sa categorie : ses cartes sont
# rangees dans une collection, sauf celles du rayon de transition, qui sont
# rangees dans le rayon lui-meme.
run "${PSQL[@]}" -c "select racine.name as rayon,
       count(*) filter (where p.status='published') as publiees,
       count(*) filter (where p.status='draft') as brouillons,
       count(*) as total
  from public.prompts p
  join public.categories feuille on feuille.id = p.category_id
  join public.categories racine on racine.id = coalesce(feuille.parent_id, feuille.id)
  where p.catalog_version='v5' group by 1 order by 4 desc;"

run "${PSQL[@]}" -c "select 'visuels'   as quoi, count(*) from public.prompt_media
                     union all select 'actives hors V5', count(*) from public.prompts
                       where catalog_version is distinct from 'v5' and status <> 'archived'
                     union all select 'alias', count(*) from public.prompt_aliases
                     union all select 'champs', count(*) from public.prompt_fields;"
# --- Ce que la repartition doit tenir -----------------------------------
#
# Lire un tableau ne prouve rien : on le regarde une fois, puis plus jamais.
# Ces trois controles levent.
run "${PSQL[@]}" -v ON_ERROR_STOP=1 -c "
do \$verif\$
declare
  v_rayons integer;
  v_transition_publiees integer;
  v_publiees integer;
begin
  select count(distinct coalesce(feuille.parent_id, feuille.id)) into v_rayons
  from public.prompts p
  join public.categories feuille on feuille.id = p.category_id
  where p.catalog_version = 'v5';

  if v_rayons <> 13 then
    raise exception 'La refonte range les cartes dans % rayons au lieu de 13 (douze nets, un de transition).', v_rayons;
  end if;

  -- Le rayon de transition ne doit porter aucune carte publiee : ce qui y
  -- entre attend une relecture, et une carte relue en sort vers son vrai
  -- rayon. S'il en portait une, la Bibliotheque dessinerait une tuile
  -- « En cours de reclassement » a des membres.
  select count(*) into v_transition_publiees
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where c.external_ref = 'V5-TRANSITION' and p.status = 'published';

  if v_transition_publiees > 0 then
    raise exception 'Le rayon de transition porte % carte(s) publiee(s).', v_transition_publiees;
  end if;

  -- Et les douze autres portent tout le publie.
  select count(*) into v_publiees
  from public.prompts p
  join public.categories feuille on feuille.id = p.category_id
  join public.categories racine on racine.id = coalesce(feuille.parent_id, feuille.id)
  where p.catalog_version = 'v5' and p.status = 'published'
    and racine.external_ref is distinct from 'V5-TRANSITION';

  if v_publiees <> 349 then
    raise exception 'Les douze rayons portent % cartes publiees au lieu de 349.', v_publiees;
  end if;

  raise notice 'Repartition : 12 rayons pour 349 publiees, 1 rayon de transition sans publiee.';
end \$verif\$;"

echo "==> Repetition terminee"
