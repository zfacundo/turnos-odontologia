export interface SeccionPanel {
  readonly id: 'dashboard' | 'agenda' | 'clientes' | 'historial';
  readonly titulo: string;
  readonly grupo: 'Consultorio' | 'Clínica';
  /** Hash de la sección, p. ej. '#/agenda'. */
  readonly ruta: string;
}

export function seccionesPara(rol: string | undefined): SeccionPanel[];
export function parsearRuta(hash: string): { seccion: string; id: string | undefined };
export function puedeVer(rol: string | undefined, ruta: string): boolean;
export function puedeEditarClientes(rol: string | undefined): boolean;
export function puedeLeerHistorial(rol: string | undefined): boolean;
export function puedeCrearHistorial(rol: string | undefined): boolean;
export function puedeVerOdontograma(rol: string | undefined): boolean;
export function puedeCrearTurnos(rol: string | undefined): boolean;
export function puedeVerRegistro(rol: string | undefined): boolean;
