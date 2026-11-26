# Proposal

## Why

El PR #35 (commit `ab56c0e`, Integrante 4) agregó una confirmación simulada por WhatsApp al crear un turno **sin change OPSX ni spec** (viola la regla dura 12). Además la lógica quedó escrita dentro de la ruta Express `POST /turnos` de `src/api/routes/turnos.ts`, reutiliza la función de avisos de **cancelación** para registrar una **confirmación**, y el mensaje sale con un `?` literal en lugar de `¡` («?Te esperamos!»). El team lead pidió corregir el texto, darle change y spec a la función y sacar la lógica de la ruta.

## What Changes

- **Spec retroactivo** del comportamiento existente: cuando recepción o administración crean un turno de origen recepción, el sistema registra una confirmación en el WhatsApp simulado del paciente. Se documentan los casos en que NO se registra (origen WhatsApp/teléfono, rol paciente, paciente sin teléfono, alta rechazada) y que una falla del aviso no deshace el alta.
- **Corrección del texto**: el mensaje termina en `¡Te esperamos!` (antes `?Te esperamos!`). Se corrigen también los acentos rotos en comentarios (`recepci?n`, `confirmaci?n`).
- **Refactor sin cambio de contrato HTTP**: la lógica se mueve a `src/simulators/whatsapp/confirmacionTurno.ts` (constructor de mensaje puro + función de registro). La ruta `POST /turnos` solo la invoca tras un alta exitosa.
- **Nombre neutral para la bandeja simulada**: se extrae una bandeja genérica de mensajes simulados usada por la confirmación y por el aviso de cancelación; el aviso de cancelación conserva exactamente su comportamiento y su API pública.
- Sin cambios en `GET /api/sim/whatsapp/avisos` ni en la pantalla del bot (`public/js/bot.js`): la confirmación ya se muestra como burbuja del bot.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `vista-agenda`: se agregan (ADDED) requisitos de confirmación simulada por WhatsApp al crear un turno desde recepción, junto al requisito hermano «Cancelación desde la agenda y aviso simulado» que ya vive en esta capability. No se modifica ningún requisito existente.

## Impact

- **Código**: `src/api/routes/turnos.ts` (archivo compartido; cambio acotado al bloque `CONFIRMACION_AGENDA_WHATSAPP` y al import), `src/simulators/whatsapp/avisosCancelacion.ts` (delegación a la bandeja genérica, misma API), nuevos `src/simulators/whatsapp/bandejaSimulada.ts` y `src/simulators/whatsapp/confirmacionTurno.ts`.
- **Tests**: nuevos tests unitarios y de API; `tests/simulators/whatsapp/avisosCancelacion.test.ts` debe seguir verde sin cambios.
- **API**: sin cambios de contrato. Único cambio observable: el texto de la confirmación (`¡` en lugar de `?`).
- **Governance**: MEDIUM (lógica de simulador + archivo compartido `turnos.ts`, revisión del team lead).
- **Fuera de alcance**: que `GET /api/sim/whatsapp/contactos` exponga teléfonos sin enmascarar (queda como pregunta abierta); el bloque inline del aviso de cancelación en la ruta `POST /turnos/:id/cancelar`; las propuestas abiertas `registro-sistema-legible` y `bot-whatsapp-reprogramar-turno`.
