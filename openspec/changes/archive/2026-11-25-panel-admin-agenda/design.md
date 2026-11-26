## Context

Ver `proposal.md` (Why). Estado actual relevante:

- La identidad llega por `X-Usuario`/`X-Rol` (`src/api/middleware/rol-simulado.ts`, DD-09) y cualquier cliente puede elegir el rol. `public/js/api.js` los toma de `localStorage`. Bot, simuladores, `public/index.html` (C-09) y ~todos los tests de `tests/api/` dependen de esos headers.
- Los usuarios simulados viven en `USUARIOS` (`src/infrastructure/seed/datos-seed.ts`) y llegan a las rutas como `deps.usuarios`; `turnos.ts` y `configuracion.ts` los resuelven para obtener `profesionalId`.
- `TurnoRepository.listarActivos` excluye cancelados (RN-AG-10); `GET /api/turnos` acepta `desde`/`hasta`/`profesionalId`/`sillonId`. `consultarHuecos(deps, usuario, entrada)` calcula huecos por prestación.
- La auditoría es de solo inserción (`Auditoria.registrar`) con `accion` libre.
- Política visual `system-and-mockups` (revisión 1, aprobada): todo cambio visual necesita mockup aprobado. Los tokens compartidos no se tocan en este change.
- Zonas (CHANGES.md): `src/api/app.ts`, `src/api/middleware/`, `src/api/deps.ts`, `src/infrastructure/` y `src/application/ports/` son compartidos (C-01) → solo cambios aditivos con revisión del team lead.

## Goals / Non-Goals

**Goals:**
- Login simulado con token opaco **sin romper** los headers simulados (compatibilidad total con bot, simuladores y tests).
- Historial clínico simple, inmutable y con mínimo privilegio, sin contenido clínico en la auditoría.
- Un endpoint de resumen de solo lectura reutilizando repos y `consultarHuecos`.
- Un panel vanilla (sin framework, sin build) aislado en `public/admin/` con tema `--adm-*` propio.

**Non-Goals:**
- Autenticación real (contraseñas, hash, OAuth, MFA, cookies `HttpOnly`, CSRF, rate limiting). Queda como pregunta abierta de la KB.
- Desactivar los headers `X-Rol` (seguirían permitiendo suplantar roles; ver S-6).
- HCE legal (Ley 26.529): firma, inalterabilidad certificada, conservación. El historial es ficticio.
- Rediseñar `public/index.html` o alinear el design system con la nueva paleta.
- Arrastrar turnos en la grilla o crear turnos desde el panel (se reutiliza C-09 si hace falta; fuera de alcance).

## Decisions

### D1 — Identidad: middleware `identidad` que compone token + headers
Nuevo `src/api/middleware/identidad.ts` → `identidad(deps): RequestHandler`:
1. Si hay header `Authorization`: debe ser `Bearer <token>`; se busca la sesión en `deps.sesiones` y se valida vigencia con `deps.clock`. Vigente → `res.locals.usuario` = usuario completo (con `profesionalId`) resuelto desde `deps.usuarios`. Cualquier otra cosa → `next(new ErrorDeAutenticacion('Sesión inválida o vencida.'))`. **No** se miran `X-Usuario`/`X-Rol`.
2. Sin `Authorization`: delega en `rolSimulado` tal cual existe hoy.

`app.ts` reemplaza `app.use(rolSimulado)` por `app.use(identidad(deps))` en la misma posición (1 línea). `rol-simulado.ts` **no se modifica** (compatibilidad por composición).
*Alternativas*: modificar `rolSimulado` (toca el archivo de C-01 y mezcla responsabilidades); exigir token en todas las rutas (rompe bot, simuladores y ~100 tests).

### D2 — Token opaco + sesión en memoria
- `src/domain/auth/sesion.ts` (puro): `Sesion { token, usuarioId, creadaEn, expiraEn }`, `DURACION_SESION_MS = 8 h`, `estaVigente(sesion, ahora)` con intervalo `[creadaEn, expiraEn)` (a las 8 h exactas ya venció, coherente con la regla dura 6).
- Puertos locales del módulo en `src/application/auth/puertos.ts` (no en `ports/` compartido): `SesionRepository { guardar, buscar(token), eliminar(token) }`, `GeneradorToken { generar(): string }`.
- Infra: `src/infrastructure/memory/sesion-repository.ts` (`Map`), `src/infrastructure/auth/generador-token.ts` con `randomBytes(32).toString('base64url')` (256 bits). En tests se inyecta un generador determinístico; el `Clock` se fija (regla dura 7).
- Casos de uso `src/application/auth/{iniciarSesion,consultarSesion,cerrarSesion}.ts` devuelven `Result`.
*Alternativas*: JWT firmado (necesita secreto/clave → choca con regla dura 3 y agrega dependencia; además no se puede revocar en logout sin lista negra); cookie de sesión (requiere CSRF y cambia `api.js`).

