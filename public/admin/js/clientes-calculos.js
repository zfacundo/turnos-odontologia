// Cálculos puros de la sección Clientes (búsqueda en el navegador). Sin DOM ni red.

/** Minúsculas y sin tildes, para comparar nombres. */
function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Búsqueda por nombre (el DNI llega enmascarado, así que no se usa). Vacía = todos. */
export function filtrarPacientes(pacientes, consulta) {
  const q = normalizar(consulta);
  if (q === '') return [...pacientes];
  return pacientes.filter((p) => normalizar(p.nombre).includes(q));
}

/** Texto del resultado anunciado en la región aria-live. */
export function textoResultados(cantidad) {
  if (cantidad === 0) return 'No encontramos pacientes con ese criterio';
  return cantidad === 1 ? '1 paciente' : `${cantidad} pacientes`;
}
