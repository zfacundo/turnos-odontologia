## ADDED Requirements

### Requirement: Retiro de la agenda anterior

La agenda del consultorio SHALL ser únicamente la del panel (`/admin/#/agenda`). `GET /` y `GET /index.html` SHALL responder `302` con `Location: /admin/`. Ninguna página servida desde `public/` SHALL tener un enlace "Agenda" que apunte a `/` o a `/index.html`. Esos enlaces SHALL apuntar a `/admin/#/agenda`.

#### Scenario: La raíz redirige al panel
- **WHEN** un navegador pide `GET /`
- **THEN** el servidor responde `302` con `Location: /admin/`

#### Scenario: Enlace guardado a la agenda vieja
- **WHEN** se pide `GET /index.html`
- **THEN** el servidor responde `302` con `Location: /admin/`

#### Scenario: Navegación desde el bot
- **GIVEN** la pantalla del bot de WhatsApp simulado
- **WHEN** el usuario activa el enlace "Agenda" de su barra de navegación
- **THEN** el enlace apunta a `/admin/#/agenda`

#### Scenario: Sin enlaces a la agenda vieja
- **WHEN** se revisan todas las páginas HTML de `public/`
- **THEN** ninguna tiene un `href` igual a `/` o a `/index.html`

#### Scenario: Otras páginas siguen sirviéndose
- **WHEN** se piden `/bot.html`, `/sim/mercadopago.html`, `/sim/obras-sociales.html`, `/sim/arca.html` y `/styles/tokens.css`
- **THEN** cada una responde `200`

## MODIFIED Requirements

### Requirement: Consulta de turnos

La agenda del panel SHALL consultar `GET /api/turnos` con el rango de la semana visible y mostrar los turnos recibidos en la grilla semanal.

#### Scenario: Agenda con turnos
- **GIVEN** que existen turnos registrados en la semana visible
- **WHEN** un usuario con sesión del panel abre `/admin/#/agenda`
- **THEN** el panel consulta `GET /api/turnos` con el rango de esa semana
- **AND** muestra cada turno recibido en su día y horario

#### Scenario: Agenda vacía
- **GIVEN** que no existen turnos en la semana visible
- **WHEN** el usuario abre la agenda del panel
- **THEN** se muestra la grilla vacía y el aviso "Sin turnos en esta semana", sin errores

### Requirement: Información visual de los turnos

La agenda del panel SHALL mostrar información suficiente para identificar cada turno. El color del bloque SHALL indicar el estado, y el estado SHALL aparecer también en el nombre accesible del bloque. El detalle del turno SHALL mostrar paciente, prestación, horario, profesional y sillón. Los turnos con origen `whatsapp` SHALL tener un indicador visible y accesible. Los turnos cuyo fin ya pasó respecto de la hora actual del navegador SHALL verse atenuados.

#### Scenario: Identificar una prestación
- **GIVEN** un turno de la prestación "Ortodoncia"
- **WHEN** el usuario abre su detalle
- **THEN** el detalle muestra "Ortodoncia" como prestación

#### Scenario: Mostrar estado reservado
- **GIVEN** que un turno tiene estado `reservado`
- **WHEN** aparece en la agenda
- **THEN** su bloque usa el color de "Sin confirmar" y su nombre accesible incluye "Sin confirmar"

#### Scenario: Mostrar estado confirmado
- **GIVEN** que un turno tiene estado `confirmado`
- **WHEN** aparece en la agenda
- **THEN** su nombre accesible y su detalle muestran "Confirmado"

#### Scenario: Mostrar estado atendido
- **GIVEN** que un turno tiene estado `atendido`
- **WHEN** aparece en la agenda
- **THEN** su nombre accesible y su detalle muestran "Atendido"

#### Scenario: Identificar origen WhatsApp
- **GIVEN** que un turno tiene origen `whatsapp`
- **WHEN** aparece en la agenda
- **THEN** su bloque muestra un indicador de WhatsApp
- **AND** su nombre accesible incluye "reservado por WhatsApp"
- **AND** el detalle muestra "Origen: WhatsApp (simulado)"

#### Scenario: Turno de origen recepción
- **GIVEN** que un turno tiene origen distinto de `whatsapp`
- **WHEN** aparece en la agenda
- **THEN** no muestra el indicador de WhatsApp

#### Scenario: Atenuar horarios pasados
- **GIVEN** que la hora actual es 2026-12-01 11:00 (Argentina)
- **AND** un turno de ese día termina a las 10:30 y otro empieza a las 11:30
- **WHEN** se muestran en la agenda
- **THEN** el turno de las 10:30 se ve atenuado y el de las 11:30 no

#### Scenario: Turno que termina justo ahora
- **GIVEN** que la hora actual es 2026-12-01 11:00 (Argentina)
- **AND** un turno termina exactamente a las 11:00
- **WHEN** se muestra en la agenda
- **THEN** se ve atenuado, porque su intervalo `[inicio, fin)` ya terminó

### Requirement: Creación de turnos

La agenda del panel SHALL ofrecer a admin y recepción un botón "Nuevo turno" que abra un formulario con paciente, prestación, profesional, sillón, fecha y hora de inicio, y que envíe `POST /api/turnos`. La validación de las reglas de negocio SHALL quedar en el servidor. El odontólogo MUST NOT ver el botón.

#### Scenario: Crear turno correctamente
- **GIVEN** recepción con sesión y datos válidos de un horario libre
- **WHEN** completa el formulario y presiona "Crear turno"
- **THEN** el panel envía `POST /api/turnos` con esos datos
- **AND** muestra "Turno creado"
- **AND** el turno aparece en la grilla de su semana

