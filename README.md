# RaccourcIA

Bibliotheque de raccourcis de prompts pour ChatGPT, Claude et Gemini.
Web app SaaS **mobile-first** : trouver un raccourci, comprendre ce qu'il produit,
copier le prompt complet, le coller dans son IA.

## Stack

| Brique   | Role                                                      |
| -------- | --------------------------------------------------------- |
| Next.js  | Interface mobile-first, Server Components, Server Actions |
| Supabase | Auth, Postgres, RLS, Storage, Edge Functions              |
| Chariow  | Paiement et evenement de vente (webhook signe)            |
| Vercel   | Execution, previews, domaines                             |

## Demarrage

```bash
npm install
cp .env.example .env.local   # renseigner les cles Supabase
npm run dev
```

## Commandes

| Commande                   | Effet                                                 |
| -------------------------- | ----------------------------------------------------- |
| `npm run dev`              | Serveur de developpement                              |
| `npm run verify`           | Format + lint + types + tests unitaires               |
| `npm run build`            | Build de production                                   |
| `npm run catalogue:import` | Regenere `supabase/seed/catalogue.sql` depuis `data/` |
| `./tests/db/run.sh`        | Rejoue migrations + tests RLS sur un Postgres jetable |

## Structure

```
app/            interface (public, membre, admin, routes API)
  (public)/     landing, connexion, activation, recuperation, pages partageables
  (member)/     bibliotheque, favoris, recents, compte
components/     cartes, bottom sheets, filtres, navigation
lib/            auth, acces, catalogue, validation, rate limit, clients Supabase
supabase/       migrations SQL, seed du catalogue, Edge Functions
data/           catalogue editorial (JSON) + tableur source d'archive
tests/          unitaires, integration SQL, harnais Postgres local
docs/           architecture, securite, exploitation
```

## Regles non negociables

- Le catalogue n'est **jamais** code en dur : categories, prompts, variantes et
  versions sont des donnees administrables sans redeploiement.
- Le payload complet d'un prompt ne quitte le serveur que via `resolve_prompt`,
  un seul a la fois, apres verification session + appareil + droit d'acces.
- Aucun secret dans `NEXT_PUBLIC_*`, aucune cle `service_role` cote navigateur.
- RLS active sur toutes les tables exposees. Elle fait autorite, pas le middleware.
- Pas de suppression physique : `draft` -> `published` -> `archived`.

Voir `docs/` pour le detail.
