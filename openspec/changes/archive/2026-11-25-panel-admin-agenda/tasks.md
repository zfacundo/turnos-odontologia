# Tasks

> TDD estricto en todo el backend y en la lógica pura del panel: primero el test rojo (uno o más por escenario del spec), después el código mínimo para ponerlo en verde, después el refactor con los tests en verde. Tests con nombre "dado … cuando … entonces …". No se mockean dominio ni repositorios: se usan los repos en memoria reales y solo se fijan el `Clock` (`RelojFijo`) y el `GeneradorToken`. Escenarios: `specs/{autenticacion-simulada,historial-clinico,indicadores-panel,panel-admin,salud-api}/spec.md`. Decisiones: `design.md` (D1–D11, S-1..S-10).
>
> **Reparto sugerido**: grupos 1–2 (auth, CRITICAL) · grupo 3 (historial, HIGH) · grupo 4 (indicadores) · grupos 6–8 (panel UI, cada uno separable). Los grupos 1–5 no dependen de los mockups; los grupos 6–9 **sí**.

## 0. Gates y precondiciones

- [x] 0.1 **Gate CRITICAL/HIGH** (aprobado 2026-11-25 por el usuario, en chat: S-1..S-10 y matriz D8 aprobadas tal cual): el revisor humano aprueba (o pide cambios en) las decisiones S-1..S-10 y la matriz D8 de `design.md`. Se verifica con la aprobación registrada en el PR o en `knowledge-base/entrega/panel-admin-agenda.md`. Sin esto no se empieza el grupo 1.
- [x] 0.2 **Gate visual** (aprobado 2026-11-25 por el usuario): el usuario aprueba los mockups (`mockups/README.md` pasa de `Approval: pending` a `approved (fecha, by user)`). Sin esto no se empiezan los grupos 6–9.
- [x] 0.3 Safety net: correr `npm test` y `npm run typecheck` en la rama `panel-admin-agenda` antes de tocar código y anotar la línea base ("N tests en verde"). Si hay fallos previos, reportarlos al team lead sin arreglarlos.

## 1. Errores 401 y dominio de sesión

- [x] 1.1 Test rojo en `tests/api/errores.test.ts` (aditivo): un handler que lanza `ErrorDeAutenticacion` responde `401` con `error.tipo = 'autenticacion'` y mensaje genérico (spec `salud-api`, "Error de autenticación se responde con 401"). Se verifica viendo el test en rojo.
- [x] 1.2 Agregar `ErrorDeAutenticacion` y su rama en `manejadorDeErrores` (`src/api/middleware/errores.ts`, solo aditivo). Se verifica con 1.1 en verde y el resto de `tests/api/errores.test.ts` en verde.
- [x] 1.3 Tests rojos en `tests/domain/auth/sesion.test.ts`: `estaVigente` es `true` a las 7:59 h, `false` a las 8:00 h exactas y después (intervalo `[creadaEn, expiraEn)`); `crearSesion` calcula `expiraEn = creadaEn + 8 h`. Se verifica viendo los tests en rojo.
- [x] 1.4 Implementar `src/domain/auth/sesion.ts` (puro: sin Express, `fs`, `Date.now()` ni `new Date()` sin argumentos). Se verifica con 1.3 en verde y `npm run typecheck`.

## 2. Autenticación simulada (API) — CRITICAL

- [x] 2.1 Tests rojos en `tests/infrastructure/sesion-repository.test.ts`: guardar/buscar/eliminar por token; buscar un token inexistente devuelve `undefined`. Y en `tests/infrastructure/generador-token.test.ts`: dos tokens seguidos son distintos y tienen ≥ 43 caracteres base64url (256 bits). Se verifica viendo los tests en rojo.
- [x] 2.2 Implementar `src/application/auth/puertos.ts` (`SesionRepository`, `GeneradorToken`), `src/infrastructure/memory/sesion-repository.ts` y `src/infrastructure/auth/generador-token.ts` (`randomBytes(32).toString('base64url')`). Se verifica con 2.1 en verde.
- [x] 2.3 Tests rojos en `tests/application/auth/*.test.ts` para `iniciarSesion`, `consultarSesion` y `cerrarSesion`: login de recepción y de odontólogo (con `profesionalId`), usuario inexistente → error de autenticación sin crear sesión, cuerpo inválido → entrada, tokens distintos por login, vencimiento a las 8 h con `RelojFijo`, logout invalida, logout con token inexistente → autenticación, auditoría `login`/`logout` sin el token en ningún campo. Se verifica viendo los tests en rojo.
- [x] 2.4 Implementar los tres casos de uso en `src/application/auth/` devolviendo `Result`. Se verifica con 2.3 en verde.
- [x] 2.5 Tests rojos en `tests/api/identidad.test.ts`: token válido gana sobre `X-Rol: admin` (POST pacientes → 403); `Bearer no-existe` → 401; esquema `Basic` → 401; sin `Authorization` con `X-Rol: recepcion` → 200; token válido + `X-Rol: superusuario` en `/api/health` → 200; token vencido → 401. Se verifica viendo los tests en rojo.
- [x] 2.6 Implementar `src/api/middleware/identidad.ts` (D1) que delega en `rolSimulado` sin modificarlo. Se verifica con 2.5 en verde y `git diff src/api/middleware/rol-simulado.ts` vacío.
- [x] 2.7 Tests rojos en `tests/api/auth.test.ts` para `GET /api/auth/usuarios` (4 usuarios, `simulado: true`, sin `token`), `POST /api/auth/login` (201/401/400), `GET /api/auth/sesion` (200 sin token en el cuerpo / 401) y `POST /api/auth/logout` (204, reuso → 401). Se verifica viendo los tests en rojo.
- [x] 2.8 Implementar `src/api/routes/auth.ts`; sumar `sesiones` y `generadorToken` a `Deps` (`src/api/deps.ts`) y a `cargarSeed`/`crearDepsVacias` (solo aditivo). Se verifica con 2.7 en verde.

