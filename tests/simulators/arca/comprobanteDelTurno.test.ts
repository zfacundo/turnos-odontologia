import { describe, it, expect } from 'vitest';
import type { Turno } from '../../../src/domain/agenda/turno';
import type { Rol, Usuario } from '../../../src/domain/shared/rol';
import { PacienteRepositoryEnMemoria } from '../../../src/infrastructure/memory/paciente-repository';
import { PrestacionRepositoryEnMemoria } from '../../../src/infrastructure/memory/prestacion-repository';
import { PACIENTES, PRESTACIONES } from '../../../src/infrastructure/seed/datos-seed';
import { CONCEPTO_POR_DEFECTO } from '../../../src/simulators/arca/facturaC';
import { entradaDelComprobante, puedeOperarFacturas } from '../../../src/simulators/arca/comprobanteDelTurno';

// spec: arca-ver-factura-y-confirmar-emision
const AHORA = new Date('2026-12-01T12:00:00-03:00');
const deps = {
  pacientes: new PacienteRepositoryEnMemoria(PACIENTES),
  prestaciones: new PrestacionRepositoryEnMemoria(PRESTACIONES),
};
const turno = (pacienteId: string, prestacionId: string): Turno => ({
  id: 'turno-T',
  pacienteId,
  prestacionId,
  profesionalId: 'prof-1',
  sillonId: 'sillon-1',
  inicio: new Date('2026-12-01T10:00:00-03:00'),
  fin: new Date('2026-12-01T10:30:00-03:00'),
  estado: 'atendido',
  senado: false,
  esSobreturno: false,
  origen: 'recepcion',
  creadoPor: 'u-recepcion',
  creadoEn: new Date('2026-11-29T12:00:00-03:00'),
});
const usuarioCon = (rol: Rol): Usuario => ({ id: `u-${rol}`, nombre: `u-${rol}`, rol });

describe('entradaDelComprobante', () => {
  it('dado un turno con paciente y prestacion existentes cuando se arma la entrada entonces trae el receptor con DNI enmascarado y el nombre de la prestacion', () => {
    const e = entradaDelComprobante(deps, turno('pac-01', 'prest-control'), AHORA);
    expect(e).toEqual({
      turnoId: 'turno-T',
      concepto: 'Control y limpieza',
      receptor: { condicion: 'Consumidor Final', nombre: 'Paciente Ficticio Uno', dni: '99****01' },
      ahora: AHORA,
    });
  });

  it('dado un turno con paciente y prestacion inexistentes cuando se arma la entrada entonces usa Consumidor Final solo y el concepto por defecto', () => {
    const e = entradaDelComprobante(deps, turno('pac-no-existe', 'prest-no-existe'), AHORA);
    expect(e.receptor).toEqual({ condicion: 'Consumidor Final' });
    expect(e.concepto).toBe(CONCEPTO_POR_DEFECTO);
  });
});

describe('puedeOperarFacturas', () => {
  for (const rol of ['admin', 'recepcion'] as const) {
    it(`dado el rol ${rol} cuando se consulta entonces puede operar facturas`, () => {
      expect(puedeOperarFacturas(usuarioCon(rol))).toBe(true);
    });
  }
  for (const rol of ['odontologo', 'paciente'] as const) {
    it(`dado el rol ${rol} cuando se consulta entonces no puede`, () => {
      expect(puedeOperarFacturas(usuarioCon(rol))).toBe(false);
    });
  }
  it('dado ningun usuario cuando se consulta entonces no puede', () => {
    expect(puedeOperarFacturas(undefined)).toBe(false);
  });
});
