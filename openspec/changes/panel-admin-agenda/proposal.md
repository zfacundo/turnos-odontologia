## Why

Hoy la agenda (`public/index.html`, C-09) es una página suelta con un selector de rol que cualquiera puede cambiar, sin un lugar común para recepción, odontólogos y administración. El equipo pidió un **panel de administración** con la paleta de la imagen de referencia (#001040 → #DCE8EE), una agenda semanal estilo Medinet, un dashboard simple, la sección de clientes (pacientes), un historial clínico simple por paciente y un **login por rol** que reemplace al selector de rol, siempre con datos ficticios.

## What Changes

- **Login simulado por rol**: pantalla de ingreso del panel donde se elige uno de los usuarios ficticios del seed (admin, recepción, odontólogos), sin contraseñas reales. La API emite un **token de sesión opaco** en memoria con vencimiento, y expone `POST /api/auth/login`, `GET /api/auth/sesion` y `POST /api/auth/logout`.
- **Middleware de identidad compatible**: una request con `Authorization: Bearer <token>` válido se identifica por la sesión y **tiene precedencia** sobre `X-Usuario`/`X-Rol`. Un token inválido o vencido responde `401`. Sin `Authorization`, se conserva el comportamiento actual de los headers `X-Rol`/`X-Usuario` (bot, simuladores, `public/index.html` y los tests existentes siguen funcionando).
- **Shell del panel** (`public/admin/`): sidebar navy colapsable en mobile, topbar con usuario y cierre de sesión, y rutas del panel protegidas por rol (las secciones que el rol no puede ver no se muestran y la API igual responde `403`).
- **Agenda dentro del panel**: grilla semanal Lunes–Domingo con bloques de 15 min y turnos coloreados, mini-calendario con leyenda de colores y filtros por profesional, sillón y estado. Consume `GET /api/turnos` existente; no cambia reglas de agenda.
- **Dashboard simple**: KPIs del día (turnos del día, por estado, huecos libres, próximos turnos) a partir de un nuevo endpoint de solo lectura `GET /api/panel/resumen`.
- **Clientes (pacientes)**: listado con búsqueda y ficha usando los endpoints existentes de `ficha-paciente` (datos enmascarados según esa spec).
- **Historial clínico simple**: entradas ficticias por paciente (fecha, profesional, procedimiento, notas, turno/odontograma vinculado opcional), **solo inserción** (las correcciones son entradas nuevas), con `GET/POST /api/pacientes/:id/historia`, permisos restringidos y auditoría de cada alta.
- **Tema del panel**: tokens nuevos con prefijo `--adm-*` en una hoja propia (`public/admin/admin.css`). **No** se modifican `design-system/tokens.css` ni `public/styles/tokens.css` (los tokens del panel son aditivos; la revisión del design system no cambia).
- **Mockups** en `openspec/changes/panel-admin-agenda/mockups/` (login, shell + dashboard, agenda, clientes, historial clínico). La implementación visual queda **bloqueada hasta que el usuario los apruebe** (política `system-and-mockups`).

No hay cambios **BREAKING** de API: los headers simulados siguen siendo válidos.

## Capabilities

### New Capabilities
- `autenticacion-simulada`: login con usuarios ficticios, token de sesión opaco en memoria con vencimiento, logout, consulta de sesión y precedencia del token sobre los headers simulados (`401` en token inválido).
- `historial-clinico`: entradas clínicas simples por paciente, solo inserción, con permisos por rol, validación, auditoría y datos ficticios.
- `indicadores-panel`: endpoint de solo lectura con los KPIs del día para el dashboard.
- `panel-admin`: interfaz del panel (login, shell, dashboard, agenda semanal, clientes, historial), protección de secciones por rol, tema `--adm-*` aditivo y mockups aprobados.

### Modified Capabilities
- `salud-api`: el requisito "Rol simulado por headers" pasa a convivir con la identificación por token (precedencia del `Bearer`, `401` para token inválido) y el mapeo uniforme de errores suma el tipo `autenticacion` (`401`).

## Impact

- **Código nuevo**: `src/domain/auth/`, `src/domain/historia/`, `src/application/auth/`, `src/application/historia/`, `src/application/panel/`, `src/infrastructure/memory/` (repos de sesión e historia), `src/api/routes/auth.ts`, `src/api/routes/historia.ts`, `src/api/routes/panel.ts`, `public/admin/` (HTML, JS, `admin.css`) y sus tests.
- **Compartidos (solo aditivo, revisión del team lead)**: `src/api/app.ts` (3 routers), `src/api/middleware/rol-simulado.ts` (precedencia del token), `src/api/middleware/errores.ts` (`401`), `src/api/deps.ts` (repos nuevos), seed (historia ficticia).
- **Sin cambios**: `public/index.html`, bot, simuladores, `design-system/` y `public/styles/tokens.css`; reglas de agenda RN-AG-*.
- **Governance**: autenticación = **CRITICAL** (decisiones listadas para revisión humana en `design.md`); historial clínico = **HIGH**; dashboard/agenda/clientes UI = MEDIUM.
- **Alcance KB**: `01_vision_y_objetivos.md` excluye la "historia clínica completa"; este change agrega una versión **simple y ficticia**, sin pretensión de HCE legal (pregunta abierta Ley 26.529 en `10_preguntas_abiertas.md` sigue abierta). `CHANGES.md` no lista este change; registrarlo le corresponde al team lead.
- **Dependencias**: ninguna librería nueva (token con `node:crypto` detrás de un generador inyectable). No toca el change en curso `pagar-sena-mercadopago-sim`.
