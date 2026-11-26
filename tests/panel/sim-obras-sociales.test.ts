import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const html = readFileSync(path.join(__dirname, '..', '..', 'public', 'sim', 'obras-sociales.html'), 'utf8');

describe('pantalla simulada de cobertura', () => {
  it('dado el padrón compartido cuando se carga entonces muestra todos los afiliados registrados', () => {
    expect(html).toContain('/api/sim/obras-sociales/padron');
    expect(html).toContain('padron.afiliados.forEach');
  });

  it('dado AF-0004 cuando falla entonces muestra el código de la regla simulada', () => {
    expect(html).toContain('error.regla');
    expect(html).toContain('SIMULACIÓN');
  });

  it('dado el pie de la pantalla cuando se navega entonces hay accesos a Clientes, Configuración y bot', () => {
    expect(html).toContain('/admin/#/clientes');
    expect(html).toContain('/admin/#/configuracion');
    expect(html).toContain('/bot.html');
  });
});
