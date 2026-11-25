import { describe, it, expect } from 'vitest';
import {
  avanzar,
  etiquetaHorario,
  nuevaSesion,
  resolver,
  type Catalogo,
  type Efecto,
  type Entrada,
  type ResultadoEfecto,
  type Respuesta,
  type Salida,
  type Sesion,
  type TurnoResumen,
} from '../../../src/simulators/whatsapp/conversacion';
import { PRESTACIONES, PROFESIONALES } from '../../../src/infrastructure/seed/datos-seed';

const CATALOGO: Catalogo = {
  prestaciones: PRESTACIONES.map((p) => ({ id: p.id, codigo: p.codigo, nombre: p.nombre })),
  profesionales: PROFESIONALES.map((p) => ({ id: p.id, nombre: p.nombre })),
};

const en = (hhmm: string, fecha = '2026-11-30'): Date => new Date(`${fecha}T${hhmm}:00-03:00`);
const texto = (t: string): Entrada => ({ tipo: 'texto', texto: t });
const opcion = (id: string): Entrada => ({ tipo: 'opcion', id });

function respuesta(s: Salida): Respuesta {
  if (!('respuesta' in s)) throw new Error(`se esperaba respuesta y llegó efecto ${JSON.stringify(s.efecto)}`);
  return s.respuesta;
}
function efecto(s: Salida): Efecto {
  if (!('efecto' in s)) throw new Error(`se esperaba efecto y llegó respuesta ${JSON.stringify(s.respuesta)}`);
  return s.efecto;
}
const etiquetas = (r: Respuesta): string[] => r.opciones.map((o) => o.etiqueta);
const idDe = (r: Respuesta, etiqueta: string): string => {
  const o = r.opciones.find((x) => x.etiqueta === etiqueta);
  if (o === undefined) throw new Error(`no hay opción ${etiqueta}: ${etiquetas(r).join(', ')}`);
  return o.id;
};
const textos = (r: Respuesta): string => r.mensajes.map((m) => [m.texto, m.tarjeta?.titulo, ...(m.tarjeta?.lineas ?? [])].join('\n')).join('\n');

/** Paso de la conversación eligiendo por etiqueta visible. */
function elegir(s: Salida, etiqueta: string): Salida {
  return avanzar(s.sesion, opcion(idDe(respuesta(s), etiqueta)), CATALOGO);
}

const huecosLunes = (horas: string[]): ResultadoEfecto => ({
  tipo: 'buscarHuecos',
  fecha: '2026-11-30',
  huecos: horas.map((h) => ({ inicio: en(h), sillonId: 'sillon-1' })),
});

/** Llega hasta los horarios del lunes para control con la Dra. */
function hastaHorarios(): Salida {
  let s = avanzar(nuevaSesion(), texto('Hola! Quería sacar un turno'), CATALOGO);
  s = elegir(s, 'Pedir un turno');
  s = elegir(s, 'Control y limpieza');
  s = elegir(s, 'Dra. Ficticia Perez');
  return resolver(s.sesion, huecosLunes(['09:00', '09:15', '09:30', '09:45']), CATALOGO);
}

const TURNO: TurnoResumen = {
  id: 't-1',
  inicio: en('10:00', '2026-12-01'),
  prestacion: 'Control y limpieza',
  profesional: 'Dra. Ficticia Perez',
  estado: 'reservado',
};

function hastaGestion(): Salida {
  let s = avanzar(nuevaSesion(), texto('hola'), CATALOGO);
  s = elegir(s, 'Ver o cambiar mi turno');
  expect(efecto(s)).toEqual({ tipo: 'buscarProximoTurno', modo: 'ver' });
  return resolver(s.sesion, { tipo: 'buscarProximoTurno', turno: TURNO, nombrePaciente: 'Paciente Ficticio Uno' }, CATALOGO);
}

