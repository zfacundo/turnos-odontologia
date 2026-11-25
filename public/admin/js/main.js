// Punto de entrada del panel: login, shell (sidebar + topbar) y enrutado por hash con guardas
// de sesión y rol. La API es la autoridad; acá solo se decide qué mostrar.
import { crearApiAdmin } from './api-admin.js';
import { montarAgenda } from './agenda.js';
import { montarClientes } from './clientes.js';
import { montarDashboard } from './dashboard.js';
import { h, icono, iniciales, mensajeDe, reemplazar } from './dom.js';
import { montarHistorial } from './historial.js';
import { montarOdontograma } from './odontograma.js';
import { parsearRuta, puedeVer, seccionesPara } from './permisos-ui.js';
import { crearSesion } from './sesion.js';

const AVISO_VENCIDA = 'Tu sesión venció, volvé a ingresar.';
const AVISO_SIN_ACCESO = 'Tu rol no tiene acceso a esta sección.';

const VISTAS = {
  dashboard: montarDashboard,
  agenda: montarAgenda,
  clientes: montarClientes,
  historial: montarHistorial,
  odontograma: montarOdontograma, // ruta sin menú: #/odontograma/<turnoId> (solo odontólogo)
};

const ETIQUETA_ROL = { admin: 'Administración', recepcion: 'Recepción', odontologo: 'Odontología' };
const GRUPOS_LOGIN = [
  { rol: 'admin', titulo: 'Administración', detalle: 'Administrador · todo el panel' },
  { rol: 'recepcion', titulo: 'Recepción', detalle: 'Agenda, clientes y dashboard' },
  { rol: 'odontologo', titulo: 'Odontólogos', detalle: 'Su agenda e historial clínico' },
];

const $ = (id) => document.getElementById(id);

/** sessionStorage puede lanzar (ventana privada, datos bloqueados): se cae a memoria. */
function almacenDeSesion() {
  try {
    const prueba = '__adm_prueba__';
    window.sessionStorage.setItem(prueba, '1');
    window.sessionStorage.removeItem(prueba);
    return window.sessionStorage;
  } catch {
    const memoria = new Map();
    return {
      getItem: (k) => memoria.get(k) ?? null,
      setItem: (k, v) => void memoria.set(k, v),
      removeItem: (k) => void memoria.delete(k),
    };
  }
}

let avisoLogin;
let cerrando = false;
let generacion = 0;
let usuariosCargados;
let seleccion;

const api = crearApiAdmin({
  fetchFn: (ruta, init) => fetch(ruta, init),
  almacen: almacenDeSesion(),
  alVencer: () => {
    if (cerrando) return;
    sesion.olvidar();
    avisoLogin = AVISO_VENCIDA;
    renderizar();
  },
});
const sesion = crearSesion({ api });

/* ------------------------------ Toast ------------------------------ */
let temporizadorToast;
function toast(mensaje) {
  const el = $('toast');
  clearTimeout(temporizadorToast);
  el.textContent = mensaje;
  el.hidden = false;
  requestAnimationFrame(() => el.setAttribute('data-visible', 'true'));
  temporizadorToast = setTimeout(() => {
    el.setAttribute('data-visible', 'false');
    setTimeout(() => {
      el.hidden = true;
    }, 220);
  }, 3500);
}

/* ------------------------------ Login ------------------------------ */
function mostrarLogin() {
  $('vista-shell').hidden = true;
  const vista = $('vista-login');
  const eraVisible = !vista.hidden;
  vista.hidden = false;
  document.title = `Ingresar · ${window.BRAND_NAME ?? 'Panel'}`;
  if (location.hash !== '#/login') history.replaceState(null, '', '#/login');

  const aviso = $('login-aviso');
  aviso.hidden = avisoLogin === undefined;
  aviso.textContent = avisoLogin ?? '';

  if (!eraVisible) cargarUsuarios();
}

