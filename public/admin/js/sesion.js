// Sesión del panel: login simulado, restauración tras recargar y logout. El token vive en
// sessionStorage (lo maneja api-admin.js); acá solo se guarda el usuario en memoria.

export function crearSesion({ api }) {
  let usuario;

  return {
    usuario: () => usuario,

    /** GET /api/auth/usuarios (público): usuarios ficticios para elegir. */
    async listarUsuarios() {
      const r = await api.get('/api/auth/usuarios', { conToken: false });
      return r.usuarios;
    },

    /** Login simulado: solo `usuarioId`, sin contraseña. Guarda el token y devuelve el usuario. */
    async iniciar(usuarioId) {
      const r = await api.post('/api/auth/login', { usuarioId }, { conToken: false });
      api.guardarToken(r.token);
      usuario = r.usuario;
      return usuario;
    },

    /** Si hay token guardado, lo valida con GET /api/auth/sesion; un 401 lo borra (lo hace api-admin). */
    async restaurar() {
      if (api.token() === undefined) return undefined;
      try {
        const r = await api.get('/api/auth/sesion');
        usuario = r.usuario;
      } catch {
        usuario = undefined;
      }
      return usuario;
    },

    /** POST /api/auth/logout y borrado local; el token deja de servir aunque el logout falle. */
    async cerrar() {
      try {
        await api.post('/api/auth/logout');
      } catch {
        /* igual se cierra del lado del cliente */
      }
      api.borrarToken();
      usuario = undefined;
    },

    /** Descarta el usuario en memoria (sesión vencida detectada por la API). */
    olvidar() {
      usuario = undefined;
    },
  };
}