### D3 — Almacenamiento del token en el navegador
`sessionStorage` (clave `adm.token`), enviado como `Authorization: Bearer` por un cliente propio `public/admin/js/api-admin.js`. No se toca `public/js/api.js` (C-01). Cerrar la pestaña termina la sesión del lado del cliente.
*Alternativa*: `localStorage` (persiste entre pestañas y reinicios; mayor exposición).

### D4 — Errores
`src/api/middleware/errores.ts` suma (aditivo) `ErrorDeAutenticacion` → `401 { error: { tipo: 'autenticacion', mensaje } }` con mensaje genérico igual para "no existe" y "venció".

### D5 — Rutas nuevas
- `src/api/routes/auth.ts`: `GET /auth/usuarios`, `POST /auth/login`, `GET /auth/sesion`, `POST /auth/logout`.
- `src/api/routes/historia.ts`: `GET|POST /pacientes/:id/historia`. Al no registrar `PUT/PATCH/DELETE`, caen en el 404 genérico (spec: solo inserción).
- `src/api/routes/panel.ts`: `GET /panel/resumen`.
- `app.ts`: 3 líneas `app.use('/api', …)` + 1 línea para servir `design-system/brand.js` en `/admin/brand.js` (no se copia el archivo; `BRAND_NAME` sigue teniendo una sola fuente).

### D6 — Historial clínico
- Dominio `src/domain/historia/entrada.ts` (puro): tipo `EntradaHistoria` y `validarEntrada(input: unknown, ahora: Date)` → `Result` con errores de entrada (400) y `RN-HC-02` (fecha futura; `fecha <= ahora` es válido).
- Aplicación `src/application/historia/{registrarEntrada,listarHistoria}.ts`: autorización por rol (lectura `admin|odontologo`, alta solo `odontologo`), paciente existente (404), `RN-HC-01` (turno inexistente o de otro paciente, vía `deps.turnos.buscarPorId`), `profesionalId` desde el usuario, auditoría `historia-crear` / `historia-consultar` sin procedimiento ni notas.
- Repo `src/infrastructure/memory/historia-repository.ts` con solo `agregar` y `listarPorPaciente` (sin update/delete, como la auditoría).
- Seed: 2–3 entradas ficticias para `pac-01`..`pac-03` con fechas relativas al reloj (`ahora - n días`).
- Códigos `RN-HC-01` y `RN-HC-02` nuevos: se documentan en `knowledge-base/05_reglas_de_negocio.md` (tarea aditiva, revisión del team lead).

### D7 — Resumen del panel
`src/application/panel/resumenDelDia.ts`: filtra `listarActivos({ desde, hasta })` del día local de Buenos Aires (`[00:00, 24:00)`), y para odontólogo agrega `profesionalId`. `huecosLibres` = suma de `consultarHuecos` por profesional activo con la prestación de menor `duracionMin` (en el seed, 30 min). `proximos` usa `pacientePublico` para el nombre. Sin auditoría, sin escrituras.
*Alternativa*: contar cancelados → requiere ampliar `TurnoRepository` (compartido); descartado, el spec excluye `cancelado`.

### D8 — Matriz de permisos del panel (para revisión)

| Recurso / acción | admin | recepcion | odontologo | paciente / sin usuario |
|---|---|---|---|---|
| Login al panel | ✓ | ✓ | ✓ | 401 (no hay usuario de panel) |
| Dashboard `GET /panel/resumen` | R (todo) | R (todo) | R (propio) | 403 |
| Agenda (UI) — consulta | R (todas) | R (todas) | R (filtro propio por defecto; puede ver todas, como KB 03) | — |
| Agenda — acciones de estado | según API existente | según API existente | según API existente (atender/ausente propios) | — |
| Clientes (pacientes) | CRU | CRU | R | 403 |
| Historial clínico — leer | R | **403** | R | 403 |
| Historial clínico — alta | **403** | **403** | C (con su `profesionalId`) | 403 |
| Historial — editar/borrar | — (404) | — (404) | — (404) | — |