async function cargarUsuarios() {
  const lista = $('lista-usuarios');
  if (usuariosCargados !== undefined) {
    dibujarUsuarios(usuariosCargados);
    return;
  }
  lista.setAttribute('aria-busy', 'true');
  reemplazar(lista, h('p', { class: 'small muted' }, 'Cargando usuarios ficticios…'));
  $('btn-ingresar').disabled = true;
  try {
    usuariosCargados = await sesion.listarUsuarios();
    dibujarUsuarios(usuariosCargados);
  } catch (error) {
    lista.setAttribute('aria-busy', 'false');
    reemplazar(
      lista,
      h('div', { class: 'alert alert-error', role: 'alert' }, mensajeDe(error)),
      h('button', { class: 'btn btn-secondary', type: 'button', onClick: cargarUsuarios }, 'Reintentar'),
    );
  }
}

function dibujarUsuarios(usuarios) {
  const lista = $('lista-usuarios');
  lista.setAttribute('aria-busy', 'false');
  if (seleccion === undefined || !usuarios.some((u) => u.id === seleccion)) {
    seleccion = (usuarios.find((u) => u.rol === 'recepcion') ?? usuarios[0])?.id;
  }
  const grupos = GRUPOS_LOGIN.map((g) => ({ ...g, usuarios: usuarios.filter((u) => u.rol === g.rol) })).filter(
    (g) => g.usuarios.length > 0,
  );
  reemplazar(
    lista,
    grupos.map((g) =>
      h(
        'fieldset',
        { class: 'role-group' },
        h('legend', null, g.titulo),
        g.usuarios.map((u) =>
          h(
            'label',
            { class: 'user-opt' },
            h('input', {
              type: 'radio',
              name: 'usuario',
              value: u.id,
              checked: u.id === seleccion,
              onChange: () => {
                seleccion = u.id;
                actualizarBotonLogin();
              },
            }),
            h('span', null, h('strong', null, u.nombre), h('span', { class: 'rol' }, g.detalle)),
          ),
        ),
      ),
    ),
  );
  actualizarBotonLogin();
}

function actualizarBotonLogin() {
  const boton = $('btn-ingresar');
  const elegido = (usuariosCargados ?? []).find((u) => u.id === seleccion);
  boton.disabled = elegido === undefined;
  boton.textContent = elegido === undefined ? 'Ingresar' : `Ingresar como ${elegido.nombre}`;
}

async function enviarLogin(evento) {
  evento.preventDefault();
  if (seleccion === undefined) return;
  const boton = $('btn-ingresar');
  const error = $('login-error');
  reemplazar(error);
  boton.disabled = true;
  try {
    await sesion.iniciar(seleccion);
    avisoLogin = undefined;
    if (location.hash === '#/dashboard') renderizar();
    else location.hash = '#/dashboard';
  } catch (e) {
    // La selección se conserva: no se vuelve a dibujar la lista.
    reemplazar(error, h('div', { class: 'alert alert-error' }, mensajeDe(e)));
  } finally {
    boton.disabled = false;
  }
}

/* ------------------------------ Shell ------------------------------ */
const consultaMovil = window.matchMedia('(max-width: 767px)');

function sidebarAbierta() {
  return $('sidebar').getAttribute('data-open') === 'true';
}

/** En móvil la barra cerrada queda fuera de pantalla: `inert` evita que reciba foco con Tab. */
function sincronizarInert() {
  $('sidebar').inert = consultaMovil.matches && !sidebarAbierta();
}

function abrirSidebar(abrir, devolverFoco) {
  $('sidebar').setAttribute('data-open', String(abrir));
  $('btn-menu').setAttribute('aria-expanded', String(abrir));
  $('btn-menu').setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
  sincronizarInert();
  if (abrir) $('nav').querySelector('a')?.focus();
  else if (devolverFoco) $('btn-menu').focus();
}

function armarShell() {
  $('btn-menu').append(icono('menu'));
  $('btn-menu').addEventListener('click', () => abrirSidebar(!sidebarAbierta(), true));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebarAbierta() && consultaMovil.matches) abrirSidebar(false, true);
  });
  consultaMovil.addEventListener('change', () => {
    if (!consultaMovil.matches) abrirSidebar(false, false);
    sincronizarInert();
  });
  sincronizarInert();
  $('btn-salir').addEventListener('click', cerrarSesion);
}

