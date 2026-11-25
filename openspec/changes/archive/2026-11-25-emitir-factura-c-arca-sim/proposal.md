# Proposal

## Why

Recepción necesita emitir una "Factura C" para un turno atendido y mostrar el comprobante (US-062, RN-SM-03). La demo del TP tiene que cerrar el circuito del consultorio (atender y facturar) sin conectarse con ARCA, que pide certificados y homologación (DD-02, RN-SM-04). Hoy un turno puede quedar `atendido` (C-03), pero no hay forma de facturarlo.

**Por qué este change ahora**: C-12 es el segundo change asignado a Integrante 5. Depende solo de C-02, y C-03 ya está mergeado, así que la demo puede ir de punta a punta. Reutiliza el patrón de simulador de C-11 (módulo propio y router montado con una línea), casi no sale de su Zona y tiene governance LOW, porque el comprobante no tiene validez fiscal.

## What Changes

- Nuevo endpoint `POST /api/sim/arca/facturas` con cuerpo `{ turnoId }`. Solo lo pueden usar los roles `admin` y `recepcion`; `odontologo`, `paciente` o un pedido sin rol reciben `403`.
- Se puede facturar un turno solo si está `atendido` (SU-07). Los turnos `reservado`, `confirmado`, `cancelado` y `ausente` reciben `409` con la regla `RN-SM-03` y un mensaje que cita SU-07. Si el turno ya tiene factura, también es `409` `RN-SM-03` ("turno ya facturado"), con el `facturaId` de la factura existente en `conflicto`. Un turno inexistente da `404` y un cuerpo inválido, `400`.
- Cada factura emitida (`simulado: true`) tiene:
  - número correlativo `PPPPP-NNNNNNNN`, con punto de venta ficticio `00001` y contador desde 1;
  - CAE ficticio de 14 dígitos, que se arma de forma determinística a partir de la fecha, el punto de venta y el número;
  - fecha de emisión y vencimiento del CAE (emisión + 10 días, calendario de Argentina);
  - importe ficticio fijo;
  - emisor ficticio ("Consultorio Ficticio", CUIT falso, Monotributo);
  - receptor "Consumidor Final", con el nombre del paciente y el DNI enmascarado.
- Un pedido fallido no consume número.
- Cada emisión se audita con la acción `factura_emitida` sobre el turno.
- La respuesta `201` lleva `simulado: true` y el aviso "SIMULACIÓN — sin validez fiscal".
- Nueva pantalla `public/sim/arca.html?turnoId=…`. Emite la factura con el POST y muestra un comprobante imprimible con el rótulo "SIMULACIÓN — sin validez fiscal". Su mockup se aprueba antes de apply.
- El módulo no hace ningún request de red, y un test lo verifica.
- Fuera de alcance:
  - web services, certificados o padrones reales de ARCA/AFIP;
  - Factura A/B y notas de crédito o anulación;
  - `GET` de facturas y reimpresión;
  - importe por prestación y copago de obra social;
  - persistencia de la numeración entre reinicios.

## Capabilities

### New Capabilities
- `factura-c-simulada`: emisión de la Factura C de un turno con el simulador de ARCA. Cubre quién puede emitirla, sobre qué turnos, cómo se numera y se arma el CAE con su vencimiento, qué datos de emisor y receptor lleva, qué se audita y cómo se rotula la simulación en la API y en la pantalla.

### Modified Capabilities
_(ninguna: `agenda-turnos` no cambia; este change solo lee el turno y no lo modifica)._

## Impact

- **Código nuevo (Zona de C-12)**: `src/simulators/arca/` (dominio, caso de uso, repositorio en memoria con el contador y router), `public/sim/arca.html`, `tests/simulators/arca/`.
- **Compartido, solo aditivo**: en `src/api/app.ts`, el `import` y una línea de `app.use` para montar el router.
- **Se usan sin modificarlos**: `TurnoRepository<Turno>` (`buscarPorId`), `PacienteRepository` (`buscarPorId`), `Clock`, `Auditoria` y `pacientePublico` de C-08 (para enmascarar el DNI).
- **Diseño (gate visual)**: el mockup de `arca.html` va en `openspec/changes/emitir-factura-c-arca-sim/mockups/`, sobre el design system Revisión 1, y necesita aprobación antes de apply.
- **Nota para el team lead**: la línea base de `master` sigue con 14 tests en rojo (`odontograma` y `auditoria`), ajenos a C-12.
- Sin dependencias nuevas ni llamadas de red.
