# Securite

## Matrice de droits

| Ressource                   | Visiteur | Membre                    | Admin              |
| --------------------------- | -------- | ------------------------- | ------------------ |
| Metadonnees prompts publies | Lecture  | Lecture                   | CRUD               |
| `prompt_versions` (payload) | Aucun    | Via `resolve_prompt` seul | CRUD + publication |
| `favorites`, `copy_events`  | Aucun    | Ses lignes                | Lecture support    |
| `profiles`                  | Aucun    | Son profil                | Support limite     |
| `purchases`, `entitlements` | Aucun    | Les siens                 | Gestion support    |
| `webhook_events`            | Aucun    | Aucun                     | Lecture technique  |
| `admin_audit_logs`          | Aucun    | Aucun                     | Lecture            |
| `security_events`           | Aucun    | Aucun                     | Super admin        |

## Protection du contenu premium

`prompt_versions` n'a **aucune policy de lecture** pour `anon` ni
`authenticated` : RLS activee sans policy signifie refus total. Les privileges
SQL sont en plus revoques pour ces roles. Le payload ne sort donc que par la
fonction `resolve_prompt`, apres ses six controles.

Regles d'implementation cote frontend :

- ne jamais precharger un payload pendant le scroll ou l'ouverture d'une carte ;
- ne jamais placer un payload dans les donnees de page, le JSON-LD, un prefetch,
  un log analytics ou un message d'erreur ;
- reponse `no-store` sur la route de resolution.

## Secrets

Navigateur : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_SITE_URL`. Rien d'autre.

Serveur uniquement : `SUPABASE_SERVICE_ROLE_KEY`, `LICENSE_PEPPER`,
`CHARIOW_WEBHOOK_SECRET`, `CHARIOW_API_KEY`.

Les licences Chariow ne sont jamais stockees en clair : seule une empreinte
HMAC-SHA256 (pepper en variable d'environnement) est conservee dans
`purchases.license_fingerprint`.

## Idempotence du webhook

`webhook_events` porte une contrainte `unique (source, external_event_id)` :
l'idempotence est garantie par la base, pas par le code. `purchases` est unique
par `external_order_id` et `entitlements` unique par `(user_id, product_id)`.
Le meme evenement rejoue 20 fois produit un achat et un droit, pas davantage.

## Anti-partage

Le droit a vie est permanent, la session ne l'est pas. `app_sessions` enregistre
chaque session Supabase (claim `session_id` du JWT). Au-dela de
`max_active_sessions` (defaut 3), l'interface propose de deconnecter un appareil
plutot que de bloquer. Aucun fingerprinting materiel.

## Tests de securite automatises

`./tests/db/run.sh` rejoue toutes les migrations sur un Postgres jetable puis
execute les scenarios obligatoires :

| Fichier                                | Verifie                                               |
| -------------------------------------- | ----------------------------------------------------- |
| `01_premium_content_is_never_readable` | Aucune lecture de payload, aucune fuite inter-comptes |
| `02_resolve_prompt_controls`           | Les six controles de resolution, un par un            |
| `03_category_deactivation_cascade`     | Desactivation, cascade, conservation, reactivation    |
| `04_commerce_idempotence`              | 20 webhooks = 1 droit ; remboursement ; restauration  |
| `05_role_escalation`                   | Un admin ne s'attribue pas super_admin                |
| `06_catalogue_import`                  | 151 raccourcis, tous copiables, Analyse masque        |

Ces tests ont ete valides par mutation : casser volontairement la RLS de
`prompt_versions`, la cascade de visibilite ou le controle d'entitlement fait
echouer le test correspondant, et lui seul.
