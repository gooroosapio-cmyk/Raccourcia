'use client';

import type { ChampDeCommande } from '@/lib/catalog/types';

/**
 * Le formulaire d'une fiche : trois champs au plus, avant la copie.
 *
 * Certaines commandes de Textes et de Reflexions ont besoin de trois choses
 * pour servir — un chiffre, un secteur, un ton. Les laisser demander dans la
 * conversation coute trois allers-retours a chaque usage ; les inscrire dans
 * le texte copie ne coute rien.
 *
 * Ce n'est pas un questionnaire. Trois champs, c'est la borne que la base
 * fait respecter, et elle est volontaire : au-dela, remplir devient plus
 * long que reformuler soi-meme. Le nombre de questions que l'IA pose ensuite
 * ne change pas — ce sont deux choses distinctes.
 *
 * Ce qui est saisi est une donnee, jamais une instruction : c'est le serveur
 * qui l'inscrit dans le texte, dans un bloc annonce comme tel, et c'est lui
 * qui relit les champs reellement declares. Ce composant ne fait que
 * recueillir.
 */
export function ChampsDeCommande({
  champs,
  valeurs,
  onChange,
  desactive = false,
}: {
  champs: ChampDeCommande[];
  valeurs: Record<string, string>;
  onChange: (cle: string, valeur: string) => void;
  /** Vrai quand la commande est verrouillee : rien a remplir avant l'acces. */
  desactive?: boolean;
}) {
  if (champs.length === 0) return null;

  return (
    <section className="mt-5 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] p-3.5">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
        À personnaliser
      </h3>
      <p className="mt-0.5 text-[length:var(--texte-meta)] leading-snug text-[color:var(--color-muted)]">
        Ce que vous saisissez ici part avec la commande copiée.
      </p>

      <div className="mt-3 space-y-3">
        {champs.map((champ) => (
          <Champ
            key={champ.cle}
            champ={champ}
            valeur={valeurs[champ.cle] ?? ''}
            onChange={(valeur) => onChange(champ.cle, valeur)}
            desactive={desactive}
          />
        ))}
      </div>
    </section>
  );
}

function Champ({
  champ,
  valeur,
  onChange,
  desactive,
}: {
  champ: ChampDeCommande;
  valeur: string;
  onChange: (valeur: string) => void;
  desactive: boolean;
}) {
  const identifiant = `champ-${champ.cle}`;
  const aide = champ.indication ? `${identifiant}-aide` : undefined;

  // 46 px de haut : la fiche est dense et le champ suit la hauteur des
  // autres controles, mais reste au-dessus de la cible confortable.
  const style =
    'mt-1.5 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 text-[15px] outline-none transition-[border-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-brand)] focus:shadow-[0_0_0_3px_var(--color-brand-soft)] disabled:opacity-50';

  return (
    <div>
      <label
        htmlFor={identifiant}
        className="block text-[length:var(--texte-carte)] font-medium text-[color:var(--color-night)]"
      >
        {champ.libelle}
        {/* « Obligatoire » en toutes lettres : une asterisque demande de
            connaitre la convention, et rien ne l'explique sur la fiche. */}
        {champ.requis ? (
          <span className="ml-1.5 text-[length:var(--texte-meta)] font-normal text-[color:var(--color-muted)]">
            obligatoire
          </span>
        ) : null}
      </label>

      {champ.indication ? (
        <p id={aide} className="text-[length:var(--texte-meta)] text-[color:var(--color-muted)]">
          {champ.indication}
        </p>
      ) : null}

      {champ.genre === 'liste' ? (
        <select
          id={identifiant}
          value={valeur}
          onChange={(evenement) => onChange(evenement.target.value)}
          disabled={desactive}
          aria-describedby={aide}
          required={champ.requis}
          className={`${style} h-[46px]`}
        >
          {/* Une entree vide en tete, meme pour un champ obligatoire : sans
              elle, le premier choix passerait pour une reponse donnee. */}
          <option value="">À choisir</option>
          {champ.choix.map((choix) => (
            <option key={choix.valeur} value={choix.valeur}>
              {choix.libelle}
            </option>
          ))}
        </select>
      ) : champ.genre === 'texte_long' ? (
        <textarea
          id={identifiant}
          value={valeur}
          onChange={(evenement) => onChange(evenement.target.value)}
          disabled={desactive}
          aria-describedby={aide}
          required={champ.requis}
          rows={3}
          maxLength={600}
          className={`${style} resize-y py-2.5 leading-snug`}
        />
      ) : (
        <input
          id={identifiant}
          type={champ.genre === 'nombre' ? 'text' : 'text'}
          // `inputMode` et non `type="number"` : le champ accepte « 12 000 € »
          // autant que « 12000 », et un champ numerique strict refuserait
          // l'espace et le symbole tout en ajoutant des fleches inutiles.
          inputMode={champ.genre === 'nombre' ? 'decimal' : undefined}
          value={valeur}
          onChange={(evenement) => onChange(evenement.target.value)}
          disabled={desactive}
          aria-describedby={aide}
          required={champ.requis}
          maxLength={champ.genre === 'nombre' ? 40 : 200}
          className={`${style} h-[46px]`}
        />
      )}
    </div>
  );
}
