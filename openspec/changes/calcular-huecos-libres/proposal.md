# Proposal

## Why

Recepción y el bot de WhatsApp simulado (C-06) necesitan ofrecer **solo horarios que realmente se pueden reservar**. Hoy el sistema valida un turno recién cuando se intenta crear (C-02), pero no tiene forma de listar los huecos libres de un día. Sin ese cálculo, el bot tendría que usar una lista estática, lo que viola RN-WA-01.

**Justificación**: C-05 está en GATE 2 y es prerrequisito de C-06 (bot WhatsApp simulado) y de GATE 3. Reutiliza `validarNuevoTurno` de C-02, de modo que un hueco ofrecido y un alta aceptada salen del **mismo motor** (US-014).

## What Changes

- Función pura de dominio `calcularHuecos`. Recorre las franjas de disponibilidad del profesional para la fecha pedida en pasos de 15 minutos y prueba los sillones activos en orden por id. Valida cada candidato con `validarNuevoTurno`, que aplica la franja, los bloqueos y el solapamiento por profesional y por sillón (RN-AG-01..04, RN-AG-10). Devuelve `{ inicio, fin, sillonId }[]` ordenado por inicio, **un hueco por horario** con el primer sillón libre.
- Solo se devuelven los huecos cuyo inicio sea igual o posterior a la hora del `Clock` inyectado, para que nunca se ofrezcan horarios pasados.
- Caso de uso `consultarHuecos`. Controla el permiso: cualquier rol puede consultar y una request sin usuario se rechaza. Resuelve la prestación, el profesional y los sillones activos (un id inexistente se rechaza como error de entrada). Carga los bloqueos y los turnos activos del día y delega en el dominio.
- API: `GET /api/disponibilidad?prestacionId&profesionalId&fecha=YYYY-MM-DD`, que responde `200` con `{ huecos }`, `400` ante entrada inválida y `403` cuando no hay usuario.

**Fuera de alcance** (según la ficha): UI, bot (C-06), huecos de varios días ("Ver más días" lo resuelve el bot pidiendo otra fecha), búsqueda en todos los profesionales (`profesionalId` es obligatorio) y la validación por paciente (RN-AG-05), que sigue haciéndose al crear el turno.

## Capabilities

### New Capabilities
- `disponibilidad`: cálculo y consulta de los huecos libres de un profesional para una prestación y una fecha, consistente con la validación de alta de turnos.

### Modified Capabilities
<!-- Ninguna: `agenda-turnos` (validarNuevoTurno) e `intervalo-y-bloques` se reutilizan sin cambiar sus requisitos. -->

## Impact

- **Zona (nuevo)**: `src/domain/agenda/huecos.ts`, `src/application/agenda/consultarHuecos.ts`, `src/api/routes/disponibilidad.ts`, `tests/domain/agenda/huecos.test.ts`, `tests/api/disponibilidad.test.ts`.
- **Archivo compartido (solo aditivo, revisión del team lead)**: `src/api/app.ts`, una línea para montar el router de disponibilidad.
- **API pública**: nuevo endpoint `GET /api/disponibilidad`, consumido por C-06. Sin dependencias nuevas.
