// Historial clínico (mockups/historial.html): línea de tiempo descendente, piezas del turno vinculado
// y formulario de alta solo para odontólogo. De solo inserción: no hay editar ni borrar.
import { aHoraLocal, diasDeSemana, hhmm } from './agenda-calculos.js';
import { h, mensajeDe, reemplazar } from './dom.js';
import { aFechaIso, contadorNotas, validarEntradaForm } from './historial-calculos.js';
import { puedeCrearHistorial } from './permisos-ui.js';

const DIA_MS = 24 * 60 * 60 * 1000;
const ROTULO = 'Datos ficticios — no es una historia clínica legal';
const SINTOMAS = {
  dolor_masticar: 'dolor al masticar',
  caries_arreglo_roto: 'caries o arreglo roto',
  dolor_persistente: 'dolor persistente',
  pieza_faltante: 'pieza faltante',
};

const dos = (n) => String(n).padStart(2, '0');

/** 'dd/mm/yyyy' y 'HH:mm' (hora del consultorio) de un instante ISO. */
function fechaYHora(iso) {
  const { fecha, minutos } = aHoraLocal(iso);
  return { fecha: `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}/${fecha.slice(0, 4)}`, hora: hhmm(minutos) };
}

/** Valor inicial de <input type="datetime-local"> en hora del consultorio ('YYYY-MM-DDTHH:mm'). */
function ahoraLocalParaInput() {
  const { fecha, minutos } = aHoraLocal(new Date().toISOString());
  return `${fecha}T${dos(Math.floor(minutos / 60))}:${dos(minutos % 60)}`;
}

function textoPieza(p) {
  const partes = [`Pieza ${p.pieza}`, p.estado === 'hecho' ? 'hecho' : 'a revisar'];
  if (p.caras?.length) partes.push(`caras ${p.caras.join(', ')}`);
  if (p.sintomas?.length) partes.push(p.sintomas.map((s) => SINTOMAS[s] ?? s).join(', '));
  return partes.join(' · ');
}

/** #/historial sin id: elegir un paciente (la barra lateral no sabe de qué paciente se trata). */
async function elegirPaciente(contenedor, ctx) {
  ctx.titulo('Historial clínico', 'Elegí un paciente');
  const r = await ctx.api.get('/api/pacientes');
  if (!ctx.esActual()) return;
  reemplazar(
    contenedor,
    h('p', { class: 'sim', role: 'note', style: { borderRadius: 'var(--adm-radius-md)', border: '1px solid var(--adm-blue-300)' } }, ROTULO),
    h(
      'section',
      { class: 'card', 'aria-labelledby': 't-elegir' },
      h('div', { class: 'card-head' }, h('h2', { id: 't-elegir' }, 'Elegí un paciente')),
      h(
        'ul',
        { class: 'list' },
        r.pacientes.map((p) =>
          h(
            'li',
            { style: { gridTemplateColumns: '1fr auto' } },
            h('strong', null, p.nombre),
            h('a', { class: 'btn btn-secondary', href: `#/historial/${encodeURIComponent(p.id)}`, 'aria-label': `Ver historial de ${p.nombre}` }, 'Ver historial'),
          ),
        ),
      ),
    ),
  );
}

