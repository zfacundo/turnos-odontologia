import { h, mensajeDe, reemplazar } from './dom.js';
import { puedeConfigurarConsultorio, puedeGestionarBloqueos } from './permisos-ui.js';

const DIAS = [
  [1, 'Lunes'],
  [2, 'Martes'],
  [3, 'Miércoles'],
  [4, 'Jueves'],
  [5, 'Viernes'],
  [6, 'Sábado'],
  [7, 'Domingo'],
];
const ESTADOS = ['activo', 'con_copago', 'sin_cobertura', 'error_simulado'];
const FECHA_DEMO = '2026-11-30';

function iso(fecha, hora) {
  return new Date(`${fecha}T${hora}:00-03:00`).toISOString();
}

function errorEn(nodo, error, prefijo) {
  const texto = mensajeDe(error);
  reemplazar(nodo, h('div', { class: 'alert alert-error', role: 'alert' }, prefijo === undefined ? texto : `${prefijo} — ${texto}`));
}

function limpiar(nodo) {
  reemplazar(nodo);
}

function opcionesProfesionales(profesionales, seleccion) {
  return profesionales.map((p) => h('option', { value: p.id, selected: p.id === seleccion }, `${p.id} · ${p.nombre}`));
}

export async function montarConfiguracion(contenedor, ctx) {
  const { api, usuario } = ctx;
  const puedeConfigurar = puedeConfigurarConsultorio(usuario.rol);
  const puedeBloquear = puedeGestionarBloqueos(usuario.rol);
  ctx.titulo('Configuración', 'Consultorio · agenda y padrón simulado');

  const estado = {
    catalogo: { sillones: [], prestaciones: [], profesionales: [] },
    bloqueos: [],
    padron: { obrasSociales: [], afiliados: [] },
    profesionalId: 'prof-1',
    franjas: [],
  };

  const n = {
    sillonNombre: h('input', { class: 'input', type: 'text', placeholder: 'Ej.: Sillón 3', disabled: !puedeConfigurar }),
    sillonError: h('div', { role: 'alert' }),
    sillones: h('div', { class: 'config-lista' }),

    prestCodigo: h('input', { class: 'input', type: 'text', placeholder: 'Ej.: limpieza', disabled: !puedeConfigurar }),
    prestNombre: h('input', { class: 'input', type: 'text', placeholder: 'Ej.: Limpieza (ficticia)', disabled: !puedeConfigurar }),
    prestDuracion: h('input', { class: 'input', type: 'number', min: '15', step: '15', value: '30', disabled: !puedeConfigurar }),
    prestError: h('div', { role: 'alert' }),
    prestaciones: h('div', { class: 'config-lista' }),

    profSeleccion: h('select', { class: 'select', disabled: !puedeConfigurar, onChange: (e) => {
      estado.profesionalId = e.target.value;
      const profesional = estado.catalogo.profesionales.find((p) => p.id === estado.profesionalId);
      estado.franjas = (profesional?.disponibilidad ?? []).map((f) => ({ ...f }));
      dibujarFranjas();
    } }),
    dia: h('select', { class: 'select', disabled: !puedeConfigurar }, DIAS.map(([v, t]) => h('option', { value: String(v) }, t))),
    desde: h('input', { class: 'input', type: 'time', value: '09:00', step: '900', disabled: !puedeConfigurar }),
    hasta: h('input', { class: 'input', type: 'time', value: '10:00', step: '900', disabled: !puedeConfigurar }),
    franjas: h('div', { class: 'franjas' }),
    dispError: h('div', { role: 'alert' }),

    bloqProfesional: h('select', { class: 'select', disabled: !puedeBloquear }, h('option', { value: '' }, 'Todos los profesionales')),
    bloqFecha: h('input', { class: 'input', type: 'date', value: FECHA_DEMO, disabled: !puedeBloquear }),
    bloqDesde: h('input', { class: 'input', type: 'time', value: '10:00', step: '900', disabled: !puedeBloquear }),
    bloqHasta: h('input', { class: 'input', type: 'time', value: '10:30', step: '900', disabled: !puedeBloquear }),
    bloqMotivo: h('input', { class: 'input', type: 'text', placeholder: 'Ej.: Control (ficticio)', disabled: !puedeBloquear }),
    bloqueos: h('div', { class: 'config-lista' }),
    bloqError: h('div', { role: 'alert' }),

    osCodigo: h('input', { class: 'input', type: 'text', placeholder: 'OS-05', disabled: !puedeConfigurar }),
    osNombre: h('input', { class: 'input', type: 'text', placeholder: 'Obra Social Demo', disabled: !puedeConfigurar }),
    osPlanes: h('input', { class: 'input', type: 'text', placeholder: 'Plan Demo, Plan Demo Plus', disabled: !puedeConfigurar }),
    osError: h('div', { role: 'alert' }),
    obras: h('div', { class: 'config-lista' }),

    afNro: h('input', { class: 'input', type: 'text', placeholder: 'AF-0005' }),
    afObra: h('select', { class: 'select' }),
    afPlan: h('select', { class: 'select' }),
    afCobertura: h('input', { class: 'input', type: 'number', min: '0', max: '100', value: '70' }),
    afCopago: h('input', { class: 'input', type: 'number', min: '0', max: '100', value: '30' }),
    afEstado: h('select', { class: 'select' }, ESTADOS.map((e) => h('option', { value: e }, e.replace(/_/g, ' ')))),
    afError: h('div', { role: 'alert' }),
    afiliados: h('div', { class: 'config-lista' }),
  };

  const botonSillon = h('button', { class: 'btn btn-primary', type: 'button', disabled: !puedeConfigurar, onClick: crearSillon }, 'Crear sillón');
  const botonPrest = h('button', { class: 'btn btn-primary', type: 'button', disabled: !puedeConfigurar, onClick: crearPrestacion }, 'Crear prestación');
  const botonAgregarFranja = h('button', { class: 'btn btn-secondary', type: 'button', disabled: !puedeConfigurar, onClick: agregarFranja }, 'Agregar franja');
  const botonGuardarDisp = h('button', { class: 'btn btn-primary', type: 'button', disabled: !puedeConfigurar, onClick: guardarDisponibilidad }, 'Guardar disponibilidad');
  const botonBloqueo = h('button', { class: 'btn btn-primary', type: 'button', disabled: !puedeBloquear, onClick: crearBloqueo }, 'Crear bloqueo');
  const botonObra = h('button', { class: 'btn btn-primary', type: 'button', disabled: !puedeConfigurar, onClick: crearObraSocial }, 'Registrar obra social');
  const botonAfiliado = h('button', { class: 'btn btn-primary', type: 'button', disabled: !puedeConfigurar && usuario.rol !== 'recepcion', onClick: crearAfiliado }, 'Registrar afiliado');

  reemplazar(
    contenedor,
    h(
      'div',
      { class: 'vista' },
      h('div', { class: 'alert alert-info', role: 'note' }, 'Datos ficticios. Todo queda en memoria dentro del servidor local; no se contacta ningún servicio real.'),
      h(
        'section',
        { class: 'card', 'aria-labelledby': 'cfg-sillones' },
        h('div', { class: 'card-head' }, h('h2', { id: 'cfg-sillones' }, 'Sillones')),
        n.sillones,
        h(
          'form',
          { class: 'form-grid', style: { marginTop: '16px' }, onSubmit: (e) => { e.preventDefault(); crearSillon(); } },
          h('div', { class: 'field' }, h('label', { for: 'cfg-sillon-nombre' }, 'Nombre del sillón'), n.sillonNombre),
          n.sillonError,
          botonSillon,
        ),
        h('p', { class: 'small muted' }, 'RN-CF-04: un sillón dado de baja no acepta turnos nuevos.'),
      ),
      h(
        'section',
        { class: 'card', 'aria-labelledby': 'cfg-prest' },
        h('div', { class: 'card-head' }, h('h2', { id: 'cfg-prest' }, 'Prestaciones')),
        n.prestaciones,
        h(
          'form',
          { class: 'form-grid', style: { marginTop: '16px' }, onSubmit: (e) => { e.preventDefault(); crearPrestacion(); } },
          h('div', { class: 'form-row' },
            h('div', { class: 'field' }, h('label', { for: 'cfg-prest-codigo' }, 'Código'), n.prestCodigo),
            h('div', { class: 'field' }, h('label', { for: 'cfg-prest-nombre' }, 'Nombre'), n.prestNombre),
          ),
          h('div', { class: 'field' }, h('label', { for: 'cfg-prest-duracion' }, 'Duración (minutos)'), n.prestDuracion, h('span', { class: 'hint' }, 'Debe ser múltiplo de 15 (RN-CF-01).')),
          n.prestError,
          botonPrest,
        ),
      ),
      h(
        'section',
        { class: 'card', 'aria-labelledby': 'cfg-disp' },
        h('div', { class: 'card-head' }, h('h2', { id: 'cfg-disp' }, 'Disponibilidad semanal')),
        h('div', { class: 'toolbar' },
          h('div', { class: 'field' }, h('label', { for: 'cfg-prof' }, 'Profesional'), n.profSeleccion),
          h('div', { class: 'field' }, h('label', { for: 'cfg-dia' }, 'Día'), n.dia),
          h('div', { class: 'field' }, h('label', { for: 'cfg-desde' }, 'Desde'), n.desde),
          h('div', { class: 'field' }, h('label', { for: 'cfg-hasta' }, 'Hasta'), n.hasta),
          botonAgregarFranja,
        ),
        n.franjas,
        n.dispError,
        h('div', { class: 'actions', style: { marginTop: '14px' } }, botonGuardarDisp),
        h('p', { class: 'small muted' }, 'RN-CF-02: las franjas de un mismo día no pueden solaparse. Para probar el error, agregá 09:00–11:00 y 10:00–12:00 del mismo día y guardá.'),
      ),
      h(
        'section',
        { class: 'card', 'aria-labelledby': 'cfg-bloqueos' },
        h('div', { class: 'card-head' }, h('h2', { id: 'cfg-bloqueos' }, 'Bloqueos de agenda')),
        n.bloqueos,
        h(
          'form',
          { class: 'form-grid', style: { marginTop: '16px' }, onSubmit: (e) => { e.preventDefault(); crearBloqueo(); } },
          h('div', { class: 'form-row' },
            h('div', { class: 'field' }, h('label', { for: 'cfg-bloq-prof' }, 'Profesional'), n.bloqProfesional),
            h('div', { class: 'field' }, h('label', { for: 'cfg-bloq-fecha' }, 'Fecha'), n.bloqFecha),
          ),
          h('div', { class: 'form-row' },
            h('div', { class: 'field' }, h('label', { for: 'cfg-bloq-desde' }, 'Desde'), n.bloqDesde),
            h('div', { class: 'field' }, h('label', { for: 'cfg-bloq-hasta' }, 'Hasta'), n.bloqHasta),
          ),
          h('div', { class: 'field' }, h('label', { for: 'cfg-bloq-motivo' }, 'Motivo'), n.bloqMotivo),
          n.bloqError,
          botonBloqueo,
        ),
        h('p', { class: 'small muted' }, 'RN-CF-03: un odontólogo solo puede bloquear su propia agenda.'),
      ),
      h(
        'section',
        { class: 'card', 'aria-labelledby': 'cfg-padron' },
        h('div', { class: 'card-head' }, h('h2', { id: 'cfg-padron' }, 'Obras sociales y afiliados (SIMULACIÓN)')),
        h('p', { class: 'small muted' }, 'Lo que se registra acá queda disponible en Clientes, en /sim/obras-sociales.html y en el bot de WhatsApp.'),
        h('h3', null, 'Obras sociales'),
        n.obras,
        h(
          'form',
          { class: 'form-grid', style: { marginTop: '12px' }, onSubmit: (e) => { e.preventDefault(); crearObraSocial(); } },
          h('div', { class: 'form-row' },
            h('div', { class: 'field' }, h('label', { for: 'cfg-os-codigo' }, 'Código'), n.osCodigo, h('span', { class: 'hint' }, 'Formato OS-NN.')),
            h('div', { class: 'field' }, h('label', { for: 'cfg-os-nombre' }, 'Nombre'), n.osNombre),
          ),
          h('div', { class: 'field' }, h('label', { for: 'cfg-os-planes' }, 'Planes'), n.osPlanes, h('span', { class: 'hint' }, 'Separalos con comas.'))
        ),
        h('div', { style: { marginTop: '12px' } }, n.osError, botonObra),
        h('h3', { style: { marginTop: '24px' } }, 'Números de afiliado'),
        n.afiliados,
        h(
          'form',
          { class: 'form-grid', style: { marginTop: '12px' }, onSubmit: (e) => { e.preventDefault(); crearAfiliado(); } },
          h('div', { class: 'form-row' },
            h('div', { class: 'field' }, h('label', { for: 'cfg-af-nro' }, 'Número'), n.afNro, h('span', { class: 'hint' }, 'Formato AF-NNNN.')),
            h('div', { class: 'field' }, h('label', { for: 'cfg-af-obra' }, 'Obra social'), n.afObra),
          ),
          h('div', { class: 'form-row' },
            h('div', { class: 'field' }, h('label', { for: 'cfg-af-plan' }, 'Plan'), n.afPlan),
            h('div', { class: 'field' }, h('label', { for: 'cfg-af-estado' }, 'Estado'), n.afEstado),
          ),
          h('div', { class: 'form-row' },
            h('div', { class: 'field' }, h('label', { for: 'cfg-af-cobertura' }, 'Cobertura %'), n.afCobertura),
            h('div', { class: 'field' }, h('label', { for: 'cfg-af-copago' }, 'Copago %'), n.afCopago),
          ),
          n.afError,
          botonAfiliado,
        ),
        h('p', { class: 'small muted' }, 'RN-DA-02: la ficha de Clientes enmascara DNI y teléfono. RN-SM-02: AF-0004 simula una falla de padrón. RN-SM-04: ninguna consulta sale del servidor local.'),
        h('div', { class: 'actions', style: { marginTop: '12px' } },
          h('a', { class: 'btn btn-secondary', href: '/sim/obras-sociales.html' }, 'Consultar en pantalla simulada'),
          h('a', { class: 'btn btn-secondary', href: '/bot.html' }, 'Probar en el bot de WhatsApp'),
        ),
      ),
    ),
  );

  /* ------------------------------ Dibujo ------------------------------ */
  function dibujarSillones() {
    reemplazar(
      n.sillones,
      ...estado.catalogo.sillones.map((s) =>
        h(
          'div',
          { class: 'config-item' },
          h('strong', null, s.nombre),
          h('span', { class: `chip ${s.activo ? 'st-confirmado' : 'st-ausente'}` }, s.activo ? 'Activo' : 'Inactivo'),
          h('span', { class: 'small muted' }, s.id),
          s.activo && puedeConfigurar
            ? h('button', { class: 'btn btn-secondary', type: 'button', onClick: () => bajaSillon(s.id) }, 'Dar de baja')
            : false,
        ),
      ),
    );
  }

  function dibujarPrestaciones() {
    reemplazar(
      n.prestaciones,
      ...estado.catalogo.prestaciones.map((p) =>
        h(
          'div',
          { class: 'config-item' },
          h('strong', null, p.nombre),
          h('span', { class: 'small muted' }, `${p.codigo} · ${p.duracionMin} min`),
        ),
      ),
    );
  }

  function dibujarFranjas() {
    reemplazar(
      n.franjas,
      ...estado.franjas.map((f, i) =>
        h(
          'div',
          { class: 'franja-row' },
          h('span', null, DIAS.find(([v]) => v === f.diaSemana)?.[1] ?? String(f.diaSemana)),
          h('span', { class: 'num' }, `${f.desde}–${f.hasta}`),
          puedeConfigurar
            ? h('button', { class: 'btn btn-ghost row-btn', type: 'button', onClick: () => { estado.franjas.splice(i, 1); dibujarFranjas(); } }, 'Quitar')
            : false,
        ),
      ),
      estado.franjas.length === 0 ? h('p', { class: 'small muted' }, 'Sin franjas cargadas.') : false,
    );
  }

  function dibujarBloqueos() {
    reemplazar(
      n.bloqueos,
      ...estado.bloqueos.map((b) => {
        const inicio = new Date(b.intervalo.inicio);
        const fin = new Date(b.intervalo.fin);
        const profesional = estado.catalogo.profesionales.find((p) => p.id === b.profesionalId)?.nombre ?? 'Todos';
        return h(
          'div',
          { class: 'config-item' },
          h('strong', null, b.motivo),
          h('span', { class: 'small muted' }, `${inicio.toISOString().slice(0, 10)} ${inicio.toISOString().slice(11, 16)}–${fin.toISOString().slice(11, 16)} · ${profesional}`),
          puedeBloquear ? h('button', { class: 'btn btn-ghost row-btn', type: 'button', onClick: () => bajaBloqueo(b.id) }, 'Quitar') : false,
        );
      }),
      estado.bloqueos.length === 0 ? h('p', { class: 'small muted' }, 'Sin bloqueos cargados.') : false,
    );
  }

  function sincronizarPlanes() {
    const obra = estado.padron.obrasSociales.find((o) => o.codigo === n.afObra.value);
    reemplazar(n.afPlan, ...(obra?.planes ?? []).map((p) => h('option', { value: p }, p)));
  }

  function dibujarPadron() {
    reemplazar(
      n.afObra,
      ...estado.padron.obrasSociales.map((o) => h('option', { value: o.codigo, selected: o.codigo === n.afObra.value }, `${o.codigo} · ${o.nombre}`)),
    );
    sincronizarPlanes();
    reemplazar(
      n.obras,
      ...estado.padron.obrasSociales.map((o) =>
        h(
          'div',
          { class: 'config-item' },
          h('strong', null, o.codigo),
          h('span', null, o.nombre),
          h('span', { class: 'small muted' }, o.planes.join(', ')),
        ),
      ),
    );
    reemplazar(
      n.afiliados,
      ...estado.padron.afiliados.map((a) =>
        h(
          'div',
          { class: 'config-item' },
          h('strong', { class: 'num' }, a.nroAfiliado),
          h('span', { class: 'small muted' }, `${a.obraSocial} · ${a.plan} · ${a.cobertura}% / ${a.copagoPct}% · ${a.estado}`),
        ),
      ),
    );
  }

  /* ------------------------------ Acciones ------------------------------ */
  async function recargar() {
    const [catalogo, bloqueos, padron] = await Promise.all([
      api.get('/api/catalogo'),
      api.get('/api/bloqueos'),
      api.get('/api/sim/obras-sociales/padron'),
    ]);
    if (!ctx.esActual()) return;
    estado.catalogo = catalogo;
    estado.bloqueos = bloqueos.bloqueos;
    estado.padron = padron;
    reemplazar(n.profSeleccion, ...opcionesProfesionales(estado.catalogo.profesionales, estado.profesionalId));
    reemplazar(n.bloqProfesional, h('option', { value: '' }, 'Todos los profesionales'), ...opcionesProfesionales(estado.catalogo.profesionales, estado.bloqProfesional.value));
    estado.franjas = (estado.catalogo.profesionales.find((p) => p.id === estado.profesionalId)?.disponibilidad ?? []).map((f) => ({ ...f }));
    dibujarSillones();
    dibujarPrestaciones();
    dibujarFranjas();
    dibujarBloqueos();
    dibujarPadron();
  }

  async function crearSillon() {
    limpiar(n.sillonError);
    if (n.sillonNombre.value.trim() === '') {
      errorEn(n.sillonError, { mensaje: 'Escribí el nombre del sillón.' });
      return;
    }
    try {
      await api.post('/api/sillones', { nombre: n.sillonNombre.value.trim() });
      if (!ctx.esActual()) return;
      n.sillonNombre.value = '';
      await recargar();
      ctx.toast('Sillón creado');
    } catch (error) {
      if (ctx.esActual()) errorEn(n.sillonError, error);
    }
  }

  async function bajaSillon(id) {
    limpiar(n.sillonError);
    try {
      await api.delete(`/api/sillones/${encodeURIComponent(id)}`);
      if (ctx.esActual()) await recargar();
    } catch (error) {
      if (ctx.esActual()) errorEn(n.sillonError, error, 'RN-CF-04');
    }
  }

  async function crearPrestacion() {
    limpiar(n.prestError);
    try {
      await api.post('/api/prestaciones', {
        codigo: n.prestCodigo.value.trim(),
        nombre: n.prestNombre.value.trim(),
        duracionMin: Number(n.prestDuracion.value),
      });
      if (!ctx.esActual()) return;
      n.prestCodigo.value = '';
      n.prestNombre.value = '';
      await recargar();
      ctx.toast('Prestación creada');
    } catch (error) {
      if (ctx.esActual()) errorEn(n.prestError, error);
    }
  }

  function agregarFranja() {
    limpiar(n.dispError);
    estado.franjas.push({
      diaSemana: Number(n.dia.value),
      desde: n.desde.value,
      hasta: n.hasta.value,
    });
    dibujarFranjas();
  }

  async function guardarDisponibilidad() {
    limpiar(n.dispError);
    try {
      await api.put(`/api/profesionales/${encodeURIComponent(estado.profesionalId)}/disponibilidad`, estado.franjas);
      if (!ctx.esActual()) return;
      await recargar();
      ctx.toast('Disponibilidad guardada');
    } catch (error) {
      if (ctx.esActual()) errorEn(n.dispError, error);
    }
  }

  async function crearBloqueo() {
    limpiar(n.bloqError);
    if (n.bloqFecha.value === '' || n.bloqDesde.value === '' || n.bloqHasta.value === '' || n.bloqMotivo.value.trim() === '') {
      errorEn(n.bloqError, { mensaje: 'Completá fecha, horas y motivo.' });
      return;
    }
    try {
      await api.post('/api/bloqueos', {
        motivo: n.bloqMotivo.value.trim(),
        desde: iso(n.bloqFecha.value, n.bloqDesde.value),
        hasta: iso(n.bloqFecha.value, n.bloqHasta.value),
        ...(n.bloqProfesional.value === '' ? {} : { profesionalId: n.bloqProfesional.value }),
      });
      if (!ctx.esActual()) return;
      n.bloqMotivo.value = '';
      await recargar();
      ctx.toast('Bloqueo creado');
    } catch (error) {
      if (!ctx.esActual()) return;
      errorEn(n.bloqError, error, error?.status === 403 ? 'RN-CF-03' : undefined);
    }
  }

  async function bajaBloqueo(id) {
    limpiar(n.bloqError);
    try {
      await api.delete(`/api/bloqueos/${encodeURIComponent(id)}`);
      if (ctx.esActual()) await recargar();
    } catch (error) {
      if (ctx.esActual()) errorEn(n.bloqError, error);
    }
  }

  async function crearObraSocial() {
    limpiar(n.osError);
    try {
      await api.post('/api/sim/obras-sociales/obras-sociales', {
        codigo: n.osCodigo.value.trim(),
        nombre: n.osNombre.value.trim(),
        planes: n.osPlanes.value.split(',').map((p) => p.trim()).filter((p) => p !== ''),
      });
      if (!ctx.esActual()) return;
      n.osCodigo.value = '';
      n.osNombre.value = '';
      n.osPlanes.value = '';
      await recargar();
      n.afObra.value = 'OS-05';
      sincronizarPlanes();
      ctx.toast('Obra social registrada');
    } catch (error) {
      if (ctx.esActual()) errorEn(n.osError, error);
    }
  }

  async function crearAfiliado() {
    limpiar(n.afError);
    try {
      await api.post('/api/sim/obras-sociales/afiliados', {
        nroAfiliado: n.afNro.value.trim(),
        obraSocial: n.afObra.value,
        plan: n.afPlan.value,
        cobertura: Number(n.afCobertura.value),
        copagoPct: Number(n.afCopago.value),
        estado: n.afEstado.value,
      });
      if (!ctx.esActual()) return;
      n.afNro.value = '';
      await recargar();
      ctx.toast('Afiliado registrado');
    } catch (error) {
      if (ctx.esActual()) errorEn(n.afError, error);
    }
  }

  n.afObra.addEventListener('change', sincronizarPlanes);

  try {
    await recargar();
  } catch (error) {
    if (ctx.esActual()) errorEn(n.dispError, error);
  }
}
