'use client';

import { useMemo, useState } from 'react';
import { ChampsDeCommande } from '@/components/detail/champs-de-commande';
import { ChoixMoteur } from '@/components/detail/choix-moteur';
import type { Enums } from '@/lib/supabase/database.types';
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
  providers,
  surface,
  proposerOuverture = false,
}: {
  prompt: PromptCard;
  providers: { key: string; name: string; compatibility: Enums<'compatibility_level'> }[];
  surface: 'carte' | 'detail' | 'page-publique';
  proposerOuverture?: boolean;
}) {
  const [valeurs, setValeurs] = useState<Record<string, string>>({});

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
        onChange={(cle, valeur) => setValeurs((actuelles) => ({ ...actuelles, [cle]: valeur }))}
      />

      <div className={prompt.champs.length > 0 ? 'mt-3' : undefined}>
        <ChoixMoteur
          promptId={prompt.id}
          pret={prompt.payloadReady}
          providers={providers}
          surface={surface}
          locked={false}
          genre={prompt.entityType}
          champs={saisies}
          proposerOuverture={proposerOuverture}
        />
      </div>
    </>
  );
}
