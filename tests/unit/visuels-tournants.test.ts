import { describe, expect, it } from 'vitest';
import { visuelDeCollection, visuelDeTag } from '@/lib/catalog/visuels';

/**
 * Qui gagne, du visuel pose et du visuel tire.
 *
 * CE QUE CE TEST PROTEGE. Les deux regles sont inverses l'une de l'autre, et
 * c'est ce qui les rend faciles a uniformiser par megarde — « un visuel
 * declare gagne toujours » se lit comme une regle generale alors qu'elle ne
 * vaut que pour les tags.
 *
 * Un tag porte `tags.image_path` : une personne a choisi cette image pour ce
 * tag, et un tirage qui passerait devant rendrait son geste sans effet.
 *
 * Une collection n'a pas de visuel a elle. `collections_populaires` lui
 * prete celui de sa PREMIERE commande publiee, toujours la meme : ce n'est
 * pas un choix, c'est un emprunt. Le laisser gagner revenait a ce qu'aucune
 * tuile de rayon ne change jamais — le defaut que le tirage existe justement
 * pour corriger.
 */
const tirage = new Map<string, string>([
  ['tag:portrait', '/tire/portrait.jpg'],
  ['collection:liens-et-souvenirs', '/tire/liens.jpg'],
]);

describe('visuelDeTag', () => {
  it('garde l image deposee par l administration', () => {
    expect(visuelDeTag('/depose/portrait.jpg', 'portrait', tirage)).toBe('/depose/portrait.jpg');
  });

  it('comble le vide avec le tirage', () => {
    expect(visuelDeTag(null, 'portrait', tirage)).toBe('/tire/portrait.jpg');
  });

  it('rend null quand ni l un ni l autre n existe', () => {
    expect(visuelDeTag(null, 'inconnu', tirage)).toBeNull();
  });
});

describe('visuelDeCollection', () => {
  it('fait passer le tirage devant l apercu prete', () => {
    expect(visuelDeCollection('/emprunte/liens.jpg', 'liens-et-souvenirs', tirage)).toBe(
      '/tire/liens.jpg',
    );
  });

  it('retombe sur l apercu prete quand le tirage ne rend rien', () => {
    // Un rayon dont aucune commande publiee ne porte de visuel : mieux vaut
    // une image empruntee qu'un cadre typographique.
    expect(visuelDeCollection('/emprunte/seul.jpg', 'sans-tirage', tirage)).toBe(
      '/emprunte/seul.jpg',
    );
  });

  it('rend null quand ni l un ni l autre n existe', () => {
    expect(visuelDeCollection(null, 'sans-tirage', tirage)).toBeNull();
  });
});
