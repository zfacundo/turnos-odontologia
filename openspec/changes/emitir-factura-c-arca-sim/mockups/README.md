# Mockups — C-12 `emitir-factura-c-arca-sim`

- Design system revision: 1 (`design-system/`, aprobado el 2026-11-25)
- Approval: approved (2026-11-25, by user)
- Preview: rendered (2026-11-25, Playwright, tema claro, 390 y 1440 de ancho, página completa)

## Pantallas y estados

| Mockup | Pantalla | Estados que muestra |
|---|---|---|
| `arca-comprobante.html` | `public/sim/arca.html?turnoId=…` | Principal: la factura ya emitida, con el panel del turno y el comprobante. Estados de referencia: antes de emitir, turno ya facturado (409), turno no atendido (409 SU-07) y sin `turnoId` |

- **Layout**: en escritorio, el panel del turno va a la izquierda y el comprobante a la derecha. En mobile se apilan, con el panel arriba. Los "Otros estados" son referencia: la pantalla real muestra uno solo.
- **Impresión** (`@media print` en `arca.css`): se imprime solo el comprobante, con su franja "SIMULACIÓN — sin validez fiscal" y la marca de agua.
- **Datos**: todos son ficticios y coinciden con los escenarios del spec (`pac-01`, número `00001-00000001`, CAE `26120101000001`, emisión 01/12/2026 y vencimiento 11/12/2026). El importe `$ 25.000,00` es la constante ficticia propuesta en design D5.

## Fuentes

- `design-system/tokens.css`, `brand.js` y `assets/logo.svg` (revisión 1). La franja de simulación, la tarjeta, los botones y los avisos salen de `components.html`.
- `openspec/changes/emitir-factura-c-arca-sim/specs/factura-c-simulada/spec.md` y `design.md` (D3–D6, D10).
- (TBD) heredados del design system: el logo y el nombre del producto.

## Cómo verlos

Desde la raíz del repo, servir la carpeta con cualquier servidor estático local, por ejemplo `npx http-server -p 8765` o `python -m http.server 8765` si Python está instalado. Después abrir `http://localhost:8765/openspec/changes/emitir-factura-c-arca-sim/mockups/arca-comprobante.html`. Las capturas están en `previews/`.
