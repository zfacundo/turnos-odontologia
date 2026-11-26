// Botón de tema del panel (design D6): DOM + almacenamiento, delgado. La lógica vive en tema-calculos.js.
// El tema inicial lo fijó tema-arranque.js en <html>; acá se sincroniza el botón y se alterna.
import { alternarTema, CLAVE_TEMA, esquemaDeColor, normalizarTema } from './tema-calculos.js';

/** localStorage del navegador (solo para la clave adm.tema) o null si está bloqueado. */
export function almacenLocalDeTema() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function iniciarTema({ documento, almacen, matchMedia }) {
  const raiz = documento.documentElement;
  const botones = () => [...documento.querySelectorAll('[data-tema-toggle]')];

  const leer = () => {
    try {
      return normalizarTema(almacen?.getItem(CLAVE_TEMA));
    } catch {
      return null; // almacenamiento bloqueado: el tema vive solo en memoria
    }
  };
  const guardar = (tema) => {
    try {
      almacen?.setItem(CLAVE_TEMA, tema);
    } catch {
      /* solo en memoria durante esta visita */
    }
  };
  const actual = () => (raiz.getAttribute('data-tema') === 'oscuro' ? 'oscuro' : 'claro');
  const aplicar = (tema) => {
    raiz.setAttribute('data-tema', tema);
    raiz.style.colorScheme = esquemaDeColor(tema);
    for (const b of botones()) b.setAttribute('aria-pressed', String(tema === 'oscuro'));
  };

  let eligio = leer() !== null;
  aplicar(actual());

  for (const b of botones()) {
    b.addEventListener('click', () => {
      const siguiente = alternarTema(actual());
      eligio = true;
      guardar(siguiente);
      aplicar(siguiente);
    });
  }

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (evento) => {
    if (!eligio) aplicar(evento.matches ? 'oscuro' : 'claro');
  });
}
