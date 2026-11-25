/**
 * Conversacion del bot de WhatsApp SIMULADO (design D1/D2): maquina de estados pura.
 * No hace I/O ni lee el reloj: cuando necesita datos o escribir en la agenda declara un Efecto
 * que bot.ts ejecuta con los casos de uso reales, y luego llama a resolver() con el resultado.
 */

export interface PrestacionCatalogo {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
}
export interface ProfesionalCatalogo {
  readonly id: string;
  readonly nombre: string;
}
export interface Catalogo {
  readonly prestaciones: readonly PrestacionCatalogo[];
  readonly profesionales: readonly ProfesionalCatalogo[];
}

export interface HuecoOfrecido {
  readonly inicio: Date;
  readonly sillonId: string;
}

export interface TurnoResumen {
  readonly id: string;
  readonly inicio: Date;
  readonly prestacion: string;
  readonly profesional: string;
  readonly estado: string;
}

export interface Opcion {
  readonly id: string;
  readonly etiqueta: string;
}
export interface Mensaje {
  readonly texto: string;
  readonly tarjeta?: { readonly titulo: string; readonly lineas: readonly string[] };
}
export interface Respuesta {
  readonly mensajes: readonly Mensaje[];
  readonly opciones: readonly Opcion[];
  readonly pideTexto: boolean;
}

export type Paso =
  | 'inicio'
  | 'menu'
  | 'tipo'
  | 'profesional'
  | 'horarios'
  | 'datos'
  | 'gestion'
  | 'confirmarCancelacion'
  | 'fin'
  | 'esperando';

export type Efecto =
  | {
      readonly tipo: 'buscarHuecos';
      readonly prestacionId: string;
      readonly profesionalId: string;
      /** 'YYYY-MM-DD' desde donde buscar; sin valor = la fecha del reloj. */
      readonly desdeFecha?: string;
    }
  | { readonly tipo: 'identificarPorTelefono' }
  | { readonly tipo: 'identificarPorDatos'; readonly nombre: string; readonly dni: string }
  | {
      readonly tipo: 'reservar';
      readonly pacienteId: string;
      readonly prestacionId: string;
      readonly profesionalId: string;
      readonly sillonId: string;
      readonly inicio: Date;
    }
  | { readonly tipo: 'buscarProximoTurno'; readonly modo: 'ver' | 'recordatorio' }
  | { readonly tipo: 'confirmar'; readonly turnoId: string }
  | { readonly tipo: 'cancelar'; readonly turnoId: string };

export type ResultadoEfecto =
  | { readonly tipo: 'buscarHuecos'; readonly fecha?: string; readonly huecos: readonly HuecoOfrecido[] }
  | { readonly tipo: 'identificarPorTelefono'; readonly pacienteId?: string }
  | { readonly tipo: 'identificarPorDatos'; readonly pacienteId?: string; readonly error?: string }
  | { readonly tipo: 'reservar'; readonly turno?: TurnoResumen; readonly regla?: string }
  | { readonly tipo: 'buscarProximoTurno'; readonly turno?: TurnoResumen; readonly nombrePaciente?: string }
  | { readonly tipo: 'confirmar'; readonly regla?: string }
  | { readonly tipo: 'cancelar'; readonly regla?: string };

export type Entrada =
  | { readonly tipo: 'texto'; readonly texto: string }
  | { readonly tipo: 'opcion'; readonly id: string }
  | { readonly tipo: 'recordatorio' };

/** Aviso que se antepone a la proxima oferta de horarios tras un 409. */
type AvisoHorarios = 'ocupado' | 'pacienteOcupado';

export interface Sesion {
  readonly paso: Paso;
  /** Ultima respuesta mostrada: se repite ante una entrada no reconocida. */
  readonly ultima?: Respuesta;
  readonly efectoPendiente?: Efecto;
  readonly prestacion?: PrestacionCatalogo;
  readonly profesional?: ProfesionalCatalogo;
  readonly fechaMostrada?: string;
  readonly huecos?: readonly HuecoOfrecido[];
  readonly elegido?: HuecoOfrecido;
  readonly turno?: TurnoResumen;
  readonly aviso?: AvisoHorarios;
}

export type Salida = { readonly sesion: Sesion; readonly respuesta: Respuesta } | { readonly sesion: Sesion; readonly efecto: Efecto };

export const MAX_HORARIOS = 3;
const OFFSET_MS = 3 * 60 * 60 * 1000; // America/Argentina/Buenos_Aires, UTC-03:00 fijo
const DIA_MS = 24 * 60 * 60 * 1000;
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

