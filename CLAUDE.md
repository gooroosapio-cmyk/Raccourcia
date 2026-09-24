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
  Seule exception, decidee le 24 septembre 2026 pour l'import du catalogue v7 :
  la suppression des commandes archivees a emporte les lignes du journal, les
  favoris et les recents qui les citaient. Elle ne fait pas jurisprudence.

### Doublons et chevauchements

L'import final ne doit creer ni doublon ni chevauchement. Ce que cela veut dire,
precisement :

- **L'identite d'une carte, c'est `card_id`**, jamais son slug ni son intitule.
  L'import renomme les slugs ; s'appuyer sur eux fabrique des doublons. Toute
  reprise se fait en `on conflict (card_id)`. `card_code` (`RCIA-C-000001`) la
  designe entre humains ; il ne se renumerote jamais, et une carte supprimee ne
  libere pas le sien. Registre : `data/catalogue/v7/identifiants.csv`, et
  `identifiants-brouillons.csv` pour les brouillons hors kit.
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
  recouvrent sont fusionnes avant l'import. La taxonomie du kit v7
  (`data/catalogue/v7/tags.csv`, 72 tags definis) fait reference.
- **Rien de tout cela ne se verifie a l'oeil.** Chaque garantie ci-dessus a son
  controle dans `tests/integration/`, et un lot d'import qui ne compte pas ce
  qu'il a ecrit n'est pas un lot d'import.

Archiver reste disponible et reste le bon geste hors chantier : une commande
qu'on hesite a perdre s'archive. Mais pendant la reorganisation, garder par
prudence une categorie morte est un cout, pas une precaution.

### Douze rayons, et un rayon de transition

Le catalogue final tient en **douze rayons nets**, plus un treizieme,
« En cours de reclassement », qui porte les cartes reprises ou creees que
personne n'a encore relues. Leur promesse est ecrite et leur classement
propose, mais tant qu'une carte n'est pas validee, elle attend la — la semer
dans les douze ferait annoncer a un rayon des cartes que personne n'a lues.

- **Exception : l'import du catalogue v7.** Ses 760 nouvelles cartes ont ete
  publiees directement dans leur collection, le 24 septembre 2026, sur
  decision : le kit est une base relue, pas un lot a reclasser. Le rayon de
  transition garde les brouillons qui ne viennent pas du kit.
- **Le rayon de transition est visible comme les autres.** La regle qui
  interdisait une categorie publique « a reclasser » est levee : elle
  supposait un rayon fourre-tout permanent, alors que celui-ci se vide a
  mesure qu'on valide.
- **Il n'apparait pas vide pour autant.** La Bibliotheque ne dessine une
  tuile que pour un rayon portant au moins une commande publiee, et les
  cartes en transition sont des brouillons. Le rayon surgit le jour ou la
  premiere est validee, et disparait quand la derniere en sort.
- **Une carte n'en sort que vers son vrai rayon**, jamais en y restant
  publiee. Un rayon de transition qui porte du publie n'est plus une
  transition, c'est un fourre-tout : la repetition leve si cela arrive.
- **Il ne se sous-divise pas.** Ce qu'on y depose attend d'etre classe, pas
  d'etre sous-classe.

Cette borne-ci tient toujours : aucune categorie vide creee pour remplir un
menu, et aucun rayon ouvert « au cas ou ».

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

- **Une carte declare ses champs, et l'interface n'affiche que ceux-la.** Le
  catalogue v7 les porte carte par carte : 486 des 1 109 n'en demandent aucun,
  parce que leur promesse n'a rien a demander. Ne pas reclamer un nom, une
  couleur ou un budget sur toutes les fiches par principe.
- **La borne depend du regime**, porte par `prompts.regime_champs` : trois au
  plus en « standard », deux a quatre en « marketing ». Un support marketing
  sans son titre, son offre et son contact ne produit rien d'utilisable ;
  ouvrir cette latitude a toutes les cartes rendrait la borne inutile. Les
  deux bornes vivent en base, pas dans le formulaire.
- Un champ non rempli ne bloque pas la copie sauf s'il est marque obligatoire.
  Un champ indispensable laisse vide s'annonce (« l'IA te le demandera ») et
  n'injecte jamais son exemple a la place.
- Aucun token `{{cle}}` ne subsiste dans le texte copie.
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
  chemin de stockage : les deux voies ecrivent le meme chemin.
- **Le critere retenu pour l'existant est la date** : tout visuel depose avant
  le 18 septembre 2026 a ete injecte par script et part, lignes et fichiers.
  Il ne s'applique que par le manifeste `data/visuels/purge-avant-18-septembre.json`,
  jamais par une requete sur la date seule. Pour tout depot posterieur,
  `created_by` fait foi. Voir `docs/REFONTE-UI-DECISIONS.md`.

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
