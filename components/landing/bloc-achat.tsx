import Image from 'next/image';
import { Button, FlecheIcone } from '@/components/landing/button';

/**
 * Moyens de paiement, sous le bouton d'achat.
 *
 * Chaque logo est rogne de ses marges puis pose dans un cercle de meme
 * diametre : sans cela, deux logos de meme hauteur n'ont pas la meme taille
 * apparente — l'un remplit son cadre, l'autre y flotte. Le cercle donne la
 * regularite qu'une simple hauteur commune ne donne pas.
 *
 * Ils restent tres petits et sur une seule ligne : ce sont des reperes de
 * confiance, pas un argument. Ils se lisent d'un coup d'oeil ou pas du tout.
 */
const MOYENS = [
  { nom: 'Orange Money', fichier: 'orange.webp' },
  { nom: 'MTN Mobile Money', fichier: 'mtn.webp' },
  { nom: 'Moov Money', fichier: 'moov.webp' },
  { nom: 'Wave', fichier: 'wave.webp' },
  { nom: 'Airtel Money', fichier: 'airtel.webp' },
  { nom: 'Visa', fichier: 'visa.webp' },
];

export function MoyensPaiement({ sombre = false }: { sombre?: boolean }) {
  return (
    <div>
      <ul
        className="flex flex-wrap items-center justify-center gap-1.5"
        aria-label="Moyens de paiement acceptés"
      >
        {MOYENS.map((moyen) => (
          <li key={moyen.nom}>
            <span
              className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border bg-white ${
                sombre ? 'border-white/15' : 'border-[color:var(--color-line)]'
              }`}
            >
              <Image
                src={`/landing/paiement/${moyen.fichier}`}
                alt={moyen.nom}
                width={120}
                height={120}
                loading="lazy"
                className="h-5 w-5 object-contain"
              />
            </span>
          </li>
        ))}
      </ul>
      <p
        className={`mt-2 text-center text-[length:var(--texte-meta)] ${
          sombre ? 'text-white/60' : 'text-[color:var(--color-muted)]'
        }`}
      >
        et les autres moyens proposés au paiement
      </p>
    </div>
  );
}

/**
 * Bloc d'achat complet : bouton, ligne de reassurance, moyens de paiement.
 *
 * Un seul composant pour les trois endroits ou il apparait — l'accueil,
 * l'offre, l'appel final. Trois copies auraient fini par diverger, et c'est
 * le prix qui aurait diverge en premier.
 *
 * Le bouton ne porte que le prix a payer. Le montant de reference barre y
 * tenait trois nombres sur une seule ligne — le libelle, le barre, le
 * courant — et l'oeil devait trier avant de comprendre ou appuyer. Il reste
 * affiche dans la carte d'offre, ou il a la place d'etre lu.
 */
export function BlocAchat({
  purchaseUrl,
  prix,
  libelle,
  secondaire = true,
  sombre = false,
}: {
  purchaseUrl: string;
  prix: string;
  /** Ce que le bouton promet. Le prix est ajoute ensuite, toujours visible. */
  libelle: string;
  /** Faux quand la page a deja propose la bibliotheque juste au-dessus. */
  secondaire?: boolean;
  /** Vrai sur fond bleu nuit : le bouton de contour passe en clair. */
  sombre?: boolean;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button href={purchaseUrl} externe pleineLargeur className="sm:w-auto">
          {libelle} — {prix}
          <FlecheIcone />
        </Button>

        {secondaire ? (
          sombre ? (
            <a
              href="/app"
              className="inline-flex h-[52px] items-center justify-center rounded-[14px] border border-white/25 px-6 text-[16px] font-semibold text-white transition-colors duration-[var(--duration-fast)] hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Découvrir les commandes
            </a>
          ) : (
            <Button href="/app" ton="contour" pleineLargeur className="sm:w-auto">
              Découvrir les commandes
            </Button>
          )
        ) : null}
      </div>

      <p
        className={`mt-3 text-center text-[length:var(--texte-carte)] ${
          sombre ? 'text-white/70' : 'text-[color:var(--color-muted)]'
        }`}
      >
        Accès à vie · Paiement unique · Accès immédiat après validation
      </p>

      <div className="mt-4">
        <MoyensPaiement sombre={sombre} />
      </div>
    </div>
  );
}
