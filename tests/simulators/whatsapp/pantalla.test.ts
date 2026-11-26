import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../../../src/api/app';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';

const AVISO = 'Simulación — no es WhatsApp real';
const PUBLIC = path.join(__dirname, '..', '..', '..', 'public');
const HTML = readFileSync(path.join(PUBLIC, 'bot.html'), 'utf8');
const JS = readFileSync(path.join(PUBLIC, 'js', 'bot.js'), 'utf8');
const app = () => createApp(cargarSeed(new RelojFijo(new Date('2026-11-30T09:00:00-03:00'))));

describe('pantalla /bot.html (RN-WA-04)', () => {
  it('dado el servidor cuando se pide /bot.html entonces responde 200 con el rotulo de simulacion, el selector de telefono y el boton de recordatorio', async () => {
    const res = await request(app()).get('/bot.html');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain(AVISO);
    expect(res.text).toMatch(/<select[^>]*id="telefono"/);
    expect(res.text).toMatch(/<button[^>]*>\s*Enviar recordatorio 24 h\s*<\/button>/);
  });

  it('dado el servidor cuando se pide /js/bot.js entonces responde 200', async () => {
    const res = await request(app()).get('/js/bot.js');
    expect(res.status).toBe(200);
  });

  it('dado el HTML cuando se revisan los telefonos entonces solo ofrece numeros ficticios', () => {
    const telefonos = [...HTML.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
    expect(telefonos.length).toBeGreaterThanOrEqual(2);
    for (const t of telefonos) expect(t).toMatch(/^\+54 9 11 0000-00\d{2}$/);
  });

  it('dado el chat cuando se revisa su accesibilidad entonces la lista de mensajes es aria-live polite', () => {
    expect(HTML).toMatch(/aria-live="polite"/);
  });

  it('dado el JS de la pantalla cuando se revisan sus llamadas entonces solo hace fetch a las rutas relativas del simulador', () => {
    const llamadas = [...JS.matchAll(/fetch\(\s*(['"`])([^'"`]+)\1/g)].map((m) => m[2]);
    expect(llamadas.length).toBeGreaterThan(0);
    for (const url of llamadas) expect(url).toMatch(/^\/api\/sim\/whatsapp\//);
  });

  it('dado el HTML y el JS cuando se buscan URLs absolutas entonces no hay ninguna a dominios externos', () => {
    for (const fuente of [HTML, JS]) {
      expect(fuente).not.toMatch(/https?:\/\//i);
      expect(fuente).not.toMatch(/(src|href)\s*=\s*['"]\/\//i);
    }
  });
});

describe('pantallas - seña pagada y pago simulado', () => {
  // spec: panel-reemplaza-agenda-vieja (la agenda vieja se retira; la marca vive en la agenda del panel)
  const AGENDA = readFileSync(path.join(PUBLIC, 'admin', 'js', 'agenda.js'), 'utf8');

  it('dado el JS de la agenda del panel cuando arma el bloque de un turno entonces muestra la marca de seña solo si senado es verdadero', () => {
    expect(AGENDA).toMatch(/t\.senado\s*\?\s*' · \$'\s*:\s*false/);
    expect(AGENDA).toMatch(/t\.senado\s*\?\s*h\('span',\s*\{\s*class:\s*'chip senado'\s*\},\s*'\$ Señado'\)\s*:\s*false/);
  });

  it('dado el JS del bot cuando pinta las opciones entonces Rechazar pago se ve como accion de alerta', () => {
    expect(JS).toMatch(/rechazar-pago/);
    expect(JS).toMatch(/rechazado \(simulación\)|falla simulada|No encontré el afiliado/);
  });
});

describe('pantalla /bot.html - navegacion secundaria', () => {
  it('dado el JS del bot cuando pinta las opciones entonces Volver atras y Volver al menu usan la clase chip nav', () => {
    expect(JS).toMatch(/var NAVEGACION = \['atras', 'menu'\];/);
    expect(JS).toMatch(/'chip nav'/);
  });

  it('dado el HTML del bot cuando se revisan los estilos entonces define .chip.nav con borde neutro y texto atenuado', () => {
    expect(HTML).toMatch(/\.chip\.nav\s*\{\s*border-color:\s*var\(--line\);\s*color:\s*var\(--muted\);\s*\}/);
  });
});
