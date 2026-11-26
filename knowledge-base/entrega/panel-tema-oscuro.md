# Handoff — `panel-tema-oscuro`

- **Modo**: SDD (OPSX). Apply ejecutado el 2026-11-26 con TDD estricto, sobre la rama `propuestas-bot-reprogramar-y-registro`.
- **Estado**: 22/22 tareas marcadas en `openspec/changes/panel-tema-oscuro/tasks.md` (las capturas PNG y `tema.json` de 6.1/6.2 NO se generaron; ver "Cómo se verificó").
- **Pendiente de la persona**: revisar (se tocan archivos compartidos del panel), commit, PR con la plantilla, `engram sync` si corresponde y archive. No se hizo commit, push ni PR.
- **Aprobación visual**: mockups aprobados por el usuario el 2026-11-26 (look grafito neutro; las 4 preguntas abiertas con sus valores por defecto).

## Qué se hizo

- `public/admin/js/tema-calculos.js` (+ `.d.ts`): `CLAVE_TEMA`, `normalizarTema`, `resolverTema`, `alternarTema`, `esquemaDeColor` (puro).
- `public/admin/tema-arranque.js`: script clásico síncrono en `<head>` antes de `admin.css`; fija `data-tema` y `color-scheme` antes del primer pintado.
- `public/admin/js/tema.js` (+ `.d.ts`): `iniciarTema` (botón, `aria-pressed`, guardado, seguimiento del sistema solo sin elección guardada) y `almacenLocalDeTema` (único lugar que toca `localStorage`).
- `public/admin/admin.css`: bloque aditivo `:root[data-tema="oscuro"]` + sobrescrituras por selector al final (copiado de `mockups/adm-oscuro.css`), regla de foco `.topbar :focus-visible` y `.tema-btn { flex: none }` (sin esto el botón se encogía a 39px a 390px).
- `index.html`: `<script src="tema-arranque.js">` y dos botones `data-tema-toggle` (login `.login-tools` y topbar). `main.js`: import y una llamada. `agenda.js` (swatch de bloqueo) y `dashboard.js` (4 barras): `var(--adm-*, <valor actual>)`.
- `design-system/tokens.css` y `public/styles/tokens.css`: sin cambios (`git status` vacío para esas rutas).

## Tests

- Baseline antes: 83 archivos / 1160 tests. Después: 87 archivos / 1229 tests en verde; `npm run typecheck` limpio.
- Nuevos: `tema-calculos.test.ts`, `tema-arranque.test.ts` (node:vm, paridad), `tema.test.ts`, `tema-estatico.test.ts` (contrastes AA/3:1 sobre los tokens efectivos, cobertura de literales claros y de marca, sin transition/animation, orden del script en `<head>`, botones); `tema-casos.ts` es la tabla compartida. `estatico-admin.test.ts` se acotó según D4 (solo `tema.js` toca `localStorage`, solo `CLAVE_TEMA`; `api-admin.js`, `sesion.js`, `main.js` siguen sin tocarlo; ningún archivo del panel referencia los tokens compartidos). `tests/api/admin-estaticos.test.ts`: los archivos nuevos se sirven como JS.

## Cómo se verificó (panel de navegador, dev server en :3000, datos ficticios)

- Sin elección guardada: con `prefers-color-scheme` oscuro arranca en oscuro, con claro en claro; el cambio emulado en vivo cambia el tema.
- Sin destello: se muestreó un iframe de `/admin/` durante la carga; `data-tema` ya estaba fijado antes de que exista `body` y nunca apareció un fondo claro.
- Botón: clic y Tab + Space alternan; `aria-pressed` se sincroniza en ambos botones; la elección sobrevive a recargar y a cerrar sesión; una elección guardada prevalece sobre el sistema.
- Vistas en oscuro (login, dashboard, agenda con los 4 estados, historial, odontograma con piezas "!" y "✓", toast, alerta de error): escaneo por JS de fondos claros, solo quedan los chips intencionales (avatar, logo) y el skip-link fuera de pantalla. Se comparó a ojo con los mockups: coinciden.
- 1440 y 390 px: sin scroll horizontal; el botón mide 44x44 a 390.
- Foco de la barra superior en claro: `#0088BE` (antes `#97CAD9`, 1.70:1; ahora 3.81:1). Sin errores en consola.
- NO verificado: Edge headless con el script de `panel-admin-agenda` (no se generó `mockups/verify/tema.json`) ni PNG en `mockups/verify/`; `prefers-reduced-motion` solo por test estático; no se probó Firefox/Safari; el drawer de la agenda, "$ Señado" real y la tabla de clientes con ficha abierta solo se miraron por clases/estilos computados o no se abrieron (la leyenda sí se vio).
- Nota: para ver la agenda se crearon 5 turnos ficticios en la memoria del dev server (se pierden al reiniciarlo).

## Qué sigue

- PR con revisión del equipo (archivos compartidos), archive del change y sincronizar el delta de `panel-admin`.
- Opcional: guardar capturas y el script Edge de 6.2 si el equipo los quiere como evidencia.

## Decisiones abiertas

- Las 4 preguntas de `design.md` quedaron en sus defaults (sin "seguir al sistema" en la UI, ícono solo, "Atendido" azul profundo, sidebar más oscura que la página).
- `.turno.pasado { opacity: .55 }` baja el contraste del texto en ambos temas (preexistente, fuera de alcance); en las capturas se nota en oscuro.
- No se sincroniza el tema entre pestañas abiertas (non-goal).
