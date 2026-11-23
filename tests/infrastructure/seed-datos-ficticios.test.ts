import { describe, it, expect } from 'vitest';
import { cargarSeed } from '../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../src/infrastructure/clock/clock';

const deps = () => cargarSeed(new RelojFijo(new Date('2026-12-01T10:00:00-03:00')));

describe('cargarSeed - datos ficticios', () => {
  it('dado el seed cuando se listan los pacientes entonces hay entre 8 y 12', () => {
    const n = deps().pacientes.listar().length;
    expect(n).toBeGreaterThanOrEqual(8);
    expect(n).toBeLessThanOrEqual(12);
  });

  it('dado el seed cuando se revisa el DNI de cada paciente entonces todos cumplen ^99\d{6}$', () => {
    for (const p of deps().pacientes.listar()) expect(p.dni).toMatch(/^99\d{6}$/);
  });

  it('dado el seed cuando se revisa el telefono de cada paciente entonces todos cumplen el formato ficticio', () => {
    for (const p of deps().pacientes.listar()) expect(p.telefono).toMatch(/^\+54 9 11 0000-00\d{2}$/);
  });

  it('dado el seed cuando se comparan los DNI entonces no hay repetidos', () => {
    const dnis = deps().pacientes.listar().map((p) => p.dni);
    expect(new Set(dnis).size).toBe(dnis.length);
  });

  it('dado el seed cuando se agrupan los usuarios por rol entonces hay 1 admin, 1 recepcion y 2 odontologo', () => {
    const roles = deps().usuarios.map((u) => u.rol).sort();
    expect(roles).toEqual(['admin', 'odontologo', 'odontologo', 'recepcion']);
  });

  it('dado el seed cuando se revisan los odontologos entonces cada uno apunta a un profesional existente y distinto', () => {
    const d = deps();
    const ids = d.usuarios.filter((u) => u.rol === 'odontologo').map((u) => u.profesionalId);
    expect(ids).toHaveLength(2);
    for (const id of ids) {
      expect(id).toBeDefined();
      expect(d.profesionales.buscarPorId(id ?? '')).toBeDefined();
    }
    expect(new Set(ids).size).toBe(2);
  });

  it('dado el seed cuando se revisan nombres de pacientes, usuarios y profesionales entonces son evidentemente ficticios', () => {
    const d = deps();
    for (const p of d.pacientes.listar()) expect(p.nombre).toMatch(/Fictici/);
    for (const u of d.usuarios) expect(u.nombre).toMatch(/Fictici/);
    for (const p of d.profesionales.listar()) expect(p.nombre).toMatch(/Fictici/);
  });
});
