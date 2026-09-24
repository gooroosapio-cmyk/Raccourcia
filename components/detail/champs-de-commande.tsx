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
  erreurs = {},
  desactive = false,
}: {
  champs: ChampDeCommande[];
  valeurs: Record<string, string>;
  onChange: (cle: string, valeur: string) => void;
  /**
   * Les champs indispensables laisses vides au moment de copier. Le message
   * s'affiche sous le champ, pas dans un toast : c'est la qu'on corrige.
   */
  erreurs?: Record<string, string>;
  /** Vrai quand la commande est verrouillee : rien a remplir avant l'acces. */
  desactive?: boolean;
}) {
  if (champs.length === 0) return null;
  const toutFacultatif = champs.every((champ) => !champ.requis);

  return (
    <section
      aria-labelledby="a-completer"
      className="mt-5 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] p-3.5"
    >
      <h3
        id="a-completer"
        className="text-[length:var(--texte-corps)] font-semibold text-[color:var(--color-night)]"
      >
        À compléter
        {toutFacultatif ? (
          <span className="ml-2 text-[length:var(--texte-meta)] font-normal text-[color:var(--color-muted)]">
            Personnalisation facultative
          </span>
        ) : null}
      </h3>

      {/* POURQUOI REMPLIR, DIT AVANT DE DEMANDER DE REMPLIR.
          Le formulaire arrivait sans justification : trois cases grises au
          bas d'une fiche, qu'on saute pour atteindre le bouton. Or ce sont
          elles qui font la difference entre un resultat generique et un
          resultat juste — et rien ne le disait.
          La phrase dit aussi ce qui arrive si l'on ne remplit pas, parce
          que c'est la vraie question : non, cela ne bloque rien. */}
      <p className="mt-1 flex gap-2 text-[length:var(--texte-meta)] leading-snug text-[color:var(--color-muted)]">
        <span aria-hidden="true" className="mt-px shrink-0 text-[color:var(--color-brand)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" />
            <path d="M12 11v5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            <circle cx="12" cy="7.8" r="1.05" fill="currentColor" />
          </svg>
        </span>
        <span>
          Ces précisions partent avec la commande et rendent le résultat plus juste. Laissées vides,
          l’IA vous posera la question dans la conversation.
        </span>
      </p>

      <div className="mt-3 space-y-3">
        {champs.map((champ) => (
          <Champ
            key={champ.cle}
            champ={champ}
            valeur={valeurs[champ.cle] ?? ''}
            onChange={(valeur) => onChange(champ.cle, valeur)}
            erreur={erreurs[champ.cle]}
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
  erreur,
  desactive,
}: {
  champ: ChampDeCommande;
  valeur: string;
  onChange: (valeur: string) => void;
  erreur?: string;
  desactive: boolean;
}) {
  const identifiant = `champ-${champ.cle}`;
  const idErreur = `${identifiant}-erreur`;
  // Relie le champ a son message : le lecteur d'ecran le lit en y entrant.
  const aria = erreur ? { 'aria-invalid': true as const, 'aria-describedby': idErreur } : {};

  // L'INDICATION DEVIENT L'EXEMPLE, DANS LE CHAMP.
  //
  // Elle vivait sur une ligne grise entre le libelle et le champ : trois
  // niveaux de texte pour une seule question, et la ligne du milieu ne se
  // lisait pas. Posee dans le champ, elle montre la forme attendue a
  // l'endroit ou l'on va ecrire — « Ex. Choisir entre deux offres » en dit
  // plus qu'une consigne, et disparait des qu'on tape.
  const exemple = champ.indication ?? undefined;

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
        {/* « Facultatif » plutot que « obligatoire ».
            Depuis qu'un champ vide ne bloque plus la copie, marquer les
            champs essentiels comme « obligatoires » serait faux : rien
            n'est obligatoire. Ce qui reste utile a dire, c'est l'inverse —
            celui-la, vous pouvez le sauter sans rien perdre. */}
        {champ.requis ? null : (
          <span className="ml-1.5 rounded-full bg-[color:var(--color-surface)] px-2 py-0.5 text-[length:var(--texte-meta)] font-normal text-[color:var(--color-muted)]">
            Facultatif
          </span>
        )}
      </label>

      {champ.genre === 'liste' ? (
        <select
          id={identifiant}
          value={valeur}
          onChange={(evenement) => onChange(evenement.target.value)}
          disabled={desactive}
          {...aria}
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
          placeholder={exemple}
          {...aria}
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
          placeholder={exemple}
          {...aria}
          maxLength={champ.genre === 'nombre' ? 40 : 200}
          className={`${style} h-[46px]`}
        />
      )}

      {erreur ? (
        <p
          id={idErreur}
          className="mt-1 text-[length:var(--texte-meta)] font-medium text-[color:var(--color-danger)]"
        >
          {erreur}
        </p>
      ) : null}
    </div>
  );
}
