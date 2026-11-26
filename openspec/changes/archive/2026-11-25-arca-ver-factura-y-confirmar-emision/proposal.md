# Proposal

## Why

En la pantalla del simulador de ARCA (`/sim/arca.html`, C-12) la factura emitida solo se ve en el momento de emitirla: si se recarga la página no hay forma de volver a verla, y tampoco se puede ver cómo va a quedar el comprobante antes de emitirlo. Además, "Emitir factura C" emite con un solo clic, sin confirmación, y la emisión no se puede deshacer (un turno se factura una sola vez). El team lead pidió un botón "Ver factura" junto a "Emitir factura C", que funcione esté o no emitida la factura, y una ventana flotante que confirme la emisión.

## What Changes

- **Nuevo endpoint de solo lectura** `GET /api/sim/arca/facturas/:turnoId` en el router del simulador de ARCA, con los mismos roles que la emisión (`admin`, `recepcion`; si no, `403`) y `404` si el turno no existe:
  - si el turno ya tiene factura → `200` con `estado: "emitida"` y la factura guardada;
  - si no → `200` con `estado: "vista-previa"`, un borrador del comprobante sin número, sin CAE y sin vencimiento del CAE, `emitible` (`true` solo si el turno está `atendido`) y, si no es emitible, `motivo` con la regla `RN-SM-03`.
  - El borrador lo arma una función pura que comparte la construcción del comprobante con `emitirFacturaC` (sin duplicar lógica). Ver la factura MUST NOT guardar, consumir número ni auditar.
- **Botón "Ver factura"** al lado de "Emitir factura C" en `/sim/arca.html`:
  - factura emitida → muestra el comprobante guardado (mismo dibujo que al emitir), deshabilita "Emitir factura C" y avisa "Este turno ya tiene factura";
  - sin emitir → muestra el comprobante con el rótulo "VISTA PREVIA — no emitida", con "—" en número, CAE y vencimiento, sin "Imprimir";
  - turno no `atendido` → la vista previa se muestra igual, con un aviso visible de que no se puede emitir hasta que el turno esté atendido.
- **Ventana de confirmación** al tocar "Emitir factura C": un `<dialog>` modal titulado "¿Emitir Factura C?" con paciente, prestación e importe, que advierte que la emisión (simulada) no se puede deshacer. "Cancelar" (foco inicial) y `Escape` cierran sin emitir y devuelven el foco al botón; solo "Emitir" hace el `POST`. Respeta `prefers-reduced-motion`.
- **Estado inicial (decisión del team lead, 2026-11-25)**: al cargar con `?turnoId=`, la pantalla consulta la factura una vez: si está emitida, deshabilita "Emitir factura C" con la nota "Este turno ya tiene factura" (el comprobante se ve con "Ver factura"); si la vista previa no es emitible, lo deshabilita con el motivo; si es emitible, lo deja habilitado. La ventana de confirmación no se abre para un turno no emitible (y su "Emitir" se deshabilita si llegara a estarlo). Ante un `409 ya facturado` del `POST`, se muestra la factura existente.
- La pantalla sigue llamando solo a rutas relativas del simulador (`/api/sim/arca/facturas` y `/api/sim/arca/facturas/<turnoId>`), con el rol `recepcion`, sin URLs absolutas.
- Fuera de alcance: listar todas las facturas, anular o emitir nota de crédito, persistir más allá de la memoria, cambios en el panel de administración (lo cubre el change `panel-boton-emitir-factura`).

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `factura-c-simulada`: se agregan la consulta de la factura de un turno (emitida o vista previa), el botón "Ver factura" y la confirmación modal de la emisión; se modifica el requisito "Pantalla del comprobante simulado" para permitir la nueva ruta de lectura del simulador.

## Impact

- **Código (Zona de C-12, Integrante 5; lo cambia el team lead)**: `src/simulators/arca/facturaC.ts` (tipo del borrador), `src/simulators/arca/emitirFacturaC.ts` (extraer la construcción compartida), nuevo `src/simulators/arca/verFacturaC.ts`, `src/simulators/arca/router.ts` (ruta `GET`), `public/sim/arca.html`.
- **Tests**: nuevos `tests/simulators/arca/verFacturaC.test.ts` y casos en `api.test.ts`; se ajusta `tests/simulators/arca/pantalla.test.ts` (hoy exige que la única llamada sea `POST /api/sim/arca/facturas`). Deben seguir en verde `sin-red.test.ts`, `tests/api/admin-estaticos.test.ts` y `tests/api/sin-enlaces-viejos.test.ts`.
- **API**: ruta nueva, aditiva; el `POST` existente no cambia.
- **Dependencias**: ninguna nueva. Sin red real (RN-SM-04).
- **Governance**: MEDIUM (API de un simulador y UI de la zona de otro integrante).
