// Clientes (mockups/clientes.html): lista, búsqueda por nombre en el navegador, ficha y alta/edición
// con los endpoints existentes. Odontólogo en solo lectura. DNI y teléfono llegan enmascarados.
import { aHoraLocal, diasDeSemana, etiquetaEstado, hhmm } from './agenda-calculos.js';
import { filtrarPacientes, textoResultados } from './clientes-calculos.js';
import { h, mensajeDe, reemplazar } from './dom.js';
import { puedeEditarClientes, puedeLeerHistorial } from './permisos-ui.js';

const DIA_MS = 24 * 60 * 60 * 1000;
const CAMPOS_FORM = [
  { clave: 'nombre', etiqueta: 'Nombre', ayuda: 'Solo nombres ficticios.', requerido: true },
  { clave: 'dni', etiqueta: 'DNI', ayuda: 'Formato ficticio 99NNNNNN.', requerido: true },
  { clave: 'telefono', etiqueta: 'Teléfono', ayuda: 'Formato ficticio +54 9 11 0000-00NN.', requerido: true },
  { clave: 'email', etiqueta: 'Email (opcional)', ayuda: 'Debe terminar en @ejemplo.invalid.' },
  { clave: 'obraSocialId', etiqueta: 'Obra social (opcional)', ayuda: 'Formato OS-NN.' },
  { clave: 'nroAfiliado', etiqueta: 'Nº de afiliado (opcional)', ayuda: 'Formato AF-NNNN.' },
];

function obraSocialTexto(p) {
  if (!p.obraSocialId) return '—';
  return p.nroAfiliado ? `${p.obraSocialId} (sim.) · afiliado ${p.nroAfiliado}` : `${p.obraSocialId} (sim.)`;
}

