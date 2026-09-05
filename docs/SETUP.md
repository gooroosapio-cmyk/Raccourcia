# Mise en place

## 1. Variables d'environnement

Copier `.env.example` en `.env.local` et renseigner :

| Variable                        | Ou la trouver                                    |
| ------------------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase > Project Settings > Data API           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Project Settings > API Keys (anon)    |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase > API Keys (service_role) - **serveur** |
| `LICENSE_PEPPER`                | `openssl rand -base64 48`                        |
| `CHARIOW_WEBHOOK_SECRET`        | Chariow > Developpeurs > Pulses                  |

Sur Vercel, les memes variables sont a definir pour Preview et Production.
Les quatre dernieres ne doivent jamais etre prefixees `NEXT_PUBLIC_`.

## 2. Appliquer le schema

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push          # applique supabase/migrations/ dans l'ordre
```

## 3. Importer le catalogue

```bash
python3 scripts/extract-catalogue.py   # tableur v2 -> data/catalogue/*.json
npm run catalogue:import               # regenere supabase/seed/catalogue.sql
npx supabase db execute --file supabase/seed/catalogue.sql
```

Resultat attendu : 30 categories (10 + 20 sous-categories), 250 raccourcis,
750 variantes IA, 750 versions courantes.
Le fichier est idempotent, il peut etre rejoue sans creer de doublon.

**Sans la CLI Supabase** (pas de mot de passe base a portee de main, ou
application depuis un navigateur) :

```bash
npm run db:bundle             # produit .tmp/sql/ pret a coller
```

Coller ensuite dans Supabase > SQL Editor, **dans l'ordre des numeros** :
`01-schema.sql` d'abord, puis les onze `02-catalogue-XX.sql`. Chaque fichier
tient dans l'editeur et s'applique dans sa propre transaction ; l'ordre
compte, car les raccourcis ont besoin de leurs categories et les versions de
leurs variantes.

> L'extraction s'arrete si la feuille `Audit_Controles` du tableur contient
> une ligne en ERREUR : le tableur porte son propre controle qualite et
> demande de bloquer la publication dans ce cas.

> Le seed ne stocke ni les phrases partagees ni les payloads : les premieres
> passent par un dictionnaire par colonne, les seconds sont reconstruits par
> Postgres depuis leur modele canonique. Le texte obtenu reste rigoureusement
> celui du catalogue editorial : `tests/db/run.sh` compare 44 champs par
> raccourci, le payload et le bloc QCM, octet par octet.

> Apres la mise en production, **Supabase devient la seule source de verite**.
> Le tableur `data/source/` redevient une archive d'export, jamais un second
> master (Document Technique V1, section 5.1).

## 4. Premier administrateur

`eigeingrau@gmail.com` recoit automatiquement les roles `admin` et
`super_admin` a la creation de son compte. La migration couvre les deux ordres
possibles : compte cree avant ou apres l'application du schema.

Pour promouvoir un autre compte ensuite, depuis `/admin` (super_admin requis)
ou en SQL :

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'nouvel-admin@exemple.fr';
```

## 5. Buckets Storage

Crees par la migration `..._storage_and_reference_data.sql` :
`public-assets`, `category-media`, `prompt-media` (lecture publique, ecriture
admin) et `admin-temp` (prive).

Convention de chemin, avec versionnement pour autoriser un cache CDN long :

```
prompt-media/prompts/{prompt_id}/thumbnail-v1.webp
prompt-media/prompts/{prompt_id}/before-v1.webp
prompt-media/prompts/{prompt_id}/after-v1.webp
```

## 6. Verifier avant de pousser

```bash
npm run verify        # format, lint, types, tests unitaires
./tests/db/run.sh     # migrations + RLS + idempotence sur Postgres local
```

`./tests/db/run.sh` a besoin de PostgreSQL 16 en local
(`apt-get install postgresql-16 postgresql-contrib-16`). Il cree un cluster
jetable, ne touche a aucune base distante, et le supprime en sortant.

## 7. Brancher le Pulse Chariow

1. Deployer d'abord sur Vercel : le Pulse doit pointer vers une URL vivante
   (`https://votre-domaine/api/webhooks/chariow`), sinon Chariow ne recevra
   qu'un 404.
2. Definir `CHARIOW_WEBHOOK_SECRET` (secret du Pulse) et `CHARIOW_API_KEY`
   sur Vercel, jamais en `NEXT_PUBLIC_*`.
3. Cote Chariow (Developpeur > Pulses), creer le Pulse sur cette URL pour les
   evenements `successful.sale` et `license.issued`.
4. Rattacher chaque produit vendu a son produit RaccourcIA : renseigner
   `products.chariow_product_id` avec l'identifiant Chariow (`product.id` du
   payload). Sans ce rattachement, la vente est quand meme enregistree, mais
   `/admin` signale une "vente sans produit reconnu".
5. Envoyer un evenement de test depuis Chariow et verifier dans `/admin` que
   la ligne apparait (lecture technique de `webhook_events` reservee aux
   admins).

**Signature** : conforme a la specification Chariow (guide "Pulse Security"),
detaillee dans `docs/SECURITY.md`. Retenir que la cle est le secret complet,
prefixe `whsec_` compris, et que la valeur comparee porte le prefixe
`sha256=`.

**Le piege a connaitre** : si `products.chariow_product_id` n'est pas
renseigne (etape 4 ci-dessus), `process_chariow_sale` ne rapproche aucun
produit et l'achat est enregistre avec `product_id` a NULL. A l'activation,
`claimAccess` ne cree alors aucun droit : le compte est bien cree, l'achat
marque reclame, et le membre se retrouve sans acces. Aucune erreur nulle
part. Renseigner cet identifiant avant la premiere vente reelle.

## 8. Regenerer les types TypeScript

Apres toute migration, une fois l'acces Supabase disponible :

```bash
npx supabase gen types typescript --project-id <project-ref> --schema public \
  > lib/supabase/database.types.ts
```
