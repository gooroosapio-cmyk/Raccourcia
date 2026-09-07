import Link from 'next/link';
import { signOut } from '@/lib/actions/auth';

/**
 * Sortie de session.
 *
 * En rouge, parce que c'est la seule action de la page qui interrompt
 * quelque chose : tout le reste y mene ailleurs. La couleur signale la
 * consequence avant le geste, et evite de la confondre avec les lignes de
 * reglages juste au-dessus.
 *
 * Le rouge reste tenu — texte et bordure sur fond clair, pas un aplat. Un
 * bouton plein rouge crierait a la destruction irreversible, alors qu'on se
 * reconnecte en deux champs.
 */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className={STYLE_SORTIE}>
        Se déconnecter
      </button>
    </form>
  );
}

/**
 * Meme bouton pour un visiteur, qui n'a aucune session a fermer.
 *
 * « Se deconnecter » lui promettrait de defaire une connexion qu'il n'a pas
 * faite. Il sort simplement de la bibliotheque et retrouve l'accueil : le mot
 * juste est « Sortir », et le geste est un lien, pas une action serveur.
 */
export function ExitButton() {
  return (
    <Link href="/" className={STYLE_SORTIE}>
      Sortir
    </Link>
  );
}

const STYLE_SORTIE =
  'flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-danger)]/35 bg-[color:var(--color-danger-soft)] text-[length:var(--texte-corps)] font-semibold text-[color:var(--color-danger)] transition-colors duration-[var(--duration-fast)] active:bg-[color:var(--color-danger)]/15';
