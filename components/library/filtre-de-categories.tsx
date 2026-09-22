'use client';

import { useMemo, useState } from 'react';
import { Mosaique, type CarteDeMosaique } from '@/components/library/mosaique';
import { categoriesDuRayon, resserrerLeRayon } from '@/lib/catalog/rayon';

/**
 * Resserrer une etagere sur une categorie.
 *
 * LE MANQUE. Une etagere de Textes empile ses collections et ses tags dans
 * une mosaique unique. Trente cartes sans ordre apparent : celui qui vient
 * pour rediger doit passer devant les jeux de role et les simulations
 * d'entretien avant d'atteindre « Produire un contenu ». Les Images s'en
 * tirent parce qu'on y reconnait un rayon a sa photographie ; sur du texte,
 * il n'y a que des mots, et rien ne guide l'oeil.
 *
 * Les categories existent pourtant deja, et le catalogue les porte : quatre
 * en Textes, quatre en Reflexions. Elles n'etaient simplement affichees
 * nulle part.
 *
 * COTE CLIENT, ET C'EST DELIBERE. Les cartes sont deja toutes envoyees —
 * l'etagere en compte trente au plus. Les filtrer ici rend le geste
 * instantane, la ou une adresse a parametre demanderait un aller-retour
 * serveur pour masquer des donnees deja a l'ecran. Aucune decision
 * d'autorisation ne passe par la : ce filtre cache ce qui est deja rendu,
 * exactement comme celui des tendances de l'accueil.
 *
 * LES TAGS SORTENT QUAND UNE CATEGORIE EST CHOISIE. Un tag n'est pas une
 * categorie : il qualifie une commande, il ne la range pas. Les garder
 * sous un filtre de categorie afficherait des cartes qui n'ont rien a voir
 * avec la categorie demandee, et le filtre paraitrait casse. « Tout » les
 * ramene.
 */
export function FiltreDeCategories({
  cartes,
  /** Les premieres images sont chargees en priorite : elles sont a l'ecran. */
  prioritaires,
}: {
  cartes: CarteDeMosaique[];
  prioritaires?: number;
}) {
  const [choisie, setChoisie] = useState<string | null>(null);

  // Les deux regles vivent dans `lib/catalog/rayon` : elles ne parlent que
  // de donnees, et elles s'y verifient sans navigateur.
  const categories = useMemo(() => categoriesDuRayon(cartes), [cartes]);
  const retenues = useMemo(() => resserrerLeRayon(cartes, choisie), [cartes, choisie]);

  // Une seule categorie ne se filtre pas : la rangee de puces n'offrirait
  // qu'un choix deja fait.
  if (categories.length < 2) return <Mosaique cartes={cartes} prioritaires={prioritaires} />;

  return (
    <div className="space-y-3">
      {/* Un rail : quatre puces tiennent sur une ligne de 360 px, dix-neuf
          non. Il defile plutot que de repousser la mosaique — ce qu'on est
          venu voir — sous la ligne de flottaison. */}
      <div className="rail pleine-largeur">
        <div className="flex w-max gap-2 pb-1">
          <Puce active={choisie === null} onClick={() => setChoisie(null)}>
            Tout
          </Puce>
          {categories.map((categorie) => (
            <Puce
              key={categorie}
              active={choisie === categorie}
              onClick={() => setChoisie(choisie === categorie ? null : categorie)}
            >
              {categorie}
            </Puce>
          ))}
        </div>
      </div>

      <Mosaique cartes={retenues} prioritaires={prioritaires} />
    </div>
  );
}

/**
 * Une puce de categorie.
 *
 * `aria-pressed` et non `aria-current` : on bascule un filtre, on ne
 * designe pas la page courante. Un lecteur d'ecran annonce alors
 * « enfonce » ou « non enfonce », ce qui est exactement l'etat.
 */
function Puce({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`touch-target inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-[length:var(--texte-carte)] font-medium transition-colors duration-[var(--duration-fast)] ${
        active
          ? 'bg-[color:var(--color-brand)] text-white'
          : 'bg-[color:var(--color-sky)] text-[color:var(--color-night)]'
      }`}
    >
      {children}
    </button>
  );
}
