import { describe, it, expect } from 'vitest';
import { procesar, type DepsBot } from '../../../src/simulators/whatsapp/bot';
import { nuevaSesion, type Entrada, type Respuesta, type Sesion } from '../../../src/simulators/whatsapp/conversacion';
import { consultarHuecos } from '../../../src/application/agenda/consultarHuecos';
import { crearTurno } from '../../../src/application/agenda/crearTurno';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { ProfesionalRepositoryEnMemoria } from '../../../src/infrastructure/memory/profesional-repository';
import { PROFESIONALES } from '../../../src/infrastructure/seed/datos-seed';
import type { Usuario } from '../../../src/domain/shared/rol';

const LUNES_9 = new Date('2026-11-30T09:00:00-03:00');
const TEL_UNO = '+54 9 11 0000-0001';
const TEL_NUEVO = '+54 9 11 0000-0099';
const RECEPCION: Usuario = { id: 'u-recepcion', nombre: 'Recepcionista Ficticia', rol: 'recepcion' };
const en = (hhmm: string, fecha = '2026-11-30'): Date => new Date(`${fecha}T${hhmm}:00-03:00`);

const seed = (ahora: Date = LUNES_9): DepsBot => cargarSeed(new RelojFijo(ahora));

/** Conversacion de prueba: guarda la sesion y permite elegir por etiqueta visible. */
class Chat {
  sesion: Sesion = nuevaSesion();
  ultima: Respuesta = { mensajes: [], opciones: [], pideTexto: false };
  constructor(
    private readonly deps: DepsBot,
    private readonly telefono: string,
  ) {}

  enviar(entrada: Entrada): Respuesta {
    const r = procesar(this.deps, this.telefono, this.sesion, entrada);
    this.sesion = r.sesion;
    this.ultima = r.respuesta;
    return r.respuesta;
  }
  escribir(texto: string): Respuesta {
    return this.enviar({ tipo: 'texto', texto });
  }
  elegir(etiqueta: string): Respuesta {
    const o = this.ultima.opciones.find((x) => x.etiqueta === etiqueta);
    if (o === undefined) throw new Error(`no hay opción "${etiqueta}": ${this.opciones().join(', ')}`);
    return this.enviar({ tipo: 'opcion', id: o.id });
  }
  opciones(): string[] {
    return this.ultima.opciones.map((o) => o.etiqueta);
  }
  texto(): string {
    return this.ultima.mensajes.map((m) => [m.texto, m.tarjeta?.titulo, ...(m.tarjeta?.lineas ?? [])].join('\n')).join('\n');
  }
  hastaHorarios(prestacion = 'Control y limpieza', profesional = 'Dra. Ficticia Perez'): Respuesta {
    this.escribir('Hola! Quería sacar un turno');
    this.elegir('Pedir un turno');
    this.elegir(prestacion);
    return this.elegir(profesional);
  }
}

const turnosDe = (deps: DepsBot, pacienteId: string) => deps.turnos.listarActivos({ pacienteId });

