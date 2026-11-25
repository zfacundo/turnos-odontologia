import { describe, it, expect } from 'vitest';
import type { Bloqueo } from '../../src/domain/configuracion/bloqueo';
import type { Prestacion } from '../../src/domain/configuracion/prestacion';
import type { Profesional } from '../../src/domain/configuracion/profesional';
import type { Sillon } from '../../src/domain/configuracion/sillon';
import { BloqueoRepositoryEnMemoria } from '../../src/infrastructure/memory/bloqueo-repository';
import { PrestacionRepositoryEnMemoria } from '../../src/infrastructure/memory/prestacion-repository';
import { ProfesionalRepositoryEnMemoria } from '../../src/infrastructure/memory/profesional-repository';
import { SillonRepositoryEnMemoria } from '../../src/infrastructure/memory/sillon-repository';

const SILLON: Sillon = { id: 's-1', nombre: 'Sillon 1', activo: true };
const PRESTACION: Prestacion = {
  id: 'p-1',
  codigo: 'control',
  nombre: 'Control',
  duracionMin: 30,
};
const PROFESIONAL: Profesional = {
  id: 'prof-1',
  nombre: 'Dra. Ficticia',
  matricula: 'MN-FICT-0001',
  activo: true,
  disponibilidad: [{ diaSemana: 1, desde: '09:00', hasta: '13:00' }],
};
const BLOQUEO: Bloqueo = {
  id: 'b-1',
  motivo: 'Feriado',
  intervalo: {
    inicio: new Date('2026-12-08T09:00:00-03:00'),
    fin: new Date('2026-12-08T10:00:00-03:00'),
  },
};

describe('repos de configuracion - guardar y buscar', () => {
  it('dado un repositorio de sillones vacio cuando se guarda s-1 y se busca por id entonces devuelve los mismos datos', () => {
    const repo = new SillonRepositoryEnMemoria();
    repo.guardar(SILLON);
    expect(repo.buscarPorId('s-1')).toEqual(SILLON);
    expect(repo.listar()).toEqual([SILLON]);
  });

  it('dado un repositorio de prestaciones vacio cuando se guarda p-1 y se busca por id entonces devuelve los mismos datos', () => {
    const repo = new PrestacionRepositoryEnMemoria();
    repo.guardar(PRESTACION);
    expect(repo.buscarPorId('p-1')).toEqual(PRESTACION);
  });

  it('dado un repositorio de profesionales vacio cuando se guarda prof-1 y se busca por id entonces devuelve los mismos datos', () => {
    const repo = new ProfesionalRepositoryEnMemoria();
    repo.guardar(PROFESIONAL);
    expect(repo.buscarPorId('prof-1')).toEqual(PROFESIONAL);
  });

  it('dado un repositorio de bloqueos vacio cuando se guarda b-1 y se busca por id entonces devuelve los mismos datos', () => {
    const repo = new BloqueoRepositoryEnMemoria();
    repo.guardar(BLOQUEO);
    expect(repo.buscarPorId('b-1')).toEqual(BLOQUEO);
  });
});

describe('repos de configuracion - guardar como upsert', () => {
  it('dado p-1 guardada con duracion 30 cuando se guarda p-1 con duracion 45 entonces hay una sola y con 45', () => {
    const repo = new PrestacionRepositoryEnMemoria([PRESTACION]);
    repo.guardar({ ...PRESTACION, duracionMin: 45 });
    expect(repo.listar()).toHaveLength(1);
    expect(repo.buscarPorId('p-1')?.duracionMin).toBe(45);
  });
});

