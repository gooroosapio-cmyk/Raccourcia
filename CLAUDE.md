# Conventions RaccourcIA

Contexte produit et decisions : `docs/ARCHITECTURE.md`, `docs/SECURITY.md`.

## A ne jamais faire

- Ecrire un secret dans le code ou un fichier commite.
- Placer une cle `service_role` ou un secret Chariow dans `NEXT_PUBLIC_*`.
- Desactiver une policy RLS pour faire passer une fonctionnalite.
- Exposer `prompt_versions` a une requete client.
- Coder en dur une categorie, un prompt ou un ordre d'affichage dans le frontend.
- Supprimer physiquement un prompt, une version ou une categorie.
- Construire le desktop au detriment du parcours mobile.

## Conventions de code

- TypeScript strict. Composant client uniquement si une interaction navigateur
  le justifie.
- Toute entree serveur est validee par un schema Zod (`lib/validation`).
- Statuts, modes et roles viennent de `lib/constants.ts`, jamais de chaines libres.
- Acces aux donnees centralises dans `lib/` ; aucun SQL disperse dans l'UI.
- Migrations idempotentes, une par domaine, jamais modifiees apres application.
- Commentaires et libelles en francais ; l'interface ne parle jamais le
  vocabulaire du backend (dire "acces a vie", pas "entitlement").

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
