> **Antes de empezar**:
> - Las decisiones S-1..S-5 y G-1..G-4 de `design.md` tienen que estar confirmadas por el usuario. **Confirmadas el 2026-11-25 por el usuario, en chat, tal cual están escritas.**
> - Los grupos 4 y 5 (UI) necesitan `mockups/README.md` con `Approval: approved`.
> - Strict TDD: cada tarea de código empieza con un test rojo, con nombre en formato dado / cuando / entonces (regla dura 8).
> - Los grupos 2 y 3 se pueden hacer en paralelo. El 4 y el 5 dependen del 3. El 6 depende del 4 y del 5. El 8 va al final.

## 1. Inventario y red de seguridad

- [x] 1.1 Correr `npm test` y anotar el baseline (N tests en verde) en el handoff. Si algo falla antes de empezar, frenar y reportarlo como falla previa.
- [x] 1.2 Correr `grep` de `index.html`, `agenda.js`, `odontograma.html`, `js/odontograma.js`, `href="/"` y `js/api.js` sobre `public/`, `src/` y `tests/`. Guardar la lista en el handoff y confirmar que coincide con D9 de `design.md`. Si aparece algún consumidor no previsto, volver a Propose.

## 2. Backend: guarda del odontograma y redirecciones (TDD)

- [x] 2.1 RED: en `tests/api/odontograma.test.ts`, pasar `preparar` y los `GET`/`PUT` de `a_revisar` a `ODONTOLOGO`, con el comentario `// spec: panel-reemplaza-agenda-vieja`. Agregar los escenarios nuevos de "Estados y permisos":
  - recepción y admin `GET` → 403;
  - recepción y paciente `PUT` → 403, y el turno sigue sin piezas;
  - sin usuario → 403;
  - token de odontólogo → 200;
  - token de recepción + `X-Rol: odontologo` → 403;
  - recepción sobre un turno inexistente → 403.
  - Verificar que los nuevos fallan.
- [x] 2.2 GREEN: en `src/api/routes/odontograma.ts`, hacer que `comprobarAcceso` exija `rol === 'odontologo'` antes de buscar el turno (D4). Verificar con `npx vitest run tests/api/odontograma.test.ts` en verde, y que "recepción y paciente no marcan hecho" sigue en 403.
- [x] 2.3 RED: en `tests/api/admin-estaticos.test.ts`:
  - `/` y `/index.html` → 302 con `Location: /admin/`;
  - `/odontograma.html` → 302 con `Location: /admin/#/agenda`;
  - `/bot.html`, `/sim/mercadopago.html`, `/sim/obras-sociales.html`, `/sim/arca.html` y `/styles/tokens.css` → 200.
  - Reemplazar la expectativa vieja `/` → 200, con el comentario de spec.
- [x] 2.4 GREEN: agregar las redirecciones en `src/api/app.ts` antes de `express.static` (D1, edición aditiva). Verificar con `npx vitest run tests/api/admin-estaticos.test.ts` en verde.

## 3. Módulos puros del panel (TDD, sin DOM)

- [x] 3.1 RED→GREEN `tests/panel/permisos-ui.test.ts`:
  - `puedeVerOdontograma`: solo `odontologo`;
  - `puedeCrearTurnos` y `puedeVerRegistro`: admin y recepción;
  - `puedeVer(rol, '#/odontograma/t-1')`: solo `odontologo`;
  - `seccionesPara` no incluye `odontograma` para ningún rol.
  - Implementar en `public/admin/js/permisos-ui.js` y su `.d.ts`. Verificar el test en verde.
- [x] 3.2 RED→GREEN `tests/panel/agenda-calculos.test.ts`:
  - `terminoAntesDe(turno, ahoraMs)`: termina antes, termina justo ahora y empieza después;
  - `nombreAccesible` incluye "reservado por WhatsApp" solo con `origen: 'whatsapp'`, "señado" solo con `senado: true` y "ya terminó" cuando corresponde.
  - Verificar el test en verde.
- [x] 3.3 RED→GREEN `validarNuevoTurno(campos)` en `agenda-calculos.js`:
  - campos faltantes devuelven errores por campo;
  - con datos completos arma `{ pacienteId, prestacionId, profesionalId, sillonId, inicio: 'YYYY-MM-DDTHH:mm:00-03:00' }`;
  - horas cada 15 min de 08:00 a 19:45.
  - Verificar con casos feliz, campo vacío y borde 19:45.
