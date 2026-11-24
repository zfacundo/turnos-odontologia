import { describe, it, expect, vi, afterEach } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import type { Turno } from '../../../src/domain/agenda/turno';
import type { Usuario } from '../../../src/domain/shared/rol';
import { TurnoRepositoryEnMemoria } from '../../../src/infrastructure/memory/turno-repository';
import { AuditoriaEnMemoria } from '../../../src/infrastructure/memory/auditoria-en-memoria';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { PagoSenaRepositoryEnMemoria } from '../../../src/simulators/mercadopago/pagoSenaRepository';
import { pagarSena } from '../../../src/simulators/mercadopago/pagarSena';

const RAIZ = path.join(__dirname, '..', '..', '..');
const DIR_SIMULADOR = path.join(RAIZ, 'src', 'simulators', 'mercadopago');
const PACIENTE: Usuario = { id: 'pac-usuario', nombre: 'pac-usuario', rol: 'paciente' };

const turno = (id: string): Turno => ({
  id,
  pacienteId: 'pac-01',
  prestacionId: 'prest-control',
  profesionalId: 'prof-1',
  sillonId: 'sillon-1',
  inicio: new Date('2026-12-01T10:00:00-03:00'),
  fin: new Date('2026-12-01T10:30:00-03:00'),
  estado: 'reservado',
  senado: false,
  esSobreturno: false,
  origen: 'recepcion',
  creadoPor: 'u-recepcion',
  creadoEn: new Date('2026-11-29T12:00:00-03:00'),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('simulador de Mercado Pago sin red (RN-SM-04)', () => {
  it('dado un detector de red cuando el paciente paga aprobado un turno y rechazado otro entonces no hubo ninguna llamada de red', () => {
    const fallar = (): never => {
      throw new Error('El simulador intento usar la red');
    };
    const detectores = [
      vi.spyOn(globalThis, 'fetch').mockImplementation(fallar),
      vi.spyOn(http, 'request').mockImplementation(fallar),
      vi.spyOn(http, 'get').mockImplementation(fallar),
      vi.spyOn(https, 'request').mockImplementation(fallar),
      vi.spyOn(https, 'get').mockImplementation(fallar),
      vi.spyOn(net, 'connect').mockImplementation(fallar),
      vi.spyOn(net, 'createConnection').mockImplementation(fallar),
      vi.spyOn(net.Socket.prototype, 'connect').mockImplementation(fallar),
    ];

    const turnos = new TurnoRepositoryEnMemoria<Turno>();
    turnos.guardar(turno('turno-T'));
    turnos.guardar(turno('turno-U'));
    const deps = {
      turnos,
      pagos: new PagoSenaRepositoryEnMemoria(),
      auditoria: new AuditoriaEnMemoria(),
      clock: new RelojFijo(new Date('2026-11-30T09:00:00-03:00')),
    };

    const aprobado = pagarSena(deps, PACIENTE, { turnoId: 'turno-T', resultado: 'aprobado' });
    const rechazado = pagarSena(deps, PACIENTE, { turnoId: 'turno-U', resultado: 'rechazado' });

    expect(aprobado.ok).toBe(true);
    expect(rechazado.ok).toBe(true);
    for (const detector of detectores) expect(detector).not.toHaveBeenCalled();
  });

  it('dado el codigo fuente del simulador cuando se revisa entonces no usa fetch ni importa clientes de red ni SDKs de Mercado Pago', () => {
    const fuentes = readdirSync(DIR_SIMULADOR).filter((f) => f.endsWith('.ts'));
    expect(fuentes.length).toBeGreaterThan(0);
    for (const archivo of fuentes) {
      const codigo = readFileSync(path.join(DIR_SIMULADOR, archivo), 'utf8');
      expect(codigo, archivo).not.toMatch(/\bfetch\s*\(/);
      expect(codigo, archivo).not.toMatch(/from\s+['"](node:)?(http|https|net|tls|dgram)['"]/);
      expect(codigo, archivo).not.toMatch(/require\(\s*['"](node:)?(http|https|net|tls|dgram)['"]/);
      expect(codigo, archivo).not.toMatch(/from\s+['"](axios|node-fetch|undici|mercadopago)['"]/i);
      expect(codigo, archivo).not.toMatch(/https?:\/\//i);
    }
  });

  it('dado la pantalla del simulador cuando se revisa entonces no contiene URLs absolutas', () => {
    const html = readFileSync(path.join(RAIZ, 'public', 'sim', 'mercadopago.html'), 'utf8');
    expect(html).not.toMatch(/https?:\/\//i);
  });
});
