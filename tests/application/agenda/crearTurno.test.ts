import { describe, it, expect } from 'vitest';
import { crearTurno } from '../../../src/application/agenda/crearTurno';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';
import { AuditoriaEnMemoria } from '../../../src/infrastructure/memory/auditoria-en-memoria';
import type { Usuario } from '../../../src/domain/shared/rol';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const en = (hhmm: string, fecha = '2026-12-01'): Date => new Date(`${fecha}T${hhmm}:00-03:00`);

const recepcion: Usuario = { id: 'u-recepcion', nombre: 'Recepcionista Ficticia', rol: 'recepcion' };

const entradaBase = {
  pacienteId: 'pac-01',
  prestacionId: 'prest-control',
  profesionalId: 'prof-1',
  sillonId: 'sillon-1',
  inicio: en('10:00'),
};

const nuevoEntorno = () => {
  const deps = cargarSeed(new RelojFijo(AHORA));
  const auditoria = deps.auditoria as AuditoriaEnMemoria;
  return { deps, auditoria };
};

describe('crearTurno - alta exitosa', () => {
  it('dado el seed y el reloj fijo cuando recepcion crea un control de pac-01 a las 10:00 entonces guarda un turno reservado con datos por defecto y fin 10:30', () => {
    const { deps } = nuevoEntorno();
    const r = crearTurno(deps, recepcion, entradaBase);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const t = r.valor;
    expect(t).toMatchObject({
      pacienteId: 'pac-01',
      prestacionId: 'prest-control',
      profesionalId: 'prof-1',
      sillonId: 'sillon-1',
      estado: 'reservado',
      senado: false,
      esSobreturno: false,
      origen: 'recepcion',
      creadoPor: 'u-recepcion',
    });
    expect(t.inicio).toEqual(en('10:00'));
    expect(t.fin).toEqual(en('10:30'));
    expect(t.creadoEn).toEqual(AHORA);
    expect(deps.turnos.buscarPorId(t.id)).toEqual(t);
  });

  it('dado el seed cuando se crean dos turnos validos entonces cada uno tiene un id distinto y respeta el origen enviado', () => {
    const { deps } = nuevoEntorno();
    const a = crearTurno(deps, recepcion, entradaBase);
    const b = crearTurno(deps, recepcion, {
      ...entradaBase,
      pacienteId: 'pac-02',
      inicio: en('10:30'),
      origen: 'whatsapp',
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.valor.id).not.toBe(b.valor.id);
    expect(b.valor.origen).toBe('whatsapp');
    expect(b.valor.fin).toEqual(en('11:00'));
  });
});

describe('crearTurno - permisos por rol', () => {
  it('dado un usuario odontologo cuando intenta crear un turno valido entonces devuelve tipo permiso y no guarda', () => {
    const { deps } = nuevoEntorno();
    const odonto: Usuario = { id: 'u-odonto-1', nombre: 'Dra. Ficticia Perez', rol: 'odontologo', profesionalId: 'prof-1' };
    const r = crearTurno(deps, odonto, entradaBase);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
    expect(deps.turnos.listarActivos()).toHaveLength(0);
  });

  it('dado un usuario ausente cuando intenta crear un turno valido entonces devuelve tipo permiso y no guarda', () => {
    const { deps } = nuevoEntorno();
    const r = crearTurno(deps, undefined, entradaBase);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
    expect(deps.turnos.listarActivos()).toHaveLength(0);
  });

  it('dado un usuario admin cuando crea un turno valido entonces el alta es exitosa', () => {
    const { deps } = nuevoEntorno();
    const admin: Usuario = { id: 'u-admin', nombre: 'Admin Ficticio', rol: 'admin' };
    expect(crearTurno(deps, admin, entradaBase).ok).toBe(true);
  });

  it('dado un usuario paciente cuando crea un turno valido entonces el alta es exitosa', () => {
    const { deps } = nuevoEntorno();
    const paciente: Usuario = { id: 'u-pac', nombre: 'Paciente Ficticio Uno', rol: 'paciente' };
    expect(crearTurno(deps, paciente, entradaBase).ok).toBe(true);
  });
});

describe('crearTurno - entidades inexistentes', () => {
  const casos: ReadonlyArray<[string, Partial<typeof entradaBase>, string]> = [
    ['paciente', { pacienteId: 'pac-inexistente' }, 'paciente'],
    ['prestacion', { prestacionId: 'prest-inexistente' }, 'prestación'],
    ['profesional', { profesionalId: 'prof-inexistente' }, 'profesional'],
    ['sillon', { sillonId: 'sillon-inexistente' }, 'sillón'],
  ];

  it.each(casos)(
    'dado el seed cuando se crea un turno con %s inexistente entonces devuelve tipo entrada con un mensaje que nombra la entidad y no guarda',
    (_nombre, cambio, palabra) => {
      const { deps } = nuevoEntorno();
      const r = crearTurno(deps, recepcion, { ...entradaBase, ...cambio });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.tipo).toBe('entrada');
        if (r.error.tipo === 'entrada') expect(r.error.mensaje.toLowerCase()).toContain(palabra);
      }
      expect(deps.turnos.listarActivos()).toHaveLength(0);
    },
  );
});