export async function montarClientes(contenedor, ctx) {
  const { api, usuario } = ctx;
  const puedeEditar = puedeEditarClientes(usuario.rol);
  ctx.titulo('Clientes', 'Pacientes del consultorio');

  const estado = {
    pacientes: [],
    consulta: '',
    seleccionId: ctx.id,
    turnos: [],
    prestaciones: [],
    modo: undefined, // 'nuevo' | 'editar'
  };

  const total = h('span', { class: 'muted small num' });
  const resultados = h('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });
  const cuerpoTabla = h('tbody');
  const vacio = h('p', { class: 'empty', hidden: true }, 'No encontramos pacientes con ese criterio.');
  const ficha = h('section', { class: 'card', 'aria-labelledby': 't-ficha' });
  const buscador = h('input', {
    id: 'q',
    class: 'input',
    type: 'search',
    placeholder: 'Ej.: Tres',
    autocomplete: 'off',
    onInput: (e) => {
      estado.consulta = e.target.value;
      dibujarLista();
    },
  });

  const lista = h(
    'section',
    { class: 'card', 'aria-labelledby': 't-lista' },
    h(
      'div',
      { class: 'card-head' },
      h('h2', { id: 't-lista' }, 'Pacientes ', total),
      h(
        'div',
        { class: 'actions' },
        h('a', { class: 'btn btn-secondary', href: '/sim/obras-sociales.html' }, 'Cobertura (sim.)'),
        puedeEditar
          ? h('button', { class: 'btn btn-primary', type: 'button', onClick: () => abrirFormulario('nuevo') }, '+ Nuevo paciente')
          : false,
      ),
    ),
    h('div', { class: 'toolbar', style: { marginBottom: '12px' } }, h('div', { class: 'field' }, h('label', { for: 'q' }, 'Buscar por nombre'), buscador)),
    h('p', { class: 'small muted', style: { margin: '0 0 12px' } }, 'DNI y teléfono enmascarados (RN-DA-02). Probá repetir un DNI para ver DNI_DUPLICADO.'),
    resultados,
    h(
      'div',
      { style: { overflowX: 'auto' } },
      h(
        'table',
        { class: 'table' },
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            h('th', { scope: 'col' }, 'Paciente'),
            h('th', { scope: 'col' }, 'DNI'),
            h('th', { scope: 'col', class: 'hide-sm' }, 'Teléfono'),
            h('th', { scope: 'col', class: 'hide-sm' }, 'Obra social'),
            h('th', { scope: 'col' }, h('span', { class: 'visually-hidden' }, 'Acciones')),
          ),
        ),
        cuerpoTabla,
      ),
    ),
    vacio,
  );

  reemplazar(contenedor, h('div', { class: 'split' }, lista, ficha));
  reemplazar(ficha, h('p', { class: 'loading', 'aria-busy': 'true' }, 'Cargando pacientes…'));

  /* ------------------------- Datos ------------------------- */
  async function cargarPacientes() {
    const r = await api.get('/api/pacientes');
    estado.pacientes = r.pacientes;
  }

  async function cargarContexto() {
    try {
      const ahora = Date.now();
      const rango = new URLSearchParams({
        desde: new Date(ahora).toISOString(),
        hasta: new Date(ahora + 90 * DIA_MS).toISOString(),
      });
      const [turnos, catalogo] = await Promise.all([api.get(`/api/turnos?${rango}`), api.get('/api/catalogo')]);
      estado.turnos = turnos.turnos;
      estado.prestaciones = catalogo.prestaciones;
    } catch (error) {
      if (error?.status === 401) throw error;
      estado.turnos = []; // el próximo turno es informativo: la ficha sigue funcionando
    }
  }

  /* ------------------------- Dibujo ------------------------- */
  function dibujarLista() {
    const filtrados = filtrarPacientes(estado.pacientes, estado.consulta);
    total.textContent = `(${estado.pacientes.length})`;
    resultados.textContent = textoResultados(filtrados.length);
    vacio.hidden = filtrados.length !== 0;
    reemplazar(
      cuerpoTabla,
      filtrados.map((p) =>
        h(
          'tr',
          { class: p.id === estado.seleccionId ? 'sel' : false },
          h('td', null, p.nombre),
          h('td', { class: 'num' }, p.dni),
          h('td', { class: 'num hide-sm' }, p.telefono),
          h('td', { class: 'hide-sm' }, obraSocialTexto(p)),
          h(
            'td',
            null,
            h(
              'button',
              {
                class: 'btn btn-ghost row-btn',
                type: 'button',
                'aria-label': `Ver ficha de ${p.nombre}`,
                'aria-pressed': p.id === estado.seleccionId ? 'true' : false,
                onClick: () => seleccionar(p.id),
              },
              'Ver ficha',
            ),
          ),
        ),
      ),
    );
  }

  function seleccionar(id) {
    estado.seleccionId = id;
    estado.modo = undefined;
    history.replaceState(null, '', `#/clientes/${encodeURIComponent(id)}`);
    dibujarLista();
    dibujarFicha();
  }

  function proximoTurno(pacienteId) {
    const ahora = Date.now();
    return estado.turnos
      .filter((t) => t.pacienteId === pacienteId && (t.estado === 'reservado' || t.estado === 'confirmado') && Date.parse(t.fin) > ahora)
      .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))[0];
  }

  function dibujarFicha() {
    if (estado.modo !== undefined) {
      dibujarFormulario();
      return;
    }
    const p = estado.pacientes.find((x) => x.id === estado.seleccionId);
    if (p === undefined) {
      reemplazar(
        ficha,
        h('div', { class: 'card-head' }, h('h2', { id: 't-ficha' }, 'Ficha del paciente')),
        h('p', { class: 'small muted' }, 'Elegí un paciente de la lista para ver su ficha.'),
      );
      return;
    }
    const turno = proximoTurno(p.id);
    const inicio = turno ? aHoraLocal(turno.inicio) : undefined;
    const dia = inicio ? diasDeSemana(inicio.fecha).find((d) => d.fecha === inicio.fecha) : undefined;
    const prestacion = turno ? (estado.prestaciones.find((x) => x.id === turno.prestacionId)?.nombre ?? turno.prestacionId) : '';
    reemplazar(
      ficha,
      h(
        'div',
        { class: 'card-head' },
        h('h2', { id: 't-ficha' }, p.nombre),
        puedeEditar ? h('button', { class: 'btn btn-secondary', type: 'button', onClick: () => abrirFormulario('editar') }, 'Editar') : false,
      ),
      h(
        'dl',
        { class: 'dl' },
        h('dt', null, 'DNI'), h('dd', { class: 'num' }, p.dni),
        h('dt', null, 'Teléfono'), h('dd', { class: 'num' }, p.telefono),
        h('dt', null, 'Email'), h('dd', null, p.email ?? '—'),
        h('dt', null, 'Obra social'), h('dd', null, obraSocialTexto(p)),
      ),
      h('h3', { style: { marginTop: '20px' } }, 'Próximo turno'),
      turno
        ? h(
            'p',
            { class: 'small', style: { margin: '6px 0 0' } },
            h('span', { class: 'num' }, `${dia?.nombre.slice(0, 3) ?? ''} ${dia?.corta ?? ''} · ${hhmm(inicio.minutos)}`),
            ` · ${prestacion} · `,
            h('span', { class: `chip st-${turno.estado}` }, etiquetaEstado(turno.estado)),
          )
        : h('p', { class: 'small muted', style: { margin: '6px 0 0' } }, 'Sin turnos próximos.'),
      h(
        'div',
        { class: 'actions', style: { marginTop: '20px' } },
        h('a', { class: 'btn btn-secondary', href: '#/agenda' }, 'Ver en la agenda'),
        puedeLeerHistorial(usuario.rol)
          ? h('a', { class: 'btn btn-secondary', href: `#/historial/${encodeURIComponent(p.id)}` }, 'Ver historial clínico')
          : false,
      ),
      puedeLeerHistorial(usuario.rol)
        ? false
        : h('p', { class: 'small muted', style: { margin: '16px 0 0' } }, 'El historial clínico no está disponible para recepción.'),
    );
  }

  function abrirFormulario(modo) {
    estado.modo = modo;
    dibujarFicha();
    ficha.querySelector('input')?.focus();
  }

  function dibujarFormulario() {
    const editando = estado.modo === 'editar';
    const actual = editando ? estado.pacientes.find((x) => x.id === estado.seleccionId) : undefined;
    const error = h('div', { role: 'alert' });
    const inputs = new Map();
    const campos = CAMPOS_FORM.map((c) => {
      const input = h('input', {
        id: `p-${c.clave}`,
        class: 'input',
        type: 'text',
        autocomplete: 'off',
        'aria-describedby': `p-${c.clave}-ayuda`,
        'aria-required': c.requerido ? 'true' : false,
        // DNI y teléfono llegan enmascarados: al editar hay que volver a ingresarlos.
        value: actual && !['dni', 'telefono'].includes(c.clave) ? (actual[c.clave] ?? '') : '',
      });
      inputs.set(c.clave, input);
      const ayuda =
        editando && ['dni', 'telefono'].includes(c.clave)
          ? `${c.ayuda} Se muestran enmascarados: volvé a ingresarlo para guardar.`
          : c.ayuda;
      return h('div', { class: 'field' }, h('label', { for: `p-${c.clave}` }, c.etiqueta), input, h('span', { class: 'hint', id: `p-${c.clave}-ayuda` }, ayuda));
    });

    const enviar = async (e) => {
      e.preventDefault();
      const cuerpo = {};
      for (const c of CAMPOS_FORM) {
        const v = inputs.get(c.clave).value.trim();
        if (v !== '') cuerpo[c.clave] = v;
      }
      if (!cuerpo.nombre || !cuerpo.dni || !cuerpo.telefono) {
        reemplazar(error, h('div', { class: 'alert alert-error' }, 'Completá nombre, DNI y teléfono.'));
        return;
      }
      const boton = e.submitter ?? ficha.querySelector('button[type="submit"]');
      if (boton) boton.disabled = true;
      reemplazar(error);
      try {
        const guardado = editando
          ? await api.put(`/api/pacientes/${encodeURIComponent(estado.seleccionId)}`, cuerpo)
          : await api.post('/api/pacientes', cuerpo);
        if (!ctx.esActual()) return;
        await cargarPacientes(); // se vuelve a leer: la lista siempre muestra datos enmascarados
        estado.seleccionId = guardado.id;
        estado.modo = undefined;
        history.replaceState(null, '', `#/clientes/${encodeURIComponent(guardado.id)}`);
        dibujarLista();
        dibujarFicha();
        ctx.toast(editando ? 'Paciente actualizado' : 'Paciente creado');
      } catch (err) {
        if (!ctx.esActual() || err?.status === 401) return;
        reemplazar(error, h('div', { class: 'alert alert-error' }, mensajeDe(err)));
        if (boton) boton.disabled = false;
      }
    };

    reemplazar(
      ficha,
      h('div', { class: 'card-head' }, h('h2', { id: 't-ficha' }, editando ? 'Editar paciente' : 'Nuevo paciente')),
      h(
        'form',
        { class: 'form-grid', novalidate: true, onSubmit: enviar },
        campos,
        error,
        h(
          'div',
          { class: 'actions' },
          h('button', { class: 'btn btn-primary', type: 'submit' }, 'Guardar'),
          h('button', { class: 'btn btn-secondary', type: 'button', onClick: () => { estado.modo = undefined; dibujarFicha(); } }, 'Cancelar'),
        ),
        h('p', { class: 'small muted', style: { margin: 0 } }, 'Solo datos ficticios.'),
      ),
    );
  }

  /* ------------------------- Arranque ------------------------- */
  try {
    await Promise.all([cargarPacientes(), cargarContexto()]);
  } catch (error) {
    if (!ctx.esActual() || error?.status === 401) return;
    reemplazar(
      ficha,
      h('div', { class: 'alert alert-error', role: 'alert' }, mensajeDe(error)),
      h('button', { class: 'btn btn-secondary', type: 'button', style: { marginTop: '12px' }, onClick: () => montarClientes(contenedor, ctx) }, 'Reintentar'),
    );
    return;
  }
  if (!ctx.esActual()) return;
  dibujarLista();
  dibujarFicha();
}
