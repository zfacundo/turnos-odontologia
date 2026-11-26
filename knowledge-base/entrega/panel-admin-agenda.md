# Handoff — `panel-admin-agenda`

- **Modo**: SDD (OPSX). Apply ejecutado el 2026-11-25 con TDD estricto en backend y en la lógica pura del panel.
- **Estado**: 43/43 tareas completas (9.1 y 9.2 cerradas por el team lead el 2026-11-25, ver "Verificación final 9.1 / 9.2").
- **Pendiente de la persona**: revisar, commit, rama `panel-admin-agenda`, PR con la plantilla, `engram sync` si corresponde y archive. No se hizo commit, push, rama ni PR.
- **Change OPSX**: `openspec/changes/archive/2026-11-25-panel-admin-agenda/` (capabilities nuevas `autenticacion-simulada`, `historial-clinico`, `indicadores-panel`, `panel-admin`; `salud-api` modificada).

## Aprobaciones registradas (gates)

- **Gate 0.1 (CRITICAL auth / HIGH historial clínico)**: aprobado por el usuario, en chat, el 2026-11-25. Decisiones de seguridad **S-1 a S-10** y matriz de permisos **D8** aprobadas tal cual están en `design.md`; se implementaron sin cambios.
- **Gate 0.2 (visual)**: mockups aprobados por el usuario el 2026-11-25 (`mockups/README.md`: `Approval: approved`).

Resumen de lo aprobado y vigente:

| Id | Decisión |
|---|---|
| S-1 | Login solo con `usuarioId` de usuarios ficticios; sin contraseñas. |
| S-2 | Token opaco de 256 bits (`randomBytes(32)` base64url), 8 h fijas, en memoria, revocable con logout. |
| S-3 | Token en `sessionStorage`; el panel nunca usa `innerHTML` (un test lo verifica sobre todo `public/admin/js`). |
| S-4 | Con `Authorization` se ignoran `X-Usuario`/`X-Rol`; token inválido, inexistente o vencido → mismo 401 genérico. |
| S-5 | Se auditan `login`, `logout`, `historia-crear`, `historia-consultar`; nunca el token ni el contenido clínico. |
| S-6 | Los headers simulados siguen activos para quien no manda `Authorization` (bot, simuladores, C-09, tests). |
| S-7 | Historial: lectura admin y odontólogo; alta solo odontólogo con su propio `profesionalId`; recepción sin acceso. |
| S-8 | Agenda del panel coloreada por estado (no por prestación). |
| S-9 / S-10 | Sin rate limiting, sin CORS, sin cookies. |

## Qué se hizo

**API (grupos 1–5)**
- `ErrorDeAutenticacion` → `401 { error: { tipo: 'autenticacion' } }` en `manejadorDeErrores`.
- Dominio `src/domain/auth/sesion.ts` (intervalo `[creadaEn, expiraEn)`) y `src/domain/historia/entrada.ts` (`validarEntrada`, `RN-HC-02`).
- Casos de uso `src/application/auth/*` (`iniciarSesion`, `consultarSesion`, `cerrarSesion`, `resolverSesion`), `src/application/historia/*` (`registrarEntrada` con `RN-HC-01`, `listarHistoria`) y `src/application/panel/resumenDelDia.ts` (reutiliza `consultarHuecos` y `pacientePublico`).
- Infra: `sesion-repository.ts`, `historia-repository.ts` (solo `agregar`/`listarPorPaciente`/`siguienteId`), `auth/generador-token.ts`.
- Middleware `src/api/middleware/identidad.ts`: con `Authorization` identifica solo por token; sin él delega en `rolSimulado` **sin modificarlo** (archivo idéntico al original).
- Rutas `auth.ts`, `historia.ts` (sin PUT/PATCH/DELETE → 404 genérico) y `panel.ts`.
- Seed: 6 entradas ficticias de historial para `pac-01`..`pac-03` con fechas `ahora - n días`.
- `knowledge-base/`: RN-HC-01/02 (05), DD-09 ampliada y matriz del panel (03, 09), dos preguntas abiertas (10). Solo aditivo; **pendiente revisión del team lead**.

