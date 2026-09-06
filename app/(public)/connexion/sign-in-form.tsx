'use client';

import { useActionState } from 'react';
import { signIn, type ActionState } from '@/lib/actions/auth';
import { PasswordField } from '@/components/ui/password-field';
import { Field, FormError, SubmitButton } from '@/components/ui/form-status';

export function SignInForm({ suite }: { suite?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(signIn, {});

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="suite" value={suite ?? ''} />
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <PasswordField label="Mot de passe" name="password" autoComplete="current-password" />
      <FormError message={state.error} />
      <SubmitButton>Se connecter</SubmitButton>
    </form>
  );
}