## 3. Historial clínico (API) — HIGH

- [x] 3.1 Tests rojos en `tests/domain/historia/entrada.test.ts` para `validarEntrada`: fecha sin zona, procedimiento vacío / 121 caracteres, notas de 1001 caracteres, `turnoId` no textual → entrada; fecha futura → `RN-HC-02`; fecha igual a "ahora" → ok; notas vacías → ok. Se verifica viendo los tests en rojo.
- [x] 3.2 Implementar `src/domain/historia/entrada.ts` (puro). Se verifica con 3.1 en verde.
- [x] 3.3 Tests rojos en `tests/infrastructure/historia-repository.test.ts`: `agregar` y `listarPorPaciente` (copias, orden por fecha descendente, paciente sin entradas → lista vacía); el repo no expone update ni delete. Se verifica viendo los tests en rojo.
- [x] 3.4 Implementar `src/infrastructure/memory/historia-repository.ts`. Se verifica con 3.3 en verde.
- [x] 3.5 Tests rojos en `tests/application/historia/*.test.ts` para `registrarEntrada` y `listarHistoria`: permisos de D8 (recepción y paciente 403 en lectura; admin 403 en alta; sin usuario 403), `profesionalId` del cuerpo ignorado, paciente inexistente → 404, `RN-HC-01` (turno de otro paciente o inexistente), auditoría `historia-crear`/`historia-consultar` sin procedimiento ni notas, y consulta rechazada sin evento. Se verifica viendo los tests en rojo.
- [x] 3.6 Implementar los casos de uso en `src/application/historia/`. Se verifica con 3.5 en verde.
- [x] 3.7 Tests rojos en `tests/api/historia.test.ts`: `GET`/`POST /api/pacientes/:id/historia` con token (201, forma completa con `simulado: true`, 200 ordenado, 400, 403, 404, 409) y `DELETE`/`PUT` → 404 dejando la entrada intacta. Se verifica viendo los tests en rojo.
- [x] 3.8 Implementar `src/api/routes/historia.ts` y sumar `historia` a `Deps`. Se verifica con 3.7 en verde.
- [x] 3.9 Test rojo en `tests/infrastructure/seed-historia.test.ts` ("Historial ficticio en el seed": ids existentes, `simulado: true`, fechas anteriores al reloj); luego cargar 2–3 entradas ficticias para `pac-01`..`pac-03` en el seed (aditivo). Se verifica con el test en verde y `tests/infrastructure/seed-datos-ficticios.test.ts` en verde.

## 4. Indicadores del panel (API)

- [x] 4.1 Tests rojos en `tests/application/panel/resumenDelDia.test.ts` con repos reales y `RelojFijo`: conteo por estado sin clave `cancelado`, día vacío, fecha por defecto del reloj (23:30 → mismo día), turno a las 00:00 del día siguiente excluido, `senados`, `proximos` (máx. 5, orden, pasados excluidos, nombre de `pacientePublico`), `huecosLibres` baja al crear un turno, odontólogo limitado a su profesional. Se verifica viendo los tests en rojo.
- [x] 4.2 Implementar `src/application/panel/resumenDelDia.ts` reutilizando `listarActivos` y `consultarHuecos` (D7). Se verifica con 4.1 en verde.
- [x] 4.3 Tests rojos en `tests/api/panel.test.ts`: 200 para admin/recepción/odontólogo, 403 para paciente y sin usuario, 400 para `fecha=01-12-2026`, sin eventos de auditoría nuevos. Luego implementar `src/api/routes/panel.ts`. Se verifica con los tests en verde.

