/**
 * Carte de logique contextuelle.
 *
 * Deux cas, deux cartes, la meme forme : c'est ce qui rend la comparaison
 * lisible. La couleur ne signale pas un succes et un echec — les deux
 * chemins sont normaux — mais l'etat de depart : le vert dit « rien ne
 * manque », le bleu dit « il manque une precision, on la demande ».
 */
export function ContextLogicCard({
  ton,
  etat,
  titre,
  corps,
  children,
}: {
  ton: 'complet' | 'question';
  /** Ce qu'on constate en entree, avant l'action. */
  etat: string;
  /** Ce qui se passe alors. */
  titre: string;
  corps: string;
  children?: React.ReactNode;
}) {
  const complet = ton === 'complet';

  return (
    <div
      className={`flex flex-col gap-3 rounded-[color:var(--radius-card)] border p-5 ${
        complet
          ? 'border-[color:var(--color-success)]/25 bg-[color:var(--color-success-soft)]/45'
          : 'border-[color:var(--color-brand)]/25 bg-[color:var(--color-sky)]/70'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            complet
              ? 'bg-[color:var(--color-success)] text-white'
              : 'bg-[color:var(--color-brand)] text-white'
          }`}
        >
          {complet ? <CocheIcone /> : <QuestionIcone />}
        </span>
        <span className="text-[length:var(--texte-carte)] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
          {etat}
        </span>
      </div>

      <div>
        <h3 className="text-[length:var(--texte-section)] font-bold text-[color:var(--color-night)]">
          {titre}
        </h3>
        <p className="mt-1.5 text-[length:var(--texte-corps)] leading-[1.55] text-[color:var(--color-muted)]">
          {corps}
        </p>
      </div>

      {children}
    </div>
  );
}

/**
 * Question contextuelle telle qu'elle se pose, avec ses choix quand il y en a.
 *
 * Purement illustratif : rien n'est cliquable ici, et rien ne pretend
 * l'etre. Un faux formulaire qui ne repond pas au doigt serait pire
 * qu'une image.
 *
 * Le catalogue V5 pose ses questions en clair, sans choix fermes : la
 * commande relit ce qu'on lui a donne et repart des la reponse. La liste
 * disparait alors au lieu de laisser un blanc sous la question.
 */
export function QuestionExempleMock({ question, choix }: { question: string; choix: string[] }) {
  return (
    <div className="rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3.5">
      <p className="text-[length:var(--texte-carte)] font-semibold text-[color:var(--color-night)]">
        {question}
      </p>
      <ul className="mt-2.5 flex flex-wrap gap-1.5" hidden={choix.length === 0}>
        {choix.slice(0, 4).map((option, index) => (
          <li
            key={option}
            className={`rounded-full px-3 py-1.5 text-[length:var(--texte-carte)] ${
              index === 0
                ? 'bg-[color:var(--color-brand)] font-medium text-white'
                : 'bg-[color:var(--color-sky)] text-[color:var(--color-night)]'
            }`}
          >
            {option}
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-[length:var(--texte-meta)] text-[color:var(--color-muted)]">
        Exemple tiré du catalogue. Une seule question, puis la commande poursuit.
      </p>
    </div>
  );
}

function CocheIcone() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 12.5 4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function QuestionIcone() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.2 9a2.9 2.9 0 1 1 3.6 2.8c-.7.2-1.1.8-1.1 1.5v.6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="11.8" cy="17.4" r="1.25" fill="currentColor" />
    </svg>
  );
}