describe('bot - horarios desde la agenda real (RN-WA-01)', () => {
  it('dado el seed sin turnos cuando el paciente pide control con la Dra entonces los horarios son exactamente los 3 primeros de consultarHuecos', () => {
    const deps = seed();
    const chat = new Chat(deps, TEL_UNO);
    chat.hastaHorarios();
    const huecos = consultarHuecos(deps, RECEPCION, { prestacionId: 'prest-control', profesionalId: 'prof-1', fecha: '2026-11-30' });
    if (!huecos.ok) throw new Error('consultarHuecos fallo');
    expect(chat.opciones()).toEqual(['Lun 30/11 09:00', 'Lun 30/11 09:15', 'Lun 30/11 09:30', 'Ver más días']);
    expect(huecos.valor.slice(0, 3).map((h) => h.inicio)).toEqual([en('09:00'), en('09:15'), en('09:30')]);
  });

  it('dado un turno de prof-1 09:00-09:30 cuando el paciente pide control con la Dra entonces ofrece 09:30, 09:45 y 10:00', () => {
    const deps = seed();
    crearTurno(deps, RECEPCION, { pacienteId: 'pac-05', prestacionId: 'prest-control', profesionalId: 'prof-1', sillonId: 'sillon-1', inicio: en('09:00') });
    const chat = new Chat(deps, TEL_UNO);
    chat.hastaHorarios();
    expect(chat.opciones().slice(0, 3)).toEqual(['Lun 30/11 09:30', 'Lun 30/11 09:45', 'Lun 30/11 10:00']);
  });

  it('dado el reloj el lunes a las 19:00 cuando pide horarios entonces ofrece desde el martes 09:00', () => {
    const chat = new Chat(seed(en('19:00')), TEL_UNO);
    chat.hastaHorarios();
    expect(chat.opciones()[0]).toBe('Mar 1/12 09:00');
  });

  it('dado horarios del lunes cuando elige Ver mas dias entonces ofrece los 3 primeros del martes', () => {
    const chat = new Chat(seed(), TEL_UNO);
    chat.hastaHorarios();
    chat.elegir('Ver más días');
    expect(chat.opciones()).toEqual(['Mar 1/12 09:00', 'Mar 1/12 09:15', 'Mar 1/12 09:30', 'Ver más días']);
  });

  it('dado un profesional sin franjas cuando se piden horarios entonces informa que no hay horarios en 2 semanas', () => {
    const base = seed();
    const sinFranjas = PROFESIONALES.map((p) => (p.id === 'prof-1' ? { ...p, disponibilidad: [] } : p));
    const deps: DepsBot = { ...base, profesionales: new ProfesionalRepositoryEnMemoria(sinFranjas) };
    const chat = new Chat(deps, TEL_UNO);
    chat.hastaHorarios();
    expect(chat.texto()).toMatch(/próximas 2 semanas/);
    expect(chat.opciones()).toEqual(['Volver al menú']);
  });
});

