'use client';

import { useActionState, useState } from 'react';
import { recoverAccess, type ActionState } from '@/lib/actions/auth';
import { PasswordField } from '@/components/ui/password-field';
import { Field, FormError, SubmitButton } from '@/components/ui/form-status';

/**
 * Recuperation d'acces : meme forme que l'activation, meme raison.
 *
 * Le nouveau mot de passe ne se choisit qu'apres avoir dit lequel des acces
 * on recupere. Et il se confirme : c'est le dernier ecran ou une faute de
 * frappe se rattrape encore.
 */
export function RecoverForm() {
  const [state, action] = useActionState<ActionState, FormData>(recoverAccess, {});
  const [email, setEmail] = useState('');
  const [licence, setLicence] = useState('');

  const preuveFournie = email.includes('@') && licence.trim().length >= 6;

  return (
    <form action={action} className="mt-6 space-y-4">
      <Field
        label="Email de l’achat"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
      />
      <Field
        label="Licence"
        name="license"
        autoComplete="off"
        placeholder="XXXX-XXXX"
        value={licence}
        onChange={setLicence}
      />

      {preuveFournie ? (
        <div className="anim-apparition space-y-4">
          <PasswordField
            label="Nouveau mot de passe"
            name="password"
            autoComplete="new-password"
            hint="8 caractères minimum."
          />
          <PasswordField
            label="Confirmer le mot de passe"
            name="passwordConfirm"
            autoComplete="new-password"
          />
        </div>
      ) : (
        <p className="text-[length:var(--texte-meta)] text-[color:var(--color-muted)]">
          Le choix du mot de passe s’affiche dès que votre email et votre licence sont renseignés.
        </p>
      )}

      <FormError message={state.error} />
      {preuveFournie ? <SubmitButton>Récupérer mon accès</SubmitButton> : null}
    </form>
  );
}
