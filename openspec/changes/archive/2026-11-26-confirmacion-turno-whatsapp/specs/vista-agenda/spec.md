## ADDED Requirements

### Requirement: Confirmación simulada por WhatsApp al crear un turno

Cuando `POST /api/turnos` cree un turno de origen recepción y el usuario tenga rol recepción o administración, el sistema SHALL registrar una confirmación en el WhatsApp simulado del paciente, consultable con `GET /api/sim/whatsapp/avisos` para su teléfono. El sistema MUST NOT registrarla si el turno es de otro origen, si lo crea otro rol, si el paciente no tiene teléfono o si el alta es rechazada.

#### Scenario: Recepción crea un turno
- **GIVEN** recepción con sesión y un paciente ficticio con teléfono `+54 9 11 0000-0001`
- **WHEN** crea un turno de origen recepción con `POST /api/turnos` y el servidor responde `201`
- **THEN** `GET /api/sim/whatsapp/avisos` para ese teléfono devuelve una confirmación de ese turno
- **AND** la respuesta sigue rotulada como simulación

#### Scenario: Administración crea un turno
- **GIVEN** administración con sesión y un paciente ficticio con teléfono
- **WHEN** crea un turno de origen recepción y el servidor responde `201`
- **THEN** se registra la confirmación en el WhatsApp simulado de ese paciente

#### Scenario: Turno de origen WhatsApp
- **GIVEN** un turno creado con origen `whatsapp` (por el bot o enviado así por la API)
- **WHEN** el alta responde `201`
- **THEN** no se registra ninguna confirmación para ese turno

#### Scenario: Turno creado por el rol paciente
- **GIVEN** un usuario con rol paciente
- **WHEN** crea un turno y el alta responde `201`
- **THEN** no se registra ninguna confirmación para ese turno

#### Scenario: Paciente sin teléfono
- **GIVEN** un paciente ficticio sin teléfono cargado
- **WHEN** recepción le crea un turno de origen recepción
- **THEN** el turno queda creado
- **AND** no se registra ninguna confirmación

#### Scenario: Alta rechazada
- **GIVEN** un alta que el servidor rechaza con `409`, `400` o `403`
- **WHEN** recepción o un odontólogo envían `POST /api/turnos`
- **THEN** no se registra ninguna confirmación en el WhatsApp simulado

#### Scenario: Privacidad de la confirmación
- **GIVEN** que recepción creó un turno para el paciente con teléfono `+54 9 11 0000-0001`
- **WHEN** se consulta el WhatsApp simulado del teléfono `+54 9 11 0000-0002`
- **THEN** no se muestra la confirmación de ese turno

### Requirement: Texto de la confirmación simulada

La confirmación SHALL tener exactamente el texto `Hola, <paciente>. Tu turno del <fecha> con <profesional> para <prestación> fue agendado correctamente. ¡Te esperamos!`, con `<fecha>` en formato corto es-AR (fecha y hora) en zona `America/Argentina/Buenos_Aires`. Si el profesional o la prestación no se encuentran, SHALL usarse su identificador. El texto MUST NOT incluir información clínica.

#### Scenario: Texto exacto con hora de Buenos Aires
- **GIVEN** el paciente "Paciente Ficticio Uno", la profesional "Dra. Ficticia Perez" y la prestación "Control y limpieza"
- **WHEN** se arma la confirmación de un turno con inicio `2026-12-01T13:00:00Z`
- **THEN** el texto es `Hola, Paciente Ficticio Uno. Tu turno del 1/12/26, 10:00 a. m. con Dra. Ficticia Perez para Control y limpieza fue agendado correctamente. ¡Te esperamos!`

#### Scenario: Cierre con signo de apertura correcto
- **WHEN** se arma cualquier confirmación de turno
- **THEN** el texto empieza con `Hola, <paciente>.`
- **AND** termina con `¡Te esperamos!` y no contiene `?Te esperamos!`

#### Scenario: Profesional o prestación inexistentes
- **GIVEN** un turno cuyo profesional y prestación no se encuentran en el catálogo
- **WHEN** se arma la confirmación
- **THEN** el texto usa el identificador del profesional y el de la prestación en su lugar

### Requirement: La confirmación no afecta el alta del turno

Una falla al registrar la confirmación simulada MUST NOT deshacer ni rechazar el alta: el turno SHALL quedar creado y `POST /api/turnos` SHALL responder `201` con el turno. La confirmación SHALL registrarse solo después de un alta exitosa.

#### Scenario: Falla al registrar la confirmación
- **GIVEN** que el registro en el WhatsApp simulado falla
- **WHEN** recepción crea un turno de origen recepción
- **THEN** el turno queda guardado en la agenda
- **AND** el alta se informa como exitosa (`201`)

#### Scenario: Confirmación previa a la cancelación
- **GIVEN** que recepción creó un turno y luego lo canceló correctamente
- **WHEN** se consulta el WhatsApp simulado del paciente
- **THEN** se ven dos avisos en orden: primero la confirmación y después el aviso de cancelación
