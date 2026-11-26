// Permisos de navegación del panel por rol (design D8). Funciones puras: sin DOM ni red.
// La API sigue siendo la autoridad; esto solo decide qué mostrar y a qué rutas dejar entrar.

const ROLES_PANEL = ['admin', 'recepcion', 'odontologo'];

/** Secciones del panel en el orden de la barra lateral. `roles` es la matriz D8. */
const SECCIONES_DEL_PANEL = [
  { id: 'dashboard', titulo: 'Dashboard', grupo: 'Consultorio', roles: ['admin', 'recepcion', 'odontologo'] },
  { id: 'agenda', titulo: 'Agenda', grupo: 'Consultorio', roles: ['admin', 'recepcion', 'odontologo'] },
  { id: 'clientes', titulo: 'Clientes', grupo: 'Consultorio', roles: ['admin', 'recepcion', 'odontologo'] },
  { id: 'configuracion', titulo: 'Configuración', grupo: 'Consultorio', roles: ['admin', 'recepcion', 'odontologo'] },
  { id: 'historial', titulo: 'Historial clínico', grupo: 'Clínica', roles: ['admin', 'odontologo'] },
];

/** Rutas del panel que no tienen entrada en la barra lateral (panel-reemplaza-agenda-vieja, D3). */
const RUTAS_SIN_MENU = [{ id: 'odontograma', roles: ['odontologo'] }];

function esRolDePanel(rol) {
  return typeof rol === 'string' && ROLES_PANEL.includes(rol);
}

/** Secciones que el rol puede usar (vacío para paciente, rol desconocido o sin rol). */
export function seccionesPara(rol) {
  if (!esRolDePanel(rol)) return [];
  return SECCIONES_DEL_PANEL.filter((s) => s.roles.includes(rol)).map((s) => ({
    id: s.id,
    titulo: s.titulo,
    grupo: s.grupo,
    ruta: `#/${s.id}`,
  }));
}

/** '#/historial/pac-01' → { seccion: 'historial', id: 'pac-01' }. */
export function parsearRuta(hash) {
  const limpio = String(hash ?? '').replace(/^#\/?/, '');
  const [seccion = '', crudo] = limpio.split('/');
  let id;
  if (crudo !== undefined && crudo !== '') {
    try {
      id = decodeURIComponent(crudo);
    } catch {
      id = crudo;
    }
  }
  return { seccion, id };
}

/** ¿Puede el rol abrir esa ruta? Una ruta desconocida no se puede ver. */
export function puedeVer(rol, ruta) {
  const { seccion } = parsearRuta(ruta);
  if (seccionesPara(rol).some((s) => s.id === seccion)) return true;
  return esRolDePanel(rol) && RUTAS_SIN_MENU.some((r) => r.id === seccion && r.roles.includes(rol));
}

/** Alta y edición de pacientes: admin y recepción (odontólogo solo lectura). */
export function puedeEditarClientes(rol) {
  return rol === 'admin' || rol === 'recepcion';
}

/** Lectura del historial clínico: admin (solo lectura) y odontólogo. */
export function puedeLeerHistorial(rol) {
  return rol === 'admin' || rol === 'odontologo';
}

/** Alta de entradas de historial: solo odontólogo. */
export function puedeCrearHistorial(rol) {
  return rol === 'odontologo';
}

/** Odontograma del turno: solo odontólogo (la API responde 403 al resto). */
export function puedeVerOdontograma(rol) {
  return rol === 'odontologo';
}

/** Botón "Nuevo turno": admin y recepción. */
export function puedeCrearTurnos(rol) {
  return rol === 'admin' || rol === 'recepcion';
}

/** Tarjeta "Lo que hizo el sistema": admin y recepción. */
export function puedeVerRegistro(rol) {
  return rol === 'admin' || rol === 'recepcion';
}

/** Configuración estructural (sillones, prestaciones, disponibilidad y obras sociales): solo admin. */
export function puedeConfigurarConsultorio(rol) {
  return rol === 'admin';
}

/** Bloqueos de agenda: admin y recepción; odontólogo solo su propia agenda. */
export function puedeGestionarBloqueos(rol) {
  return rol === 'admin' || rol === 'recepcion' || rol === 'odontologo';
}
