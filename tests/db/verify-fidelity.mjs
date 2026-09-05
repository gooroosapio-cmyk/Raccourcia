#!/usr/bin/env node
/**
 * Compare le contenu reellement insere en base avec le catalogue editorial
 * source. Indispensable depuis que le seed factorise les valeurs communes
 * par mode : une factorisation fautive doit echouer ici, pas en production.
 *
 * Appele par tests/db/run.sh avec le dump JSON des prompts sur l'entree.
 *   node tests/db/verify-fidelity.mjs <dump.json>
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = JSON.parse(readFileSync(join(ROOT, 'data/catalogue/prompts.json'), 'utf8'));
const dump = JSON.parse(readFileSync(process.argv[2], 'utf8'));

const splitList = (value, sep = ';') =>
  value
    ? value
        .split(sep)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

const MODE = { image: 'image', ecrire: 'texte', analyser: 'analyse' };
const byRef = new Map(dump.map((row) => [row.external_ref, row]));
const failures = [];

const check = (ref, field, expected, actual) => {
  const a = JSON.stringify(actual ?? null);
  const e = JSON.stringify(expected ?? null);
  if (a !== e) failures.push(`${ref}.${field}\n    attendu : ${e}\n    obtenu  : ${a}`);
};

for (const row of source) {
  const db = byRef.get(row.id);
  if (!db) {
    failures.push(`${row.id} : absent de la base.`);
    continue;
  }

  const useCases = splitList(row.exemples_usage, '|').length
    ? splitList(row.exemples_usage, '|')
    : splitList(row.exemples_usage, ';');

  check(row.id, 'command', row.command.trim().toLowerCase(), db.command);
  check(row.id, 'name', row.title, db.name);
  check(row.id, 'mode', MODE[row.domain], db.mode);
  check(row.id, 'short_description', row.description_courte, db.short_description);
  check(row.id, 'intention', row.intention, db.intention);
  check(row.id, 'use_cases', useCases, db.use_cases);
  check(row.id, 'tags', splitList(row.tags), db.tags);
  check(row.id, 'required_variables', splitList(row.variables_requises), db.required_variables);
  check(row.id, 'optional_variables', splitList(row.variables_optionnelles), db.optional_variables);
  check(row.id, 'expected_input', row.entree_attendue, db.expected_input);
  check(row.id, 'minimal_context', row.contexte_minimal, db.minimal_context);
  check(row.id, 'sufficient_context', row.contexte_suffisant, db.sufficient_context);
  check(row.id, 'default_values', row.valeurs_defaut, db.default_values);
  check(row.id, 'expected_output', row.sortie_attendue, db.expected_output);
  check(row.id, 'output_format', row.format_sortie, db.output_format);
  check(row.id, 'quality_criteria', row.criteres_qualite, db.quality_criteria);
  check(row.id, 'preserve_rules', row.a_preserver, db.preserve_rules);
  check(row.id, 'avoid_rules', row.a_eviter, db.avoid_rules);
  check(row.id, 'limitations', row.limites, db.limitations);
  check(row.id, 'fallback_if_incomplete', row.fallback_si_incomplet, db.fallback_if_incomplete);
  check(row.id, 'admin_notes', row.admin_notes, db.admin_notes);
  check(row.id, 'thumbnail_spec', row.thumbnail_spec, db.thumbnail_spec);
  check(row.id, 'risk_level', row.niveau_risque, db.risk_level);
  check(row.id, 'priority', row.priorite_v1, db.priority);
  check(row.id, 'show_image_card', row.domain === 'image', db.show_image_card);
  // Le payload doit etre repris a l'octet pres pour les trois IA.
  check(row.id, 'payload', row.payload_copiable, db.payload);
  check(row.id, 'variantes', 3, db.variant_count);
  check(row.id, 'versions_courantes', 3, db.current_version_count);
  check(row.id, 'qcm_trigger', row.qcm_declencheur, db.qcm_trigger);
}

if (failures.length > 0) {
  console.error(`${failures.length} ecart(s) entre le catalogue source et la base :\n`);
  for (const failure of failures.slice(0, 15)) console.error(`  - ${failure}`);
  if (failures.length > 15) console.error(`  ... et ${failures.length - 15} autres.`);
  process.exit(1);
}

console.log(`    fidelite verifiee : ${source.length} raccourcis, tous les champs conformes`);
