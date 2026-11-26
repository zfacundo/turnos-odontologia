## Why

En el bot de WhatsApp simulado, el paciente que entra en un paso no siempre puede volver al paso anterior: solo "Revisar el horario" tiene "Volver atrás", y varios pasos (tipo de consulta, profesional, horarios, datos) no tienen "Volver al menú". Integrante 2 pidió el 2026-11-25 que cada paso con opciones ofrezca volver al menú y que siempre se pueda volver atrás.

## What Changes

- Cada paso del bot distinto del menú agrega al final una fila de navegación con "Volver atrás" (si corresponde) y "Volver al menú".
- "Volver atrás" lleva al paso anterior: profesional → tipo de consulta, horarios → profesional, datos → resumen del horario, pantalla de pago → paso desde el que se abrió.
- Cuando el paso anterior es el menú, solo aparece "Volver al menú", para no mostrar dos botones que hacen lo mismo.
- Después de una acción ya hecha (turno reservado, seña pagada, turno confirmado o cancelado, cobertura mostrada) no aparece "Volver atrás": volver no deshace la acción y podría duplicar una reserva.
- No se agrega un botón "Salir" (pedido de Integrante 2).
- "Consultar mi obra social" pide confirmar el número de afiliado escrito ("Confirmar" / "Volver atrás") antes de consultar el padrón.
- En la pantalla, los botones de navegación se ven como secundarios (borde neutro).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `bot-whatsapp`: nuevos requisitos "Navegación en cada paso" y "Volver atrás". El menú inicial no cambia. Se modifica "Consultar mi obra social" (confirmación del número).

## Impact

- Código:
  - `src/simulators/whatsapp/conversacion.ts`, que es la máquina de estados;
  - `public/js/bot.js`, que da el estilo secundario a los botones `atras` y `menu`;
  - `public/bot.html`, donde va la regla CSS `.chip.nav`.
- Todo está dentro de la Zona del bot. No cambian la API, los efectos ni los casos de uso.
- Tests: `tests/simulators/whatsapp/` (conversación, bot, API y pantalla). Los tests que comparan listas exactas de opciones pasan a incluir la fila de navegación.
