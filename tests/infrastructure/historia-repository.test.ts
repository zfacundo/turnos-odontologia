import { describe, expect, it } from 'vitest';
import type { EntradaHistoria } from '../../src/domain/historia/entrada';
import { HistoriaRepositoryEnMemoria } from '../../src/infrastructure/memory/historia-repository';

const entrada = (id: string, pacienteId: string, fecha: string): EntradaHistoria => ({
  id,
  pacienteId,
  fecha: new Date(fecha),
  profesionalId: 'prof-1',
  profesionalNombre: 'Dra. Ficticia Perez',
  procedimiento: 'Control (dato ficticio)',
  notas: '',
  creadoPor: 'u-odonto-1',
  creadoEn: new Date('2026-12-01T10:00:00-03:00'),
  simulado: true,
});

describe('HistoriaRepositoryEnMemoria', () => {
  it('dado entradas de dos fechas cuando se lista el paciente entonces vienen por fecha descendente', () => {
    const repo = new HistoriaRepositoryEnMemoria();
    repo.agregar(entrada('hc-1', 'pac-01', '2026-10-01T10:00:00-03:00'));
    repo.agregar(entrada('hc-2', 'pac-01', '2026-11-15T10:00:00-03:00'));
    repo.agregar(entrada('hc-3', 'pac-01', '2026-10-20T10:00:00-03:00'));
    expect(repo.listarPorPaciente('pac-01').map((e) => e.id)).toEqual(['hc-2', 'hc-3', 'hc-1']);
  });

  it('dado entradas de otro paciente cuando se lista pac-01 entonces solo trae las suyas', () => {
    const repo = new HistoriaRepositoryEnMemoria();
    repo.agregar(entrada('hc-1', 'pac-01', '2026-10-01T10:00:00-03:00'));
    repo.agregar(entrada('hc-2', 'pac-02', '2026-11-15T10:00:00-03:00'));
    expect(repo.listarPorPaciente('pac-01').map((e) => e.id)).toEqual(['hc-1']);
  });

  it('dado un paciente sin entradas cuando se lista entonces devuelve una lista vacia', () => {
    expect(new HistoriaRepositoryEnMemoria().listarPorPaciente('pac-02')).toEqual([]);
  });

  it('dado una entrada devuelta cuando se la muta por fuera entonces el repositorio no cambia', () => {
    const repo = new HistoriaRepositoryEnMemoria();
    repo.agregar(entrada('hc-1', 'pac-01', '2026-10-01T10:00:00-03:00'));
    const [copia] = repo.listarPorPaciente('pac-01');
    (copia as { procedimiento: string }).procedimiento = 'ALTERADO';
    expect(repo.listarPorPaciente('pac-01')[0]?.procedimiento).toBe('Control (dato ficticio)');
  });

  it('dado el repositorio cuando se revisa su interfaz entonces no expone actualizar ni eliminar', () => {
    const repo = new HistoriaRepositoryEnMemoria() as unknown as Record<string, unknown>;
    for (const metodo of ['actualizar', 'eliminar', 'update', 'delete', 'borrar', 'guardar']) {
      expect(repo[metodo]).toBeUndefined();
    }
  });

  it('dado un repositorio con 2 entradas iniciales cuando se piden ids nuevos entonces son distintos y no chocan con la cantidad existente', () => {
    const repo = new HistoriaRepositoryEnMemoria([
      entrada('hc-1', 'pac-01', '2026-10-01T10:00:00-03:00'),
      entrada('hc-2', 'pac-01', '2026-10-02T10:00:00-03:00'),
    ]);
    expect(repo.siguienteId()).toBe('hc-3');
    expect(repo.siguienteId()).toBe('hc-4');
  });
});
