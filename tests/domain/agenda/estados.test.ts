import { describe, it, expect } from 'vitest';
import { TRANSICIONES, esFinal, validarTransicion } from '../../../src/domain/agenda/estados';
import type { EstadoTurno } from '../../../src/domain/agenda/turno';

const ESTADOS: readonly EstadoTurno[] = ['reservado', 'confirmado', 'cancelado', 'atendido', 'ausente'];

const VALIDAS: Readonly<Record<EstadoTurno, readonly EstadoTurno[]>> = {
  reservado: ['confirmado', 'cancelado', 'ausente', 'atendido'],
  confirmado: ['cancelado', 'atendido', 'ausente'],
  cancelado: [],
  atendido: [],
  ausente: [],
};

describe('validarTransicion', () => {
  it('dado un turno reservado cuando se pide pasar a confirmado entonces es valida y devuelve confirmado', () => {
    const r = validarTransicion({ id: 't-1', estado: 'reservado' }, 'confirmado');
    expect(r).toEqual({ ok: true, valor: 'confirmado' });
  });

  it('dado un turno atendido cuando se pide pasar a cancelado entonces falla con RN-AG-09 y conflicto con el id del turno', () => {
    const r = validarTransicion({ id: 't-9', estado: 'atendido' }, 'cancelado');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.regla).toBe('RN-AG-09');
    expect(r.error.conflicto).toEqual({ turnoId: 't-9' });
    expect(r.error.mensaje).toContain('atendido');
  });

  const combinaciones = ESTADOS.flatMap((origen) =>
    ESTADOS.map((destino) => [origen, destino, VALIDAS[origen].includes(destino)] as const),
  );

  it.each(combinaciones)(
    'dado un turno %s cuando se pide pasar a %s entonces la transicion valida es %s',
    (origen, destino, esperado) => {
      const r = validarTransicion({ id: 't-1', estado: origen }, destino);
      expect(r.ok).toBe(esperado);
      if (!r.ok) expect(r.error.regla).toBe('RN-AG-09');
    },
  );

  it('dado la tabla de transiciones cuando se compara con RN-AG-09 entonces coincide exactamente', () => {
    expect(TRANSICIONES).toEqual(VALIDAS);
  });
});

describe('esFinal', () => {
  it.each([
    ['reservado', false],
    ['confirmado', false],
    ['cancelado', true],
    ['atendido', true],
    ['ausente', true],
  ] as const)('dado el estado %s cuando se consulta esFinal entonces es %s', (estado, esperado) => {
    expect(esFinal(estado)).toBe(esperado);
  });
});
