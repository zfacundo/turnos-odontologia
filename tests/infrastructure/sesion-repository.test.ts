import { describe, expect, it } from 'vitest';
import { crearSesion } from '../../src/domain/auth/sesion';
import { SesionRepositoryEnMemoria } from '../../src/infrastructure/memory/sesion-repository';

const sesion = (token: string, usuarioId = 'u-admin') =>
  crearSesion(token, usuarioId, new Date('2026-12-01T09:00:00-03:00'));

describe('SesionRepositoryEnMemoria', () => {
  it('dado una sesion guardada cuando se busca por su token entonces la devuelve', () => {
    const repo = new SesionRepositoryEnMemoria();
    repo.guardar(sesion('tok-1'));
    expect(repo.buscar('tok-1')?.usuarioId).toBe('u-admin');
  });

  it('dado un token inexistente cuando se busca entonces devuelve undefined', () => {
    const repo = new SesionRepositoryEnMemoria();
    repo.guardar(sesion('tok-1'));
    expect(repo.buscar('otro')).toBeUndefined();
  });

  it('dado una sesion guardada cuando se elimina entonces ya no se encuentra y las demas siguen', () => {
    const repo = new SesionRepositoryEnMemoria();
    repo.guardar(sesion('tok-1'));
    repo.guardar(sesion('tok-2', 'u-recepcion'));
    repo.eliminar('tok-1');
    expect(repo.buscar('tok-1')).toBeUndefined();
    expect(repo.buscar('tok-2')?.usuarioId).toBe('u-recepcion');
  });

  it('dado una sesion devuelta cuando se la muta por fuera entonces el repositorio no cambia', () => {
    const repo = new SesionRepositoryEnMemoria();
    repo.guardar(sesion('tok-1'));
    const copia = repo.buscar('tok-1');
    (copia as { usuarioId: string }).usuarioId = 'hack';
    expect(repo.buscar('tok-1')?.usuarioId).toBe('u-admin');
  });
});
