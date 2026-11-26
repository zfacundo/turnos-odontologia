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
import { emitirFacturaC } from '../../../src/simulators/arca/emitirFacturaC';
import { verFacturaC, type DepsVerFacturaC } from '../../../src/simulators/arca/verFacturaC';

// spec: arca-ver-factura-y-confirmar-emision
const AHORA = new Date('2026-12-01T12:00:00-03:00');
const usuarioCon = (rol: Rol): Usuario => ({ id: `u-${rol}`, nombre: `u-${rol}`, rol });
const RECEPCION = usuarioCon('recepcion');

const turno = (id: string, estado: EstadoTurno = 'atendido'): Turno => ({
  id,
  pacienteId: 'pac-01',
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

const escenario = (iniciales: Turno[]) => {
  const turnos = new TurnoRepositoryEnMemoria<Turno>();
  for (const t of iniciales) turnos.guardar(t);
  const facturas = new FacturaCRepositoryEnMemoria();
  const auditoria = new AuditoriaEnMemoria();
  const base = {
    turnos,
    pacientes: new PacienteRepositoryEnMemoria(PACIENTES),
    prestaciones: new PrestacionRepositoryEnMemoria(PRESTACIONES),
    clock: new RelojFijo(AHORA),
  };
  const deps: DepsVerFacturaC = { ...base, facturas };
  const emitir = (turnoId: string) => {
    const r = emitirFacturaC({ ...base, facturas, auditoria }, RECEPCION, { turnoId });
    if (!r.ok) throw new Error(`se esperaba exito: ${JSON.stringify(r.error)}`);
    return r.valor;
  };
  return { deps, turnos, facturas, auditoria, emitir };
};

const ver = (d: DepsVerFacturaC, turnoId: string, usuario: Usuario | undefined = RECEPCION) => {
  const r = verFacturaC(d, usuario, turnoId);
  if (!r.ok) throw new Error(`se esperaba exito: ${JSON.stringify(r.error)}`);
  return r.valor;
};

describe('verFacturaC: turno ya facturado', () => {
  it('dado T facturado cuando recepcion consulta entonces devuelve estado emitida con la factura guardada', () => {
    const e = escenario([turno('turno-T')]);
    const emitida = e.emitir('turno-T');
    const vista = ver(e.deps, 'turno-T');
    expect(vista.estado).toBe('emitida');
    if (vista.estado !== 'emitida') throw new Error('se esperaba emitida');
    expect(vista.factura).toEqual(emitida);
    expect(vista.factura.numero).toBe('00001-00000001');
    expect(vista.factura.cae).toBe('26120101000001');
  });

  it('dado T facturado y luego ausente cuando admin consulta entonces devuelve la factura sin mirar el estado del turno', () => {
    const e = escenario([turno('turno-T')]);
    e.emitir('turno-T');
    e.turnos.guardar(turno('turno-T', 'ausente'));
    expect(ver(e.deps, 'turno-T', usuarioCon('admin')).estado).toBe('emitida');
  });

  it('dado T facturado cuando se consulta dos veces y se factura otro turno U entonces hay un solo evento de auditoria sobre T y U es 00001-00000002', () => {
    const e = escenario([turno('turno-T'), turno('turno-U')]);
    e.emitir('turno-T');
    ver(e.deps, 'turno-T');
    ver(e.deps, 'turno-T');
    const u = e.emitir('turno-U');
    const eventosT = e.auditoria.eventos().filter((x) => x.accion === 'factura_emitida' && x.entidadId === 'turno-T');
    expect(eventosT).toHaveLength(1);
    expect(u.numero).toBe('00001-00000002');
  });
});

describe('verFacturaC: vista previa', () => {
  it('dado T atendido sin factura cuando recepcion consulta entonces devuelve vista-previa emitible con el borrador sin numero ni cae', () => {
    const e = escenario([turno('turno-T')]);
    const vista = ver(e.deps, 'turno-T');
    expect(vista).toEqual({
      estado: 'vista-previa',
      emitible: true,
      factura: {
        turnoId: 'turno-T',
        tipo: 'C',
        fechaEmision: '2026-12-01',
        importe: IMPORTE_FACTURA_SIMULADA,
        concepto: 'Control y limpieza',
        emisor: EMISOR_SIMULADO,
        receptor: { condicion: 'Consumidor Final', nombre: 'Paciente Ficticio Uno', dni: '99****01' },
        numero: null,
        cae: null,
        vencimientoCae: null,
        simulado: true,
      },
    });
    expect(JSON.stringify(vista)).not.toContain('99000001');
  });

  it('dado T atendido sin factura cuando se consulta dos veces y despues se factura entonces no se guardo nada, el numero es 00001-00000001 y la auditoria tiene un solo evento', () => {
    const e = escenario([turno('turno-T')]);
    ver(e.deps, 'turno-T');
    ver(e.deps, 'turno-T');
    expect(e.facturas.buscarPorTurno('turno-T')).toBeUndefined();
    expect(e.facturas.ultimoNumero()).toBe(0);
    expect(e.auditoria.eventos()).toEqual([]);
    expect(e.emitir('turno-T').numero).toBe('00001-00000001');
    expect(e.auditoria.eventos().filter((x) => x.accion === 'factura_emitida')).toHaveLength(1);
  });

  for (const estado of ['reservado', 'confirmado', 'cancelado', 'ausente'] as const) {
    it(`dado T ${estado} sin factura cuando se consulta entonces vista-previa no emitible con RN-SM-03 citando SU-07 y sin efectos`, () => {
      const e = escenario([turno('turno-T', estado)]);
      const vista = ver(e.deps, 'turno-T');
      expect(vista.estado).toBe('vista-previa');
      if (vista.estado !== 'vista-previa') throw new Error('se esperaba vista-previa');
      expect(vista.emitible).toBe(false);
      expect(vista.motivo?.regla).toBe('RN-SM-03');
      expect(vista.motivo?.mensaje).toContain('SU-07');
      expect(e.facturas.ultimoNumero()).toBe(0);
      expect(e.auditoria.eventos()).toEqual([]);
    });
  }
});

describe('verFacturaC: errores', () => {
  it('dado un turno inexistente cuando se consulta entonces falla con no-encontrado que nombra el id', () => {
    const e = escenario([]);
    const r = verFacturaC(e.deps, RECEPCION, 'turno-inexistente');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.tipo).toBe('no-encontrado');
    expect(r.error.mensaje).toContain('turno-inexistente');
  });

  for (const rol of ['odontologo', 'paciente'] as const) {
    it(`dado el rol ${rol} cuando consulta un turno facturado entonces falla con permiso`, () => {
      const e = escenario([turno('turno-T')]);
      e.emitir('turno-T');
      const r = verFacturaC(e.deps, usuarioCon(rol), 'turno-T');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.tipo).toBe('permiso');
    });
  }

  it('dado ningun usuario cuando consulta un turno inexistente entonces falla con permiso y no con no-encontrado', () => {
    const e = escenario([]);
    const r = verFacturaC(e.deps, undefined, 'turno-inexistente');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
  });
});