describe('bot - reserva con los casos de uso (RN-WA-02)', () => {
  it('dado el telefono de pac-01 cuando completa la reserva entonces crea un turno reservado con origen whatsapp y muestra la tarjeta', () => {
    const deps = seed();
    const chat = new Chat(deps, TEL_UNO);
    chat.hastaHorarios();
    chat.elegir('Lun 30/11 09:00');
    const [turno] = turnosDe(deps, 'pac-01');
    expect(turno).toMatchObject({
      profesionalId: 'prof-1',
      prestacionId: 'prest-control',
      inicio: en('09:00'),
      estado: 'reservado',
      origen: 'whatsapp',
      creadoPor: `whatsapp:${TEL_UNO}`,
    });
    expect(chat.texto()).toMatch(/Turno reservado/);
    expect(chat.texto()).toMatch(/Lun 30\/11 09:00/);
    expect(chat.texto()).toMatch(/Control y limpieza · Dra\. Ficticia Perez/);
  });

  it('dado un horario ofrecido que recepcion ocupa entre medio cuando el paciente lo elige entonces el bot avisa, re-ofrece y no duplica', () => {
    const deps = seed();
    const chat = new Chat(deps, TEL_UNO);
    chat.hastaHorarios();
    crearTurno(deps, RECEPCION, { pacienteId: 'pac-05', prestacionId: 'prest-control', profesionalId: 'prof-1', sillonId: 'sillon-1', inicio: en('09:00') });
    chat.elegir('Lun 30/11 09:00');
    expect(chat.texto()).toMatch(/ya se ocupó/);
    expect(chat.opciones()).toEqual(['Lun 30/11 09:30', 'Lun 30/11 09:45', 'Lun 30/11 10:00', 'Ver más días']);
    expect(turnosDe(deps, 'pac-01')).toEqual([]);
    expect(deps.turnos.listarActivos({ profesionalId: 'prof-1' })).toHaveLength(1);
  });

  it('dado pac-01 con turno de prof-2 a las 09:00 cuando reserva 09:00 con la Dra entonces el bot avisa que ya tiene otro turno (RN-AG-05)', () => {
    const deps = seed();
    crearTurno(deps, RECEPCION, { pacienteId: 'pac-01', prestacionId: 'prest-control', profesionalId: 'prof-2', sillonId: 'sillon-1', inicio: en('09:00') });
    const chat = new Chat(deps, TEL_UNO);
    chat.hastaHorarios();
    chat.elegir('Lun 30/11 09:00');
    expect(chat.texto()).toMatch(/Ya tenés otro turno a esa hora/);
    expect(turnosDe(deps, 'pac-01')).toHaveLength(1);
  });

  it('dado un telefono nuevo cuando escribe nombre y DNI nuevos entonces registra al paciente con ese telefono y reserva a su nombre', () => {
    const deps = seed();
    const chat = new Chat(deps, TEL_NUEVO);
    chat.hastaHorarios();
    const pide = chat.elegir('Lun 30/11 09:00');
    expect(pide.pideTexto).toBe(true);
    chat.escribir('Paciente Ficticio Once, 99.000.011');
    const nuevo = deps.pacientes.buscarPorDni('99000011');
    expect(nuevo).toMatchObject({ nombre: 'Paciente Ficticio Once', telefono: TEL_NUEVO });
    expect(turnosDe(deps, nuevo?.id ?? '')).toHaveLength(1);
    expect(chat.texto()).toMatch(/Turno reservado/);
  });

  it('dado un telefono nuevo cuando escribe un DNI existente entonces reusa ese paciente sin registrar otro', () => {
    const deps = seed();
    const antes = deps.pacientes.listar().length;
    const chat = new Chat(deps, TEL_NUEVO);
    chat.hastaHorarios();
    chat.elegir('Lun 30/11 09:00');
    chat.escribir('Paciente Ficticio Dos, 99000002');
    expect(deps.pacientes.listar()).toHaveLength(antes);
    expect(turnosDe(deps, 'pac-02')).toHaveLength(1);
  });

  it('dado un telefono nuevo cuando escribe datos invalidos entonces vuelve a pedirlos y no reserva', () => {
    const deps = seed();
    const chat = new Chat(deps, TEL_NUEVO);
    chat.hastaHorarios();
    chat.elegir('Lun 30/11 09:00');
    const r = chat.escribir('Juan 12345678');
    expect(r.pideTexto).toBe(true);
    expect(deps.turnos.listarActivos()).toEqual([]);
  });
});

