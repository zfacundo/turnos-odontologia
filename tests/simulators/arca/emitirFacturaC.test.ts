import { describe, it, expect } from 'vitest';
import type { EstadoTurno, Turno } from '../../../src/domain/agenda/turno';
import type { Rol, Usuario } from '../../../src/domain/shared/rol';
import { TurnoRepositoryEnMemoria } from '../../../src/infrastructure/memory/turno-repository';
import { PacienteRepositoryEnMemoria } from '../../../src/infrastructure/memory/paciente-repository';
import { PrestacionRepositoryEnMemoria } from '../../../src/infrastructure/memory/prestacion-repository';
import { AuditoriaEnMemoria } from '../../../src/infrastructure/memory/auditoria-en-memoria';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { PACIENTES, PRESTACIONES } from '../../../src/infrastructure/seed/datos-seed';
import { EMISOR_SIMULADO, IMPORTE_FACTURA_SIMULADA } from '../../../src/simulators/arca/facturaC';
import { FacturaCRepositoryEnMemoria } from '../../../src/simulators/arca/facturaCRepository';
import { emitirFacturaC, type DepsEmitirFacturaC } from '../../../src/simulators/arca/emitirFacturaC';

const AHORA = new Date('2026-12-01T12:00:00-03:00');
const usuarioCon = (rol: Rol): Usuario => ({ id: `u-${rol}`, nombre: `u-${rol}`, rol });
const RECEPCION = usuarioCon('recepcion');

/** Turno de referencia del spec (datos ficticios), por defecto `atendido`. */
const turno = (id: string, estado: EstadoTurno = 'atendido', pacienteId = 'pac-01'): Turno => ({
  id,
  pacienteId,
  prestacionId: 'prest-control',
  profesionalId: 'prof-1',
  sillonId: 'sillon-1',
  inicio: new Date('2026-12-01T10:00:00-03:00'),
  fin: new Date('2026-12-01T10:30:00-03:00'),
  estado,
  senado: false,
  esSobreturno: false,
  origen: 'recepcion',
  creadoPor: 'u-recepcion',
  creadoEn: new Date('2026-11-29T12:00:00-03:00'),
});

interface Escenario {
  deps: DepsEmitirFacturaC;
  turnos: TurnoRepositoryEnMemoria<Turno>;
  facturas: FacturaCRepositoryEnMemoria;
  auditoria: AuditoriaEnMemoria;
}

const escenario = (iniciales: Turno[], ahora: Date = AHORA): Escenario => {
  const turnos = new TurnoRepositoryEnMemoria<Turno>();
  for (const t of iniciales) turnos.guardar(t);
  const facturas = new FacturaCRepositoryEnMemoria();
  const auditoria = new AuditoriaEnMemoria();
  const deps: DepsEmitirFacturaC = {
    turnos,
    pacientes: new PacienteRepositoryEnMemoria(PACIENTES),
    prestaciones: new PrestacionRepositoryEnMemoria(PRESTACIONES),
    facturas,
    auditoria,
    clock: new RelojFijo(ahora),
  };
  return { deps, turnos, facturas, auditoria };
};

const emitidas = (a: AuditoriaEnMemoria) => a.eventos().filter((e) => e.accion === 'factura_emitida');

/** Un fallo no deja rastro: ni factura, ni auditoria, ni numero consumido. */
const sinEfectos = (e: Escenario, turnoId: string) => {
  expect(e.facturas.buscarPorTurno(turnoId)).toBeUndefined();
  expect(e.facturas.ultimoNumero()).toBe(0);
  expect(emitidas(e.auditoria)).toEqual([]);
};

const emitirOk = (e: Escenario, turnoId: string, usuario: Usuario = RECEPCION) => {
  const r = emitirFacturaC(e.deps, usuario, { turnoId });
  if (!r.ok) throw new Error(`se esperaba exito y fallo con ${JSON.stringify(r.error)}`);
  return r.valor;
};

describe('emitirFacturaC: emisión sobre un turno atendido', () => {
  it('dado T atendido sin factura cuando recepcion factura T entonces se registra una factura C simulada y T no cambia', () => {
    const e = escenario([turno('turno-T')]);
    const antes = e.turnos.buscarPorId('turno-T');
    const factura = emitirOk(e, 'turno-T');
    expect(factura.turnoId).toBe('turno-T');
    expect(factura.tipo).toBe('C');
    expect(factura.numero).toBe('00001-00000001');
    expect(factura.cae).toMatch(/^\d{14}$/);
    expect(factura.simulado).toBe(true);
    expect(e.facturas.buscarPorTurno('turno-T')).toEqual(factura);
    expect(e.turnos.buscarPorId('turno-T')).toEqual(antes);
  });

  it('dado T atendido sin factura cuando admin factura T entonces se emite la factura', () => {
    const e = escenario([turno('turno-T')]);
    expect(emitirOk(e, 'turno-T', usuarioCon('admin')).turnoId).toBe('turno-T');
  });
});

