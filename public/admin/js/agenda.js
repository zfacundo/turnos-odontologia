// Agenda semanal (mockups/agenda.html): grilla Lunes-Domingo de 15 min, mini-calendario, filtros y
// drawer de detalle con las acciones que ya expone la API. Cambiar de semana o de filtro no anima.
import {
  accionFactura,
  aHoraLocal,
  asignarCarriles,
  diasDeSemana,
  etiquetaEstado,
  etiquetaSemana,
  fechaLocalDe,
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
} from './agenda-calculos.js';
import { h, icono, mensajeDe, reemplazar } from './dom.js';
import { puedeCrearTurnos, puedeVerOdontograma, puedeVerRegistro } from './permisos-ui.js';

const MIN_FILA = 15;
const ESTADOS_FILTRO = ['reservado', 'confirmado', 'atendido', 'ausente'];
const LEYENDA = [
  ['st-reservado', 'Sin confirmar (reservado)'],
  ['st-confirmado', 'Confirmado'],
  ['st-atendido', 'Atendido'],
  ['st-ausente', 'Ausente'],
];

const nombreLargo = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});
const etiquetaDia = (fecha) => nombreLargo.format(new Date(`${fecha}T00:00:00Z`));

function parametros(rango) {
  return new URLSearchParams({ desde: rango.desde, hasta: rango.hasta }).toString();
}

