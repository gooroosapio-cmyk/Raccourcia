#!/usr/bin/env node
/**
 * Prepare des fichiers SQL prets a coller dans l'editeur SQL de Supabase,
 * pour les cas ou la CLI n'est pas utilisable (pas d'acces reseau, pas de
 * mot de passe base a portee de main).
 *
 *   npm run db:bundle
 *
 * Produit dans .tmp/sql/ :
 *   01-schema.sql            les 9 migrations dans l'ordre
 *   02-catalogue-XX.sql      le catalogue decoupe en morceaux pastables
 *
 * Chaque fichier est autonome et rejouable sans creer de doublon.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.tmp', 'sql');
const PROMPTS_PER_PART = 20;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// --- 1. Schema ------------------------------------------------------------
const migrationsDir = join(ROOT, 'supabase', 'migrations');
const migrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const schema = [
  '-- RaccourcIA - schema complet',
  '-- A executer EN PREMIER, en une fois, dans Supabase > SQL Editor.',
  `-- Contient ${migrations.length} migrations :`,
  ...migrations.map((f) => `--   ${f}`),
  '',
  ...migrations.map((file) => {
    const body = readFileSync(join(migrationsDir, file), 'utf8');
    return `-- ======== ${file} ========\n${body}`;
  }),
].join('\n');

writeFileSync(join(OUT, '01-schema.sql'), schema, 'utf8');

// --- 2. Catalogue ---------------------------------------------------------
const seedPath = join(ROOT, 'supabase', 'seed', 'catalogue.sql');
const seed = readFileSync(seedPath, 'utf8');

// Les blocs de raccourcis sont delimites par un commentaire "-- RCI-...".
const firstPrompt = seed.indexOf('\n-- RCI-');
const header = seed.slice(0, firstPrompt);
const body = seed.slice(firstPrompt);

const blocks = body.split(/\n(?=-- RCI-)/).filter((block) => block.trim());
const parts = [];

// Les categories partent seules : les raccourcis s'y rattachent par slug.
parts.push({
  label: 'categories',
  sql: header.replace(/\nbegin;\n/, '\nbegin;\n') + '\ncommit;\n',
});

for (let i = 0; i < blocks.length; i += PROMPTS_PER_PART) {
  const chunk = blocks.slice(i, i + PROMPTS_PER_PART);
  parts.push({
    label: `raccourcis ${i + 1} a ${Math.min(i + PROMPTS_PER_PART, blocks.length)}`,
    sql: ['begin;', '', ...chunk, 'commit;', '']
      .join('\n')
      .replace(/\ncommit;\n+commit;/, '\ncommit;'),
  });
}

parts.forEach((part, index) => {
  const number = String(index + 1).padStart(2, '0');
  const file = `02-catalogue-${number}.sql`;
  const content = [
    `-- RaccourcIA - catalogue, morceau ${index + 1}/${parts.length} (${part.label})`,
    '-- A executer APRES 01-schema.sql, dans l ordre des numeros.',
    '-- Rejouable sans creer de doublon.',
    '',
    part.sql.replace(/^-- =+[\s\S]*?-- =+\n/, ''),
  ].join('\n');
  writeFileSync(join(OUT, file), content, 'utf8');
});

const sizeOf = (name) => (readFileSync(join(OUT, name), 'utf8').length / 1024).toFixed(0);

console.log(`.tmp/sql/01-schema.sql          ${sizeOf('01-schema.sql')} Ko`);
parts.forEach((part, index) => {
  const name = `02-catalogue-${String(index + 1).padStart(2, '0')}.sql`;
  console.log(`.tmp/sql/${name.padEnd(24)}${sizeOf(name)} Ko   ${part.label}`);
});
