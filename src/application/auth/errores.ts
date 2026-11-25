export type ErrorAuth =
  | { readonly tipo: 'autenticacion'; readonly mensaje: string }
  | { readonly tipo: 'entrada'; readonly mensaje: string };

/** Mensaje único: no distingue "no existe" de "venció" (S-4). */
export const MENSAJE_SESION_INVALIDA = 'Sesión inválida o vencida.';
export const MENSAJE_LOGIN_INVALIDO = 'No se pudo iniciar sesión con ese usuario.';
