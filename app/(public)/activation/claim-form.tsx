'use client';

import { useActionState } from 'react';
import { claimAccess, type ActionState } from '@/lib/actions/auth';
import { Field, FormError, FormNotice, SubmitButton } from '@/components/ui/form-status';

export function ClaimForm() {
  const [state, action] = useActionState<ActionState, FormData>(claimAccess, {});

  return (
    <form action={action} className="mt-6 space-y-4">
      <Field label="Email de l achat" name="email" type="email" autoComplete="email" />
      <Field
        label="Licence"
        name="license"
        autoComplete="off"
        placeholder="XXXX-XXXX"
        hint="Elle figure sur votre confirmation d achat."
      />
      <Field
        label="Choisir un mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="8 caracteres minimum."
      />
      <FormError message={state.error} />
      <FormNotice message={state.success} />
      <SubmitButton>Activer mon acces</SubmitButton>
    </form>
  );
}
