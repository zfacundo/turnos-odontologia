import { describe, expect, it, vi } from 'vitest';
import { crearApiAdmin, ErrorApi, type AlmacenToken } from '../../public/admin/js/api-admin.js';

function almacenEnMemoria(inicial: Record<string, string> = {}): AlmacenToken & { datos: Record<string, string> } {
  const datos = { ...inicial };
  return {
    datos,
    getItem: (k) => datos[k] ?? null,
    setItem: (k, v) => {
      datos[k] = v;
    },
    removeItem: (k) => {
      delete datos[k];
    },
  };
}

interface Llamada {
  url: string;
  init: { method?: string; headers?: Record<string, string>; body?: string };
}

function fetchFalso(respuestas: { status: number; cuerpo?: unknown }[]) {
  const llamadas: Llamada[] = [];
  const fetchFn = vi.fn(async (url: string, init: Llamada['init']) => {
    llamadas.push({ url, init });
    const r = respuestas.shift() ?? { status: 200, cuerpo: {} };
    return {
      status: r.status,
      ok: r.status >= 200 && r.status < 300,
      json: async () => r.cuerpo,
    };
  });
  return { fetchFn, llamadas };
}

describe('crearApiAdmin - token', () => {
  it('dado un token guardado cuando se hace una llamada entonces envia Authorization Bearer y nunca X-Rol ni X-Usuario', async () => {
    const almacen = almacenEnMemoria({ 'adm.token': 'tok-abc' });
    const { fetchFn, llamadas } = fetchFalso([{ status: 200, cuerpo: { ok: 1 } }]);
    const api = crearApiAdmin({ fetchFn, almacen, alVencer: () => undefined });
    await api.get('/api/panel/resumen');
    const headers = llamadas[0]?.init.headers ?? {};
    expect(headers.Authorization).toBe('Bearer tok-abc');
    expect(Object.keys(headers).map((h) => h.toLowerCase())).not.toContain('x-rol');
    expect(Object.keys(headers).map((h) => h.toLowerCase())).not.toContain('x-usuario');
  });

  it('dado ningun token cuando se hace una llamada entonces no envia Authorization', async () => {
    const { fetchFn, llamadas } = fetchFalso([{ status: 200, cuerpo: {} }]);
    const api = crearApiAdmin({ fetchFn, almacen: almacenEnMemoria(), alVencer: () => undefined });
    await api.get('/api/auth/usuarios', { conToken: false });
    expect(llamadas[0]?.init.headers?.Authorization).toBeUndefined();
  });

  it('dado un cuerpo cuando se hace POST entonces lo serializa como JSON con Content-Type', async () => {
    const { fetchFn, llamadas } = fetchFalso([{ status: 201, cuerpo: { id: 'x' } }]);
    const api = crearApiAdmin({ fetchFn, almacen: almacenEnMemoria(), alVencer: () => undefined });
    const r = await api.post('/api/pacientes', { nombre: 'Paciente Ficticio Once' });
    expect(r).toEqual({ id: 'x' });
    expect(llamadas[0]?.init.method).toBe('POST');
    expect(llamadas[0]?.init.headers?.['Content-Type']).toBe('application/json');
    expect(llamadas[0]?.init.body).toBe(JSON.stringify({ nombre: 'Paciente Ficticio Once' }));
  });

  it('dado guardarToken cuando se consulta entonces queda solo en el almacen de sesion con la clave adm.token', () => {
    const almacen = almacenEnMemoria();
    const api = crearApiAdmin({ fetchFn: fetchFalso([]).fetchFn, almacen, alVencer: () => undefined });
    api.guardarToken('tok-1');
    expect(almacen.datos['adm.token']).toBe('tok-1');
    expect(api.token()).toBe('tok-1');
    api.borrarToken();
    expect(api.token()).toBeUndefined();
  });

  it('dado un almacen que lanza al leer o escribir cuando se usa el cliente entonces no revienta', () => {
    const roto: AlmacenToken = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    };
    const api = crearApiAdmin({ fetchFn: fetchFalso([]).fetchFn, almacen: roto, alVencer: () => undefined });
    expect(api.token()).toBeUndefined();
    expect(() => api.guardarToken('x')).not.toThrow();
    expect(() => api.borrarToken()).not.toThrow();
  });
});

