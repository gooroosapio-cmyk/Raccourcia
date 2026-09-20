import { describe, expect, it } from 'vitest';
import { texteDePartage } from '@/lib/share/texte-de-partage';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * Le message envoye hors de l'application.
 *
 * Ce qui est verrouille ici, c'est la promesse faite au lecteur : rien
 * d'invente, rien de trop long, et jamais la mention d'un format sur une
 * commande qui ne rend pas d'image.
 */
function carte(partiel: Partial<PromptCard>): PromptCard {
  return {
    name: 'Portrait studio',
    command: '/portrait-studio',
    resultSummary: 'Un portrait au rendu éditorial.',
    entityType: 'commande_image',
    showImageCard: true,
    witnessType: null,
    defaultRatio: null,
    ...partiel,
  } as PromptCard;
}

describe('texte de partage', () => {
  it('nomme la commande et l’application', () => {
    expect(texteDePartage(carte({}))).toContain('« Portrait studio » sur RaccourcIA.');
  });

  it('dit l’échange d’une commande image : le témoin contre le format', () => {
    const texte = texteDePartage(
      carte({ witnessType: 'une photo nette de la personne', defaultRatio: '3:2' }),
    );
    expect(texte).toContain('Une photo nette de la personne, et vous obtenez');
    expect(texte).toContain('format 3:2');
  });

  it('annonce le format par défaut quand le catalogue se tait', () => {
    expect(texteDePartage(carte({ witnessType: 'une photo du produit' }))).toContain('format 4:5');
  });

  it('ne parle jamais de format sur ce qui ne rend pas d’image', () => {
    const texte = texteDePartage(
      carte({
        entityType: 'mode_ia',
        showImageCard: false,
        resultSummary: 'Une conversation qui garde le cap.',
      }),
    );
    expect(texte).not.toContain('format');
    expect(texte).toContain('Un mode à activer : une conversation qui garde le cap.');
  });

  it('garde la première phrase et coupe le reste', () => {
    const texte = texteDePartage(
      carte({
        entityType: 'parcours',
        showImageCard: false,
        resultSummary: 'Un plan en quatre étapes. Chacune demande une réponse avant la suivante.',
      }),
    );
    expect(texte).toContain('Un parcours guidé : un plan en quatre étapes.');
    expect(texte).not.toContain('Chacune demande');
  });

  it('n’invente rien quand le catalogue ne dit rien', () => {
    const texte = texteDePartage(
      carte({ entityType: 'mode_ia', showImageCard: false, resultSummary: '   ' }),
    );
    expect(texte).toBe(
      '« Portrait studio » sur RaccourcIA.\nLe raccourci est déjà écrit : il ne reste qu’à copier.',
    );
  });

  it('reste court : rien ne dépasse ce qu’une messagerie affiche', () => {
    const texte = texteDePartage(
      carte({
        entityType: 'parcours',
        showImageCard: false,
        resultSummary:
          'Un accompagnement complet qui reprend chacune des étapes du dossier, les documents à réunir, les délais à respecter et les interlocuteurs à contacter avant le dépôt',
      }),
    );
    for (const ligne of texte.split('\n')) expect(ligne.length).toBeLessThanOrEqual(160);
    expect(texte).toContain('…');
  });
});
