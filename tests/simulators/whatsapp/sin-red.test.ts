import { describe, it, expect, vi, afterEach } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { procesar } from '../../../src/simulators/whatsapp/bot';
import { nuevaSesion, type Entrada, type Sesion } from '../../../src/simulators/whatsapp/conversacion';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';

const DIR_SIMULADOR = path.join(__dirname, '..', '..', '..', 'src', 'simulators', 'whatsapp');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('simulador de WhatsApp sin red (RN-SM-04)', () => {
  it('dado el codigo fuente del simulador cuando se revisa entonces no usa fetch ni importa http, https, net, tls ni dgram', () => {
    const fuentes = readdirSync(DIR_SIMULADOR).filter((f) => f.endsWith('.ts'));
    expect(fuentes.length).toBeGreaterThanOrEqual(3);
    for (const archivo of fuentes) {
      const codigo = readFileSync(path.join(DIR_SIMULADOR, archivo), 'utf8');
      expect(codigo, archivo).not.toMatch(/\bfetch\s*\(/);
      expect(codigo, archivo).not.toMatch(/from\s+['"](node:)?(http|https|net|tls|dgram)['"]/);
      expect(codigo, archivo).not.toMatch(/require\(\s*['"](node:)?(http|https|net|tls|dgram)['"]/);
    }
  });

  it('dado un detector de red cuando un paciente reserva por el bot entonces no hubo ninguna llamada de red', () => {
    const fallar = (): never => {
      throw new Error('El simulador intento usar la red');
    };
    const detectores = [
      vi.spyOn(globalThis, 'fetch').mockImplementation(fallar),
      vi.spyOn(http, 'request').mockImplementation(fallar),
      vi.spyOn(https, 'request').mockImplementation(fallar),
      vi.spyOn(net, 'connect').mockImplementation(fallar),
      vi.spyOn(net.Socket.prototype, 'connect').mockImplementation(fallar),
    ];
    const deps = cargarSeed(new RelojFijo(new Date('2026-11-30T09:00:00-03:00')));
    const tel = '+54 9 11 0000-0001';
    let sesion: Sesion = nuevaSesion();
    let r = procesar(deps, tel, sesion, { tipo: 'texto', texto: 'hola' });
    for (const etiqueta of ['Pedir un turno', 'Control y limpieza', 'Dra. Ficticia Perez', 'Lun 30/11 09:00']) {
      sesion = r.sesion;
      const o = r.respuesta.opciones.find((x) => x.etiqueta === etiqueta);
      const entrada: Entrada = { tipo: 'opcion', id: o?.id ?? '' };
      r = procesar(deps, tel, sesion, entrada);
    }
    expect(r.respuesta.mensajes.some((m) => m.tarjeta?.titulo === 'Turno reservado')).toBe(true);
    for (const detector of detectores) expect(detector).not.toHaveBeenCalled();
  });
});
