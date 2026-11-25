import { describe, expect, it } from 'vitest';
import {
  aHoraLocal,
  asignarCarriles,
  diasDeSemana,
  etiquetaEstado,
  etiquetaSemana,
  filtrarTurnos,
  formatearRegistro,
  HORAS_DE_TURNO,
  hhmm,
  limitesGrilla,
  lunesDeLaSemana,
  miniCalendario,
  nombreAccesible,
  posicionBloque,
  rangoDeSemana,
  sumarDias,
  terminoAntesDe,
  validarNuevoTurno,
  type TurnoPanel,
} from '../../public/admin/js/agenda-calculos.js';

const iso = (local: string): string => new Date(`${local}-03:00`).toISOString();

const turno = (sobre: Partial<TurnoPanel> & { inicioLocal: string; finLocal: string }): TurnoPanel => ({
  id: 't-1',
  pacienteId: 'pac-01',
  prestacionId: 'prest-control',
  profesionalId: 'prof-1',
  sillonId: 'sillon-1',
  estado: 'confirmado',
  senado: false,
  ...sobre,
  inicio: iso(sobre.inicioLocal),
  fin: iso(sobre.finLocal),
});

describe('lunesDeLaSemana / sumarDias', () => {
  it('dado un martes 2026-12-01 cuando se pide el lunes de su semana entonces devuelve 2026-11-30', () => {
    expect(lunesDeLaSemana('2026-12-01')).toBe('2026-11-30');
  });

  it('dado un lunes cuando se pide su lunes entonces devuelve el mismo dia', () => {
    expect(lunesDeLaSemana('2026-11-30')).toBe('2026-11-30');
  });

  it('dado un domingo 2026-12-06 cuando se pide el lunes entonces devuelve el lunes anterior 2026-11-30', () => {
    expect(lunesDeLaSemana('2026-12-06')).toBe('2026-11-30');
  });

  it('dado el primer dia del anio 2027-01-01 (viernes) cuando se pide el lunes entonces cruza de anio a 2026-12-28', () => {
    expect(lunesDeLaSemana('2027-01-01')).toBe('2026-12-28');
  });

  it('dado una fecha cuando se suman y restan dias entonces cruza meses y anios', () => {
    expect(sumarDias('2026-11-30', 7)).toBe('2026-12-07');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('rangoDeSemana / diasDeSemana / etiquetaSemana', () => {
  it('dado el lunes 2026-11-30 cuando se pide el rango entonces va de lunes 00:00 a lunes siguiente 00:00 con -03:00', () => {
    expect(rangoDeSemana('2026-11-30')).toEqual({
      desde: '2026-11-30T00:00:00-03:00',
      hasta: '2026-12-07T00:00:00-03:00',
    });
  });

  it('dado otro lunes 2026-12-28 cuando se pide el rango entonces cruza el anio', () => {
    expect(rangoDeSemana('2026-12-28')).toEqual({
      desde: '2026-12-28T00:00:00-03:00',
      hasta: '2027-01-04T00:00:00-03:00',
    });
  });

  it('dado un lunes cuando se piden los dias entonces son 7 de Lunes a Domingo con fecha y dia/mes', () => {
    const dias = diasDeSemana('2026-11-30');
    expect(dias.map((d) => d.nombre)).toEqual(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']);
    expect(dias[0]).toMatchObject({ fecha: '2026-11-30', corta: '30/11', indice: 0 });
    expect(dias[6]).toMatchObject({ fecha: '2026-12-06', corta: '06/12', indice: 6 });
  });

  it('dado el lunes 2026-11-30 cuando se pide la etiqueta entonces es 30/11 – 06/12/2026', () => {
    expect(etiquetaSemana('2026-11-30')).toBe('30/11 – 06/12/2026');
  });
});

describe('aHoraLocal / hhmm', () => {
  it('dado un instante UTC cuando se convierte entonces devuelve fecha y minutos de Buenos Aires', () => {
    expect(aHoraLocal(iso('2026-12-01T10:30:00'))).toEqual({ fecha: '2026-12-01', minutos: 630 });
  });

  it('dado un instante 23:30 local cuando se convierte entonces no salta de dia (UTC ya es el dia siguiente)', () => {
    expect(aHoraLocal(iso('2026-12-01T23:30:00'))).toEqual({ fecha: '2026-12-01', minutos: 23 * 60 + 30 });
  });

  it('dado minutos del dia cuando se formatean entonces devuelve HH:mm con ceros', () => {
    expect(hhmm(0)).toBe('00:00');
    expect(hhmm(545)).toBe('09:05');
    expect(hhmm(1140)).toBe('19:00');
  });
});

describe('posicionBloque', () => {
  const LUNES = '2026-11-30';

  it('dado un turno del martes 10:00-10:45 cuando se calcula la posicion entonces esta en la columna 1, fila 8 y ocupa 3 filas', () => {
    const t = turno({ inicioLocal: '2026-12-01T10:00:00', finLocal: '2026-12-01T10:45:00' });
    expect(posicionBloque(t, LUNES, 8 * 60)).toEqual({ columna: 1, fila: 8, filas: 3 });
  });

  it('dado un turno del lunes 09:00-09:30 cuando se calcula entonces columna 0, fila 4 y 2 filas', () => {
    const t = turno({ inicioLocal: '2026-11-30T09:00:00', finLocal: '2026-11-30T09:30:00' });
    expect(posicionBloque(t, LUNES, 8 * 60)).toEqual({ columna: 0, fila: 4, filas: 2 });
  });

  it('dado un turno del domingo de 60 minutos cuando se calcula entonces columna 6 y 4 filas', () => {
    const t = turno({ inicioLocal: '2026-12-06T08:00:00', finLocal: '2026-12-06T09:00:00' });
    expect(posicionBloque(t, LUNES, 8 * 60)).toEqual({ columna: 6, fila: 0, filas: 4 });
  });

  it('dado un turno fuera de la semana cuando se calcula entonces devuelve undefined', () => {
    const siguiente = turno({ inicioLocal: '2026-12-07T10:00:00', finLocal: '2026-12-07T10:30:00' });
    const anterior = turno({ inicioLocal: '2026-11-29T10:00:00', finLocal: '2026-11-29T10:30:00' });
    expect(posicionBloque(siguiente, LUNES, 8 * 60)).toBeUndefined();
    expect(posicionBloque(anterior, LUNES, 8 * 60)).toBeUndefined();
  });

  it('dado un turno a las 23:30 del lunes cuando se calcula entonces sigue en la columna 0 (no salta a martes por UTC)', () => {
    const t = turno({ inicioLocal: '2026-11-30T23:30:00', finLocal: '2026-11-30T23:45:00' });
    expect(posicionBloque(t, LUNES, 8 * 60)?.columna).toBe(0);
  });
});

describe('limitesGrilla', () => {
  it('dado ningun turno cuando se piden los limites entonces usa 08:00 a 20:00', () => {
    expect(limitesGrilla([])).toEqual({ inicioMin: 480, finMin: 1200 });
  });

  it('dado turnos dentro del rango cuando se piden los limites entonces mantiene el rango minimo', () => {
    const t = turno({ inicioLocal: '2026-12-01T10:00:00', finLocal: '2026-12-01T10:30:00' });
    expect(limitesGrilla([t])).toEqual({ inicioMin: 480, finMin: 1200 });
  });

  it('dado un turno temprano y otro tarde cuando se piden los limites entonces se amplian a horas completas', () => {
    const a = turno({ inicioLocal: '2026-12-01T06:30:00', finLocal: '2026-12-01T07:00:00' });
    const b = turno({ inicioLocal: '2026-12-01T20:15:00', finLocal: '2026-12-01T20:45:00' });
    expect(limitesGrilla([a, b])).toEqual({ inicioMin: 360, finMin: 1260 });
  });
});

describe('filtrarTurnos', () => {
  const t1 = turno({ id: 'a', inicioLocal: '2026-12-01T10:00:00', finLocal: '2026-12-01T10:30:00', profesionalId: 'prof-1', sillonId: 'sillon-1', estado: 'confirmado' });
  const t2 = turno({ id: 'b', inicioLocal: '2026-12-01T11:00:00', finLocal: '2026-12-01T11:30:00', profesionalId: 'prof-2', sillonId: 'sillon-2', estado: 'reservado' });
  const t3 = turno({ id: 'c', inicioLocal: '2026-12-01T12:00:00', finLocal: '2026-12-01T12:30:00', profesionalId: 'prof-1', sillonId: 'sillon-2', estado: 'atendido' });
  const todos = [t1, t2, t3];

  it('dado turnos en sillon-1 y sillon-2 cuando se filtra por sillon-2 entonces quedan solo los de sillon-2', () => {
    expect(filtrarTurnos(todos, { sillonId: 'sillon-2' }).map((t) => t.id)).toEqual(['b', 'c']);
  });

  it('dado turnos de dos profesionales cuando se filtra por prof-1 entonces quedan solo los suyos', () => {
    expect(filtrarTurnos(todos, { profesionalId: 'prof-1' }).map((t) => t.id)).toEqual(['a', 'c']);
  });

  it('dado turnos en distintos estados cuando se filtra por estado reservado entonces queda uno', () => {
    expect(filtrarTurnos(todos, { estado: 'reservado' }).map((t) => t.id)).toEqual(['b']);
  });

  it('dado varios filtros combinados cuando se aplican entonces se exige que cumpla todos', () => {
    expect(filtrarTurnos(todos, { profesionalId: 'prof-1', sillonId: 'sillon-2' }).map((t) => t.id)).toEqual(['c']);
  });

  it('dado filtros vacios o indefinidos cuando se aplican entonces devuelve todos', () => {
    expect(filtrarTurnos(todos, {})).toHaveLength(3);
    expect(filtrarTurnos(todos, { profesionalId: '', sillonId: undefined, estado: '' })).toHaveLength(3);
  });

  it('dado un filtro sin coincidencias cuando se aplica entonces devuelve una lista vacia', () => {
    expect(filtrarTurnos(todos, { profesionalId: 'prof-9' })).toEqual([]);
  });
});

describe('etiquetaEstado / nombreAccesible', () => {
  it('dado cada estado activo cuando se pide la etiqueta entonces devuelve su texto legible', () => {
    expect(etiquetaEstado('reservado')).toBe('Sin confirmar');
    expect(etiquetaEstado('confirmado')).toBe('Confirmado');
    expect(etiquetaEstado('atendido')).toBe('Atendido');
    expect(etiquetaEstado('ausente')).toBe('Ausente');
  });

  it('dado un turno confirmado del martes cuando se pide el nombre accesible entonces incluye dia, horas, paciente, prestacion y confirmado', () => {
    const t = turno({ inicioLocal: '2026-12-01T10:00:00', finLocal: '2026-12-01T10:45:00' });
    const nombre = nombreAccesible(t, { paciente: 'Paciente Ficticio Uno', prestacion: 'Control y limpieza' });
    expect(nombre).toContain('Martes');
    expect(nombre).toContain('10:00 a 10:45');
    expect(nombre).toContain('Paciente Ficticio Uno');
    expect(nombre).toContain('Control y limpieza');
    expect(nombre).toContain('confirmado');
    expect(nombre).not.toContain('señado');
  });

  it('dado un turno reservado y senado cuando se pide el nombre accesible entonces menciona sin confirmar y senado', () => {
    const t = turno({ inicioLocal: '2026-12-02T09:30:00', finLocal: '2026-12-02T10:30:00', estado: 'reservado', senado: true });
    const nombre = nombreAccesible(t, { paciente: 'Paciente Ficticio Ocho', prestacion: 'Estetica dental' });
    expect(nombre).toContain('Miércoles');
    expect(nombre).toContain('sin confirmar');
    expect(nombre).toContain('señado');
  });
});

describe('miniCalendario', () => {
  it('dado diciembre 2026 con semana del 30/11 y hoy 2026-12-01 cuando se arma entonces empieza el lunes 30/11 marcando la semana y hoy', () => {
    const cal = miniCalendario(2026, 12, '2026-11-30', '2026-12-01');
    expect(cal.titulo).toBe('Diciembre 2026');
    const primera = cal.semanas[0];
    expect(primera?.map((c) => c.fecha)).toEqual([
      '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06',
    ]);
    expect(primera?.[0]).toMatchObject({ dia: 30, fueraDeMes: true, enSemana: true, esHoy: false });
    expect(primera?.[1]).toMatchObject({ dia: 1, fueraDeMes: false, enSemana: true, esHoy: true });
    expect(cal.semanas[1]?.every((c) => !c.enSemana)).toBe(true);
  });

  it('dado diciembre 2026 cuando se arma entonces cada fila tiene 7 dias y cubre hasta el fin del mes', () => {
    const cal = miniCalendario(2026, 12, '2026-11-30', '2026-12-01');
    expect(cal.semanas.every((s) => s.length === 7)).toBe(true);
    const ultimas = cal.semanas[cal.semanas.length - 1];
    expect(ultimas?.some((c) => c.fecha === '2026-12-31')).toBe(true);
    expect(cal.semanas[0]?.[0]?.fecha).toBe('2026-11-30');
  });

  it('dado enero 2027 cuando se arma entonces el titulo es Enero 2027 y arranca en el lunes 28/12', () => {
    const cal = miniCalendario(2027, 1, '2026-12-28', '2026-12-30');
    expect(cal.titulo).toBe('Enero 2027');
    expect(cal.semanas[0]?.[0]?.fecha).toBe('2026-12-28');
  });
});

describe('asignarCarriles (turnos simultaneos en el mismo dia)', () => {
  const t = (id: string, ini: string, fin: string) =>
    turno({ id, inicioLocal: `2026-12-01T${ini}:00`, finLocal: `2026-12-01T${fin}:00` });

  it('dado turnos que no se superponen cuando se asignan carriles entonces cada uno ocupa el ancho completo', () => {
    const r = asignarCarriles([t('a', '10:00', '10:30'), t('b', '10:30', '11:00')]);
    expect(r.get('a')).toEqual({ carril: 0, carriles: 1 });
    expect(r.get('b')).toEqual({ carril: 0, carriles: 1 });
  });

  it('dado dos turnos simultaneos de distinto profesional cuando se asignan carriles entonces se reparten en 2 carriles', () => {
    const r = asignarCarriles([t('a', '10:00', '10:45'), t('b', '10:15', '11:00')]);
    expect(r.get('a')).toEqual({ carril: 0, carriles: 2 });
    expect(r.get('b')).toEqual({ carril: 1, carriles: 2 });
  });

  it('dado un turno largo y dos cortos consecutivos que lo cruzan cuando se asignan carriles entonces los cortos comparten el segundo carril', () => {
    const r = asignarCarriles([t('l', '10:00', '12:00'), t('c1', '10:00', '10:30'), t('c2', '10:30', '11:00')]);
    expect(r.get('l')?.carriles).toBe(2);
    expect(r.get('c1')).toEqual({ carril: 1, carriles: 2 });
    expect(r.get('c2')).toEqual({ carril: 1, carriles: 2 });
  });

  it('dado un grupo simultaneo y otro posterior aislado cuando se asignan carriles entonces el aislado no se achica', () => {
    const r = asignarCarriles([t('a', '10:00', '10:30'), t('b', '10:00', '10:30'), t('c', '12:00', '12:30')]);
    expect(r.get('a')?.carriles).toBe(2);
    expect(r.get('c')).toEqual({ carril: 0, carriles: 1 });
  });

  it('dado ningun turno cuando se asignan carriles entonces el mapa esta vacio', () => {
    expect(asignarCarriles([]).size).toBe(0);
  });
});

// spec: panel-reemplaza-agenda-vieja
describe('terminoAntesDe (atenuar horarios pasados)', () => {
  const ahora = Date.parse('2026-12-01T11:00:00-03:00');

  it('dado un turno que termina a las 10:30 cuando son las 11:00 entonces ya termino', () => {
    const t = turno({ inicioLocal: '2026-12-01T10:00:00', finLocal: '2026-12-01T10:30:00' });
    expect(terminoAntesDe(t, ahora)).toBe(true);
  });

  it('dado un turno que termina justo a las 11:00 cuando son las 11:00 entonces ya termino (intervalo [inicio, fin))', () => {
    const t = turno({ inicioLocal: '2026-12-01T10:30:00', finLocal: '2026-12-01T11:00:00' });
    expect(terminoAntesDe(t, ahora)).toBe(true);
  });

  it('dado un turno que empieza a las 11:30 cuando son las 11:00 entonces no termino', () => {
    const t = turno({ inicioLocal: '2026-12-01T11:30:00', finLocal: '2026-12-01T12:00:00' });
    expect(terminoAntesDe(t, ahora)).toBe(false);
  });

  it('dado un turno en curso (10:45 a 11:15) cuando son las 11:00 entonces no termino', () => {
    const t = turno({ inicioLocal: '2026-12-01T10:45:00', finLocal: '2026-12-01T11:15:00' });
    expect(terminoAntesDe(t, ahora)).toBe(false);
  });
});

describe('nombreAccesible con origen, sena y fin pasado', () => {
  const nombres = { paciente: 'Paciente Ficticio Uno', prestacion: 'Control y limpieza' };
  const base = { inicioLocal: '2026-12-01T10:00:00', finLocal: '2026-12-01T10:30:00' };

  it('dado un turno con origen whatsapp cuando se pide el nombre accesible entonces incluye reservado por WhatsApp', () => {
    const t = turno({ ...base, origen: 'whatsapp' });
    expect(nombreAccesible(t, nombres)).toContain('reservado por WhatsApp');
  });

  it('dado un turno con origen recepcion o sin origen cuando se pide el nombre accesible entonces no menciona WhatsApp', () => {
    expect(nombreAccesible(turno({ ...base, origen: 'recepcion' }), nombres)).not.toContain('WhatsApp');
    expect(nombreAccesible(turno(base), nombres)).not.toContain('WhatsApp');
  });

  it('dado un turno senado cuando se pide el nombre accesible entonces dice senado y sin sena no lo dice', () => {
    expect(nombreAccesible(turno({ ...base, senado: true }), nombres)).toContain('señado');
    expect(nombreAccesible(turno(base), nombres)).not.toContain('señado');
  });

  it('dado un turno terminado cuando se pasa la hora actual entonces incluye ya termino, y si no se pasa no', () => {
    const t = turno(base);
    expect(nombreAccesible(t, nombres, Date.parse('2026-12-01T11:00:00-03:00'))).toContain('ya terminó');
    expect(nombreAccesible(t, nombres, Date.parse('2026-12-01T10:15:00-03:00'))).not.toContain('ya terminó');
    expect(nombreAccesible(t, nombres)).not.toContain('ya terminó');
  });
});

describe('validarNuevoTurno', () => {
  const completo = {
    pacienteId: 'pac-01',
    prestacionId: 'prest-control',
    profesionalId: 'prof-1',
    sillonId: 'sillon-1',
    fecha: '2026-12-01',
    hora: '10:00',
  };

  it('dado datos completos cuando se valida entonces arma el cuerpo con inicio ISO -03:00', () => {
    expect(validarNuevoTurno(completo)).toEqual({
      ok: true,
      errores: {},
      datos: {
        pacienteId: 'pac-01',
        prestacionId: 'prest-control',
        profesionalId: 'prof-1',
        sillonId: 'sillon-1',
        inicio: '2026-12-01T10:00:00-03:00',
      },
    });
  });

  it('dado que falta el paciente cuando se valida entonces hay un error en ese campo y no hay datos', () => {
    const r = validarNuevoTurno({ ...completo, pacienteId: '' });
    expect(r.ok).toBe(false);
    expect(Object.keys(r.errores)).toEqual(['pacienteId']);
    expect(r.errores.pacienteId).toBe('Elegí un paciente.');
    expect(r.datos).toBeUndefined();
  });

  it('dado un formulario vacio cuando se valida entonces marca los seis campos', () => {
    const r = validarNuevoTurno({});
    expect(Object.keys(r.errores).sort()).toEqual(
      ['fecha', 'hora', 'pacienteId', 'prestacionId', 'profesionalId', 'sillonId'],
    );
  });

  it('dado el borde 19:45 cuando se valida entonces es valido, y 20:00 o 10:10 no', () => {
    expect(validarNuevoTurno({ ...completo, hora: '19:45' }).ok).toBe(true);
    expect(validarNuevoTurno({ ...completo, hora: '08:00' }).ok).toBe(true);
    expect(validarNuevoTurno({ ...completo, hora: '20:00' }).errores.hora).toBeDefined();
    expect(validarNuevoTurno({ ...completo, hora: '10:10' }).errores.hora).toBeDefined();
  });

  it('dado una fecha mal formada cuando se valida entonces marca la fecha', () => {
    expect(validarNuevoTurno({ ...completo, fecha: '01/12/2026' }).errores.fecha).toBeDefined();
  });

  it('dado HORAS_DE_TURNO cuando se listan entonces van de 08:00 a 19:45 cada 15 minutos', () => {
    expect(HORAS_DE_TURNO).toHaveLength(48);
    expect(HORAS_DE_TURNO[0]).toBe('08:00');
    expect(HORAS_DE_TURNO[1]).toBe('08:15');
    expect(HORAS_DE_TURNO[47]).toBe('19:45');
  });
});

describe('formatearRegistro', () => {
  const ev = (fecha: string, mensaje: string) => ({ fecha, usuarioId: 'u-recepcion', rol: 'recepcion', mensaje });

  it('dado una lista vacia cuando se formatea entonces avisa que no hay acciones', () => {
    expect(formatearRegistro([])).toEqual({ vacio: true, textoVacio: 'Todavía no hay acciones registradas.', items: [] });
  });

  it('dado eventos desordenados cuando se formatea entonces van del mas reciente al mas antiguo con dd/mm HH:mm de Argentina', () => {
    const r = formatearRegistro([
      ev('2026-12-01T13:00:00.000Z', 'primero'),
      ev('2026-12-01T15:30:00.000Z', 'ultimo'),
      ev('2026-12-01T14:05:00.000Z', 'medio'),
    ]);
    expect(r.vacio).toBe(false);
    expect(r.items.map((i) => i.mensaje)).toEqual(['ultimo', 'medio', 'primero']);
    expect(r.items.map((i) => i.fecha)).toEqual(['01/12 12:30', '01/12 11:05', '01/12 10:00']);
  });

  it('dado una medianoche UTC cuando se formatea entonces usa el dia de Argentina', () => {
    expect(formatearRegistro([ev('2026-12-02T02:00:00.000Z', 'x')]).items[0]?.fecha).toBe('01/12 23:00');
  });

  it('dado mas de 10 eventos cuando se formatea entonces devuelve solo los 10 mas recientes', () => {
    const muchos = Array.from({ length: 12 }, (_, i) => ev(`2026-12-01T${String(10 + i).padStart(2, '0')}:00:00.000Z`, `e${i}`));
    const r = formatearRegistro(muchos);
    expect(r.items).toHaveLength(10);
    expect(r.items[0]?.mensaje).toBe('e11');
    expect(r.items[9]?.mensaje).toBe('e2');
  });

  it('dado eventos con la misma fecha cuando se formatea entonces el ultimo registrado va primero', () => {
    const r = formatearRegistro([ev('2026-12-01T13:00:00.000Z', 'a'), ev('2026-12-01T13:00:00.000Z', 'b')]);
    expect(r.items.map((i) => i.mensaje)).toEqual(['b', 'a']);
  });
});
