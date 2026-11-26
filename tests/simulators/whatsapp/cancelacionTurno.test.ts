import { describe, expect, it } from 'vitest';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { crearTurno } from '../../../src/application/agenda/crearTurno';
import { cancelarTurno } from '../../../src/application/agenda/cancelarTurno';
import type { Turno } from '../../../src/domain/agenda/turno';
import type { Usuario } from '../../../src/domain/shared/rol';
import type { Deps } from '../../../src/api/deps';
import { consultarMensajesSimulados } from '../../../src/simulators/whatsapp/bandejaSimulada';
import {
  mensajeCancelacionTurno,
  registrarAvisoCancelacionTurno,
} from '../../../src/simulators/whatsapp/cancelacionTurno';

const TELEFONO = '+54 9 11 0000-0001';

function normalizar(texto: string): string {
  return texto.replace(/\s/g, ' ');
}

function nuevasDeps(): Deps {
  return cargarSeed(new RelojFijo(new Date('2026-11-30T09:00:00-03:00')));
}

function usuarioPorId(deps: Deps, id: string): Usuario {
  const usuario = deps.usuarios.find((u) => u.id === id);
  if (!usuario) throw new Error(`Usuario de seed inexistente: ${id}`);
  return usuario;
}

/** Crea y cancela un turno real; devuelve el turno ya cancelado. */
function crearYCancelar(deps: Deps, pacienteId = 'pac-01'): Turno {
  const recepcion = usuarioPorId(deps, 'u-recepcion');
  const creado = crearTurno(deps, recepcion, {
    pacienteId,
    prestacionId: 'prest-control',
    profesionalId: 'prof-1',
    sillonId: 'sillon-1',
    inicio: new Date('2026-12-01T13:00:00Z'),
  });
  if (!creado.ok) throw new Error('No se pudo crear el turno de prueba');
  const cancelado = cancelarTurno(deps, recepcion, {
    turnoId: creado.valor.id,
    motivo: 'El paciente no puede asistir',
  });
  if (!cancelado.ok) throw new Error('No se pudo cancelar el turno de prueba');
  return cancelado.valor.turno;
}

describe('mensajeCancelacionTurno', () => {
  it('dado un turno con inicio 2026-12-01T13:00:00Z, cuando se arma el aviso de cancelacion, entonces el texto es exacto con hora de Buenos Aires', () => {
    const texto = mensajeCancelacionTurno({
      paciente: 'Paciente Ficticio Uno',
      profesional: 'Dra. Ficticia Perez',
      inicio: new Date('2026-12-01T13:00:00Z'),
    });

    expect(normalizar(texto)).toBe(
      'Hola, Paciente Ficticio Uno. Te informamos que tu turno del 1/12/26, 10:00 a. m. con Dra. Ficticia Perez fue cancelado. Para solicitar otro turno, comunicate con recepción.'
    );
  });

  it('dado cualquier turno, cuando se arma el aviso de cancelacion, entonces empieza con el saludo y termina con recepción bien escrita', () => {
    const texto = mensajeCancelacionTurno({
      paciente: 'Paciente Ficticio Dos',
      profesional: 'Dr. Ficticio Gomez',
      inicio: new Date('2026-12-15T17:30:00Z'),
    });

    expect(texto.startsWith('Hola, Paciente Ficticio Dos.')).toBe(true);
    expect(texto.endsWith('comunicate con recepción.')).toBe(true);
    expect(texto).not.toContain('recepci?n');
  });

  it('dado un inicio a las 01:00Z, cuando se arma el aviso de cancelacion, entonces la fecha es la del dia anterior en Buenos Aires', () => {
    const texto = mensajeCancelacionTurno({
      paciente: 'Paciente Ficticio Tres',
      profesional: 'Dra. Ficticia Perez',
      inicio: new Date('2026-12-02T01:00:00Z'),
    });

    expect(normalizar(texto)).toContain('tu turno del 1/12/26, 10:00 p. m. con');
  });
});

describe('registrarAvisoCancelacionTurno', () => {
  it('dado un turno cancelado de pac-01, cuando se registra el aviso, entonces queda el texto exacto en su telefono y devuelve true', () => {
    const deps = nuevasDeps();
    const turno = crearYCancelar(deps);

    const registrado = registrarAvisoCancelacionTurno(deps, turno);

    expect(registrado).toBe(true);
    const mensajes = consultarMensajesSimulados(deps, TELEFONO);
    expect(mensajes).toHaveLength(1);
    expect(normalizar(mensajes[0]?.texto ?? '')).toBe(
      'Hola, Paciente Ficticio Uno. Te informamos que tu turno del 1/12/26, 10:00 a. m. con Dra. Ficticia Perez fue cancelado. Para solicitar otro turno, comunicate con recepción.'
    );
  });

  it('dado un turno con profesional inexistente, cuando se registra el aviso, entonces el texto usa el identificador', () => {
    const deps = nuevasDeps();
    const turno: Turno = { ...crearYCancelar(deps), profesionalId: 'prof-inexistente' };

    registrarAvisoCancelacionTurno(deps, turno);

    const texto = consultarMensajesSimulados(deps, TELEFONO)[0]?.texto ?? '';
    expect(texto).toContain('con prof-inexistente fue cancelado');
  });

  it('dado un paciente sin telefono, cuando se registra el aviso, entonces devuelve false y no registra nada', () => {
    const deps = nuevasDeps();
    const guardado = deps.pacientes.guardar({
      id: 'pac-sin-telefono',
      nombre: 'Paciente Ficticio Sin Telefono',
      dni: '99999990',
      telefono: '',
    });
    expect(guardado.ok).toBe(true);
    const turno = crearYCancelar(deps, 'pac-sin-telefono');

    const registrado = registrarAvisoCancelacionTurno(deps, turno);

    expect(registrado).toBe(false);
    expect(consultarMensajesSimulados(deps, '')).toEqual([]);
    expect(consultarMensajesSimulados(deps, TELEFONO)).toEqual([]);
  });

  it('dado que el registro falla, cuando se registra el aviso, entonces no propaga, devuelve false y el turno sigue cancelado', () => {
    const deps = nuevasDeps();
    const turno = crearYCancelar(deps);
    const registrarQueFalla = (): void => {
      throw new Error('Falla simulada de la bandeja');
    };

    const registrado = registrarAvisoCancelacionTurno(deps, turno, registrarQueFalla);

    expect(registrado).toBe(false);
    expect(deps.turnos.buscarPorId(turno.id)?.estado).toBe('cancelado');
  });
});
