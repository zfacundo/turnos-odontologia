# Mockups — `panel-admin-agenda`

- Design system revision: 1 (`design-system/`, aprobado el 2026-11-25). **No se modifica**: el panel usa tokens propios `--adm-*` (aditivos) definidos en `adm.css`, que en la implementación pasa a `public/admin/admin.css`.
- Approval: **approved (2026-11-25, by user)** — desbloquea la implementación visual (tasks grupos 6 a 9). Ajuste menor posterior a la revisión: las barras de "Turnos por estado" del dashboard ahora se rellenan (`display:block` en `.bar-track`/`.bar-fill`).
- Preview: rendered (2026-11-25, Edge headless, tema claro, 1440×900, con `prefers-reduced-motion`) en `previews/`. Mobile 390×844 revisado en el navegador integrado (sin scroll horizontal de página; la grilla de la agenda se desplaza dentro de su contenedor).

## Pantallas y estados

| Mockup | Pantalla real | Rol del ejemplo | Estados de referencia |
|---|---|---|---|
| `login.html` | `/admin/#/login` | — | error de ingreso, sesión vencida, cargando usuarios |
| `dashboard.html` | `/admin/#/dashboard` (shell + KPIs) | Recepción | día vacío, variante odontólogo, cargando |
| `agenda.html` | `/admin/#/agenda` | Admin | semana vacía, variante odontólogo, error de carga; **click en un bloque** abre el drawer de detalle |
| `clientes.html` | `/admin/#/clientes` | Recepción | odontólogo (solo lectura), admin, DNI repetido (409); la búsqueda filtra en vivo |
| `historial.html` | `/admin/#/historial/pac-01` | Odontóloga | admin (solo lectura), recepción (sin acceso), sin entradas, fecha futura (409 RN-HC-02) |

- **Shell**: sidebar navy con `BRAND_NAME` (de `design-system/brand.js`), sección activa con `aria-current="page"`; en < 768px se colapsa detrás del botón de menú (`aria-expanded`, `Escape` cierra y devuelve el foco). Las secciones visibles dependen del rol (design D8): recepción no ve "Historial clínico".
- **Agenda**: estilo Medinet (referencia del usuario): mini-calendario con la semana marcada, leyenda de colores, filtros arriba, grilla Lunes–Domingo de 15 min con el día actual resaltado. El color del bloque indica el **estado**; el estado también está en el nombre accesible del bloque.
- **Motion**: ver design D10. En los mockups: entrada escalonada de KPI (40 ms), login (fade + 8 px), drawer (240 ms `translateX`), `:active` de botones `scale(0.97)`. Cambiar semana/filtros no anima.
- **Datos**: todos ficticios y coherentes con el seed (`pac-01`..`pac-10`, "Paciente Ficticio …", DNI y teléfono **enmascarados** como en `pacientePublico`, profesionales `Dra. Ficticia Perez`/`Dr. Ficticio Gomez`, `Sillon 1`/`Sillon 2`). Semana de ejemplo: 30/11–06/12/2026, hoy martes 01/12. Los números del dashboard son ilustrativos.

## Fuentes

- Imágenes de referencia del usuario: paleta (#001040, #00457A, #0088BE, #97CAD9, #DCE8EE), plantilla de admin (sidebar + topbar + KPI) y agenda Medinet.
- `openspec/changes/panel-admin-agenda/specs/panel-admin/spec.md` y `design.md` (D8–D10).
- `design-system/brand.js` y `assets/logo.svg` (logo provisional, TBD).

## Cómo verlos

Desde la raíz del repo: `python -m http.server 8765` (o `npx http-server -p 8765`) y abrir `http://localhost:8765/openspec/changes/panel-admin-agenda/mockups/login.html`. Desde cada pantalla se navega a las demás por el sidebar.