describe('repos de configuracion - actualizar', () => {
  it('dado prof-1 guardado con una franja cuando se actualiza con otra disponibilidad entonces se lee la nueva', () => {
    const repo = new ProfesionalRepositoryEnMemoria([PROFESIONAL]);
    const r = repo.actualizar({
      ...PROFESIONAL,
      disponibilidad: [{ diaSemana: 2, desde: '14:00', hasta: '18:00' }],
    });
    expect(r.ok).toBe(true);
    expect(repo.buscarPorId('prof-1')?.disponibilidad).toEqual([
      { diaSemana: 2, desde: '14:00', hasta: '18:00' },
    ]);
  });

  it('dado un repositorio de prestaciones vacio cuando se intenta actualizar p-inexistente entonces falla con regla y no la crea', () => {
    const repo = new PrestacionRepositoryEnMemoria();
    const r = repo.actualizar({ ...PRESTACION, id: 'p-inexistente' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('PRESTACION_INEXISTENTE');
    expect(repo.buscarPorId('p-inexistente')).toBeUndefined();
  });
});

describe('repos de configuracion - eliminar', () => {
  it('dado b-1 guardado cuando se elimina entonces no se obtiene por id ni aparece en listar ni en listarEn', () => {
    const repo = new BloqueoRepositoryEnMemoria([BLOQUEO]);
    const rango = {
      inicio: new Date('2026-12-08T09:00:00-03:00'),
      fin: new Date('2026-12-08T10:00:00-03:00'),
    };
    expect(repo.listarEn(rango)).toHaveLength(1);
    expect(repo.eliminar('b-1').ok).toBe(true);
    expect(repo.buscarPorId('b-1')).toBeUndefined();
    expect(repo.listar()).toEqual([]);
    expect(repo.listarEn(rango)).toEqual([]);
  });
});

describe('repos de configuracion - copias defensivas', () => {
  it('dado s-1 guardado cuando se muta el objeto devuelto entonces una nueva busqueda conserva los datos originales', () => {
    const repo = new SillonRepositoryEnMemoria([SILLON]);
    const copia = repo.buscarPorId('s-1');
    if (copia === undefined) throw new Error('fixture invalida');
    (copia as { nombre: string }).nombre = 'Mutado';
    expect(repo.buscarPorId('s-1')?.nombre).toBe('Sillon 1');
  });

  it('dado s-1 guardado cuando se muta el arreglo devuelto por listar entonces el estado almacenado no cambia', () => {
    const repo = new SillonRepositoryEnMemoria([SILLON]);
    const lista = repo.listar();
    const primero = lista[0];
    if (primero === undefined) throw new Error('fixture invalida');
    (primero as { nombre: string }).nombre = 'Mutado';
    expect(repo.listar()[0]?.nombre).toBe('Sillon 1');
  });
});

describe('repos de configuracion - triangulacion', () => {
  it('dado un repositorio de sillones vacio cuando se elimina s-inexistente entonces falla con SILLON_INEXISTENTE y no cambia el listado', () => {
    const repo = new SillonRepositoryEnMemoria();
    const r = repo.eliminar('s-inexistente');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('SILLON_INEXISTENTE');
    expect(repo.listar()).toEqual([]);
  });

  it('dado un repositorio de sillones vacio cuando se actualiza s-inexistente entonces falla y no lo crea', () => {
    const repo = new SillonRepositoryEnMemoria();
    const r = repo.actualizar({ ...SILLON, id: 's-inexistente' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('SILLON_INEXISTENTE');
    expect(repo.buscarPorId('s-inexistente')).toBeUndefined();
  });

  it('dado un repo de bloqueos vacio cuando se guarda b-1 y luego se consulta su rango entonces aparece, y al eliminarlo deja de aparecer', () => {
    const repo = new BloqueoRepositoryEnMemoria();
    const rango = {
      inicio: new Date('2026-12-08T09:00:00-03:00'),
      fin: new Date('2026-12-08T10:00:00-03:00'),
    };
    repo.guardar(BLOQUEO);
    expect(repo.listarEn(rango).map((b) => b.id)).toEqual(['b-1']);
    repo.eliminar('b-1');
    expect(repo.listarEn(rango)).toEqual([]);
  });

  it('dado tres sillones guardados en orden cuando se hace upsert del segundo entonces listar conserva el orden de insercion', () => {
    const repo = new SillonRepositoryEnMemoria([SILLON, { ...SILLON, id: 's-2' }, { ...SILLON, id: 's-3' }]);
    repo.guardar({ ...SILLON, id: 's-2', nombre: 'Sillon 2 actualizado' });
    expect(repo.listar().map((s) => s.id)).toEqual(['s-1', 's-2', 's-3']);
    expect(repo.buscarPorId('s-2')?.nombre).toBe('Sillon 2 actualizado');
  });
});
