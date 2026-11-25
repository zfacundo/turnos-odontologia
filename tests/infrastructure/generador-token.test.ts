import { describe, expect, it } from 'vitest';
import { GeneradorTokenAleatorio } from '../../src/infrastructure/auth/generador-token';

describe('GeneradorTokenAleatorio', () => {
  it('dado el generador cuando se piden dos tokens seguidos entonces son distintos', () => {
    const g = new GeneradorTokenAleatorio();
    expect(g.generar()).not.toBe(g.generar());
  });

  it('dado el generador cuando se pide un token entonces tiene al menos 43 caracteres base64url (256 bits)', () => {
    const token = new GeneradorTokenAleatorio().generar();
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('dado 200 tokens generados cuando se comparan entonces no hay repetidos', () => {
    const g = new GeneradorTokenAleatorio();
    const tokens = new Set(Array.from({ length: 200 }, () => g.generar()));
    expect(tokens.size).toBe(200);
  });
});
