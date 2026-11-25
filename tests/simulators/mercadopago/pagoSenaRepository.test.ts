import { describe, it, expect } from 'vitest';
import type { PagoSena } from '../../../src/simulators/mercadopago/pagoSena';
import { PagoSenaRepositoryEnMemoria } from '../../../src/simulators/mercadopago/pagoSenaRepository';

const pago = (id: string, turnoId: string, estado: PagoSena['estado']): PagoSena => ({
  id,
  turnoId,
  monto: 5000,
  estado,
  fecha: new Date('2026-11-30T09:00:00-03:00'),
  simulado: true,
});

describe('PagoSenaRepositoryEnMemoria', () => {
  it('dado un repositorio vacio cuando se listan los pagos de un turno entonces devuelve una lista vacia', () => {
    expect(new PagoSenaRepositoryEnMemoria().listarPorTurno('turno-T')).toEqual([]);
  });

  it('dado dos intentos del mismo turno cuando se listan entonces devuelve los dos en orden', () => {
    const repo = new PagoSenaRepositoryEnMemoria();
    repo.guardar(pago('p1', 'turno-T', 'rechazado'));
    repo.guardar(pago('p2', 'turno-T', 'aprobado'));
    repo.guardar(pago('p3', 'turno-otro', 'aprobado'));
    expect(repo.listarPorTurno('turno-T').map((p) => [p.id, p.estado])).toEqual([
      ['p1', 'rechazado'],
      ['p2', 'aprobado'],
    ]);
  });

  it('dado un pago guardado cuando se modifica la copia listada entonces el repositorio no cambia', () => {
    const repo = new PagoSenaRepositoryEnMemoria();
    const original = pago('p1', 'turno-T', 'aprobado');
    repo.guardar(original);
    const [copia] = repo.listarPorTurno('turno-T');
    expect(copia).toEqual(original);
    expect(copia).not.toBe(original);
    (copia as { monto: number }).monto = 1;
    expect(repo.listarPorTurno('turno-T')[0]?.monto).toBe(5000);
  });
});