### D9 — Panel UI (vanilla, sin build)
`public/admin/index.html` (SPA con hash routing: `#/login`, `#/dashboard`, `#/agenda`, `#/clientes`, `#/clientes/:id`, `#/historial/:id`), `public/admin/admin.css`, `public/admin/js/{api-admin,sesion,router,dashboard,agenda,clientes,historial}.js`. Las funciones de cálculo de la grilla (posición/alto de bloques, semana de una fecha, filtros, permisos de navegación por rol) se escriben como funciones puras en `public/admin/js/agenda-calculos.js` y `permisos-ui.js` para testearlas con Vitest (entorno node, import ESM). Como `tsconfig` no usa `allowJs` y es `strict`, cada módulo puro lleva un `.d.ts` hermano (`agenda-calculos.d.ts`, `permisos-ui.d.ts`) para que `npm run typecheck` siga limpio sin `any`; los tests viven en `tests/panel/` (ya cubierto por `include: tests/**/*.test.ts`). La agenda pide `GET /api/turnos?desde&hasta` de la semana (lunes 00:00 a lunes siguiente 00:00, `-03:00`), y los nombres de profesional/sillón/prestación desde `GET /api/catalogo`.
Bloques coloreados **por estado** (pedido del usuario y referencia Medinet); la prestación va como texto. Esto no usa los `--t-*` del design system, cuya regla ("el color de prestación identifica el tipo de turno") se mantiene en las vistas existentes. Ver S-8 (revisión).

### D10 — Tema y motion

**Tokens** (`public/admin/admin.css`, todos con prefijo `--adm-`, aditivos; `design-system/tokens.css` y `public/styles/tokens.css` quedan intactos y la revisión del design system **no** cambia):

| Token | Valor | Uso | Contraste verificado |
|---|---|---|---|
| `--adm-navy` | `#001040` | sidebar, topbar, texto fuerte | blanco sobre navy 18.3:1 |
| `--adm-blue-700` | `#00457A` | ítem activo, encabezado de grilla, día actual | blanco sobre él 9.9:1 |
| `--adm-blue-500` | `#0088BE` | acción primaria, acento | **navy** sobre él 4.6:1 (blanco 3.99:1 ✗ → no se usa) |
| `--adm-blue-300` | `#97CAD9` | bordes, chips, hover, foco sobre navy | navy sobre él 10.3:1 |
| `--adm-blue-100` | `#DCE8EE` | fondo de paneles | navy sobre él 14.7:1 |
| `--adm-bg` | `#EEF4F7` | fondo de página (tinte azul, no gris neutro) | — |
| `--adm-surface` | `#F7FAFC` | tarjetas | texto `--adm-text` 16:1 aprox. |
| `--adm-text` | `#001040` | texto principal | — |
| `--adm-text-muted` | `#4A5F75` | texto secundario | 6.2:1 sobre surface |
| `--adm-link` | `#006F9C` | enlaces/acento como texto | 5.2:1 sobre surface |
| `--adm-accent` / `--adm-on-accent` | `#0088BE` / `#001040` | botón primario | 4.6:1 |
| `--adm-focus` | `3px solid #0088BE` (claro) · `3px solid #97CAD9` (sobre navy) | foco | ≥3:1 no-texto |
| `--adm-st-reservado` | bg `#DCE8EE`, borde `#97CAD9` punteado, fg `#001040` | pendiente de confirmar | 14.7:1 |
| `--adm-st-confirmado` | bg `#0088BE`, fg `#001040` | confirmado | 4.6:1 |
| `--adm-st-atendido` | bg `#00457A`, fg `#FFFFFF` | atendido | 9.9:1 |
| `--adm-st-ausente` | bg `#FBE3DC`, fg `#7A2710` | ausente (única nota cálida, alerta) | 8.1:1 |
| `--adm-senado` | marca "$ Señado" texto `#0B4D2E` sobre `#D9EFE3` | seña | 8.2:1 |

Tipografía: se conserva la del proyecto (`DM Sans`/fallback Helvetica/Arial para cuerpo; títulos con el mismo stack en 600–700, sin Bricolage para mantener modo "operate"); `font-variant-numeric: tabular-nums` en KPIs, horas y grilla. Escala: 12/14/16/20/24px. Radios 6/10/14px como el design system. Sin tarjetas anidadas, sin gradientes en texto, sin glassmorphism, sin íconos en círculos por KPI, sin franjas laterales de color en tarjetas. El estado del turno nunca se comunica solo por color (texto + nombre accesible).

**Motion** (reglas tipo Emil Kowalski):
- Solo `transform` y `opacity`. Curva por defecto `--adm-ease-out: cubic-bezier(0.23, 1, 0.32, 1)`.
- Duraciones: `--adm-dur-press: 120ms` (botones, `:active { transform: scale(0.97) }`), `--adm-dur-pop: 180ms` (dropdowns/filtros, origen desde el disparador), `--adm-dur-panel: 240ms` (drawer de detalle de turno / sidebar mobile, `translateX`), `--adm-dur-enter: 220ms` (login → panel: fade + `translateY(8px)`; KPI cards: entrada escalonada de 40ms por tarjeta, desde `scale(0.98)`+`opacity:0`, nunca desde `scale(0)`), toast 200ms. Nada supera 300ms.
- **No se anima**: cambio de semana, mini-calendario, filtros de la grilla, navegación del sidebar en escritorio, re-render de bloques, atajos de teclado, hover de celdas de la grilla.
- Hover solo bajo `@media (hover: hover) and (pointer: fine)`. Estados interactivos con `transition` (interrumpibles), no `@keyframes`; keyframes solo para la entrada única de las KPI cards.
- `@media (prefers-reduced-motion: reduce)`: se anulan `transform`/escalonado; quedan fundidos de opacidad ≤150ms.