describe('emitirFacturaC: numeración correlativa', () => {
  it('dado T y U atendidos cuando recepcion factura T y despues U entonces los numeros son 1 y 2', () => {
    const e = escenario([turno('turno-T'), turno('turno-U')]);
    expect(emitirOk(e, 'turno-T').numero).toBe('00001-00000001');
    expect(emitirOk(e, 'turno-U').numero).toBe('00001-00000002');
  });
});

describe('emitirFacturaC: un pedido fallido no consume número', () => {
  it('dado T atendido, R reservado y U atendido cuando se factura T, falla R y se factura U entonces U tiene el numero 2', () => {
    const e = escenario([turno('turno-T'), turno('turno-R', 'reservado'), turno('turno-U')]);
    expect(emitirOk(e, 'turno-T').numero).toBe('00001-00000001');
    const r = emitirFacturaC(e.deps, RECEPCION, { turnoId: 'turno-R' });
    expect(r.ok).toBe(false);
    expect(emitirOk(e, 'turno-U').numero).toBe('00001-00000002');
  });

  it('dado T atendido cuando un odontologo factura T entonces falla y despues recepcion obtiene el numero 1', () => {
    const e = escenario([turno('turno-T')]);
    const r = emitirFacturaC(e.deps, usuarioCon('odontologo'), { turnoId: 'turno-T' });
    expect(r.ok).toBe(false);
    sinEfectos(e, 'turno-T');
    expect(emitirOk(e, 'turno-T').numero).toBe('00001-00000001');
  });
});

describe('emitirFacturaC: CAE ficticio determinístico', () => {
  it('dado el reloj en 2026-12-01 12:00 y sin facturas cuando recepcion factura T entonces el CAE es 26120101000001', () => {
    const e = escenario([turno('turno-T')]);
    expect(emitirOk(e, 'turno-T').cae).toBe('26120101000001');
  });

  it('dado la factura 1 ya emitida el 2026-12-01 cuando recepcion factura U entonces el CAE es 26120101000002', () => {
    const e = escenario([turno('turno-T'), turno('turno-U')]);
    emitirOk(e, 'turno-T');
    expect(emitirOk(e, 'turno-U').cae).toBe('26120101000002');
  });
});

describe('emitirFacturaC: fecha de emisión y vencimiento del CAE', () => {
  it('dado el reloj en 2026-12-01 12:00 cuando recepcion factura T entonces emision 2026-12-01 y vencimiento 2026-12-11', () => {
    const f = emitirOk(escenario([turno('turno-T')]), 'turno-T');
    expect(f.fechaEmision).toBe('2026-12-01');
    expect(f.vencimientoCae).toBe('2026-12-11');
    expect(f.emitidaEn).toEqual(AHORA);
  });

  it('dado el reloj a las 23:59 del 2026-11-30 en Argentina cuando recepcion factura T entonces la emision es 2026-11-30 y el CAE empieza con 261130', () => {
    const f = emitirOk(escenario([turno('turno-T')], new Date('2026-11-30T23:59:00-03:00')), 'turno-T');
    expect(f.fechaEmision).toBe('2026-11-30');
    expect(f.vencimientoCae).toBe('2026-12-10');
    expect(f.cae.startsWith('261130')).toBe(true);
  });

  it('dado el reloj en 2026-12-28 cuando recepcion factura T entonces el vencimiento cruza el año y es 2027-01-07', () => {
    const f = emitirOk(escenario([turno('turno-T')], new Date('2026-12-28T10:00:00-03:00')), 'turno-T');
    expect(f.fechaEmision).toBe('2026-12-28');
    expect(f.vencimientoCae).toBe('2027-01-07');
  });
});

describe('emitirFacturaC: importe, emisor y receptor ficticios', () => {
  it('dado T de pac-01 con DNI 99000001 cuando recepcion factura T entonces el comprobante tiene importe fijo, concepto, emisor y receptor enmascarado', () => {
    const f = emitirOk(escenario([turno('turno-T')]), 'turno-T');
    expect(f.importe).toBe(IMPORTE_FACTURA_SIMULADA);
    expect(f.concepto).toBe('Control y limpieza');
    expect(f.emisor).toEqual(EMISOR_SIMULADO);
    expect(f.receptor).toEqual({
      condicion: 'Consumidor Final',
      nombre: 'Paciente Ficticio Uno',
      dni: '99****01',
    });
    expect(JSON.stringify(f)).not.toContain('99000001');
  });

  it('dado T cuyo paciente no existe cuando recepcion factura T entonces el receptor es solo Consumidor Final', () => {
    const f = emitirOk(escenario([turno('turno-T', 'atendido', 'pac-inexistente')]), 'turno-T');
    expect(f.receptor).toEqual({ condicion: 'Consumidor Final' });
  });
});

describe('emitirFacturaC: solo se facturan turnos atendidos', () => {
  for (const estado of ['reservado', 'confirmado', 'cancelado', 'ausente'] as const) {
    it(`dado T ${estado} cuando recepcion factura T entonces falla con RN-SM-03 citando SU-07 y sin efectos`, () => {
      const e = escenario([turno('turno-T', estado)]);
      const r = emitirFacturaC(e.deps, RECEPCION, { turnoId: 'turno-T' });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.tipo).toBe('regla');
      if (r.error.tipo !== 'regla') return;
      expect(r.error.error.regla).toBe('RN-SM-03');
      expect(r.error.error.mensaje).toContain('SU-07');
      expect(r.error.error.conflicto).toEqual({ turnoId: 'turno-T' });
      sinEfectos(e, 'turno-T');
    });
  }
});

