import { describe, expect, it } from 'vitest';
import {
  conditionsDEmploi,
  lireLeMoteur,
  lireLesJalons,
  lireLesLivrables,
  premiereDemande,
  sansRedite,
} from '@/lib/catalog/moteur';

/**
 * Les textes de ce fichier sont copies mot pour mot du catalogue : ce sont
 * ceux d'un mode (`mode-pressrelease`) et d'un parcours (`path-packresale`)
 * reellement publies. Un test ecrit sur une forme inventee validerait une
 * lecture que la base ne produit jamais.
 */
const MODE = {
  contexte:
    'Accompagnement interactif : Atelier communiqué. À utiliser sur un cas concret, avec les documents disponibles.',
  specification:
    'Recueillir qui, quoi, où, quand, pourquoi et preuves ; distinguer annonce confirmée et projet ; proposer un angle puis réviser avec l’utilisateur.',
  livrables:
    'Un titre factuel, un chapô, trois paragraphes, une citation réellement fournie ou à faire valider, une présentation de l’organisation et le contact confirmé.',
  questions_cadrage:
    'Quelle annonce veux-tu faire, et à qui doit-elle être utile ? Ensuite, questionner uniquement les inconnues qui changent la méthode ou le livrable.',
  criteres_reussite:
    'Aucune citation attribuée sans source, aucun fait manquant comblé, pas de publication automatique. Livrable vérifié contre l’objectif confirmé ; prochaine action réalisable et inconnues explicites.',
  erreurs:
    'Aucune citation attribuée sans source, aucun fait manquant comblé, pas de publication automatique.',
  regle_sortie:
    'Pause : point de reprise. Bilan : synthèse. Arrêter ou changer de rôle : quitter le conditionnement.',
};

const PARCOURS = {
  ...MODE,
  contexte: 'Production guidée d’un ensemble cohérent : Annonce seconde main fidèle.',
  livrables: '3 livrables : Vue globale nettoyée [4:5]; Détail réel [1:1]; État et usure [4:5].',
  questions_cadrage:
    'Quel article vends-tu, sur quel canal, et quels défauts faut-il montrer ? Puis compléter les données indispensables une à une avant la production concernée.',
  regle_sortie:
    'Pause : récapituler les éléments validés et la prochaine étape. Reprise : repartir de ce point. Arrêter : lister fichiers terminés et restants.',
};

const AUCUN = {
  contexte: null,
  specification: null,
  livrables: null,
  questions_cadrage: null,
  criteres_reussite: null,
  erreurs: null,
  regle_sortie: null,
};

describe('moteur d’une commande', () => {
  it('assemble les sept champs', () => {
    const moteur = lireLeMoteur(MODE);
    expect(moteur?.specification).toBe(MODE.specification);
    expect(moteur?.questionsCadrage).toBe(MODE.questions_cadrage);
    expect(moteur?.regleSortie).toBe(MODE.regle_sortie);
  });

  it('n’existe pas pour une entrée d’un import antérieur', () => {
    expect(lireLeMoteur(AUCUN)).toBeNull();
    expect(lireLeMoteur({ ...AUCUN, specification: '   ' })).toBeNull();
  });
});

describe('première demande', () => {
  it('s’arrête à la question et laisse la consigne de suite', () => {
    expect(premiereDemande(MODE.questions_cadrage)).toBe(
      'Quelle annonce veux-tu faire, et à qui doit-elle être utile ?',
    );
    expect(premiereDemande(PARCOURS.questions_cadrage)).toBe(
      'Quel article vends-tu, sur quel canal, et quels défauts faut-il montrer ?',
    );
  });

  it('n’annonce rien quand aucune question n’est écrite', () => {
    expect(premiereDemande('Compléter les données indispensables une à une.')).toBeNull();
    expect(premiereDemande(null)).toBeNull();
  });
});

describe('livrables d’un parcours', () => {
  it('lit la liste, son ordre et le format de chaque fichier', () => {
    const plan = lireLesLivrables(PARCOURS.livrables);
    expect(plan?.compte).toBe(3);
    expect(plan?.etapes).toEqual([
      { nom: 'Vue globale nettoyée', format: '4:5' },
      { nom: 'Détail réel', format: '1:1' },
      { nom: 'État et usure', format: '4:5' },
    ]);
  });

  it('accepte un livrable qui n’est pas une image', () => {
    const plan = lireLesLivrables(
      '2 livrables : Enquête interactive avec résolution [conversation]; Débrief des indices et décisions [texte].',
    );
    expect(plan?.compte).toBe(2);
    expect(plan?.etapes[1]).toEqual({ nom: 'Débrief des indices et décisions', format: 'texte' });
  });

  it('n’annonce aucun nombre quand la phrase se contredit', () => {
    const plan = lireLesLivrables('5 livrables : Premier [4:5]; Second [1:1].');
    expect(plan?.compte).toBeNull();
    expect(plan?.etapes).toHaveLength(2);
  });

  it('ne fait pas une liste de la phrase d’un mode', () => {
    expect(lireLesLivrables(MODE.livrables)).toBeNull();
    expect(lireLesLivrables(null)).toBeNull();
  });
});

describe('critères de réussite', () => {
  it('retire les interdits que la fiche affiche déjà ailleurs', () => {
    expect(sansRedite(MODE.criteres_reussite, MODE.erreurs)).toBe(
      'Livrable vérifié contre l’objectif confirmé ; prochaine action réalisable et inconnues explicites.',
    );
  });

  it('ne retire rien quand les deux textes diffèrent', () => {
    expect(sansRedite('Trois livrables conformes au brief.', 'Ne rien inventer.')).toBe(
      'Trois livrables conformes au brief.',
    );
  });

  it('rend null quand il ne reste rien à dire', () => {
    expect(sansRedite(MODE.erreurs, MODE.erreurs)).toBeNull();
  });
});

describe('reprendre la main', () => {
  it('découpe les moments de sortie d’un mode', () => {
    expect(lireLesJalons(MODE.regle_sortie)).toEqual([
      { moment: 'Pause', effet: 'point de reprise' },
      { moment: 'Bilan', effet: 'synthèse' },
      { moment: 'Arrêter ou changer de rôle', effet: 'quitter le conditionnement' },
    ]);
  });

  it('découpe ceux d’un parcours', () => {
    expect(lireLesJalons(PARCOURS.regle_sortie)).toEqual([
      { moment: 'Pause', effet: 'récapituler les éléments validés et la prochaine étape' },
      { moment: 'Reprise', effet: 'repartir de ce point' },
      { moment: 'Arrêter', effet: 'lister fichiers terminés et restants' },
    ]);
  });

  it('laisse la phrase entière quand elle ne se découpe pas', () => {
    expect(lireLesJalons('On peut interrompre à tout moment.')).toBeNull();
    expect(lireLesJalons(null)).toBeNull();
  });
});

describe('conditions d’emploi', () => {
  it('garde ce que le titre ne dit pas déjà', () => {
    expect(conditionsDEmploi(MODE.contexte)).toBe(
      'À utiliser sur un cas concret, avec les documents disponibles.',
    );
  });

  it('ne répète pas un contexte qui se limite au nom', () => {
    expect(conditionsDEmploi(PARCOURS.contexte)).toBeNull();
    expect(conditionsDEmploi(null)).toBeNull();
  });
});
