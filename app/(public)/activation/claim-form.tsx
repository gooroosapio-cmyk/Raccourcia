'use client';

import { useActionState, useState } from 'react';
import { claimAccess, type ActionState } from '@/lib/actions/auth';
import { PasswordField } from '@/components/ui/password-field';
import { Field, FormError, FormNotice, SubmitButton } from '@/components/ui/form-status';

/**
 * Activation : l'acheteur transforme sa preuve d'achat en compte.
 *
 * Le choix du mot de passe n'apparait qu'une fois l'email et la licence
 * saisis. Presente d'emblee, la section faisait lire quatre champs a qui
 * n'etait venu que verifier qu'il avait bien recu son acces, et laissait
 * croire qu'on ouvrait un compte de plus. Dans cet ordre, l'ecran pose
 * d'abord la question a laquelle l'acheteur a la reponse sous les yeux — son
 * email et sa licence — puis la seule qui lui demande de decider.
 *
 * La confirmation ferme le piege du clavier tactile : un mot de passe mal
 * tape ici enfermerait dehors quelqu'un qui vient de payer.
 */
export function ClaimForm() {
  const [state, action] = useActionState<ActionState, FormData>(claimAccess, {});
  const [email, setEmail] = useState('');
  const [licence, setLicence] = useState('');

  // Memes bornes que le schema serveur : l'ecran ne s'ouvre pas sur une
  // saisie que la validation refusera de toute facon.
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
        hint="Elle figure sur votre confirmation d’achat."
        value={licence}
        onChange={setLicence}
      />

      {preuveFournie ? (
        <div className="anim-apparition space-y-4">
          <PasswordField
            label="Choisir un mot de passe"
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
      <FormNotice message={state.success} />
      {preuveFournie ? <SubmitButton>Activer mon accès</SubmitButton> : null}
    </form>
  );
}
