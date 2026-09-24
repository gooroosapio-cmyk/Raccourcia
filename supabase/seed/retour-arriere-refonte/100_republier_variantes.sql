-- =====================================================================
-- Retour arriere / 100 — republier les variantes par IA
--
-- Defait le lot `archiver-variantes-par-ia`, et lui seul : ne republie
-- que les variantes que ce lot a inscrites dans
-- `sauvegarde.variantes_archivees_20260924` avant de les archiver. Une
-- variante archivee pour une autre raison reste archivee.
--
-- Le texte servi ne change pas : la variante universelle, quand elle
-- existe, reste prioritaire. Ce lot rend a l'ancien code (selecteur d'IA)
-- les variantes qu'il liste.
--
-- Rejouable : une variante deja publiee n'est pas reecrite.
-- =====================================================================
begin;

do $ctrl$
begin
  if to_regclass('sauvegarde.variantes_archivees_20260924') is null then
    raise notice 'Retour arriere / 100 : aucune variante archivee par le lot, rien a republier.';
  end if;
end $ctrl$;

do $republier$
declare v_n integer := 0;
begin
  if to_regclass('sauvegarde.variantes_archivees_20260924') is not null then
    update public.prompt_variants v
       set status = 'published', updated_at = now()
      from sauvegarde.variantes_archivees_20260924 s
     where v.id = s.variant_id and v.status = 'archived';
    get diagnostics v_n = row_count;
  end if;
  raise notice 'Retour arriere / 100 : % variante(s) republiee(s).', v_n;
end $republier$;

commit;
