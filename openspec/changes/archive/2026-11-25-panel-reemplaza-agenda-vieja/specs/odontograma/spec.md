## ADDED Requirements

### Requirement: Acceso al odontograma desde la agenda del panel

El detalle de un turno en la agenda del panel SHALL mostrar el enlace "Odontograma" solo cuando el usuario con sesión tiene rol `odontologo`. El enlace SHALL abrir la ruta del panel `#/odontograma/<turnoId>` de ese turno, con el turno ya elegido, sin pedir que se elija de una lista. La ruta SHALL mostrar paciente, prestación y horario del turno, y "Volver a la agenda". Los roles admin y recepción MUST NOT ver el enlace, y si abren la ruta a mano SHALL ver el aviso de acceso restringido del panel, sin que se consulte la API de piezas. La ruta MUST NOT aparecer en la barra lateral.

#### Scenario: Odontóloga abre el odontograma del turno
- **GIVEN** la odontóloga `u-odonto-1` con sesión del panel
- **AND** un turno de `pac-01` en la semana visible
- **WHEN** abre el detalle del turno y activa "Odontograma"
- **THEN** el panel navega a `#/odontograma/<id del turno>`
- **AND** muestra el odontograma de ese turno con las piezas de `GET /api/turnos/:id/piezas`

#### Scenario: Recepción no ve el enlace
- **GIVEN** recepción con sesión del panel
- **WHEN** abre el detalle de cualquier turno
- **THEN** el detalle no muestra el enlace "Odontograma"

#### Scenario: Admin no ve el enlace
- **GIVEN** admin con sesión del panel
- **WHEN** abre el detalle de cualquier turno
- **THEN** el detalle no muestra el enlace "Odontograma"

#### Scenario: Recepción escribe la ruta a mano
- **GIVEN** recepción con sesión del panel
- **WHEN** abre `/admin/#/odontograma/<id de un turno>`
- **THEN** ve el aviso de acceso restringido
- **AND** el panel no consulta `GET /api/turnos/:id/piezas`

#### Scenario: Sin sesión
- **GIVEN** un navegador sin sesión del panel
- **WHEN** abre `/admin/#/odontograma/<id de un turno>`
- **THEN** ve la pantalla de login del panel

#### Scenario: Turno inexistente en la ruta
- **GIVEN** una odontóloga con sesión
- **WHEN** abre `#/odontograma/turno-inexistente`
- **THEN** ve el mensaje "No encontramos ese turno." y el enlace "Volver a la agenda"

#### Scenario: El odontograma no está en la barra lateral
- **WHEN** cualquier rol con sesión ve la barra lateral del panel
- **THEN** no hay una sección "Odontograma"

### Requirement: Retiro de la página suelta del odontograma

La página `public/odontograma.html`, con su selector de turno y de rol simulado, SHALL retirarse. `GET /odontograma.html` SHALL responder `302` con `Location: /admin/#/agenda`.

#### Scenario: Enlace guardado a la página vieja
- **WHEN** se pide `GET /odontograma.html`
- **THEN** el servidor responde `302` con `Location: /admin/#/agenda`

## MODIFIED Requirements

### Requirement: Selección de piezas y síntomas

El odontograma del panel SHALL mostrar el nombre de la pieza seleccionada y permitir que el odontólogo seleccione síntomas y caras dentales de esa pieza para el turno abierto.

#### Scenario: Seleccionar pieza 16
- **GIVEN** una odontóloga en el odontograma de un turno
- **WHEN** selecciona la pieza 16
- **THEN** ve el nombre "Primer molar superior derecho"
- **AND** puede seleccionar síntomas y caras dentales

#### Scenario: Síntoma inválido
- **WHEN** se envía un síntoma no reconocido
- **THEN** el servidor rechaza la operación con `400`

#### Scenario: Guardar sin síntomas
- **GIVEN** una odontóloga con la pieza 16 seleccionada y ningún síntoma marcado
- **WHEN** presiona "Agregar pieza 16 al turno"
- **THEN** el panel no envía la solicitud
- **AND** muestra "Seleccioná al menos un síntoma."