describe('crearTurno - integracion con repositorios reales (RN-AG-02, RN-AG-04, RN-AG-10)', () => {
  it('dado un turno de prof-1 en sillon-1 a las 10:00 cuando se crea otro de prof-2 en sillon-1 a las 10:00 entonces falla con RN-AG-02 dimension sillon y no guarda el segundo', () => {
    const { deps } = nuevoEntorno();
    const primero = crearTurno(deps, recepcion, entradaBase);
    if (!primero.ok) throw new Error('precondicion');
    const r = crearTurno(deps, recepcion, { ...entradaBase, pacienteId: 'pac-02', profesionalId: 'prof-2' });
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.tipo === 'regla') {
      expect(r.error.error.regla).toBe('RN-AG-02');
      expect(r.error.error.dimension).toBe('sillon');
      expect(r.error.error.conflicto).toEqual({ turnoId: primero.valor.id });
    } else {
      throw new Error('se esperaba un error de regla');
    }
    expect(deps.turnos.listarActivos()).toHaveLength(1);
  });

  it('dado un turno previo cancelado via actualizar cuando se crea otro en el mismo horario entonces el alta es exitosa', () => {
    const { deps } = nuevoEntorno();
    const primero = crearTurno(deps, recepcion, entradaBase);
    if (!primero.ok) throw new Error('precondicion');
    deps.turnos.actualizar({ ...primero.valor, estado: 'cancelado' });
    expect(crearTurno(deps, recepcion, entradaBase).ok).toBe(true);
  });

  it('dado el bloqueo global de urgencias del seed cuando se crea un control a las 18:30 entonces falla con RN-AG-04', () => {
    const { deps } = nuevoEntorno();
    const r = crearTurno(deps, recepcion, { ...entradaBase, inicio: en('18:30') });
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.tipo === 'regla') expect(r.error.error.regla).toBe('RN-AG-04');
    else throw new Error('se esperaba un error de regla');
  });

  it('dado el seed cuando se crea un control a las 18:00 contiguo al bloqueo entonces el alta es exitosa', () => {
    const { deps } = nuevoEntorno();
    const r = crearTurno(deps, recepcion, { ...entradaBase, inicio: en('18:00') });
    expect(r.ok).toBe(true);
  });
});

describe('crearTurno - auditoria (RN-AU-01)', () => {
  it('dado una auditoria vacia cuando u-recepcion crea un turno valido entonces registra un evento con usuario, rol, fecha del reloj, entidad turno y el id del turno', () => {
    const { deps, auditoria } = nuevoEntorno();
    const r = crearTurno(deps, recepcion, entradaBase);
    if (!r.ok) throw new Error('precondicion');
    const eventos = auditoria.eventos();
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      usuarioId: 'u-recepcion',
      rol: 'recepcion',
      accion: 'crear',
      entidad: 'turno',
      entidadId: r.valor.id,
    });
    expect(eventos[0]?.fecha).toEqual(AHORA);
  });

  it('dado una auditoria vacia cuando se intenta crear un turno con inicio 10:10 entonces la auditoria sigue vacia', () => {
    const { deps, auditoria } = nuevoEntorno();
    crearTurno(deps, recepcion, { ...entradaBase, inicio: en('10:10') });
    expect(auditoria.eventos()).toHaveLength(0);
  });

  it('dado una auditoria vacia cuando un odontologo intenta crear un turno entonces la auditoria sigue vacia', () => {
    const { deps, auditoria } = nuevoEntorno();
    crearTurno(deps, { id: 'u-odonto-1', nombre: 'Dra. Ficticia Perez', rol: 'odontologo' }, entradaBase);
    expect(auditoria.eventos()).toHaveLength(0);
  });
});
