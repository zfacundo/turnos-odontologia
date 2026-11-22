import { describe, it, expect } from 'vitest';
import { TurnoRepositoryEnMemoria } from '../../src/infrastructure/memory/turno-repository';
import type { TurnoRegistro } from '../../src/application/ports/repositorios';
import { crearIntervalo, type Intervalo } from '../../src/domain/shared/intervalo';

const f = (hhmm: string): Date => new Date(`2026-12-01T${hhmm}:00-03:00`);

function turno(p: Partial<TurnoRegistro> & { id: string }): TurnoRegistro {
  return {
    profesionalId: 'p-1',
    sillonId: 's-1',
    pacienteId: 'pac-01',
    inicio: f('09:00'),
    fin: f('09:30'),
    estado: 'reservado',
    ...p,
  };
}

function rango(ini: string, fin: string): Intervalo {
  const r = crearIntervalo(f(ini), f(fin));
  if (!r.ok) throw new Error('fixture invalida');
  return r.valor;
}

describe('TurnoRepositoryEnMemoria - guardar, buscar y actualizar', () => {
  it('dado un repositorio vacio cuando se guarda t-1 y se busca por id entonces se obtiene t-1 con los mismos datos', () => {
    const repo = new TurnoRepositoryEnMemoria();
    const t = turno({ id: 't-1' });
    repo.guardar(t);
    expect(repo.buscarPorId('t-1')).toEqual(t);
  });

  it('dado un repositorio vacio cuando se busca un id inexistente entonces no se obtiene nada', () => {
    expect(new TurnoRepositoryEnMemoria().buscarPorId('t-9')).toBeUndefined();
  });

  it('dado t-1 reservado cuando se actualiza a cancelado y se busca entonces se obtiene cancelado', () => {
    const repo = new TurnoRepositoryEnMemoria();
    repo.guardar(turno({ id: 't-1', estado: 'reservado' }));
    const r = repo.actualizar(turno({ id: 't-1', estado: 'cancelado' }));
    expect(r.ok).toBe(true);
    expect(repo.buscarPorId('t-1')?.estado).toBe('cancelado');
  });

  it('dado un turno inexistente cuando se actualiza entonces devuelve un error de regla', () => {
    const r = new TurnoRepositoryEnMemoria().actualizar(turno({ id: 't-404' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBeTruthy();
  });

  it('dado un turno guardado cuando se muta el objeto original entonces el repositorio no cambia', () => {
    const repo = new TurnoRepositoryEnMemoria();
    const t = { ...turno({ id: 't-1' }) } as { -readonly [K in keyof TurnoRegistro]: TurnoRegistro[K] };
    repo.guardar(t);
    t.estado = 'cancelado';
    expect(repo.buscarPorId('t-1')?.estado).toBe('reservado');
  });
});

describe('TurnoRepositoryEnMemoria - listarActivos', () => {
  it('dado turnos de varios profesionales/sillones, un cancelado y uno contiguo cuando se filtra entonces solo se obtienen los activos solapados del profesional y sillon', () => {
    const repo = new TurnoRepositoryEnMemoria();
    repo.guardar(turno({ id: 'ok-1', inicio: f('09:30'), fin: f('10:00') }));
    repo.guardar(turno({ id: 'ok-2', inicio: f('10:00'), fin: f('11:00') }));
    repo.guardar(turno({ id: 'contiguo', inicio: f('09:00'), fin: f('09:30') }));
    repo.guardar(turno({ id: 'contiguo-fin', inicio: f('10:30'), fin: f('11:00') }));
    repo.guardar(turno({ id: 'cancelado', inicio: f('09:30'), fin: f('10:00'), estado: 'cancelado' }));
    repo.guardar(turno({ id: 'otro-prof', profesionalId: 'p-2', inicio: f('09:30'), fin: f('10:00') }));
    repo.guardar(turno({ id: 'otro-sillon', sillonId: 's-2', inicio: f('09:30'), fin: f('10:00') }));

    const r = repo.listarActivos({ profesionalId: 'p-1', sillonId: 's-1', rango: rango('09:30', '10:30') });
    expect(r.map((t) => t.id).sort()).toEqual(['ok-1', 'ok-2']);
  });

  it('dado turnos activos y cancelados cuando se lista sin filtro entonces no aparecen cancelados', () => {
    const repo = new TurnoRepositoryEnMemoria();
    repo.guardar(turno({ id: 'a' }));
    repo.guardar(turno({ id: 'b', estado: 'cancelado' }));
    repo.guardar(turno({ id: 'c', estado: 'atendido' }));
    expect(repo.listarActivos().map((t) => t.id).sort()).toEqual(['a', 'c']);
  });

  it('dado turnos de dos pacientes cuando se filtra por paciente entonces solo se obtiene el suyo', () => {
    const repo = new TurnoRepositoryEnMemoria();
    repo.guardar(turno({ id: 'a', pacienteId: 'pac-01' }));
    repo.guardar(turno({ id: 'b', pacienteId: 'pac-02' }));
    expect(repo.listarActivos({ pacienteId: 'pac-02' }).map((t) => t.id)).toEqual(['b']);
  });
});
