import { describe, it, expect } from 'vitest';
import { EMISOR_SIMULADO, type FacturaC } from '../../../src/simulators/arca/facturaC';
import { FacturaCRepositoryEnMemoria } from '../../../src/simulators/arca/facturaCRepository';

const factura = (id: string, turnoId: string, n: number): FacturaC => ({
  id,
  turnoId,
  tipo: 'C',
  numero: `00001-${String(n).padStart(8, '0')}`,
  cae: `26120101${String(n).padStart(6, '0')}`,
  fechaEmision: '2026-12-01',
  vencimientoCae: '2026-12-11',
  emitidaEn: new Date('2026-12-01T12:00:00-03:00'),
  importe: 25000,
  concepto: 'Control y limpieza',
  emisor: EMISOR_SIMULADO,
  receptor: { condicion: 'Consumidor Final', nombre: 'Paciente Ficticio Uno', dni: '99****01' },
  simulado: true,
});

describe('FacturaCRepositoryEnMemoria', () => {
  it('dado un repositorio vacio cuando se pide el ultimo numero entonces es 0', () => {
    expect(new FacturaCRepositoryEnMemoria().ultimoNumero()).toBe(0);
  });

  it('dado dos facturas guardadas cuando se pide el ultimo numero entonces es 2', () => {
    const repo = new FacturaCRepositoryEnMemoria();
    repo.guardar(factura('f-1', 'turno-T', 1));
    repo.guardar(factura('f-2', 'turno-U', 2));
    expect(repo.ultimoNumero()).toBe(2);
  });

  it('dado un turno sin factura cuando se busca por turno entonces devuelve undefined', () => {
    expect(new FacturaCRepositoryEnMemoria().buscarPorTurno('turno-T')).toBeUndefined();
  });

  it('dado una factura guardada cuando se busca por su turno entonces devuelve una copia igual', () => {
    const repo = new FacturaCRepositoryEnMemoria();
    const original = factura('f-1', 'turno-T', 1);
    repo.guardar(original);
    const encontrada = repo.buscarPorTurno('turno-T');
    expect(encontrada).toEqual(original);
    expect(encontrada).not.toBe(original);
  });

  it('dado una copia devuelta cuando se la modifica entonces lo guardado no cambia', () => {
    const repo = new FacturaCRepositoryEnMemoria();
    repo.guardar(factura('f-1', 'turno-T', 1));
    const copia = repo.buscarPorTurno('turno-T') as { numero: string };
    copia.numero = 'alterado';
    expect(repo.buscarPorTurno('turno-T')?.numero).toBe('00001-00000001');
  });
});