**Panel (grupos 6–8)** en `public/admin/`
- `index.html`, `admin.css` (copia de `mockups/adm.css` con tokens `--adm-*`), módulos ESM sin build en `js/`: `main` (login, shell y router por hash con guardas), `sesion`, `api-admin`, `dom` (helpers que solo insertan texto), `dashboard`, `agenda`, `clientes`, `historial`.
- Lógica pura con `.d.ts` hermano y tests: `permisos-ui`, `agenda-calculos`, `clientes-calculos`, `historial-calculos`; `api-admin` testeable por inyección de `fetch`/almacén.

## Archivos compartidos tocados (solo aditivo)

- `src/api/app.ts`: `app.use(rolSimulado)` → `app.use(identidad(deps))`, 3 routers (`auth`, `historia`, `panel`) antes del 404, y rutas `GET /admin/brand.js` y `GET /admin/logo.svg` (ver desvíos).
- `src/api/deps.ts`: `sesiones`, `generadorToken`, `historia`.
- `src/api/middleware/errores.ts`: `ErrorDeAutenticacion` y su rama.
- `src/infrastructure/seed/{cargar-seed,deps-vacias,datos-seed}.ts`: nuevos campos de `Deps` y `HISTORIA_SEED`.
- Intactos (verificado con `git diff`): `design-system/tokens.css`, `public/styles/tokens.css`, `public/js/api.js`, `public/index.html`, `src/api/middleware/rol-simulado.ts`.

## Cómo se verificó

- **Línea base (0.3)**: 62 archivos, **794 tests** en verde; `typecheck` limpio.
- **Final**: 81 archivos, **1057 tests** en verde (+263); `npm run typecheck` limpio, sin `any`.
- Reglas duras: dominio sin Express/`fs`/`Date.now()`; repos en memoria reales y solo `RelojFijo` + generador de token determinístico; nombres "dado … cuando … entonces …"; un test por escenario de los 5 specs.
- **Prueba en navegador real** (servidor local efímero con `SIM_NOW=2026-12-01T08:00:00-03:00`, ya detenido): login por rol, restauración de sesión al recargar, logout (el token deja de servir: 401), sesión vencida (token inválido → login con aviso), guarda de rol sin llamadas a la API (recepción en `#/historial/pac-01`), dashboard con KPIs, agenda (semana, filtros, mini-calendario, simultáneos en carriles, drawer, confirmar, cancelar con motivo, `Escape` devuelve el foco), clientes (búsqueda, ficha, alta con 409 de DNI repetido, alta correcta), historial (validación en línea sin llamar a la API, alta, línea de tiempo), sidebar móvil (`aria-expanded`, `Escape`, `inert`).
- **Verificaciones estáticas ejecutables** (`tests/panel/estatico-admin.test.ts`): prefijo `--adm-`, paleta, contraste AA de botón primario/estados/texto/enlaces, foco 3px, solo `transform`/`opacity`, ninguna duración > 300 ms, `prefers-reduced-motion`, `:hover` solo bajo `(hover: hover) and (pointer: fine)`, sin `innerHTML`/`eval`/`localStorage`/`X-Rol` en el JS, sin campo de contraseña.
- **Capturas** 1440 y 390 (Edge headless; el 390 en un iframe de 390 px de ancho) en `openspec/changes/archive/2026-11-25-panel-admin-agenda/mockups/verify/`: login, dashboard, agenda, clientes e historial. Sin scroll horizontal de página a 390 px (medido en el navegador integrado en dashboard, agenda y clientes; historial se ve sin desborde en la captura).

## Desvíos respecto del diseño / mockups (para revisión)

