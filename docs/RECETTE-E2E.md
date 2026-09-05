# Recette end-to-end du 5 septembre 2026

Campagne executee depuis un environnement Claude Code isole, contre le projet
Supabase de production `jhqajkhovtcjklrjgwrx` (Raccourcia, eu-west-1) et une
instance Next.js locale. Aucune donnee de production n'a ete creee, modifiee
ni supprimee : toutes les ecritures ont eu lieu sur un Postgres jetable local.

## 1. Acces direct a Supabase

| Voie                           | Resultat                                |
| ------------------------------ | --------------------------------------- |
| MCP Supabase (lecture SQL)     | Operationnel                            |
| REST `/rest/v1/` avec cle anon | Operationnel                            |
| Cle `service_role` / secrete   | **Absente de l'environnement** (voir 5) |

La cle publiable (`sb_publishable_...`) est publique par conception. Aucune cle
secrete n'est exposee a l'environnement de developpement, ce qui est le
comportement attendu.

## 2. Surface exposee au visiteur non authentifie

Chaque table du schema `public` a ete interrogee directement en REST avec la
cle anon. **Les 15 tables testees repondent 401 `42501` (permission denied)**,
y compris `prompt_versions`, qui porte le payload premium. Le refus vient du
niveau `GRANT`, en amont de la RLS : la defense est donc a deux etages.

`resolve_prompt` est egalement refusee en anon (`permission denied for
function`) ; son `EXECUTE` est reserve a `authenticated`. Les fonctions
d'administration sont dans le meme cas, et `consume_rate_limit` /
`purge_rate_limit_counters` sont reservees au `service_role`.

## 3. Application en developpement

`npm run dev` demarre en ~0,4 s. Recette de la surface publique automatisee
dans `tests/e2e/smoke.sh` (16 controles, tous verts) :

- les 4 pages publiques repondent 200, une route inconnue 404 ;
- `/app`, `/app/favoris`, `/app/recents`, `/compte`, `/admin`,
  `/admin/raccourcis` redirigent en 307 vers `/connexion?suite=...`,
  l'intention de depart etant preservee ;
- le webhook Chariow repond 401 `signature_invalide`, avec ou sans en-tete de
  signature bidon ;
- `/api/resolve-prompt` repond 405 en GET, 400 sur corps invalide, et 401
  `Reconnectez-vous pour continuer.` sans session — avec
  `Cache-Control: no-store, no-cache, must-revalidate`.

Le script sort en code 1 des qu'un controle devie ; verifie par mutation.

## 4. Chaine de verification complete

| Etape                  | Resultat                                   |
| ---------------------- | ------------------------------------------ |
| `npm run format:check` | Conforme                                   |
| `npm run lint`         | Aucun probleme                             |
| `npm run typecheck`    | Aucune erreur                              |
| `npm run test`         | 24 tests sur 4 fichiers, tous verts        |
| `npm run build`        | 19 routes generees                         |
| `./tests/db/run.sh`    | 14 migrations rejouees, 11 scenarios verts |
| `./tests/e2e/smoke.sh` | 16 controles verts                         |

Le rejeu integral sur Postgres 16 jetable confirme aussi l'idempotence de
l'import du catalogue et la fidelite des 250 raccourcis.

## 5. Points a traiter

### 5.1 Derive de migration en production — corrigee le 5 septembre 2026

La migration `20260905070000_chariow_ingestion.sql` n'etait pas appliquee sur
le projet de production : `pending_licenses`, `process_chariow_sale` et
`process_chariow_license` etaient absents, et le webhook Chariow aurait echoue
en appelant une fonction inexistante.

Elle a depuis ete appliquee. Le rejeu prealable sur Postgres 16 jetable a
reproduit l'ordre reel de production — la migration en dernier, apres
`analytics` et `catalogue_v2`, et non a sa place chronologique — et les 10
scenarios d'integration y passent. La migration est purement additive :
aucun DDL destructeur, aucune ecriture sur les lignes existantes.

Etat verifie apres application :

| Controle                             | Resultat             |
| ------------------------------------ | -------------------- |
| Table `pending_licenses`             | Creee, 0 ligne       |
| RLS                                  | Active               |
| Policies                             | 1 (lecture admin)    |
| Index                                | 3                    |
| Fonctions `process_chariow_*`        | 2                    |
| `EXECUTE` sur ces fonctions          | `service_role` seul  |
| `pending_licenses` en anon (REST)    | 401 refuse           |
| `process_chariow_sale` en anon (RPC) | 401 refuse           |
| `purchases` / `webhook_events`       | Inchangees (0 ligne) |

L'auditeur Supabase ne remonte aucun avertissement nouveau.

**Historique des migrations.** L'application via MCP avait enregistre la
migration sous la version `20260905122619`, la ou le depot porte
`20260905070000`. La ligne a ete corrigee (`update` sur
`supabase_migrations.schema_migrations`, une seule ligne touchee, empreinte
des `statements` inchangee), et `chariow_ingestion` se range desormais a sa
place chronologique, entre `admin_operations` et `analytics`.