const OP = {
  pedir: { id: 'pedir', etiqueta: 'Pedir un turno' },
  ver: { id: 'ver', etiqueta: 'Ver o cambiar mi turno' },
  menu: { id: 'menu', etiqueta: 'Volver al menú' },
  mas: { id: 'mas', etiqueta: 'Ver más días' },
  confirmar: { id: 'confirmar', etiqueta: 'Confirmo' },
  cambiar: { id: 'cambiar', etiqueta: 'Necesito cambiarlo' },
  cancelar: { id: 'cancelar', etiqueta: 'Cancelar turno' },
  cancelarSi: { id: 'cancelar-si', etiqueta: 'Sí, cancelar' },
  cancelarNo: { id: 'cancelar-no', etiqueta: 'No' },
} as const satisfies Record<string, Opcion>;

const EJEMPLO_DATOS = 'Ej.: Paciente Ficticio Once, 99.000.011';

export function nuevaSesion(): Sesion {
  return { paso: 'inicio' };
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

/** 'Lun 30/11 09:00' en hora del consultorio. */
export function etiquetaHorario(inicio: Date): string {
  const l = new Date(inicio.getTime() - OFFSET_MS);
  return `${DIAS[l.getUTCDay()]} ${l.getUTCDate()}/${l.getUTCMonth() + 1} ${dosDigitos(l.getUTCHours())}:${dosDigitos(l.getUTCMinutes())}`;
}

/** Fecha 'YYYY-MM-DD' siguiente a la dada. */
export function diaSiguiente(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const f = new Date(Date.UTC(a ?? 0, (m ?? 1) - 1, d ?? 1) + DIA_MS);
  return `${f.getUTCFullYear()}-${dosDigitos(f.getUTCMonth() + 1)}-${dosDigitos(f.getUTCDate())}`;
}

function responder(sesion: Sesion, paso: Paso, r: Respuesta): Salida {
  return { sesion: { ...sesion, paso, ultima: r, efectoPendiente: undefined }, respuesta: r };
}
function declarar(sesion: Sesion, efecto: Efecto): Salida {
  return { sesion: { ...sesion, paso: 'esperando', efectoPendiente: efecto }, efecto };
}
function msg(texto: string): Mensaje {
  return { texto };
}

/** Vuelve al menu con una sesion limpia. */
function menu(): Salida {
  return responder({ paso: 'menu' }, 'menu', {
    mensajes: [msg('Hola, soy el asistente del consultorio. ¿En qué te puedo ayudar?')],
    opciones: [OP.pedir, OP.ver],
    pideTexto: false,
  });
}

function noEntendi(sesion: Sesion): Salida {
  const ultima = sesion.ultima;
  if (ultima === undefined) return menu();
  return {
    sesion,
    respuesta: {
      mensajes: [msg('No entendí. Elegí una de las opciones:')],
      opciones: ultima.opciones,
      pideTexto: ultima.pideTexto,
    },
  };
}

function normalizar(t: string): string {
  return t
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s]/g, '')
    .trim();
}

function pideMenu(t: string): boolean {
  const n = normalizar(t);
  return n === 'menu' || n === 'hola' || n.startsWith('hola ');
}

function tiposDeConsulta(catalogo: Catalogo): readonly PrestacionCatalogo[] {
  // Urgencia del dia (US-053) fuera de alcance de C-06.
  return catalogo.prestaciones.filter((p) => p.codigo !== 'urg');
}

function lineaTurno(t: TurnoResumen): string {
  return `${etiquetaHorario(t.inicio)} · ${t.prestacion} · ${t.profesional}`;
}

function opcionesTurno(): readonly Opcion[] {
  return [OP.confirmar, OP.cambiar, OP.cancelar];
}

function mostrarTurno(sesion: Sesion, turno: TurnoResumen, encabezado: string, pie?: string): Salida {
  const texto = [encabezado, lineaTurno(turno), ...(pie === undefined ? [] : [pie])].join('\n');
  return responder({ ...sesion, turno }, 'gestion', {
    mensajes: [msg(texto)],
    opciones: opcionesTurno(),
    pideTexto: false,
  });
}

function fin(sesion: Sesion, mensajes: readonly Mensaje[]): Salida {
  return responder(sesion, 'fin', { mensajes, opciones: [OP.menu], pideTexto: false });
}

function pedirDatos(sesion: Sesion, motivo?: string): Salida {
  const texto =
    motivo === undefined
      ? `Genial. ¿Me pasás tu nombre completo y DNI?\n${EJEMPLO_DATOS}`
      : `${motivo}\nEscribilos así: ${EJEMPLO_DATOS.replace('Ej.: ', '')}`;
  return responder(sesion, 'datos', { mensajes: [msg(texto)], opciones: [], pideTexto: true });
}

