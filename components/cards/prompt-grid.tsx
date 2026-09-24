'use client';

import { useCallback, useState } from 'react';
import { ImagePromptCard } from '@/components/cards/image-prompt-card';
import { TextPromptCard } from '@/components/cards/text-prompt-card';
import { PromptDetailSheet } from '@/components/detail/prompt-detail';
import { openPaywall } from '@/components/paywall/paywall-provider';
import { trackPromptView } from '@/lib/actions/catalog';
import type { PromptCard as PromptCardData } from '@/lib/catalog/types';

/**
 * Liste des commandes et couche de detail.
 *
 * Deux colonnes, du telephone a l'ordinateur : la version large prolonge la
 * version mobile, elle n'en invente pas une autre. La gouttiere se resserre
 * sur les ecrans les plus etroits plutot que de sacrifier une colonne.
 *
 * `items-start` plutot que des rangees etirees : une carte texte et une carte
 * image n'ont pas toujours la meme hauteur, et etirer la plus courte laissait
 * une bande vide sous son contenu.
 *
 * L'etat de la fiche vit ici : l'ouvrir puis la fermer ne retouche jamais la
 * liste, donc le defilement et les filtres restent exactement en place.
 */
export function PromptGrid({
  prompts,
  locked,
  visiteur = false,
  emptyState,
  disposition = 'grille',
  prioritaire = true,
  rayons,
}: {
  prompts: PromptCardData[];
  locked: boolean;
  /**
   * Vrai quand personne n'est connecte.
   *
   * Un visiteur voit la bibliotheque mais n'ouvre pas la fiche d'une commande
   * verrouillee : la fiche nomme la commande, et c'est ce nom qui se recopie
   * dans ChatGPT. Toucher une carte verrouillee ouvre donc l'offre — la
   * reponse a ce qu'il cherchait a faire. Les commandes offertes, elles,
   * s'ouvrent normalement : ce sont les seules a demontrer quelque chose.
   */
  visiteur?: boolean;
  emptyState: React.ReactNode;
  /**
   * « grille » remplit l'ecran, « rangee » defile lateralement.
   *
   * Une rangee sert a presenter quelques commandes sans manger la hauteur
   * de l'Accueil : on en montre deux et demie, et le reste s'atteint du
   * pouce. La fiche, le favori et la copie sont les memes dans les deux —
   * c'est la disposition qui change, pas la carte.
   */
  disposition?: 'grille' | 'rangee';
  /**
   * Faux pour les grilles secondaires de l'Accueil.
   *
   * Le chargement prioritaire ne vaut que pour ce qui est certain d'etre a
   * l'ecran au premier rendu. L'Accueil affiche jusqu'a cinq grilles : les
   * laisser toutes reclamer la priorite en demanderait dix a la fois, et le
   * navigateur n'accelererait plus rien.
   */
  prioritaire?: boolean;
  /**
   * A quel rayon appartient chaque collection, par position.
   *
   * Une carte connait sa collection, jamais sa famille : plutot qu'une
   * jointure a deux etages sur chaque lecture du catalogue, l'ecran qui
   * charge deja la bibliotheque passe la correspondance.
   */
  rayons?: Record<string, string>;
}) {
  const [selection, setSelection] = useState<PromptCardData | null>(null);

  const ouvrir = useCallback(
    (prompt: PromptCardData) => {
      if (visiteur && locked && !prompt.isFree) {
        openPaywall();
        return;
      }
      setSelection(prompt);
      // Rien a journaliser pour un visiteur : l'historique appartient a un
      // compte, et l'appel serait refuse.
      if (!visiteur) void trackPromptView(prompt.id);
    },
    [locked, visiteur],
  );

  if (prompts.length === 0) return <>{emptyState}</>;

  return (
    <>
      <div
        className={
          disposition === 'rangee'
            ? // Chaque carte fait 42 % de la largeur : deux entieres et le bord
              // de la troisieme, qui dit qu'il y a une suite sans la montrer a
              // moitie. Les marges negatives font affleurer la rangee aux bords
              // de l'ecran, et le padding lui rend sa gouttiere.
              // `items-stretch` : dans un carrousel, deux cartes cote a cote
              // dont l'une a un titre plus long doivent quand meme finir a la
              // meme hauteur, sinon la rangee ondule.
              'rail pleine-largeur flex snap-x snap-mandatory items-stretch gap-2 pb-1 [&>*]:w-[42%] [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:w-[30%] lg:[&>*]:w-[22%]'
            : // Deux colonnes partout, y compris sur ordinateur. Trois puis
              // quatre colonnes reduisaient chaque resultat a une vignette de
              // 200 px sur un grand ecran : la galerie devenait une planche
              // contact. La largeur de lecture de la coquille borne la taille
              // des cartes, elles ne deviennent pas des affiches pour autant.
              // Pas d'`items-start` : les cartes d'une meme rangee partagent
              // leur hauteur, et le titre a deux lignes reservees de son cote.
              'grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 min-[400px]:gap-[var(--gouttiere-carte)]'
        }
      >
        {prompts.map((prompt, index) => {
          const verrouille = locked && !prompt.isFree;
          const commun = {
            prompt,
            locked: verrouille,
            free: locked && prompt.isFree,
            masque: visiteur && verrouille,
            visiteur,
            rayon: prompt.collectionSlug ? rayons?.[prompt.collectionSlug] : undefined,
            onOpen: ouvrir,
          };

          return prompt.showImageCard ? (
            <ImagePromptCard
              key={prompt.id}
              {...commun}
              // Les quatre premieres vignettes de la grille principale sont
              // prioritaires : sur deux colonnes, un telephone en montre deux
              // rangees avant le premier defilement. Deux seulement laissaient
              // la seconde rangee se charger apres coup, sous les yeux.
              priority={prioritaire && index < 4}
            />
          ) : (
            <TextPromptCard key={prompt.id} {...commun} />
          );
        })}
      </div>

      {selection ? (
        <PromptDetailSheet
          prompt={selection}
          locked={locked && !selection.isFree}
          free={locked && selection.isFree}
          visiteur={visiteur}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </>
  );
}
