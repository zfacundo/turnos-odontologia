import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../../../src/api/app';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';

const AVISO = 'SIMULACIÓN — no es Mercado Pago real';
const HTML = readFileSync(path.join(__dirname, '..', '..', '..', 'public', 'sim', 'mercadopago.html'), 'utf8');

describe('pantalla /sim/mercadopago.html', () => {
  it('dado el servidor cuando se pide la pantalla entonces responde 200 con el rotulo de simulacion y los botones Aprobar y Rechazar', async () => {
    const app = createApp(cargarSeed(new RelojFijo(new Date('2026-11-30T09:00:00-03:00'))));
    const res = await request(app).get('/sim/mercadopago.html');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain(AVISO);
    expect(res.text).toMatch(/<button[^>]*>\s*Aprobar\s*<\/button>/);
    expect(res.text).toMatch(/<button[^>]*>\s*Rechazar\s*<\/button>/);
  });

  it('dado el HTML de la pantalla cuando se revisan sus llamadas entonces solo hace fetch a la ruta relativa del simulador', () => {
    const llamadas = [...HTML.matchAll(/fetch\(\s*(['"`])([^'"`]+)\1/g)].map((m) => m[2]);
    expect(llamadas).toEqual(['/api/sim/mercadopago/pagos']);
    expect(HTML).not.toMatch(/fetch\(\s*[^'"`]/);
  });

  it('dado el HTML de la pantalla cuando se revisa el pedido entonces se envia con el rol paciente', () => {
    expect(HTML).toMatch(/['"]X-Rol['"]\s*:\s*['"]paciente['"]/);
  });

  it('dado el HTML de la pantalla cuando se revisa el pedido entonces toma el turnoId de la URL', () => {
    expect(HTML).toMatch(/new URLSearchParams\(\s*(window\.)?location\.search\s*\)/);
    expect(HTML).toMatch(/\.get\(\s*['"]turnoId['"]\s*\)/);
  });

  it('dado el HTML de la pantalla cuando se buscan URLs absolutas entonces no hay ninguna a dominios externos', () => {
    expect(HTML).not.toMatch(/https?:\/\//i);
    expect(HTML).not.toMatch(/(src|href)\s*=\s*['"]\/\//i);
  });
});
