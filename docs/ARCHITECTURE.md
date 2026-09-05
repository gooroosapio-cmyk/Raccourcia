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

| Cle                      | Effet                                        |
| ------------------------ | -------------------------------------------- |
| `mode_analyse_enabled`   | Affiche le mode Analyse dans la bibliotheque |
| `public_catalog_enabled` | Autorise les pages publiques partageables    |
| `max_active_sessions`    | Sessions simultanees par compte (defaut 3)   |

### Activer le mode Analyse

Les 40 raccourcis Analyse sont importes et prets, mais leurs categories sont
livrees en `draft` : rien n'est visible, ni pour les membres ni publiquement.
Pour ouvrir le mode, en deux etapes et sans aucun code :

1. `/admin` > Parametres > `mode_analyse_enabled` = `true` (affiche le segment),
2. `/admin` > Categories > publier les 5 categories `analyse-*`.

Le retour arriere consiste a repasser les categories en brouillon.

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

`proxy.ts` rafraichit la session et protege `/app`, `/compte` et `/admin`.
Next 16 a renomme la convention `middleware` en `proxy`.

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
