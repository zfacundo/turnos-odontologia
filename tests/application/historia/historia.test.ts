import { describe, expect, it } from 'vitest';
import { listarHistoria } from '../../../src/application/historia/listarHistoria';
import { registrarEntrada } from '../../../src/application/historia/registrarEntrada';
import { crearTurno } from '../../../src/application/agenda/crearTurno';
import type { Usuario } from '../../../src/domain/shared/rol';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { AuditoriaEnMemoria } from '../../../src/infrastructure/memory/auditoria-en-memoria';
import { HistoriaRepositoryEnMemoria } from '../../../src/infrastructure/memory/historia-repository';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';

const AHORA = new Date('2026-12-01T10:00:00-03:00');
const NOTAS = 'Sin hallazgos (dato ficticio)';

const admin: Usuario = { id: 'u-admin', nombre: 'Admin Ficticio', rol: 'admin' };
const recepcion: Usuario = { id: 'u-recepcion', nombre: 'Recepcionista Ficticia', rol: 'recepcion' };
const odonto1: Usuario = { id: 'u-odonto-1', nombre: 'Dra. Ficticia Perez', rol: 'odontologo', profesionalId: 'prof-1' };
const paciente: Usuario = { id: 'pac-usuario', nombre: 'Paciente Ficticio', rol: 'paciente' };

const VALIDA = { fecha: '2026-12-01T09:00:00-03:00', procedimiento: 'Control y limpieza', notas: NOTAS };

const entorno = () => {
  const base = cargarSeed(new RelojFijo(AHORA));
  const historia = new HistoriaRepositoryEnMemoria();
  const deps = { ...base, historia };
  return { deps, historia, auditoria: base.auditoria as AuditoriaEnMemoria };
};

describe('registrarEntrada - permisos', () => {
  it('dado un odontologo cuando da de alta una entrada valida entonces se crea con su profesionalId, creadoPor y simulado', () => {
    const { deps, historia } = entorno();
    const r = registrarEntrada(deps, odonto1, 'pac-01', VALIDA);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor).toMatchObject({
      pacienteId: 'pac-01',
      profesionalId: 'prof-1',
      profesionalNombre: 'Dra. Ficticia Perez',
      creadoPor: 'u-odonto-1',
      simulado: true,
      procedimiento: 'Control y limpieza',
    });
    expect(historia.listarPorPaciente('pac-01')).toHaveLength(1);
  });

  it('dado admin, recepcion, paciente o sin usuario cuando intenta el alta entonces falla con permiso y no se crea nada', () => {
    const { deps, historia } = entorno();
    for (const u of [admin, recepcion, paciente, undefined]) {
      const r = registrarEntrada(deps, u, 'pac-01', VALIDA);
      expect(!r.ok && r.error.tipo).toBe('permiso');
    }
    expect(historia.listarPorPaciente('pac-01')).toHaveLength(0);
  });

  it('dado un profesionalId distinto en el cuerpo cuando el odontologo da de alta entonces se ignora', () => {
    const { deps } = entorno();
    const r = registrarEntrada(deps, odonto1, 'pac-01', { ...VALIDA, profesionalId: 'prof-2' });
    expect(r.ok && r.valor.profesionalId).toBe('prof-1');
  });

  it('dado un odontologo sin profesionalId cuando intenta el alta entonces falla con permiso', () => {
    const { deps } = entorno();
    const sinProf: Usuario = { id: 'x', nombre: 'x', rol: 'odontologo' };
    const r = registrarEntrada(deps, sinProf, 'pac-01', VALIDA);
    expect(!r.ok && r.error.tipo).toBe('permiso');
  });
});

describe('registrarEntrada - validaciones', () => {
  it('dado un paciente inexistente cuando se da de alta entonces falla con no-encontrado', () => {
    const { deps } = entorno();
    const r = registrarEntrada(deps, odonto1, 'pac-999', VALIDA);
    expect(!r.ok && r.error.tipo).toBe('no-encontrado');
  });

  it('dado un procedimiento vacio cuando se da de alta entonces falla con entrada', () => {
    const { deps } = entorno();
    const r = registrarEntrada(deps, odonto1, 'pac-01', { ...VALIDA, procedimiento: '' });
    expect(!r.ok && r.error.tipo).toBe('entrada');
  });

  it('dado una fecha futura cuando se da de alta entonces falla con la regla RN-HC-02', () => {
    const { deps } = entorno();
    const r = registrarEntrada(deps, odonto1, 'pac-01', { ...VALIDA, fecha: '2026-12-02T10:00:00-03:00' });
    expect(!r.ok && r.error.tipo === 'regla' && r.error.error.regla).toBe('RN-HC-02');
  });

  it('dado una fecha igual al reloj cuando se da de alta entonces se crea', () => {
    const { deps } = entorno();
    const r = registrarEntrada(deps, odonto1, 'pac-01', { ...VALIDA, fecha: '2026-12-01T10:00:00-03:00' });
    expect(r.ok).toBe(true);
  });

  it('dado un turno de otro paciente cuando se da de alta para pac-01 entonces falla con RN-HC-01', () => {
    const { deps } = entorno();
    const t = crearTurno(deps, recepcion, {
      pacienteId: 'pac-02',
      prestacionId: 'prest-control',
      profesionalId: 'prof-1',
      sillonId: 'sillon-1',
      inicio: new Date('2026-12-02T10:00:00-03:00'),
    });
    if (!t.ok) throw new Error('no se pudo crear el turno');
    const r = registrarEntrada(deps, odonto1, 'pac-01', { ...VALIDA, turnoId: t.valor.id });
    expect(!r.ok && r.error.tipo === 'regla' && r.error.error.regla).toBe('RN-HC-01');
  });

  it('dado un turno inexistente cuando se da de alta entonces falla con RN-HC-01', () => {
    const { deps } = entorno();
    const r = registrarEntrada(deps, odonto1, 'pac-01', { ...VALIDA, turnoId: 't-no-existe' });
    expect(!r.ok && r.error.tipo === 'regla' && r.error.error.regla).toBe('RN-HC-01');
  });

  it('dado un turno del mismo paciente cuando se da de alta entonces se crea con turnoId', () => {
    const { deps } = entorno();
    const t = crearTurno(deps, recepcion, {
      pacienteId: 'pac-01',
      prestacionId: 'prest-control',
      profesionalId: 'prof-1',
      sillonId: 'sillon-1',
      inicio: new Date('2026-12-02T10:00:00-03:00'),
    });
    if (!t.ok) throw new Error('no se pudo crear el turno');
    const r = registrarEntrada(deps, odonto1, 'pac-01', { ...VALIDA, turnoId: t.valor.id });
    expect(r.ok && r.valor.turnoId).toBe(t.valor.id);
  });
});

