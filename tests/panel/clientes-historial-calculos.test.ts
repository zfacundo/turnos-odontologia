import { describe, expect, it } from 'vitest';
import {
  filtrarPacientes,
  textoResultados,
  type PacientePanel,
} from '../../public/admin/js/clientes-calculos.js';
import {
  aFechaIso,
  contadorNotas,
  validarEntradaForm,
} from '../../public/admin/js/historial-calculos.js';

const NOMBRES = ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve', 'Diez'];
const PACIENTES: PacientePanel[] = NOMBRES.map((n, i) => ({
  id: `pac-${String(i + 1).padStart(2, '0')}`,
  nombre: `Paciente Ficticio ${n}`,
  dni: `99****${String(i + 1).padStart(2, '0')}`,
  telefono: `+54 9 11 0000-**${String(i + 1).padStart(2, '0')}`,
}));

describe('filtrarPacientes', () => {
  it('dado los 10 pacientes del seed cuando se busca Tres entonces queda solo Paciente Ficticio Tres', () => {
    expect(filtrarPacientes(PACIENTES, 'Tres').map((p) => p.nombre)).toEqual(['Paciente Ficticio Tres']);
  });

  it('dado la busqueda en minusculas y con espacios cuando se filtra entonces ignora mayusculas y recorta', () => {
    expect(filtrarPacientes(PACIENTES, '  tres ').map((p) => p.id)).toEqual(['pac-03']);
  });

  it('dado una busqueda vacia cuando se filtra entonces devuelve los 10', () => {
    expect(filtrarPacientes(PACIENTES, '')).toHaveLength(10);
    expect(filtrarPacientes(PACIENTES, '   ')).toHaveLength(10);
  });

  it('dado zzz cuando se filtra entonces no hay resultados', () => {
    expect(filtrarPacientes(PACIENTES, 'zzz')).toEqual([]);
  });

  it('dado una busqueda con tilde o sin ella cuando se filtra entonces coincide igual', () => {
    const lista: PacientePanel[] = [{ id: 'p', nombre: 'Paciente Ficticio Ñandú', dni: '', telefono: '' }];
    expect(filtrarPacientes(lista, 'nandu')).toHaveLength(1);
    expect(filtrarPacientes(lista, 'ñandú')).toHaveLength(1);
  });

  it('dado el DNI enmascarado cuando se busca por digitos entonces no filtra por DNI (solo por nombre)', () => {
    expect(filtrarPacientes(PACIENTES, '99')).toEqual([]);
  });
});

describe('textoResultados', () => {
  it('dado distintas cantidades cuando se pide el texto entonces concuerda el singular y el plural', () => {
    expect(textoResultados(10)).toBe('10 pacientes');
    expect(textoResultados(1)).toBe('1 paciente');
    expect(textoResultados(0)).toBe('No encontramos pacientes con ese criterio');
  });
});

describe('aFechaIso', () => {
  it('dado un valor datetime-local cuando se convierte entonces agrega segundos y la zona -03:00', () => {
    expect(aFechaIso('2026-12-01T10:00')).toBe('2026-12-01T10:00:00-03:00');
  });

  it('dado un valor con segundos cuando se convierte entonces no duplica los segundos', () => {
    expect(aFechaIso('2026-12-01T10:00:30')).toBe('2026-12-01T10:00:30-03:00');
  });

  it('dado un valor vacio cuando se convierte entonces devuelve vacio', () => {
    expect(aFechaIso('')).toBe('');
  });
});

describe('validarEntradaForm', () => {
  const AHORA = '2026-12-01T13:00:00.000Z'; // 10:00 en Buenos Aires
  const ok = { fecha: '2026-12-01T09:00', procedimiento: 'Control y limpieza', notas: 'Sin hallazgos (dato ficticio)' };

  it('dado un formulario valido cuando se valida entonces no hay errores', () => {
    expect(validarEntradaForm(ok, AHORA)).toEqual({ valido: true, errores: {} });
  });

  it('dado un procedimiento vacio o solo espacios cuando se valida entonces marca el campo procedimiento', () => {
    for (const procedimiento of ['', '   ']) {
      const r = validarEntradaForm({ ...ok, procedimiento }, AHORA);
      expect(r.valido).toBe(false);
      expect(r.errores.procedimiento).toBe('Escribí el procedimiento (hasta 120 caracteres).');
    }
  });

  it('dado un procedimiento de 121 caracteres cuando se valida entonces marca el campo procedimiento', () => {
    const r = validarEntradaForm({ ...ok, procedimiento: 'a'.repeat(121) }, AHORA);
    expect(r.errores.procedimiento).toBeDefined();
  });

  it('dado un procedimiento de 120 caracteres cuando se valida entonces es valido', () => {
    expect(validarEntradaForm({ ...ok, procedimiento: 'a'.repeat(120) }, AHORA).valido).toBe(true);
  });

  it('dado notas de 1001 caracteres cuando se valida entonces marca notas; con 1000 es valido', () => {
    expect(validarEntradaForm({ ...ok, notas: 'n'.repeat(1001) }, AHORA).errores.notas).toBeDefined();
    expect(validarEntradaForm({ ...ok, notas: 'n'.repeat(1000) }, AHORA).valido).toBe(true);
  });

  it('dado una fecha vacia cuando se valida entonces marca la fecha', () => {
    expect(validarEntradaForm({ ...ok, fecha: '' }, AHORA).errores.fecha).toBe('Elegí la fecha y la hora.');
  });

  it('dado una fecha posterior al reloj cuando se valida entonces marca la fecha como futura', () => {
    const r = validarEntradaForm({ ...ok, fecha: '2026-12-02T10:00' }, AHORA);
    expect(r.errores.fecha).toBe('La fecha no puede ser posterior a ahora.');
  });

  it('dado una fecha igual al reloj cuando se valida entonces es valida', () => {
    expect(validarEntradaForm({ ...ok, fecha: '2026-12-01T10:00' }, AHORA).valido).toBe(true);
  });

  it('dado varios campos invalidos cuando se valida entonces informa todos los errores a la vez', () => {
    const r = validarEntradaForm({ fecha: '', procedimiento: '', notas: 'n'.repeat(1001) }, AHORA);
    expect(Object.keys(r.errores).sort()).toEqual(['fecha', 'notas', 'procedimiento']);
  });
});

describe('contadorNotas', () => {
  it('dado una cantidad de caracteres cuando se arma el contador entonces muestra n / 1000 y la nota ficticia', () => {
    expect(contadorNotas(0)).toBe('0 / 1000 · Solo datos ficticios.');
    expect(contadorNotas(250)).toBe('250 / 1000 · Solo datos ficticios.');
  });
});