describe('bot - ver, confirmar y cancelar', () => {
  const conTurno = (inicio: Date, ahora: Date = LUNES_9): DepsBot => {
    const deps = seed(ahora);
    const r = crearTurno(deps, RECEPCION, { pacienteId: 'pac-01', prestacionId: 'prest-control', profesionalId: 'prof-1', sillonId: 'sillon-1', inicio });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return deps;
  };
  const MARTES_10 = en('10:00', '2026-12-01');

  it('dado un turno del martes cuando elige Ver o cambiar mi turno entonces lo muestra con las 3 opciones', () => {
    const chat = new Chat(conTurno(MARTES_10), TEL_UNO);
    chat.escribir('hola');
    chat.elegir('Ver o cambiar mi turno');
    expect(chat.texto()).toMatch(/Mar 1\/12 10:00 · Control y limpieza · Dra\. Ficticia Perez/);
    expect(chat.opciones()).toEqual(['Confirmo', 'Necesito cambiarlo', 'Cancelar turno']);
  });

  it('dado un telefono sin turnos cuando elige Ver o cambiar mi turno entonces informa y ofrece Pedir un turno', () => {
    const chat = new Chat(seed(), TEL_NUEVO);
    chat.escribir('hola');
    chat.elegir('Ver o cambiar mi turno');
    expect(chat.texto()).toMatch(/No encontré turnos próximos/);
    expect(chat.opciones()).toEqual(['Pedir un turno']);
  });

  it('dado el turno mostrado cuando elige Confirmo entonces queda confirmado, y repetirlo informa que ya estaba confirmado', () => {
    const deps = conTurno(MARTES_10);
    const chat = new Chat(deps, TEL_UNO);
    chat.escribir('hola');
    chat.elegir('Ver o cambiar mi turno');
    chat.elegir('Confirmo');
    expect(turnosDe(deps, 'pac-01')[0]?.estado).toBe('confirmado');
    expect(chat.texto()).toMatch(/Turno confirmado/);
    chat.elegir('Volver al menú');
    chat.elegir('Ver o cambiar mi turno');
    chat.elegir('Confirmo');
    expect(chat.texto()).toMatch(/ya estaba confirmado/);
    expect(turnosDe(deps, 'pac-01')[0]?.estado).toBe('confirmado');
  });

  it('dado un turno del martes 10:00 y el reloj el lunes 09:00 cuando cancela entonces queda cancelado con motivo de WhatsApp', () => {
    const deps = conTurno(MARTES_10);
    const chat = new Chat(deps, TEL_UNO);
    chat.escribir('hola');
    chat.elegir('Ver o cambiar mi turno');
    chat.elegir('Cancelar turno');
    chat.elegir('Sí, cancelar');
    const turno = deps.turnos.listarActivos({ pacienteId: 'pac-01' });
    expect(turno).toEqual([]);
    expect(chat.texto()).toMatch(/Turno cancelado/);
  });

  it('dado un turno del lunes 15:00 y el reloj el lunes 09:00 cuando intenta cancelar entonces deriva a recepcion y sigue reservado (RN-AG-06)', () => {
    const deps = conTurno(en('15:00'));
    const chat = new Chat(deps, TEL_UNO);
    chat.escribir('hola');
    chat.elegir('Ver o cambiar mi turno');
    chat.elegir('Cancelar turno');
    chat.elegir('Sí, cancelar');
    expect(chat.texto()).toMatch(/menos de 24 h/);
    expect(turnosDe(deps, 'pac-01')[0]?.estado).toBe('reservado');
  });

  it('dado el turno mostrado cuando elige Necesito cambiarlo entonces deriva a recepcion y el turno no cambia', () => {
    const deps = conTurno(MARTES_10);
    const chat = new Chat(deps, TEL_UNO);
    chat.escribir('hola');
    chat.elegir('Ver o cambiar mi turno');
    chat.elegir('Necesito cambiarlo');
    expect(chat.texto()).toMatch(/comunicate con recepción/);
    expect(turnosDe(deps, 'pac-01')[0]).toMatchObject({ estado: 'reservado', inicio: MARTES_10 });
  });

  it('dado un turno del martes cuando se envia el recordatorio entonces el bot lo recuerda por nombre con las 3 opciones', () => {
    const chat = new Chat(conTurno(MARTES_10), TEL_UNO);
    chat.enviar({ tipo: 'recordatorio' });
    expect(chat.texto()).toMatch(/Hola Paciente Ficticio Uno, te recordamos tu turno/);
    expect(chat.texto()).toMatch(/Dra\. Ficticia Perez/);
    expect(chat.opciones()).toEqual(['Confirmo', 'Necesito cambiarlo', 'Cancelar turno']);
  });

  it('dado un turno ya pasado cuando se envia el recordatorio entonces informa que no hay turnos proximos', () => {
    const chat = new Chat(conTurno(en('09:00'), en('10:00')), TEL_UNO);
    chat.enviar({ tipo: 'recordatorio' });
    expect(chat.texto()).toMatch(/No hay turnos próximos/);
  });
});
