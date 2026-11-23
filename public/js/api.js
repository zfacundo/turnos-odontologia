/* Cliente minimo de la API. Auth simulada: X-Usuario / X-Rol desde localStorage. */
async function api(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  try {
    const usuario = localStorage.getItem('usuario');
    const rol = localStorage.getItem('rol');
    if (usuario) headers['X-Usuario'] = usuario;
    if (rol) headers['X-Rol'] = rol;
  } catch (_) { /* localStorage no disponible */ }
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch('/api' + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* sin cuerpo JSON */ }
  return { ok: res.ok, status: res.status, data };
}
window.api = api;
