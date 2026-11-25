// Cliente HTTP del panel (design D3). El token vive solo en sessionStorage ('adm.token') y viaja como
// `Authorization: Bearer`. NUNCA envía X-Usuario / X-Rol. Ante un 401 con token borra la sesión.

const CLAVE_TOKEN = 'adm.token';

export class ErrorApi extends Error {
  constructor({ status, tipo, regla, mensaje, conflicto }) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.status = status;
    this.tipo = tipo;
    this.regla = regla;
    this.mensaje = mensaje;
    this.conflicto = conflicto;
  }
}

function mensajePorDefecto(status) {
  if (status === 401) return 'Tu sesión venció, volvé a ingresar.';
  if (status === 403) return 'Tu rol no puede hacer esta acción.';
  if (status === 404) return 'No encontramos lo que buscabas.';
  return 'No pudimos completar la operación. Probá de nuevo.';
}

/**
 * @param {{ fetchFn: Function, almacen: { getItem(k: string): string | null, setItem(k: string, v: string): void, removeItem(k: string): void }, alVencer: () => void }} deps
 */
export function crearApiAdmin({ fetchFn, almacen, alVencer }) {
  function token() {
    try {
      return almacen.getItem(CLAVE_TOKEN) ?? undefined;
    } catch {
      return undefined; // almacenamiento bloqueado: se trabaja sin sesión persistida
    }
  }

  function guardarToken(valor) {
    try {
      almacen.setItem(CLAVE_TOKEN, valor);
    } catch {
      /* sin almacenamiento: la sesión no sobrevive a la recarga */
    }
  }

  function borrarToken() {
    try {
      almacen.removeItem(CLAVE_TOKEN);
    } catch {
      /* nada que borrar */
    }
  }

  async function llamar(metodo, ruta, cuerpo, opciones = {}) {
    const conToken = opciones.conToken !== false;
    const tokenActual = conToken ? token() : undefined;
    const headers = { Accept: 'application/json' };
    if (tokenActual !== undefined) headers.Authorization = `Bearer ${tokenActual}`;
    const init = { method: metodo, headers };
    if (cuerpo !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(cuerpo);
    }

    let respuesta;
    try {
      respuesta = await fetchFn(ruta, init);
    } catch {
      throw new ErrorApi({
        status: 0,
        tipo: 'red',
        regla: undefined,
        mensaje: 'No pudimos conectarnos con el servidor. Revisá tu conexión y probá de nuevo.',
      });
    }

    if (respuesta.status === 204) return undefined;

    let datos;
    try {
      datos = await respuesta.json();
    } catch {
      datos = undefined;
    }

    if (!respuesta.ok) {
      const error = datos && typeof datos === 'object' ? datos.error : undefined;
      const fallo = new ErrorApi({
        status: respuesta.status,
        tipo: error?.tipo ?? 'desconocido',
        regla: error?.regla,
        conflicto: error?.conflicto,
        mensaje: typeof error?.mensaje === 'string' && error.mensaje !== '' ? error.mensaje : mensajePorDefecto(respuesta.status),
      });
      if (respuesta.status === 401 && tokenActual !== undefined) {
        borrarToken();
        alVencer();
      }
      throw fallo;
    }
    return datos;
  }

  return {
    token,
    guardarToken,
    borrarToken,
    get: (ruta, opciones) => llamar('GET', ruta, undefined, opciones),
    post: (ruta, cuerpo, opciones) => llamar('POST', ruta, cuerpo, opciones),
    put: (ruta, cuerpo, opciones) => llamar('PUT', ruta, cuerpo, opciones),
  };
}
