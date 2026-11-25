import { describe, expect, it } from 'vitest';
import { cerrarSesion } from '../../../src/application/auth/cerrarSesion';
import { consultarSesion } from '../../../src/application/auth/consultarSesion';
import { iniciarSesion } from '../../../src/application/auth/iniciarSesion';
import type { GeneradorToken } from '../../../src/application/auth/puertos';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { AuditoriaEnMemoria } from '../../../src/infrastructure/memory/auditoria-en-memoria';
import { SesionRepositoryEnMemoria } from '../../../src/infrastructure/memory/sesion-repository';
import { USUARIOS } from '../../../src/infrastructure/seed/datos-seed';
import type { Usuario } from '../../../src/domain/shared/rol';

const LOGIN = new Date('2026-12-01T09:00:00-03:00');

/** Generador determinístico: tok-1, tok-2, ... */
class GeneradorSecuencial implements GeneradorToken {
  private n = 0;
  generar(): string {
    this.n += 1;
    return `tok-${this.n}`;
  }
}

const entorno = (ahora: Date = LOGIN, usuarios: readonly Usuario[] = USUARIOS) => {
  const sesiones = new SesionRepositoryEnMemoria();
  const auditoria = new AuditoriaEnMemoria();
  const deps = {
    usuarios,
    sesiones,
    generadorToken: new GeneradorSecuencial(),
    clock: new RelojFijo(ahora),
    auditoria,
  };
  return { deps, sesiones, auditoria };
};

