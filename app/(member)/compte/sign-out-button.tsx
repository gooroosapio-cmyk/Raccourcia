import { signOut } from '@/lib/actions/auth';

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[15px] font-medium text-[color:var(--color-night)]"
      >
        Se déconnecter
      </button>
    </form>
  );
}