- [x] 3.4 RED→GREEN `tests/panel/odontograma-calculos.test.ts` para `public/admin/js/odontograma-calculos.js`:
  - `cuadrantes()` devuelve 32 piezas FDI en el orden de D8;
  - `nombrePieza(16)` = "Primer molar superior derecho";
  - nombres y piezas coinciden con `src/domain/odontograma/piezas.ts` (el test importa los dos);
  - `etiquetaEstado`;
  - `validarSeleccion(pieza, sintomas)` → "Seleccioná al menos un síntoma.".
  - Verificar el test en verde.
- [x] 3.5 RED→GREEN `formatearRegistro(eventos)` (puro):
  - del más reciente al más antiguo;
  - fecha y hora de Argentina `dd/mm HH:mm`;
  - lista vacía → "Todavía no hay acciones registradas.";
  - máximo 10.
  - Verificar el test en verde.
- [x] 3.6 RED→GREEN en `tests/panel/api-admin.test.ts`: un 409 con `conflicto` en el cuerpo lo expone en `ErrorApi.conflicto` (cambio aditivo en `api-admin.js`). Verificar que los tests de `api-admin` existentes siguen en verde.

## 4. UI de la agenda del panel (requiere mockup aprobado)

- [x] 4.1 Botón "+ Nuevo turno" en `week-nav`, solo si `puedeCrearTurnos`. Formulario en el drawer según `mockups/agenda.html`:
  - errores por campo con `aria-invalid` y mensaje asociado;
  - un 409 muestra regla, mensaje y conflicto sin cerrar el formulario;
  - si sale bien: toast "Turno creado" y recarga de la semana del turno.
  - Verificar a mano en el navegador como recepción y como odontóloga (sin botón).
- [x] 4.2 Tarjeta "Lo que hizo el sistema" en la columna izquierda, solo si `puedeVerRegistro`, con `formatearRegistro`. Se refresca después de crear, cancelar, confirmar, atender y marcar ausente. Verificar en el navegador que el odontólogo no la ve y que no se pide `/api/registro` (pestaña Network).
- [x] 4.3 Indicador de WhatsApp en el bloque y "Origen" en el detalle. Clase `.pasado` con `terminoAntesDe(t, Date.parse(ctx.ahoraIso()))`. CSS aditivo en `public/admin/admin.css`, solo con `--adm-*`. Verificar con un turno del bot y uno pasado.
- [x] 4.4 Enlace "Odontograma" (`href="#/odontograma/<id>"`) en las acciones del drawer, solo si `puedeVerOdontograma`. Verificar con odontóloga (se ve), recepción y admin (no se ve).

## 5. UI del odontograma en el panel (requiere mockup aprobado)

- [x] 5.1 Crear `public/admin/js/odontograma.js` (`montarOdontograma(contenedor, ctx)`) y registrar `odontograma` en `VISTAS` de `main.js`:
  - título y crumbs por `ctx.titulo`;
  - turno sacado de `GET /api/turnos`;
  - piezas de `GET /api/turnos/:id/piezas`;
  - un 404 muestra "No encontramos ese turno." + "Volver a la agenda".
  - Verificar en el navegador con la odontóloga sobre un turno real y sobre `#/odontograma/turno-inexistente`.
- [x] 5.2 Interacción según D8 y `mockups/odontograma.html`:
  - selección de pieza (`aria-pressed`);
  - caras como toggle y síntomas;
  - "Agregar pieza N al turno" (`PUT`);
  - "Marcar como realizado" (`estado: 'hecho'`);
  - 409 `RN-OD-04` visible;
  - colores rojo/azul con "!"/"✓".
  - Verificar que se ve rojo al guardar y azul al marcar hecho, y probar en 390 px sin scroll horizontal.
- [x] 5.3 Verificar en el navegador que recepción y admin, con la ruta escrita a mano, ven "Tu rol no tiene acceso a esta sección." y que no aparece ninguna request a `/piezas` en Network.

## 6. Retiro de la agenda vieja y enlaces