Cette correction a mis au jour un ecart plus large, **anterieur a cette
recette** : les 13 autres migrations portent elles aussi en production des
versions distinctes de celles du depot, generees cote serveur lors de leur
application.

| Migration                    | Version depot  | Version production |
| ---------------------------- | -------------- | ------------------ |
| `extensions_and_types`       | 20260904120000 | 20260904233033     |
| `identity`                   | 20260904120100 | 20260904234025     |
| `authorization_helpers`      | 20260904120200 | 20260904234040     |
| `commerce`                   | 20260904120300 | 20260904234135     |
| `catalog`                    | 20260904120400 | 20260905003152     |
| `usage_and_governance`       | 20260904120500 | 20260905003345     |
| `rls`                        | 20260904120600 | 20260905003451     |
| `resolve_prompt`             | 20260904120700 | 20260905003518     |
| `storage_and_reference_data` | 20260904120800 | 20260905004540     |
| `harden_function_privileges` | 20260905050000 | 20260905045107     |
| `admin_operations`           | 20260905060000 | 20260905055201     |
| `chariow_ingestion`          | 20260905070000 | 20260905070000     |
| `analytics`                  | 20260905080000 | 20260905113614     |
| `catalogue_v2`               | 20260905090000 | 20260905113638     |

Les 14 noms concordent, dans le meme ordre : le renumerotage eventuel serait
un simple reetiquetage, sans reordonnancement. En l'etat, `supabase db push`
depuis le depot considererait les 13 lignes non alignees comme non appliquees
et tenterait de les rejouer, ce qui echouerait des la premiere
(`create type ... already exists`). Le projet n'a donc jamais ete synchronise
par `db push` ; il reste a decider si on aligne les 13 lignes restantes ou si
on assume un autre canal de deploiement.

### 5.2 `analytics_window` : `search_path` mutable

Seule fonction du schema `public` sans `search_path` fige (avertissement
`0011_function_search_path_mutable`). Son `EXECUTE` n'est accorde a personne,
donc le risque est faible, mais la migration de durcissement l'a manquee.

### 5.3 Protection des mots de passe compromis desactivee

`auth_leaked_password_protection` est desactivee : Supabase ne verifie pas les
mots de passe contre HaveIBeenPwned. Reglage a activer dans le tableau de bord.

### 5.4 Les autres avertissements de l'auditeur sont assumes

Les alertes `anon_security_definer_function_executable` et
`authenticated_security_definer_function_executable` couvrent des fonctions
documentees comme volontairement executables dans `docs/SECURITY.md`
(`is_admin`, `has_role`, `resolve_prompt`, RPC membres...), chacune bornee a
l'appelant. `rls_enabled_no_policy` sur `rate_limit_counters` est egalement un
refus total volontaire. Aucune action requise.

## 6. Secrets et depot GitHub

Aucun secret n'est present dans le depot. Verifications menees sur
**l'integralite de l'historique, toutes branches confondues** (210 blobs) :

- aucun fichier `.env` n'a jamais ete suivi, hormis `.env.example`, dont tous
  les champs sensibles sont vides ;
- aucune occurrence de JWT (`eyJ...`), de cle `sb_secret_`, `sb_publishable_`
  ou de jeton `sbp_` ;
- les seules occurrences de `service_role` sont de la documentation et des
  `GRANT` SQL, jamais du materiel de cle ;
- les seules affectations de variables sensibles pointent vers `process.env`,
  des schemas Zod, ou des valeurs de test explicites
  (`test-pepper-...`, `ci-placeholder-anon-key-value`) ;
- une recherche par entropie (chaines de 32 caracteres ou plus, casse mixte)
  ne remonte que deux faux positifs : un nom de fichier et un espace de noms
  OOXML.

`.github/workflows/ci.yml` ne reference **aucun** `secrets.*` : le build tourne
sur des valeurs factices, conformement a son commentaire.

Le `.gitignore` couvre `.env` et `.env.*` avec la seule exception
`!.env.example`. Verifie a l'execution : le `.env.local` cree pour cette
recette est bien ignore.

**A noter : le depot est public.** Aucun secret n'y figure, mais l'integralite
du code, des migrations et du catalogue est lisible par tous. C'est un choix a
confirmer explicitement.

## 7. Limite de cette campagne

Aucun parcours authentifie n'a ete joue en production : cela aurait exige de
creer un compte et un droit d'acces, donc d'ecrire dans la base de production.
La logique correspondante — les six controles de `resolve_prompt`, la cascade
de visibilite, l'idempotence commerciale, l'ingestion Chariow dans les deux
ordres d'arrivee — est couverte par les 11 scenarios de `tests/db/run.sh`,
rejoues ici sur un cluster jetable.
