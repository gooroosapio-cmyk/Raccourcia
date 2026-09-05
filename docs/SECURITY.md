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
| `pending_licenses`          | Aucun    | Aucun                     | Lecture technique  |
| `copy_events` (agregats)    | Aucun    | Ses copies                | Totaux seulement   |
| `admin_audit_logs`          | Aucun    | Aucun                     | Lecture            |
| `security_events`           | Aucun    | Aucun                     | Super admin        |

## Protection du contenu premium

`prompt_versions` n'a **aucune policy de lecture** pour `anon` ni
`authenticated` : RLS activee sans policy signifie refus total. Les privileges
SQL sont en plus revoques pour ces roles. Le payload ne sort donc que par la
fonction `resolve_prompt`, apres ses six controles.

Le flou applique aux cartes verrouillees n'est **pas** une mesure de securite,
et ne doit jamais etre presente comme telle. Tout ce qu'une carte affiche est
deja de la metadonnee publique — les memes champs sont servis sans
authentification sur les pages `/r/[slug]`. Un flou CSS se retire en trois
clics dans les outils de developpement : le considerer comme une protection
donnerait une fausse assurance, ce qui est plus dangereux que de ne rien
flouter du tout.

La protection reelle tient en trois points, et elle est ailleurs : `payload`
et `qcm` ne figurent jamais dans les colonnes du catalogue, les privileges SQL
et la RLS refusent `prompt_versions` a `anon` comme a `authenticated`, et le
contenu ne sort que par `resolve_prompt` apres ses six controles.

Le flou ne porte donc que sur le visuel, jamais sur le titre ni la
description : son role est commercial. Un raccourci qu'on ne comprend pas ne
donne pas envie de s'abonner, et masquer un texte deja public ailleurs serait
incoherent autant qu'inutile.

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

## Webhook Chariow : vente et licence sans ordre garanti

Chariow envoie la vente (`successful.sale`) et la licence (`license.issued`)
comme deux notifications independantes. Mesure sur trois achats reels : un
ecart de -3 ms a +1,3 s, et la licence est arrivee **avant** la vente une
fois sur trois. Un traitement qui suppose l'ordre inverse rejette la bonne
licence juste apres le paiement.

`process_chariow_sale` et `process_chariow_license` (migration
`20260905070000_chariow_ingestion.sql`) sont donc commutatives dans les deux
sens, chacune serialisee par email via `pg_advisory_xact_lock` pour resister
a une arrivee reellement simultanee :

- une licence sans vente connue est scellee dans `pending_licenses`, orpheline ;
- une vente completee adopte la licence orpheline la plus recente du meme email ;
- une licence qui arrive apres une vente completee sans licence la rejoint
  directement.

`pending_licenses` conserve la ligne meme apres adoption (audit, support), et
ne stocke jamais la licence en clair : seule son empreinte HMAC, deja calculee
par `fingerprintLicense`, y transite.

Avant le hachage, `fingerprintLicense` normalise les tirets et la casse ainsi
que les confusions **O/0** et **I/1** : une licence retapee a la main doit
matcher, cote acheteur comme cote Chariow.

Le payload journalise dans `webhook_events` est expurgé de deux champs avant
ecriture (`scrubChariowPayload`) : `license.key` (la licence en clair) et
`checkout.url` (qui porte l'email et le telephone de l'acheteur dans sa
chaine de requete).

**Signature du Pulse (specification Chariow confirmee).** L'en-tete est
`x-chariow-signature` et sa valeur vaut
`"sha256=" + hex(hmac_sha256(corps_brut, secret_du_pulse))`. Trois points que
la specification impose et qu'il est facile de manquer :

- le prefixe litteral `sha256=` fait partie de la valeur comparee — le hex nu
  ne correspond a rien ;
- la cle est le secret complet, prefixe `whsec_` inclus : ni ampute de son
  prefixe, ni decode en base64 (contrairement a la convention Svix, dont le
  prefixe `whsec_` pourrait faire croire qu'elle s'applique) ;
- le corps est signe tel qu'il est recu, avant tout `JSON.parse`.

Chariow n'envoie aucun horodatage : il n'y a donc pas de fenetre de validite
a verifier. La protection contre le rejeu est l'idempotence de
`webhook_events`. Chariow fournit par ailleurs `x-pulse-delivery-id` comme
cle d'idempotence de livraison ; `deriveExternalEventId` s'appuie plutot sur
l'identifiant metier (`sale.id`, `license.id`), ce qui deduplique aussi les
rejeux manuels, auxquels Chariow attribue une nouvelle livraison.

## Anti-partage

Le droit a vie est permanent, la session ne l'est pas. `app_sessions` enregistre
chaque session Supabase (claim `session_id` du JWT). Au-dela de
`max_active_sessions` (defaut 3), l'interface propose de deconnecter un appareil
plutot que de bloquer. Aucun fingerprinting materiel.

## Privileges de fonctions

Postgres accorde `EXECUTE` a `PUBLIC` par defaut : toute fonction du schema
`public` devient un endpoint `/rest/v1/rpc/`. La migration
`..._harden_function_privileges.sql` revoque ce privilege partout ou il n'a
pas lieu d'etre. Deux failles reelles remontees par l'audit Supabase ont ete
corrigees ainsi :

- `consume_rate_limit` et `purge_rate_limit_counters` etaient appelables par
  n'importe qui. Un visiteur pouvait epuiser le quota d'un autre compte, ou
  vider toutes les fenetres et neutraliser le rate limiting. Reserve au
  `service_role`.
- `has_active_entitlement(uuid)` acceptait un identifiant arbitraire : un
  membre pouvait sonder l'acces d'un autre compte. La fonction ne repond plus
  que pour l'appelant lui-meme, ou pour un administrateur.

Restent volontairement executables :

| Fonction                                                      | Pourquoi                                                                                                  |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `is_admin`, `is_super_admin`, `has_role`                      | Appelees par les policies RLS, evaluees avec les droits de l'appelant. Ne revelent que son propre statut. |
| `has_active_entitlement`, `current_app_session_is_active`     | Idem, et desormais limitees a l'appelant.                                                                 |
| `resolve_prompt`, `track_prompt_view`, `register_app_session` | RPC membres assumees, reservees a `authenticated`.                                                        |

La migration `..._harden_analytics_window.sql` complete ce durcissement :
`analytics_window` etait la derniere fonction du schema sans `search_path`
fige. Son corps ne s'appuyant que sur des constructions du langage, le figer
a vide ne change aucune resolution de nom.

`rate_limit_counters` a RLS active sans aucune policy : c'est un refus total
volontaire, la table n'est ecrite que par une fonction `SECURITY DEFINER`.
`rls_auto_enable` est un garde-fou fourni par Supabase, qui active RLS
automatiquement sur toute nouvelle table de `public`.

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
| `08_admin_operations`                  | Versionnage, refus de publication incomplete, cascade |
| `09_chariow_ingestion`                 | Vente/licence dans les deux ordres, rejeu, privileges |
| `10_analytics`                         | Agregats justes, fenetre bornee, refus hors admin     |

Ces tests ont ete valides par mutation : casser volontairement la RLS de
`prompt_versions`, la cascade de visibilite ou le controle d'entitlement fait
echouer le test correspondant, et lui seul.