describe('conversacion - menu inicial', () => {
  it('dado una sesion nueva cuando el paciente escribe cualquier texto entonces el bot saluda y ofrece Pedir un turno y Ver o cambiar mi turno', () => {
    const r = respuesta(avanzar(nuevaSesion(), texto('Hola! Quería sacar un turno'), CATALOGO));
    expect(textos(r)).toMatch(/asistente del consultorio/);
    expect(etiquetas(r)).toEqual(['Pedir un turno', 'Ver o cambiar mi turno']);
    expect(r.pideTexto).toBe(false);
  });

  it('dado una conversacion mostrando horarios cuando el paciente escribe "menú" entonces vuelve al menu inicial', () => {
    const r = respuesta(avanzar(hastaHorarios().sesion, texto('menú'), CATALOGO));
    expect(etiquetas(r)).toEqual(['Pedir un turno', 'Ver o cambiar mi turno']);
  });

  it('dado una conversacion avanzada cuando el paciente escribe "hola" entonces vuelve al menu inicial', () => {
    const r = respuesta(avanzar(hastaHorarios().sesion, texto('Hola'), CATALOGO));
    expect(etiquetas(r)).toEqual(['Pedir un turno', 'Ver o cambiar mi turno']);
  });
});

describe('conversacion - tipo de consulta y profesional', () => {
  it('dado el menu cuando elige Pedir un turno entonces ofrece las prestaciones sin Urgencia', () => {
    let s = avanzar(nuevaSesion(), texto('hola'), CATALOGO);
    s = elegir(s, 'Pedir un turno');
    expect(etiquetas(respuesta(s))).toEqual(['Control y limpieza', 'Ortodoncia', 'Tratamiento', 'Estetica dental']);
    expect(textos(respuesta(s))).toMatch(/tipo de consulta/);
  });

  it('dado los tipos de consulta cuando elige Control y limpieza entonces ofrece los profesionales activos', () => {
    let s = avanzar(nuevaSesion(), texto('hola'), CATALOGO);
    s = elegir(s, 'Pedir un turno');
    s = elegir(s, 'Control y limpieza');
    expect(etiquetas(respuesta(s))).toEqual(['Dra. Ficticia Perez', 'Dr. Ficticio Gomez']);
  });

  it('dado los profesionales cuando elige uno entonces declara el efecto de buscar huecos desde hoy', () => {
    let s = avanzar(nuevaSesion(), texto('hola'), CATALOGO);
    s = elegir(s, 'Pedir un turno');
    s = elegir(s, 'Control y limpieza');
    s = elegir(s, 'Dra. Ficticia Perez');
    expect(efecto(s)).toEqual({ tipo: 'buscarHuecos', prestacionId: 'prest-control', profesionalId: 'prof-1' });
  });
});

describe('conversacion - horarios ofrecidos (RN-WA-01)', () => {
  it('dado cuatro huecos encontrados cuando se resuelve la busqueda entonces ofrece exactamente los 3 primeros y Ver mas dias', () => {
    const r = respuesta(hastaHorarios());
    expect(etiquetas(r)).toEqual(['Lun 30/11 09:00', 'Lun 30/11 09:15', 'Lun 30/11 09:30', 'Ver más días']);
    expect(textos(r)).toMatch(/próximos horarios libres/);
  });

  it('dado un instante cuando se arma la etiqueta entonces usa dia abreviado, fecha y hora del consultorio', () => {
    expect(etiquetaHorario(en('09:00'))).toBe('Lun 30/11 09:00');
    expect(etiquetaHorario(en('14:45', '2026-12-05'))).toBe('Sáb 5/12 14:45');
  });

  it('dado horarios del lunes cuando elige Ver mas dias entonces declara buscar desde el martes', () => {
    const s = elegir(hastaHorarios(), 'Ver más días');
    expect(efecto(s)).toEqual({
      tipo: 'buscarHuecos',
      prestacionId: 'prest-control',
      profesionalId: 'prof-1',
      desdeFecha: '2026-12-01',
    });
  });

  it('dado una busqueda sin huecos en 14 dias cuando se resuelve entonces informa y ofrece Volver al menu', () => {
    let s = avanzar(nuevaSesion(), texto('hola'), CATALOGO);
    s = elegir(s, 'Pedir un turno');
    s = elegir(s, 'Control y limpieza');
    s = elegir(s, 'Dra. Ficticia Perez');
    const r = respuesta(resolver(s.sesion, { tipo: 'buscarHuecos', huecos: [] }, CATALOGO));
    expect(textos(r)).toMatch(/próximas 2 semanas/);
    expect(etiquetas(r)).toEqual(['Volver al menú']);
  });
});

