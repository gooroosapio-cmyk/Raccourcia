import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

import { ChatGPTLogo, ClaudeLogo, GeminiLogo } from '@/components/brand/ai-logos';
import { AvisCarrousel } from '@/components/landing/avis-carrousel';
import { BlocAchat, MoyensPaiement } from '@/components/landing/bloc-achat';
import { Button, FlecheIcone } from '@/components/landing/button';
import { Comparateur } from '@/components/landing/comparateur';
import { ContextLogicCard, QuestionExempleMock } from '@/components/landing/context-logic-card';
import { FAQAccordion, type EntreeFAQ } from '@/components/landing/faq-accordion';
import { LandingHeader } from '@/components/landing/landing-header';
import { PricingCard } from '@/components/landing/pricing-card';
import { SectionNumerotee } from '@/components/landing/section-numerotee';
import { ShowcaseCard } from '@/components/landing/showcase-card';
import { StickyMobileCTA } from '@/components/landing/sticky-mobile-cta';
import { isCatalogUnavailable } from '@/lib/catalog/errors';
import {
  getCategoriesVitrine,
  getPublicConfig,
  getQuestionExemple,
  getShowcasePrompts,
  type CategorieVitrine,
} from '@/lib/catalog/queries';
import { avisPublies } from '@/lib/landing/avis';

/**
 * Page de vente de RaccourcIA.
 *
 * Elle vit hors des groupes `(public)` et `(member)` : ni l'en-tete du site,
 * ni la barre basse de l'application ne la traversent. Une page de vente a sa
 * propre navigation, tournee vers deux gestes — regarder la bibliotheque, ou
 * acheter.
 *
 * Elle n'est liee depuis nulle part et n'est pas indexee : on y arrive par son
 * adresse, donnee a qui de droit.
 *
 * Rien n'y est ecrit en dur de ce que le produit sait deja : le prix vient de
 * la configuration, les commandes et les categories du catalogue, les volumes
 * d'un comptage. Une page de vente qui recopie ses chiffres finit toujours par
 * annoncer un catalogue qui n'existe plus.
 */
export const metadata: Metadata = {
  title: 'RaccourcIA — La bonne commande, en un geste',
  description:
    'RaccourcIA rassemble des commandes claires pour vous aider à créer, écrire, analyser et avancer plus vite avec vos IA préférées.',
  robots: { index: false, follow: false },
};

/**
 * Raccourcis montres en vitrine, dans cet ordre.
 *
 * La liste est editoriale ; son contenu vient du catalogue. Une commande qui
 * en disparait disparait de la page, au lieu d'y survivre en promesse.
 */
const VITRINE = ['/xray', '/explodeview', '/packshot', '/poster', '/headshot', '/blueprint'];

