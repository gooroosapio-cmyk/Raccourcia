import Link from 'next/link';
import { getAccessState } from '@/lib/access/entitlement';
import { getProfile, isAdmin } from '@/lib/auth/session';
import { SignOutButton } from '@/app/(member)/compte/sign-out-button';
import { LegalFooter } from '@/components/navigation/legal-footer';

export const metadata = { title: 'Compte' };

/**
 * Page Compte.
 *
 * Elle repond a trois questions et pas une de plus : ou en est mon acces,
 * comment je change mon mot de passe, comment je me deconnecte. Le reste est
 * une liste de liens compacte plutot qu'une suite d'encadres titres — quatre
 * cartes pour quatre liens faisaient defiler une page qui n'a presque rien a
 * dire.
 *
 * La liste des appareils connectes a ete retiree de l'interface. Elle
 * demandait a un membre d'arbitrer une limite technique qu'il n'a pas choisie,
 * et sa seule action possible — deconnecter un appareil — n'a de sens qu'une
 * fois deja bloque. Le mecanisme de session reste entier cote serveur : c'est
 * sa presentation qui disparait, pas la regle.
 */
export default async function AccountPage() {
  const [profile, access, administrateur] = await Promise.all([
    getProfile(),
    getAccessState(),
    isAdmin(),
  ]);

  return (
    <div className="space-y-4 pt-1">
      <h1 className="text-[length:var(--texte-page)] font-bold text-[color:var(--color-night)]">
        Compte
      </h1>

      {access.hasLifetimeAccess ? (
        <section className="flex items-center gap-3 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="m5 12.5 4.5 4.5L19 7.5"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-[length:var(--texte-corps)] font-semibold text-[color:var(--color-night)]">
              Votre accès est actif
            </span>
            {profile ? (
              <span className="block truncate text-[length:var(--texte-meta)] text-[color:var(--color-muted)]">
                {profile.email}
              </span>
            ) : null}
          </span>
        </section>
      ) : (
        <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
          <p className="text-[length:var(--texte-corps)] font-semibold text-[color:var(--color-night)]">
            Aucun accès actif
          </p>
          <p className="mt-1 text-[length:var(--texte-carte)] leading-[1.45] text-[color:var(--color-muted)]">
            Activez votre achat pour copier toutes les commandes.
          </p>
          {profile ? (
            <p className="mt-1.5 truncate text-[length:var(--texte-meta)] text-[color:var(--color-muted)]">
              {profile.email}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/offre"
              className="inline-flex h-12 items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-4 text-[length:var(--texte-corps)] font-semibold text-white"
            >
              Voir l’offre
            </Link>
            <Link
              href="/activation"
              className="inline-flex h-12 items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] px-4 text-[length:var(--texte-corps)] font-medium text-[color:var(--color-night)]"
            >
              J’ai déjà acheté
            </Link>
          </div>
        </section>
      )}

      <nav className="overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
        <LigneReglage href="/recuperation" icone={<CadenasIcone />}>
          Modifier mon mot de passe
        </LigneReglage>
        <LigneReglage href="/legal/mentions" icone={<DocumentIcone />}>
          Mentions légales
        </LigneReglage>
        <LigneReglage href="/legal/confidentialite" icone={<BouclierIcone />}>
          Confidentialité
        </LigneReglage>
        <LigneReglage href="/legal/conditions" icone={<DocumentIcone />} dernier>
          Conditions
        </LigneReglage>
      </nav>

      {/*
        Seule entree vers le back-office depuis l'application. Elle n'apparait
        que pour un administrateur : la barre basse reste identique pour tout
        le monde, et personne ne decouvre l'existence de /admin en la lisant.

        Ce lien n'est pas la securite : `requireAdmin` puis les fonctions
        SECURITY DEFINER refusent un appelant sans role, quel que soit le
        chemin emprunte.
      */}
      {administrateur ? (
        <nav className="overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
          <LigneReglage href="/admin" icone={<ReglagesIcone />} badge="Admin" dernier>
            Ouvrir l’administration
          </LigneReglage>
        </nav>
      ) : null}

      <SignOutButton />

      <LegalFooter className="pt-2" />
    </div>
  );
}

/**
 * Une ligne de reglage : icone, libelle, chevron.
 *
 * Toute la ligne est cliquable sur 52 px de haut : viser un lien texte de
 * 15 px au pouce rate une fois sur trois.
 */
function LigneReglage({
  href,
  icone,
  children,
  badge,
  dernier = false,
}: {
  href: string;
  icone: React.ReactNode;
  children: React.ReactNode;
  badge?: string;
  dernier?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[52px] items-center gap-3 px-3.5 py-2.5 text-[length:var(--texte-corps)] text-[color:var(--color-night)] ${
        dernier ? '' : 'border-b border-[color:var(--color-line)]'
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[color:var(--color-sky)] text-[color:var(--color-brand)]">
        {icone}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {badge ? (
        <span className="shrink-0 rounded-full bg-[color:var(--color-brand-soft)] px-2 py-0.5 text-[length:var(--texte-meta)] font-semibold text-[color:var(--color-brand-strong)]">
          {badge}
        </span>
      ) : null}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0 text-[color:var(--color-muted)]"
      >
        <path
          d="m9 5 7 7-7 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}

function CadenasIcone() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 10V7a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DocumentIcone() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3h8l4 4v14H6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BouclierIcone() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 3v6c0 4.2-2.9 7.7-7 9-4.1-1.3-7-4.8-7-9V6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReglagesIcone() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