#### Scenario: Conflicto de horario
- **GIVEN** que el horario elegido se superpone con otro turno del mismo profesional
- **WHEN** el servidor responde `409` con la regla `RN-AG-0x` y el turno en conflicto
- **THEN** el formulario sigue abierto con los datos cargados
- **AND** muestra el código de la regla, el mensaje del servidor y el identificador del turno en conflicto

#### Scenario: Campos incompletos
- **GIVEN** que falta elegir el paciente
- **WHEN** el usuario presiona "Crear turno"
- **THEN** el panel no envía la solicitud
- **AND** marca el campo faltante con un mensaje asociado

#### Scenario: Rol sin permiso
- **GIVEN** un odontólogo con sesión
- **WHEN** abre la agenda del panel
- **THEN** no ve el botón "Nuevo turno"
- **AND** si igual envía `POST /api/turnos`, el servidor responde `403`

### Requirement: Integración con el registro

La agenda del panel SHALL mostrar a admin y recepción una tarjeta "Lo que hizo el sistema" con los mensajes de `GET /api/registro`, del más reciente al más antiguo. La tarjeta SHALL volver a consultarse después de crear, cancelar o cambiar el estado de un turno desde el panel. Los roles sin permiso MUST NOT ver la tarjeta.

#### Scenario: Actualizar registro
- **WHEN** recepción abre la agenda del panel
- **THEN** el panel consulta `GET /api/registro`
- **AND** muestra los mensajes con fecha y hora de Argentina, del más reciente al más antiguo

#### Scenario: Crear turno y actualizar registro
- **WHEN** un turno se crea correctamente desde el panel
- **THEN** la grilla se actualiza
- **AND** la tarjeta "Lo que hizo el sistema" vuelve a consultar el registro

#### Scenario: Registro vacío
- **GIVEN** que no hay acciones registradas
- **WHEN** admin abre la agenda
- **THEN** la tarjeta muestra "Todavía no hay acciones registradas."

#### Scenario: Odontólogo no ve el registro
- **GIVEN** un odontólogo con sesión
- **WHEN** abre la agenda del panel
- **THEN** la tarjeta "Lo que hizo el sistema" no se muestra y no se consulta `GET /api/registro`

### Requirement: Cancelación desde la agenda y aviso simulado

El detalle de un turno activo en la agenda del panel SHALL permitir que recepción y administración lo cancelen, escribiendo un motivo obligatorio y confirmando. La cancelación SHALL usar `POST /api/turnos/:id/cancelar` y respetar las validaciones y permisos del servidor. Cuando la cancelación sea exitosa, el sistema SHALL registrar un aviso en el WhatsApp simulado del paciente correspondiente.

#### Scenario: Cancelación exitosa
- **GIVEN** que existe un turno activo
- **AND** el usuario tiene rol recepción o administración
- **WHEN** abre su detalle, elige "Cancelar turno…", escribe el motivo y confirma
- **THEN** el panel solicita la cancelación al servidor
- **AND** el turno sale de la grilla y la tarjeta del registro se actualiza
- **AND** se registra un aviso de cancelación en el WhatsApp simulado del paciente

#### Scenario: Cancelación rechazada
- **GIVEN** que el servidor rechaza una cancelación con `409`
- **WHEN** el usuario confirma la cancelación
- **THEN** el detalle muestra el mensaje del servidor y el turno no cambia
- **AND** no se genera un aviso de cancelación

#### Scenario: Rol sin permiso en la agenda
- **GIVEN** un odontólogo con sesión
- **WHEN** abre el detalle de un turno activo
- **THEN** no ve la acción "Cancelar turno…"

#### Scenario: Privacidad del aviso
- **GIVEN** que un turno fue cancelado correctamente
- **WHEN** se consulta el WhatsApp simulado de otro paciente
- **THEN** no se muestra el aviso de ese turno
- **AND** el mensaje de cancelación no incluye información clínica ni el motivo registrado

### Requirement: Marca de seña pagada

Un turno con `senado` `true` SHALL mostrar la marca de seña en la agenda del panel: "$" en el bloque, "señado" en su nombre accesible y el chip "$ Señado" en el detalle. La leyenda SHALL explicar "Seña pagada (simulada)". La marca SHALL ser la misma si la seña se pagó desde el bot o desde el simulador de Mercado Pago. Un turno sin seña MUST NOT mostrarla.

#### Scenario: Turno señado desde el bot
- **GIVEN** un turno de `pac-01` reservado por WhatsApp con la seña aprobada
- **WHEN** recepción abre la agenda del panel en la semana del turno
- **THEN** el bloque muestra "$" junto al indicador de WhatsApp
- **AND** el detalle muestra el chip "$ Señado"

#### Scenario: Turno sin seña
- **GIVEN** un turno con `senado` `false`
- **WHEN** se muestra en la agenda del panel
- **THEN** ni su bloque ni su detalle muestran la marca de seña

## REMOVED Requirements

### Requirement: Vistas diaria y semanal

**Reason**: La agenda del panel es semanal, con un mini-calendario para elegir el día y su semana. La vista diaria solo existía en la agenda vieja, que se retira (decisión G-3 de `design.md`).
**Migration**: Elegir el día en el mini-calendario del panel para ir a su semana. El día actual aparece resaltado. El filtro por profesional reduce la grilla a un solo profesional.

### Requirement: Selector de rol simulado

**Reason**: El panel identifica al usuario con el login simulado y un token de sesión (`panel-admin-agenda`). El selector de rol de la agenda vieja, guardado en `localStorage` y enviado como `X-Rol`, ya no tiene pantalla.
**Migration**: Ingresar a `/admin/` con el usuario ficticio del rol que se quiere probar. Los headers `X-Usuario` y `X-Rol` siguen aceptándose en la API cuando no hay `Authorization` (DD-09), por ejemplo en los tests y en los simuladores.
