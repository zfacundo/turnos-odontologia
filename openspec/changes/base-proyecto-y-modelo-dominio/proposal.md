# Proposal

## Why

El repositorio todavía no tiene código: no hay proyecto TypeScript, ni modelo de dominio, ni API sobre la que construir. Las 6 personas del equipo necesitan un cimiento común (tipos, puertos, repos en memoria, seed ficticio y `createApp(deps)`) antes de trabajar en paralelo.

**Por qué va primero**: C-01 es el único change sin dependencias y es la base compartida (`src/domain/shared/`, `src/application/ports/`, `src/api/app.ts`, seed) que todos los demás changes importan. Hasta que esté mergeado no se abre GATE 1: C-02 (núcleo de agenda) y el resto del equipo quedan bloqueados. Estabilizarlo temprano y revisado por el team lead minimiza conflictos de merge en los puntos compartidos.

## What Changes

- Proyecto ejecutable TypeScript (`strict`) + Node 20 + Express 4 + Vitest + supertest: `package.json` (scripts `dev`, `test`, `build`), `tsconfig.json`, `vitest.config.ts`, `README.md` con cómo correr en local.
- Dominio compartido puro (`src/domain/shared/`): value object `Intervalo` `[inicio, fin)` con `seSolapan(a, b)` (RN-AG-01), validación de alineación a bloques de 15 min (RN-AG-03), tipo `Result<Ok, ErrorDeRegla>` con `{ regla, dimension?, conflicto? }` (DD-08).
- Dominio de configuración (`src/domain/configuracion/`): tipos `Sillon`, `Prestacion` (una sola `duracionMin`, > 0 y múltiplo de 15 — RN-CF-01, DD-12), `Profesional` con `disponibilidad: Franja[]`, `Bloqueo` (por profesional, sillón o global).
- Dominio de pacientes (`src/domain/pacientes/`): tipo `Paciente` (DNI único, `telefono`, `obraSocialId?`, `nroAfiliado?`).
- Puertos (`src/application/ports/`): repositorios de sillón, prestación, profesional, bloqueo, paciente y turno (`guardar`, `actualizar`, `buscarPorId`, `listarActivos(filtro)`; el puerto de turnos usa un tipo estructural mínimo `TurnoRegistro`, no el `Turno` completo que crea C-02), `Clock` y `Auditoria` (solo `registrar`).
- Infraestructura (`src/infrastructure/`): repos en memoria, reloj de sistema y reloj fijo (`SIM_NOW`), seed ficticio (2 sillones, 2 profesionales lun-vie 9-13 y 14-19, 5 prestaciones, ~10 pacientes, bloqueo diario "reservado urgencias", usuarios admin/recepción/2 odontólogos).
- API (`src/api/`): `createApp(deps)`, middleware de rol simulado (`X-Usuario`/`X-Rol`), mapeo de errores (regla → 409, entrada → 400, permiso → 403), `GET /api/health`, `GET /api/catalogo`; `src/server.ts`.
- Estáticos base: `public/styles/tokens.css` (paleta y tipografías claro/oscuro del prototipo) y `public/js/api.js` (fetch con headers de rol).

Fuera de alcance: reglas de turnos (C-02), endpoints de alta/edición de configuración (C-07) y de pacientes (C-08), cualquier pantalla de UI.

## Capabilities

### New Capabilities
- `intervalo-y-bloques`: intervalo semiabierto `[inicio, fin)`, detección de solapamiento y alineación a bloques de 15 minutos (RN-AG-01, RN-AG-03, RN-DA-03).
- `catalogo-configuracion`: modelo de sillones, prestaciones (duración múltiplo de 15 — RN-CF-01), profesionales con disponibilidad y bloqueos; seed de configuración y `GET /api/catalogo`.
- `salud-api`: composición de la API (`createApp(deps)`), `GET /api/health`, rol simulado por headers y mapeo uniforme de errores a 409/400/403.
- `datos-ficticios`: el seed (pacientes y usuarios incluidos) solo contiene datos evidentemente ficticios (RN-DA-01); DNI único de paciente.
- `persistencia-en-memoria`: comportamiento de los repositorios en memoria (turnos: guardar, buscar por id, listar activos con filtros) y de la auditoría de solo inserción (DD-03, RN-AG-10).

### Modified Capabilities
- Ninguna (no hay specs previas en `openspec/specs/`).

## Impact

- **Código nuevo**: todo lo listado en la Zona de C-01 (`package.json`, `tsconfig.json`, `vitest.config.ts`, `README.md`, `src/**` de shared/configuracion/pacientes/ports/infrastructure/api, `public/styles/`, `public/js/api.js`, `tests/`).
- **Dependencias**: `express`, `typescript`, `tsx` (dev server), `vitest`, `supertest`, `@types/*`. Sin librería de validación por ahora (validación manual; ver design).
- **API**: nuevos `GET /api/health` y `GET /api/catalogo`; contrato de errores `{ error: { regla, mensaje, dimension?, conflicto? } }` que heredan todos los changes siguientes.
- **Equipo**: al mergear se abre GATE 1; los archivos compartidos pasan a modificarse solo de forma aditiva con revisión del team lead. Governance HIGH.

## Ajustes tras revisión (2026-11-22)

1. **Se elimina el tipo `Turno` completo de C-01** (`src/domain/shared/turno.ts`). `TurnoRepository` declara en `src/application/ports/` un tipo estructural mínimo `TurnoRegistro` (`id, profesionalId, sillonId, pacienteId, inicio, fin, estado`). Motivo: colisión con la Zona de C-02 (CHANGES.md), que crea el `Turno` completo en `src/domain/agenda/turno.ts`; dos tipos `Turno` serían ambiguos.
2. **`persistencia-en-memoria` se reduce a 3 escenarios** (guardar/buscar por id, listar activos filtrado, auditoría solo-inserción); se eliminan los demás y sus tareas. Motivo: inflación de alcance respecto de la ficha del change.