/** '<nombre>, <DNI>' con la ultima coma como separador y DNI ficticio 99xxxxxx (design D4). */
function parsearDatos(t: string): { nombre: string; dni: string } | { error: string } {
  const i = t.lastIndexOf(',');
  if (i < 0) return { error: 'No pude leer los datos.' };
  const nombre = t.slice(0, i).trim();
  const dni = t.slice(i + 1).trim().replace(/\./g, '');
  if (nombre.length < 3 || !/^\d{8}$/.test(dni)) return { error: 'No pude leer los datos.' };
  if (!dni.startsWith('99')) return { error: 'El DNI debe ser ficticio y empezar con 99 (99.xxx.xxx).' };
  return { nombre, dni };
}

function buscarHuecos(sesion: Sesion, desdeFecha?: string): Salida {
  const { prestacion, profesional } = sesion;
  if (prestacion === undefined || profesional === undefined) return menu();
  return declarar(sesion, {
    tipo: 'buscarHuecos',
    prestacionId: prestacion.id,
    profesionalId: profesional.id,
    ...(desdeFecha === undefined ? {} : { desdeFecha }),
  });
}

/** Paso con la entrada del paciente. */
export function avanzar(sesion: Sesion, entrada: Entrada, catalogo: Catalogo): Salida {
  if (entrada.tipo === 'recordatorio') return declarar({ paso: 'inicio' }, { tipo: 'buscarProximoTurno', modo: 'recordatorio' });
  if (entrada.tipo === 'texto') {
    if (sesion.paso === 'inicio' || pideMenu(entrada.texto)) return menu();
    if (sesion.paso !== 'datos') return noEntendi(sesion);
    const datos = parsearDatos(entrada.texto);
    if ('error' in datos) return pedirDatos(sesion, datos.error);
    return declarar(sesion, { tipo: 'identificarPorDatos', nombre: datos.nombre, dni: datos.dni });
  }

  const id = entrada.id;
  if (id === OP.menu.id) return menu();
  switch (sesion.paso) {
    case 'menu':
      if (id === OP.pedir.id) {
        return responder(sesion, 'tipo', {
          mensajes: [msg('¿Qué tipo de consulta necesitás?')],
          opciones: tiposDeConsulta(catalogo).map((p) => ({ id: `prest:${p.id}`, etiqueta: p.nombre })),
          pideTexto: false,
        });
      }
      if (id === OP.ver.id) return declarar(sesion, { tipo: 'buscarProximoTurno', modo: 'ver' });
      break;
    case 'fin':
      if (id === OP.pedir.id) return avanzar({ ...sesion, paso: 'menu' }, entrada, catalogo);
      break;
    case 'tipo': {
      const p = tiposDeConsulta(catalogo).find((x) => `prest:${x.id}` === id);
      if (p !== undefined) {
        return responder({ ...sesion, prestacion: p }, 'profesional', {
          mensajes: [msg('¿Con qué profesional?')],
          opciones: catalogo.profesionales.map((x) => ({ id: `prof:${x.id}`, etiqueta: x.nombre })),
          pideTexto: false,
        });
      }
      break;
    }
    case 'profesional': {
      const p = catalogo.profesionales.find((x) => `prof:${x.id}` === id);
      if (p !== undefined) return buscarHuecos({ ...sesion, profesional: p, aviso: undefined });
      break;
    }
    case 'horarios': {
      if (id === OP.mas.id && sesion.fechaMostrada !== undefined) {
        return buscarHuecos({ ...sesion, aviso: undefined }, diaSiguiente(sesion.fechaMostrada));
      }
      const m = /^hueco:(\d+)$/.exec(id);
      const elegido = m === null ? undefined : sesion.huecos?.[Number(m[1])];
      if (elegido !== undefined) return declarar({ ...sesion, elegido }, { tipo: 'identificarPorTelefono' });
      break;
    }
    case 'gestion': {
      const turno = sesion.turno;
      if (turno === undefined) break;
      if (id === OP.confirmar.id) return declarar(sesion, { tipo: 'confirmar', turnoId: turno.id });
      if (id === OP.cambiar.id) {
        const sigue = turno.estado === 'confirmado' ? 'confirmado' : 'reservado';
        return fin(sesion, [msg(`Para cambiar el turno comunicate con recepción. Tu turno sigue ${sigue}.`)]);
      }
      if (id === OP.cancelar.id) {
        return responder(sesion, 'confirmarCancelacion', {
          mensajes: [msg(`¿Querés cancelar el turno del ${etiquetaHorario(turno.inicio)}?`)],
          opciones: [OP.cancelarSi, OP.cancelarNo],
          pideTexto: false,
        });
      }
      break;
    }
    case 'confirmarCancelacion': {
      const turno = sesion.turno;
      if (turno === undefined) break;
      if (id === OP.cancelarSi.id) return declarar(sesion, { tipo: 'cancelar', turnoId: turno.id });
      if (id === OP.cancelarNo.id) return mostrarTurno(sesion, turno, 'Tu próximo turno es:');
      break;
    }
    default:
      break;
  }
  return noEntendi(sesion);
}

