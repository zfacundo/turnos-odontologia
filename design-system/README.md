# Design system — Turnos Odontología

- Mode: system-and-mockups
- Revision: 1
- Approval: approved (2026-11-25, by user)
- Decisión de la política: Integrante 2, 2026-11-25, al empezar C-06 (primer cambio visual sin política registrada).

## Propósito

Una base visual compartida para las pantallas y los mockups del proyecto. Con la política `system-and-mockups`, cada cambio visual (una pantalla, un componente o un estilo nuevo o modificado) necesita un mockup HTML aprobado en `openspec/changes/<change>/mockups/` antes de implementarse.

## Fuentes

- `public/styles/tokens.css` (C-01): paleta, colores por prestación, colores del chat, modo oscuro y familias tipográficas. Esta revisión **conserva todos sus valores**.
- `docs/discovery/prototipo/agenda_odontologia.html`: burbujas del chat, chips de opciones, tarjeta "Turno reservado" y grilla de agenda.
- `public/sim/mercadopago.html` (C-11): franja de simulación, tarjeta (radio de 14px), botones (44px de alto, radio de 10px) y foco de 3px.

## Archivos

| Archivo | Contenido |
|---|---|
| `tokens.css` | Variables CSS: color, tipografía, espaciado, radios, sombras, foco y movimiento (incluye `prefers-reduced-motion`) |
| `brand.md` | Nombre, tono, logo, imágenes y reglas de uso |
| `brand.js` | Constante `BRAND_NAME` y enlace a `[data-brand-name]` para las vistas locales |
| `components.html` | Componentes de referencia y sus estados |
| `assets/logo.svg` | Logo **provisional** |
| `previews/` | Capturas de `components.html` en 390×844 y 1440×900 |

## Decisiones abiertas (TBD)

- Logo definitivo del producto.
- Nombre del consultorio que se muestra en el bot.
- Hosting de las fuentes: `public/styles/tokens.css` carga Bricolage Grotesque y DM Sans desde Google Fonts. Este design system no depende de fuentes remotas y cae en Arial Black o Helvetica/Arial cuando no están instaladas.

## Cómo reemplazar lo provisional

1. **Nombre visible**: editar `BRAND_NAME` en `design-system/brand.js`. Todo `[data-brand-name]` de las vistas locales se actualiza solo.
2. **Logo**: reemplazar `design-system/assets/logo.svg` por el definitivo, manteniendo el nombre y la ruta.
3. **Valores visuales**: editar el token en `design-system/tokens.css` y el valor equivalente en `public/styles/tokens.css`, que es lo que usa la app.
4. Todo cambio en un token o asset compartido **aumenta `Revision:`**, vuelve `Approval:` a `pending` y obliga a volver a revisar los mockups afectados.

## Vista previa

Abrir `design-system/components.html` en el navegador. Algunos visores bloquean los archivos relacionados cuando se abre como `file://`; en ese caso, servir la carpeta con `python -m http.server 8765 --directory design-system` y abrir `http://127.0.0.1:8765/components.html`.

Capturas renderizadas e inspeccionadas el 2026-11-25 (Edge headless, tema claro, y una en oscuro) en `design-system/previews/`:
- `components-390x844.png` y `components-390-pagina-completa.png` (mobile)
- `components-1440x900.png` y `components-1440-pagina-completa.png` (escritorio)
- `components-1440-oscuro.png` (modo oscuro)
