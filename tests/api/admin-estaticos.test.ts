import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createApp } from '../../src/api/app';
import { RelojFijo } from '../../src/infrastructure/clock/clock';
import { crearDepsVacias } from '../../src/infrastructure/seed/deps-vacias';

const app = () => createApp(crearDepsVacias(new RelojFijo(new Date('2026-12-01T10:00:00-03:00'))));
const RAIZ = path.join(__dirname, '..', '..');

describe('estaticos del panel', () => {
  it('dado la API cuando se pide /admin/brand.js entonces sirve design-system/brand.js sin copiarlo', async () => {
    const res = await request(app()).get('/admin/brand.js');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/javascript/);
    expect(res.text).toBe(readFileSync(path.join(RAIZ, 'design-system', 'brand.js'), 'utf8'));
    expect(res.text).toContain('BRAND_NAME');
  });

  it('dado la API cuando se pide /admin/logo.svg entonces sirve el logo del design system', async () => {
    const res = await request(app()).get('/admin/logo.svg');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/svg/);
  });

  it('dado la API cuando se pide /admin/ entonces sirve el index del panel', async () => {
    const res = await request(app()).get('/admin/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  it('dado la API cuando se pide /admin/admin.css entonces sirve la hoja propia del panel', async () => {
    const res = await request(app()).get('/admin/admin.css');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/css/);
  });

  // spec: panel-reemplaza-agenda-vieja
  it('dado la API cuando se pide / entonces redirige 302 al panel', async () => {
    const res = await request(app()).get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin/');
  });

  it('dado la API cuando se pide /index.html entonces redirige 302 al panel', async () => {
    const res = await request(app()).get('/index.html');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin/');
  });

  it('dado la API cuando se pide /odontograma.html entonces redirige 302 a la agenda del panel', async () => {
    const res = await request(app()).get('/odontograma.html');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin/#/agenda');
  });

  it('dado la API cuando se piden las hojas y paginas que quedan entonces siguen sirviendose con 200', async () => {
    const rutas = ['/bot.html', '/sim/mercadopago.html', '/sim/obras-sociales.html', '/sim/arca.html', '/styles/tokens.css'];
    const estados: number[] = [];
    for (const ruta of rutas) estados.push((await request(app()).get(ruta)).status);
    expect(estados).toEqual([200, 200, 200, 200, 200]);
  });
});