- [x] 6.1 RED: test nuevo `tests/api/sin-enlaces-viejos.test.ts`. Recorre todos los `.html` de `public/` y verifica que ningún `href` sea `/` ni `/index.html` ni apunte a `odontograma.html`, y que existe `href="/admin/#/agenda"` en `bot.html` y `sim/arca.html`. Verificar que falla.
- [x] 6.2 GREEN: cambiar los `href` de "Agenda" en `public/bot.html` (zona C-06) y `public/sim/arca.html` (zona C-12) a `/admin/#/agenda`. Verificar el test 6.1 en verde.
- [x] 6.3 Adaptar el caso "seña pagada" de `tests/simulators/whatsapp/pantalla.test.ts` para que lea `public/admin/js/agenda.js` (o use la función pura de 3.2), con el comentario de spec. Verificar en verde.
- [x] 6.4 Borrar `public/index.html`, `public/js/agenda.js`, `public/odontograma.html` y `public/js/odontograma.js` (D2), en un commit aparte de tipo `refactor`. Repetir el `grep` de 1.2 sin resultados en `public/` y `tests/`. Verificar `npm test` completo en verde.

## 7. Documentación y handoff

- [x] 7.1 Según S-1 confirmada, actualizar:
  - `knowledge-base/03_actores_y_roles.md`: matriz del odontograma, con solo odontólogo C/R/U;
  - `knowledge-base/06_funcionalidades.md`: HU de la épica 8;
  - un supuesto nuevo en `knowledge-base/09_decisiones_y_supuestos.md`.
  - Verificar releyendo que no quede "paciente" como actor del odontograma.
- [x] 7.2 En `design-system/README.md`, quitar la "inconsistencia conocida" de `public/index.html` (solo texto, sin tokens). Verificar que `tokens.css` no aparece en `git diff`.
- [x] 7.3 Escribir `knowledge-base/entrega/panel-reemplaza-agenda-vieja.md`:
  - qué se hizo;
  - zonas ajenas tocadas (C-09, C-10, C-06, C-12, `app.ts`), que requieren revisión del team lead;
  - tests ajustados y por qué;
  - D6 (`api.js`);
  - decisiones S y G con su respuesta;
  - resultado del grupo 8.

## 8. Verificación end-to-end en navegador (al final, con `npm run dev`)

- [x] 8.1 `/` y `/index.html` → panel. `/odontograma.html` → agenda del panel. Login con recepción, admin y odontóloga: cada uno ve lo que corresponde según el spec.
- [x] 8.2 (reprogramar: el bot NO ofrece esa opción; se verificó por `POST /api/turnos/:id/reprogramar`, ver handoff) Bot (`/bot.html`):
  - reservar un turno → aparece en la agenda del panel con el ícono de WhatsApp;
  - pagar la seña en el bot → "$" y "$ Señado";
  - rechazar el pago → no hay marca;
  - consultar la obra social con un afiliado válido y otro inexistente;
  - cancelar y reprogramar desde el bot → el turno cambia en el panel y queda en "Lo que hizo el sistema".
- [x] 8.3 Mercado Pago (`/sim/mercadopago.html`): pago aprobado y rechazado, con el rótulo SIMULACIÓN visible. El turno señado se ve en el panel.
- [x] 8.4 Obras sociales (`/sim/obras-sociales.html`): cobertura encontrada y no encontrada, con el rótulo SIMULACIÓN.
- [x] 8.5 ARCA (`/sim/arca.html`): marcar un turno como atendido desde el panel y emitir la Factura C simulada de ese turno. Un turno no atendido es rechazado con el código de la regla.
- [x] 8.6 Panel: crear turno (feliz y 409 con `RN-AG-0x`), confirmar, atender, ausente y cancelar con motivo. Revisar el aviso en el WhatsApp simulado del paciente y que el registro se actualiza.
- [x] 8.7 Odontograma:
  - la odontóloga lo abre desde el detalle, guarda la pieza 16 (rojo) y la marca hecha (azul);
  - recepción y admin no ven el enlace y la ruta a mano muestra acceso restringido;
  - `curl` con `X-Rol: recepcion` a `/api/turnos/<id>/piezas` → 403.
- [x] 8.8 Revisar que no queden enlaces rotos: recorrer la navegación de `bot.html`, `sim/arca.html` y el panel sin 404 en Network. Revisar la consola sin errores y 390×844 sin scroll horizontal. Dejar capturas con datos ficticios en `openspec/changes/panel-reemplaza-agenda-vieja/verify/`.