/** Paso con el resultado del efecto declarado (bot.ts lo ejecuto con los casos de uso). */
export function resolver(sesion: Sesion, resultado: ResultadoEfecto, catalogo: Catalogo): Salida {
  void catalogo;
  switch (resultado.tipo) {
    case 'buscarHuecos': {
      const huecos = resultado.huecos.slice(0, MAX_HORARIOS);
      if (resultado.fecha === undefined || huecos.length === 0) {
        return fin(sesion, [msg('No hay horarios libres en las próximas 2 semanas para esa consulta.')]);
      }
      const intro =
        sesion.aviso === 'ocupado'
          ? 'Ese horario ya se ocupó. Te muestro otros:'
          : sesion.aviso === 'pacienteOcupado'
            ? 'Ya tenés otro turno a esa hora. Elegí otro horario:'
            : 'Estos son los próximos horarios libres:';
      return responder({ ...sesion, huecos, fechaMostrada: resultado.fecha, aviso: undefined }, 'horarios', {
        mensajes: [msg(intro)],
        opciones: [...huecos.map((h, i) => ({ id: `hueco:${i}`, etiqueta: etiquetaHorario(h.inicio) })), OP.mas],
        pideTexto: false,
      });
    }
    case 'identificarPorTelefono':
    case 'identificarPorDatos': {
      if (resultado.pacienteId === undefined) {
        return pedirDatos(sesion, resultado.tipo === 'identificarPorDatos' ? resultado.error ?? 'No pude registrar tus datos.' : undefined);
      }
      const { prestacion, profesional, elegido } = sesion;
      if (prestacion === undefined || profesional === undefined || elegido === undefined) return menu();
      return declarar(sesion, {
        tipo: 'reservar',
        pacienteId: resultado.pacienteId,
        prestacionId: prestacion.id,
        profesionalId: profesional.id,
        sillonId: elegido.sillonId,
        inicio: elegido.inicio,
      });
    }
    case 'reservar': {
      const t = resultado.turno;
      if (t !== undefined) {
        return fin(sesion, [
          {
            texto: 'Listo, ya te anoté.',
            tarjeta: {
              titulo: 'Turno reservado',
              lineas: [etiquetaHorario(t.inicio), `${t.prestacion} · ${t.profesional}`, 'Te escribo 24 h antes para confirmar.'],
            },
          },
        ]);
      }
      const aviso: AvisoHorarios = resultado.regla === 'RN-AG-05' ? 'pacienteOcupado' : 'ocupado';
      return buscarHuecos({ ...sesion, aviso }, sesion.fechaMostrada);
    }
    case 'buscarProximoTurno': {
      const modo = sesion.efectoPendiente?.tipo === 'buscarProximoTurno' ? sesion.efectoPendiente.modo : 'ver';
      const t = resultado.turno;
      if (t === undefined) {
        const texto =
          modo === 'recordatorio' ? 'No hay turnos próximos para este número.' : 'No encontré turnos próximos para este número. ¿Querés pedir uno?';
        return responder(sesion, 'fin', { mensajes: [msg(texto)], opciones: [OP.pedir], pideTexto: false });
      }
      if (modo === 'recordatorio') {
        const saludo = resultado.nombrePaciente === undefined ? 'Hola' : `Hola ${resultado.nombrePaciente}`;
        return mostrarTurno(sesion, t, `${saludo}, te recordamos tu turno:`, '¿Confirmás tu asistencia?');
      }
      return mostrarTurno(sesion, t, 'Tu próximo turno es:');
    }
    case 'confirmar': {
      const t = sesion.turno;
      if (resultado.regla === 'RN-AG-09') return fin(sesion, [msg('Tu turno ya estaba confirmado.')]);
      if (resultado.regla !== undefined || t === undefined) return fin(sesion, [msg('No pude confirmar el turno. Comunicate con recepción.')]);
      return fin({ ...sesion, turno: { ...t, estado: 'confirmado' } }, [
        { texto: 'Gracias por avisar.', tarjeta: { titulo: 'Turno confirmado', lineas: [etiquetaHorario(t.inicio), '¡Gracias! Te esperamos.'] } },
      ]);
    }
    case 'cancelar': {
      const t = sesion.turno;
      if (resultado.regla === 'RN-AG-06') {
        return fin(sesion, [msg('Faltan menos de 24 h para tu turno: para cancelarlo comunicate con recepción.')]);
      }
      if (resultado.regla !== undefined || t === undefined) return fin(sesion, [msg('No pude cancelar el turno. Comunicate con recepción.')]);
      return fin(sesion, [
        { texto: 'Listo.', tarjeta: { titulo: 'Turno cancelado', lineas: [etiquetaHorario(t.inicio), 'Si querés, pedí otro turno cuando quieras.'] } },
      ]);
    }
  }
}
