import { describe, expect, it } from 'vitest';
import { cargarSeed } from '../../src/infrastructure/seed/cargar-seed';
import { crearDepsVacias } from '../../src/infrastructure/seed/deps-vacias';
import { RelojFijo } from '../../src/infrastructure/clock/clock';

const AHORA = new Date('2026-12-01T10:00:00-03:00');
const deps = () => cargarSeed(new RelojFijo(AHORA));

const entradasDelSeed = () => {
  const d = deps();
  return d.pacientes.listar().flatMap((p) => d.historia.listarPorPaciente(p.id));
};

describe('cargarSeed - historial ficticio', () => {
  it('dado el seed cuando se recorren las entradas entonces hay entre 2 y 3 por paciente de pac-01 a pac-03', () => {
    const d = deps();
    for (const id of ['pac-01', 'pac-02', 'pac-03']) {
      const n = d.historia.listarPorPaciente(id).length;
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(3);
    }
  });

  it('dado el seed cuando se recorren las entradas entonces cada pacienteId y profesionalId existe y simulado es true', () => {
    const d = deps();
    const todas = entradasDelSeed();
    expect(todas.length).toBeGreaterThan(0);
    for (const e of todas) {
      expect(d.pacientes.buscarPorId(e.pacienteId)).toBeDefined();
      expect(d.profesionales.buscarPorId(e.profesionalId)).toBeDefined();
      expect(e.simulado).toBe(true);
    }
  });

  it('dado el seed cuando se revisan las fechas entonces todas son anteriores al instante inicial del reloj', () => {
    for (const e of entradasDelSeed()) expect(e.fecha.getTime()).toBeLessThan(AHORA.getTime());
  });

  it('dado el seed cuando se revisan los textos entonces son evidentemente ficticios', () => {
    for (const e of entradasDelSeed()) expect(`${e.procedimiento} ${e.notas}`).toMatch(/ficticio/i);
  });

  it('dado el seed cuando se comparan los ids entonces no hay repetidos y el siguiente id no choca', () => {
    const d = deps();
    const ids = entradasDelSeed().map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(d.historia.siguienteId());
  });

  it('dado los deps vacios cuando se lista el historial de cualquier paciente entonces no hay entradas', () => {
    const d = crearDepsVacias(new RelojFijo(AHORA));
    expect(d.historia.listarPorPaciente('pac-01')).toEqual([]);
  });
});