describe('iniciarSesion', () => {
  it('dado u-recepcion cuando inicia sesion entonces devuelve token, expiraEn a 8 h y su usuario', () => {
    const { deps } = entorno();
    const r = iniciarSesion(deps, { usuarioId: 'u-recepcion' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.token).toBe('tok-1');
    expect(r.valor.usuario).toEqual({ id: 'u-recepcion', nombre: 'Recepcionista Ficticia', rol: 'recepcion' });
    expect(r.valor.expiraEn.toISOString()).toBe(new Date('2026-12-01T17:00:00-03:00').toISOString());
  });

  it('dado u-odonto-1 cuando inicia sesion entonces el usuario trae profesionalId prof-1', () => {
    const { deps } = entorno();
    const r = iniciarSesion(deps, { usuarioId: 'u-odonto-1' });
    expect(r.ok && r.valor.usuario.profesionalId).toBe('prof-1');
  });

  it('dado u-fantasma cuando inicia sesion entonces falla con autenticacion y no se crea sesion', () => {
    const { deps, sesiones } = entorno();
    const r = iniciarSesion(deps, { usuarioId: 'u-fantasma' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.tipo).toBe('autenticacion');
    expect(sesiones.buscar('tok-1')).toBeUndefined();
  });

  it('dado un usuario de rol paciente cuando inicia sesion entonces falla con el mismo mensaje que un usuario inexistente', () => {
    const paciente: Usuario = { id: 'u-paciente', nombre: 'Paciente Ficticio', rol: 'paciente' };
    const { deps } = entorno(LOGIN, [...USUARIOS, paciente]);
    const a = iniciarSesion(deps, { usuarioId: 'u-paciente' });
    const b = iniciarSesion(deps, { usuarioId: 'u-fantasma' });
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
    if (a.ok || b.ok) return;
    expect(a.error.tipo).toBe('autenticacion');
    expect(a.error.mensaje).toBe(b.error.mensaje);
  });

  it('dado un usuarioId numerico cuando inicia sesion entonces falla con entrada', () => {
    const { deps } = entorno();
    const r = iniciarSesion(deps, { usuarioId: 42 });
    expect(!r.ok && r.error.tipo).toBe('entrada');
  });

  it('dado un cuerpo que no es objeto o sin usuarioId cuando inicia sesion entonces falla con entrada', () => {
    const { deps } = entorno();
    for (const cuerpo of [undefined, null, 'u-admin', [], {}]) {
      const r = iniciarSesion(deps, cuerpo);
      expect(!r.ok && r.error.tipo).toBe('entrada');
    }
  });

  it('dado un cuerpo con password cuando inicia sesion entonces la ignora y el login depende solo del usuarioId', () => {
    const { deps } = entorno();
    const r = iniciarSesion(deps, { usuarioId: 'u-admin', password: 'x' });
    expect(r.ok).toBe(true);
  });

  it('dado u-admin cuando inicia sesion dos veces entonces los tokens son distintos y ambos validos', () => {
    const { deps } = entorno();
    const a = iniciarSesion(deps, { usuarioId: 'u-admin' });
    const b = iniciarSesion(deps, { usuarioId: 'u-admin' });
    expect(a.ok && b.ok && a.valor.token !== b.valor.token).toBe(true);
    expect(consultarSesion(deps, 'tok-1').ok).toBe(true);
    expect(consultarSesion(deps, 'tok-2').ok).toBe(true);
  });

  it('dado u-admin cuando inicia sesion entonces la auditoria tiene un evento login sin el token en ningun campo', () => {
    const { deps, auditoria } = entorno();
    iniciarSesion(deps, { usuarioId: 'u-admin' });
    const eventos = auditoria.eventos();
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({ accion: 'login', entidad: 'sesion', entidadId: 'u-admin', rol: 'admin' });
    expect(JSON.stringify(eventos)).not.toContain('tok-1');
  });

  it('dado un login fallido cuando se revisa la auditoria entonces no hay eventos', () => {
    const { deps, auditoria } = entorno();
    iniciarSesion(deps, { usuarioId: 'u-fantasma' });
    expect(auditoria.eventos()).toHaveLength(0);
  });
});

describe('consultarSesion', () => {
  const conLogin = (ahora: Date) => {
    const e = entorno(LOGIN);
    iniciarSesion(e.deps, { usuarioId: 'u-admin' });
    return { ...e, deps: { ...e.deps, clock: new RelojFijo(ahora) } };
  };

  it('dado un login a las 09:00 cuando el reloj marca 16:59 entonces la sesion es valida', () => {
    const { deps } = conLogin(new Date('2026-12-01T16:59:00-03:00'));
    const r = consultarSesion(deps, 'tok-1');
    expect(r.ok && r.valor.usuario.id).toBe('u-admin');
  });

  it('dado un login a las 09:00 cuando el reloj marca 17:00 entonces falla con autenticacion', () => {
    const { deps } = conLogin(new Date('2026-12-01T17:00:00-03:00'));
    const r = consultarSesion(deps, 'tok-1');
    expect(!r.ok && r.error.tipo).toBe('autenticacion');
  });

  it('dado un token inexistente o ausente cuando se consulta entonces falla con autenticacion', () => {
    const { deps } = entorno();
    for (const token of ['no-existe', undefined]) {
      const r = consultarSesion(deps, token);
      expect(!r.ok && r.error.tipo).toBe('autenticacion');
    }
  });

  it('dado un token vencido y uno inexistente cuando se consultan entonces el mensaje es identico', () => {
    const { deps } = conLogin(new Date('2026-12-02T09:00:00-03:00'));
    const vencido = consultarSesion(deps, 'tok-1');
    const inexistente = consultarSesion(deps, 'zzz');
    expect(vencido.ok).toBe(false);
    expect(inexistente.ok).toBe(false);
    if (vencido.ok || inexistente.ok) return;
    expect(vencido.error.mensaje).toBe(inexistente.error.mensaje);
  });
});

describe('cerrarSesion', () => {
  it('dado un token valido cuando se cierra la sesion entonces el token deja de servir', () => {
    const { deps } = entorno();
    iniciarSesion(deps, { usuarioId: 'u-admin' });
    expect(cerrarSesion(deps, 'tok-1').ok).toBe(true);
    const r = consultarSesion(deps, 'tok-1');
    expect(!r.ok && r.error.tipo).toBe('autenticacion');
  });

  it('dado un token inexistente cuando se cierra la sesion entonces falla con autenticacion', () => {
    const { deps } = entorno();
    const r = cerrarSesion(deps, 'token-inexistente');
    expect(!r.ok && r.error.tipo).toBe('autenticacion');
  });

  it('dado un logout cuando se revisa la auditoria entonces hay login y logout sin el token', () => {
    const { deps, auditoria } = entorno();
    iniciarSesion(deps, { usuarioId: 'u-odonto-1' });
    cerrarSesion(deps, 'tok-1');
    const eventos = auditoria.eventos();
    expect(eventos.map((e) => e.accion)).toEqual(['login', 'logout']);
    expect(eventos[1]).toMatchObject({ entidad: 'sesion', entidadId: 'u-odonto-1', rol: 'odontologo' });
    expect(JSON.stringify(eventos)).not.toContain('tok-1');
  });

  it('dado un logout con token inexistente cuando se revisa la auditoria entonces no se registra logout', () => {
    const { deps, auditoria } = entorno();
    cerrarSesion(deps, 'nada');
    expect(auditoria.eventos()).toHaveLength(0);
  });
});
