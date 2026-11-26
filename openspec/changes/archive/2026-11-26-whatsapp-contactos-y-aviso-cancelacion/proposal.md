## Why

Quedaron dos pendientes abiertos del WhatsApp simulado tras los PR #18, #35 y el change `confirmacion-turno-whatsapp`:

- **A. Privacidad.** `GET /api/sim/whatsapp/contactos` (PR #35) devuelve `{ id, nombre, telefono }` de **todos** los pacientes, con el teléfono completo y sin control de rol. El resto de la API enmascara DNI y teléfono (`pacientePublico`: `GET /api/pacientes`, Factura C con `99****05`). Aunque todos los datos son ficticios (RN-DA-01), el principio del proyecto es no exponer datos personales completos.
- **B. Lógica en la ruta.** `POST /api/turnos/:id/cancelar` sigue armando el aviso de cancelación inline en `src/api/routes/turnos.ts`, mientras que la confirmación ya se extrajo a `src/simulators/whatsapp/confirmacionTurno.ts` (función pura + registro que nunca lanza).

## What Changes

- **A (recomendado, opción 1 de `design.md`):**
  - **BREAKING (contrato del simulador)**: `GET /api/sim/whatsapp/contactos` deja de devolver `telefono` y devuelve `{ id, nombre, telefonoEnmascarado }` (formato de `pacientePublico`, p. ej. `+54 9 11 0000-**01`).
  - `POST /api/sim/whatsapp/mensaje`, `POST /api/sim/whatsapp/recordatorio` y `GET /api/sim/whatsapp/avisos` aceptan **exactamente uno** de `telefono` o `pacienteId`; con `pacienteId` el servidor resuelve el teléfono internamente. `telefono` se mantiene (compatibilidad con los tests de contrato y con el flujo de número nuevo del bot).
  - `public/js/bot.js`: el selector usa el `id` del paciente como valor, muestra `telefonoEnmascarado · nombre`, y el chat, el recordatorio 24 h y el sondeo de avisos se identifican con `pacienteId`.
- **B:**
  - Nuevo `src/simulators/whatsapp/cancelacionTurno.ts` con `mensajeCancelacionTurno(...)` (pura) y `registrarAvisoCancelacionTurno(deps, turno, registrar?)` (nunca lanza).
  - `POST /api/turnos/:id/cancelar` queda con una única llamada antes del `200`. Texto y condiciones del aviso **idénticos** a hoy.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `sincronizacion-pacientes-whatsapp`: el listado de contactos muestra el teléfono enmascarado (MODIFIED) y el contacto se identifica por paciente (ADDED).
- `bot-whatsapp`: el contrato de la API simulada acepta `telefono` o `pacienteId` (MODIFIED «Contrato de la API simulada»).
- `vista-agenda`: texto exacto del aviso de cancelación y que su falla no afecta la cancelación (ADDED, espejo de la confirmación).

## Impact

- Código: `src/simulators/whatsapp/router.ts`, nuevo `src/simulators/whatsapp/contactoSimulado.ts`, nuevo `src/simulators/whatsapp/cancelacionTurno.ts`, `src/api/routes/turnos.ts` (archivo compartido, cambio acotado), `public/js/bot.js`.
- Tests: nuevos en `tests/simulators/whatsapp/` y `tests/api/`; se ajusta solo la aserción de `tests/simulators/whatsapp/pantalla.test.ts` sobre el formato de la opción (cambia por spec). `api.test.ts`, `avisosCancelacion.test.ts` y `confirmacion-turno-whatsapp.test.ts` deben seguir verdes sin cambios.
- Zonas: A toca el contrato del simulador de WhatsApp (zona de Integrante 2) y la pantalla del bot sincronizada por el PR #35 (Integrante 4). **Governance HIGH para A** → requiere aprobación del team lead de Q-1 antes de Apply. **MEDIUM para B**.
- Dependencia: el Apply parte del trabajo de `confirmacion-turno-whatsapp` (hoy sin commitear: `bandejaSimulada.ts`, `turnos.ts`, `bot.js`); debe estar commiteado/mergeado antes.
- Sin cambios de dominio, de persistencia ni de reglas de negocio.
