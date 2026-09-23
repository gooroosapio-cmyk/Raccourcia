# Conventions RaccourcIA

Contexte produit et decisions : `docs/ARCHITECTURE.md`, `docs/SECURITY.md`.

## A ne jamais faire

- Ecrire un secret dans le code ou un fichier commite.
- Placer une cle `service_role` ou un secret Chariow dans `NEXT_PUBLIC_*`.
- Desactiver une policy RLS pour faire passer une fonctionnalite.
- Exposer `prompt_versions` a une requete client.
- Coder en dur une categorie, un prompt ou un ordre d'affichage dans le frontend.
- Supprimer sans confirmation ni bilan. La suppression est permise, et meme
  attendue pendant la reorganisation (voir plus bas), mais jamais a l'aveugle :
  elle annonce ce qu'elle emporte avant de l'emporter.
- Construire le desktop au detriment du parcours mobile.
- Faire dependre le texte copie de l'IA choisie. Il n'y a plus de choix d'IA.
- Ouvrir une IA a la place du membre apres une copie.
- Effacer un visuel televerse depuis la console d'administration.

## Conventions de code

- TypeScript strict. Composant client uniquement si une interaction navigateur
  le justifie.
- Toute entree serveur est validee par un schema Zod (`lib/validation`).
- Statuts, modes et roles viennent de `lib/constants.ts`, jamais de chaines libres.
- Acces aux donnees centralises dans `lib/` ; aucun SQL disperse dans l'UI.
- Migrations idempotentes, une par domaine, jamais modifiees apres application.
- Commentaires et libelles en francais ; l'interface ne parle jamais le
  vocabulaire du backend (dire "acces a vie", pas "entitlement").

## Reorganiser la base avant l'import du catalogue final

Le catalogue actuel porte des doublons, des chevauchements de categories et des
rayons herites de la v2 que la v3 remplace. Les regles qui interdisaient de
supprimer sont levees pour ce chantier : **supprimer est autorise, y compris une
commande publiee, une categorie ancienne, un tag, une collection.** Ce qui reste
interdit, c'est de supprimer sans savoir ce qu'on emporte.

### Ce qu'une suppression doit faire

- Annoncer d'abord. Toute suppression, qu'elle passe par la console ou par une
  migration, produit un bilan chiffre _avant_ d'ecrire : combien de commandes,
  de variantes, de versions, de champs, de tags lies, de visuels, de mentions
  « j'aime » disparaissent avec l'enregistrement vise.
- Ne rien laisser derriere. Aucune ligne orpheline dans `prompt_variants`,
  `prompt_versions`, `prompt_fields`, `prompt_field_choices`, `prompt_tags`,
  `prompt_media`, ni aucun objet de stockage sans ligne qui le reference.
- Reaffecter plutot qu'orpheliner. Supprimer une categorie qui porte encore des
  commandes demande de dire ou elles vont. Aucune commande ne se retrouve sans
  rayon.
- Rester rejouable. Une migration de menage est idempotente : la rejouer ne
  supprime pas une deuxieme fois et ne leve pas.
- Ne jamais toucher aux comptes, aux sessions, aux acces a vie ni au journal des
  copies. Le menage porte sur le catalogue, pas sur les membres.

### Doublons et chevauchements

L'import final ne doit creer ni doublon ni chevauchement. Ce que cela veut dire,
precisement :

- **L'identite d'une carte, c'est `card_id`**, jamais son slug ni son intitule.
  L'import renomme les slugs ; s'appuyer sur eux fabrique des doublons. Toute
  reprise se fait en `on conflict (card_id)`.
- **Une commande active par couple (`command`, `card_slug`)**, garantie par
  `prompts_carte_active_unique`. Une nouvelle carte sous une commande existante
  porte donc toujours son propre `card_slug`.
- **Un slug de carte est unique dans tout le catalogue**, toutes versions
  confondues. Verifie avant l'import, pas apres.
- **Une categorie appartient a un seul referentiel.** Une categorie v3 porte son
  `external_ref` (unique quand il est renseigne) ; une categorie v2 qui couvre le
  meme rayon est supprimee ou fusionnee dans la v3, jamais gardee en double.
  Deux rayons qui disent la meme chose sous deux noms, c'est un chevauchement :
  il se resout par une fusion, pas par un troisieme rayon.
- **Un tag a une definition ecrite.** Deux tags dont les definitions se
  recouvrent sont fusionnes avant l'import. La taxonomie v3 fait reference.
- **Rien de tout cela ne se verifie a l'oeil.** Chaque garantie ci-dessus a son
  controle dans `tests/integration/`, et un lot d'import qui ne compte pas ce
  qu'il a ecrit n'est pas un lot d'import.

Archiver reste disponible et reste le bon geste hors chantier : une commande
qu'on hesite a perdre s'archive. Mais pendant la reorganisation, garder par
prudence une categorie morte est un cout, pas une precaution.

## Un seul payload, toutes les IA

Une commande porte **un texte unique**, copie tel quel quelle que soit l'IA du
membre. Les regles precedentes sont annulees :

- Plus de choix d'IA sur la fiche. Le selecteur de moteur disparait de
  l'interface ; le texte ne depend plus de rien d'autre que la commande et ce
  que le membre a saisi.
- Plus d'ouverture automatique de l'IA apres la copie. Copier copie, et
  s'arrete la. Le membre va dans son IA par ses propres moyens.
- `resolve_prompt` ne discrimine plus sur `provider_key`. Le parametre subsiste
  dans la signature et dans le journal des copies — il dit ou le membre comptait
  coller, ce qui reste une information utile — mais il ne choisit plus le texte
  rendu et ne peut plus provoquer un refus.
- La base garde `prompt_variants` et `prompt_versions`. On ne casse pas le
  schema pour appliquer une regle d'interface : une commande a une variante
  courante, et c'est elle qu'on sert. L'historique des versions reste intact.

### Les champs a remplir avant de copier

Le membre renseigne ses informations _avant_ la copie ; c'est la ce qui
personnalise le texte, maintenant que l'IA ne le fait plus.

- **Trois champs par defaut** pour toute commande qui n'en declare pas
  explicitement d'autres. La valeur de reference est trois, pas zero.
- Trois reste le maximum. La borne vit dans la base.
- Un champ non rempli ne bloque pas la copie sauf s'il est marque obligatoire.
- La substitution se fait dans la route de resolution, cote serveur. Une clef
  inventee par le navigateur n'atteint rien.

## Visuels : seul l'administrateur en depose

Un visuel n'entre dans le catalogue que par la console d'administration. Les
scripts d'import de medias ne sont plus une voie d'alimentation.

- Tout `prompt_media` ecrit par la console porte desormais son auteur dans
  `created_by`. Sans auteur, un visuel n'est pas un visuel d'administration.
- Les visuels poses par script sont a effacer, lignes et objets de stockage
  ensemble.
- Aucune suppression de masse de visuels ne part d'une supposition sur le
  chemin de stockage : les deux voies ecrivent aujourd'hui le meme chemin.
  Seul l'auteur distingue, et il doit etre renseigne avant que l'effacement
  ne soit possible.

## Contraintes mobile-first

- Viewport de reference 360-430 px. Grille 2 colonnes.
- Cibles tactiles 44 x 44 px minimum, transitions 150-250 ms.
- Aucune interaction dependante du survol, aucun tableau large critique.
- Fermer un detail conserve le scroll et les filtres.

## Avant de pousser

```bash
npm run verify && ./tests/db/run.sh
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