export async function montarAgenda(contenedor, ctx) {
  const { api, usuario } = ctx;
  const verRegistro = puedeVerRegistro(usuario.rol);
  const puedeCrear = puedeCrearTurnos(usuario.rol);
  ctx.titulo('Agenda', 'Semana del consultorio');

  // "Hoy" sale del reloj del servidor (lo informa GET /api/panel/resumen); el del navegador es el respaldo.
  const hoy = fechaLocalDe();
  const estado = {
    hoy,
    lunes: lunesDeLaSemana(hoy),
    anio: Number(hoy.slice(0, 4)),
    mes: Number(hoy.slice(5, 7)),
    filtros: {
      profesionalId: usuario.rol === 'odontologo' ? (usuario.profesionalId ?? '') : '',
      sillonId: '',
      estado: '',
    },
    turnos: [],
    bloqueos: [],
    catalogo: { profesionales: [], sillones: [], prestaciones: [] },
    pacientes: new Map(),
    registro: undefined,
    cargando: false,
  };

  /* ------------------------- Estructura fija ------------------------- */
  const calTitulo = h('span', { id: 'cal-titulo' });
  const calTabla = h('div');
  const semanaEtiqueta = h('strong', { class: 'num' });
  const cuenta = h('span', { class: 'small muted num', role: 'status' });
  const avisoSemana = h('div', { role: 'status' });
  const errorCarga = h('div', { role: 'alert' });
  const registroLista = h('ul', { class: 'registro', 'aria-live': 'polite' });
  const grilla = h('div', { class: 'grid-wrap', tabindex: '0', 'aria-label': 'Grilla semanal, desplazable' });

  const selProf = h('select', { id: 'f-prof', class: 'select', onChange: () => cambiarFiltro('profesionalId', selProf.value) });
  const selSillon = h('select', { id: 'f-sillon', class: 'select', onChange: () => cambiarFiltro('sillonId', selSillon.value) });
  const selEstado = h(
    'select',
    { id: 'f-estado', class: 'select', onChange: () => cambiarFiltro('estado', selEstado.value) },
    h('option', { value: '' }, 'Todos los estados'),
    ESTADOS_FILTRO.map((e) => h('option', { value: e }, etiquetaEstado(e))),
  );

  const panelIzquierdo = h(
    'section',
    { class: 'card', 'aria-labelledby': 't-cal' },
    h('div', { class: 'panel-head' }, h('span', { id: 't-cal' }, 'Calendario')),
    h(
      'div',
      { class: 'mini-cal-head' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Mes anterior', onClick: () => moverMes(-1) }, '‹'),
      calTitulo,
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Mes siguiente', onClick: () => moverMes(1) }, '›'),
    ),
    calTabla,
    h(
      'ul',
      { class: 'legend', 'aria-label': 'Leyenda de estados' },
      LEYENDA.map(([clase, texto]) => h('li', null, h('span', { class: `swatch ${clase}` }), texto)),
      h(
        'li',
        null,
        h('span', {
          class: 'swatch',
          style: {
            background: 'repeating-linear-gradient(45deg,var(--adm-bloqueo-a, #EEF2F5) 0 4px,var(--adm-bloqueo-b, #E2E9EE) 4px 8px)',
            border: '1px solid var(--adm-line)',
          },
        }),
        'Bloqueo (urgencias)',
      ),
      h('li', null, h('span', { class: 'chip senado' }, '$ Señado'), 'Seña pagada (simulada)'),
    ),
  );

  const tarjetaRegistro = h(
    'section',
    { class: 'card', 'aria-labelledby': 't-reg' },
    h(
      'div',
      { class: 'panel-head' },
      h('span', { id: 't-reg' }, 'Lo que hizo el sistema'),
      h('button', { class: 'btn-on-dark', type: 'button', onClick: () => cargarRegistro() }, 'Actualizar'),
    ),
    registroLista,
  );

  const panelDerecho = h(
    'section',
    { class: 'card', 'aria-labelledby': 't-ag' },
    h(
      'div',
      { class: 'panel-head' },
      h('span', { id: 't-ag' }, 'Agenda'),
      h(
        'div',
        { class: 'filters', role: 'group', 'aria-label': 'Filtros' },
        h('label', { class: 'visually-hidden', for: 'f-prof' }, 'Profesional'),
        selProf,
        h('label', { class: 'visually-hidden', for: 'f-sillon' }, 'Sillón'),
        selSillon,
        h('label', { class: 'visually-hidden', for: 'f-estado' }, 'Estado'),
        selEstado,
      ),
    ),
    h(
      'div',
      { class: 'week-nav' },
      h('button', { class: 'btn btn-secondary', type: 'button', onClick: irAHoy }, 'Hoy'),
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Semana anterior', onClick: () => moverSemana(-1) }, '‹'),
        semanaEtiqueta,
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Semana siguiente', onClick: () => moverSemana(1) }, '›'),
      ),
      cuenta,
      puedeCrear ? h('button', { class: 'btn btn-primary', type: 'button', id: 'btn-nuevo', onClick: (e) => abrirNuevo(e.currentTarget) }, '+ Nuevo turno') : false,
    ),
    errorCarga,
    avisoSemana,
    grilla,
  );

  /* ------------------------- Drawer de detalle ------------------------- */
  const scrim = h('div', { class: 'drawer-scrim', hidden: true, onClick: () => cerrarDetalle() });
  const drawer = h('aside', {
    class: 'drawer',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 't-det',
    'data-open': 'false',
    hidden: true,
  });
  let turnoAbierto;
  let origenFoco;
  let temporizadorCierre;
  let confirmandoCancelacion = false;
  let modo; // 'detalle' | 'nuevo' | undefined (drawer cerrado)
  let formNuevo; // { valores, errores, errorServidor, enviando }

  reemplazar(
    contenedor,
    h('div', { class: 'agenda-layout' }, h('div', { class: 'left-col' }, panelIzquierdo, verRegistro ? tarjetaRegistro : false), panelDerecho),
    scrim,
    drawer,
  );

  /* ------------------------- Datos ------------------------- */
  const nombreDe = (lista, id) => lista.find((x) => x.id === id)?.nombre ?? id;
  const nombresDeTurno = (t) => ({
    paciente: estado.pacientes.get(t.pacienteId) ?? t.pacienteId,
    prestacion: nombreDe(estado.catalogo.prestaciones, t.prestacionId),
  });

  function llenarFiltros() {
    reemplazar(
      selProf,
      h('option', { value: '' }, 'Todos los profesionales'),
      estado.catalogo.profesionales.map((p) => h('option', { value: p.id }, p.nombre)),
    );
    reemplazar(
      selSillon,
      h('option', { value: '' }, 'Todos los sillones'),
      estado.catalogo.sillones.map((s) => h('option', { value: s.id }, s.nombre)),
    );
    selProf.value = estado.filtros.profesionalId;
  }

  async function cargarSemana() {
    const rango = rangoDeSemana(estado.lunes);
    const consulta = parametros(rango);
    const lunesPedido = estado.lunes;
    reemplazar(errorCarga);
    try {
      const [turnos, bloqueos] = await Promise.all([
        api.get(`/api/turnos?${consulta}`),
        api.get(`/api/bloqueos?${consulta}`).catch((e) => {
          if (e?.status === 401) throw e;
          return { bloqueos: [] }; // los bloqueos son decorativos: no impiden ver la agenda
        }),
      ]);
      if (!ctx.esActual() || lunesPedido !== estado.lunes) return;
      estado.turnos = turnos.turnos;
      estado.bloqueos = bloqueos.bloqueos;
      dibujarGrilla();
    } catch (error) {
      if (!ctx.esActual() || error?.status === 401) return;
      reemplazar(
        errorCarga,
        h(
          'div',
          { class: 'alert alert-error' },
          `No pudimos cargar la agenda. ${mensajeDe(error)} `,
          h('button', { class: 'btn-link', type: 'button', onClick: cargarSemana }, 'Reintentar'),
        ),
      );
    }
  }

  async function cargarRegistro() {
    if (!verRegistro) return; // el odontólogo no ve la tarjeta ni consulta GET /api/registro
    try {
      const datos = await api.get('/api/registro');
      if (!ctx.esActual()) return;
      estado.registro = datos.registro;
      dibujarRegistro();
    } catch (error) {
      if (!ctx.esActual() || error?.status === 401) return;
      reemplazar(registroLista, h('li', null, `No pudimos cargar el registro. ${mensajeDe(error)}`));
    }
  }

  function dibujarRegistro() {
    const { vacio, textoVacio, items } = formatearRegistro(estado.registro ?? []);
    reemplazar(
      registroLista,
      vacio ? h('li', { class: 'muted' }, textoVacio) : items.map((i) => h('li', null, h('time', null, i.fecha), i.mensaje)),
    );
  }

  /* ------------------------- Navegación ------------------------- */
  function moverSemana(delta) {
    estado.lunes = sumarDias(estado.lunes, delta * 7);
    sincronizarMes();
    dibujarCalendario();
    dibujarEtiquetas();
    cargarSemana();
  }

  function irAHoy() {
    estado.lunes = lunesDeLaSemana(estado.hoy);
    estado.anio = Number(estado.hoy.slice(0, 4));
    estado.mes = Number(estado.hoy.slice(5, 7));
    dibujarCalendario();
    dibujarEtiquetas();
    cargarSemana();
  }

  /** Al cambiar de semana el mini-calendario muestra el mes del jueves de esa semana. */
  function sincronizarMes() {
    const jueves = sumarDias(estado.lunes, 3);
    estado.anio = Number(jueves.slice(0, 4));
    estado.mes = Number(jueves.slice(5, 7));
  }

  function moverMes(delta) {
    const total = estado.anio * 12 + (estado.mes - 1) + delta;
    estado.anio = Math.floor(total / 12);
    estado.mes = (total % 12) + 1;
    dibujarCalendario();
  }

  function elegirDia(fecha) {
    const nuevoLunes = lunesDeLaSemana(fecha);
    if (nuevoLunes !== estado.lunes) {
      estado.lunes = nuevoLunes;
      dibujarEtiquetas();
      cargarSemana();
    }
    dibujarCalendario(fecha);
  }

  function cambiarFiltro(clave, valor) {
    estado.filtros[clave] = valor;
    dibujarGrilla();
  }

  /* ------------------------- Dibujo ------------------------- */
  function dibujarEtiquetas() {
    semanaEtiqueta.textContent = etiquetaSemana(estado.lunes);
  }

  function dibujarCalendario(fechaConFoco) {
    const cal = miniCalendario(estado.anio, estado.mes, estado.lunes, estado.hoy);
    calTitulo.textContent = cal.titulo;
    reemplazar(
      calTabla,
      h(
        'table',
        { class: 'mini-cal', 'aria-label': `${cal.titulo}. Elegí un día para ver su semana` },
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) =>
              h('th', { abbr: diasDeSemana('2026-11-30')[i].nombre.toLowerCase(), scope: 'col' }, d),
            ),
          ),
        ),
        h(
          'tbody',
          null,
          cal.semanas.map((fila) =>
            h(
              'tr',
              { class: fila.some((c) => c.enSemana) ? 'week' : false },
              fila.map((c) =>
                h(
                  'td',
                  { class: [c.fueraDeMes ? 'out' : '', c.esHoy ? 'today' : ''].filter(Boolean).join(' ') || false },
                  h(
                    'button',
                    {
                      type: 'button',
                      'data-fecha': c.fecha,
                      'aria-label': `${etiquetaDia(c.fecha)}${c.esHoy ? ', hoy' : ''}`,
                      'aria-current': c.esHoy ? 'date' : false,
                      'aria-pressed': c.enSemana ? 'true' : false,
                      onClick: () => elegirDia(c.fecha),
                    },
                    String(c.dia),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    if (fechaConFoco !== undefined) calTabla.querySelector(`button[data-fecha="${fechaConFoco}"]`)?.focus();
  }

  function bloqueoVisible(b) {
    const f = estado.filtros;
    return (
      (!b.profesionalId || !f.profesionalId || b.profesionalId === f.profesionalId) &&
      (!b.sillonId || !f.sillonId || b.sillonId === f.sillonId)
    );
  }

  function dibujarGrilla() {
    const visibles = filtrarTurnos(estado.turnos, estado.filtros);
    const { inicioMin, finMin } = limitesGrilla(estado.turnos);
    const filas = (finMin - inicioMin) / MIN_FILA;
    const dias = diasDeSemana(estado.lunes);
    const hoyLocal = estado.hoy;

    cuenta.textContent = visibles.length === 1 ? '1 turno' : `${visibles.length} turnos`;
    reemplazar(
      avisoSemana,
      visibles.length === 0
        ? h('div', { class: 'empty' }, h('h3', { style: { color: 'var(--adm-text)' } }, 'Sin turnos en esta semana'), h('p', { class: 'small' }, 'Probá otra semana o quitá filtros.'))
        : false,
    );

    const horas = [];
    for (let m = inicioMin; m < finMin; m += MIN_FILA) horas.push(h('span', null, m % 60 === 0 ? hhmm(m) : ''));

    // Posición de cada turno por columna, con carriles si hay simultáneos.
    const porColumna = dias.map(() => []);
    for (const t of visibles) {
      const pos = posicionBloque(t, estado.lunes, inicioMin);
      if (pos !== undefined) porColumna[pos.columna].push({ t, pos });
    }

    const columnas = dias.map((dia, i) => {
      const carriles = asignarCarriles(porColumna[i].map(({ t }) => t));
      const bloques = porColumna[i].map(({ t, pos }) => bloqueDeTurno(t, pos, carriles.get(t.id)));
      const bloqueos = estado.bloqueos
        .filter(bloqueoVisible)
        .map((b) => ({ b, pos: posicionBloque({ inicio: b.intervalo.inicio, fin: b.intervalo.fin }, estado.lunes, inicioMin) }))
        .filter(({ pos }) => pos !== undefined && pos.columna === i)
        .map(({ b, pos }) =>
          h(
            'div',
            {
              class: 'bloqueo',
              style: {
                top: `calc(var(--adm-row) * ${pos.fila} + 1px)`,
                height: `calc(var(--adm-row) * ${pos.filas} - 2px)`,
              },
            },
            b.motivo,
          ),
        );
      return h(
        'div',
        {
          class: ['wg-col', dia.fecha === hoyLocal ? 'today' : '', i === 6 ? 'closed' : ''].filter(Boolean).join(' '),
          style: { height: `calc(var(--adm-row) * ${filas})` },
        },
        bloqueos,
        bloques,
      );
    });

    reemplazar(
      grilla,
      h(
        'div',
        { class: 'week-grid' },
        h('div', { class: 'wg-head', 'aria-hidden': 'true' }),
        dias.map((d) => h('div', { class: `wg-head${d.fecha === hoyLocal ? ' today' : ''}` }, d.nombre, h('span', { class: 'd' }, d.corta))),
        h('div', { class: 'wg-times', 'aria-hidden': 'true' }, horas),
        columnas,
      ),
    );

    // Si el detalle abierto sigue visible, su bloque pasa a ser el origen del foco.
    if (turnoAbierto !== undefined) origenFoco = grilla.querySelector(`button[data-id="${turnoAbierto.id}"]`) ?? origenFoco;
  }

  function bloqueDeTurno(t, pos, carril) {
    const { carril: i = 0, carriles = 1 } = carril ?? {};
    const inicio = aHoraLocal(t.inicio).minutos;
    const fin = aHoraLocal(t.fin).minutos;
    const nombres = nombresDeTurno(t);
    const ahoraMs = Date.parse(ctx.ahoraIso());
    const pasado = terminoAntesDe(t, ahoraMs);
    return h(
      'button',
      {
        type: 'button',
        class: `turno st-${t.estado}${pasado ? ' pasado' : ''}`,
        'data-id': t.id,
        'aria-label': nombreAccesible(t, nombres, ahoraMs),
        style: {
          top: `calc(var(--adm-row) * ${pos.fila} + 1px)`,
          height: `calc(var(--adm-row) * ${pos.filas} - 2px)`,
          left: `calc(${(100 * i) / carriles}% + 3px)`,
          right: 'auto',
          width: `calc(${100 / carriles}% - 6px)`,
        },
        onClick: (e) => abrirDetalle(t, e.currentTarget),
      },
      h('strong', null, nombres.paciente, t.origen === 'whatsapp' ? h('span', { class: 'wa', 'aria-hidden': 'true' }, icono('whatsapp')) : false),
      // Con carriles el bloque es angosto: la hora queda en el nombre accesible, no en el texto visible.
      carriles === 1 || pos.filas >= 3 ? h('span', { class: 't' }, `${hhmm(inicio)}–${hhmm(fin)}`) : false,
      pos.filas >= 3 && carriles === 1 ? [h('br'), nombres.prestacion] : false,
      t.senado ? ' · $' : false,
    );
  }

  /* ------------------------- Detalle ------------------------- */
  function abrirDetalle(turno, origen) {
    clearTimeout(temporizadorCierre);
    turnoAbierto = turno;
    modo = 'detalle';
    formNuevo = undefined;
    origenFoco = origen;
    confirmandoCancelacion = false;
    dibujarDetalle();
    drawer.hidden = false;
    scrim.hidden = false;
    requestAnimationFrame(() => {
      drawer.setAttribute('data-open', 'true');
      drawer.querySelector('#cerrar-detalle')?.focus();
    });
  }

  function cerrarDetalle() {
    if (modo === undefined) return;
    drawer.setAttribute('data-open', 'false');
    scrim.hidden = true;
    turnoAbierto = undefined;
    modo = undefined;
    formNuevo = undefined;
    temporizadorCierre = setTimeout(() => {
      drawer.hidden = true;
    }, 240);
    const destino = origenFoco?.isConnected ? origenFoco : grilla;
    destino.focus();
  }

  function accionesDisponibles(t) {
    const rol = usuario.rol;
    const activo = t.estado === 'reservado' || t.estado === 'confirmado';
    const propio = rol !== 'odontologo' || usuario.profesionalId === t.profesionalId;
    const acciones = [];
    if ((rol === 'admin' || rol === 'recepcion') && t.estado === 'reservado') acciones.push('confirmar');
    if (activo && propio) acciones.push('atender', 'ausente');
    if (activo && (rol === 'admin' || rol === 'recepcion')) acciones.push('cancelar');
    return acciones;
  }

  function dibujarDetalle(mensajeError) {
    const t = turnoAbierto;
    if (t === undefined) return;
    const nombres = nombresDeTurno(t);
    const inicio = aHoraLocal(t.inicio);
    const fin = aHoraLocal(t.fin);
    const dia = diasDeSemana(estado.lunes).find((d) => d.fecha === inicio.fecha);
    const acciones = accionesDisponibles(t);
    const errorRegion = h('div', { role: 'alert', id: 'detalle-error' }, mensajeError ? h('div', { class: 'alert alert-error' }, mensajeError) : false);
    const enlaceOdontograma = h('a', { class: 'btn btn-secondary', href: `#/odontograma/${encodeURIComponent(t.id)}` }, 'Odontograma');
    const factura = accionFactura(usuario.rol, t);
    const enlaceFactura = !factura.visible
      ? false
      : factura.habilitado
        ? h('a', { class: 'btn btn-secondary', href: factura.href }, 'Emitir factura')
        : h('a', { class: 'btn btn-secondary', role: 'link', 'aria-disabled': 'true', 'aria-describedby': 'factura-ayuda' }, 'Emitir factura');
    const motivo = h('textarea', { class: 'input', id: 'motivo', maxlength: '200', 'aria-describedby': 'motivo-ayuda' });

    const botones = acciones
      .filter((a) => a !== 'cancelar')
      .map((a) =>
        h(
          'button',
          {
            class: a === 'ausente' ? 'btn btn-secondary' : 'btn btn-primary',
            type: 'button',
            onClick: (e) => ejecutar(a, e.currentTarget),
          },
          { confirmar: 'Confirmar', atender: 'Marcar atendido', ausente: 'Ausente' }[a],
        ),
      );
    if (acciones.includes('cancelar') && !confirmandoCancelacion) {
      botones.push(
        h(
          'button',
          {
            class: 'btn btn-ghost',
            type: 'button',
            onClick: () => {
              confirmandoCancelacion = true;
              dibujarDetalle();
              drawer.querySelector('#motivo')?.focus();
            },
          },
          'Cancelar turno…',
        ),
      );
    }

    reemplazar(
      drawer,
      h(
        'div',
        { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('h2', { id: 't-det' }, 'Turno'),
        h('button', { class: 'icon-btn', type: 'button', id: 'cerrar-detalle', 'aria-label': 'Cerrar detalle', onClick: () => cerrarDetalle() }, '✕'),
      ),
      h('div', null, h('span', { class: `chip st-${t.estado}` }, etiquetaEstado(t.estado)), ' ', t.senado ? h('span', { class: 'chip senado' }, '$ Señado') : false),
      h(
        'dl',
        { class: 'dl' },
        h('dt', null, 'Paciente'), h('dd', null, nombres.paciente),
        h('dt', null, 'Prestación'), h('dd', null, nombres.prestacion),
        h('dt', null, 'Horario'), h('dd', { class: 'num' }, `${dia?.nombre.slice(0, 3) ?? ''} ${dia?.corta ?? ''} · ${hhmm(inicio.minutos)}–${hhmm(fin.minutos)}`),
        h('dt', null, 'Profesional'), h('dd', null, nombreDe(estado.catalogo.profesionales, t.profesionalId)),
        h('dt', null, 'Sillón'), h('dd', null, nombreDe(estado.catalogo.sillones, t.sillonId)),
        h('dt', null, 'Origen'), h('dd', null, t.origen === 'whatsapp' ? 'WhatsApp (simulado)' : 'Recepción'),
      ),
      acciones.length === 0 && !puedeVerOdontograma(usuario.rol) && !factura.visible
        ? h('p', { class: 'small muted' }, 'Este turno no tiene acciones disponibles para tu rol.')
        : h('div', { class: 'actions' }, botones, puedeVerOdontograma(usuario.rol) ? enlaceOdontograma : false, enlaceFactura),
      factura.visible && !factura.habilitado ? h('p', { class: 'small muted', id: 'factura-ayuda' }, 'Disponible cuando el turno esté atendido') : false,
      confirmandoCancelacion
        ? h(
            'div',
            { class: 'inline-form' },
            h(
              'div',
              { class: 'field' },
              h('label', { for: 'motivo' }, 'Motivo de la cancelación'),
              motivo,
              h('span', { class: 'hint', id: 'motivo-ayuda' }, 'Obligatorio. Queda en la auditoría.'),
            ),
            h(
              'div',
              { class: 'actions' },
              h('button', { class: 'btn btn-primary', type: 'button', onClick: (e) => ejecutar('cancelar', e.currentTarget, motivo.value) }, 'Confirmar cancelación'),
              h('button', { class: 'btn btn-secondary', type: 'button', onClick: () => { confirmandoCancelacion = false; dibujarDetalle(); } }, 'Volver'),
            ),
          )
        : false,
      errorRegion,
    );
  }

  async function ejecutar(accion, boton, motivo) {
    const t = turnoAbierto;
    if (t === undefined) return;
    if (accion === 'cancelar' && (motivo ?? '').trim() === '') {
      dibujarDetalle('El motivo de cancelación es obligatorio.');
      drawer.querySelector('#motivo')?.focus();
      return;
    }
    boton.disabled = true;
    try {
      const cuerpo = accion === 'cancelar' ? { motivo: motivo.trim() } : undefined;
      const actualizado = await api.post(`/api/turnos/${encodeURIComponent(t.id)}/${accion}`, cuerpo);
      if (!ctx.esActual()) return;
      if (accion === 'cancelar') {
        estado.turnos = estado.turnos.filter((x) => x.id !== t.id);
        dibujarGrilla(); // el bloque cancelado desaparece de la grilla (RN-AG-10)
        cerrarDetalle(); // el foco vuelve a la grilla porque su bloque ya no existe
        ctx.toast('Turno cancelado');
        cargarRegistro();
        return;
      }
      estado.turnos = estado.turnos.map((x) => (x.id === t.id ? { ...x, ...actualizado } : x));
      turnoAbierto = estado.turnos.find((x) => x.id === t.id);
      dibujarGrilla();
      dibujarDetalle();
      drawer.querySelector('#cerrar-detalle')?.focus();
      cargarRegistro();
    } catch (error) {
      if (!ctx.esActual() || error?.status === 401) return;
      // 403 / 409: el turno no cambia y se muestra el mensaje de la API en el detalle.
      dibujarDetalle(mensajeDe(error));
    }
  }

  /* ------------------------- Nuevo turno ------------------------- */
  function abrirNuevo(origen) {
    clearTimeout(temporizadorCierre);
    turnoAbierto = undefined;
    modo = 'nuevo';
    origenFoco = origen;
    formNuevo = {
      valores: { pacienteId: '', prestacionId: '', profesionalId: '', sillonId: '', fecha: estado.hoy, hora: '' },
      errores: {},
      errorServidor: undefined,
      enviando: false,
    };
    dibujarNuevo();
    drawer.hidden = false;
    scrim.hidden = false;
    requestAnimationFrame(() => {
      drawer.setAttribute('data-open', 'true');
      drawer.querySelector('#n-pacienteId')?.focus();
    });
  }

  /** Un campo del formulario: etiqueta, control y mensaje de error asociado (aria-invalid + aria-describedby). */
  function campoNuevo(clave, etiqueta, crearControl, ayuda) {
    const error = formNuevo.errores[clave];
    const id = `n-${clave}`;
    const control = crearControl(id);
    control.setAttribute('aria-invalid', error === undefined ? 'false' : 'true');
    control.setAttribute('aria-describedby', `${id}-err${ayuda ? ` ${id}-ayuda` : ''}`);
    control.addEventListener('change', () => {
      formNuevo.valores[clave] = control.value;
    });
    return h(
      'div',
      { class: 'field' },
      h('label', { for: id }, etiqueta),
      control,
      ayuda ? h('span', { class: 'hint', id: `${id}-ayuda` }, ayuda) : false,
      h('span', { class: 'err', id: `${id}-err`, hidden: error === undefined }, error ?? ''),
    );
  }

  function selectNuevo(clave, opciones, textoVacio) {
    return (id) =>
      h(
        'select',
        { class: 'select', id },
        h('option', { value: '', selected: formNuevo.valores[clave] === '' }, textoVacio),
        opciones.map(([valor, texto]) => h('option', { value: valor, selected: formNuevo.valores[clave] === valor }, texto)),
      );
  }

  function dibujarNuevo() {
    const f = formNuevo;
    const e = f.errorServidor;
    const pacientes = [...estado.pacientes].map(([id, nombre]) => [id, nombre]);
    const prestaciones = estado.catalogo.prestaciones.map((p) => [p.id, p.duracionMin ? `${p.nombre} (${p.duracionMin} min)` : p.nombre]);
    const profesionales = estado.catalogo.profesionales.map((p) => [p.id, p.nombre]);
    const sillones = estado.catalogo.sillones.map((s) => [s.id, s.nombre]);
    const avisoServidor =
      e === undefined
        ? false
        : h(
            'div',
            { class: 'alert alert-error' },
            e.regla ? [h('strong', null, e.regla), ' · '] : false,
            e.mensaje,
            e.conflicto?.turnoId ? [' Turno en conflicto: ', h('span', { class: 'num' }, e.conflicto.turnoId), '.'] : false,
          );

    reemplazar(
      drawer,
      h(
        'div',
        { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('h2', { id: 't-det' }, 'Nuevo turno'),
        h('button', { class: 'icon-btn', type: 'button', id: 'cerrar-detalle', 'aria-label': 'Cerrar formulario', onClick: () => cerrarDetalle() }, '✕'),
      ),
      h(
        'form',
        { class: 'form-grid', novalidate: true, id: 'form-nuevo', onSubmit: (ev) => enviarNuevo(ev) },
        campoNuevo('pacienteId', 'Paciente', selectNuevo('pacienteId', pacientes, 'Elegí un paciente')),
        campoNuevo('prestacionId', 'Prestación', selectNuevo('prestacionId', prestaciones, 'Elegí una prestación')),
        h(
          'div',
          { class: 'form-row' },
          campoNuevo('profesionalId', 'Profesional', selectNuevo('profesionalId', profesionales, 'Elegí un profesional')),
          campoNuevo('sillonId', 'Sillón', selectNuevo('sillonId', sillones, 'Elegí un sillón')),
        ),
        h(
          'div',
          { class: 'form-row' },
          campoNuevo('fecha', 'Fecha', (id) => h('input', { class: 'input', type: 'date', id, value: f.valores.fecha })),
          campoNuevo('hora', 'Hora', selectNuevo('hora', HORAS_DE_TURNO.map((x) => [x, x]), 'Elegí una hora'), 'Cada 15 minutos.'),
        ),
        h('div', { role: 'alert', id: 'n-error' }, avisoServidor),
        h(
          'div',
          { class: 'actions' },
          h('button', { class: 'btn btn-primary', type: 'submit', disabled: f.enviando }, 'Crear turno'),
          h('button', { class: 'btn btn-secondary', type: 'button', onClick: () => cerrarDetalle() }, 'Volver'),
        ),
      ),
    );
  }

  async function enviarNuevo(evento) {
    evento.preventDefault();
    if (modo !== 'nuevo' || formNuevo.enviando) return;
    const resultado = validarNuevoTurno(formNuevo.valores);
    formNuevo.errores = resultado.errores;
    formNuevo.errorServidor = undefined;
    if (!resultado.ok) {
      dibujarNuevo();
      drawer.querySelector('[aria-invalid="true"]')?.focus(); // no se envía nada: el foco va al primer campo faltante
      return;
    }
    formNuevo.enviando = true;
    dibujarNuevo();
    try {
      await api.post('/api/turnos', resultado.datos);
      if (!ctx.esActual()) return;
      const fecha = formNuevo.valores.fecha;
      cerrarDetalle();
      ctx.toast('Turno creado');
      estado.lunes = lunesDeLaSemana(fecha);
      sincronizarMes();
      dibujarCalendario();
      dibujarEtiquetas();
      cargarSemana();
      cargarRegistro();
    } catch (error) {
      if (!ctx.esActual() || error?.status === 401) return;
      // 409 u otro rechazo: el formulario sigue abierto con los datos cargados.
      formNuevo.enviando = false;
      formNuevo.errorServidor = { regla: error.regla, mensaje: error.mensaje ?? mensajeDe(error), conflicto: error.conflicto };
      dibujarNuevo();
      drawer.querySelector('#n-error')?.scrollIntoView?.({ block: 'nearest' });
    }
  }

  /* ------------------------- Teclado ------------------------- */
  function alTeclado(e) {
    if (!contenedor.isConnected) {
      document.removeEventListener('keydown', alTeclado);
      return;
    }
    if (modo === undefined) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      cerrarDetalle();
      return;
    }
    if (e.key === 'Tab') {
      const foco = [...drawer.querySelectorAll('button, textarea, [href], select, input')].filter((el) => !el.disabled);
      if (foco.length === 0) return;
      const primero = foco[0];
      const ultimo = foco[foco.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }
  }
  document.addEventListener('keydown', alTeclado);

  /* ------------------------- Arranque ------------------------- */
  dibujarEtiquetas();
  dibujarCalendario();
  reemplazar(avisoSemana, h('p', { class: 'loading', 'aria-busy': 'true' }, 'Cargando agenda…'));
  try {
    const [catalogo, pacientes, fechaServidor] = await Promise.all([
      api.get('/api/catalogo'),
      api.get('/api/pacientes'),
      api
        .get('/api/panel/resumen')
        .then((r) => r.fecha)
        .catch((e) => {
          if (e?.status === 401) throw e;
          return undefined; // sin el dato del servidor se usa la fecha del navegador
        }),
    ]);
    if (!ctx.esActual()) return;
    if (fechaServidor !== undefined) {
      estado.hoy = fechaServidor;
      estado.lunes = lunesDeLaSemana(fechaServidor);
      estado.anio = Number(fechaServidor.slice(0, 4));
      estado.mes = Number(fechaServidor.slice(5, 7));
    }
    dibujarEtiquetas();
    dibujarCalendario();
    estado.catalogo = catalogo;
    estado.pacientes = new Map(pacientes.pacientes.map((p) => [p.id, p.nombre]));
    llenarFiltros();
  } catch (error) {
    if (!ctx.esActual() || error?.status === 401) return;
    reemplazar(avisoSemana);
    reemplazar(
      errorCarga,
      h(
        'div',
        { class: 'alert alert-error' },
        `No pudimos cargar la agenda. ${mensajeDe(error)} `,
        h('button', { class: 'btn-link', type: 'button', onClick: () => montarAgenda(contenedor, ctx) }, 'Reintentar'),
      ),
    );
    return;
  }
  cargarRegistro();
  await cargarSemana();
}
