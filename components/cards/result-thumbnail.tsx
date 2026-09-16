import Image from 'next/image';
import { VisualSlot } from '@/components/cards/visual-slot';

/**
 * Vignette d'une carte : le resultat, et rien d'autre.
 *
 * La comparaison Avant/Apres appartient a la fiche, ou elle a la place d'etre
 * regardee. Dans une grille a deux colonnes, chaque moitie ferait 85 px de
 * large : deux images de cette taille cote a cote ne montrent rien, et
 * l'image de depart y volerait la place de celle qui donne envie.
 *
 * Le cadre lui-meme vient de `VisualSlot`, partage avec le repli et avec la
 * zone d'intention des cartes texte : c'est ce qui garantit que la grille ne
 * saute pas sous le pouce quand un visuel arrive.
 */
export function ResultThumbnail({
  url,
  alt,
  libelle,
  mission = false,
  priority = false,
  rayon,
}: {
  url: string | null;
  alt: string | null;
  /**
   * Ce que la vignette montre, pour l'annonce vocale. La carte y met le titre
   * du raccourci : il decrit le resultat sans nommer la commande, que la
   * carte n'affiche plus et qu'un visiteur verrouille ne doit pas encore
   * lire.
   */
  libelle: string;
  /** Vrai pour une commande qui conduit un travail en plusieurs etapes. */
  mission?: boolean;
  /** Vrai pour les premieres vignettes seulement. */
  priority?: boolean;
  /** Position du rayon, pour la teinte du cadre en attente d'apercu. */
  rayon?: number;
}) {
  if (!url) return <ThumbnailPlaceholder libelle={libelle} mission={mission} rayon={rayon} />;

  return (
    <VisualSlot mission={mission}>
      <Image
        src={url}
        alt={alt ?? `Résultat obtenu avec ${libelle}`}
        fill
        // Le stockage a deja rendu la vignette a la bonne largeur : rien a
        // redimensionner ici. L'optimiseur de l'hebergeur, lui, a un quota
        // mensuel — epuise, il repond « Payment Required » et la vignette
        // disparait. Une image du catalogue ne doit dependre d'aucun
        // compteur exterieur.
        unoptimized
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        className="object-cover"
      />
    </VisualSlot>
  );
}

/**
 * Le cadre d'une commande dont l'apercu n'est pas encore depose.
 *
 * Les visuels arrivent par vagues : cinq cent dix-sept commandes publiees
 * attendent encore le leur. Un cadre gris avec une icone d'image barree
 * donnait l'impression d'un chargement qui a echoue — on regarde un produit
 * casse, pas un catalogue en cours.
 *
 * A la place, une composition : la teinte du rayon, deux arcs discrets, et le
 * mot qui dit la verite — l'apercu viendra. Rien n'y ressemble a une
 * photographie, donc rien ne promet un resultat que la commande ne rendrait
 * pas. Le titre n'y est pas repete : la carte le porte deja juste en dessous.
 *
 * Le cadre garde le ratio du futur media. Le jour ou l'image est deposee,
 * elle prend exactement sa place et la grille ne bouge pas d'un pixel.
 */
export function ThumbnailPlaceholder({
  libelle,
  mission = false,
  rayon,
}: {
  libelle: string;
  mission?: boolean;
  /** Position du rayon : c'est elle qui donne la teinte. */
  rayon?: number;
}) {
  const teintes = [
    'from-[#eaf1ff] to-[#d5e3ff]',
    'from-[#eef0ff] to-[#dcdffb]',
    'from-[#e9f2fb] to-[#d3e6f7]',
    'from-[#eef3ff] to-[#dde7ff]',
    'from-[#e8f0fe] to-[#d8e5fb]',
    'from-[#edf1f8] to-[#dbe3f2]',
  ];
  const teinte = teintes[(rayon ?? 0) % teintes.length];

  return (
    <VisualSlot ton="texte" mission={mission}>
      <span className={`absolute inset-0 bg-gradient-to-br ${teinte}`} aria-hidden="true" />

      {/* Deux arcs, poses hors centre : ils donnent une composition sans
          imiter quoi que ce soit. Un motif centre aurait fait logo. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 125"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full text-[color:var(--color-brand)]"
      >
        <circle
          cx="78"
          cy="30"
          r="34"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.28"
        />
        <circle
          cx="22"
          cy="96"
          r="26"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.2"
        />
      </svg>

      <span
        className={`absolute inset-x-0 flex justify-center ${mission ? 'bottom-8' : 'bottom-3'}`}
      >
        <span className="rounded-full bg-white/70 px-2.5 py-1 text-[length:var(--texte-meta)] font-medium text-[color:var(--color-brand-strong)] backdrop-blur-[2px]">
          Aperçu bientôt disponible
        </span>
      </span>

      <span className="sr-only">{libelle}</span>
    </VisualSlot>
  );
}