export default async function LandingPage() {
  const config = await getPublicConfig();

  let vitrine: Awaited<ReturnType<typeof getShowcasePrompts>> = [];
  let categories: CategorieVitrine[] = [];
  let question: Awaited<ReturnType<typeof getQuestionExemple>> = null;

  // Le catalogue peut etre injoignable : la page doit alors tenir debout sans
  // lui. Ses arguments ne dependent pas de la grille.
  try {
    [vitrine, categories, question] = await Promise.all([
      getShowcasePrompts(VITRINE),
      getCategoriesVitrine(),
      getQuestionExemple('/xray'),
    ]);
  } catch (error) {
    if (!isCatalogUnavailable(error)) throw error;
  }

  const prix = `${new Intl.NumberFormat('fr-FR').format(config.price.current)} ${config.price.currency}`;
  // La porte d'achat interne garde l'adresse de la boutique en un seul endroit
  // et n'expose pas le prestataire de paiement dans la page.
  const boutique = '/acheter';

  // Compte ce que le visiteur trouvera reellement : les raccourcis des
  // categories publiees, et non tout ce que porte la base.
  const totalRaccourcis = categories.reduce((somme, categorie) => somme + categorie.raccourcis, 0);
  const avis = avisPublies();

  return (
    <>
      <LandingHeader purchaseUrl={boutique} prix={prix} />

      <main id="haut" className="bg-[color:var(--color-surface)]">
        <Hero purchaseUrl={boutique} prix={prix} />
        <Chiffres total={totalRaccourcis} categories={categories.length} prix={prix} />
        <Probleme />
        <Difference />
        <Systeme />
        <Bibliotheque vitrine={vitrine} categories={categories} total={totalRaccourcis} />
        <Contexte question={question} />
        <Preuve avis={avis} />
        <Offre purchaseUrl={boutique} prix={prix} total={totalRaccourcis} />
        <AvantDeDecider total={totalRaccourcis} />
        <CtaFinal purchaseUrl={boutique} prix={prix} />
      </main>

      <PiedDePage />
      <StickyMobileCTA purchaseUrl={boutique} prix={prix} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Mise en page commune                                                */
/* ------------------------------------------------------------------ */

function Section({
  id,
  children,
  fond = 'clair',
}: {
  id?: string;
  children: React.ReactNode;
  fond?: 'clair' | 'teinte';
}) {
  return (
    <section
      id={id}
      // `scroll-mt` compense l'en-tete fixe : sans lui, une ancre depose son
      // titre sous la barre.
      className={`scroll-mt-20 ${
        fond === 'teinte' ? 'bg-[color:var(--color-canvas)]' : 'bg-[color:var(--color-surface)]'
      }`}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Accueil                                                             */
/* ------------------------------------------------------------------ */

function Hero({ purchaseUrl, prix }: { purchaseUrl: string; prix: string }) {
  return (
    <section className="border-b border-[color:var(--color-line)] bg-gradient-to-b from-[color:var(--color-sky)]/55 to-[color:var(--color-surface)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex rounded-full border border-[color:var(--color-brand)]/25 bg-[color:var(--color-surface)] px-4 py-2 text-[length:var(--texte-carte)] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-brand)]">
            La bibliothèque de commandes IA
          </p>

          <h1 className="mt-5 text-[36px] font-bold leading-[1.08] tracking-tight text-[color:var(--color-night)] sm:text-[54px]">
            La bonne commande,
            <br />
            <span className="text-[color:var(--color-brand)]">en un geste.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-[52ch] text-[17px] leading-[1.6] text-[color:var(--color-muted)] sm:text-[19px]">
            RaccourcIA rassemble des commandes claires pour vous aider à créer, écrire, analyser et
            avancer plus vite avec vos IA préférées.
          </p>

          <div className="mt-8">
            <BlocAchat purchaseUrl={purchaseUrl} prix={prix} libelle="Accès à vie" />
          </div>
        </div>

        <Image
          src="/landing/hero.webp"
          alt="La bibliothèque RaccourcIA sur un téléphone, à côté de la fiche d’une commande montrant un avant et un après."
          width={1400}
          height={788}
          priority
          sizes="(max-width: 1024px) 100vw, 1000px"
          className="mx-auto mt-10 w-full max-w-4xl rounded-[20px] border border-[color:var(--color-line)] shadow-[var(--shadow-raised)]"
        />
      </div>
    </section>
  );
}

/**
 * Quatre chiffres, tous verifiables.
 *
 * Aucun compteur d'acheteurs, aucune moyenne de satisfaction : ce sont les
 * volumes du catalogue et le prix, c'est-a-dire ce que l'on peut montrer si
 * on le demande.
 */
function Chiffres({
  total,
  categories,
  prix,
}: {
  total: number;
  categories: number;
  prix: string;
}) {
  const chiffres = [
    { valeur: total > 0 ? `${total}` : '—', libelle: 'commandes prêtes à utiliser' },
    { valeur: categories > 0 ? `${categories}` : '—', libelle: 'catégories classées par besoin' },
    { valeur: '3', libelle: 'IA compatibles : ChatGPT, Claude, Gemini' },
    { valeur: prix, libelle: 'une seule fois, accès à vie' },
  ];

  return (
    <section className="border-b border-[color:var(--color-line)] bg-[color:var(--color-canvas)]">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 px-4 py-8 sm:px-6 lg:grid-cols-4">
        {chiffres.map((chiffre) => (
          <div
            key={chiffre.libelle}
            className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-5 text-center"
          >
            <p className="text-[24px] font-bold leading-none tracking-tight text-[color:var(--color-brand)] sm:text-[28px]">
              {chiffre.valeur}
            </p>
            <p className="mt-2 text-[length:var(--texte-carte)] leading-[1.4] text-[color:var(--color-muted)]">
              {chiffre.libelle}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 01 — Le probleme                                                    */
/* ------------------------------------------------------------------ */

function Probleme() {
  const constats = [
    {
      titre: 'Des fichiers qui se perdent',
      corps: 'Les PDF de commandes finissent au fond des téléchargements, et on ne les rouvre pas.',
    },
    {
      titre: 'Des notes introuvables',
      corps:
        'La commande qui marchait bien est quelque part, dans une note, dans une conversation.',
    },
    {
      titre: 'Des recherches à recommencer',
      corps:
        'À chaque fois, il faut retrouver quoi demander, comment le formuler, dans quel ordre.',
    },
  ];

  return (
    <Section>
      <SectionNumerotee
        numero="01"
        intitule="Le problème"
        titre="Vous savez ce que vous voulez faire. "
        accent="Le dire à l’IA prend du temps."
        intro="Ce n’est pas l’idée qui manque, c’est la formulation. Et elle se reconstruit à chaque fois, depuis zéro."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {constats.map((constat) => (
          <div
            key={constat.titre}
            className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] p-5"
          >
            <h3 className="text-[length:var(--texte-section)] font-bold text-[color:var(--color-night)]">
              {constat.titre}
            </h3>
            <p className="mt-2 text-[length:var(--texte-corps)] leading-[1.55] text-[color:var(--color-muted)]">
              {constat.corps}
            </p>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-[17px] font-semibold leading-[1.5] text-[color:var(--color-night)] sm:text-[19px]">
        Une intention claire mérite une commande adaptée.
      </p>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 02 — La difference                                                  */
/* ------------------------------------------------------------------ */

function Difference() {
  return (
    <Section fond="teinte">
      <SectionNumerotee
        numero="02"
        intitule="La différence"
        titre="Même IA. Même idée. "
        accent="Deux résultats."
        intro="Ce qui change n’est pas l’outil, c’est ce qu’on lui demande. Une commande claire donne à l’IA le cadre qui lui manquait."
      />

      <div className="mt-9">
        <Comparateur
          panneaux={[
            {
              cle: 'sans',
              onglet: 'Sans RaccourcIA',
              titre: 'On reformule, on teste, on recommence',
              lignes: [
                'Vous écrivez une demande vague, puis vous la réécrivez.',
                'Vous testez plusieurs formulations pour voir laquelle passe.',
                'Vous cherchez la commande que vous aviez notée quelque part.',
                'Le résultat reste approximatif, et vous hésitez à le réutiliser.',
              ],
            },
            {
              cle: 'avec',
              onglet: 'Avec RaccourcIA',
              titre: 'On part d’une commande déjà claire',
              lignes: [
                'Vous cherchez par besoin, pas par mot-clé.',
                'Vous voyez le cas d’usage et le résultat attendu avant de copier.',
                'Vous savez ce qu’il faut fournir en entrée et ce qui sort à l’arrivée.',
                'Vous copiez, vous utilisez, vous ajustez seulement si besoin.',
              ],
            },
          ]}
        />
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-[length:var(--texte-corps)] leading-[1.6] text-[color:var(--color-muted)]">
        Moins d’allers-retours. Plus de temps pour vos idées.
      </p>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 03 — Le systeme                                                     */
/* ------------------------------------------------------------------ */

function Systeme() {
  const etapes = [
    {
      cle: 'Le besoin',
      titre: 'Choisissez votre besoin',
      corps: 'Image, texte, travail, communication ou idée. La bibliothèque est classée par usage.',
    },
    {
      cle: 'Le résultat',
      titre: 'Comprenez le résultat attendu',
      corps: 'Chaque commande présente un cas d’usage clair, ses entrées et sa sortie.',
    },
    {
      cle: 'La copie',
      titre: 'Copiez et utilisez',
      corps: 'Utilisez votre commande dans ChatGPT, Claude ou Gemini, celle que vous préférez.',
    },
  ];

  return (
    <Section id="fonctionnement">
      <SectionNumerotee
        numero="03"
        intitule="Le système"
        titre="Trouvez le bon raccourci "
        accent="en quelques gestes."
        intro="De la recherche au copier-coller, en quelques secondes. Rien à installer, rien à configurer."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {etapes.map((etape, index) => (
          <div
            key={etape.cle}
            className="rounded-[20px] border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] p-5"
          >
            <p className="text-[length:var(--texte-carte)] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
              <span className="text-[color:var(--color-brand)]">0{index + 1}</span> — {etape.cle}
            </p>
            <h3 className="mt-3 text-[length:var(--texte-section)] font-bold text-[color:var(--color-night)]">
              {etape.titre}
            </h3>
            <p className="mt-2 text-[length:var(--texte-corps)] leading-[1.55] text-[color:var(--color-muted)]">
              {etape.corps}
            </p>

            {/* L'etat de succes de la copie, montre a l'etape ou il arrive.
                Il n'est pas cliquable : c'est l'illustration de ce que
                l'application affiche, pas un bouton qui ne ferait rien. */}
            {index === 2 ? (
              <span className="mt-4 inline-flex items-center gap-2 rounded-[color:var(--radius-control)] bg-[color:var(--color-success-soft)] px-3 py-2 text-[length:var(--texte-carte)] font-semibold text-[color:var(--color-success)]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m5 13 4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Commande copiée
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <Image
        src="/landing/etapes.webp"
        alt="Trois écrans : la bibliothèque, la fiche d’une commande, puis la commande copiée vers ChatGPT, Claude ou Gemini."
        width={1400}
        height={788}
        loading="lazy"
        sizes="(max-width: 1024px) 100vw, 1100px"
        className="mt-9 w-full rounded-[20px] border border-[color:var(--color-line)] shadow-[var(--shadow-card)]"
      />

      <div className="mt-9">
        <p className="text-center text-[length:var(--texte-corps)] text-[color:var(--color-muted)]">
          Copiez une commande depuis RaccourcIA et utilisez-la dans l’IA qui vous convient.
        </p>
        <div className="mt-4">
          <LogosIA />
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 04 — La bibliotheque                                                */
/* ------------------------------------------------------------------ */

function Bibliotheque({
  vitrine,
  categories,
  total,
}: {
  vitrine: Awaited<ReturnType<typeof getShowcasePrompts>>;
  categories: CategorieVitrine[];
  total: number;
}) {
  const image = categories.filter((categorie) => categorie.mode === 'image');
  const texte = categories.filter((categorie) => categorie.mode === 'texte');

  return (
    <Section id="bibliotheque" fond="teinte">
      <SectionNumerotee
        numero="04"
        intitule="La bibliothèque"
        titre="Tout ce que vous voulez demander à l’IA, "
        accent="sans repartir de zéro."
        intro={
          total > 0
            ? `${total} commandes classées par besoin, en Image comme en Texte.`
            : 'Des commandes classées par besoin, en Image comme en Texte.'
        }
      />

      {vitrine.length > 0 ? (
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {vitrine.map((prompt, index) => (
            <ShowcaseCard key={prompt.id} prompt={prompt} priority={index < 2} />
          ))}
        </div>
      ) : null}

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <FamilleCategories
          titre="Commandes Image"
          intro="Donnez une nouvelle forme à vos images : produit, portrait, lieu, objet ou idée."
          categories={image}
        />
        <FamilleCategories
          titre="Commandes Texte"
          intro="Une bonne commande pour chaque tâche : écrire, communiquer, apprendre, organiser ou décider."
          categories={texte}
        />
      </div>

      <div className="mt-8 flex justify-center">
        <Button href="/app" ton="contour" pleineLargeur className="sm:w-auto">
          Voir toutes les commandes
          <FlecheIcone />
        </Button>
      </div>
    </Section>
  );
}

function FamilleCategories({
  titre,
  intro,
  categories,
}: {
  titre: string;
  intro: string;
  categories: CategorieVitrine[];
}) {
  if (categories.length === 0) return null;

  return (
    <div className="rounded-[20px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 sm:p-6">
      <h3 className="text-[length:var(--texte-section)] font-bold text-[color:var(--color-night)]">
        {titre}
      </h3>
      <p className="mt-1.5 text-[length:var(--texte-corps)] leading-[1.55] text-[color:var(--color-muted)]">
        {intro}
      </p>

      <ul className="mt-4 flex flex-col divide-y divide-[color:var(--color-line)]">
        {categories.map((categorie) => (
          <li
            key={categorie.nom}
            className="flex items-center justify-between gap-3 py-2.5 text-[length:var(--texte-corps)]"
          >
            <span className="text-[color:var(--color-night)]">{categorie.nom}</span>
            <span className="shrink-0 rounded-full bg-[color:var(--color-sky)] px-2.5 py-1 text-[length:var(--texte-meta)] font-semibold text-[color:var(--color-brand-strong)]">
              {categorie.raccourcis}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 05 — Le contexte                                                    */
/* ------------------------------------------------------------------ */

function Contexte({ question }: { question: Awaited<ReturnType<typeof getQuestionExemple>> }) {
  return (
    <Section>
      <SectionNumerotee
        numero="05"
        intitule="Le contexte"
        titre="Une commande qui tient compte "
        accent="de votre besoin."
        intro="Chaque commande dit à l’IA quoi faire de ce que vous lui donnez déjà — votre message, votre image, votre document et votre objectif."
      />

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <ContextLogicCard
          ton="complet"
          etat="Le contexte est clair"
          titre="Votre commande est prête"
          corps="Lorsque votre demande contient déjà les informations utiles, la commande s’exécute sans rien vous redemander."
        />

        <ContextLogicCard
          ton="question"
          etat="Une précision manque"
          titre="Une question courte, puis la suite"
          corps="Lorsqu’une information essentielle manque, la commande demande à l’IA de poser une question courte, puis de poursuivre avec votre réponse."
        >
          {question ? (
            <QuestionExempleMock question={question.question} choix={question.choices} />
          ) : null}
        </ContextLogicCard>
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-[length:var(--texte-corps)] leading-[1.6] text-[color:var(--color-muted)]">
        Pas de formulaire inutile. Seulement les précisions qui améliorent réellement le résultat.
      </p>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 06 — La preuve                                                      */
/* ------------------------------------------------------------------ */

function Preuve({ avis }: { avis: ReturnType<typeof avisPublies> }) {
  return (
    <Section fond="teinte">
      <SectionNumerotee
        numero="06"
        intitule="Un exemple"
        titre="Voyez ce qu’une commande claire "
        accent="peut déclencher."
        intro="Une commande bien formulée donne à l’IA le bon cadre pour mieux répondre à votre intention."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:items-center">
        <Image
          src="/landing/avant-apres-xray.webp"
          alt="Une voiture photographiée normalement, puis la même en vue transparente laissant voir ses composants internes."
          width={1000}
          height={1250}
          loading="lazy"
          sizes="(max-width: 1024px) 100vw, 460px"
          className="w-full rounded-[20px] border border-[color:var(--color-line)] shadow-[var(--shadow-card)]"
        />

        <div>
          <p className="text-[length:var(--texte-corps)] leading-[1.65] text-[color:var(--color-night)]">
            Une même photo, une commande de la bibliothèque, et un résultat que l’on peut montrer.
            Le rendu dépend de votre image de départ et de l’IA utilisée : c’est un exemple, pas une
            promesse de résultat identique.
          </p>

          {avis.length > 0 ? (
            <div className="mt-8">
              <h3 className="text-[length:var(--texte-carte)] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
                Ils utilisent RaccourcIA
              </h3>
              <div className="mt-4">
                <AvisCarrousel avis={avis} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 07 — L'offre                                                        */
/* ------------------------------------------------------------------ */

function Offre({ purchaseUrl, prix, total }: { purchaseUrl: string; prix: string; total: number }) {
  const inclus = [
    total > 0
      ? `Les ${total} commandes incluses dans l’offre, en Image et en Texte`
      : 'Les commandes incluses dans l’offre, en Image et en Texte',
    'Les commandes réservées aux membres, débloquées',
    'La consultation depuis vos appareils, avec le même compte',
    'L’activation de votre accès après l’achat',
  ];

  return (
    <Section id="offre">
      <SectionNumerotee
        numero="07"
        intitule="L’offre"
        titre="Toute la bibliothèque. "
        accent="Un seul paiement."
        intro="Accédez aux commandes incluses dans l’offre et retrouvez-les depuis votre compte, quand vous en avez besoin."
      />

      <div className="mt-10 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <div className="order-1">
          <PricingCard prix={prix} purchaseUrl={purchaseUrl} inclus={inclus} />
        </div>

        <Image
          src="/landing/offre-lifestyle.webp"
          alt="Une personne consulte la bibliothèque RaccourcIA sur son téléphone."
          width={900}
          height={1125}
          loading="lazy"
          sizes="(max-width: 1024px) 100vw, 420px"
          className="order-2 w-full rounded-[20px] border border-[color:var(--color-line)] shadow-[var(--shadow-card)]"
        />
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 08 — Avant de decider                                               */
/* ------------------------------------------------------------------ */

function AvantDeDecider({ total }: { total: number }) {
  const entrees: EntreeFAQ[] = [
    {
      question: 'Qu’est-ce que RaccourcIA ?',
      reponse:
        'Une bibliothèque de commandes prêtes à utiliser. Vous cherchez ce que vous voulez faire, vous copiez la commande correspondante, puis vous l’utilisez dans l’IA de votre choix.',
    },
    {
      question: 'RaccourcIA est-il une IA ?',
      reponse:
        'Non. RaccourcIA vous aide à trouver et copier une commande adaptée, puis vous l’utilisez dans l’IA de votre choix.',
    },
    {
      question: 'Puis-je l’utiliser si je débute ?',
      reponse:
        'Oui. Les commandes sont classées par besoin et accompagnées de cas d’usage clairs. Vous n’avez rien à écrire vous-même.',
    },
    {
      question: 'Avec quelles IA puis-je utiliser les commandes ?',
      reponse:
        'Avec ChatGPT, Claude et Gemini. Chaque commande indique les IA avec lesquelles elle fonctionne, et signale les cas où la génération d’image dépend de l’interface utilisée.',
    },
    {
      question: 'Les résultats seront-ils toujours identiques ?',
      reponse:
        'Non. Le résultat dépend aussi de l’outil d’IA choisi, de votre entrée et du contexte fourni.',
    },
    {
      question: 'Que se passe-t-il après mon achat ?',
      reponse: (
        <>
          Vous recevez une licence, puis vous activez votre accès sur{' '}
          <Link
            href="/activation"
            className="font-medium text-[color:var(--color-brand)] underline underline-offset-2"
          >
            la page d’activation
          </Link>{' '}
          avec l’email de votre achat. Vous choisissez votre mot de passe, et la bibliothèque
          s’ouvre.
        </>
      ),
    },
    {
      question: 'Puis-je d’abord découvrir la plateforme ?',
      reponse: (
        <>
          Oui.{' '}
          <Link
            href="/app"
            className="font-medium text-[color:var(--color-brand)] underline underline-offset-2"
          >
            La bibliothèque
          </Link>{' '}
          se parcourt sans compte, et des commandes gratuites sont copiables pour juger par
          vous-même avant d’acheter.
        </>
      ),
    },
    {
      question: 'Que comprend exactement l’accès ?',
      reponse:
        total > 0
          ? `Les ${total} commandes publiées dans la bibliothèque au moment de votre achat, consultables depuis votre compte, sans limite de durée.`
          : 'Les commandes publiées dans la bibliothèque au moment de votre achat, consultables depuis votre compte, sans limite de durée.',
    },
  ];

  return (
    <Section fond="teinte">
      <SectionNumerotee
        numero="08"
        intitule="Avant de décider"
        titre="Les questions "
        accent="que vous vous posez."
      />

      <div className="mx-auto mt-9 max-w-3xl">
        <FAQAccordion entrees={entrees} />
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Appel final et pied de page                                         */
/* ------------------------------------------------------------------ */

function CtaFinal({ purchaseUrl, prix }: { purchaseUrl: string; prix: string }) {
  return (
    <Section>
      <div className="rounded-[24px] bg-[color:var(--color-night)] px-5 py-12 text-center sm:px-10 sm:py-16">
        <h2 className="mx-auto max-w-[24ch] text-[28px] font-bold leading-[1.14] tracking-tight text-white sm:text-[38px]">
          Passez moins de temps à reformuler.{' '}
          <span className="text-[color:var(--color-brand)]">Plus de temps à créer.</span>
        </h2>

        <div className="mt-8">
          <BlocAchat purchaseUrl={purchaseUrl} prix={prix} libelle="Accès à vie" sombre />
        </div>

        <div className="mt-6 rounded-[16px] bg-white/5 px-4 py-4">
          <MoyensPaiement />
        </div>
      </div>
    </Section>
  );
}

function PiedDePage() {
  const liens = [
    { href: '/app', libelle: 'La bibliothèque' },
    { href: '/legal/mentions', libelle: 'Mentions légales' },
    { href: '/legal/confidentialite', libelle: 'Politique de confidentialité' },
    { href: '/legal/conditions', libelle: 'Conditions d’utilisation' },
    // Les coordonnees de l'editeur vivent dans les mentions legales : les
    // recopier ici les ferait diverger a la premiere correction.
    { href: '/legal/mentions', libelle: 'Contact' },
  ];

  return (
    <footer className="border-t border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <p className="mx-auto max-w-2xl text-center text-[17px] font-semibold leading-[1.5] text-[color:var(--color-night)]">
          Des idées plus claires. Des commandes plus utiles. Plus de temps pour créer.
        </p>

        <div className="mt-9 flex flex-col gap-6 border-t border-[color:var(--color-line)] pt-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Image
              src="/landing/logo-raccourcia.webp"
              alt="RaccourcIA"
              width={720}
              height={158}
              loading="lazy"
              className="h-7 w-auto"
            />
            <p className="mt-3 max-w-[38ch] text-[length:var(--texte-carte)] leading-[1.55] text-[color:var(--color-muted)]">
              La bibliothèque de commandes pour ChatGPT, Claude et Gemini.
            </p>
          </div>

          <nav aria-label="Liens légaux" className="flex flex-col gap-1 sm:items-end">
            {liens.map((lien) => (
              <Link
                key={lien.libelle}
                href={lien.href}
                className="flex min-h-[44px] items-center text-[length:var(--texte-carte)] text-[color:var(--color-muted)] underline underline-offset-2 transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--color-night)]"
              >
                {lien.libelle}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-1 border-t border-[color:var(--color-line)] pt-6 text-[length:var(--texte-meta)] text-[color:var(--color-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>RaccourcIA</p>
          <p>Propulsé par Gooroo</p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Compatibilite, dans la section systeme                              */
/* ------------------------------------------------------------------ */

function LogosIA() {
  const outils = [
    { nom: 'ChatGPT', Logo: ChatGPTLogo },
    { nom: 'Claude', Logo: ClaudeLogo },
    { nom: 'Gemini', Logo: GeminiLogo },
  ];

  return (
    <ul className="flex flex-wrap items-center justify-center gap-3">
      {outils.map(({ nom, Logo }) => (
        <li
          key={nom}
          className="flex min-h-[48px] items-center gap-2.5 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-2.5"
        >
          {/* Le nom est ecrit juste a cote : le logo devient decoratif,
              sinon un lecteur d'ecran annonce « ChatGPT ChatGPT ». */}
          <Logo taille={20} decoratif />
          <span className="text-[length:var(--texte-corps)] font-semibold text-[color:var(--color-night)]">
            {nom}
          </span>
        </li>
      ))}
    </ul>
  );
}