describe('emitirFacturaC: un turno se factura una sola vez', () => {
  it('dado T ya facturado con F cuando recepcion factura T otra vez entonces falla como ya facturado con el facturaId de F', () => {
    const e = escenario([turno('turno-T'), turno('turno-U')]);
    const f = emitirOk(e, 'turno-T');
    const r = emitirFacturaC(e.deps, RECEPCION, { turnoId: 'turno-T' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toEqual({
      tipo: 'ya-facturado',
      mensaje: expect.stringContaining('turno ya facturado'),
      turnoId: 'turno-T',
      facturaId: f.id,
    });
    expect(emitidas(e.auditoria)).toHaveLength(1);
    expect(emitirOk(e, 'turno-U').numero).toBe('00001-00000002');
  });
});

describe('emitirFacturaC: turno inexistente', () => {
  it('dado ningun turno cuando recepcion factura turno-inexistente entonces falla como no encontrado y sin efectos', () => {
    const e = escenario([]);
    const r = emitirFacturaC(e.deps, RECEPCION, { turnoId: 'turno-inexistente' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.tipo).toBe('no-encontrado');
    if (r.error.tipo !== 'no-encontrado') return;
    expect(r.error.mensaje).toContain('turno-inexistente');
    sinEfectos(e, 'turno-inexistente');
  });
});

describe('emitirFacturaC: validación del cuerpo', () => {
  const invalidos: [string, unknown][] = [
    ['un cuerpo sin turnoId', {}],
    ['un turnoId que no es texto', { turnoId: 123 }],
    ['un turnoId vacio', { turnoId: '' }],
    ['un cuerpo que no es un objeto', ['turno-T']],
    ['un cuerpo nulo', null],
  ];
  for (const [nombre, cuerpo] of invalidos) {
    it(`dado ${nombre} cuando recepcion pide emitir entonces falla como entrada invalida y sin efectos`, () => {
      const e = escenario([turno('turno-T')]);
      const r = emitirFacturaC(e.deps, RECEPCION, cuerpo);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.tipo).toBe('entrada');
      sinEfectos(e, 'turno-T');
    });
  }

  it('dado un importe enviado por el cliente cuando recepcion factura T entonces se ignora y se usa el importe fijo', () => {
    const e = escenario([turno('turno-T')]);
    const r = emitirFacturaC(e.deps, RECEPCION, { turnoId: 'turno-T', importe: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.importe).toBe(IMPORTE_FACTURA_SIMULADA);
  });
});

describe('emitirFacturaC: solo recepción y administración emiten', () => {
  for (const rol of ['odontologo', 'paciente'] as const) {
    it(`dado T atendido cuando un ${rol} factura T entonces falla por permiso y sin efectos`, () => {
      const e = escenario([turno('turno-T')]);
      const r = emitirFacturaC(e.deps, usuarioCon(rol), { turnoId: 'turno-T' });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.tipo).toBe('permiso');
      sinEfectos(e, 'turno-T');
    });
  }

  it('dado un pedido sin usuario sobre un turno inexistente cuando pide emitir entonces falla por permiso antes que por 404', () => {
    const e = escenario([]);
    const r = emitirFacturaC(e.deps, undefined, { turnoId: 'turno-inexistente' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.tipo).toBe('permiso');
  });

  it('dado un odontologo con cuerpo invalido cuando pide emitir entonces falla por permiso antes que por entrada', () => {
    const e = escenario([]);
    const r = emitirFacturaC(e.deps, usuarioCon('odontologo'), {});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.tipo).toBe('permiso');
  });
});

describe('emitirFacturaC: auditoría de la emisión', () => {
  it('dado T atendido cuando recepcion factura T entonces se audita factura_emitida sobre el turno con el detalle', () => {
    const e = escenario([turno('turno-T')]);
    const f = emitirOk(e, 'turno-T');
    const eventos = emitidas(e.auditoria);
    expect(eventos).toHaveLength(1);
    const [evento] = eventos;
    expect(evento).toMatchObject({
      accion: 'factura_emitida',
      entidad: 'turno',
      entidadId: 'turno-T',
      usuarioId: 'u-recepcion',
      rol: 'recepcion',
      fecha: AHORA,
    });
    expect(JSON.parse(evento?.detalle ?? '{}')).toEqual({
      facturaId: f.id,
      numero: '00001-00000001',
      cae: '26120101000001',
      importe: IMPORTE_FACTURA_SIMULADA,
      simulado: true,
    });
  });

  it('dado T reservado cuando recepcion factura T y falla entonces no se audita nada', () => {
    const e = escenario([turno('turno-T', 'reservado')]);
    emitirFacturaC(e.deps, RECEPCION, { turnoId: 'turno-T' });
    expect(emitidas(e.auditoria)).toEqual([]);
  });
});
