## Why

Hoy conviven dos agendas: la vieja (`public/index.html` + `public/js/agenda.js`, change C-09) y la del panel (`/admin/#/agenda`, change `panel-admin-agenda`). El usuario pidió sacar la vieja, que el odontograma se abra directamente desde la agenda del panel y que solo lo vea el odontólogo. Además, `public/odontograma.html` depende del selector de rol de la agenda vieja (`localStorage` + `X-Rol`) y hoy cualquier rol, incluso sin usuario identificado como odontólogo, puede leer y escribir piezas.

## What Changes

- **BREAKING** — Se retira la agenda vieja. `GET /` y `GET /index.html` responden `302` hacia `/admin/`. Se borran `public/index.html` y `public/js/agenda.js`.
- Los enlaces "Agenda" de `public/bot.html` y `public/sim/arca.html` pasan a apuntar a `/admin/#/agenda`. Ninguna página deja enlaces a `/` como agenda.
- La agenda del panel suma lo que solo ofrecía la vieja (ver el análisis de faltantes en `design.md`):
  - botón **"Nuevo turno"** para admin y recepción, con un formulario en el drawer (`POST /api/turnos`). Un `409` muestra el código `RN-AG-0x` y el turno en conflicto;
  - tarjeta **"Lo que hizo el sistema"** para admin y recepción (`GET /api/registro`), que se actualiza después de cada acción;
  - indicador de **origen WhatsApp** y **atenuado de turnos pasados** en la grilla y en el detalle.
- **Odontograma por rol**:
  - el drawer del turno muestra el enlace **"Odontograma"** solo al rol `odontologo`. El enlace abre `/admin/#/odontograma/<turnoId>`;
  - el odontograma pasa a ser una ruta protegida del panel, con sesión por token y los tokens `--adm-*`;
  - **BREAKING** — `GET` y `PUT /api/turnos/:id/piezas` responden `403` a cualquier rol distinto de `odontologo` (admin, recepción, paciente y sin usuario);
  - `public/odontograma.html` y `public/js/odontograma.js` se retiran, y `/odontograma.html` redirige a `/admin/#/agenda`.
- Tests existentes que se ajustan solo porque el spec cambia: `/` (200 → 302), el chequeo de "Seña pagada" sobre `public/js/agenda.js` (pasa a revisar la agenda del panel) y los tests del odontograma que usaban recepción para leer y escribir.
- Un grupo final de verificación end-to-end en navegador: bot (turno, seña, obra social, cancelar y reprogramar), Mercado Pago, ARCA, odontograma por rol, redirección de `/` y ausencia de enlaces rotos.

## Capabilities

### New Capabilities

Ninguna. Se usan las capabilities existentes.

### Modified Capabilities

- `vista-agenda`: la agenda pasa a ser la del panel. Se modifican la consulta, la información visual, la creación, el registro, la cancelación y la seña. Se quitan el selector de rol simulado y la vista diaria (decisión G-3). Se agrega el retiro de la agenda vieja (redirección de `/`).
- `odontograma`: el acceso queda solo para el odontólogo (API y UI). La selección la hace el odontólogo desde el panel. Se agrega el enlace desde el detalle del turno y se retira la página suelta.

## Impact

- **Código**:
  - `src/api/app.ts` (redirecciones, aditivo);
  - `src/api/routes/odontograma.ts` (guarda de rol, zona C-10);
  - `public/admin/js/` (agenda, permisos-ui, nuevo módulo de odontograma y sus cálculos puros, main);
  - `public/admin/admin.css` (clases aditivas con `--adm-*`);
  - `public/bot.html` (zona C-06) y `public/sim/arca.html` (zona C-12): solo cambia el `href`.
- **Borrado** (zona C-09 y C-10, pedido explícito del usuario): `public/index.html`, `public/js/agenda.js`, `public/odontograma.html`, `public/js/odontograma.js`. `public/js/api.js` queda sin consumidores en `public/`, pero NO se borra porque es de la zona C-01 (decisión D6).
- **Tests**: `tests/api/admin-estaticos.test.ts`, `tests/simulators/whatsapp/pantalla.test.ts`, `tests/api/odontograma.test.ts`, `tests/panel/permisos-ui.test.ts` y tests nuevos de los módulos puros del panel.
- **KB**: `knowledge-base/03_actores_y_roles.md` (matriz del odontograma) y `06_funcionalidades.md` (HU de la épica 8) quedan desactualizados. Se ajustan en apply según la decisión S-1.
- **Dependencia**: se monta sobre `panel-admin-agenda` (implementado, sin archivar). Ese change debe archivarse antes que este.
- **Governance**: roles y permisos del odontograma (CRITICAL/HIGH), con decisiones S-x para revisión humana. Toca zonas de otros integrantes (C-09, C-10, C-06, C-12), por lo que el PR necesita la revisión del team lead.
- **Sin cambios** en `design-system/tokens.css` ni `public/styles/tokens.css`.
