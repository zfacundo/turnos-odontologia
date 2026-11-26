# vista-agenda Specification

## Purpose
TBD - created by archiving change vista-agenda-y-registro-del-sistema. Update Purpose after archive.

## Requirements

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

### Requirement: Grilla de 15 minutos

La agenda SHALL organizar los horarios en intervalos de 15 minutos, respetando RN-AG-03.

Cada turno SHALL ocupar visualmente el tiempo comprendido entre su inicio y su fin.

#### Scenario: Turno de 30 minutos

\- \*\*GIVEN\*\* que existe un turno de 30 minutos

\- \*\*WHEN\*\* se muestra en la agenda

\- \*\*THEN\*\* ocupa visualmente dos intervalos de 15 minutos

#### Scenario: Turno de 45 minutos

\- \*\*GIVEN\*\* que existe un turno de 45 minutos

\- \*\*WHEN\*\* se muestra en la agenda

\- \*\*THEN\*\* ocupa visualmente tres intervalos de 15 minutos

#### Scenario: Turno de 60 minutos

\- \*\*GIVEN\*\* que existe un turno de 60 minutos

\- \*\*WHEN\*\* se muestra en la agenda

\- \*\*THEN\*\* ocupa visualmente cuatro intervalos de 15 minutos

### Requirement: Filtros por profesional y sillón

El sistema SHALL ofrecer filtros por profesional y sillón utilizando los datos de GET /api/catalogo.

Los filtros SHALL funcionar individualmente y en combinación.

#### Scenario: Filtrar por profesional

\- \*\*GIVEN\*\* que existen turnos de distintos profesionales

\- \*\*WHEN\*\* el usuario selecciona un profesional

\- \*\*THEN\*\* se muestran solamente los turnos correspondientes a ese profesional

#### Scenario: Filtrar por sillón

\- \*\*GIVEN\*\* que existen turnos asignados a diferentes sillones

\- \*\*WHEN\*\* el usuario selecciona "Sillón 2"

\- \*\*THEN\*\* se muestran solamente los turnos asignados al Sillón 2

#### Scenario: Combinar filtros

\- \*\*WHEN\*\* el usuario selecciona un profesional y un sillón

\- \*\*THEN\*\* se muestran solamente los turnos que cumplen ambas condiciones

#### Scenario: Mostrar todos

\- \*\*WHEN\*\* el usuario selecciona "Todos" en ambos filtros

\- \*\*THEN\*\* se muestran los turnos de todos los profesionales y sillones

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

### Requirement: Horarios locales

La interfaz SHALL presentar las fechas y horas según la zona horaria argentina utilizada por el consultorio.

#### Scenario: Mostrar un turno almacenado en UTC

\- \*\*GIVEN\*\* que un turno comienza a las 13:00 UTC

\- \*\*WHEN\*\* corresponde a las 10:00 de Argentina

\- \*\*THEN\*\* la agenda muestra las 10:00

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

### Requirement: Retiro de la agenda anterior

La agenda del consultorio SHALL ser únicamente la del panel (`/admin/#/agenda`). `GET /` y `GET /index.html` SHALL responder `302` con `Location: /admin/`. Ninguna página servida desde `public/` SHALL tener un enlace "Agenda" que apunte a `/` o a `/index.html`. Los enlaces "Agenda" que existan SHALL apuntar a `/admin/#/agenda`. La pantalla del bot de WhatsApp simulado MUST NOT tener enlace "Agenda", porque representa el teléfono del paciente.

#### Scenario: La raíz redirige al panel
- **WHEN** un navegador pide `GET /`
- **THEN** el servidor responde `302` con `Location: /admin/`

#### Scenario: Enlace guardado a la agenda vieja
- **WHEN** se pide `GET /index.html`
- **THEN** el servidor responde `302` con `Location: /admin/`

#### Scenario: Sin enlaces a la agenda vieja
- **WHEN** se revisan todas las páginas HTML de `public/`
- **THEN** ninguna tiene un `href` igual a `/` o a `/index.html`

#### Scenario: Otras páginas siguen sirviéndose
- **WHEN** se piden `/bot.html`, `/sim/mercadopago.html`, `/sim/obras-sociales.html`, `/sim/arca.html` y `/styles/tokens.css`
- **THEN** cada una responde `200`

#### Scenario: Navegación desde el bot
- **GIVEN** la pantalla del bot de WhatsApp simulado
- **WHEN** se revisa su barra de navegación
- **THEN** no tiene un enlace "Agenda" ni ningún `href` hacia `/admin/`

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

### Requirement: Texto del aviso simulado de cancelación

El aviso de cancelación SHALL tener exactamente el texto `Hola, <paciente>. Te informamos que tu turno del <fecha> con <profesional> fue cancelado. Para solicitar otro turno, comunicate con recepción.`, con `<fecha>` en formato corto es-AR (fecha y hora) en zona `America/Argentina/Buenos_Aires`. Si el profesional no se encuentra, SHALL usarse su identificador. El texto MUST NOT incluir el motivo ni información clínica.

#### Scenario: Texto exacto del aviso con hora de Buenos Aires
- **GIVEN** el paciente "Paciente Ficticio Uno" y la profesional "Dra. Ficticia Perez"
- **WHEN** se arma el aviso de cancelación de un turno con inicio `2026-12-01T13:00:00Z`
- **THEN** el texto es `Hola, Paciente Ficticio Uno. Te informamos que tu turno del 1/12/26, 10:00 a. m. con Dra. Ficticia Perez fue cancelado. Para solicitar otro turno, comunicate con recepción.`

#### Scenario: Acentos correctos en el aviso
- **WHEN** se arma cualquier aviso de cancelación
- **THEN** el texto termina con `comunicate con recepción.`
- **AND** no contiene `recepci?n`

#### Scenario: Profesional inexistente en el aviso
- **GIVEN** un turno cancelado cuyo profesional no se encuentra en el catálogo
- **WHEN** se arma el aviso de cancelación
- **THEN** el texto usa el identificador del profesional en su lugar

### Requirement: El aviso no afecta la cancelación

Una falla al registrar el aviso simulado MUST NOT deshacer ni rechazar la cancelación: el turno SHALL quedar cancelado y `POST /api/turnos/:id/cancelar` SHALL responder `200` con el turno. El aviso SHALL registrarse solo después de una cancelación exitosa y solo si el paciente tiene teléfono.

#### Scenario: Falla al registrar el aviso de cancelación
- **GIVEN** que el registro en el WhatsApp simulado falla
- **WHEN** se cancela correctamente un turno activo
- **THEN** el turno queda cancelado en la agenda
- **AND** no se propaga ningún error

#### Scenario: Paciente sin teléfono al cancelar
- **GIVEN** un turno activo de un paciente ficticio sin teléfono cargado
- **WHEN** recepción lo cancela con motivo
- **THEN** el turno queda cancelado
- **AND** no se registra ningún aviso

#### Scenario: Cancelación por API con aviso exacto
- **GIVEN** recepción con sesión y un turno activo de `pac-01` con inicio `2026-12-01T13:00:00Z` con `prof-1`
- **WHEN** lo cancela con `POST /api/turnos/:id/cancelar` y el servidor responde `200`
- **THEN** `GET /api/sim/whatsapp/avisos` para `+54 9 11 0000-0001` incluye el aviso con el texto exacto
