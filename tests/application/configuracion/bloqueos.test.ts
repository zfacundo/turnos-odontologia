import { describe, it, expect } from 'vitest';
import { crearBloqueo } from '../../../src/application/configuracion/crearBloqueo';
import { eliminarBloqueo } from '../../../src/application/configuracion/eliminarBloqueo';
import type { Usuario } from '../../../src/domain/shared/rol';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const admin: Usuario = { id: 'u-admin', nombre: 'Admin Ficticio', rol: 'admin' };
const recepcion: Usuario = { id: 'u-recepcion', nombre: 'Recepcionista Ficticia', rol: 'recepcion' };
const odontologo: Usuario = {
  id: 'u-odonto-1',
  nombre: 'Dra. Ficticia Perez',
  rol: 'odontologo',
  profesionalId: 'prof-1',
};
const nuevoEntorno = () => cargarSeed(new RelojFijo(AHORA));
const fecha = (hora: string, minuto?: string) =>
  new Date(`2026-12-08T${hora}${minuto === undefined ? '' : `:${minuto}`}:00-03:00`);
const datos = (profesionalId?: string) => ({
  motivo: 'Mantenimiento',
  desde: fecha('10:00'),
  hasta: fecha('11:00'),
  profesionalId,
});

describe('crearBloqueo', () => {
  it('dado un admin cuando crea un bloqueo global entonces se guarda', () => {
    const deps = nuevoEntorno();
    const cantidad = deps.bloqueos.listar().length;
    const r = crearBloqueo(deps, admin, datos());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor).toMatchObject({ motivo: 'Mantenimiento' });
    expect(deps.bloqueos.listar()).toHaveLength(cantidad + 1);
    expect(deps.bloqueos.buscarPorId(r.valor.id)).toEqual(r.valor);
  });

  it('dado recepción cuando crea un bloqueo global entonces se guarda', () => {
    const deps = nuevoEntorno();
    const r = crearBloqueo(deps, recepcion, datos());
    expect(r.ok).toBe(true);
  });

  it('dado un odontólogo cuando crea un bloqueo de su profesional entonces se guarda', () => {
    const deps = nuevoEntorno();
    const r = crearBloqueo(deps, odontologo, datos('prof-1'));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor.profesionalId).toBe('prof-1');
  });

  it('dado un odontólogo cuando crea un bloqueo de otro profesional entonces devuelve permiso', () => {
    const deps = nuevoEntorno();
    const r = crearBloqueo(deps, odontologo, datos('prof-2'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
  });

  it('dado un odontólogo cuando crea un bloqueo global entonces devuelve permiso', () => {
    const deps = nuevoEntorno();
    const r = crearBloqueo(deps, odontologo, datos());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
  });

  it('dado una referencia de profesional inexistente cuando crea el bloqueo entonces devuelve entrada', () => {
    const deps = nuevoEntorno();
    const r = crearBloqueo(deps, admin, datos('prof-inexistente'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('entrada');
  });

  it('dado un intervalo desalineado 09:10 cuando crea el bloqueo entonces devuelve regla RN-AG-03', () => {
    const deps = nuevoEntorno();
    const r = crearBloqueo(deps, admin, {
      ...datos(),
      desde: fecha('09', '10'),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.tipo).toBe('regla');
      if (r.error.tipo === 'regla') expect(r.error.error.regla).toBe('RN-AG-03');
    }
  });

  it('dado un intervalo con inicio igual al fin cuando crea el bloqueo entonces devuelve regla RN-AG-01', () => {
    const deps = nuevoEntorno();
    const r = crearBloqueo(deps, admin, { ...datos(), hasta: fecha('10:00') });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.tipo).toBe('regla');
      if (r.error.tipo === 'regla') expect(r.error.error.regla).toBe('RN-AG-01');
    }
  });

  it('dado un motivo solo espacios cuando crea el bloqueo entonces devuelve entrada', () => {
    const deps = nuevoEntorno();
    const r = crearBloqueo(deps, admin, { ...datos(), motivo: '   ' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('entrada');
  });
});

describe('eliminarBloqueo', () => {
  const conBloqueos = () => {
    const deps = nuevoEntorno();
    const creado = crearBloqueo(deps, admin, datos('prof-1'));
    if (!creado.ok) throw new Error('No se pudo crear el bloqueo de prueba');
    return { deps, id: creado.valor.id };
  };

  it('dado un admin cuando elimina un bloqueo entonces desaparece del repositorio', () => {
    const { deps, id } = conBloqueos();
    const r = eliminarBloqueo(deps, admin, id);
    expect(r.ok).toBe(true);
    expect(deps.bloqueos.buscarPorId(id)).toBeUndefined();
  });

  it('dado recepción cuando elimina un bloqueo ajeno entonces lo elimina', () => {
    const { deps, id } = conBloqueos();
    const r = eliminarBloqueo(deps, recepcion, id);
    expect(r.ok).toBe(true);
    expect(deps.bloqueos.buscarPorId(id)).toBeUndefined();
  });

  it('dado un odontólogo cuando elimina su propio bloqueo entonces lo elimina', () => {
    const { deps, id } = conBloqueos();
    const r = eliminarBloqueo(deps, odontologo, id);
    expect(r.ok).toBe(true);
    expect(deps.bloqueos.buscarPorId(id)).toBeUndefined();
  });

  it('dado un odontólogo cuando elimina un bloqueo de otro profesional entonces devuelve permiso y no lo borra', () => {
    const { deps, id } = conBloqueos();
    const otro: Usuario = { ...odontologo, id: 'u-odonto-2', profesionalId: 'prof-2' };
    const r = eliminarBloqueo(deps, otro, id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
    expect(deps.bloqueos.buscarPorId(id)).toBeDefined();
  });

  it('dado un odontólogo cuando elimina un bloqueo global entonces devuelve permiso', () => {
    const deps = nuevoEntorno();
    const creado = crearBloqueo(deps, admin, datos());
    if (!creado.ok) throw new Error('No se pudo crear el bloqueo global de prueba');
    const r = eliminarBloqueo(deps, odontologo, creado.valor.id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
  });

  it('dado un id inexistente cuando se elimina entonces devuelve no-encontrado', () => {
    const deps = nuevoEntorno();
    const r = eliminarBloqueo(deps, admin, 'bloq-inexistente');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('no-encontrado');
  });
});