### D11 — Mockups como gate
`openspec/changes/panel-admin-agenda/mockups/` (`login.html`, `dashboard.html`, `agenda.html`, `clientes.html`, `historial.html`, `adm.css`, `README.md`). El `README.md` arranca en `Approval: pending`. Ninguna tarea visual (grupo 6+) empieza hasta que el usuario lo cambie a `approved`. Las tareas de backend (grupos 1–5) no dependen de esa aprobación.

## Decisiones de seguridad para revisión humana (CRITICAL / HIGH)

Ninguna de estas decisiones se toma en silencio: el revisor humano debe aprobarlas (o pedir cambio) antes del apply del grupo 1.

- **S-1 Sin contraseñas**: el login solo pide `usuarioId` de una lista pública de usuarios ficticios. Cualquiera con acceso a la app puede entrar como cualquier rol. Aceptable solo por ser TP local con datos ficticios.
- **S-2 Token**: opaco, 256 bits de `crypto.randomBytes`, sin datos del usuario, vigencia fija de 8 h (sin renovación deslizante), revocable con logout. Sesiones en memoria: se pierden al reiniciar.
- **S-3 Almacenamiento cliente**: `sessionStorage`; expuesto a XSS como cualquier storage. Mitigación: el panel nunca usa `innerHTML` con datos de la API (solo `textContent`/nodos), y no hay scripts de terceros.
- **S-4 Precedencia**: con `Authorization` presente se ignoran `X-Usuario`/`X-Rol`; token inválido → 401 genérico, sin distinguir "no existe" de "venció".
- **S-5 Auditoría**: se auditan `login`/`logout` y alta/consulta de historial; nunca se guarda el token ni el contenido clínico.
- **S-6 Headers simulados siguen activos**: cualquier cliente sin token puede seguir declarando `X-Rol: admin`. Se mantiene por compatibilidad (bot, simuladores, C-09, tests). Desactivarlos (p. ej. variable `AUTH_HEADERS=off`) sería otro change.
- **S-7 Mínimo privilegio en historial**: recepción sin acceso; admin solo lectura; solo odontólogo escribe, con su propio `profesionalId`. Todos los odontólogos leen el historial de cualquier paciente (no hay relación paciente-profesional en el modelo).
- **S-8 Color por estado en la agenda del panel** (no por prestación como en C-09): desvío consciente de la regla de marca, acotado al panel.
- **S-9 Sin rate limiting ni bloqueo por intentos**: irrelevante sin secretos; anotado para una auth real.
- **S-10 Sin CORS ni cookies**: el token viaja solo en header, la app es same-origin; no se agrega middleware CORS.

## Risks / Trade-offs

- [Los headers `X-Rol` siguen permitiendo suplantación] → documentado (S-6); el panel no los envía nunca.
- [Archivos compartidos (`app.ts`, `errores.ts`, `deps.ts`, seed)] → cambios solo aditivos, PR revisado por el team lead; `rol-simulado.ts` no se toca.
- [Cambiar `app.use(rolSimulado)` por `identidad(deps)` puede romper tests] → safety net: correr toda la suite antes/después; el camino sin `Authorization` delega literalmente en `rolSimulado`.
- [Historial clínico excede el alcance KB 01 ("historia clínica completa" fuera)] → versión simple, rotulada ficticia; Ley 26.529 sigue abierta en `10_preguntas_abiertas.md`.
- [Cálculo de semana/zona horaria en el navegador] → funciones puras con fechas fijas en tests; offset fijo `-03:00` (Argentina sin horario de verano).
- [Mockups no aprobados a tiempo] → los grupos 1–5 (API) avanzan en paralelo.
- [Huecos del dashboard dependen de la prestación más corta] → regla explícita en el spec; si cambia el catálogo, cambia el número.

## Migration Plan

1. Merge de la API (grupos 1–5) detrás de rutas nuevas: no cambia ningún contrato existente.
2. Merge del panel `public/admin/` tras aprobar mockups; `public/index.html` sigue disponible.
3. Rollback: revertir la línea de `app.ts` (`identidad` → `rolSimulado`) y las 4 líneas de rutas; los datos son en memoria, no hay migración.

## Open Questions

- ¿El panel debe reemplazar a `public/index.html` como entrada por defecto (`/`)? No cambia specs; lo decide el team lead después.
- ¿Duración de sesión distinta de 8 h para la demo? Es una constante; ajustable sin cambiar el enfoque.
- Ley 26.529 / HCE real: sigue en `knowledge-base/10_preguntas_abiertas.md` (prioridad Media).
