import { aHoraLocal, hhmm } from './agenda-calculos.js';
import { h, mensajeDe, reemplazar } from './dom.js';
import { puedeConfigurarConsultorio, puedeGestionarBloqueos } from './permisos-ui.js';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const FECHA_EJEMPLO = '2026-11-30';

function isoLocal(fecha, hora) {
  return `${fecha}T${hora}:00-03:00`;
}

function textoIntervalo(bloqueo) {
  const inicio = aHoraLocal(bloqueo.intervalo.inicio);
  const fin = aHoraLocal(bloqueo.intervalo.fin);
  return `${inicio.fecha} ${hhmm(inicio.minutos)}–${hhmm(fin.minutos)}`;
}

function selectDe(opciones, valor, onChange, id) {
  const select = h('select', { id, class: 'select', onChange }, ...opciones.map(([v, texto]) => h('option', { value: v }, texto)));
  select.value = String(valor);
  return select;
}

function mostrarError(destino, error, reglaFallback) {
  const regla = error?.regla ?? (error?.tipo === 'permiso' && reglaFallback !== undefined ? reglaFallback : undefined);
  reemplazar(
    destino,
    h('div', { class: 'alert alert-error', role: 'alert' }, regla === undefined ? mensajeDe(error) : `${regla} — ${error.mensaje}`),
  );
}

function exito(destino, texto) {
  reemplazar(destino, h('div', { class: 'alert alert-info', role: 'status' }, texto));
}

