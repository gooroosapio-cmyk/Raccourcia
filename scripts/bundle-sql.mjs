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
// Le seed est desormais une suite de cinq instructions (categories,
// sous-categories, raccourcis, variantes, versions). On les separe pour que
// chaque morceau tienne dans un editeur SQL ou un appel d'outil.
const seedPath = join(ROOT, 'supabase', 'seed', 'catalogue.sql');
const seed = readFileSync(seedPath, 'utf8');

const sections = seed
  .split(/\n(?=-- --- )/)
  .slice(1)
  .map((section) => {
    const label = (section.match(/^-- --- (.+?) -+\s*$/m) ?? [, 'catalogue'])[1].trim();
    const body = section.replace(/\ncommit;\s*$/, '').trim();
    return { label, sql: ['begin;', '', body, '', 'commit;', ''].join('\n') };
  });

sections.forEach((section, index) => {
  const number = String(index + 1).padStart(2, '0');
  const file = `02-catalogue-${number}.sql`;
  writeFileSync(
    join(OUT, file),
    [
      `-- RaccourcIA - catalogue, morceau ${index + 1}/${sections.length} (${section.label})`,
      '-- A executer APRES 01-schema.sql, dans l ordre des numeros.',
      '-- Rejouable sans creer de doublon.',
      '',
      section.sql,
    ].join('\n'),
    'utf8',
  );
});

const sizeOf = (name) => (readFileSync(join(OUT, name), 'utf8').length / 1024).toFixed(0);

console.log(`.tmp/sql/01-schema.sql          ${sizeOf('01-schema.sql')} Ko`);
sections.forEach((section, index) => {
  const name = `02-catalogue-${String(index + 1).padStart(2, '0')}.sql`;
  console.log(`.tmp/sql/${name.padEnd(24)}${sizeOf(name).padStart(4)} Ko   ${section.label}`);
});
