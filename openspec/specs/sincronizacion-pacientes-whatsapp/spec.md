# sincronizacion-pacientes-whatsapp Specification

## Purpose
TBD - created by archiving change sincronizar-pacientes-whatsapp. Update Purpose after archive.

## Requirements

### Requirement: Sincronización de pacientes y WhatsApp

El sistema SHALL obtener los contactos del WhatsApp simulado desde el mismo repositorio de pacientes utilizado por el panel Clientes. `GET /api/sim/whatsapp/contactos` SHALL responder con `simulado: true` y, por cada paciente, solo `id`, `nombre` y `telefonoEnmascarado` (mismo formato que el resto de la API, p. ej. `+54 9 11 0000-**01`). La respuesta MUST NOT incluir el teléfono completo de ningún paciente.

#### Scenario: Mostrar pacientes existentes
- **WHEN** se abre el WhatsApp simulado
- **THEN** se muestran los pacientes registrados con su nombre y su teléfono enmascarado
- **AND** no aparecen contactos definidos manualmente que no existan en Clientes

#### Scenario: Registrar un paciente nuevo
- **WHEN** se registra correctamente un paciente desde el panel
- **THEN** el paciente aparece en el listado de Clientes
- **AND** su contacto también aparece en el WhatsApp simulado

#### Scenario: Registro rechazado
- **WHEN** el servidor rechaza el alta de un paciente
- **THEN** no se agrega ningún contacto al WhatsApp simulado

#### Scenario: Contactos sin teléfono completo
- **GIVEN** el seed con `pac-01` "Paciente Ficticio Uno" y teléfono `+54 9 11 0000-0001`
- **WHEN** se consulta `GET /api/sim/whatsapp/contactos`
- **THEN** el contacto de `pac-01` es `{ id: "pac-01", nombre: "Paciente Ficticio Uno", telefonoEnmascarado: "+54 9 11 0000-**01" }`
- **AND** ningún contacto tiene la propiedad `telefono`
- **AND** el cuerpo de la respuesta no contiene `+54 9 11 0000-0001`

### Requirement: Alta asistida de pacientes ficticios

El sistema SHALL facilitar la carga de DNI y teléfonos ficticios válidos, respetando las validaciones del servidor.

#### Scenario: Crear paciente correctamente
- **WHEN** se completa el formulario con datos válidos y no duplicados
- **THEN** se registra el paciente correctamente

#### Scenario: Datos inválidos
- **WHEN** se intenta registrar un paciente con datos inválidos
- **THEN** se muestra el error correspondiente
- **AND** el paciente no se registra

### Requirement: Identificación del contacto por paciente

`POST /api/sim/whatsapp/mensaje`, `POST /api/sim/whatsapp/recordatorio` y `GET /api/sim/whatsapp/avisos` SHALL aceptar `pacienteId` en lugar de `telefono`; el servidor SHALL resolver internamente el teléfono del paciente y atenderlo igual que si se hubiera enviado ese teléfono. MUST responder `400` con `error.tipo` `entrada` si llegan ambos, ninguno, o un `pacienteId` inexistente o sin teléfono. Las respuestas MUST NOT incluir el teléfono completo.

#### Scenario: Chat identificado por paciente
- **GIVEN** el seed con `pac-01`
- **WHEN** se envía `POST /api/sim/whatsapp/mensaje` con `pacienteId` `pac-01` y texto "hola"
- **THEN** la respuesta es `200` con `simulado: true` y el menú inicial

#### Scenario: Misma conversación por paciente o por teléfono
- **GIVEN** que `pac-01` empezó una conversación con `pacienteId` `pac-01`
- **WHEN** continúa con `telefono` `+54 9 11 0000-0001`
- **THEN** el bot sigue la misma conversación

#### Scenario: Recordatorio identificado por paciente
- **GIVEN** `pac-01` con un turno reservado por el bot
- **WHEN** se envía `POST /api/sim/whatsapp/recordatorio` con `pacienteId` `pac-01`
- **THEN** la respuesta es la misma que con su teléfono: el recordatorio y sus opciones

#### Scenario: Avisos identificados por paciente
- **GIVEN** que recepción canceló un turno de `pac-01`
- **WHEN** se consulta `GET /api/sim/whatsapp/avisos?pacienteId=pac-01`
- **THEN** la respuesta tiene `simulado: true` y el aviso de cancelación
- **AND** con `pacienteId` `pac-02` no se ve ese aviso

#### Scenario: Identificación inválida
- **WHEN** se envía un mensaje, un recordatorio o una consulta de avisos con `telefono` y `pacienteId` a la vez, sin ninguno de los dos, o con `pacienteId` `pac-inexistente`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

#### Scenario: Pantalla del bot sin teléfonos completos
- **WHEN** la pantalla `/bot.html` carga los contactos
- **THEN** cada opción del selector tiene como valor el `id` del paciente y como texto `<teléfono enmascarado> · <nombre>`
- **AND** el chat, el recordatorio 24 h y el sondeo de avisos envían `pacienteId`