### Requirement: Estados y permisos

El sistema SHALL usar los estados `a_revisar` y `hecho`. Solo el rol `odontologo` SHALL poder consultar (`GET /api/turnos/:id/piezas`) y modificar (`PUT /api/turnos/:id/piezas`) las piezas de un turno, incluido marcar una pieza como hecha. Cualquier otro rol, o una request sin usuario, SHALL recibir `403` antes de cualquier otra validación. La identidad SHALL resolverse como en el resto de la API: primero el token de sesión y, si no hay `Authorization`, los headers simulados (DD-09).

#### Scenario: Pieza pendiente
- **GIVEN** que una pieza tiene estado `a_revisar`
- **WHEN** aparece en el odontograma
- **THEN** se muestra en rojo

#### Scenario: Pieza realizada
- **GIVEN** que una pieza tiene estado `hecho`
- **WHEN** aparece en el odontograma
- **THEN** se muestra en azul

#### Scenario: Odontólogo marca realizado
- **GIVEN** que una pieza está pendiente
- **WHEN** un odontólogo la marca como hecha
- **THEN** el sistema guarda el estado `hecho`

#### Scenario: Paciente no puede marcar realizado
- **GIVEN** que una pieza está pendiente
- **WHEN** un paciente intenta marcarla como hecha
- **THEN** el servidor responde `403`

#### Scenario: Recepción no consulta piezas
- **GIVEN** un turno existente
- **WHEN** recepción pide `GET /api/turnos/:id/piezas`
- **THEN** el servidor responde `403`

#### Scenario: Admin no consulta piezas
- **GIVEN** un turno existente
- **WHEN** admin pide `GET /api/turnos/:id/piezas`
- **THEN** el servidor responde `403`

#### Scenario: Recepción no registra piezas
- **GIVEN** un turno existente
- **WHEN** recepción envía `PUT /api/turnos/:id/piezas` con la pieza 16 y un síntoma válido
- **THEN** el servidor responde `403`
- **AND** el turno sigue sin piezas

#### Scenario: Paciente no registra piezas
- **GIVEN** un turno existente
- **WHEN** un paciente envía `PUT /api/turnos/:id/piezas` con la pieza 16 y un síntoma válido
- **THEN** el servidor responde `403`

#### Scenario: Sin usuario
- **WHEN** una request sin `Authorization` ni `X-Rol` pide `GET /api/turnos/:id/piezas`
- **THEN** el servidor responde `403`

#### Scenario: Token de odontólogo
- **GIVEN** un token de sesión vigente de `u-odonto-1`
- **WHEN** envía `PUT /api/turnos/:id/piezas` con `Authorization: Bearer <token>`, la pieza 36 y "dolor al masticar"
- **THEN** el servidor responde `200` y la pieza queda en `a_revisar`

#### Scenario: El token gana sobre X-Rol en el odontograma
- **GIVEN** un token de sesión vigente de recepción
- **WHEN** pide `GET /api/turnos/:id/piezas` con ese token y `X-Rol: odontologo`
- **THEN** el servidor responde `403`

#### Scenario: Rol sin permiso sobre turno inexistente
- **WHEN** recepción pide `GET /api/turnos/turno-inexistente/piezas`
- **THEN** el servidor responde `403`, porque el permiso se valida antes de buscar el turno

### Requirement: Asociación de piezas con turnos

El sistema SHALL asociar las piezas a un turno existente mediante `PUT /api/turnos/:id/piezas`, enviado por un odontólogo.

#### Scenario: Guardar pieza 36
- **GIVEN** que existe un turno válido
- **WHEN** un odontólogo agrega la pieza 36 con dolor al masticar
- **THEN** queda asociada al turno con estado `a_revisar`

#### Scenario: Consultar piezas
- **GIVEN** que existen piezas asociadas a un turno
- **WHEN** un odontólogo consulta `GET /api/turnos/:id/piezas`
- **THEN** se devuelven las piezas registradas en ese turno

#### Scenario: Turno inexistente
- **WHEN** un odontólogo consulta las piezas de un turno inexistente
- **THEN** el servidor responde `404`