describe('conversacion - identificacion y reserva', () => {
  it('dado horarios ofrecidos cuando elige uno entonces declara identificar por telefono', () => {
    const s = elegir(hastaHorarios(), 'Lun 30/11 09:15');
    expect(efecto(s)).toEqual({ tipo: 'identificarPorTelefono' });
  });

  it('dado un telefono conocido cuando se identifica entonces declara reservar el hueco elegido sin pedir datos', () => {
    const s = elegir(hastaHorarios(), 'Lun 30/11 09:15');
    const r = resolver(s.sesion, { tipo: 'identificarPorTelefono', pacienteId: 'pac-01' }, CATALOGO);
    expect(efecto(r)).toEqual({
      tipo: 'reservar',
      pacienteId: 'pac-01',
      prestacionId: 'prest-control',
      profesionalId: 'prof-1',
      sillonId: 'sillon-1',
      inicio: en('09:15'),
    });
  });

  it('dado un telefono desconocido cuando se identifica entonces pide nombre y DNI con texto habilitado', () => {
    const s = elegir(hastaHorarios(), 'Lun 30/11 09:15');
    const r = respuesta(resolver(s.sesion, { tipo: 'identificarPorTelefono' }, CATALOGO));
    expect(textos(r)).toMatch(/nombre completo y DNI/);
    expect(r.pideTexto).toBe(true);
    expect(r.opciones).toEqual([]);
  });

  function pidiendoDatos(): Sesion {
    const s = elegir(hastaHorarios(), 'Lun 30/11 09:15');
    return resolver(s.sesion, { tipo: 'identificarPorTelefono' }, CATALOGO).sesion;
  }

  it('dado el pedido de datos cuando escribe "Paciente Ficticio Once, 99.000.011" entonces declara identificar con nombre y DNI sin puntos', () => {
    const s = avanzar(pidiendoDatos(), texto('Paciente Ficticio Once, 99.000.011'), CATALOGO);
    expect(efecto(s)).toEqual({ tipo: 'identificarPorDatos', nombre: 'Paciente Ficticio Once', dni: '99000011' });
  });

  it('dado el pedido de datos cuando escribe sin coma ni DNI valido entonces explica el formato y vuelve a pedir', () => {
    const r = respuesta(avanzar(pidiendoDatos(), texto('Juan 12345678'), CATALOGO));
    expect(textos(r)).toMatch(/Paciente Ficticio Once, 99\.000\.011/);
    expect(r.pideTexto).toBe(true);
  });

  it('dado el pedido de datos cuando el DNI no es ficticio entonces explica que debe empezar con 99 y vuelve a pedir', () => {
    const r = respuesta(avanzar(pidiendoDatos(), texto('Paciente Ficticio, 12.345.678'), CATALOGO));
    expect(textos(r)).toMatch(/99/);
    expect(r.pideTexto).toBe(true);
  });

  it('dado datos validos cuando el registro falla entonces muestra el motivo y vuelve a pedir', () => {
    const s = avanzar(pidiendoDatos(), texto('Paciente Ficticio Once, 99.000.011'), CATALOGO);
    const r = respuesta(resolver(s.sesion, { tipo: 'identificarPorDatos', error: 'DNI invalido' }, CATALOGO));
    expect(textos(r)).toMatch(/DNI invalido/);
    expect(r.pideTexto).toBe(true);
  });

  it('dado datos identificados cuando se resuelve entonces declara reservar a nombre de ese paciente', () => {
    const s = avanzar(pidiendoDatos(), texto('Paciente Ficticio Once, 99.000.011'), CATALOGO);
    const r = resolver(s.sesion, { tipo: 'identificarPorDatos', pacienteId: 'pac-11' }, CATALOGO);
    expect(efecto(r)).toMatchObject({ tipo: 'reservar', pacienteId: 'pac-11', inicio: en('09:15') });
  });

  function reservando(): Sesion {
    const s = elegir(hastaHorarios(), 'Lun 30/11 09:15');
    return resolver(s.sesion, { tipo: 'identificarPorTelefono', pacienteId: 'pac-01' }, CATALOGO).sesion;
  }

  it('dado una reserva exitosa cuando se resuelve entonces muestra la tarjeta Turno reservado con fecha, prestacion y profesional', () => {
    const turno: TurnoResumen = { ...TURNO, inicio: en('09:15') };
    const r = respuesta(resolver(reservando(), { tipo: 'reservar', turno }, CATALOGO));
    const tarjeta = r.mensajes.find((m) => m.tarjeta !== undefined)?.tarjeta;
    expect(tarjeta?.titulo).toBe('Turno reservado');
    expect(tarjeta?.lineas.join('\n')).toMatch(/Lun 30\/11 09:15/);
    expect(tarjeta?.lineas.join('\n')).toMatch(/Control y limpieza · Dra\. Ficticia Perez/);
    expect(tarjeta?.lineas.join('\n')).toMatch(/24 h antes/);
    expect(etiquetas(r)).toEqual(['Volver al menú']);
  });

  it('dado un horario tomado entre medio (RN-AG-02) cuando se resuelve la reserva entonces avisa y declara buscar de nuevo el mismo dia', () => {
    const s = resolver(reservando(), { tipo: 'reservar', regla: 'RN-AG-02' }, CATALOGO);
    expect(efecto(s)).toEqual({
      tipo: 'buscarHuecos',
      prestacionId: 'prest-control',
      profesionalId: 'prof-1',
      desdeFecha: '2026-11-30',
    });
    const r = respuesta(resolver(s.sesion, huecosLunes(['09:30', '09:45', '10:00']), CATALOGO));
    expect(textos(r)).toMatch(/ya se ocupó/);
    expect(etiquetas(r)).toEqual(['Lun 30/11 09:30', 'Lun 30/11 09:45', 'Lun 30/11 10:00', 'Ver más días']);
  });

  it('dado que el paciente ya tiene turno a esa hora (RN-AG-05) cuando se resuelve la reserva entonces avisa y vuelve a ofrecer', () => {
    const s = resolver(reservando(), { tipo: 'reservar', regla: 'RN-AG-05' }, CATALOGO);
    const r = respuesta(resolver(s.sesion, huecosLunes(['09:30']), CATALOGO));
    expect(textos(r)).toMatch(/Ya tenés otro turno a esa hora/);
    expect(etiquetas(r)).toContain('Lun 30/11 09:30');
  });
});