1. **Borde de controles más oscuro**: el spec exige 3:1 para elementos de interfaz y el borde `#97CAD9` del mockup sobre blanco da 1,78:1. Se agregó el token `--adm-control-border: #678399` (3,97:1) para inputs, selects, botones secundarios, botones de ícono y opciones de login. Es un cambio visual menor respecto de lo aprobado: confirmar o pedir otra solución.
2. **`GET /admin/logo.svg`**: además de `brand.js` (D5) se sirve el logo desde `design-system/assets/` para no duplicarlo. Es una línea más en `app.ts`.
3. **Router dentro de `main.js`**: la tarea 6.3 menciona `router.js`; el enrutado por hash y las guardas viven en `main.js` para no fragmentar un módulo de ~60 líneas.
4. **Módulos puros extra** (`clientes-calculos`, `historial-calculos`) y `asignarCarriles` en `agenda-calculos`: necesarios para testear búsqueda y validación en línea, y para que dos sillones simultáneos no se tapen en la grilla. No cambian el spec.
5. **`#/historial` sin id** muestra una lista para elegir paciente (si no, la entrada del menú sería un enlace muerto). Está fuera de lo literal del spec; se puede quitar.
6. **"Hoy" de la agenda** se toma de `GET /api/panel/resumen` (reloj del servidor, respeta `SIM_NOW`); si falla, el del navegador.
7. **Edición de pacientes**: la API devuelve DNI y teléfono enmascarados y `PUT` los exige completos, así que al editar hay que volver a ingresarlos (el formulario lo avisa).
8. Los bloqueos (urgencias) se piden a `GET /api/bloqueos` y se dibujan como en el mockup; si esa llamada falla, la agenda se muestra igual.

## Qué no se verificó

- **9.1 / 9.2**: cerradas, ver la sección siguiente. Queda sin verificar el contraste sobre píxeles renderizados (se midió por cálculo sobre los tokens).
- Navegadores: solo Edge/Chromium. Safari y Firefox no.
- Conflicto 409 de una acción de estado desde el drawer: el código muestra el mensaje de la API, pero no se provocó un 409 real en el navegador (sí el de DNI repetido en clientes).

## Verificación final 9.1 / 9.2 (team lead, 2026-11-25)

- **9.2, recorrido por rol** (`npm run dev`, seed, `SIM_NOW=2026-12-01T08:00:00-03:00`, navegador integrado): los 4 usuarios ficticios entran por la UI; el menú coincide con D8 (recepción sin Historial clínico); "Acceso restringido" para recepción en `#/historial` y para recepción y admin en `#/odontograma/...` (la API también responde 403); `u-odonto-2` abre agenda, historial de `pac-03` y odontograma. Tras "Cerrar sesión", el token da 401 en `/api/auth/sesion` y `/api/turnos`, y `sessionStorage` queda vacío.
- **Bot y simuladores**: `/bot.html` responde al mensaje; con headers simulados (sin token) se creó un turno, se aprobó la seña en `/sim/mercadopago.html` (`senado: true`), se consultó `AF-0001` en `/sim/obras-sociales.html` y se emitió la Factura C en `/sim/arca.html` después de confirmar y atender el turno. Los enlaces "Agenda" de bot y ARCA llevan a `/admin/#/agenda`.
- **9.1, teclado y movimiento reducido real**: Edge headless con `--force-prefers-reduced-motion` y teclas enviadas por CDP. Login solo con teclado (flechas, `Tab`, `Enter`); `Tab` en dashboard (8 focos), agenda (55), clientes (19), historial (17) e historial de paciente (7) a 1440, y agenda a 390 (39): todos visibles y con outline de 3px. Drawer: foco inicial en "Cerrar detalle", 25 `Tab` sin salir del diálogo, `Escape` devuelve el foco al turno. Ningún elemento con transición > 300 ms, animación activa ni transición de `transform`. Sin scroll horizontal a 390. Script y salida: `openspec/changes/archive/2026-11-25-panel-admin-agenda/mockups/verify/a11y-teclado-reduced-motion.{mjs,json}`.
- **Observación menor**: el formulario "Nueva entrada" del historial propone la fecha y hora del navegador, no la del reloj simulado (`SIM_NOW`). Sin impacto fuera de la demo con reloj fijo.

## Qué sigue

1. Revisión humana de los desvíos 1, 2 y 5 y de los cambios en `knowledge-base/`.
2. Change archivado como `2026-11-25-panel-admin-agenda`.

## Preguntas abiertas

- **Auth real**: contraseñas, hash, expiración deslizante, rate limiting, CORS/cookies/CSRF (S-1, S-9, S-10).
- **Desactivar los headers simulados** (p. ej. `AUTH_HEADERS=off`, S-6): otro change; hoy cualquier cliente sin token puede declararse admin.
- **Ley 26.529 / HCE real**: firma, inalterabilidad certificada y conservación; el historial es ficticio y simple.
- ¿El panel reemplaza a `public/index.html` como entrada por defecto (`/`)? Lo decide el team lead.
- ¿Duración de sesión distinta de 8 h para la demo? Constante `DURACION_SESION_MS`.