export async function montarConfiguracion(contenedor, ctx) {
  const { api, usuario } = ctx;
  const esAdmin = puedeConfigurarConsultorio(usuario.rol);
  const gestionaBloqueos = puedeGestionarBloqueos(usuario.rol);
  ctx.titulo('Configuración', 'C-07 · consultorio y agenda');

  const estado = {
    sillones: [],
    prestaciones: [],
    profesionales: [],
    bloqueos: [],
    profesionalId: 'prof-1',
    franjas: [],
  };

  const avisoSillones = h('div');
  const avisoPrestaciones = h('div');
  const avisoDisponibilidad = h('div');
  const avisoBloqueos = h('div');
  const listaSillones = h('div', { class: 'config-lista' });
  const listaPrestaciones = h('div', { class: 'config-lista' });
  const listaBloqueos = h('div', { class: 'config-lista' });
  const editorFranjas = h('div', { class: 'franjas' });

  const nombreSillon = h('input', { id: 'cfg-sillon', class: 'input', type: 'text', placeholder: 'Ej.: Sillón 3' });
  const codigoPrestacion = h('input', { id: 'cfg-prest-codigo', class: 'input', type: 'text', placeholder: 'Ej.: radio' });
  const nombrePrestacion = h('input', { id: 'cfg-prest-nombre', class: 'input', type: 'text', placeholder: 'Ej.: Radiografía' });
  const duracionPrestacion = h('input', { id: 'cfg-prest-duracion', class: 'input', type: 'number', min: 15, step: 15, value: '30' });
  const profesionalDisponibilidad = selectDe(
    [['prof-1', 'Dra. Ficticia Perez (prof-1)'], ['prof-2', 'Dr. Ficticio Gomez (prof-2)']],
    estado.profesionalId,
    (e) => {
      estado.profesionalId = e.target.value;
      cargarFranjas();
    },
    'cfg-prof-disponibilidad',
  );
  const profesionalBloqueo = selectDe(
    [['', 'Global (sin profesional)'], ['prof-1', 'Dra. Ficticia Perez (prof-1)'], ['prof-2', 'Dr. Ficticio Gomez (prof-2)']],
    usuario.profesionalId ?? 'prof-1',
    undefined,
    'cfg-prof-bloqueo',
  );
  const fechaBloqueo = h('input', { id: 'cfg-fecha-bloqueo', class: 'input', type: 'date', value: FECHA_EJEMPLO });
  const desdeBloqueo = h('input', { id: 'cfg-desde-bloqueo', class: 'input', type: 'time', step: 900, value: '10:00' });
  const hastaBloqueo = h('input', { id: 'cfg-hasta-bloqueo', class: 'input', type: 'time', step: 900, value: '10:30' });
  const motivoBloqueo = h('input', { id: 'cfg-motivo-bloqueo', class: 'input', type: 'text', value: 'Reservado para control (simulación)' });

  function dibujarSillones() {
    reemplazar(
      listaSillones,
      h(
        'table',
        { class: 'table' },
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Sillón'), h('th', { scope: 'col' }, 'Estado'), h('th', { scope: 'col' }, h('span', { class: 'visually-hidden' }, 'Acciones')))),
        h(
          'tbody',
          null,
          ...estado.sillones.map((s) =>
            h(
              'tr',
              null,
              h('td', null, s.nombre),
              h('td', null, h('span', { class: `chip ${s.activo ? 'st-confirmado' : 'st-ausente'}` }, s.activo ? 'Activo' : 'Inactivo')),
              h('td', null, s.activo && esAdmin
                ? h('button', {
                    class: 'btn btn-ghost row-btn',
                    type: 'button',
                    'aria-label': `Dar de baja ${s.nombre}`,
                    onClick: () => darDeBajaSillon(s),
                  }, 'Dar de baja')
                : h('span', { class: 'small muted' }, s.activo ? 'Solo administración' : 'Baja lógica')),
            ),
          ),
        ),
      ),
    );
  }

  function dibujarPrestaciones() {
    reemplazar(
      listaPrestaciones,
      h(
        'table',
        { class: 'table' },
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Código'), h('th', { scope: 'col' }, 'Prestación'), h('th', { scope: 'col' }, 'Duración'))),
        h('tbody', null, ...estado.prestaciones.map((p) => h('tr', null, h('td', null, p.codigo), h('td', null, p.nombre), h('td', { class: 'num' }, `${p.duracionMin} min`)))),
      ),
    );
  }

  function dibujarFranjas() {
    reemplazar(
      editorFranjas,
      ...estado.franjas.map((f, i) =>
        h(
          'div',
          { class: 'franja-row' },
          selectDe(
            DIAS.map((nombre, n) => [String(n + 1), nombre]),
            f.diaSemana,
            (e) => { f.diaSemana = Number(e.target.value); },
            `cfg-dia-${i}`,
          ),
          h('input', { class: 'input', type: 'time', step: 900, value: f.desde, 'aria-label': `Desde franja ${i + 1}`, onInput: (e) => { f.desde = e.target.value; } }),
          h('input', { class: 'input', type: 'time', step: 900, value: f.hasta, 'aria-label': `Hasta franja ${i + 1}`, onInput: (e) => { f.hasta = e.target.value; } }),
          h('button', {
            class: 'btn btn-secondary row-btn',
            type: 'button',
            onClick: () => { estado.franjas.splice(i, 1); dibujarFranjas(); },
          }, 'Quitar'),
        ),
      ),
    );
  }

  function dibujarBloqueos() {
    reemplazar(
      listaBloqueos,
      estado.bloqueos.length === 0
        ? h('p', { class: 'empty' }, 'No hay bloqueos cargados.')
        : h(
            'table',
            { class: 'table' },
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Cuándo'), h('th', { scope: 'col' }, 'Profesional'), h('th', { scope: 'col' }, 'Motivo'), h('th', { scope: 'col' }, h('span', { class: 'visually-hidden' }, 'Acciones')))),
            h('tbody', null, ...estado.bloqueos.map((b) =>
              h('tr', null,
                h('td', { class: 'num' }, textoIntervalo(b)),
                h('td', null, b.profesionalId ?? 'Global'),
                h('td', null, b.motivo),
                h('td', null, gestionaBloqueos
                  ? h('button', {
                      class: 'btn btn-ghost row-btn',
                      type: 'button',
                      onClick: () => quitarBloqueo(b),
                    }, 'Quitar')
                  : null),
              ),
            )),
          ),
    );
  }

  async function cargarCatalogo() {
    const catalogo = await api.get('/api/catalogo');
    estado.sillones = catalogo.sillones;
    estado.prestaciones = catalogo.prestaciones;
    estado.profesionales = catalogo.profesionales;
    dibujarSillones();
    dibujarPrestaciones();
  }

  async function cargarFranjas() {
    const profesional = estado.profesionales.find((p) => p.id === estado.profesionalId);
    estado.franjas = profesional === undefined ? [] : profesional.disponibilidad.map((f) => ({ ...f }));
    dibujarFranjas();
  }

  async function cargarBloqueos() {
    const respuesta = await api.get('/api/bloqueos');
    estado.bloqueos = respuesta.bloqueos;
    dibujarBloqueos();
  }

  async function crearSillon(e) {
    e.preventDefault();
    reemplazar(avisoSillones);
    try {
      await api.post('/api/sillones', { nombre: nombreSillon.value.trim() });
      nombreSillon.value = '';
      await cargarCatalogo();
      exito(avisoSillones, 'Sillón creado (activo).');
      ctx.toast('Sillón creado');
    } catch (error) {
      if (ctx.esActual()) mostrarError(avisoSillones, error, 'RN-CF-03');
    }
  }

  async function darDeBajaSillon(sillon) {
    reemplazar(avisoSillones);
    try {
      await api.delete(`/api/sillones/${encodeURIComponent(sillon.id)}`);
      await cargarCatalogo();
      exito(avisoSillones, `${sillon.nombre} dado de baja: sigue en la lista con estado Inactivo (RN-CF-04).`);
    } catch (error) {
      if (ctx.esActual()) mostrarError(avisoSillones, error, 'RN-CF-03');
    }
  }

  async function crearPrestacion(e) {
    e.preventDefault();
    reemplazar(avisoPrestaciones);
    try {
      await api.post('/api/prestaciones', {
        codigo: codigoPrestacion.value.trim(),
        nombre: nombrePrestacion.value.trim(),
        duracionMin: Number(duracionPrestacion.value),
      });
      codigoPrestacion.value = '';
      nombrePrestacion.value = '';
      await cargarCatalogo();
      exito(avisoPrestaciones, 'Prestación creada.');
      ctx.toast('Prestación creada');
    } catch (error) {
      if (ctx.esActual()) mostrarError(avisoPrestaciones, error, 'RN-CF-01');
    }
  }

  async function guardarDisponibilidad() {
    reemplazar(avisoDisponibilidad);
    try {
      await api.put(`/api/profesionales/${encodeURIComponent(estado.profesionalId)}/disponibilidad`, estado.franjas);
      await cargarCatalogo();
      await cargarFranjas();
      exito(avisoDisponibilidad, 'Disponibilidad semanal guardada.');
      ctx.toast('Disponibilidad guardada');
    } catch (error) {
      if (ctx.esActual()) mostrarError(avisoDisponibilidad, error, 'RN-CF-02');
    }
  }

  async function crearBloqueo(e) {
    e.preventDefault();
    reemplazar(avisoBloqueos);
    const profesionalId = profesionalBloqueo.value;
    try {
      await api.post('/api/bloqueos', {
        motivo: motivoBloqueo.value.trim(),
        desde: isoLocal(fechaBloqueo.value, desdeBloqueo.value),
        hasta: isoLocal(fechaBloqueo.value, hastaBloqueo.value),
        ...(profesionalId === '' ? {} : { profesionalId }),
      });
      await cargarBloqueos();
      exito(avisoBloqueos, 'Bloqueo creado.');
      ctx.toast('Bloqueo creado');
    } catch (error) {
      if (ctx.esActual()) mostrarError(avisoBloqueos, error, 'RN-CF-03');
    }
  }

  async function quitarBloqueo(bloqueo) {
    reemplazar(avisoBloqueos);
    try {
      await api.delete(`/api/bloqueos/${encodeURIComponent(bloqueo.id)}`);
      await cargarBloqueos();
      exito(avisoBloqueos, 'Bloqueo quitado.');
    } catch (error) {
      if (ctx.esActual()) mostrarError(avisoBloqueos, error, 'RN-CF-03');
    }
  }

  reemplazar(
    contenedor,
    h('div', { class: 'vista config-vista' },
      h('p', { class: 'sim', role: 'note' }, 'SIMULACIÓN — datos ficticios, sin integraciones reales'),
      h('section', { class: 'card', 'aria-labelledby': 't-cfg-sillones' },
        h('div', { class: 'card-head' }, h('h2', { id: 't-cfg-sillones' }, 'Sillones'), h('span', { class: 'muted small' }, 'RN-CF-04 · baja lógica')),
        esAdmin
          ? h('form', { class: 'inline-form', onSubmit: crearSillon },
              h('div', { class: 'field' }, h('label', { for: 'cfg-sillon' }, 'Nombre del sillón'), nombreSillon),
              h('div', null, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Crear sillón')))
          : h('p', { class: 'small muted' }, 'Solo administración puede crear y dar de baja sillones (RN-CF-03).'),
        avisoSillones, listaSillones),
      h('section', { class: 'card', 'aria-labelledby': 't-cfg-prest' },
        h('div', { class: 'card-head' }, h('h2', { id: 't-cfg-prest' }, 'Prestaciones'), h('span', { class: 'muted small' }, 'RN-CF-01 · múltiplos de 15 min')),
        esAdmin
          ? h('form', { class: 'inline-form', onSubmit: crearPrestacion },
              h('div', { class: 'form-row' },
                h('div', { class: 'field' }, h('label', { for: 'cfg-prest-codigo' }, 'Código'), codigoPrestacion),
                h('div', { class: 'field' }, h('label', { for: 'cfg-prest-nombre' }, 'Nombre'), nombrePrestacion)),
              h('div', { class: 'field' }, h('label', { for: 'cfg-prest-duracion' }, 'Duración (minutos)'), duracionPrestacion, h('span', { class: 'hint' }, 'Probá 20 para ver el rechazo RN-CF-01.')),
              h('div', null, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Crear prestación')))
          : h('p', { class: 'small muted' }, 'Solo administración puede crear prestaciones (RN-CF-03).'),
        avisoPrestaciones, listaPrestaciones),
      h('section', { class: 'card', 'aria-labelledby': 't-cfg-disponibilidad' },
        h('div', { class: 'card-head' }, h('h2', { id: 't-cfg-disponibilidad' }, 'Disponibilidad semanal'), h('span', { class: 'muted small' }, 'RN-CF-02 · sin solapes')),
        esAdmin
          ? h('div', null,
              h('div', { class: 'field', style: { maxWidth: '320px' } }, h('label', { for: 'cfg-prof-disponibilidad' }, 'Profesional'), profesionalDisponibilidad),
              h('div', { class: 'franjas-head' }, h('span', null, 'Día'), h('span', null, 'Desde'), h('span', null, 'Hasta'), h('span', null, 'Acciones')),
              editorFranjas,
              h('div', { class: 'actions', style: { marginTop: '12px' } },
                h('button', { class: 'btn btn-secondary', type: 'button', onClick: () => { estado.franjas.push({ diaSemana: 1, desde: '09:00', hasta: '09:30' }); dibujarFranjas(); } }, '+ Agregar franja'),
                h('button', { class: 'btn btn-primary', type: 'button', onClick: guardarDisponibilidad }, 'Guardar disponibilidad')),
              h('p', { class: 'small muted' }, 'La guarda reemplaza todas las franjas del profesional; para provocar RN-CF-02 agregá una franja que se solape con otra del mismo día.'))
          : h('p', { class: 'small muted' }, 'Solo administración puede definir horarios (RN-CF-03).'),
        avisoDisponibilidad),
      h('section', { class: 'card', 'aria-labelledby': 't-cfg-bloqueos' },
        h('div', { class: 'card-head' }, h('h2', { id: 't-cfg-bloqueos' }, 'Bloqueos'), h('span', { class: 'muted small' }, 'RN-CF-03 · agenda propia')),
        gestionaBloqueos
          ? h('form', { class: 'inline-form', onSubmit: crearBloqueo },
              h('div', { class: 'form-row' },
                h('div', { class: 'field' }, h('label', { for: 'cfg-prof-bloqueo' }, 'Profesional'), profesionalBloqueo),
                h('div', { class: 'field' }, h('label', { for: 'cfg-fecha-bloqueo' }, 'Fecha'), fechaBloqueo)),
              h('div', { class: 'form-row' },
                h('div', { class: 'field' }, h('label', { for: 'cfg-desde-bloqueo' }, 'Desde'), desdeBloqueo),
                h('div', { class: 'field' }, h('label', { for: 'cfg-hasta-bloqueo' }, 'Hasta'), hastaBloqueo)),
              h('div', { class: 'field' }, h('label', { for: 'cfg-motivo-bloqueo' }, 'Motivo'), motivoBloqueo),
              h('div', null, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Crear bloqueo')),
              h('p', { class: 'small muted' }, 'Ingresado como odontólogo, elegí otro profesional para ver el rechazo RN-CF-03.'))
          : h('p', { class: 'small muted' }, 'Tu rol no puede crear bloqueos.'),
        avisoBloqueos, listaBloqueos)
    ),
  );

  try {
    await Promise.all([cargarCatalogo(), cargarBloqueos()]);
    await cargarFranjas();
  } catch (error) {
    if (!ctx.esActual() || error?.status === 401) return;
    reemplazar(avisoBloqueos, h('div', { class: 'alert alert-error', role: 'alert' }, mensajeDe(error)));
  }
}