## 5. Integración de la API

- [x] 5.1 En `src/api/app.ts`: reemplazar `app.use(rolSimulado)` por `app.use(identidad(deps))`, montar `authRouter`, `historiaRouter` y `panelRouter` antes del 404 de `/api`, y servir `design-system/brand.js` en `/admin/brand.js` (D5). Se verifica con `git diff src/api/app.ts` mostrando solo esas líneas y con `npm test` completo igual a la línea base de 0.3 más los tests nuevos, todos en verde.
- [x] 5.2 Documentar `RN-HC-01` y `RN-HC-02` en `knowledge-base/05_reglas_de_negocio.md` y la auth por token (DD-09 ampliada) en `knowledge-base/03_actores_y_roles.md` / `09_decisiones_y_supuestos.md`, solo aditivo y con revisión del team lead. Se verifica con el diff de esos archivos.
- [x] 5.3 `npm run typecheck` limpio (sin `any`) y `npm test` en verde. Se verifica con la salida de ambos comandos.

## 6. Panel: tema, shell y login (requiere 0.2)

- [x] 6.1 Crear `public/admin/admin.css` a partir de `mockups/adm.css` (tokens `--adm-*` de D10, foco 3px, reglas de motion y `prefers-reduced-motion`). Se verifica con `git diff design-system/tokens.css public/styles/tokens.css` vacío.
- [x] 6.2 Tests rojos en `tests/panel/permisos-ui.test.ts` para la función pura de navegación por rol (matriz D8: recepción sin "Historial clínico", odontólogo con Clientes en solo lectura, admin con historial solo lectura) y para `puedeVer(rol, ruta)`. Luego implementar `public/admin/js/permisos-ui.js` (ESM) con su `permisos-ui.d.ts` (D9). Se verifica con los tests en verde y `npm run typecheck` limpio.
- [x] 6.3 Implementar `public/admin/js/api-admin.js` (token en `sessionStorage` como `Authorization: Bearer`; ante 401 borra el token y va a `#/login` con el aviso) y `sesion.js`/`router.js` (hash routing, guardas por sesión y rol, aviso "Tu rol no tiene acceso a esta sección" sin llamar a la API). Se verifica manualmente con el servidor (`npm run dev`): sin token `/admin/#/agenda` muestra el login; con `u-recepcion`, `/admin/#/historial/pac-01` muestra el aviso.
- [x] 6.4 Implementar `public/admin/index.html` con el shell (sidebar con `BRAND_NAME`, `aria-current`, menú mobile con `aria-expanded` y `Escape`) y la pantalla de login según `mockups/login.html` (rótulo SIMULACIÓN, sin campo de contraseña, error anunciado con `role="alert"`). Datos de la API solo con `textContent` (S-3). Se verifica manualmente con los escenarios de "Pantalla de login del panel", "Secciones protegidas…" y "Shell del panel".

## 7. Panel: dashboard y agenda (requiere 0.2)

- [x] 7.1 Implementar `public/admin/js/dashboard.js` según `mockups/dashboard.html`: KPIs de `GET /api/panel/resumen` con números tabulares y entrada escalonada (40 ms, ≤ 220 ms), barras por estado, próximos turnos, estado vacío y rótulo "Tu agenda de hoy" para odontólogo. Se verifica manualmente con el seed y con los escenarios "KPIs del día" y "Día vacío".
- [x] 7.2 Tests rojos en `tests/panel/agenda-calculos.test.ts` (fechas fijas): lunes de la semana de una fecha, `desde`/`hasta` de la semana con `-03:00`, posición y alto de un bloque (10:00–10:45 → 3 filas), columna por día, filtros por profesional/sillón/estado, nombre accesible con el estado. Luego implementar `public/admin/js/agenda-calculos.js` con su `agenda-calculos.d.ts` (D9). Se verifica con los tests en verde y `npm run typecheck` limpio.
- [x] 7.3 Implementar `public/admin/js/agenda.js` según `mockups/agenda.html`: mini-calendario, leyenda, filtros, semana anterior/siguiente sin animación, día actual resaltado, filtro propio por defecto para odontólogo, mensaje "Sin turnos en esta semana". Se verifica manualmente con los escenarios de "Agenda semanal del panel".
- [x] 7.4 Implementar el drawer de detalle (abre con click/`Enter`/`Space`, cierra con `Escape` devolviendo el foco, 240 ms `translateX`) con las acciones existentes (`confirmar`, `cancelar` con motivo, `atender`, `ausente`) y el mensaje de la API ante 403/409. Se verifica manualmente con "Confirmar desde el detalle" y "Error de la API".

