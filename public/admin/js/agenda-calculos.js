// Cálculos puros de la agenda del panel (design D9): semanas, posición de bloques, filtros y
// mini-calendario. Sin DOM ni red. Zona fija America/Argentina/Buenos_Aires = UTC-03:00.
import { puedeEmitirFactura } from './permisos-ui.js';

const OFFSET_MIN = 3 * 60;
const MIN_POR_FILA = 15;
const DIA_MS = 24 * 60 * 60 * 1000;
const NOMBRES_DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const ETIQUETAS_ESTADO = {
  reservado: 'Sin confirmar',
  confirmado: 'Confirmado',
  atendido: 'Atendido',
  ausente: 'Ausente',
};

const dos = (n) => String(n).padStart(2, '0');

function aMs(fecha) {
  const [a, m, d] = fecha.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}

function deMs(ms) {
  const f = new Date(ms);
  return `${f.getUTCFullYear()}-${dos(f.getUTCMonth() + 1)}-${dos(f.getUTCDate())}`;
}

/** Suma (o resta) días a una fecha 'YYYY-MM-DD'. */
export function sumarDias(fecha, n) {
  return deMs(aMs(fecha) + n * DIA_MS);
}

/** Lunes de la semana (Lunes a Domingo) que contiene a `fecha`. */
export function lunesDeLaSemana(fecha) {
  const diaSemana = new Date(aMs(fecha)).getUTCDay(); // 0 = domingo
  return sumarDias(fecha, -(diaSemana === 0 ? 6 : diaSemana - 1));
}

/** Rango a pedir a GET /api/turnos: lunes 00:00 a lunes siguiente 00:00, con -03:00. */
export function rangoDeSemana(lunes) {
  return {
    desde: `${lunes}T00:00:00-03:00`,
    hasta: `${sumarDias(lunes, 7)}T00:00:00-03:00`,
  };
}

/** Los 7 días de la semana: nombre, fecha, 'dd/mm' e índice de columna. */
export function diasDeSemana(lunes) {
  return NOMBRES_DIAS.map((nombre, indice) => {
    const fecha = sumarDias(lunes, indice);
    return { nombre, fecha, corta: `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`, indice };
  });
}

/** '30/11 – 06/12/2026'. */
export function etiquetaSemana(lunes) {
  const domingo = sumarDias(lunes, 6);
  const corta = (f) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;
  return `${corta(lunes)} – ${corta(domingo)}/${domingo.slice(0, 4)}`;
}

/** Instante ISO → { fecha 'YYYY-MM-DD', minutos desde las 00:00 } en hora del consultorio. */
export function aHoraLocal(iso) {
  const local = new Date(Date.parse(iso) - OFFSET_MIN * 60 * 1000);
  return {
    fecha: deMs(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())),
    minutos: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}

/** Minutos del día → 'HH:mm'. */
export function hhmm(minutos) {
  return `${dos(Math.floor(minutos / 60))}:${dos(minutos % 60)}`;
}

/** Columna (0 = lunes), fila (0 = inicio de la grilla) y alto en filas de 15 min; undefined si cae fuera de la semana. */
export function posicionBloque(turno, lunes, inicioGrillaMin) {
  const inicio = aHoraLocal(turno.inicio);
  const columna = Math.round((aMs(inicio.fecha) - aMs(lunes)) / DIA_MS);
  if (columna < 0 || columna > 6) return undefined;
  const duracionMin = (Date.parse(turno.fin) - Date.parse(turno.inicio)) / 60000;
  return {
    columna,
    fila: Math.floor((inicio.minutos - inicioGrillaMin) / MIN_POR_FILA),
    filas: Math.max(1, Math.round(duracionMin / MIN_POR_FILA)),
  };
}

