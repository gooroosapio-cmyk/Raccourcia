import { describe, expect, it } from 'vitest';
import { filtrerLesFacons, nomCourtDuRayon, rayonsPresents } from '@/lib/catalog/facons';
import type { PromptCard } from '@/lib/catalog/types';

function carte(partiel: Partial<PromptCard>): PromptCard {
  return {
    name: '',
    command: '',
    shortDescription: '',
    resultSummary: '',
    collectionSlug: null,
    ...partiel,
  } as PromptCard;
}

describe('nom court d’un rayon', () => {
  it('retire le mot que le titre de la page vient de dire', () => {
    expect(nomCourtDuRayon('Parcours visuels', 'Parcours guidés')).toBe('Visuels');
    expect(nomCourtDuRayon('Parcours mixtes et modes', 'Parcours guidés')).toBe('Mixtes et modes');
  });

  it('ne touche pas à un nom qui ne répète rien', () => {
    expect(nomCourtDuRayon('Professionnels et vente', 'Modes IA')).toBe('Professionnels et vente');
    expect(nomCourtDuRayon('Clarté et modèles mentaux', 'Modes IA')).toBe(
      'Clarté et modèles mentaux',
    );
  });

  it('ne laisse pas un reste trop court pour se comprendre', () => {
    // « Modes IA » ampute de « Modes » ne laisserait que « IA ».
    expect(nomCourtDuRayon('Modes IA', 'Modes IA')).toBe('Modes IA');
  });
});

describe('filtrer les modes et parcours', () => {
  const liste = [
    carte({
      name: 'Collision d’idées',
      command: '/collision',
      shortDescription: 'Croisez deux univers pour trouver un concept original.',
      collectionSlug: 'creativite-et-angles-inattendus',
    }),
    carte({
      name: 'Entretien d’embauche',
      command: '/recruteur',
      shortDescription: 'Entraînez-vous et améliorez vos réponses.',
      collectionSlug: 'professionnels-et-vente',
    }),
    carte({
      name: 'Le code secret',
      command: '/codesecret',
      shortDescription: 'Résolvez des énigmes avec des indices progressifs.',
      collectionSlug: 'jeux-enigmes-et-simulations',
    }),
  ];

  it('rend tout quand rien n’est demandé', () => {
    expect(filtrerLesFacons(liste, {})).toHaveLength(3);
  });

  it('se borne au rayon choisi', () => {
    expect(filtrerLesFacons(liste, { rayon: 'jeux-enigmes-et-simulations' })).toHaveLength(1);
  });

  it('cherche sans se soucier des accents ni de la casse', () => {
    expect(filtrerLesFacons(liste, { terme: 'IDEES' })[0]?.command).toBe('/collision');
    expect(filtrerLesFacons(liste, { terme: 'énigmes' })[0]?.command).toBe('/codesecret');
  });

  it('trouve par le raccourci', () => {
    expect(filtrerLesFacons(liste, { terme: '/recruteur' })).toHaveLength(1);
  });

  it('exige tous les mots plutôt que le premier', () => {
    // Taper plus long doit restreindre, jamais elargir.
    expect(filtrerLesFacons(liste, { terme: 'indices progressifs' })).toHaveLength(1);
    expect(filtrerLesFacons(liste, { terme: 'indices vente' })).toHaveLength(0);
  });

  it('combine le rayon et le terme', () => {
    expect(filtrerLesFacons(liste, { rayon: 'professionnels-et-vente', terme: 'idées' })).toEqual(
      [],
    );
  });
});

describe('puces de rayon', () => {
  it('ne propose que les rayons qui ramènent quelque chose', () => {
    const cartes = [carte({ collectionSlug: 'jeux-enigmes-et-simulations' })];
    const rayons = [
      { slug: 'jeux-enigmes-et-simulations', name: 'Jeux, énigmes et simulations' },
      { slug: 'personnages-immersifs', name: 'Personnages immersifs' },
    ];
    expect(rayonsPresents(cartes, rayons).map((r) => r.slug)).toEqual([
      'jeux-enigmes-et-simulations',
    ]);
  });
});
