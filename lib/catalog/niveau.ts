import { EXECUTION_LEVEL_LABELS, type ExecutionLevel } from '@/lib/constants';

/**
 * Ce qu'une commande fera avant de produire, dit a la personne qui va la
 * copier.
 *
 * Le catalogue gradue chaque commande de A a E : une commande de niveau A
 * part de la piece jointe et rend son resultat, une commande de niveau E
 * mene une mission en plusieurs etapes. C'est la seule chose que le
 * catalogue sache dire sur le temps que cela va prendre, et c'est ce qui
 * manque le plus au moment de choisir entre deux commandes voisines.
 *
 * Le nombre de questions vient de la meme source que les questions
 * elles-memes, et le catalogue verifie qu'il vaut exactement ce que la
 * commande peut poser : annoncer une question de plus qu'il n'en existe
 * serait une promesse que la commande ne tient pas.
 */
export type Niveau = {
  titre: string;
  /** Ce que cela change concretement, ou `null` quand il n'y a rien a ajouter. */
  attente: string | null;
  /**
   * Vrai pour les niveaux D et E : la commande ne rend pas un resultat en un
   * tour, elle conduit un travail. C'est ce qui merite d'etre signale des la
   * carte — les autres niveaux sont la norme et n'apprennent rien.
   */
  mission: boolean;
};

export function decrireNiveau(
  niveau: ExecutionLevel | null,
  questions: number | null,
): Niveau | null {
  if (!niveau) return null;

  return {
    titre: EXECUTION_LEVEL_LABELS[niveau],
    attente: attenteDeQuestions(questions),
    mission: niveau === 'D' || niveau === 'E',
  };
}

/**
 * « Aucune question », « Une question au plus », « Jusqu'a trois questions ».
 *
 * Formule comme un plafond et non comme une certitude : la commande relit
 * d'abord ce qu'on lui a donne et ne demande que ce qui manque vraiment. Dire
 * « trois questions » a quelqu'un qui n'en aura aucune serait faux.
 */
function attenteDeQuestions(questions: number | null): string | null {
  const nombre = questions ?? 0;
  if (nombre <= 0) return 'Aucune question : elle part de ce que vous lui donnez.';
  if (nombre === 1) return 'Une question au plus, si une information manque.';

  const ecrit = nombre === 2 ? 'deux' : nombre === 3 ? 'trois' : String(nombre);
  return `Jusqu’à ${ecrit} questions, une à la fois, et seulement si elles changent le résultat.`;
}