/** Horas visibles de la grilla: 08:00-20:00 como mínimo, ampliadas a horas completas si hace falta. */
export function limitesGrilla(turnos, minimo = 8 * 60, maximo = 20 * 60) {
  let inicioMin = minimo;
  let finMin = maximo;
  for (const t of turnos) {
    const ini = aHoraLocal(t.inicio).minutos;
    const fin = aHoraLocal(t.fin).minutos;
    inicioMin = Math.min(inicioMin, Math.floor(ini / 60) * 60);
    finMin = Math.max(finMin, Math.ceil(fin / 60) * 60);
  }
  return { inicioMin, finMin };
}

/** Un filtro vacío o indefinido no filtra. */
export function filtrarTurnos(turnos, filtros) {
  const { profesionalId, sillonId, estado } = filtros ?? {};
  return turnos.filter(
    (t) =>
      (!profesionalId || t.profesionalId === profesionalId) &&
      (!sillonId || t.sillonId === sillonId) &&
      (!estado || t.estado === estado),
  );
}

export function etiquetaEstado(estado) {
  return ETIQUETAS_ESTADO[estado] ?? estado;
}

/** ¿El intervalo [inicio, fin) del turno ya terminó a `ahoraMs`? Un turno que termina justo ahora ya terminó. */
export function terminoAntesDe(turno, ahoraMs) {
  return Date.parse(turno.fin) <= ahoraMs;
}

/** Nombre accesible de un bloque: el estado va en texto, no solo en color. `ahoraMs` es opcional. */
export function nombreAccesible(turno, nombres, ahoraMs) {
  const inicio = aHoraLocal(turno.inicio);
  const fin = aHoraLocal(turno.fin);
  const dia = NOMBRES_DIAS[(new Date(aMs(inicio.fecha)).getUTCDay() + 6) % 7];
  const partes = [
    `${dia} ${hhmm(inicio.minutos)} a ${hhmm(fin.minutos)}`,
    nombres.paciente,
    nombres.prestacion,
    etiquetaEstado(turno.estado).toLowerCase(),
  ];
  if (turno.origen === 'whatsapp') partes.push('reservado por WhatsApp');
  if (turno.senado) partes.push('señado');
  if (ahoraMs !== undefined && terminoAntesDe(turno, ahoraMs)) partes.push('ya terminó');
  return partes.join(', ');
}

/** Horas de inicio ofrecidas al crear un turno: 08:00 a 19:45 cada 15 minutos. */
export const HORAS_DE_TURNO = Array.from({ length: 48 }, (_, i) => hhmm(8 * 60 + i * MIN_POR_FILA));

const CAMPOS_NUEVO_TURNO = [
  ['pacienteId', 'Elegí un paciente.'],
  ['prestacionId', 'Elegí una prestación.'],
  ['profesionalId', 'Elegí un profesional.'],
  ['sillonId', 'Elegí un sillón.'],
];

/**
 * Valida el formulario "Nuevo turno" (solo campos completos; las reglas RN-AG las valida el servidor).
 * @returns {{ ok: boolean, errores: Record<string, string>, datos?: object }}
 */
export function validarNuevoTurno(campos) {
  const errores = {};
  for (const [campo, mensaje] of CAMPOS_NUEVO_TURNO) {
    if (typeof campos?.[campo] !== 'string' || campos[campo].trim() === '') errores[campo] = mensaje;
  }
  const fecha = campos?.fecha;
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) errores.fecha = 'Elegí una fecha.';
  const hora = campos?.hora;
  if (typeof hora !== 'string' || hora === '') errores.hora = 'Elegí una hora.';
  else if (!HORAS_DE_TURNO.includes(hora)) errores.hora = 'Elegí una hora entre 08:00 y 19:45, cada 15 minutos.';
  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return {
    ok: true,
    errores: {},
    datos: {
      pacienteId: campos.pacienteId,
      prestacionId: campos.prestacionId,
      profesionalId: campos.profesionalId,
      sillonId: campos.sillonId,
      inicio: `${fecha}T${hora}:00-03:00`,
    },
  };
}

