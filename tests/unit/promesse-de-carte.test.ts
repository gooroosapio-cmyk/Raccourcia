import { describe, expect, it } from 'vitest';
import { promesseDeCarte } from '@/lib/catalog/experience';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * Ce qu'une carte dit de la commande, et dans quel ordre elle le choisit.
 *
 * CE QUE CE TEST PROTEGE. L'ordre etait l'inverse sur les cartes texte —
 * l'intention d'abord — et il partait d'une idee juste : l'intention dit ce
 * que la commande cherche a obtenir, la description comment elle s'y prend.
 *
 * La donnee ne suit plus cette idee depuis l'import du moteur V3.
 * `intention` y porte le cadrage complet envoye au moteur : la promesse,
 * puis les garde-fous. Sur les 2 121 commandes publiees, elle fait 209
 * caracteres en moyenne contre 70 pour la description, et 229 repetent mot
 * pour mot la meme clause d'exactitude — une carte sur dix affichait donc le
 * meme paragraphe que sa voisine.
 *
 * Remettre l'intention en tete fait echouer le premier cas, qui est
 * exactement une ligne du catalogue.
 */
const carte = (champs: Partial<PromptCard>): PromptCard =>
  ({ shortDescription: '', resultSummary: '', intention: null, ...champs }) as PromptCard;

describe('promesseDeCarte', () => {
  it('prefere la description a l intention, meme quand les deux existent', () => {
    // Une ligne reelle du catalogue : la description est la carte,
    // l'intention est la consigne envoyee au moteur.
    const jeuDeRole = carte({
      shortDescription: 'Aventure fantasy : inventaire santé objectifs et conséquences.',
      intention:
        'Jeu de rôle. Inventaire santé objectifs et conséquences, hasard explicité. ' +
        'Exactitude des noms, dates, chiffres et références. Séparer faits, hypothèses ' +
        'et propositions. Ne pas prétendre mémoriser hors conversation.',
    });

    expect(promesseDeCarte(jeuDeRole)).toBe(
      'Aventure fantasy : inventaire santé objectifs et conséquences.',
    );
  });

  it('retombe sur le resume du resultat quand la description manque', () => {
    expect(promesseDeCarte(carte({ resultSummary: 'Un tableau prêt à coller.' }))).toBe(
      'Un tableau prêt à coller.',
    );
  });

  it('garde l intention en dernier recours plutot qu une carte muette', () => {
    expect(promesseDeCarte(carte({ intention: 'Comparer deux offres.' }))).toBe(
      'Comparer deux offres.',
    );
  });

  it('ignore un champ qui n a que des espaces', () => {
    expect(promesseDeCarte(carte({ shortDescription: '   ', resultSummary: 'Le résultat.' }))).toBe(
      'Le résultat.',
    );
  });

  it('rend une chaine vide quand la commande ne dit rien', () => {
    expect(promesseDeCarte(carte({}))).toBe('');
  });
});
