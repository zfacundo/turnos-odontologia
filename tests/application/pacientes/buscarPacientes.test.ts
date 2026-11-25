import { describe, expect, it } from 'vitest';
import { buscarPaciente, listarPacientes } from '../../../src/application/pacientes/buscarPacientes';
import type { Paciente } from '../../../src/domain/pacientes/paciente';
import { PacienteRepositoryEnMemoria } from '../../../src/infrastructure/memory/paciente-repository';

const pacientesSeed: Paciente[] = [
  {
    id: 'pac-01',
    nombre: 'Paciente Ficticio Uno',
    dni: '99000001',
    telefono: '+54 9 11 0000-0001',
  },
  {
    id: 'pac-02',
    nombre: 'Paciente Ficticio Dos',
    dni: '99000002',
    telefono: '+54 9 11 0000-0002',
  },
];

const repo = () => new PacienteRepositoryEnMemoria(pacientesSeed);

describe('buscarPacientes', () => {
  it('dado dos pacientes guardados cuando se listan entonces devuelve ambos con sus datos completos', () => {
    expect(listarPacientes(repo())).toEqual(pacientesSeed);
  });

  it('dado el paciente pac-02 cuando se busca por id entonces devuelve ok con esa ficha', () => {
    const resultado = buscarPaciente(repo(), 'pac-02');
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.valor).toEqual(pacientesSeed[1]);
  });

  it('dado un id inexistente cuando se busca por id entonces devuelve no-encontrado con el mensaje exacto', () => {
    const resultado = buscarPaciente(repo(), 'no-existe');
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toEqual({ tipo: 'no-encontrado', mensaje: 'paciente no encontrado' });
    }
  });
});