describe('conversacion - ver o cambiar mi turno', () => {
  it('dado un proximo turno cuando se resuelve entonces lo muestra con Confirmo, Necesito cambiarlo y Cancelar turno', () => {
    const r = respuesta(hastaGestion());
    expect(textos(r)).toMatch(/Mar 1\/12 10:00 · Control y limpieza · Dra\. Ficticia Perez/);
    expect(etiquetas(r)).toEqual(['Confirmo', 'Necesito cambiarlo', 'Cancelar turno']);
  });

  it('dado un telefono sin turnos cuando se resuelve entonces informa y ofrece Pedir un turno', () => {
    let s = avanzar(nuevaSesion(), texto('hola'), CATALOGO);
    s = elegir(s, 'Ver o cambiar mi turno');
    const r = respuesta(resolver(s.sesion, { tipo: 'buscarProximoTurno' }, CATALOGO));
    expect(textos(r)).toMatch(/No encontré turnos próximos/);
    expect(etiquetas(r)).toEqual(['Pedir un turno']);
  });

  it('dado el turno mostrado cuando elige Confirmo entonces declara confirmar y al resolver muestra Turno confirmado', () => {
    const s = elegir(hastaGestion(), 'Confirmo');
    expect(efecto(s)).toEqual({ tipo: 'confirmar', turnoId: 't-1' });
    const r = respuesta(resolver(s.sesion, { tipo: 'confirmar' }, CATALOGO));
    expect(r.mensajes.some((m) => m.tarjeta?.titulo === 'Turno confirmado')).toBe(true);
  });

  it('dado un turno ya confirmado (RN-AG-09) cuando se resuelve Confirmo entonces responde que ya estaba confirmado', () => {
    const s = elegir(hastaGestion(), 'Confirmo');
    const r = respuesta(resolver(s.sesion, { tipo: 'confirmar', regla: 'RN-AG-09' }, CATALOGO));
    expect(textos(r)).toMatch(/ya estaba confirmado/);
  });

  it('dado el turno mostrado cuando elige Cancelar turno entonces pide confirmacion con Si, cancelar y No', () => {
    const r = respuesta(elegir(hastaGestion(), 'Cancelar turno'));
    expect(textos(r)).toMatch(/¿Querés cancelar el turno del Mar 1\/12 10:00\?/);
    expect(etiquetas(r)).toEqual(['Sí, cancelar', 'No']);
  });

  it('dado la confirmacion de cancelacion cuando elige No entonces vuelve a las opciones del turno', () => {
    const r = respuesta(elegir(elegir(hastaGestion(), 'Cancelar turno'), 'No'));
    expect(etiquetas(r)).toEqual(['Confirmo', 'Necesito cambiarlo', 'Cancelar turno']);
  });

  it('dado la confirmacion de cancelacion cuando elige Si, cancelar entonces declara cancelar y al resolver confirma', () => {
    const s = elegir(elegir(hastaGestion(), 'Cancelar turno'), 'Sí, cancelar');
    expect(efecto(s)).toEqual({ tipo: 'cancelar', turnoId: 't-1' });
    const r = respuesta(resolver(s.sesion, { tipo: 'cancelar' }, CATALOGO));
    expect(r.mensajes.some((m) => m.tarjeta?.titulo === 'Turno cancelado')).toBe(true);
  });

  it('dado menos de 24 h (RN-AG-06) cuando se resuelve la cancelacion entonces deriva a recepcion', () => {
    const s = elegir(elegir(hastaGestion(), 'Cancelar turno'), 'Sí, cancelar');
    const r = respuesta(resolver(s.sesion, { tipo: 'cancelar', regla: 'RN-AG-06' }, CATALOGO));
    expect(textos(r)).toMatch(/menos de 24 h.*comunicate con recepción/s);
    expect(etiquetas(r)).toEqual(['Volver al menú']);
  });

  it('dado el turno mostrado cuando elige Necesito cambiarlo entonces deriva a recepcion sin efectos', () => {
    const r = respuesta(elegir(hastaGestion(), 'Necesito cambiarlo'));
    expect(textos(r)).toMatch(/comunicate con recepción/);
    expect(etiquetas(r)).toEqual(['Volver al menú']);
  });

  it('dado un pedido de recordatorio cuando se resuelve con turno entonces escribe el recordatorio con las 3 opciones', () => {
    const s = avanzar(nuevaSesion(), { tipo: 'recordatorio' }, CATALOGO);
    expect(efecto(s)).toEqual({ tipo: 'buscarProximoTurno', modo: 'recordatorio' });
    const r = respuesta(
      resolver(s.sesion, { tipo: 'buscarProximoTurno', turno: TURNO, nombrePaciente: 'Paciente Ficticio Uno' }, CATALOGO),
    );
    expect(textos(r)).toMatch(/Hola Paciente Ficticio Uno, te recordamos tu turno/);
    expect(textos(r)).toMatch(/¿Confirmás tu asistencia\?/);
    expect(etiquetas(r)).toEqual(['Confirmo', 'Necesito cambiarlo', 'Cancelar turno']);
  });

  it('dado un pedido de recordatorio sin turnos cuando se resuelve entonces informa que no hay turnos proximos', () => {
    const s = avanzar(nuevaSesion(), { tipo: 'recordatorio' }, CATALOGO);
    const r = respuesta(resolver(s.sesion, { tipo: 'buscarProximoTurno' }, CATALOGO));
    expect(textos(r)).toMatch(/No hay turnos próximos/);
  });
});

describe('conversacion - opcion no reconocida', () => {
  it('dado los tipos de consulta cuando llega una opcion inexistente entonces responde No entendi y repite las opciones', () => {
    let s = avanzar(nuevaSesion(), texto('hola'), CATALOGO);
    s = elegir(s, 'Pedir un turno');
    const r = respuesta(avanzar(s.sesion, opcion('no-existe'), CATALOGO));
    expect(textos(r)).toMatch(/No entendí/);
    expect(etiquetas(r)).toEqual(['Control y limpieza', 'Ortodoncia', 'Tratamiento', 'Estetica dental']);
  });

  it('dado los tipos de consulta cuando llega texto libre entonces responde No entendi sin cambiar de paso', () => {
    let s = avanzar(nuevaSesion(), texto('hola'), CATALOGO);
    s = elegir(s, 'Pedir un turno');
    const r = avanzar(s.sesion, texto('quiero el martes'), CATALOGO);
    expect(textos(respuesta(r))).toMatch(/No entendí/);
    expect(elegir(r, 'Ortodoncia').sesion.paso).toBe('profesional');
  });
});
