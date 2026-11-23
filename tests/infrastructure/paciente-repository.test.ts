import { describe, it, expect } from 'vitest';
import { PacienteRepositoryEnMemoria } from '../../src/infrastructure/memory/paciente-repository';
import type { Paciente } from '../../src/domain/pacientes/paciente';

const pac = (id: string, dni: string, nombre = 'Paciente Ficticio'): Paciente => ({
  id,
  nombre,
  dni,
  telefono: '+54 9 11 0000-0001',
});

describe('PacienteRepositoryEnMemoria (DNI unico)', () => {
  it('dado un repo vacio cuando se guarda un paciente entonces se obtiene ok y se lo lista', () => {
    const repo = new PacienteRepositoryEnMemoria();
    expect(repo.guardar(pac('pac-01', '99000001')).ok).toBe(true);
    expect(repo.listar()).toHaveLength(1);
  });

  it('dado un paciente con DNI 99000001 cuando se guarda otro con el mismo DNI entonces falla con DNI_DUPLICADO y el existente no cambia', () => {
    const repo = new PacienteRepositoryEnMemoria([pac('pac-01', '99000001', 'Original')]);
    const r = repo.guardar(pac('pac-02', '99000001', 'Intruso'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('DNI_DUPLICADO');
    expect(repo.listar()).toHaveLength(1);
    expect(repo.buscarPorDni('99000001')?.nombre).toBe('Original');
  });

  it('dado dos DNI distintos cuando se guardan ambos entonces los dos quedan registrados', () => {
    const repo = new PacienteRepositoryEnMemoria();
    repo.guardar(pac('pac-01', '99000001'));
    expect(repo.guardar(pac('pac-02', '99000002')).ok).toBe(true);
    expect(repo.listar()).toHaveLength(2);
  });

  it('dado un paciente con DNI 99000002 cuando se busca por DNI entonces se obtiene; con 99000099 no se obtiene ninguno', () => {
    const repo = new PacienteRepositoryEnMemoria([pac('pac-02', '99000002')]);
    expect(repo.buscarPorDni('99000002')?.id).toBe('pac-02');
    expect(repo.buscarPorDni('99000099')).toBeUndefined();
  });

  it('dado un paciente guardado cuando se busca por id entonces se obtiene; un id inexistente no', () => {
    const repo = new PacienteRepositoryEnMemoria([pac('pac-02', '99000002')]);
    expect(repo.buscarPorId('pac-02')?.dni).toBe('99000002');
    expect(repo.buscarPorId('nada')).toBeUndefined();
  });
});
