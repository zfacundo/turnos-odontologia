/** Paciente tal como lo devuelve GET /api/pacientes (DNI y teléfono enmascarados). */
export interface PacientePanel {
  id: string;
  nombre: string;
  dni: string;
  telefono: string;
  email?: string;
  obraSocialId?: string;
  nroAfiliado?: string;
}

export function filtrarPacientes<T extends { nombre: string }>(pacientes: readonly T[], consulta: string): T[];
export function textoResultados(cantidad: number): string;