function mostrarShell(usuario) {
  $('vista-login').hidden = true;
  $('vista-shell').hidden = false;
  $('usuario-avatar').textContent = iniciales(usuario.nombre);
  $('usuario-nombre').textContent = usuario.nombre;
  $('usuario-rol').textContent = ETIQUETA_ROL[usuario.rol] ?? usuario.rol;

  const secciones = seccionesPara(usuario.rol);
  const actual = parsearRuta(location.hash).seccion;
  const grupos = [...new Set(secciones.map((s) => s.grupo))];
  reemplazar(
    $('nav'),
    grupos.flatMap((grupo) => [
      h('span', { class: 'nav-label' }, grupo),
      ...secciones
        .filter((s) => s.grupo === grupo)
        .map((s) =>
          h(
            'a',
            {
              href: s.ruta,
              'aria-current': s.id === actual ? 'page' : false,
              onClick: () => {
                if (sidebarAbierta()) abrirSidebar(false, false);
              },
            },
            icono(s.id),
            s.titulo,
          ),
        ),
    ]),
  );
}

async function cerrarSesion() {
  cerrando = true;
  try {
    await sesion.cerrar();
  } finally {
    cerrando = false;
  }
  avisoLogin = undefined;
  abrirSidebar(false, false);
  renderizar();
}

/* ------------------------------ Router ------------------------------ */
function poner(titulo, crumbs) {
  $('titulo-seccion').textContent = titulo;
  $('crumbs').textContent = crumbs ?? '';
  document.title = `${titulo} · ${window.BRAND_NAME ?? 'Panel'}`;
}

async function renderizar() {
  const miGeneracion = ++generacion;
  const usuario = sesion.usuario();
  if (usuario === undefined) {
    mostrarLogin();
    return;
  }

  const ruta = parsearRuta(location.hash);
  if (!Object.hasOwn(VISTAS, ruta.seccion)) {
    location.replace('#/dashboard'); // hashchange vuelve a llamar a renderizar()
    return;
  }

  mostrarShell(usuario);
  const contenido = $('contenido');

  if (!puedeVer(usuario.rol, location.hash)) {
    // Sin pedir datos a la API (sin sesión útil para esa sección).
    poner('Acceso restringido');
    reemplazar(
      contenido,
      h('div', { class: 'vista' }, h('div', { class: 'card' }, h('div', { class: 'alert alert-info', role: 'status' }, AVISO_SIN_ACCESO))),
    );
    return;
  }

  const titulo = seccionesPara(usuario.rol).find((s) => s.id === ruta.seccion)?.titulo ?? (ruta.seccion === 'odontograma' ? 'Odontograma' : '');
  poner(titulo);
  const vista = h('div', { class: 'vista' }, h('p', { class: 'loading', 'aria-busy': 'true' }, 'Cargando…'));
  reemplazar(contenido, vista);

  const ctx = {
    api,
    usuario,
    id: ruta.id,
    titulo: (t, crumbs) => {
      if (miGeneracion === generacion) poner(t, crumbs);
    },
    navegar: (hash) => {
      location.hash = hash;
    },
    toast,
    ahoraIso: () => new Date().toISOString(),
    esActual: () => miGeneracion === generacion,
  };

  try {
    await VISTAS[ruta.seccion](vista, ctx);
  } catch (error) {
    if (miGeneracion !== generacion) return;
    if (error?.status === 401) return; // api-admin ya borró el token y mostró el login
    reemplazar(
      vista,
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'alert alert-error', role: 'alert' }, mensajeDe(error)),
        h('button', { class: 'btn btn-secondary', type: 'button', style: { marginTop: '12px' }, onClick: renderizar }, 'Reintentar'),
      ),
    );
  }
}

/* ------------------------------ Arranque ------------------------------ */
armarShell();
$('form-login').addEventListener('submit', enviarLogin);
window.addEventListener('hashchange', () => {
  renderizar().then(() => {
    if (!$('vista-shell').hidden) $('contenido').focus({ preventScroll: true });
  });
});

sesion.restaurar().then(() => renderizar());
