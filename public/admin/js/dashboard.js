// Dashboard (mockups/dashboard.html): KPIs del día desde GET /api/panel/resumen.
import { aHoraLocal, diasDeSemana, etiquetaEstado, hhmm, lunesDeLaSemana } from './agenda-calculos.js';
import { h, mensajeDe, reemplazar } from './dom.js';

const ORDEN_ESTADOS = [
  { clave: 'reservado', color: 'var(--adm-blue-300)' },
  { clave: 'confirmado', color: 'var(--adm-blue-500)' },
  { clave: 'atendido', color: 'var(--adm-blue-700)' },
  { clave: 'ausente', color: 'var(--adm-st-ausente-fg)' },
];

/** '2026-12-01' → 'Martes 01/12/2026'. */
function fechaLarga(fecha) {
  const dia = diasDeSemana(lunesDeLaSemana(fecha)).find((d) => d.fecha === fecha);
  return `${dia?.nombre ?? ''} ${fecha.slice(8, 10)}/${fecha.slice(5, 7)}/${fecha.slice(0, 4)}`.trim();
}

function tarjeta(etiqueta, valor, sub, hero) {
  return h(
    'article',
    { class: `card kpi${valor === '—' ? '' : ' kpi-enter'}${hero ? ' kpi-hero' : ''}` },
    h('div', { class: 'label' }, etiqueta),
    h('div', { class: 'value' }, valor),
    h('div', { class: 'sub' }, sub),
  );
}

function kpis(resumen) {
  const cargando = resumen === undefined;
  const v = (n) => (cargando ? '—' : String(n));
  const total = resumen?.turnosDelDia ?? 0;
  return h(
    'section',
    { 'aria-labelledby': 't-kpis' },
    h('h2', { id: 't-kpis', class: 'visually-hidden' }, 'Indicadores de hoy'),
    h(
      'div',
      { class: 'kpis', 'aria-busy': cargando ? 'true' : false },
      tarjeta('Turnos de hoy', v(total), 'sin contar cancelados', true),
      tarjeta('Confirmados', v(resumen?.porEstado.confirmado ?? 0), cargando ? ' ' : `de ${total}`),
      tarjeta('Sin confirmar', v(resumen?.porEstado.reservado ?? 0), 'estado reservado'),
      tarjeta('Huecos libres', v(resumen?.huecosLibres ?? 0), 'de la prestación más corta'),
      tarjeta('Señados', v(resumen?.senados ?? 0), 'pago simulado'),
    ),
  );
}

function proximos(resumen) {
  return h(
    'section',
    { class: 'card', 'aria-labelledby': 't-prox' },
    h('div', { class: 'card-head' }, h('h2', { id: 't-prox' }, 'Próximos turnos'), h('a', { href: '#/agenda', class: 'small' }, 'Ver agenda')),
    resumen.proximos.length === 0
      ? h('p', { class: 'small muted' }, 'No quedan turnos por atender hoy.')
      : h(
          'ul',
          { class: 'list' },
          resumen.proximos.map((p) =>
            h(
              'li',
              null,
              h('span', { class: 'hora' }, hhmm(aHoraLocal(p.inicio).minutos)),
              h(
                'span',
                null,
                h('strong', null, p.pacienteNombre),
                h('br'),
                h('span', { class: 'small muted' }, `${p.prestacionNombre} · ${p.profesionalNombre} · ${p.sillonNombre}`),
              ),
              h('span', { class: `chip st-${p.estado}` }, etiquetaEstado(p.estado)),
            ),
          ),
        ),
  );
}

function porEstado(resumen) {
  const total = resumen.turnosDelDia;
  return h(
    'section',
    { class: 'card', 'aria-labelledby': 't-estados' },
    h('div', { class: 'card-head' }, h('h2', { id: 't-estados' }, 'Turnos por estado'), h('span', { class: 'small muted num' }, 'Hoy')),
    h(
      'div',
      { class: 'bars', role: 'list' },
      ORDEN_ESTADOS.map(({ clave, color }) => {
        const n = resumen.porEstado[clave];
        const ancho = total === 0 ? 0 : Math.round((n / total) * 100);
        return h(
          'div',
          { class: 'bar-row', role: 'listitem' },
          h('span', null, etiquetaEstado(clave)),
          h('span', { class: 'bar-track' }, h('span', { class: 'bar-fill', style: { width: `${ancho}%`, background: color } })),
          h('span', { class: 'num' }, String(n)),
        );
      }),
    ),
    h('p', { class: 'small muted', style: { margin: '16px 0 0' } }, 'Los cancelados no ocupan agenda y no se cuentan.'),
  );
}

export async function montarDashboard(contenedor, ctx) {
  const esOdontologo = ctx.usuario.rol === 'odontologo';
  const titulo = esOdontologo ? 'Tu agenda de hoy' : 'Dashboard';
  ctx.titulo(titulo, '');
  reemplazar(contenedor, kpis(undefined));

  let resumen;
  try {
    resumen = await ctx.api.get('/api/panel/resumen');
  } catch (error) {
    if (!ctx.esActual() || error?.status === 401) return;
    reemplazar(
      contenedor,
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'alert alert-error', role: 'alert' }, mensajeDe(error)),
        h('button', { class: 'btn btn-secondary', type: 'button', style: { marginTop: '12px' }, onClick: () => montarDashboard(contenedor, ctx) }, 'Reintentar'),
      ),
    );
    return;
  }
  if (!ctx.esActual()) return;

  ctx.titulo(titulo, fechaLarga(resumen.fecha));
  reemplazar(
    contenedor,
    kpis(resumen),
    resumen.turnosDelDia === 0
      ? h(
          'div',
          { class: 'card empty' },
          h('h3', { style: { color: 'var(--adm-text)' } }, 'No hay turnos para hoy'),
          h('p', { class: 'small' }, 'Cuando se reserven, los vas a ver acá.'),
          h('a', { class: 'btn btn-secondary', href: '#/agenda' }, 'Ir a la agenda'),
        )
      : h('div', { class: 'dash-grid' }, proximos(resumen), porEstado(resumen)),
  );
}
