# Architecture

## Sources de verite

| Information             | Source            |
| ----------------------- | ----------------- |
| Paiement, remboursement | Chariow           |
| Evenement recu          | `webhook_events`  |
| Achat local             | `purchases`       |
| Droit d'acces           | `entitlements`    |
| Identite, sessions      | Supabase Auth     |
| Roles                   | `user_roles`      |
| Catalogue runtime       | Supabase Postgres |
| Medias                  | Supabase Storage  |
| Code et schema          | GitHub            |

Chariow n'est jamais interroge pour savoir si une carte doit s'afficher :
la vente est synchronisee une fois, puis l'acces depend d'un entitlement local.

## Modele de donnees

- **Identite** : `profiles`, `roles`, `user_roles`, `app_sessions`
- **Commerce** : `products`, `purchases`, `entitlements`, `webhook_events`
- **Catalogue** : `categories`, `prompts`, `ai_providers`, `prompt_variants`,
  `prompt_versions`, `prompt_media`
- **Usage** : `favorites`, `copy_events`, `recent_items`
- **Gouvernance** : `admin_audit_logs`, `security_events`, `rate_limit_counters`,
  `app_config`

### Taxonomie v2.0 : deux domaines, 10 categories, 20 sous-categories

Le catalogue editorial v2.0 expose **deux domaines** : Image (110 raccourcis)
et Texte (140). Les raccourcis d'analyse ne forment plus un domaine : ils sont
ranges dans Texte > Travail & pilotage > Analyser & decider. La valeur
`analyse` reste dans l'enum `app_mode` — rien n'est supprime — mais plus aucun
raccourci ne la porte et la navigation ne l'expose plus.

Le tableur porte lui-meme la hierarchie et l'ordre d'affichage : le seed n'a
rien a inventer. Les categories devenues sans objet sont archivees, jamais
supprimees.

### Categories : 2 niveaux et desactivation en cascade

`categories.parent_id` porte la hierarchie, limitee a deux niveaux par trigger.
La colonne `is_visible` est calculee : une categorie n'est visible que si elle
est publiee **et** que sa categorie parente l'est aussi.

Consequence : desactiver une categorie ou une sous-categorie masque
immediatement tous ses prompts cote utilisateur, **sans supprimer aucune
donnee**. La reactivation est instantanee. L'administrateur, lui, continue de
voir les contenus masques.

### Versions de payload

`prompts` -> `prompt_variants` (une par IA) -> `prompt_versions` (historique).
Modifier un prompt ne detruit jamais la version precedente : on cree une
nouvelle version, on la teste, on la publie, l'ancienne passe en `retired`.
Une seule version peut etre `is_current` par variante (index unique partiel).

## Resolution du payload premium

`public.resolve_prompt(prompt_id, provider_key, surface)` est la seule voie
d'acces au texte complet. `SECURITY DEFINER`, elle verifie dans l'ordre :

1. session Supabase valide,
2. session applicative active (`app_sessions`),
3. entitlement actif — sauf raccourci marque `is_free`,
4. prompt publie dans une categorie visible,
5. variante publiee pour l'IA demandee,
6. version courante publiee.

Elle retourne **un seul** payload et journalise la copie (jamais son contenu).
Aucun appel `service_role` n'intervient sur ce chemin. Un refus renvoie la meme
erreur qu'un prompt inexistant, pour ne pas reveler ce qui existe en interne.

## Modes et feature flags

`app_config` porte la configuration runtime, modifiable depuis `/admin` :

| Cle                      | Effet                                      |
| ------------------------ | ------------------------------------------ |
| `public_catalog_enabled` | Autorise les pages publiques partageables  |
| `max_active_sessions`    | Sessions simultanees par compte (defaut 3) |

`mode_analyse_enabled` subsiste en base mais n'a plus d'effet : Analyse n'est
plus un domaine depuis le catalogue v2.0. La ligne est conservee plutot que
supprimee, et l'interface le dit.

