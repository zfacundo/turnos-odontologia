## MODIFIED Requirements

### Requirement: Contrato de la API simulada
`POST /api/sim/whatsapp/mensaje` y `POST /api/sim/whatsapp/recordatorio` SHALL responder `200` con `simulado: true`, el aviso "Simulación — no es WhatsApp real", los mensajes del bot, las opciones y si se espera texto. MUST responder `400` con `error.tipo` `entrada` si no llega exactamente uno de `telefono` o `pacienteId`, si el teléfono no tiene el formato ficticio, si el paciente no existe o no tiene teléfono, o si el mensaje no trae exactamente uno de opción o texto.

#### Scenario: Respuesta rotulada como simulación
- **WHEN** el paciente `+54 9 11 0000-0001` escribe "hola"
- **THEN** la respuesta es `200` con `simulado: true` y `aviso` "Simulación — no es WhatsApp real"

#### Scenario: Teléfono real o inválido rechazado
- **WHEN** se envía un mensaje desde el teléfono `+54 9 11 4321-0000`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

#### Scenario: Mensaje sin opción ni texto
- **WHEN** se envía un mensaje con teléfono válido y sin `opcionId` ni `texto`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

#### Scenario: Paciente identificado por id
- **WHEN** se envía un mensaje con `pacienteId` `pac-01` y texto "hola"
- **THEN** la respuesta es `200` con `simulado: true` y `aviso` "Simulación — no es WhatsApp real"

#### Scenario: Teléfono y paciente a la vez
- **WHEN** se envía un mensaje con `telefono` `+54 9 11 0000-0001` y `pacienteId` `pac-01`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`
