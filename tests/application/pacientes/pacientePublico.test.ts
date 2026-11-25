import { describe, expect, it } from 'vitest';
import { pacientePublico } from '../../../src/application/pacientes/pacientePublico';
import type { Paciente } from '../../../src/domain/pacientes/paciente';

const paciente: Paciente = {
  id: 'pac-01',
  nombre: 'Paciente Ficticio Uno',
  dni: '99000001',
  telefono: '+54 9 11 0000-0001',
  email: 'ficticio01@ejemplo.invalid',
  obraSocialId: 'OS-01',
  nroAfiliado: 'AF-0001',
};

describe('pacientePublico', () => {
  it('dado un paciente con datos completos cuando se convierte a publico entonces enmascara dni y telefono y conserva el resto', () => {
    const publico = pacientePublico(paciente);
    expect(publico).toEqual({
      id: 'pac-01',
      nombre: 'Paciente Ficticio Uno',
      dni: '99****01',
      telefono: '+54 9 11 0000-**01',
      email: 'ficticio01@ejemplo.invalid',
      obraSocialId: 'OS-01',
      nroAfiliado: 'AF-0001',
    });
  });

  it('dado un paciente sin campos opcionales cuando se convierte a publico entonces no agrega campos ausentes', () => {
    const publico = pacientePublico({
      id: 'pac-02',
      nombre: 'Paciente Ficticio Dos',
      dni: '99000002',
      telefono: '+54 9 11 0000-0002',
    });
    expect(publico).toEqual({
      id: 'pac-02',
      nombre: 'Paciente Ficticio Dos',
      dni: '99****02',
      telefono: '+54 9 11 0000-**02',
    });
  });

  it('dado un paciente cuando se convierte a publico entonces el original no se modifica', () => {
    pacientePublico(paciente);
    expect(paciente.dni).toBe('99000001');
    expect(paciente.telefono).toBe('+54 9 11 0000-0001');
  });
});
