import type { Paciente } from '../../domain/pacientes/paciente';
import type { Usuario } from '../../domain/shared/rol';
import type { Prestacion } from '../../domain/configuracion/prestacion';
import type { Franja, Profesional } from '../../domain/configuracion/profesional';
import type { Sillon } from '../../domain/configuracion/sillon';

export const SILLONES: readonly Sillon[] = [
  { id: 'sillon-1', nombre: 'Sillon 1', activo: true },
  { id: 'sillon-2', nombre: 'Sillon 2', activo: true },
];

export const PRESTACIONES: readonly Prestacion[] = [
  { id: 'prest-control', codigo: 'control', nombre: 'Control y limpieza', duracionMin: 30 },
  { id: 'prest-orto', codigo: 'orto', nombre: 'Ortodoncia', duracionMin: 45 },
  { id: 'prest-trat', codigo: 'trat', nombre: 'Tratamiento', duracionMin: 60 },
  { id: 'prest-est', codigo: 'est', nombre: 'Estetica dental', duracionMin: 60 },
  { id: 'prest-urg', codigo: 'urg', nombre: 'Urgencia', duracionMin: 30 },
];

const DIAS_HABILES = [1, 2, 3, 4, 5] as const;

/** Lunes a viernes 09:00-13:00 y 14:00-19:00. */
export const DISPONIBILIDAD_SEMANAL: readonly Franja[] = DIAS_HABILES.flatMap((diaSemana) => [
  { diaSemana, desde: '09:00', hasta: '13:00' },
  { diaSemana, desde: '14:00', hasta: '19:00' },
]);

export const PROFESIONALES: readonly Profesional[] = [
  {
    id: 'prof-1',
    nombre: 'Dra. Ficticia Perez',
    matricula: 'MN-FICT-0001',
    activo: true,
    disponibilidad: DISPONIBILIDAD_SEMANAL,
  },
  {
    id: 'prof-2',
    nombre: 'Dr. Ficticio Gomez',
    matricula: 'MN-FICT-0002',
    activo: true,
    disponibilidad: DISPONIBILIDAD_SEMANAL,
  },
];

export const SEMANAS_DE_BLOQUEOS = 4;
export const MOTIVO_URGENCIAS = 'reservado urgencias';

const NOMBRES_PACIENTES = [
  'Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve', 'Diez',
] as const;

/** DNI 99000001..99000010; telefono +54 9 11 0000-0001..0010. Siempre ficticios. */
export const PACIENTES: readonly Paciente[] = NOMBRES_PACIENTES.map((nombre, i) => {
  const n = i + 1;
  return {
    id: `pac-${String(n).padStart(2, '0')}`,
    nombre: `Paciente Ficticio ${nombre}`,
    dni: String(99000000 + n),
    telefono: `+54 9 11 0000-${String(n).padStart(4, '0')}`,
  };
});

export const USUARIOS: readonly Usuario[] = [
  { id: 'u-admin', nombre: 'Admin Ficticio', rol: 'admin' },
  { id: 'u-recepcion', nombre: 'Recepcionista Ficticia', rol: 'recepcion' },
  { id: 'u-odonto-1', nombre: 'Dra. Ficticia Perez', rol: 'odontologo', profesionalId: 'prof-1' },
  { id: 'u-odonto-2', nombre: 'Dr. Ficticio Gomez', rol: 'odontologo', profesionalId: 'prof-2' },
];