describe('crearApiAdmin - errores', () => {
  it('dado un 401 con token guardado cuando se llama entonces borra el token, avisa que vencio y lanza ErrorApi', async () => {
    const almacen = almacenEnMemoria({ 'adm.token': 'tok-viejo' });
    const alVencer = vi.fn();
    const { fetchFn } = fetchFalso([{ status: 401, cuerpo: { error: { tipo: 'autenticacion', mensaje: 'Sesión inválida o vencida.' } } }]);
    const api = crearApiAdmin({ fetchFn, almacen, alVencer });
    await expect(api.get('/api/panel/resumen')).rejects.toBeInstanceOf(ErrorApi);
    expect(almacen.datos['adm.token']).toBeUndefined();
    expect(alVencer).toHaveBeenCalledTimes(1);
  });

  it('dado un 401 en el login sin token cuando se llama con conToken false entonces no avisa vencimiento y expone el mensaje', async () => {
    const alVencer = vi.fn();
    const { fetchFn } = fetchFalso([{ status: 401, cuerpo: { error: { tipo: 'autenticacion', mensaje: 'No se pudo iniciar sesión con ese usuario.' } } }]);
    const api = crearApiAdmin({ fetchFn, almacen: almacenEnMemoria(), alVencer });
    const err = await api.post('/api/auth/login', { usuarioId: 'u-x' }, { conToken: false }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ErrorApi);
    expect((err as ErrorApi).status).toBe(401);
    expect((err as ErrorApi).mensaje).toBe('No se pudo iniciar sesión con ese usuario.');
    expect(alVencer).not.toHaveBeenCalled();
  });

  // spec: panel-reemplaza-agenda-vieja
  it('dado un 409 con conflicto en el cuerpo cuando se llama entonces el ErrorApi expone conflicto', async () => {
    const { fetchFn } = fetchFalso([{ status: 409, cuerpo: { error: { tipo: 'regla', regla: 'RN-AG-01', mensaje: 'Se solapa.', conflicto: { turnoId: 't-9' } } } }]);
    const api = crearApiAdmin({ fetchFn, almacen: almacenEnMemoria({ 'adm.token': 'tok-1' }), alVencer: () => undefined });
    const err = (await api.post('/api/turnos', {}).catch((e: unknown) => e)) as ErrorApi;
    expect(err.regla).toBe('RN-AG-01');
    expect(err.conflicto).toEqual({ turnoId: 't-9' });
  });

  it('dado un 409 sin conflicto en el cuerpo cuando se llama entonces conflicto queda indefinido', async () => {
    const { fetchFn } = fetchFalso([{ status: 409, cuerpo: { error: { tipo: 'regla', regla: 'RN-HC-02', mensaje: 'x' } } }]);
    const api = crearApiAdmin({ fetchFn, almacen: almacenEnMemoria(), alVencer: () => undefined });
    const err = (await api.post('/api/x', {}).catch((e: unknown) => e)) as ErrorApi;
    expect(err.conflicto).toBeUndefined();
  });

  it('dado un 409 de regla cuando se llama entonces el ErrorApi trae regla, tipo y mensaje y no toca el token', async () => {
    const almacen = almacenEnMemoria({ 'adm.token': 'tok-1' });
    const alVencer = vi.fn();
    const { fetchFn } = fetchFalso([{ status: 409, cuerpo: { error: { tipo: 'regla', regla: 'RN-HC-02', mensaje: 'La fecha no puede ser futura.' } } }]);
    const api = crearApiAdmin({ fetchFn, almacen, alVencer });
    const err = (await api.post('/api/pacientes/pac-01/historia', {}).catch((e: unknown) => e)) as ErrorApi;
    expect(err.status).toBe(409);
    expect(err.regla).toBe('RN-HC-02');
    expect(err.tipo).toBe('regla');
    expect(err.mensaje).toBe('La fecha no puede ser futura.');
    expect(almacen.datos['adm.token']).toBe('tok-1');
    expect(alVencer).not.toHaveBeenCalled();
  });

  it('dado un 403 de permiso cuando se llama entonces lanza ErrorApi con tipo permiso', async () => {
    const { fetchFn } = fetchFalso([{ status: 403, cuerpo: { error: { tipo: 'permiso', mensaje: 'Tu rol no puede.' } } }]);
    const api = crearApiAdmin({ fetchFn, almacen: almacenEnMemoria(), alVencer: () => undefined });
    const err = (await api.get('/api/pacientes').catch((e: unknown) => e)) as ErrorApi;
    expect(err.status).toBe(403);
    expect(err.tipo).toBe('permiso');
  });

  it('dado un 204 cuando se llama entonces devuelve undefined sin leer el cuerpo', async () => {
    const { fetchFn } = fetchFalso([{ status: 204 }]);
    const api = crearApiAdmin({ fetchFn, almacen: almacenEnMemoria({ 'adm.token': 't' }), alVencer: () => undefined });
    expect(await api.post('/api/auth/logout')).toBeUndefined();
  });

  it('dado que fetch falla por red cuando se llama entonces lanza ErrorApi con tipo red y mensaje legible', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const api = crearApiAdmin({ fetchFn, almacen: almacenEnMemoria(), alVencer: () => undefined });
    const err = (await api.get('/api/panel/resumen').catch((e: unknown) => e)) as ErrorApi;
    expect(err).toBeInstanceOf(ErrorApi);
    expect(err.tipo).toBe('red');
    expect(err.status).toBe(0);
    expect(err.mensaje.length).toBeGreaterThan(0);
  });

  it('dado una respuesta de error sin cuerpo JSON cuando se llama entonces igual lanza ErrorApi con mensaje generico', async () => {
    const fetchFn = vi.fn(async () => ({
      status: 500,
      ok: false,
      json: async () => {
        throw new SyntaxError('no json');
      },
    }));
    const api = crearApiAdmin({ fetchFn, almacen: almacenEnMemoria(), alVencer: () => undefined });
    const err = (await api.get('/api/x').catch((e: unknown) => e)) as ErrorApi;
    expect(err.status).toBe(500);
    expect(err.mensaje.length).toBeGreaterThan(0);
  });
});