## Parcours et routes

| Route                          | Role                                                          |
| ------------------------------ | ------------------------------------------------------------- |
| `/`                            | Landing publique                                              |
| `/connexion`                   | Email + mot de passe. Conserve l'intention via `?suite=`      |
| `/activation`                  | Email d'achat + licence + choix du mot de passe               |
| `/recuperation`                | Email d'achat + licence + nouveau mot de passe                |
| `/r/[slug]`                    | Page publique partageable, sans le prompt complet             |
| `/app`                         | Bibliotheque : recherche, mode, categories, grille 2 colonnes |
| `/app/favoris`, `/app/recents` | Vues personnelles du meme catalogue                           |
| `/compte`                      | Acces a vie, appareils, securite, deconnexion                 |
| `/api/resolve-prompt`          | Seule sortie du prompt complet, `no-store`                    |
| `/api/webhooks/chariow`        | Ingestion vente + licence, voir `docs/SECURITY.md`            |
| `/admin`                       | Tableau de bord : uniquement des alertes actionnables         |
| `/admin/raccourcis`            | Liste filtrable, creation, fiche d'edition et publication     |
| `/admin/analytics`             | Ce qui est copie, et ce qui dort                              |
| `/admin/categories`            | Hierarchie, activation et desactivation en cascade            |
| `/admin/membres`               | Recherche d'un compte, deblocage d'acces pour le support      |
| `/admin/parametres`            | Reglages `app_config`, sans redeploiement                     |

`proxy.ts` rafraichit la session et protege `/app`, `/compte` et `/admin`.
Next 16 a renomme la convention `middleware` en `proxy`.

## Ecritures d'administration

Le back-office n'ecrit jamais en direct sur les chemins sensibles : il appelle
des fonctions `SECURITY DEFINER` qui revalident le role cote base. La garde de
route `lib/admin/guard.ts` ameliore l'experience, elle ne constitue pas la
securite.

| Fonction                    | Garantie                                                        |
| --------------------------- | --------------------------------------------------------------- |
| `admin_new_prompt_version`  | Cree une version courante, retire l'ancienne sans l'effacer     |
| `admin_publish_prompt`      | Refuse un contenu incomplet, avec un code d'erreur precis       |
| `admin_set_prompt_status`   | Publie, repasse en brouillon ou archive ; jamais de suppression |
| `admin_set_category_status` | Desactive une categorie et toute sa descendance                 |
| `admin_get_prompt_versions` | Seule lecture admin des payloads                                |
| `admin_set_access`          | Accorde ou revoque l'acces a vie, avec journalisation           |
| `admin_analytics_*`         | Agregats de copie, jamais le detail par personne                |

`prompt_versions` reste fermee a toute requete client, administrateur compris :
la table n'a aucune policy de lecture et ses privileges SQL sont revoques. Le
back-office lit les payloads par `admin_get_prompt_versions`, jamais autrement.

Les codes d'erreur remontes par ces fonctions sont traduits en phrases utiles
dans `lib/actions/admin.ts` : l'interface dit "Choisissez une categorie avant
de publier", jamais `CATEGORIE_REQUISE`.

Avant de publier, la fiche affiche un apercu fidele de la carte telle que le
membre la verra, y compris l'absence de visuel pour un raccourci texte.

## Analytics

Les agregations vivent en base, dans cinq fonctions `admin_analytics_*`
(migration `20260905080000_analytics.sql`). L'interface ne rapatrie jamais
`copy_events` ligne a ligne : compter des copies en JavaScript imposerait de
transferer toute la table et exposerait qui a copie quoi.

Ce qui est mesure sert une decision :