export async function montarHistorial(contenedor, ctx) {
  if (ctx.id === undefined) {
    await elegirPaciente(contenedor, ctx);
    return;
  }
  const { api, usuario } = ctx;
  const pacienteId = ctx.id;
  const puedeCrear = puedeCrearHistorial(usuario.rol);
  ctx.titulo('Historial clínico', '');

  const estado = { entradas: [], paciente: undefined, turnos: [], prestaciones: [] };

  /* ------------------------- Carga ------------------------- */
  let respuesta;
  try {
    respuesta = await Promise.all([
      api.get(`/api/pacientes/${encodeURIComponent(pacienteId)}`),
      api.get(`/api/pacientes/${encodeURIComponent(pacienteId)}/historia`),
    ]);
  } catch (error) {
    if (!ctx.esActual() || error?.status === 401) return;
    reemplazar(
      contenedor,
      h(
        'div',
        { class: 'card' },
        h('div', { class: error.status === 403 ? 'alert alert-info' : 'alert alert-error', role: error.status === 403 ? 'status' : 'alert' }, mensajeDe(error)),
        h('a', { class: 'btn btn-secondary', href: '#/clientes', style: { marginTop: '12px' } }, 'Volver a clientes'),
      ),
    );
    return;
  }
  if (!ctx.esActual()) return;
  estado.paciente = respuesta[0];
  estado.entradas = respuesta[1].entradas;
  ctx.titulo('Historial clínico', `Clientes / ${estado.paciente.nombre}`);

  if (puedeCrear) {
    try {
      const ahora = Date.now();
      const rango = new URLSearchParams({
        desde: new Date(ahora - 180 * DIA_MS).toISOString(),
        hasta: new Date(ahora + 90 * DIA_MS).toISOString(),
      });
      const [turnos, catalogo] = await Promise.all([api.get(`/api/turnos?${rango}`), api.get('/api/catalogo')]);
      estado.turnos = turnos.turnos.filter((t) => t.pacienteId === pacienteId);
      estado.prestaciones = catalogo.prestaciones;
    } catch (error) {
      if (error?.status === 401) return; // los turnos vinculables son opcionales
    }
  }
  if (!ctx.esActual()) return;

  /* ------------------------- Línea de tiempo ------------------------- */
  const encabezado = h('span', { class: 'small muted num' });
  const linea = h('div');

  function pintarEntradas() {
    encabezado.textContent = `DNI ${estado.paciente.dni} · ${estado.entradas.length} ${estado.entradas.length === 1 ? 'entrada' : 'entradas'}`;
    reemplazar(
      linea,
      estado.entradas.length === 0
        ? h('div', { class: 'empty' }, h('h3', { style: { color: 'var(--adm-text)' } }, 'Sin entradas todavía'), h('p', { class: 'small' }, 'La primera consulta registrada aparece acá.'))
        : h('ol', { class: 'timeline' }, estado.entradas.map(entradaItem)),
    );
  }

  function entradaItem(e) {
    const { fecha, hora } = fechaYHora(e.fecha);
    const detalle = h('div', { class: 'small', hidden: true });
    const boton = e.turnoId
      ? h(
          'button',
          {
            class: 'btn btn-ghost',
            type: 'button',
            'aria-expanded': 'false',
            style: { padding: 0, minHeight: '36px' },
            onClick: () => alternarPiezas(e.turnoId, boton, detalle),
          },
          'Ver piezas del turno',
        )
      : false;
    return h(
      'li',
      null,
      h('div', { class: 'fecha' }, fecha, h('span', null, hora)),
      h(
        'div',
        null,
        h('h3', null, e.procedimiento),
        h('span', { class: 'small muted' }, e.profesionalNombre),
        e.notas ? h('p', null, e.notas) : false,
        boton,
        detalle,
      ),
    );
  }

  async function alternarPiezas(turnoId, boton, detalle) {
    const abierto = boton.getAttribute('aria-expanded') === 'true';
    if (abierto) {
      boton.setAttribute('aria-expanded', 'false');
      detalle.hidden = true;
      return;
    }
    boton.setAttribute('aria-expanded', 'true');
    detalle.hidden = false;
    reemplazar(detalle, h('p', { class: 'loading', 'aria-busy': 'true' }, 'Cargando piezas…'));
    try {
      const r = await api.get(`/api/turnos/${encodeURIComponent(turnoId)}/piezas`);
      if (!ctx.esActual()) return;
      reemplazar(
        detalle,
        r.piezas.length === 0
          ? h('p', { class: 'muted' }, 'Sin piezas marcadas en ese turno.')
          : h('ul', { style: { margin: '6px 0 0', paddingLeft: '20px' } }, r.piezas.map((p) => h('li', null, textoPieza(p)))),
      );
    } catch (error) {
      if (!ctx.esActual() || error?.status === 401) return;
      reemplazar(detalle, h('div', { class: 'alert alert-error', role: 'alert' }, mensajeDe(error)));
    }
  }

  const tarjetaLinea = h(
    'section',
    { class: 'card', 'aria-labelledby': 't-tl' },
    h('div', { class: 'card-head' }, h('h2', { id: 't-tl' }, estado.paciente.nombre), encabezado),
    linea,
  );

  /* ------------------------- Formulario de alta (solo odontólogo) ------------------------- */
  let tarjetaForm = false;
  if (puedeCrear) tarjetaForm = construirFormulario();

  function construirFormulario() {
    const fecha = h('input', { id: 'f', class: 'input num', type: 'datetime-local', value: ahoraLocalParaInput(), 'aria-describedby': 'f-ayuda' });
    const turno = h(
      'select',
      { id: 'tu', class: 'select' },
      h('option', { value: '' }, 'Sin turno'),
      [...estado.turnos]
        .sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio))
        .map((t) => {
          const ini = aHoraLocal(t.inicio);
          const dia = diasDeSemana(ini.fecha).find((d) => d.fecha === ini.fecha);
          const nombre = estado.prestaciones.find((p) => p.id === t.prestacionId)?.nombre ?? t.prestacionId;
          return h('option', { value: t.id }, `${dia?.nombre.slice(0, 3) ?? ''} ${dia?.corta ?? ''} ${hhmm(ini.minutos)} · ${nombre}`);
        }),
    );
    const procedimiento = h('input', { id: 'p', class: 'input', type: 'text', maxlength: '120', autocomplete: 'off', 'aria-describedby': 'p-ayuda' });
    const notas = h('textarea', {
      id: 'n',
      class: 'input',
      maxlength: '1000',
      'aria-describedby': 'n-hint',
      onInput: () => {
        notasHint.textContent = contadorNotas(notas.value.length);
      },
    });
    const notasHint = h('span', { class: 'hint num', id: 'n-hint' }, contadorNotas(0));
    const errFecha = h('span', { class: 'err', id: 'f-err', hidden: true });
    const errProc = h('span', { class: 'err', id: 'p-err', hidden: true });
    const errNotas = h('span', { class: 'err', id: 'n-err', hidden: true });
    const errorApi = h('div', { role: 'alert' });
    const guardar = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Guardar entrada');

    const marcar = (input, errEl, mensaje, ayudaId) => {
      if (mensaje) {
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', `${errEl.id} ${ayudaId}`);
        errEl.textContent = mensaje;
        errEl.hidden = false;
      } else {
        input.removeAttribute('aria-invalid');
        input.setAttribute('aria-describedby', ayudaId);
        errEl.hidden = true;
        errEl.textContent = '';
      }
    };

    const enviar = async (e) => {
      e.preventDefault();
      reemplazar(errorApi);
      const campos = { fecha: fecha.value, procedimiento: procedimiento.value, notas: notas.value };
      const v = validarEntradaForm(campos, new Date().toISOString());
      marcar(fecha, errFecha, v.errores.fecha, 'f-ayuda');
      marcar(procedimiento, errProc, v.errores.procedimiento, 'p-ayuda');
      marcar(notas, errNotas, v.errores.notas, 'n-hint');
      if (!v.valido) {
        // Sin llamar a la API: el foco va al primer campo inválido.
        [fecha, procedimiento, notas].find((i) => i.getAttribute('aria-invalid') === 'true')?.focus();
        return;
      }
      guardar.disabled = true;
      try {
        await api.post(`/api/pacientes/${encodeURIComponent(pacienteId)}/historia`, {
          fecha: aFechaIso(campos.fecha),
          procedimiento: campos.procedimiento,
          notas: campos.notas,
          ...(turno.value !== '' && { turnoId: turno.value }),
        });
        if (!ctx.esActual()) return;
        const r = await api.get(`/api/pacientes/${encodeURIComponent(pacienteId)}/historia`);
        if (!ctx.esActual()) return;
        estado.entradas = r.entradas;
        pintarEntradas();
        procedimiento.value = '';
        notas.value = '';
        notasHint.textContent = contadorNotas(0);
        turno.value = '';
        fecha.value = ahoraLocalParaInput();
        ctx.toast('Entrada guardada');
        procedimiento.focus();
      } catch (error) {
        if (!ctx.esActual() || error?.status === 401) return;
        reemplazar(errorApi, h('div', { class: 'alert alert-error' }, mensajeDe(error)));
      } finally {
        guardar.disabled = false;
      }
    };

    return h(
      'section',
      { class: 'card', 'aria-labelledby': 't-form' },
      h('h2', { id: 't-form', style: { marginBottom: '14px' } }, 'Nueva entrada'),
      h(
        'form',
        { class: 'form-grid', novalidate: true, onSubmit: enviar },
        h(
          'div',
          { class: 'form-row' },
          h('div', { class: 'field' }, h('label', { for: 'f' }, 'Fecha y hora'), fecha, h('span', { class: 'hint', id: 'f-ayuda' }, 'No puede ser futura.'), errFecha),
          h('div', { class: 'field' }, h('label', { for: 'tu' }, 'Turno vinculado (opcional)'), turno),
        ),
        h('div', { class: 'field' }, h('label', { for: 'p' }, 'Procedimiento'), procedimiento, h('span', { class: 'hint', id: 'p-ayuda' }, 'Hasta 120 caracteres.'), errProc),
        h('div', { class: 'field' }, h('label', { for: 'n' }, 'Notas'), notas, notasHint, errNotas),
        errorApi,
        h('div', { class: 'actions' }, guardar),
        h('p', { class: 'small muted', style: { margin: 0 } }, `Se registra con tu profesional (${usuario.nombre}). Queda en la auditoría sin el contenido clínico.`),
      ),
    );
  }

  pintarEntradas();
  reemplazar(
    contenedor,
    h('p', { class: 'sim', role: 'note', style: { borderRadius: 'var(--adm-radius-md)', border: '1px solid var(--adm-blue-300)' } }, ROTULO),
    h('div', { class: 'split', style: tarjetaForm ? false : { gridTemplateColumns: 'minmax(0, 1fr)' } }, tarjetaLinea, tarjetaForm),
  );
}