describe('listarHistoria', () => {
  it('dado admin y odontologo cuando listan el historial entonces lo ven con las entradas ordenadas por fecha descendente', () => {
    const { deps } = entorno();
    registrarEntrada(deps, odonto1, 'pac-01', { ...VALIDA, fecha: '2026-10-01T10:00:00-03:00' });
    registrarEntrada(deps, odonto1, 'pac-01', { ...VALIDA, fecha: '2026-11-15T10:00:00-03:00' });
    for (const u of [admin, odonto1]) {
      const r = listarHistoria(deps, u, 'pac-01');
      expect(r.ok && r.valor.map((e) => e.fecha.toISOString())).toEqual([
        new Date('2026-11-15T10:00:00-03:00').toISOString(),
        new Date('2026-10-01T10:00:00-03:00').toISOString(),
      ]);
    }
  });

  it('dado recepcion, paciente o sin usuario cuando listan entonces falla con permiso', () => {
    const { deps } = entorno();
    for (const u of [recepcion, paciente, undefined]) {
      const r = listarHistoria(deps, u, 'pac-01');
      expect(!r.ok && r.error.tipo).toBe('permiso');
    }
  });

  it('dado un paciente inexistente cuando admin lista entonces falla con no-encontrado', () => {
    const { deps } = entorno();
    const r = listarHistoria(deps, admin, 'pac-999');
    expect(!r.ok && r.error.tipo).toBe('no-encontrado');
  });

  it('dado un paciente sin entradas cuando odontologo lista entonces devuelve lista vacia', () => {
    const { deps } = entorno();
    const r = listarHistoria(deps, odonto1, 'pac-02');
    expect(r.ok && r.valor).toEqual([]);
  });
});

describe('auditoria del historial', () => {
  it('dado un alta con notas cuando se revisa la auditoria entonces hay historia-crear con entidadId pac-01 y sin procedimiento ni notas', () => {
    const { deps, auditoria } = entorno();
    registrarEntrada(deps, odonto1, 'pac-01', VALIDA);
    const eventos = auditoria.eventos().filter((e) => e.accion === 'historia-crear');
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({ entidad: 'paciente', entidadId: 'pac-01', usuarioId: 'u-odonto-1', rol: 'odontologo' });
    const texto = JSON.stringify(eventos);
    expect(texto).not.toContain(NOTAS);
    expect(texto).not.toContain('Control y limpieza');
  });

  it('dado una consulta exitosa cuando se revisa la auditoria entonces hay historia-consultar sin contenido clinico', () => {
    const { deps, auditoria } = entorno();
    registrarEntrada(deps, odonto1, 'pac-01', VALIDA);
    listarHistoria(deps, admin, 'pac-01');
    const eventos = auditoria.eventos().filter((e) => e.accion === 'historia-consultar');
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({ entidad: 'paciente', entidadId: 'pac-01', usuarioId: 'u-admin', rol: 'admin' });
    expect(JSON.stringify(eventos)).not.toContain(NOTAS);
  });

  it('dado una consulta rechazada de recepcion cuando se revisa la auditoria entonces no hay historia-consultar', () => {
    const { deps, auditoria } = entorno();
    listarHistoria(deps, recepcion, 'pac-01');
    expect(auditoria.eventos().filter((e) => e.accion === 'historia-consultar')).toHaveLength(0);
  });

  it('dado un alta rechazada por permiso cuando se revisa la auditoria entonces no hay historia-crear', () => {
    const { deps, auditoria } = entorno();
    registrarEntrada(deps, admin, 'pac-01', VALIDA);
    expect(auditoria.eventos().filter((e) => e.accion === 'historia-crear')).toHaveLength(0);
  });
});