| Mesure                    | Decision qu'elle appelle                              |
| ------------------------- | ----------------------------------------------------- |
| Copies par jour           | Voir l'effet d'une publication ou d'une communication |
| Les plus copies           | Savoir ce qui merite un visuel, une mise en avant     |
| Publies sans aucune copie | Reecrire, mieux classer, ou archiver                  |
| Par IA, par ecran         | Ou investir : quelle IA, carte ou fiche               |
| Achats non actives        | Le seul chiffre qui coute de l'argent : relancer      |

Aucune de ces fonctions ne descend au niveau d'une personne. La fenetre
d'observation est bornee entre 1 et 365 jours cote base : une valeur aberrante
ne declenche pas un balayage complet.

Les graphiques sont mono-serie, donc mono-couleur : la longueur porte la
valeur et la teinte ne code rien de plus. Les chiffres sont ecrits a cote des
barres plutot que dans une infobulle, parce qu'il n'y a pas de survol sur
mobile. Les jours sans copie sont dessines a zero, jamais omis.

## Panne reseau et contenu absent

Une base injoignable ne doit jamais s'afficher comme un contenu inexistant :
sinon une coupure ressemble a un catalogue vide ou a un raccourci supprime.
Les fonctions de `lib/catalog/queries.ts` levent une `CatalogUnavailableError`
lorsque Postgres renvoie une erreur, et chaque page distingue les deux cas :

- contenu absent -> 404 ;
- base injoignable -> etat "Connexion interrompue" avec un bouton Reessayer.

Les pages traitent l'incident elles-memes plutot que de compter sur
`error.tsx` : une erreur levee pendant le rendu serveur initial produit
sinon un 500 a corps vide, donc une page blanche. `app/global-error.tsx`
reste le dernier filet.

L'erreur se reconnait par un marqueur `code`, pas par `instanceof` : le
bundler duplique les modules entre le graphe serveur et le graphe SSR, et la
classe n'a alors pas la meme identite des deux cotes.

## Comparaison Avant/Apres

Une commande image se juge sur ce qu'elle produit, pas sur sa description.
Chaque carte image montre donc deux visuels cote a cote : l'entree realiste,
et le resultat obtenu. Ils viennent de `prompt_media`, avec les genres
`before` et `after` que le schema portait deja.

Les deux sont exiges ensemble. `toBeforeAfter()` renvoie `null` des qu'il en
manque un, et la carte retombe sur une vignette typographique. Deux regles en
decoulent, et elles sont deliberees :

- on ne duplique jamais l'image d'entree en guise de resultat : la carte
  annoncerait une transformation qui n'a pas eu lieu ;
- `setPromptStatus` refuse de publier une commande a carte visuelle dont la
  paire est incomplete. L'administration signale lequel des deux manque.

Les commandes texte n'ont pas de comparaison photographique. Leur carte montre
la commande, la promesse, un cas d'usage et le format de sortie : leur inventer
un visuel mentirait sur ce qu'elles produisent.

## Entrees et sorties declarees

`input_examples` et `output_formats` sont deux listes fermees (`enum`), pas du
texte libre : l'interface associe une icone et un libelle a chaque valeur, ce
qu'une chaine saisie a la main rendrait impossible.

Elles ne sont jamais vides. Un declencheur (`prompt_defauts_fiche`) les derive
de `input_type` et `output_type` a l'insertion, quelle que soit la voie —
import du catalogue, administration, migration. Il ne fait que combler un
vide : une liste choisie par un administrateur est respectee telle quelle.

Seuls les formats reellement produits sont affiches. Montrer "Image, Texte,
PDF" sur toutes les fiches donnerait un choix qui n'existe pas et rendrait la
section inutile a lire.

## Prix et lien d'achat

Le prix affiche, le prix de reference barre et la devise vivent dans
`app_config`. Un changement de tarif ne doit pas demander une mise en ligne, et
le prix affiche doit pouvoir suivre la fiche produit Chariow sans decalage.

Le prix de reference n'est barre que s'il est reellement superieur au prix
demande : une remise inventee serait mensongere, et `getPublicConfig()` le
ramene a `null` sinon.
