// Odontograma de un turno (mockups/odontograma.html), ruta del panel #/odontograma/<turnoId>.
// Solo el odontólogo llega acá (guarda de ruta en permisos-ui.js; la API responde 403 al resto).
import { cuadrantes, CARAS_UI, etiquetaEstadoPieza, nombrePieza, SINTOMAS_UI, validarSeleccion } from './odontograma-calculos.js';
import { aHoraLocal, diasDeSemana, hhmm, lunesDeLaSemana } from './agenda-calculos.js';
import { h, mensajeDe, reemplazar } from './dom.js';

const NO_ENCONTRADO = 'No encontramos ese turno.';
const MARCA = { a_revisar: '!', hecho: '✓' };
const LEYENDA_ESTADO = { a_revisar: '! A revisar', hecho: '✓ Hecho' };

const volverAAgenda = () => h('a', { class: 'btn btn-secondary', href: '#/agenda' }, '‹ Volver a la agenda');

function pantallaSinTurno(contenedor) {
  reemplazar(
    contenedor,
    h(
      'div',
      { class: 'card' },
      h('div', { class: 'alert alert-error', role: 'alert' }, NO_ENCONTRADO),
      h('div', { style: { marginTop: '12px' } }, volverAAgenda()),
    ),
  );
}

export async function montarOdontograma(contenedor, ctx) {
  const { api } = ctx;
  ctx.titulo('Odontograma', 'Agenda › Turno');
  const turnoId = ctx.id;
  if (turnoId === undefined) {
    pantallaSinTurno(contenedor);
    return;
  }

  let turno;
  let piezas;
  let paciente;
  let prestacion;
  let profesional;
  let sillon;
  try {
    const [lista, catalogo, pacientes] = await Promise.all([api.get('/api/turnos'), api.get('/api/catalogo'), api.get('/api/pacientes')]);
    if (!ctx.esActual()) return;
    turno = lista.turnos.find((t) => t.id === turnoId);
    if (turno === undefined) {
      pantallaSinTurno(contenedor);
      return;
    }
    paciente = pacientes.pacientes.find((p) => p.id === turno.pacienteId)?.nombre ?? turno.pacienteId;
    prestacion = catalogo.prestaciones.find((p) => p.id === turno.prestacionId)?.nombre ?? turno.prestacionId;
    profesional = catalogo.profesionales.find((p) => p.id === turno.profesionalId)?.nombre ?? turno.profesionalId;
    sillon = catalogo.sillones.find((s) => s.id === turno.sillonId)?.nombre ?? turno.sillonId;
    piezas = new Map((await api.get(`/api/turnos/${encodeURIComponent(turnoId)}/piezas`)).piezas.map((p) => [p.pieza, p]));
    if (!ctx.esActual()) return;
  } catch (error) {
    if (!ctx.esActual() || error?.status === 401) return;
    if (error?.status === 404) {
      pantallaSinTurno(contenedor);
      return;
    }
    throw error; // main.js muestra el error con "Reintentar"
  }

  ctx.titulo('Odontograma', `Agenda › Turno de ${paciente}`);
  const inicio = aHoraLocal(turno.inicio);
  const fin = aHoraLocal(turno.fin);
  const dia = diasDeSemana(lunesDeLaSemana(inicio.fecha)).find((d) => d.fecha === inicio.fecha);
  const horario = `${dia?.nombre.slice(0, 3) ?? ''} ${dia?.corta ?? ''} · ${hhmm(inicio.minutos)}–${hhmm(fin.minutos)}`;

  const est = { seleccionada: undefined, caras: new Set(), sintomas: new Set(), error: undefined, enviando: false };
  const errorRegion = h('div', { role: 'alert', id: 'od-error', tabindex: '-1' });

  function seleccionar(numero) {
    est.seleccionada = numero;
    const guardada = piezas.get(numero);
    est.caras = new Set(guardada?.caras ?? []);
    est.sintomas = new Set(guardada?.sintomas ?? []);
    est.error = undefined;
    dibujar(`[data-pieza="${numero}"]`);
  }

  function alternar(conjunto, valor) {
    if (conjunto.has(valor)) conjunto.delete(valor);
    else conjunto.add(valor);
  }

  async function enviar(cuerpo, aviso, selectorFoco) {
    if (est.enviando) return;
    est.enviando = true;
    est.error = undefined;
    try {
      const guardada = await api.put(`/api/turnos/${encodeURIComponent(turnoId)}/piezas`, cuerpo);
      if (!ctx.esActual()) return;
      piezas.set(guardada.pieza, guardada);
      est.enviando = false;
      ctx.toast(aviso);
      dibujar(selectorFoco);
    } catch (error) {
      est.enviando = false;
      if (!ctx.esActual() || error?.status === 401) return;
      est.error = mensajeDe(error); // p. ej. 409 RN-OD-04: la pieza ya está hecha
      dibujar('#od-error');
    }
  }

  function guardar() {
    const sintomas = [...est.sintomas];
    const validacion = validarSeleccion(est.seleccionada, sintomas);
    if (!validacion.ok) {
      est.error = validacion.mensaje; // no se envía nada
      dibujar('#od-error');
      return;
    }
    enviar(
      { pieza: est.seleccionada, sintomas, caras: [...est.caras] },
      `Pieza ${est.seleccionada} agregada al turno`,
      `[data-pieza="${est.seleccionada}"]`,
    );
  }

  function marcarHecho() {
    enviar({ pieza: est.seleccionada, estado: 'hecho' }, `Pieza ${est.seleccionada} marcada como realizada`, `[data-pieza="${est.seleccionada}"]`);
  }

  function botonPieza(numero) {
    const e = piezas.get(numero)?.estado;
    return h(
      'button',
      {
        type: 'button',
        class: `pieza${e ? ` ${e}` : ''}`,
        'data-pieza': String(numero),
        'aria-pressed': String(est.seleccionada === numero),
        'aria-label': `${numero}, ${nombrePieza(numero)}, ${etiquetaEstadoPieza(e)}`,
        onClick: () => seleccionar(numero),
      },
      `${e ? MARCA[e] : ''}${numero}`,
    );
  }

  function cuadrante(c) {
    return h(
      'div',
      { class: 'cuadrante' },
      h('div', { class: 'q' }, `${c.nombre} (${c.piezas[0]}–${c.piezas[c.piezas.length - 1]})`),
      h('div', { class: 'piezas' }, c.piezas.map(botonPieza)),
    );
  }

  function detalle() {
    const n = est.seleccionada;
    if (n === undefined) return h('p', { class: 'muted' }, 'Seleccioná una pieza.');
    const guardada = piezas.get(n);
    const hecha = guardada?.estado === 'hecho';
    return [
      h('p', { id: 'od-nombre' }, `${n} · ${nombrePieza(n)}`),
      h(
        'div',
        { class: 'form-grid' },
        h(
          'div',
          { class: 'field' },
          h('span', { style: { fontWeight: '700', fontSize: 'var(--adm-text-sm)' } }, 'Caras'),
          h(
            'div',
            { class: 'caras', role: 'group', 'aria-label': 'Caras dentales' },
            CARAS_UI.map((c) =>
              h(
                'button',
                {
                  class: 'btn btn-secondary cara',
                  type: 'button',
                  'data-cara': c.valor,
                  'aria-pressed': String(est.caras.has(c.valor)),
                  'aria-label': c.nombre,
                  disabled: hecha,
                  onClick: () => {
                    alternar(est.caras, c.valor);
                    dibujar(`[data-cara="${c.valor}"]`);
                  },
                },
                c.valor,
              ),
            ),
          ),
          h('span', { class: 'hint' }, 'V vestibular · M mesial · O oclusal · D distal · L lingual'),
        ),
        h(
          'fieldset',
          { class: 'field', style: { border: '0', padding: '0', margin: '0' } },
          h('legend', { style: { fontWeight: '700', fontSize: 'var(--adm-text-sm)' } }, 'Síntomas referidos'),
          h(
            'div',
            { class: 'sintomas' },
            SINTOMAS_UI.map((s) =>
              h(
                'label',
                null,
                h('input', {
                  type: 'checkbox',
                  value: s.valor,
                  checked: est.sintomas.has(s.valor),
                  disabled: hecha,
                  onChange: () => {
                    alternar(est.sintomas, s.valor);
                    est.error = undefined;
                    reemplazar(errorRegion, false);
                  },
                }),
                s.texto,
              ),
            ),
          ),
        ),
        errorRegion,
        h(
          'div',
          { class: 'actions' },
          h('button', { class: 'btn btn-primary', type: 'button', id: 'od-guardar', disabled: hecha || est.enviando, onClick: guardar }, hecha ? 'Pieza ya realizada' : `Agregar pieza ${n} al turno`),
          guardada?.estado === 'a_revisar'
            ? h('button', { class: 'btn btn-secondary', type: 'button', id: 'od-hecho', disabled: est.enviando, onClick: marcarHecho }, 'Marcar como realizado')
            : false,
        ),
      ),
    ];
  }

  function lista() {
    const marcadas = [...piezas.values()].sort((a, b) => a.pieza - b.pieza);
    if (marcadas.length === 0) return h('p', { class: 'small muted' }, 'Todavía no hay piezas marcadas en este turno.');
    return h(
      'ul',
      { class: 'list' },
      marcadas.map((p) =>
        h(
          'li',
          null,
          h('span', { class: 'hora' }, String(p.pieza)),
          h(
            'span',
            null,
            nombrePieza(p.pieza),
            p.sintomas.length > 0 ? ` · ${p.sintomas.map((x) => SINTOMAS_UI.find((s) => s.valor === x)?.texto ?? x).join(', ')}` : '',
            p.caras?.length > 0 ? ` · ${p.caras.join(', ')}` : '',
          ),
          h('span', { class: `chip ${p.estado === 'hecho' ? 'st-atendido' : 'a-revisar'}` }, LEYENDA_ESTADO[p.estado] ?? p.estado),
        ),
      ),
    );
  }

  /** Redibuja todo y devuelve el foco al elemento que lo tenía (`selectorFoco`). */
  function dibujar(selectorFoco) {
    const [sup1, sup2, inf3, inf4] = cuadrantes();
    reemplazar(errorRegion, est.error ? h('div', { class: 'alert alert-error' }, est.error) : false);
    reemplazar(
      contenedor,
      h(
        'div',
        { class: 'turno-head' },
        h('div', null, h('strong', null, paciente), ` · ${prestacion} · `, h('span', { class: 'num' }, horario), ` · ${sillon} · ${profesional}`),
        volverAAgenda(),
      ),
      h(
        'div',
        { class: 'split' },
        h(
          'section',
          { class: 'card', 'aria-labelledby': 't-boca' },
          h('div', { class: 'panel-head' }, h('span', { id: 't-boca' }, 'Piezas permanentes (FDI)')),
          h(
            'div',
            { class: 'arcada' },
            h('h3', null, 'Arcada superior'),
            h('div', { class: 'cuadrantes' }, cuadrante(sup1), cuadrante(sup2)),
            h('h3', null, 'Arcada inferior'),
            h('div', { class: 'cuadrantes' }, cuadrante(inf4), cuadrante(inf3)),
          ),
          h(
            'ul',
            { class: 'legend', 'aria-label': 'Leyenda del odontograma' },
            h('li', null, h('span', { class: 'swatch', style: { background: 'var(--adm-surface)', border: '1px solid var(--adm-control-border)' } }), 'Sin marcar'),
            h('li', null, h('span', { class: 'swatch', style: { background: 'var(--adm-error-bg)', border: '2px solid var(--adm-error-fg)' } }), '! A revisar (rojo)'),
            h('li', null, h('span', { class: 'swatch st-atendido' }), '✓ Hecho (azul)'),
          ),
          h('h3', { style: { margin: '16px 0 4px', fontSize: 'var(--adm-text-md)' } }, 'Piezas del turno'),
          lista(),
        ),
        h('aside', { class: 'card', 'aria-labelledby': 't-det-od' }, h('div', { class: 'panel-head' }, h('span', { id: 't-det-od' }, 'Detalle de la pieza')), detalle()),
      ),
    );
    if (selectorFoco !== undefined) contenedor.querySelector(selectorFoco)?.focus();
  }

  dibujar();
}
