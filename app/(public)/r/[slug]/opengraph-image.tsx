import { ImageResponse } from 'next/og';
import { getPromptDetail } from '@/lib/catalog/queries';
import { texteDePartage } from '@/lib/share/texte-de-partage';
import { teinteDeRayon } from '@/lib/ui/motifs';

/**
 * L'apercu d'un lien partage, avec le logo incruste.
 *
 * CE QU'IL REMPLACE. Le lien partait avec l'image « apres » de la commande,
 * nue. Une photo de portrait dans une conversation ne dit ni d'ou elle
 * vient, ni que quelqu'un peut en obtenir autant en collant un texte : elle
 * ressemble a une photo qu'on envoie, pas a une adresse qu'on ouvre. La
 * moitie de ce qu'on partageait se perdait la.
 *
 * CE QU'IL FABRIQUE. La meme image, et par-dessus : le mot-symbole, le nom
 * de la commande, et la phrase qu'on envoie dans le message. Le contraste
 * du logo — « Raccourc » bleu nuit, « IA » bleu marque — est celui de
 * l'application, meme dessine ici a la main : l'apercu et l'ecran d'arrivee
 * doivent se reconnaitre.
 *
 * SANS VISUEL, IL Y A QUAND MEME UNE IMAGE. Les commandes de Textes et de
 * Reflexions n'ont rien a photographier, et une part du catalogue attend
 * encore ses visuels. Elles recoivent la teinte de leur rayon plutot qu'un
 * cadre vide — le meme parti pris que les cartes de la Bibliotheque.
 *
 * `ImageResponse` ne connait ni les variables CSS ni les feuilles de style
 * du site : chaque couleur est ecrite ici, en clair. C'est la seule copie
 * assumee de la palette dans le depot.
 */
export const alt = 'Aperçu de la commande sur RaccourcIA';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** La palette, recopiee : `ImageResponse` ne lit pas `globals.css`. */
const NUIT = '#0f1729';
const MARQUE = '#1463ff';
const PAPIER = '#ffffff';
const ENCRE_DOUCE = '#5b6577';

export default async function ApercuDePartage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Un incident ne doit pas rendre une erreur a la place d'une image : les
  // messageries afficheraient alors un cadre casse. On retombe sur la
  // carte de marque, qui reste un apercu valable.
  const prompt = await getPromptDetail(slug).catch(() => null);

  const visuel = prompt?.beforeAfter?.afterUrl ?? prompt?.thumbnailUrl ?? null;
  const teinte = teinteDeRayon(prompt?.collectionSlug ?? slug);
  const phrase = prompt ? texteDePartage(prompt).split('\n')[1] : null;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: visuel ? NUIT : teinte.fond,
      }}
    >
      {visuel ? (
        // L'image occupe tout le cadre ; le texte se pose dessus sur un
        // fondu. Poser le texte a cote reduirait la photo au tiers de
        // l'apercu, et c'est elle qui fait ouvrir le lien.
        <img
          src={visuel}
          alt=""
          width={size.width}
          height={size.height}
          style={{ position: 'absolute', inset: 0, objectFit: 'cover' }}
        />
      ) : null}

      {visuel ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(15,23,41,0.92) 0%, rgba(15,23,41,0.80) 45%, rgba(15,23,41,0.10) 100%)',
          }}
        />
      ) : null}

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          width: 760,
        }}
      >
        {/* LE LOGO INCRUSTE. Redessine plutot qu'importe : le composant
              du site rend des classes Tailwind, dont `ImageResponse` ne
              sait rien. Le contraste des deux couleurs, lui, est le meme. */}
        <div style={{ display: 'flex', fontSize: 40, fontWeight: 700 }}>
          <span style={{ color: visuel ? PAPIER : NUIT }}>Raccourc</span>
          <span style={{ color: visuel ? '#7aa6ff' : MARQUE }}>IA</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 62,
              fontWeight: 700,
              lineHeight: 1.1,
              color: visuel ? PAPIER : NUIT,
            }}
          >
            {prompt?.name ?? 'Une commande, un résultat'}
          </div>

          {phrase ? (
            <div
              style={{
                display: 'flex',
                marginTop: 20,
                fontSize: 30,
                lineHeight: 1.35,
                color: visuel ? 'rgba(255,255,255,0.86)' : ENCRE_DOUCE,
              }}
            >
              {phrase}
            </div>
          ) : null}

          <div
            style={{
              display: 'flex',
              marginTop: 28,
              fontSize: 26,
              fontWeight: 600,
              color: visuel ? '#7aa6ff' : MARQUE,
            }}
          >
            Le raccourci est déjà écrit.
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
