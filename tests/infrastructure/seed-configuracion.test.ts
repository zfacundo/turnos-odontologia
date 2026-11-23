import { describe, it, expect } from 'vitest';
import { cargarSeed } from '../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../src/infrastructure/clock/clock';
import { validarPrestacion } from '../../src/domain/configuracion/prestacion';
import { estaAlineadoA15 } from '../../src/domain/shared/bloques';
import { crearIntervalo } from '../../src/domain/shared/intervalo';

const reloj = new RelojFijo(new Date('2026-12-01T10:00:00-03:00'));

function bloqueosDelDia(deps: ReturnType<typeof cargarSeed>, dia: string) {
  const r = crearIntervalo(new Date(`${dia}T00:00:00-03:00`), new Date(`${dia}T23:59:00-03:00`));
  if (!r.ok) throw new Error('fixture invalida');
  return deps.bloqueos.listarEn(r.valor);
}

describe('cargarSeed - configuracion', () => {
  it('dado el seed cargado cuando se listan sillones y profesionales entonces hay 2 y 2, todos activos', () => {
    const deps = cargarSeed(reloj);
    expect(deps.sillones.listar()).toHaveLength(2);
    expect(deps.profesionales.listar()).toHaveLength(2);
    expect(deps.sillones.listar().every((s) => s.activo)).toBe(true);
    expect(deps.profesionales.listar().every((p) => p.activo)).toBe(true);
  });

  it('dado el seed cargado cuando se consulta la disponibilidad entonces cada profesional tiene 09-13 y 14-19 de lunes a viernes y nada en fin de semana', () => {
    const deps = cargarSeed(reloj);
    for (const prof of deps.profesionales.listar()) {
      expect(prof.disponibilidad.filter((f) => f.diaSemana >= 6)).toEqual([]);
      for (const dia of [1, 2, 3, 4, 5]) {
        const franjas = prof.disponibilidad
          .filter((f) => f.diaSemana === dia)
          .map((f) => `${f.desde}-${f.hasta}`)
          .sort();
        expect(franjas).toEqual(['09:00-13:00', '14:00-19:00']);
      }
      expect(prof.disponibilidad).toHaveLength(10);
    }
  });

  it('dado el seed cargado cuando se listan las prestaciones entonces hay 5 con sus duraciones y todas cumplen RN-CF-01', () => {
    const prestaciones = cargarSeed(reloj).prestaciones.listar();
    expect(prestaciones).toHaveLength(5);
    const porCodigo = Object.fromEntries(prestaciones.map((p) => [p.codigo, p.duracionMin]));
    expect(porCodigo).toEqual({ control: 30, orto: 45, trat: 60, est: 60, urg: 30 });
    expect(prestaciones.every((p) => validarPrestacion(p).ok)).toBe(true);
  });

  it('dado el seed con periodo que contiene el lunes 2026-12-07 cuando se listan los bloqueos del dia entonces existe "reservado urgencias" en [18:30, 19:00)', () => {
    const deps = cargarSeed(reloj);
    const urg = bloqueosDelDia(deps, '2026-12-07').filter((b) => b.motivo === 'reservado urgencias');
    expect(urg).toHaveLength(1);
    expect(urg[0]?.intervalo.inicio.toISOString()).toBe('2026-12-07T21:30:00.000Z');
    expect(urg[0]?.intervalo.fin.toISOString()).toBe('2026-12-07T22:00:00.000Z');
  });

  it('dado el seed con periodo que contiene el sabado 2026-12-05 cuando se listan los bloqueos del dia entonces no hay bloqueo de urgencias', () => {
    const deps = cargarSeed(reloj);
    expect(bloqueosDelDia(deps, '2026-12-05')).toEqual([]);
    expect(bloqueosDelDia(deps, '2026-12-06')).toEqual([]);
  });

  it('dado un reloj en otra fecha cuando se carga el seed entonces los bloqueos siguen la semana del reloj', () => {
    const deps = cargarSeed(new RelojFijo(new Date('2027-03-10T10:00:00-03:00')));
    const r = crearIntervalo(new Date('2027-03-08T00:00:00-03:00'), new Date('2027-03-08T23:59:00-03:00'));
    if (!r.ok) throw new Error('fixture invalida');
    expect(deps.bloqueos.listarEn(r.valor)).toHaveLength(1);
  });

  it('dado el seed cuando se leen los bloqueos entonces todos estan alineados a 15 minutos y el repo de turnos arranca vacio', () => {
    const deps = cargarSeed(reloj);
    expect(deps.bloqueos.listar().length).toBeGreaterThan(0);
    for (const b of deps.bloqueos.listar()) {
      expect(estaAlineadoA15(b.intervalo.inicio) && estaAlineadoA15(b.intervalo.fin)).toBe(true);
    }
    expect(deps.turnos.listarActivos()).toEqual([]);
  });
});
