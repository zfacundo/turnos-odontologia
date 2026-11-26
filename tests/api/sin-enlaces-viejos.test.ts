import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

// spec: panel-reemplaza-agenda-vieja (Retiro de la agenda anterior)
const PUBLIC = path.join(__dirname, '..', '..', 'public');

function paginasHtml(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = path.join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return paginasHtml(ruta);
    return nombre.endsWith('.html') ? [ruta] : [];
  });
}

const paginas = paginasHtml(PUBLIC).map((ruta) => ({
  nombre: path.relative(PUBLIC, ruta).split(path.sep).join('/'),
  texto: readFileSync(ruta, 'utf8'),
}));

const hrefsDe = (texto: string): string[] => [...texto.matchAll(/href\s*=\s*["']([^"']*)["']/g)].map((m) => m[1] as string);

describe('sin enlaces a la agenda vieja', () => {
  it('dado todas las paginas HTML de public cuando se revisan sus href entonces ninguno es / ni /index.html', () => {
    expect(paginas.length).toBeGreaterThan(3);
    for (const { nombre, texto } of paginas) {
      const prohibidos = hrefsDe(texto).filter((h) => h === '/' || h === '/index.html');
      expect(prohibidos, nombre).toEqual([]);
    }
  });

  it('dado todas las paginas HTML de public cuando se revisan sus href entonces ninguno apunta a odontograma.html', () => {
    for (const { nombre, texto } of paginas) {
      const prohibidos = hrefsDe(texto).filter((h) => /(^|\/)odontograma\.html/.test(h));
      expect(prohibidos, nombre).toEqual([]);
    }
  });

  // bot.html ya no tiene enlace "Agenda" (change bot-whatsapp-sin-enlace-agenda); lo cubre pantalla.test.ts.
  it('dado la pantalla de ARCA cuando se revisa su navegacion entonces "Agenda" apunta al panel', () => {
    for (const nombre of ['sim/arca.html']) {
      const pagina = paginas.find((p) => p.nombre === nombre);
      expect(pagina, nombre).toBeDefined();
      expect(hrefsDe(pagina?.texto ?? ''), nombre).toContain('/admin/#/agenda');
    }
  });

  it('dado la carpeta public cuando se listan sus archivos entonces ya no existen la agenda ni el odontograma sueltos', () => {
    const existe = (rel: string) => {
      try {
        statSync(path.join(PUBLIC, rel));
        return true;
      } catch {
        return false;
      }
    };
    for (const rel of ['index.html', 'js/agenda.js', 'odontograma.html', 'js/odontograma.js']) {
      expect(existe(rel), rel).toBe(false);
    }
  });
});
