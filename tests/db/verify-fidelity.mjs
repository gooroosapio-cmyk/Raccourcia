#!/usr/bin/env node
/**
 * Compare le contenu reellement insere en base avec le catalogue editorial
 * source (v2.0). Indispensable depuis que le seed factorise les valeurs
 * partagees dans des dictionnaires et reconstruit les payloads en SQL : une
 * factorisation fautive doit echouer ici, pas en production.
 *
 * Appele par tests/db/run.sh avec le dump JSON des prompts sur l'entree.
 *   node tests/db/verify-fidelity.mjs <dump.json>
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = JSON.parse(readFileSync(join(ROOT, 'data/catalogue/prompts.json'), 'utf8'));
const qcmRows = JSON.parse(readFileSync(join(ROOT, 'data/catalogue/qcm.json'), 'utf8'));
const dump = JSON.parse(readFileSync(process.argv[2], 'utf8'));

const splitList = (value, sep = ';') =>
  value
    ? value
        .split(sep)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

const MODE = { IMAGE: 'image', TEXTE: 'texte' };
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const questionsByPrompt = new Map();
for (const row of qcmRows) {
  const list = questionsByPrompt.get(row.prompt_id) ?? [];
  list.push(row);
  questionsByPrompt.set(row.prompt_id, list);
}
for (const list of questionsByPrompt.values()) {
  list.sort((a, b) => Number(a.ordre ?? 0) - Number(b.ordre ?? 0));
}

const byRef = new Map(dump.map((row) => [row.external_ref, row]));
const failures = [];

/**
 * Serialisation canonique : Postgres reordonne les cles d'un `jsonb`
 * (les plus courtes d'abord). Comparer les chaines brutes signalerait un
 * ecart la ou le contenu est identique.
 */
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
};

const check = (ref, field, expected, actual) => {
  const a = canonical(actual ?? null);
  const e = canonical(expected ?? null);
  if (a !== e) failures.push(`${ref}.${field}\n    attendu : ${e}\n    obtenu  : ${a}`);
};

for (const row of source) {
  const db = byRef.get(row.id);
  if (!db) {
    failures.push(`${row.id} : absent de la base.`);
    continue;
  }

  const questions = (questionsByPrompt.get(row.id) ?? []).slice(0, 3);

  check(row.id, 'command', row.command.trim().toLowerCase(), db.command);
  check(row.id, 'name', row.title, db.name);
  check(row.id, 'mode', MODE[row.domaine], db.mode);
  check(row.id, 'short_description', row.description_courte, db.short_description);
  check(row.id, 'intention', row.intention, db.intention);
  check(row.id, 'use_cases', [row.cas_usage_principal], db.use_cases);
  check(row.id, 'usage_example', row.exemple_usage, db.usage_example);
  check(row.id, 'tags', splitList(row.tags), db.tags);
  check(row.id, 'required_variables', splitList(row.variables_requises), db.required_variables);
  check(row.id, 'optional_variables', splitList(row.variables_optionnelles), db.optional_variables);
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
  check(row.id, 'usage_conditions', row.conditions_utilisation, db.usage_conditions);
  check(row.id, 'primary_input', row.entree_primaire, db.primary_input);
  check(row.id, 'accepted_inputs', row.entrees_acceptees, db.accepted_inputs);
  check(row.id, 'attachment_rule', row.piece_jointe, db.attachment_rule);
  check(row.id, 'blocking_condition', row.condition_blocage, db.blocking_condition);
  check(row.id, 'questionnaire_mode', row.questionnaire_mode, db.questionnaire_mode);
  check(row.id, 'max_questions', Number(row.nombre_questions_max), db.max_questions);
  check(row.id, 'thumbnail_spec', row.spec_image_temoin, db.thumbnail_spec);
  check(row.id, 'thumbnail_layout', row.spec_miniature, db.thumbnail_layout);
  check(row.id, 'copy_rule', row.regle_copie, db.copy_rule);
  check(row.id, 'test_nominal', row.test_nominal, db.test_nominal);
  check(row.id, 'test_incomplete_context', row.test_contexte_incomplet, db.test_incomplete_context);
  check(row.id, 'test_blocking', row.test_blocage, db.test_blocking);
  check(row.id, 'risk_level', (row.niveau_risque ?? '').replace('élevé', 'eleve'), db.risk_level);
  check(row.id, 'priority', row.priorite, db.priority);
  check(row.id, 'source_status', row.source_status, db.source_status);
  check(row.id, 'catalog_version', row.version, db.catalog_version);
  // Regle R13 : seuls les raccourcis IMAGE imposent une carte visuelle.
  check(row.id, 'show_image_card', row.domaine === 'IMAGE', db.show_image_card);
  // Le payload doit etre repris a l'octet pres pour les trois IA.
  check(row.id, 'payload', row.payload_copiable, db.payload);
  check(row.id, 'variantes', 3, db.variant_count);
  check(row.id, 'versions_courantes', 3, db.current_version_count);
  check(row.id, 'qcm_trigger', row.declencheur_questions, db.qcm_trigger);

  // Le QCM stocke doit porter la question, ses choix, la variable visee et sa
  // valeur par defaut : c'est ce qui permet a l'interface de poser la bonne
  // question sans la deviner.
  const expectedQcm = questions.map((entry) => ({
    question: entry.question,
    options: splitList(entry.choix, '|'),
    variable: entry.variable,
    valeur_defaut: entry.valeur_defaut,
  }));
  check(row.id, 'qcm', expectedQcm, db.qcm);

  // Le bloc numerote insere dans le payload est reconstruit en SQL : on
  // verifie qu'il correspond bien aux questions du tableur.
  const expectedBlock =
    questions
      .map((entry, index) => {
        const options = splitList(entry.choix, '|')
          .map((choice, position) => `${LETTERS[position]}. ${choice}`)
          .join(' ');
        return `${index + 1}. ${entry.question} ${options}`;
      })
      .join('\n') || null;
  check(row.id, 'qcm_block', expectedBlock, db.qcm_block);
}

const extra = dump.filter((row) => !source.some((s) => s.id === row.external_ref));
for (const row of extra) {
  failures.push(`${row.external_ref} : present en base mais absent du catalogue source.`);
}

if (failures.length > 0) {
  console.error(`${failures.length} ecart(s) entre le catalogue source et la base :\n`);
  for (const failure of failures.slice(0, 15)) console.error(`  - ${failure}`);
  if (failures.length > 15) console.error(`  ... et ${failures.length - 15} autres.`);
  process.exit(1);
}

console.log(`    fidelite verifiee : ${source.length} raccourcis, tous les champs conformes`);
