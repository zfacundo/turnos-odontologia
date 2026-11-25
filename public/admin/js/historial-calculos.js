// Validación en línea del formulario de historial (espejo de las reglas de la API). Sin DOM ni red.

const PROCEDIMIENTO_MAX = 120;
const NOTAS_MAX = 1000;

/** Valor de <input type="datetime-local"> ('2026-12-01T10:00') → ISO con zona del consultorio. */
export function aFechaIso(valorLocal) {
  if (!valorLocal) return '';
  const conSegundos = /T\d{2}:\d{2}$/.test(valorLocal) ? `${valorLocal}:00` : valorLocal;
  return `${conSegundos}-03:00`;
}

/** Valida el alta sin llamar a la API; `ahoraIso` es el instante actual (inyectado). */
export function validarEntradaForm({ fecha, procedimiento, notas }, ahoraIso) {
  const errores = {};
  if (!fecha) {
    errores.fecha = 'Elegí la fecha y la hora.';
  } else if (Date.parse(aFechaIso(fecha)) > Date.parse(ahoraIso)) {
    errores.fecha = 'La fecha no puede ser posterior a ahora.';
  }
  const proc = String(procedimiento ?? '');
  if (proc.trim() === '' || proc.length > PROCEDIMIENTO_MAX) {
    errores.procedimiento = 'Escribí el procedimiento (hasta 120 caracteres).';
  }
  if (String(notas ?? '').length > NOTAS_MAX) {
    errores.notas = 'Las notas pueden tener hasta 1000 caracteres.';
  }
  return { valido: Object.keys(errores).length === 0, errores };
}

/** Contador de la ayuda de notas. */
export function contadorNotas(cantidad) {
  return `${cantidad} / ${NOTAS_MAX} · Solo datos ficticios.`;
}
