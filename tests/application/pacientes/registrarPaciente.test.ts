import { describe, expect, it } from 'vitest';
import { registrarPaciente } from '../../../src/application/pacientes/registrarPaciente';
import type { Paciente } from '../../../src/domain/pacientes/paciente';
import { PacienteRepositoryEnMemoria } from '../../../src/infrastructure/memory/paciente-repository';

const BASE = {
  nombre: 'Paciente Ficticio Uno',
  dni: '99000011',
  telefono: '+54 9 11 0000-0011',
} as const;

const pacienteInicial: Paciente = {
  id: 'pac-01',
  nombre: 'Paciente Ficticio Original',
  dni: '99000001',
  telefono: '+54 9 11 0000-0001',
};

describe('registrarPaciente', () => {
  it('dado datos ficticios validos cuando se registra un paciente entonces devuelve ok con id y campos guardados', () => {
    const pacientes = new PacienteRepositoryEnMemoria();
    const resultado = registrarPaciente(pacientes, {
      ...BASE,
      email: 'ficticio11@ejemplo.invalid',
      obraSocialId: 'OS-01',
      nroAfiliado: 'AF-9999',
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(typeof resultado.valor.id).toBe('string');
    expect(resultado.valor).toMatchObject({
      ...BASE,
      email: 'ficticio11@ejemplo.invalid',
      obraSocialId: 'OS-01',
      nroAfiliado: 'AF-9999',
    });
    expect(pacientes.listar()).toHaveLength(1);
  });

  it('dado un DNI no ficticio cuando se registra un paciente entonces devuelve error de entrada', () => {
    const resultado = registrarPaciente(new PacienteRepositoryEnMemoria(), { ...BASE, dni: '12345678' });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.tipo).toBe('entrada');
  });

  it('dado un telefono no ficticio cuando se registra un paciente entonces devuelve error de entrada', () => {
    const resultado = registrarPaciente(new PacienteRepositoryEnMemoria(), {
      ...BASE,
      telefono: '1133333333',
    });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.tipo).toBe('entrada');
  });

  it('dado un email real cuando se registra un paciente entonces devuelve error de entrada', () => {
    const resultado = registrarPaciente(new PacienteRepositoryEnMemoria(), {
      ...BASE,
      email: 'paciente@gmail.com',
    });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.tipo).toBe('entrada');
  });

  it('dado un email vacio o con espacios cuando se registra un paciente entonces devuelve error de entrada', () => {
    const vacio = registrarPaciente(new PacienteRepositoryEnMemoria(), { ...BASE, email: '' });
    const espacios = registrarPaciente(new PacienteRepositoryEnMemoria(), { ...BASE, email: '   ' });
    expect(vacio.ok).toBe(false);
    expect(espacios.ok).toBe(false);
    if (!vacio.ok) expect(vacio.error.tipo).toBe('entrada');
    if (!espacios.ok) expect(espacios.error.tipo).toBe('entrada');
  });

  it('dado un obraSocialId con formato no ficticio cuando se registra un paciente entonces devuelve error de entrada', () => {
    const resultado = registrarPaciente(new PacienteRepositoryEnMemoria(), {
      ...BASE,
      obraSocialId: 'obra-social-real-1',
    });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.tipo).toBe('entrada');
  });

  it('dado un nroAfiliado con formato no ficticio cuando se registra un paciente entonces devuelve error de entrada', () => {
    const resultado = registrarPaciente(new PacienteRepositoryEnMemoria(), {
      ...BASE,
      nroAfiliado: 'AF-12',
    });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.tipo).toBe('entrada');
  });

  it.each(['', '   '])(
    'dado un nombre vacio o con espacios (%j) cuando se registra un paciente entonces devuelve error de entrada',
    (nombre) => {
      const resultado = registrarPaciente(new PacienteRepositoryEnMemoria(), { ...BASE, nombre });
      expect(resultado.ok).toBe(false);
      if (!resultado.ok) expect(resultado.error.tipo).toBe('entrada');
    },
  );

  it.each(['', '   '])(
    'dado un DNI vacio o con espacios (%j) cuando se registra un paciente entonces devuelve error de entrada',
    (dni) => {
      const resultado = registrarPaciente(new PacienteRepositoryEnMemoria(), { ...BASE, dni });
      expect(resultado.ok).toBe(false);
      if (!resultado.ok) expect(resultado.error.tipo).toBe('entrada');
    },
  );

  it('dado un objeto JSON vacio cuando se registra un paciente entonces devuelve error de entrada', () => {
    const resultado = registrarPaciente(new PacienteRepositoryEnMemoria(), {});
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.tipo).toBe('entrada');
  });

  it('dado un DNI ya registrado cuando se registra otro paciente entonces devuelve DNI_DUPLICADO con dimension paciente', () => {
    const pacientes = new PacienteRepositoryEnMemoria([pacienteInicial]);
    const resultado = registrarPaciente(pacientes, {
      ...BASE,
      dni: pacienteInicial.dni,
      nombre: 'Paciente Ficticio Duplicado',
    });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.tipo).toBe('regla');
      if (resultado.error.tipo === 'regla') {
        expect(resultado.error.error.regla).toBe('DNI_DUPLICADO');
        expect(resultado.error.error.dimension).toBe('paciente');
      }
    }
    expect(pacientes.listar()).toHaveLength(1);
    expect(pacientes.buscarPorId('pac-01')?.nombre).toBe('Paciente Ficticio Original');
  });
});
