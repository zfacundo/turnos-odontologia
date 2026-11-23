import { describe, it, expect } from 'vitest';
import { AuditoriaEnMemoria } from '../../src/infrastructure/memory/auditoria-en-memoria';
import type { EventoAuditoria } from '../../src/application/ports/auditoria';

const ev = (accion: string): EventoAuditoria => ({
  fecha: new Date('2026-12-01T10:00:00-03:00'),
  usuarioId: 'u-recepcion',
  rol: 'recepcion',
  accion,
  entidad: 'turno',
  entidadId: 't-1',
  detalle: 'prueba',
});

describe('AuditoriaEnMemoria (solo insercion)', () => {
  it('dado una auditoria vacia cuando se registran crear y cancelar entonces los eventos quedan en ese orden', () => {
    const a = new AuditoriaEnMemoria();
    expect(a.eventos()).toEqual([]);
    a.registrar(ev('crear'));
    a.registrar(ev('cancelar'));
    expect(a.eventos().map((e) => e.accion)).toEqual(['crear', 'cancelar']);
  });

  it('dado eventos registrados cuando se muta la lista devuelta o el evento original entonces la auditoria no cambia', () => {
    const a = new AuditoriaEnMemoria();
    const original = { ...ev('crear') } as { -readonly [K in keyof EventoAuditoria]: EventoAuditoria[K] };
    a.registrar(original);
    original.accion = 'borrado';
    (a.eventos() as EventoAuditoria[]).pop();
    expect(a.eventos().map((e) => e.accion)).toEqual(['crear']);
  });

  it('dado el puerto Auditoria cuando se inspeccionan sus operaciones entonces solo ofrece registrar', () => {
    const a = new AuditoriaEnMemoria();
    const puerto: import('../../src/application/ports/auditoria').Auditoria = a;
    expect(typeof puerto.registrar).toBe('function');
    for (const prohibida of ['editar', 'borrar', 'eliminar', 'actualizar']) {
      expect(prohibida in a).toBe(false);
    }
  });
});
