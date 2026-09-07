import { describe, expect, it } from 'vitest';
import { catalogQuery, claimAccessInput, resolvePromptInput } from '@/lib/validation/schemas';

describe('resolvePromptInput', () => {
  it('accepte une demande valide', () => {
    const parsed = resolvePromptInput.parse({
      promptId: '11111111-1111-4111-8111-111111111111',
      provider: 'chatgpt',
    });
    expect(parsed.surface).toBe('detail');
  });

  it('refuse un identifiant qui n est pas un UUID', () => {
    expect(() => resolvePromptInput.parse({ promptId: '1 OR 1=1', provider: 'chatgpt' })).toThrow();
  });

  it('refuse une IA inconnue', () => {
    expect(() =>
      resolvePromptInput.parse({
        promptId: '11111111-1111-4111-8111-111111111111',
        provider: 'mistral',
      }),
    ).toThrow();
  });
});

describe('catalogQuery', () => {
  it('applique les valeurs par defaut mobile', () => {
    const parsed = catalogQuery.parse({});
    expect(parsed.mode).toBe('image');
    expect(parsed.pageSize).toBe(20);
  });

  it('borne la taille de page pour eviter un dump du catalogue', () => {
    expect(() => catalogQuery.parse({ pageSize: 500 })).toThrow();
  });
});

describe('claimAccessInput', () => {
  const valide = {
    email: 'a@b.fr',
    license: 'ABC-123456',
    password: 'motdepasse1',
    passwordConfirm: 'motdepasse1',
  };

  it('exige la licence et l email ensemble', () => {
    expect(() => claimAccessInput.parse({ email: 'a@b.fr' })).toThrow();
    expect(() => claimAccessInput.parse({ license: 'ABC-123456' })).toThrow();
  });

  it('accepte une saisie complete et concordante', () => {
    expect(claimAccessInput.parse(valide).email).toBe('a@b.fr');
  });

  // La confirmation est verifiee au serveur et pas seulement au formulaire :
  // un mot de passe mal tape enfermerait dehors quelqu'un qui vient de payer.
  it('refuse deux mots de passe differents', () => {
    expect(() => claimAccessInput.parse({ ...valide, passwordConfirm: 'motdepasse2' })).toThrow();
  });

  it('refuse une confirmation absente', () => {
    const { passwordConfirm: _ignore, ...sansConfirmation } = valide;
    expect(() => claimAccessInput.parse(sansConfirmation)).toThrow();
  });
});

describe('catalogQuery, filtres avances', () => {
  it('accepte les trois axes de filtre', () => {
    const parsed = catalogQuery.parse({ acces: undefined, access: 'gratuit', output: 'image' });
    expect(parsed.access).toBe('gratuit');
    expect(parsed.output).toBe('image');
  });

  it('refuse un format de sortie inconnu', () => {
    // Un parametre d'URL bricole ne doit jamais atteindre la requete.
    expect(() => catalogQuery.parse({ output: 'hologramme' })).toThrow();
  });

  it('refuse un niveau d acces inconnu', () => {
    expect(() => catalogQuery.parse({ access: 'admin' })).toThrow();
  });

  it('laisse les filtres absents indefinis', () => {
    const parsed = catalogQuery.parse({});
    expect(parsed.access).toBeUndefined();
    expect(parsed.output).toBeUndefined();
  });
});
