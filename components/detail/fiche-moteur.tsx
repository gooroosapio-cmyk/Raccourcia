import { InputExampleList } from '@/components/detail/input-example-list';
import { ListePuces, Section, type NiveauDeTitre } from '@/components/detail/section-fiche';
import {
  conditionsDEmploi,
  lireLesJalons,
  lireLesLivrables,
  premiereDemande,
  sansRedite,
} from '@/lib/catalog/moteur';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * Le corps d'une fiche de Mode IA.
 *
 * Un mode ne rend rien qu'on puisse montrer. Sa fiche affichait donc le meme
 * squelette qu'une commande image — « A fournir », « Vous obtenez » — avec
 * une case a fournir vide, puisqu'un mode ne demande aucune photo. On
 * activait un role sans savoir ce qu'il allait faire de la conversation.
 *
 * L'ordre suit celui dans lequel on decide : ce qu'il sait faire, quand s'en
 * servir, par quoi il commencera, ce qu'il rendra, ce qu'il refusera, comment
 * en sortir. La derniere question est la plus negligee et la plus posee : un
 * mode se colle une fois pour dix echanges, et rien ne disait comment
 * l'arreter.
 */
export function CorpsMode({
  prompt,
  niveau,
}: {
  prompt: PromptCard;
  /** Le rang des titres, selon que la fiche est une couche ou une page. */
  niveau?: NiveauDeTitre;
}) {
  const moteur = prompt.moteur;
  const ouverture = premiereDemande(moteur?.questionsCadrage ?? null);
  const conditions = conditionsDEmploi(moteur?.contexte ?? null);
  const criteres = sansRedite(moteur?.criteresReussite ?? null, moteur?.erreurs ?? null);

  return (
    <>
      {moteur?.specification ? (
        <Section titre="Ce qu’il sait faire" niveau={niveau}>
          <Paragraphe texte={moteur.specification} />
        </Section>
      ) : null}

      {prompt.useCases.length > 0 || conditions ? (
        <Section titre="Quand l’activer" niveau={niveau}>
          {prompt.useCases.length > 0 ? <ListePuces items={prompt.useCases.slice(0, 4)} /> : null}
          {conditions ? (
            <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
              {conditions}
            </p>
          ) : null}
        </Section>
      ) : null}

      {/* La question d'ouverture, mot pour mot. C'est ce qui arrive a l'ecran
          dans les deux secondes qui suivent le collage : la voir avant evite
          de croire que le mode n'a pas fonctionne. */}
      {ouverture ? (
        <Section titre="Il commencera par vous demander" niveau={niveau}>
          <p className="rounded-[color:var(--radius-control)] bg-[color:var(--color-sky)] px-3.5 py-3 text-[length:var(--texte-corps)] italic leading-[1.45] text-[color:var(--color-night)]">
            « {ouverture} »
          </p>
        </Section>
      ) : null}

      {moteur?.livrables ? (
        <Section titre="Ce qu’il vous rendra" niveau={niveau}>
          <Paragraphe texte={moteur.livrables} />
        </Section>
      ) : null}

      {criteres ? (
        <Section titre="Un bon résultat" niveau={niveau}>
          <Paragraphe texte={criteres} />
        </Section>
      ) : null}

      <LimitesEtSortie moteur={moteur} limitations={prompt.limitations} niveau={niveau} />
    </>
  );
}

/**
 * Le corps d'une fiche de Parcours guide.
 *
 * Un parcours ne produit pas un resultat mais une serie : de deux a sept
 * fichiers, dans un ordre impose, chacun a son format. Sa fiche annoncait
 * « Un objectif, plusieurs etapes » sans jamais dire combien ni lesquelles —
 * on se lancait dans un travail dont on ignorait la longueur.
 *
 * Les livrables viennent donc en premier, numerotes : c'est le plan de
 * travail, et c'est la seule chose qu'on veut voir avant de commencer.
 */
