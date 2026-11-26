# Mockups — `panel-tema-oscuro`

- Design system revision: 1 (`design-system/`, aprobado el 2026-11-25). **No se modifica**: `design-system/tokens.css` y `public/styles/tokens.css` quedan intactos; el tema oscuro son tokens `--adm-*` del panel.
- Approval: **approved (2026-11-26, by user)**, con el look grafito neutro. Desbloquea los grupos 3 a 6 de `tasks.md`. Las 4 preguntas abiertas de `design.md` se resuelven con sus valores por defecto (sin "seguir el sistema", botón solo ícono, "Atendido" azul profundo, barra lateral más oscura que la página).
- Preview: rendered (2026-11-25, Edge headless, con `prefers-reduced-motion`) en `previews/`: `<pantalla>-<claro|oscuro>-<1440|390>.png` (login, dashboard, agenda, historial). Revisión 2: tema oscuro **grafito neutro** (pedido del usuario tras ver la versión navy).

## Pantallas y estados

| Mockup | Pantalla real | Estados que muestra (en ambos temas) |
|---|---|---|
| `comparar.html` | — | Las 4 pantallas lado a lado, claro vs oscuro (`?tema=` fuerza el tema solo en el mockup) |
| `login.html` | `/admin/#/login` | Botón de tema arriba a la derecha, opciones de usuario (elegida / foco), error de ingreso, sesión vencida, cargando |
| `dashboard.html` | `/admin/#/dashboard` | Botón de tema en la topbar, KPIs (destacado), barras por estado, próximos turnos, día vacío |
| `agenda.html` | `/admin/#/agenda` | Mini-calendario, leyenda, filtros (selects nativos), grilla con día actual y cerrado, bloqueo, bloques reservado / confirmado / atendido / ausente y "$ Señado", **drawer** de detalle con su fondo |
| `historial.html` | `/admin/#/historial/pac-01` | Línea de tiempo, rótulo de datos ficticios, formulario con campo inválido, alerta de error 409, aviso info, odontograma ("!" rojo a revisar, "✓" azul hecho, pieza elegida), **toast** visible |

- **Look oscuro (revisión 2)**: superficies grafito neutro sin tinte azul (sidebar `#0F0F0F` < página `#161616` < tarjetas/topbar/grilla `#1F1F1F` < `#2A2A2A`), texto `#E8E8E8`. La paleta azul queda como acento: cabeceras de tarjeta `#00457A`, día actual y selección en azul, botón primario `#0088BE` con texto navy, foco y enlaces celestes. El fondo exterior del login sigue navy y la tarjeta es grafito. Líneas de la grilla sutiles (`#272727` cada 15 min, `#333333` cada hora), más tenues que en la captura de referencia.
- La base clara es la hoja **real** `public/admin/admin.css` (vía `adm.css`), así el claro del mockup es el de producción.
- `adm-oscuro.css` es la propuesta literal del bloque aditivo que se agregaría al final de `admin.css` (design D1, D2, D9); los ratios de contraste de cada par están en `design.md` (D2).
- `tema-arranque.js` / `tema.js` son versiones de mockup del arranque sin destello (D5) y del botón (D6). Botón: `aria-label="Tema oscuro"` fijo + `aria-pressed`; ícono luna (claro) / sol (oscuro), decorativo.
- El cambio de tema es instantáneo (sin transiciones de color); el resto del motion es el aprobado en `panel-admin-agenda`.
- Datos ficticios del seed (`Paciente Ficticio …`, `Dra. Ficticia Perez`, `Sillon 1/2`). Semana de ejemplo 30/11–06/12/2026, hoy martes 01/12.
- Incluye el arreglo del foco de la barra superior (en claro pasa de `#97CAD9` 1.70:1 a `#0088BE` 3.81:1).

## Para decidir en la revisión (design.md, Open Questions)

1. ¿Botón de dos estados sin "seguir al sistema"? (propuesto: sí)
2. ¿Ícono solo o ícono + texto? (propuesto: ícono solo, 44×44)
3. "Atendido" en oscuro: azul profundo con borde claro (propuesto) o azul claro con texto navy.
4. Sidebar en oscuro: más oscura que la página (propuesto, como en la captura) o igual a la página con borde.

## Fuentes

- Mockups aprobados de `openspec/changes/archive/2026-11-25-panel-admin-agenda/mockups/` (HTML y `shell.js` copiados con el botón de tema agregado).
- `public/admin/admin.css` (tema claro vigente), `design-system/brand.js`, `assets/logo.svg`.
- `specs/panel-admin/spec.md` y `design.md` de este change.

## Cómo verlos

Desde la raíz del repo: `python -m http.server 8765 --bind 127.0.0.1` y abrir
`http://127.0.0.1:8765/openspec/changes/panel-tema-oscuro/mockups/comparar.html`.
Para probar el default del sistema, abrir una pantalla sola sin `?tema=` con el sistema en modo oscuro (y sin `adm.tema` en `localStorage`).