const MAX_REGISTRO = 10;
const FORMATO_REGISTRO = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Últimos 10 eventos del registro, del más reciente al más antiguo, con 'dd/mm HH:mm' de Argentina. */
export function formatearRegistro(eventos) {
  const items = eventos
    .map((e, orden) => ({ e, orden, ms: Date.parse(e.fecha) }))
    .sort((a, b) => b.ms - a.ms || b.orden - a.orden)
    .slice(0, MAX_REGISTRO)
    .map(({ e, ms }) => {
      const partes = Object.fromEntries(FORMATO_REGISTRO.formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
      return { fecha: `${dos(partes.day)}/${dos(partes.month)} ${dos(partes.hour)}:${dos(partes.minute)}`, mensaje: e.mensaje };
    });
  return { vacio: items.length === 0, textoVacio: 'Todavía no hay acciones registradas.', items };
}

/** Mini-calendario mensual (semanas de lunes a domingo) con la semana elegida y hoy marcados. */
export function miniCalendario(anio, mes, lunesSeleccionado, hoy) {
  const primero = `${anio}-${dos(mes)}-01`;
  const ultimo = deMs(Date.UTC(anio, mes, 0)); // día 0 del mes siguiente = último de este
  const finSeleccion = sumarDias(lunesSeleccionado, 6);
  const semanas = [];
  let lunes = lunesDeLaSemana(primero);
  while (lunes <= ultimo) {
    const fila = [];
    for (let i = 0; i < 7; i++) {
      const fecha = sumarDias(lunes, i);
      fila.push({
        fecha,
        dia: Number(fecha.slice(8, 10)),
        fueraDeMes: fecha < primero || fecha > ultimo,
        esHoy: fecha === hoy,
        enSemana: fecha >= lunesSeleccionado && fecha <= finSeleccion,
      });
    }
    semanas.push(fila);
    lunes = sumarDias(lunes, 7);
  }
  return { titulo: `${NOMBRES_MESES[mes - 1]} ${anio}`, semanas };
}

/** Fecha local 'YYYY-MM-DD' de un instante (o la actual del navegador si se omite). */
export function fechaLocalDe(instante) {
  return aHoraLocal(instante ?? new Date().toISOString()).fecha;
}

/**
 * Reparte en carriles (columnas) los turnos de un mismo día que se superponen, para que dos sillones
 * ocupados a la vez no se tapen. Devuelve Map id → { carril, carriles } con `carriles` = ancho del grupo.
 */
export function asignarCarriles(turnos) {
  const resultado = new Map();
  const ordenados = [...turnos].sort(
    (a, b) => Date.parse(a.inicio) - Date.parse(b.inicio) || Date.parse(b.fin) - Date.parse(a.fin),
  );
  let grupo = [];
  let finGrupo = -Infinity;
  const cerrar = () => {
    const carriles = grupo.reduce((max, g) => Math.max(max, g.carril + 1), 0);
    for (const g of grupo) resultado.set(g.id, { carril: g.carril, carriles });
    grupo = [];
  };
  const finesPorCarril = [];
  for (const t of ordenados) {
    const ini = Date.parse(t.inicio);
    const fin = Date.parse(t.fin);
    if (ini >= finGrupo) {
      cerrar();
      finesPorCarril.length = 0;
      finGrupo = -Infinity;
    }
    let carril = finesPorCarril.findIndex((f) => f <= ini);
    if (carril === -1) carril = finesPorCarril.length;
    finesPorCarril[carril] = fin;
    finGrupo = Math.max(finGrupo, fin);
    grupo.push({ id: t.id, carril });
  }
  cerrar();
  return resultado;
}

/**
 * Acción "Emitir factura" del detalle del turno (panel-boton-emitir-factura): visible solo para
 * recepción y admin; habilitada solo con el turno atendido, y entonces lleva al simulador de ARCA.
 */
export function accionFactura(rol, turno) {
  if (!puedeEmitirFactura(rol)) return { visible: false, habilitado: false, href: undefined };
  if (turno.estado !== 'atendido') return { visible: true, habilitado: false, href: undefined };
  return { visible: true, habilitado: true, href: `/sim/arca.html?turnoId=${encodeURIComponent(turno.id)}` };
}
