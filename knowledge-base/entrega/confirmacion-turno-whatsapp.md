# Entrega: confirmacion-turno-whatsapp

Change OPSX `confirmacion-turno-whatsapp` (capability `vista-agenda`, governance MEDIUM). Spec retroactivo y refactor de la confirmación simulada por WhatsApp que el PR #35 (Integrante 4) agregó sin change ni spec.

## Qué se hizo

- Spec retroactivo (3 requisitos ADDED en `vista-agenda`): confirmación al crear turno desde recepción/admin, texto exacto, y que una falla del aviso no afecta el alta.
- Corrección del texto: `¡Te esperamos!` (antes salía `?Te esperamos!`). Acentos rotos de los comentarios eliminados junto con el bloque inline.
- Lógica sacada de la ruta:
  - `src/simulators/whatsapp/bandejaSimulada.ts` (nuevo): bandeja neutral (`registrarMensajeSimulado` / `consultarMensajesSimulados`).
  - `src/simulators/whatsapp/avisosCancelacion.ts`: misma API pública, ahora delega en la bandeja.
  - `src/simulators/whatsapp/confirmacionTurno.ts` (nuevo): `mensajeConfirmacionTurno` (pura) y `registrarConfirmacionTurno` (nunca lanza, devuelve boolean).
  - `src/api/routes/turnos.ts` (archivo compartido, revisión del team lead): `POST /turnos` solo llama `registrarConfirmacionTurno(deps, resultado.valor, usuario)` tras el alta.
- Sin cambios en `GET /api/sim/whatsapp/avisos` ni en `public/js/bot.js`.

## Cómo se verificó

- Strict TDD: línea base 1284 tests; ahora 1307 (92 archivos) en verde; `npm run typecheck` sin errores; `openspec validate confirmacion-turno-whatsapp --strict` válido.
- Tests nuevos: `tests/simulators/whatsapp/bandejaSimulada.test.ts`, `tests/simulators/whatsapp/confirmacionTurno.test.ts`, `tests/api/confirmacion-turno-whatsapp.test.ts`. Los tests existentes (`avisosCancelacion`, etc.) no se modificaron.
- **Navegador (6.2)**: hecho por el team lead el 2026-11-26. Se creó un turno desde la agenda como recepción y la burbuja termina en «¡Te esperamos!». Otro teléfono no ve el aviso, y al cancelar aparecen confirmación y cancelación en orden.
- **Corrección relacionada (6.4)**: el separador del selector de teléfonos del bot salía como "?"; se restauró " · " en `public/js/bot.js`, con 2 tests nuevos. También se corrigió el comentario "v?lidos" de `clientes.js`. Suite: 1309 tests en verde.

## Qué sigue

- PR con la plantilla, revisión del team lead, merge y `/opsx:archive`.

## Preguntas abiertas

- `GET /api/sim/whatsapp/contactos` devuelve teléfonos sin enmascarar (fuera de alcance).
- ¿Extraer también el aviso de cancelación inline de `POST /turnos/:id/cancelar` a `simulators/whatsapp/`? Candidato a un change posterior.
