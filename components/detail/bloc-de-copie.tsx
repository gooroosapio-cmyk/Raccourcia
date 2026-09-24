'use client';

import { useCallback, useMemo, useState } from 'react';
import { ChampsDeCommande } from '@/components/detail/champs-de-commande';
import { CopyCommandButton } from '@/components/cards/copy-command-button';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * Personnaliser puis copier, d'un seul bloc.
 *
 * La page publique est rendue au serveur : elle ne peut pas tenir l'etat
 * d'un formulaire. Ce composant le fait pour elle, et reste une feuille —
 * il n'enveloppe rien d'autre que ses deux enfants.
 *
 * La fiche de l'espace membre ne l'emploie pas : chez elle, le formulaire
 * vit dans le corps et le bouton dans le pied, a l'autre bout du panneau.
 */
export function BlocDeCopie({
  prompt,
  surface,
}: {
  prompt: PromptCard;
  surface: 'carte' | 'detail' | 'page-publique';
}) {
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [erreurs, setErreurs] = useState<Record<string, string>>({});

  // Meme regle que la fiche : un champ indispensable vide arrete la copie,
  // le message se pose sous le champ et le focus y va.
  const verifierAvantCopie = useCallback(() => {
    const manquants = prompt.champs.filter(
      (champ) => champ.requis && !(valeurs[champ.cle] ?? '').trim(),
    );
    if (manquants.length === 0) return true;
    setErreurs(
      Object.fromEntries(manquants.map((champ) => [champ.cle, 'À renseigner avant de copier.'])),
    );
    document.getElementById(`champ-${manquants[0]!.cle}`)?.focus();
    return false;
  }, [prompt.champs, valeurs]);

  const saisies = useMemo(
    () =>
      prompt.champs
        .map((champ) => ({ cle: champ.cle, valeur: valeurs[champ.cle] ?? '' }))
        .filter((champ) => champ.valeur !== ''),
    [prompt.champs, valeurs],
  );

  return (
    <>
      <ChampsDeCommande
        champs={prompt.champs}
        valeurs={valeurs}
        erreurs={erreurs}
        onChange={(cle, valeur) => {
          setValeurs((actuelles) => ({ ...actuelles, [cle]: valeur }));
          setErreurs(({ [cle]: _retiree, ...reste }) => reste);
        }}
      />

      <div className={prompt.champs.length > 0 ? 'mt-3' : undefined}>
        <CopyCommandButton
          promptId={prompt.id}
          pret={prompt.payloadReady}
          surface={surface}
          genre={prompt.entityType}
          champs={saisies}
          verifierAvantCopie={verifierAvantCopie}
        />
      </div>
    </>
  );
}
