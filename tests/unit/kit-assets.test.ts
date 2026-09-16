import { describe, expect, it } from 'vitest';
import { iconeDeLaFamille, iconeDuRayon, iconeDuRole, type RoleDIcone } from '@/lib/ui/icones';
import { ASSETS_PAR_FAMILLE, ASSETS_PAR_RAYON } from '@/lib/ui/kit-taxonomie';
import { ICONES_DU_KIT } from '@/lib/ui/kit-icones';

const ROLES: RoleDIcone[] = [
  'search',
  'favorite',
  'copy',
  'filters',
  'home',
  'library',
  'profile',
  'back',
  'chevron',
  'close',
  'check',
  'sparkles',
  'mode',
  'journey',
];

describe('assets du kit', () => {
  it('rend un dessin complet pour chaque role d’interface', () => {
    for (const role of ROLES) {
      const svg = iconeDuRole(role);
      expect(svg.startsWith('<svg ')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
    }
  });

  it('ne laisse aucun contenu actif traverser', () => {
    for (const [nom, svg] of Object.entries(ICONES_DU_KIT)) {
      expect(svg, nom).not.toMatch(/<script|\son\w+\s*=|javascript:/i);
    }
  });

  it('couvre les huit familles et les cinquante rayons', () => {
    expect(Object.keys(ASSETS_PAR_FAMILLE)).toHaveLength(8);
    expect(Object.keys(ASSETS_PAR_RAYON)).toHaveLength(50);
  });
});

describe('résolution par clé', () => {
  it('résout un rayon que le kit nomme déjà', () => {
    expect(iconeDuRayon('beaute')).toBe(ICONES_DU_KIT['icon-beaute']);
    expect(iconeDeLaFamille('modes-ia')).toBe(ICONES_DU_KIT['cat-modes-ia']);
  });

  it('résout les neuf rayons renommés depuis le rangement', () => {
    // Le kit decrit la taxonomie du classeur V2. « Cinéma » s'y appelait
    // encore « Cinéma - personnages et scènes » ; sans la table d'heritage,
    // le rayon le plus fourni du catalogue serait reste sans dessin.
    const heritiers = [
      'cinema',
      'editorial',
      'signatures-picturales',
      'mouvements-artistiques',
      'matieres-et-metamorphoses',
      'effets-de-scene',
      'espace-et-gravite',
      'lumiere-et-optique',
      'particules-et-metamorphoses',
    ];
    for (const slug of heritiers) expect(iconeDuRayon(slug), slug).not.toBeNull();
  });

  it('oublie les clés d’avant le rangement', () => {
    // Les laisser ouvrirait la porte a deux rayons sur le meme dessin, ce qui
    // est exactement le defaut signale : deux rayons voisins, une couverture.
    expect(iconeDuRayon('cinema-personnages-et-scenes')).toBeNull();
    expect(iconeDuRayon('vfx-effets-de-scene')).toBeNull();
  });

  it('n’attribue jamais deux rayons au même dessin', () => {
    const dessins = Object.values(ASSETS_PAR_RAYON).map((assets) => assets.illustration);
    expect(new Set(dessins).size).toBe(dessins.length);
  });

  it('ne devine rien pour une clé inconnue', () => {
    // Le kit annonce un repli `icon-help` qu'il ne contient pas : il n'y a
    // rien a mettre a la place, et une icone prise au hasard mentirait.
    expect(iconeDuRayon('rayon-qui-n-existe-pas')).toBeNull();
    expect(iconeDuRayon(null)).toBeNull();
    expect(iconeDeLaFamille(undefined)).toBeNull();
  });

  it('donne une description à chaque rayon et à chaque famille', () => {
    for (const [slug, assets] of Object.entries(ASSETS_PAR_RAYON)) {
      expect(assets.description.trim().length, slug).toBeGreaterThan(10);
    }
    for (const [slug, assets] of Object.entries(ASSETS_PAR_FAMILLE)) {
      expect(assets.description.trim().length, slug).toBeGreaterThan(10);
    }
  });
});
