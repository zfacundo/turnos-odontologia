# Proposal

## Why

El consultorio necesita crear turnos sin choques por profesional, por sillón ni por paciente; hoy el proyecto tiene el modelo base (C-01) pero ningún turno se puede crear. Este es el diferencial del producto (DD-01) y el primer change OPSX obligatorio del TP.

**Justificación**: C-02 está en el camino crítico y es bloqueante — define el `Turno` completo y la validación pura que reutilizan cancelar (C-03), reprogramar (C-04), huecos libres (C-05) y el bot (C-06). Al mergearse abre GATE 2 y habilita el trabajo en paralelo del resto del equipo.

## What Changes

- Tipo de dominio `Turno` completo (estado `reservado` al crear, `senado: false`, `esSobreturno: false`, `origen`, `creadoPor`, `creadoEn`) para que C-03..C-12 no editen el tipo.
- Validación pura de un turno candidato: calcula `fin = inicio + duración` (RN-AG-11, RN-AG-03), exige alineación a 15 min (RN-AG-03), exige franja del profesional y ausencia de bloqueos de profesional/sillón/globales (RN-AG-04), sin solapamiento por profesional y por sillón (RN-AG-02 con semántica RN-AG-01) ni por paciente (RN-AG-05); ignora cancelados (RN-AG-10). Recibe los turnos existentes ya filtrados, para que C-04 la reutilice excluyendo el propio turno (RN-AG-12).
- Caso de uso de creación: carga contexto de los repositorios, valida, guarda, registra auditoría (RN-AU-01) y controla permiso por rol (recepción, admin y paciente crean; odontólogo no).
- API: `POST /api/turnos` (201 / 400 / 403 / 409 con regla, dimensión y turno en conflicto — DD-08) y `GET /api/turnos?desde&hasta&profesionalId&sillonId`.

**Fuera de alcance** (según la ficha): sobreturno (C-13), cancelar / reprogramar / cambios de estado (C-03, C-04), huecos libres (C-05), UI.

## Capabilities

### New Capabilities
- `agenda-turnos`: alta y consulta de turnos de la agenda con validación de reglas RN-AG-01..05, 10..12, permiso por rol y auditoría del alta.

### Modified Capabilities
<!-- Ninguna: `intervalo-y-bloques`, `persistencia-en-memoria` y `salud-api` se reutilizan sin cambiar sus requisitos. -->

## Impact

- **Zona (nuevo)**: `src/domain/agenda/turno.ts`, `src/domain/agenda/validarNuevoTurno.ts`, `src/application/agenda/crearTurno.ts`, `src/api/routes/turnos.ts` y sus tests en `tests/domain/agenda/`, `tests/application/agenda/`, `tests/api/turnos.test.ts`.
- **Archivos compartidos (solo aditivo, revisión del team lead)**: `src/api/app.ts` (montar el router de turnos); `src/application/ports/repositorios.ts`, `src/infrastructure/memory/turno-repository.ts` y `src/api/deps.ts` (parámetro de tipo opcional para que el repositorio devuelva el `Turno` completo; ver design.md D2).
- **API pública**: nuevos endpoints `POST /api/turnos` y `GET /api/turnos`. Sin dependencias nuevas.
