## Why

El bot de WhatsApp simulado (C-06) reserva, confirma y cancela, pero el paciente no puede pagar la seña ni consultar su obra social desde el chat, y una seña pagada no se distingue en la agenda. Además, al tocar un horario el turno se reserva sin un paso de revisión, y "Necesito cambiarlo" solo deriva a recepción. Integrante 2 pidió (2026-11-25) conectar el bot con la seña y la agenda, sumar la consulta de obra social, quitar "Necesito cambiarlo" y agregar "Confirmar" / "Volver atrás" al elegir fecha y hora.

## What Changes

- **Revisión del horario**: al elegir fecha y hora, el bot muestra un resumen (fecha, hora, prestación y profesional) con "Confirmar turno" y "Volver atrás". Recién al confirmar se identifica al paciente y se reserva. "Volver atrás" vuelve a mostrar los mismos horarios.
- **Pagar seña (Mercado Pago SIMULADO)**: después de reservar, y en "Ver mi turno" si el turno no está señado, el bot ofrece "Pagar seña". El pago muestra el monto ficticio y deja elegir "Aprobar pago (simulación)" o "Rechazar pago (simulación)". Usa el caso de uso `pagarSena` de C-11: aprobado marca el turno `senado: true`; rechazado no lo cambia.
- **Consultar mi obra social**: nueva opción del menú. El paciente escribe su número de afiliado y el bot responde con obra social, plan, cobertura, copago y estado, usando `consultarAfiliado` y el padrón ficticio de C-08. Número inexistente → lo vuelve a pedir; falla simulada del padrón → lo informa.
- **BREAKING** (solo del bot): se quita "Necesito cambiarlo" del turno y del recordatorio. La opción del menú pasa a llamarse "Ver mi turno".
- **Agenda**: la tarjeta de un turno señado muestra "Seña pagada".

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `bot-whatsapp`: menú con "Consultar mi obra social", revisión del horario antes de reservar, pago de seña simulado, gestión sin "Necesito cambiarlo".
- `vista-agenda`: la tarjeta del turno indica si la seña está pagada.

## Impact

- Código (Zona del bot): `src/simulators/whatsapp/conversacion.ts`, `bot.ts`, `router.ts`; `public/bot.html`, `public/js/bot.js`; `tests/simulators/whatsapp/`.
- Reutiliza sin modificar: `src/simulators/mercadopago/pagarSena.ts` (C-11) y `src/simulators/obras-sociales/consultarAfiliado.ts` + `padronRepository.ts` (C-08).
- Fuera de la Zona, aditivo y para revisión del team lead: una línea en `public/js/agenda.js` (C-09) para mostrar "Seña pagada".
- API: `POST /api/sim/whatsapp/mensaje` mantiene el contrato; cambian las opciones y los mensajes que devuelve. Sin dependencias nuevas ni red saliente.
