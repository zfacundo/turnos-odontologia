import { describe, expect, it } from 'vitest';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { crearTurno } from '../../../src/application/agenda/crearTurno';
import type { OrigenTurno, Turno } from '../../../src/domain/agenda/turno';
import type { Usuario } from '../../../src/domain/shared/rol';
import type { Deps } from '../../../src/api/deps';
import { consultarMensajesSimulados } from '../../../src/simulators/whatsapp/bandejaSimulada';
import {
  mensajeConfirmacionTurno,
  registrarConfirmacionTurno,
} from '../../../src/simulators/whatsapp/confirmacionTurno';

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

function crear(deps: Deps, origen: OrigenTurno = 'recepcion', pacienteId = 'pac-01'): Turno {
  const resultado = crearTurno(deps, usuarioPorId(deps, 'u-recepcion'), {
    pacienteId,
    prestacionId: 'prest-control',
    profesionalId: 'prof-1',
    sillonId: 'sillon-1',
    inicio: new Date('2026-12-01T13:00:00Z'),
    origen,
  });
  if (!resultado.ok) throw new Error('No se pudo crear el turno de prueba');
  return resultado.valor;
}

describe('mensajeConfirmacionTurno', () => {
  it('dado un turno con inicio 2026-12-01T13:00:00Z, cuando se arma la confirmacion, entonces el texto es exacto con hora de Buenos Aires', () => {
    const texto = mensajeConfirmacionTurno({
      paciente: 'Paciente Ficticio Uno',
      profesional: 'Dra. Ficticia Perez',
      prestacion: 'Control y limpieza',
      inicio: new Date('2026-12-01T13:00:00Z'),
    });

    expect(normalizar(texto)).toBe(
      'Hola, Paciente Ficticio Uno. Tu turno del 1/12/26, 10:00 a. m. con Dra. Ficticia Perez para Control y limpieza fue agendado correctamente. ¡Te esperamos!'
    );
  });

  it('dado cualquier turno, cuando se arma la confirmacion, entonces empieza con el saludo y termina con el signo de apertura correcto', () => {
    const texto = mensajeConfirmacionTurno({
      paciente: 'Paciente Ficticio Dos',
      profesional: 'Dr. Ficticio Gomez',
      prestacion: 'Ortodoncia',
      inicio: new Date('2026-12-15T17:30:00Z'),
    });

    expect(texto.startsWith('Hola, Paciente Ficticio Dos.')).toBe(true);
    expect(texto.endsWith('¡Te esperamos!')).toBe(true);
    expect(texto).not.toContain('?Te esperamos!');
  });

  it('dado un inicio a las 01:00Z, cuando se arma la confirmacion, entonces la fecha es la del dia anterior en Buenos Aires', () => {
    const texto = mensajeConfirmacionTurno({
      paciente: 'Paciente Ficticio Tres',
      profesional: 'Dra. Ficticia Perez',
      prestacion: 'Urgencia',
      inicio: new Date('2026-12-02T01:00:00Z'),
    });

    expect(normalizar(texto)).toContain('Tu turno del 1/12/26, 10:00 p. m. con');
  });
});

describe('registrarConfirmacionTurno', () => {
  it('dado un turno de origen recepcion creado por recepcion, cuando se registra la confirmacion, entonces queda el texto exacto en el telefono del paciente', () => {
    const deps = nuevasDeps();
    const turno = crear(deps);

    const registrada = registrarConfirmacionTurno(
      deps,
      turno,
      usuarioPorId(deps, 'u-recepcion')
    );

    expect(registrada).toBe(true);
    const mensajes = consultarMensajesSimulados(deps, TELEFONO);
    expect(mensajes).toHaveLength(1);
    expect(normalizar(mensajes[0]?.texto ?? '')).toBe(
      'Hola, Paciente Ficticio Uno. Tu turno del 1/12/26, 10:00 a. m. con Dra. Ficticia Perez para Control y limpieza fue agendado correctamente. ¡Te esperamos!'
    );
  });

  it('dado un turno de origen recepcion creado por administracion, cuando se registra la confirmacion, entonces queda registrada', () => {
    const deps = nuevasDeps();
    const turno = crear(deps);

    const registrada = registrarConfirmacionTurno(deps, turno, usuarioPorId(deps, 'u-admin'));

    expect(registrada).toBe(true);
    expect(consultarMensajesSimulados(deps, TELEFONO)).toHaveLength(1);
  });

  it('dado un turno de origen whatsapp, cuando se registra la confirmacion, entonces no se registra nada', () => {
    const deps = nuevasDeps();
    const turno = crear(deps, 'whatsapp');

    const registrada = registrarConfirmacionTurno(
      deps,
      turno,
      usuarioPorId(deps, 'u-recepcion')
    );

    expect(registrada).toBe(false);
    expect(consultarMensajesSimulados(deps, TELEFONO)).toEqual([]);
  });

  it('dado un usuario con rol paciente, cuando se registra la confirmacion, entonces no se registra nada', () => {
    const deps = nuevasDeps();
    const turno = crear(deps);
    const paciente: Usuario = { id: 'u-paciente-ficticio', nombre: 'Paciente Ficticio', rol: 'paciente' };

    const registrada = registrarConfirmacionTurno(deps, turno, paciente);

    expect(registrada).toBe(false);
    expect(consultarMensajesSimulados(deps, TELEFONO)).toEqual([]);
  });

  it('dado un paciente sin telefono, cuando se registra la confirmacion, entonces no se registra nada', () => {
    const deps = nuevasDeps();
    const guardado = deps.pacientes.guardar({
      id: 'pac-sin-telefono',
      nombre: 'Paciente Ficticio Sin Telefono',
      dni: '99999990',
      telefono: '',
    });
    expect(guardado.ok).toBe(true);
    const turno = crear(deps, 'recepcion', 'pac-sin-telefono');

    const registrada = registrarConfirmacionTurno(
      deps,
      turno,
      usuarioPorId(deps, 'u-recepcion')
    );

    expect(registrada).toBe(false);
    expect(consultarMensajesSimulados(deps, '')).toEqual([]);
    expect(consultarMensajesSimulados(deps, TELEFONO)).toEqual([]);
  });

  it('dado un turno con profesional y prestacion inexistentes, cuando se registra la confirmacion, entonces el texto usa los identificadores', () => {
    const deps = nuevasDeps();
    const turno: Turno = {
      ...crear(deps),
      profesionalId: 'prof-inexistente',
      prestacionId: 'prest-inexistente',
    };

    registrarConfirmacionTurno(deps, turno, usuarioPorId(deps, 'u-recepcion'));

    const texto = consultarMensajesSimulados(deps, TELEFONO)[0]?.texto ?? '';
    expect(texto).toContain('con prof-inexistente para prest-inexistente fue agendado');
  });

  it('dado que el registro falla, cuando se registra la confirmacion, entonces no propaga la excepcion y devuelve false', () => {
    const deps = nuevasDeps();
    const turno = crear(deps);
    const registrarQueFalla = (): void => {
      throw new Error('Falla simulada de la bandeja');
    };

    const registrada = registrarConfirmacionTurno(
      deps,
      turno,
      usuarioPorId(deps, 'u-recepcion'),
      registrarQueFalla
    );

    expect(registrada).toBe(false);
  });
});
