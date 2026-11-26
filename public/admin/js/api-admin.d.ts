export interface AlmacenToken {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

export class ErrorApi extends Error {
  constructor(datos: { status: number; tipo: string; regla: string | undefined; mensaje: string; conflicto?: unknown });
  readonly status: number;
  readonly tipo: string;
  readonly regla: string | undefined;
  readonly mensaje: string;
  /** Turno en conflicto de un 409 (DD-08), p. ej. `{ turnoId }`. */
  readonly conflicto: { turnoId?: string } | undefined;
}

export interface OpcionesLlamada {
  /** `false` para el login y las rutas públicas: no se envía token ni se trata un 401 como sesión vencida. */
  conToken?: boolean;
}

export interface UsuarioIdentidad {
  id: string;
  rol: string;
}

export interface ApiAdmin {
  token(): string | undefined;
  guardarToken(valor: string): void;
  borrarToken(): void;
  /** Carga X-Rol / X-Usuario del usuario ficticio; el Bearer sigue siendo la autoridad. */
  definirIdentidad(usuario?: UsuarioIdentidad | null): void;
  get(ruta: string, opciones?: OpcionesLlamada): Promise<unknown>;
  post(ruta: string, cuerpo?: unknown, opciones?: OpcionesLlamada): Promise<unknown>;
  put(ruta: string, cuerpo?: unknown, opciones?: OpcionesLlamada): Promise<unknown>;
  delete(ruta: string, opciones?: OpcionesLlamada): Promise<unknown>;
}

export function crearApiAdmin(deps: {
  fetchFn: (ruta: string, init: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
    status: number;
    ok: boolean;
    json(): Promise<unknown>;
  }>;
  almacen: AlmacenToken;
  alVencer: () => void;
}): ApiAdmin;