export function CorpsParcours({ prompt, niveau }: { prompt: PromptCard; niveau?: NiveauDeTitre }) {
  const moteur = prompt.moteur;
  const plan = lireLesLivrables(moteur?.livrables ?? null);
  const ouverture = premiereDemande(moteur?.questionsCadrage ?? null);
  const criteres = sansRedite(moteur?.criteresReussite ?? null, moteur?.erreurs ?? null);

  return (
    <>
      {plan ? (
        <Section titre={plan.compte ? `Vous obtenez ${plan.compte} livrables` : 'Vous obtenez'}>
          {/* Numerotes, parce que l'ordre compte : la planche de synthese se
              monte a partir des visuels deja valides, elle ne se produit pas
              en premier. */}
          <ol className="flex flex-col gap-1.5">
            {plan.etapes.map((etape, rang) => (
              <li
                key={`${rang}-${etape.nom}`}
                className="flex items-start gap-2.5 text-[length:var(--texte-carte)] leading-snug text-[color:var(--color-night)]"
              >
                <span
                  aria-hidden="true"
                  className="mt-[-1px] inline-flex h-[1.45em] w-[1.45em] shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-soft)] text-[length:var(--texte-meta)] font-bold text-[color:var(--color-brand-strong)]"
                >
                  {rang + 1}
                </span>
                <span>
                  {etape.nom}
                  {etape.format ? (
                    <span className="ml-1.5 whitespace-nowrap rounded-full bg-[color:var(--color-canvas)] px-1.5 py-[1px] text-[length:var(--texte-meta)] font-medium text-[color:var(--color-muted)]">
                      {etape.format}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </Section>
      ) : moteur?.livrables ? (
        <Section titre="Vous obtenez" niveau={niveau}>
          <Paragraphe texte={moteur.livrables} />
        </Section>
      ) : null}

      {prompt.inputExamples.length > 0 || prompt.expectedInput || ouverture ? (
        <Section titre="À préparer" niveau={niveau}>
          {prompt.inputExamples.length > 0 ? (
            <InputExampleList inputs={prompt.inputExamples} />
          ) : null}
          {prompt.expectedInput ? (
            <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
              {prompt.expectedInput}
            </p>
          ) : null}
          {ouverture ? (
            <p className="mt-2 rounded-[color:var(--radius-control)] bg-[color:var(--color-sky)] px-3.5 py-3 text-[length:var(--texte-carte)] italic leading-[1.45] text-[color:var(--color-night)]">
              Première question : « {ouverture} »
            </p>
          ) : null}
        </Section>
      ) : null}

      {moteur?.specification ? (
        <Section titre="Comment il procède" niveau={niveau}>
          <Paragraphe texte={moteur.specification} />
        </Section>
      ) : null}

      {prompt.useCases.length > 0 ? (
        <Section titre="Quand le suivre" niveau={niveau}>
          <ListePuces items={prompt.useCases.slice(0, 4)} />
        </Section>
      ) : null}

      {criteres ? (
        <Section titre="Un parcours réussi" niveau={niveau}>
          <Paragraphe texte={criteres} />
        </Section>
      ) : null}

      <LimitesEtSortie moteur={moteur} limitations={prompt.limitations} niveau={niveau} />
    </>
  );
}

/**
 * Ce que la commande refuse, et comment l'interrompre.
 *
 * Les deux fins de fiche se ressemblent parce que les deux repondent a la
 * meme inquietude : jusqu'ou va-t-elle toute seule, et comment je reprends la
 * main.
 */
function LimitesEtSortie({
  moteur,
  limitations,
  niveau,
}: {
  moteur: PromptCard['moteur'];
  limitations: string | null;
  niveau?: NiveauDeTitre;
}) {
  const jalons = lireLesJalons(moteur?.regleSortie ?? null);

  return (
    <>
      {moteur?.erreurs ? (
        <Section titre="Ce qu’il ne fera pas" niveau={niveau}>
          <p className="rounded-[color:var(--radius-control)] bg-[color:var(--color-member-soft)] px-3 py-2.5 text-[13px] leading-relaxed text-[color:var(--color-member)]">
            {moteur.erreurs}
          </p>
        </Section>
      ) : limitations ? (
        <Section titre="Ce qu’il ne fera pas" niveau={niveau}>
          <p className="rounded-[color:var(--radius-control)] bg-[color:var(--color-member-soft)] px-3 py-2.5 text-[13px] leading-relaxed text-[color:var(--color-member)]">
            {limitations}
          </p>
        </Section>
      ) : null}

      {jalons ? (
        <Section titre="Reprendre la main" niveau={niveau}>
          <dl className="flex flex-col gap-1.5">
            {jalons.map((jalon) => (
              <div key={jalon.moment} className="flex flex-wrap items-baseline gap-x-2">
                <dt className="text-[length:var(--texte-carte)] font-semibold text-[color:var(--color-night)]">
                  {jalon.moment}
                </dt>
                <dd className="text-[length:var(--texte-carte)] leading-snug text-[color:var(--color-muted)]">
                  {jalon.effet}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : moteur?.regleSortie ? (
        <Section titre="Reprendre la main" niveau={niveau}>
          <Paragraphe texte={moteur.regleSortie} />
        </Section>
      ) : null}
    </>
  );
}

/**
 * Un champ du catalogue, affiche tel qu'il est ecrit.
 *
 * Le catalogue ecrit ses methodes en phrases courtes separees par des points
 * ou des points-virgules. Les couper en liste les rendrait plus lisibles,
 * mais c'est une reformulation : un point-virgule au milieu d'une enumeration
 * ne separe pas toujours deux etapes. La fiche montre la phrase.
 */
function Paragraphe({ texte }: { texte: string }) {
  return (
    <p className="text-[length:var(--texte-carte)] leading-relaxed text-[color:var(--color-night)]">
      {texte}
    </p>
  );
}
