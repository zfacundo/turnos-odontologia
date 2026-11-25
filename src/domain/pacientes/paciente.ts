export interface Paciente {
  readonly id: string;
  readonly nombre: string;
  /** DNI sin puntos. Siempre ficticio (99000000-99999999). */
  readonly dni: string;
  /** Telefono ficticio '+54 9 11 0000-00NN'. */
  readonly telefono: string;
  readonly email?: string;
  readonly obraSocialId?: string;
  readonly nroAfiliado?: string;
}
