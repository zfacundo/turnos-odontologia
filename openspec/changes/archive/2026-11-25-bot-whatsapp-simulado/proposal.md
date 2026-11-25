# Proposal

## Why

El Discovery muestra que el diferencial ante el paciente es reservar y confirmar sin llamar al consultorio, con un bot que **solo ofrece horarios reales** (escenas 1 y 2 del prototipo). Hoy la agenda ya calcula huecos (C-05), crea turnos (C-02), confirma y cancela (C-03) y registra pacientes (C-08), pero no hay ningún canal de paciente que use esas piezas juntas.

**Justificación**: C-06 cierra el camino crítico del TP. Con GATE 3 cumplido (C-05 y C-08 en `master`) se puede demostrar de punta a punta que un turno pedido por "WhatsApp" aparece en la agenda real, sin integraciones reales (RN-SM-04).

## What Changes

- Máquina de estados pura de la conversación del paciente: menú → tipo de consulta → profesional → hasta 3 horarios libres + "Ver más días" → identificación (por teléfono, o con nombre y DNI) → tarjeta "Turno reservado". Por "Ver o cambiar mi turno": Confirmo / Necesito cambiarlo / Cancelar turno.
- Orquestación que ejecuta los **mismos casos de uso** que recepción (RN-WA-02): `consultarHuecos`, `registrarPaciente`, `crearTurno` (origen `whatsapp`), `cambiarEstadoTurno` (confirmar) y `cancelarTurno`, actuando como un usuario simulado con rol `paciente`, de modo que la ventana de 24 h (RN-AG-06) aplica igual que en el resto del sistema.
- API simulada: `POST /api/sim/whatsapp/mensaje` (el paciente se identifica por un teléfono ficticio) y `POST /api/sim/whatsapp/recordatorio` (botón de demo "Enviar recordatorio 24 h"). Ambas responden con `simulado: true` y el aviso de simulación.
- Pantalla `public/bot.html` + `public/js/bot.js`: chat estilo prototipo con el rótulo fijo **"Simulación — no es WhatsApp real"** (RN-WA-04), selector de teléfono ficticio y botón de recordatorio, según el design system aprobado (revisión 1) y los mockups de este change.
- "Necesito cambiarlo" responde por ahora que se comunique con recepción; se conecta a `reprogramarTurno` en un PR chico cuando C-04 esté en `master`.

**Fuera de alcance** (según la ficha): API real de WhatsApp/Meta, urgencia del día (US-053, por eso Urgencia no se ofrece como tipo de consulta), "Hablar con la doctora" (US-054), recordatorio automático por reloj, lista de espera, reprogramar (C-04), marcar celdas "Ofrecido" en la agenda y escribir en el registro "Lo que hizo el sistema" (C-09).

## Capabilities

### New Capabilities
- `bot-whatsapp`: conversación simulada del paciente por WhatsApp para reservar, confirmar y cancelar turnos contra la agenda real, con su API y su pantalla rotuladas como simulación.

### Modified Capabilities
<!-- Ninguna: `disponibilidad`, `agenda-turnos` y la ficha de pacientes se usan tal cual, sin cambiar sus requisitos. -->

## Impact

- **Zona (nuevo)**: `src/simulators/whatsapp/`, `public/bot.html`, `public/js/bot.js`, `tests/simulators/whatsapp/`.
- **Archivo compartido (solo aditivo, revisión del team lead)**: `src/api/app.ts`, un import y una línea para montar el router del bot.
- **API pública**: dos endpoints nuevos bajo `/api/sim/whatsapp/`. Sin dependencias nuevas ni llamadas de red salientes.
- **Dependencias**: C-02, C-03, C-05 y C-08 ya en `master`. C-04 queda pendiente solo para "Necesito cambiarlo".
