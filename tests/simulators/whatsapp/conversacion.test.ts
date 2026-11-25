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
  senado: false,
};

/** Elige un horario y confirma el resumen (design D1). */
function confirmarHorario(etiqueta: string): Salida {
  return elegir(elegir(hastaHorarios(), etiqueta), 'Confirmar turno');
}

function hastaGestion(): Salida {
  let s = avanzar(nuevaSesion(), texto('hola'), CATALOGO);
  s = elegir(s, 'Ver mi turno');
  expect(efecto(s)).toEqual({ tipo: 'buscarProximoTurno', modo: 'ver' });
  return resolver(s.sesion, { tipo: 'buscarProximoTurno', turno: TURNO, nombrePaciente: 'Paciente Ficticio Uno' }, CATALOGO);
}

describe('conversacion - menu inicial', () => {
  it('dado una sesion nueva cuando el paciente escribe cualquier texto entonces el bot saluda y ofrece Pedir un turno, Ver mi turno y Consultar mi obra social', () => {
    const r = respuesta(avanzar(nuevaSesion(), texto('Hola! Quería sacar un turno'), CATALOGO));
    expect(textos(r)).toMatch(/asistente del consultorio/);
    expect(etiquetas(r)).toEqual(['Pedir un turno', 'Ver mi turno', 'Consultar mi obra social']);
    expect(r.pideTexto).toBe(false);
  });

  it('dado una conversacion mostrando horarios cuando el paciente escribe "menú" entonces vuelve al menu inicial', () => {
    const r = respuesta(avanzar(hastaHorarios().sesion, texto('menú'), CATALOGO));
    expect(etiquetas(r)).toEqual(['Pedir un turno', 'Ver mi turno', 'Consultar mi obra social']);
  });

  it('dado una conversacion avanzada cuando el paciente escribe "hola" entonces vuelve al menu inicial', () => {
    const r = respuesta(avanzar(hastaHorarios().sesion, texto('Hola'), CATALOGO));
    expect(etiquetas(r)).toEqual(['Pedir un turno', 'Ver mi turno', 'Consultar mi obra social']);
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
  it('dado el resumen del horario cuando elige Confirmar turno entonces declara identificar por telefono', () => {
    const s = confirmarHorario('Lun 30/11 09:15');
    expect(efecto(s)).toEqual({ tipo: 'identificarPorTelefono' });
  });

  it('dado un telefono conocido cuando se identifica entonces declara reservar el hueco elegido sin pedir datos', () => {
    const s = confirmarHorario('Lun 30/11 09:15');
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
    const s = confirmarHorario('Lun 30/11 09:15');
    const r = respuesta(resolver(s.sesion, { tipo: 'identificarPorTelefono' }, CATALOGO));
    expect(textos(r)).toMatch(/nombre completo y DNI/);
    expect(r.pideTexto).toBe(true);
    expect(r.opciones).toEqual([]);
  });

  function pidiendoDatos(): Sesion {
    const s = confirmarHorario('Lun 30/11 09:15');
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
    const s = confirmarHorario('Lun 30/11 09:15');
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
    expect(textos(r)).toMatch(/¿Querés pagar la seña ahora\?/);
    expect(etiquetas(r)).toEqual(['Pagar seña', 'Volver al menú']);
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

describe('conversacion - ver mi turno', () => {
  it('dado un proximo turno cuando se resuelve entonces lo muestra con Confirmo, Pagar seña y Cancelar turno', () => {
    const r = respuesta(hastaGestion());
    expect(textos(r)).toMatch(/Mar 1\/12 10:00 · Control y limpieza · Dra\. Ficticia Perez/);
    expect(etiquetas(r)).toEqual(['Confirmo', 'Pagar seña', 'Cancelar turno']);
  });

  it('dado un telefono sin turnos cuando se resuelve entonces informa y ofrece Pedir un turno', () => {
    let s = avanzar(nuevaSesion(), texto('hola'), CATALOGO);
    s = elegir(s, 'Ver mi turno');
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
    expect(etiquetas(r)).toEqual(['Confirmo', 'Pagar seña', 'Cancelar turno']);
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

  it('dado el turno mostrado cuando llega la opcion cambiar ya eliminada entonces responde No entendi y repite las opciones', () => {
    const r = respuesta(avanzar(hastaGestion().sesion, opcion('cambiar'), CATALOGO));
    expect(textos(r)).toMatch(/No entendí/);
    expect(etiquetas(r)).toEqual(['Confirmo', 'Pagar seña', 'Cancelar turno']);
  });

  it('dado un turno señado cuando se muestra entonces indica Seña pagada y no ofrece pagar', () => {
    let s = avanzar(nuevaSesion(), texto('hola'), CATALOGO);
    s = elegir(s, 'Ver mi turno');
    const r = respuesta(resolver(s.sesion, { tipo: 'buscarProximoTurno', turno: { ...TURNO, senado: true } }, CATALOGO));
    expect(textos(r)).toMatch(/Seña pagada/);
    expect(etiquetas(r)).toEqual(['Confirmo', 'Cancelar turno']);
  });

  it('dado un pedido de recordatorio cuando se resuelve con turno entonces escribe el recordatorio con las 3 opciones', () => {
    const s = avanzar(nuevaSesion(), { tipo: 'recordatorio' }, CATALOGO);
    expect(efecto(s)).toEqual({ tipo: 'buscarProximoTurno', modo: 'recordatorio' });
    const r = respuesta(
      resolver(s.sesion, { tipo: 'buscarProximoTurno', turno: TURNO, nombrePaciente: 'Paciente Ficticio Uno' }, CATALOGO),
    );
    expect(textos(r)).toMatch(/Hola Paciente Ficticio Uno, te recordamos tu turno/);
    expect(textos(r)).toMatch(/¿Confirmás tu asistencia\?/);
    expect(etiquetas(r)).toEqual(['Confirmo', 'Pagar seña', 'Cancelar turno']);
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

describe('conversacion - revisar el horario antes de reservar', () => {
  it('dado horarios ofrecidos cuando elige uno entonces muestra el resumen con Confirmar turno y Volver atras sin efecto', () => {
    const s = elegir(hastaHorarios(), 'Lun 30/11 09:00');
    const r = respuesta(s);
    expect(textos(r)).toMatch(/Elegiste:\nLun 30\/11 09:00 · Control y limpieza · Dra\. Ficticia Perez\n¿Confirmás el turno\?/);
    expect(etiquetas(r)).toEqual(['Confirmar turno', 'Volver atrás']);
    expect(s.sesion.efectoPendiente).toBeUndefined();
  });

  it('dado el resumen del horario cuando elige Volver atras entonces repite los mismos horarios sin efecto', () => {
    const r = respuesta(elegir(elegir(hastaHorarios(), 'Lun 30/11 09:15'), 'Volver atrás'));
    expect(etiquetas(r)).toEqual(['Lun 30/11 09:00', 'Lun 30/11 09:15', 'Lun 30/11 09:30', 'Ver más días']);
    expect(textos(r)).toMatch(/próximos horarios libres/);
  });

  it('dado volver atras cuando elige otro horario y confirma entonces reserva el nuevo horario', () => {
    let s = elegir(elegir(hastaHorarios(), 'Lun 30/11 09:15'), 'Volver atrás');
    s = elegir(elegir(s, 'Lun 30/11 09:30'), 'Confirmar turno');
    const r = resolver(s.sesion, { tipo: 'identificarPorTelefono', pacienteId: 'pac-01' }, CATALOGO);
    expect(efecto(r)).toMatchObject({ tipo: 'reservar', inicio: en('09:30') });
  });
});

describe('conversacion - pagar seña simulada', () => {
  const RESERVADO: TurnoResumen = { ...TURNO, id: 't-9', inicio: en('09:15') };

  function reservado(): Salida {
    const s = confirmarHorario('Lun 30/11 09:15');
    const r = resolver(s.sesion, { tipo: 'identificarPorTelefono', pacienteId: 'pac-01' }, CATALOGO);
    return resolver(r.sesion, { tipo: 'reservar', turno: RESERVADO }, CATALOGO);
  }

  it('dado un turno recien reservado cuando elige Pagar seña entonces muestra el monto ficticio y las opciones de pago', () => {
    const r = respuesta(elegir(reservado(), 'Pagar seña'));
    expect(textos(r)).toMatch(/Mercado Pago \(SIMULACIÓN\)/);
    expect(textos(r)).toMatch(/Lun 30\/11 09:15: \$5\.000 \(monto ficticio\)/);
    expect(etiquetas(r)).toEqual(['Aprobar pago (simulación)', 'Rechazar pago (simulación)', 'Volver al menú']);
  });

  it('dado la pantalla de pago cuando elige Aprobar entonces declara pagarSena aprobado y al resolver muestra Seña pagada', () => {
    const s = elegir(elegir(reservado(), 'Pagar seña'), 'Aprobar pago (simulación)');
    expect(efecto(s)).toEqual({ tipo: 'pagarSena', turnoId: 't-9', resultado: 'aprobado' });
    const r = respuesta(resolver(s.sesion, { tipo: 'pagarSena', resultado: 'aprobado' }, CATALOGO));
    const tarjeta = r.mensajes.find((m) => m.tarjeta !== undefined)?.tarjeta;
    expect(tarjeta?.titulo).toBe('Seña pagada');
    expect(tarjeta?.lineas.join('\n')).toMatch(/Lun 30\/11 09:15/);
    expect(tarjeta?.lineas.join('\n')).toMatch(/\$5\.000 · Mercado Pago \(simulación\)/);
    expect(etiquetas(r)).toEqual(['Volver al menú']);
  });

  it('dado la pantalla de pago cuando elige Rechazar entonces declara pagarSena rechazado y al resolver ofrece reintentar', () => {
    const s = elegir(elegir(reservado(), 'Pagar seña'), 'Rechazar pago (simulación)');
    expect(efecto(s)).toEqual({ tipo: 'pagarSena', turnoId: 't-9', resultado: 'rechazado' });
    const salida = resolver(s.sesion, { tipo: 'pagarSena', resultado: 'rechazado' }, CATALOGO);
    const r = respuesta(salida);
    expect(textos(r)).toMatch(/El pago fue rechazado \(simulación\)\. Tu turno sigue reservado, sin seña\./);
    expect(etiquetas(r)).toEqual(['Pagar seña', 'Volver al menú']);
    expect(etiquetas(respuesta(elegir(salida, 'Pagar seña')))).toContain('Aprobar pago (simulación)');
  });

  it('dado un turno ya señado (RN-SM-01) cuando se resuelve el pago entonces informa que la seña ya estaba pagada', () => {
    const s = elegir(elegir(reservado(), 'Pagar seña'), 'Aprobar pago (simulación)');
    const r = respuesta(resolver(s.sesion, { tipo: 'pagarSena', regla: 'RN-SM-01' }, CATALOGO));
    expect(textos(r)).toMatch(/ya tiene la seña pagada/);
    expect(etiquetas(r)).toEqual(['Volver al menú']);
  });

  it('dado el turno mostrado en Ver mi turno cuando elige Pagar seña entonces muestra la pantalla de pago de ese turno', () => {
    const r = respuesta(elegir(hastaGestion(), 'Pagar seña'));
    expect(textos(r)).toMatch(/Mar 1\/12 10:00: \$5\.000/);
  });
});

describe('conversacion - consultar mi obra social', () => {
  function pidiendoAfiliado(): Salida {
    return elegir(avanzar(nuevaSesion(), texto('hola'), CATALOGO), 'Consultar mi obra social');
  }

  it('dado el menu cuando elige Consultar mi obra social entonces pide el numero de afiliado con texto habilitado', () => {
    const r = respuesta(pidiendoAfiliado());
    expect(textos(r)).toMatch(/número de afiliado/);
    expect(r.pideTexto).toBe(true);
    expect(etiquetas(r)).toEqual(['Volver al menú']);
  });

  it('dado el pedido de afiliado cuando escribe en minusculas con espacios entonces declara consultar con el numero normalizado', () => {
    const s = avanzar(pidiendoAfiliado().sesion, texto(' af-0002 '), CATALOGO);
    expect(efecto(s)).toEqual({ tipo: 'consultarObraSocial', nro: 'AF-0002' });
  });

  it('dado un afiliado encontrado cuando se resuelve entonces muestra obra social, plan, cobertura, copago y estado', () => {
    const s = avanzar(pidiendoAfiliado().sesion, texto('AF-0002'), CATALOGO);
    const r = respuesta(
      resolver(
        s.sesion,
        {
          tipo: 'consultarObraSocial',
          afiliado: { obraSocial: 'OS-02', plan: 'Plan Copago', cobertura: 60, copagoPct: 40, estado: 'con_copago' },
        },
        CATALOGO,
      ),
    );
    const tarjeta = r.mensajes.find((m) => m.tarjeta !== undefined)?.tarjeta;
    expect(tarjeta?.titulo).toBe('Tu cobertura (simulación)');
    expect(tarjeta?.lineas).toEqual(['Obra social: OS-02', 'Plan: Plan Copago', 'Cobertura: 60%', 'Copago: 40%', 'Estado: con copago']);
    expect(etiquetas(r)).toEqual(['Pedir un turno', 'Volver al menú']);
  });

  it('dado un afiliado inexistente cuando se resuelve entonces avisa y vuelve a pedir el numero', () => {
    const s = avanzar(pidiendoAfiliado().sesion, texto('AF-9999'), CATALOGO);
    const r = resolver(s.sesion, { tipo: 'consultarObraSocial', error: 'no-encontrado' }, CATALOGO);
    expect(textos(respuesta(r))).toMatch(/No encontré el afiliado AF-9999 en el padrón simulado/);
    expect(respuesta(r).pideTexto).toBe(true);
    expect(efecto(avanzar(r.sesion, texto('AF-0001'), CATALOGO))).toEqual({ tipo: 'consultarObraSocial', nro: 'AF-0001' });
  });

  it('dado una falla simulada del padron cuando se resuelve entonces informa sin datos de cobertura', () => {
    const s = avanzar(pidiendoAfiliado().sesion, texto('AF-0004'), CATALOGO);
    const r = respuesta(resolver(s.sesion, { tipo: 'consultarObraSocial', error: 'falla' }, CATALOGO));
    expect(textos(r)).toMatch(/padrón de obras sociales no respondió \(falla simulada\)/);
    expect(r.mensajes.some((m) => m.tarjeta !== undefined)).toBe(false);
    expect(etiquetas(r)).toEqual(['Volver al menú']);
  });

  it('dado el pedido de afiliado cuando escribe "menú" entonces vuelve al menu inicial', () => {
    const r = respuesta(avanzar(pidiendoAfiliado().sesion, texto('menú'), CATALOGO));
    expect(etiquetas(r)).toEqual(['Pedir un turno', 'Ver mi turno', 'Consultar mi obra social']);
  });
});
