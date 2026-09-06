'use client';

import { useActionState } from 'react';
import { recoverAccess, type ActionState } from '@/lib/actions/auth';
import { PasswordField } from '@/components/ui/password-field';
import { Field, FormError, SubmitButton } from '@/components/ui/form-status';

export function RecoverForm() {
  const [state, action] = useActionState<ActionState, FormData>(recoverAccess, {});

  return (
    <form action={action} className="mt-6 space-y-4">
      <Field label="Email de l’achat" name="email" type="email" autoComplete="email" />
      <Field label="Licence" name="license" autoComplete="off" placeholder="XXXX-XXXX" />
      <PasswordField
        label="Nouveau mot de passe"
        name="password"
        autoComplete="new-password"
        hint="8 caractères minimum."
      />
      <FormError message={state.error} />
      <SubmitButton>Récupérer mon accès</SubmitButton>
    </form>
  );
}
