import { describe, expect, it } from 'vitest';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import type { Deps } from '../../../src/api/deps';
import { ErrorDeEntrada } from '../../../src/api/middleware/errores';
import {
  contactoPublico,
  resolverTelefono,
} from '../../../src/simulators/whatsapp/contactoSimulado';

function nuevasDeps(): Deps {
  return cargarSeed(new RelojFijo(new Date('2026-11-30T09:00:00-03:00')));
}

function pacienteDe(deps: Deps, id: string) {
  const p = deps.pacientes.buscarPorId(id);
  if (!p) throw new Error(`Paciente de seed inexistente: ${id}`);
  return p;
}

describe('contactoPublico', () => {
  it('dado pac-01 del seed, cuando se arma el contacto publico, entonces trae id, nombre y telefono enmascarado sin la propiedad telefono', () => {
    const contacto = contactoPublico(pacienteDe(nuevasDeps(), 'pac-01'));

    expect(contacto).toEqual({
      id: 'pac-01',
      nombre: 'Paciente Ficticio Uno',
      telefonoEnmascarado: '+54 9 11 0000-**01',
    });
    expect(contacto).not.toHaveProperty('telefono');
  });

  it('dado pac-02 del seed, cuando se arma el contacto publico, entonces el enmascarado termina con los ultimos dos digitos de su telefono', () => {
    const contacto = contactoPublico(pacienteDe(nuevasDeps(), 'pac-02'));

    expect(contacto.id).toBe('pac-02');
    expect(contacto.telefonoEnmascarado).toBe('+54 9 11 0000-**02');
  });
});

describe('resolverTelefono', () => {
  it('dado pacienteId pac-01, cuando se resuelve el telefono, entonces devuelve el telefono completo del paciente', () => {
    expect(resolverTelefono(nuevasDeps(), { pacienteId: 'pac-01' })).toBe('+54 9 11 0000-0001');
  });

  it('dado pacienteId pac-02, cuando se resuelve el telefono, entonces devuelve el telefono de ese otro paciente', () => {
    expect(resolverTelefono(nuevasDeps(), { pacienteId: 'pac-02' })).toBe('+54 9 11 0000-0002');
  });

  it('dado un telefono ficticio valido, cuando se resuelve, entonces devuelve ese mismo telefono aunque no sea de ningun paciente', () => {
    expect(resolverTelefono(nuevasDeps(), { telefono: '+54 9 11 0000-0099' })).toBe(
      '+54 9 11 0000-0099'
    );
  });

  it('dado telefono y pacienteId a la vez, cuando se resuelve, entonces lanza ErrorDeEntrada', () => {
    expect(() =>
      resolverTelefono(nuevasDeps(), { telefono: '+54 9 11 0000-0001', pacienteId: 'pac-01' })
    ).toThrow(ErrorDeEntrada);
  });

  it('dado ni telefono ni pacienteId, cuando se resuelve, entonces lanza ErrorDeEntrada', () => {
    expect(() => resolverTelefono(nuevasDeps(), {})).toThrow(ErrorDeEntrada);
  });

  it('dado un pacienteId inexistente, cuando se resuelve, entonces lanza ErrorDeEntrada', () => {
    expect(() => resolverTelefono(nuevasDeps(), { pacienteId: 'pac-inexistente' })).toThrow(
      ErrorDeEntrada
    );
  });

  it('dado un paciente con telefono vacio, cuando se resuelve por pacienteId, entonces lanza ErrorDeEntrada', () => {
    const deps = nuevasDeps();
    const guardado = deps.pacientes.guardar({
      id: 'pac-sin-telefono',
      nombre: 'Paciente Ficticio Sin Telefono',
      dni: '99999990',
      telefono: '',
    });
    expect(guardado.ok).toBe(true);

    expect(() => resolverTelefono(deps, { pacienteId: 'pac-sin-telefono' })).toThrow(
      ErrorDeEntrada
    );
  });

  it('dado un telefono con formato real, cuando se resuelve, entonces lanza ErrorDeEntrada', () => {
    expect(() => resolverTelefono(nuevasDeps(), { telefono: '+54 9 11 4321-0000' })).toThrow(
      ErrorDeEntrada
    );
  });

  it('dado un pacienteId que no es texto, cuando se resuelve, entonces lanza ErrorDeEntrada', () => {
    expect(() => resolverTelefono(nuevasDeps(), { pacienteId: 42 })).toThrow(ErrorDeEntrada);
  });
});
