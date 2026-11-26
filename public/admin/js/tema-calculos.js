// Lógica pura del tema del panel (design D3). Sin DOM ni almacenamiento.
export const CLAVE_TEMA = 'adm.tema';

export function normalizarTema(valor) {
  return valor === 'claro' || valor === 'oscuro' ? valor : null;
}

export function resolverTema(guardado, prefiereOscuro) {
  const elegido = normalizarTema(guardado);
  if (elegido !== null) return elegido;
  return prefiereOscuro ? 'oscuro' : 'claro';
}

export function alternarTema(actual) {
  return actual === 'oscuro' ? 'claro' : 'oscuro';
}

export function esquemaDeColor(tema) {
  return tema === 'oscuro' ? 'dark' : 'light';
}
