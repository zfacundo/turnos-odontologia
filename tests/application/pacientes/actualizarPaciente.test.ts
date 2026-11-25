import { describe, expect, it } from 'vitest';
import { actualizarPaciente } from '../../../src/application/pacientes/actualizarPaciente';
import { pacientePublico } from '../../../src/application/pacientes/pacientePublico';
import type { Paciente } from '../../../src/domain/pacientes/paciente';
import { PacienteRepositoryEnMemoria } from '../../../src/infrastructure/memory/paciente-repository';

const pac01: Paciente = {
  id: 'pac-01',
  nombre: 'Paciente Ficticio Original',
  dni: '99000001',
  telefono: '+54 9 11 0000-0001',
};

const pac11: Paciente = {
  id: 'pac-11',
  nombre: 'Paciente Ficticio Once',
  dni: '99000011',
  telefono: '+54 9 11 0000-0011',
};

const cuerpoPropio = {
  nombre: 'Paciente Ficticio Once Actualizado',
  dni: '99000011',
  telefono: '+54 9 11 0000-0011',
};

const repo = () => new PacienteRepositoryEnMemoria([pac01, pac11]);

describe('actualizarPaciente', () => {
  it('dado un paciente con DNI propio cuando se actualiza dos veces con el mismo cuerpo entonces ambas devuelven ok y queda una sola ficha enmascarada', () => {
    const pacientes = repo();
    const primero = actualizarPaciente(pacientes, 'pac-11', cuerpoPropio);
    const segundo = actualizarPaciente(pacientes, 'pac-11', cuerpoPropio);
    expect(primero.ok).toBe(true);
    expect(segundo.ok).toBe(true);
    if (!primero.ok || !segundo.ok) return;
    expect(pacientePublico(primero.valor)).toEqual(pacientePublico(segundo.valor));
    expect(pacientes.listar()).toHaveLength(2);
    expect(pacientes.buscarPorId('pac-11')).toEqual({
      id: 'pac-11',
      nombre: cuerpoPropio.nombre,
      dni: '99000011',
      telefono: '+54 9 11 0000-0011',
    });
  });

  it('dado otro paciente con DNI 99000001 cuando se asigna ese DNI a pac-11 entonces devuelve DNI_DUPLICADO y pac-01 no cambia', () => {
    const pacientes = repo();
    const resultado = actualizarPaciente(pacientes, 'pac-11', {
      ...cuerpoPropio,
      dni: '99000001',
    });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.tipo).toBe('regla');
      if (resultado.error.tipo === 'regla') {
        expect(resultado.error.error.regla).toBe('DNI_DUPLICADO');
        expect(resultado.error.error.dimension).toBe('paciente');
      }
    }
    expect(pacientes.buscarPorId('pac-01')).toEqual(pac01);
    expect(pacientes.buscarPorId('pac-11')).toEqual(pac11);
  });

  it('dado un id inexistente cuando se actualiza con datos validos entonces devuelve no-encontrado con el mensaje exacto', () => {
    const resultado = actualizarPaciente(repo(), 'no-existe', cuerpoPropio);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toEqual({ tipo: 'no-encontrado', mensaje: 'paciente no encontrado' });
    }
  });

  it('dado un nombre con solo espacios cuando se actualiza pac-11 entonces devuelve entrada y la ficha no se modifica', () => {
    const pacientes = repo();
    const resultado = actualizarPaciente(pacientes, 'pac-11', { ...cuerpoPropio, nombre: '   ' });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.tipo).toBe('entrada');
    expect(pacientes.buscarPorId('pac-11')).toEqual(pac11);
  });
});
