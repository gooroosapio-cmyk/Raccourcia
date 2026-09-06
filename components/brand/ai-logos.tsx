/**
 * Logos des trois IA compatibles.
 *
 * Des pastilles de couleur ne disaient rien : il fallait lire le nom a cote
 * pour savoir de quelle IA il s'agissait, ce qui annule l'interet d'un
 * pictogramme. Les marques sont ici dessinees en SVG local — aucune requete
 * au rendu, aucune image etiree, et la forme reste nette a toutes les
 * tailles.
 *
 * Chaque logo porte son nom accessible : sur une carte, ou le nom textuel est
 * masque faute de place, c'est le seul moyen pour un lecteur d'ecran de dire
 * a quelle IA la commande est compatible.
 */

type ProprietesLogo = {
  /** Cote du carre, en pixels. 16 sur une carte, 20 sur une fiche. */
  taille?: number;
  /** Vrai quand le nom est deja ecrit a cote : le logo devient decoratif. */
  decoratif?: boolean;
};

function attributs(nom: string, { taille = 16, decoratif = false }: ProprietesLogo) {
  return {
    width: taille,
    height: taille,
    viewBox: '0 0 24 24',
    className: 'shrink-0',
    ...(decoratif ? { 'aria-hidden': true as const } : { role: 'img' as const, 'aria-label': nom }),
  };
}

/** ChatGPT : le noeud hexagonal d'OpenAI, en vert de marque. */
export function ChatGPTLogo(props: ProprietesLogo) {
  return (
    <svg {...attributs('ChatGPT', props)} fill="none">
      <path
        d="M12 2.6 20.1 7v10L12 21.4 3.9 17V7L12 2.6Z"
        fill="#10A37F"
        stroke="#10A37F"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M12 7.3 16 9.6v4.8L12 16.7 8 14.4V9.6L12 7.3Z" fill="#ffffff" fillOpacity="0.92" />
    </svg>
  );
}

/** Claude : l'etoile a rayons d'Anthropic, en terracotta. */
export function ClaudeLogo(props: ProprietesLogo) {
  return (
    <svg {...attributs('Claude', props)} fill="none">
      <g stroke="#D97757" strokeWidth="2.1" strokeLinecap="round">
        <path d="M12 3.6v16.8" />
        <path d="M4.1 12h15.8" />
        <path d="m6.4 6.4 11.2 11.2" />
        <path d="m17.6 6.4-11.2 11.2" />
      </g>
    </svg>
  );
}

/** Gemini : l'etincelle a quatre branches de Google, en bleu de marque. */
export function GeminiLogo(props: ProprietesLogo) {
  return (
    <svg {...attributs('Gemini', props)} fill="none">
      <path
        d="M12 2.2c.5 4.2 3.1 6.8 7.3 7.3v.2c-4.2.5-6.8 3.1-7.3 7.3h-.2c-.5-4.2-3.1-6.8-7.3-7.3v-.2c4.2-.5 6.8-3.1 7.3-7.3h.2Z"
        transform="translate(0 2.5)"
        fill="#4285F4"
      />
    </svg>
  );
}

const PAR_CLE = {
  chatgpt: ChatGPTLogo,
  claude: ClaudeLogo,
  gemini: GeminiLogo,
} as const;

/**
 * Logo d'une IA par sa cle de base.
 *
 * Une cle inconnue ne casse rien : on retombe sur une pastille neutre plutot
 * que d'imiter approximativement une marque qu'on ne connait pas.
 */
export function AILogo({
  providerKey,
  name,
  taille = 16,
  decoratif = false,
}: {
  providerKey: string;
  name: string;
  taille?: number;
  decoratif?: boolean;
}) {
  const Logo = PAR_CLE[providerKey as keyof typeof PAR_CLE];
  if (Logo) return <Logo taille={taille} decoratif={decoratif} />;

  return (
    <span
      style={{ width: taille, height: taille }}
      className="inline-block shrink-0 rounded-full bg-[color:var(--color-line-strong)]"
      {...(decoratif ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name })}
    />
  );
}