## 8. Panel: clientes e historial clínico (requiere 0.2)

- [x] 8.1 Implementar `public/admin/js/clientes.js` según `mockups/clientes.html`: lista de `GET /api/pacientes`, búsqueda por nombre en el navegador con resultado anunciado (`aria-live`), ficha, alta/edición para admin y recepción con los endpoints existentes, solo lectura para odontólogo. Se verifica manualmente con "Buscar paciente", "Odontólogo en solo lectura" y "Sin resultados".
- [x] 8.2 Implementar `public/admin/js/historial.js` según `mockups/historial.html`: línea de tiempo descendente, rótulo "Datos ficticios — no es una historia clínica legal", "Ver piezas del turno" con `GET /api/turnos/:id/piezas`, formulario solo para odontólogo con validación en línea (`aria-invalid` + mensaje asociado, sin llamar a la API si es inválido), toast de confirmación, sin editar/borrar. Se verifica manualmente con "Alta de entrada", "Validación en línea" y "Admin sin formulario".

## 9. Verificación final del panel

- [x] 9.1 Verificación visual y de accesibilidad: contraste AA medido en botón primario (navy sobre `#0088BE` ≥ 4.5:1), bloques de estado y texto secundario; foco visible de 3px en todo interactivo; navegación completa por teclado (login, sidebar, grilla, drawer, formularios); `prefers-reduced-motion` sin desplazamiento ni escala; ninguna animación > 300 ms ni en cambio de semana/filtros; a 390×844 sin scroll horizontal de página y con sidebar colapsable; capturas 390 y 1440 del panel real guardadas en `mockups/verify/`. Se verifica con las capturas y una checklist en el PR. **Estado 2026-11-25: parcial** — contraste AA medido por cálculo, foco 3px, motion y sidebar/drawer verificados (tests estáticos y navegador); capturas 390/1440 en `mockups/verify/`; falta el recorrido manual completo con `Tab` y emular `prefers-reduced-motion` (ver handoff). **Cerrada 2026-11-25 (team lead)**: Edge headless con `--force-prefers-reduced-motion` (`matchMedia` = true) y `Tab` reales por CDP en login, dashboard, agenda, clientes, historial e historial de un paciente (1440) y agenda (390): todos los focos con outline de 3px y visibles; login completo solo con teclado (flechas + `Tab` + `Enter`); drawer: foco inicial en "Cerrar detalle", 25 `Tab` sin salir del diálogo, `Escape` devuelve el foco al turno; ningún elemento con transición > 300 ms, animación activa ni transición de `transform`; sin scroll horizontal a 390. Script y salida en `mockups/verify/a11y-teclado-reduced-motion.{mjs,json}`.
- [x] 9.2 Recorrido E2E manual por rol con `npm run dev` y seed: admin, recepción y cada odontólogo entran, ven solo sus secciones, cierran sesión y el token deja de servir; el bot (`/bot.html`), los simuladores y `public/index.html` siguen funcionando con sus headers. Se verifica con la checklist en el PR. **Nota 2026-11-25**: `public/index.html` lo retiró `panel-reemplaza-agenda-vieja` (`/` redirige a `/admin/`), así que esa parte del recorrido ya no aplica. **Cerrada 2026-11-25 (team lead)** con `npm run dev`, seed y `SIM_NOW=2026-12-01T08:00:00-03:00` en el navegador integrado: los 4 usuarios (admin, recepción, `u-odonto-1`, `u-odonto-2`) entran por la UI, ven su menú según D8 (recepción sin Historial clínico), recepción y admin reciben "Acceso restringido" en `#/odontograma/...` y recepción en `#/historial`; tras "Cerrar sesión" el token da 401 en `/api/auth/sesion` y `/api/turnos` y `sessionStorage` queda vacío. Bot (`/bot.html`) responde; con headers simulados se creó un turno, se pagó la seña en `/sim/mercadopago.html` (`senado: true`), se consultó `AF-0001` en `/sim/obras-sociales.html` y se emitió la Factura C en `/sim/arca.html`.
- [x] 9.3 Handoff en `knowledge-base/entrega/panel-admin-agenda.md` (qué se hizo, cómo se verificó, decisiones S-x aprobadas, preguntas abiertas: auth real, Ley 26.529, desactivar headers simulados) y `npm test` + `npm run typecheck` en verde. Se verifica con el archivo y la salida de los comandos.

> Archivado 2026-11-25 con 9.1 y 9.2 abiertas; ambas se cerraron el mismo día con la evidencia indicada en cada una.
