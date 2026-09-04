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
npm run catalogue:import      # regenere supabase/seed/catalogue.sql
npx supabase db execute --file supabase/seed/catalogue.sql
```

Resultat attendu : 63 categories, 151 raccourcis, 453 variantes IA.
Le fichier est idempotent, il peut etre rejoue sans creer de doublon.

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

## 7. Regenerer les types TypeScript

Apres toute migration, une fois l'acces Supabase disponible :

```bash
npx supabase gen types typescript --project-id <project-ref> --schema public \
  > lib/supabase/database.types.ts
```
