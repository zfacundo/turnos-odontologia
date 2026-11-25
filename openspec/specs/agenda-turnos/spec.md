# agenda-turnos Specification

## Purpose

Permite crear, consultar, cambiar de estado (confirmar, atender, marcar ausente), cancelar y reprogramar turnos de la agenda del consultorio garantizando que no se solapen por profesional, por sillón ni por paciente, que respeten la duración de la prestación, los bloques de 15 minutos, el horario de atención y los bloqueos, y que cada alta y cada cambio queden auditados.

> Convenciones de los escenarios: todas las horas son de `America/Argentina/Buenos_Aires` (UTC-03:00) del martes `2026-12-01`, salvo que se indique otra fecha. Datos del seed: profesionales `prof-1` y `prof-2` con franjas lunes a viernes `09:00-13:00` y `14:00-19:00`; sillones `sillon-1` y `sillon-2`; prestaciones `prest-control` (30'), `prest-orto` (45') y `prest-trat` (60'); pacientes ficticios `pac-01`..`pac-10`; bloqueo global "reservado urgencias" `18:30-19:00` cada día hábil.

## Requirements

### Requirement: Fin calculado a partir de la prestación
El sistema SHALL calcular el fin de un turno nuevo como `inicio + duración de la prestación` (RN-AG-03, RN-AG-11). El cliente no envía `fin`; si lo envía, MUST ignorarse.

#### Scenario: Control de 30 minutos a las 10:00 termina 10:30
- **GIVEN** una agenda sin turnos
- **WHEN** recepción crea un turno de `prest-control` para `pac-01` con `prof-1` en `sillon-1` con inicio `10:00`
- **THEN** el turno se crea con fin `10:30`

#### Scenario: El fin enviado por el cliente se ignora
- **GIVEN** una agenda sin turnos
- **WHEN** recepción crea un turno de `prest-trat` con inicio `10:00` y envía además `fin` = `10:15`
- **THEN** el turno se crea con fin `11:00`

### Requirement: Inicio alineado a bloques de 15 minutos
El sistema SHALL rechazar un turno cuyo inicio no esté alineado a `:00`, `:15`, `:30` o `:45` (con segundos y milisegundos en cero) con el error de regla `RN-AG-03`.

#### Scenario: Inicio 10:10 rechazado
- **GIVEN** una agenda sin turnos
- **WHEN** recepción crea un turno de `prest-control` con inicio `10:10`
- **THEN** la creación se rechaza con la regla `RN-AG-03` y no se guarda ningún turno

#### Scenario: Inicio 10:15 aceptado
- **GIVEN** una agenda sin turnos
- **WHEN** recepción crea un turno de `prest-control` con inicio `10:15`
- **THEN** el turno se crea con fin `10:45`

### Requirement: Turno dentro del horario de atención del profesional
El sistema SHALL aceptar un turno solo si `[inicio, fin)` está completamente contenido en alguna franja de disponibilidad del profesional para ese día de la semana; en caso contrario MUST rechazarlo con `RN-AG-04` (RN-AG-01: un fin igual al cierre de la franja es válido).

#### Scenario: Turno que cruza el corte de almuerzo
- **GIVEN** `prof-1` con franjas `09:00-13:00` y `14:00-19:00`
- **WHEN** recepción crea un turno de `prest-trat` (60') con inicio `12:30`
- **THEN** la creación se rechaza con la regla `RN-AG-04`

#### Scenario: Turno que termina justo al cierre de la franja
- **GIVEN** `prof-1` con franja `09:00-13:00`
- **WHEN** recepción crea un turno de `prest-control` (30') con inicio `12:30`
- **THEN** el turno se crea con fin `13:00`

#### Scenario: Turno en un día sin franjas
- **GIVEN** `prof-1` sin franjas los sábados
- **WHEN** recepción crea un turno de `prest-control` con inicio sábado `2026-12-05 10:00`
- **THEN** la creación se rechaza con la regla `RN-AG-04`

### Requirement: Turno fuera de bloqueos
El sistema SHALL rechazar con `RN-AG-04` un turno cuyo intervalo se solape con un bloqueo del mismo profesional, del mismo sillón o global (sin profesional ni sillón). Los bloqueos de otro profesional u otro sillón MUST NOT afectarlo.

#### Scenario: Turno dentro del bloqueo global de urgencias
- **GIVEN** el bloqueo global "reservado urgencias" `18:30-19:00`
- **WHEN** recepción crea un turno de `prest-control` con inicio `18:30`
- **THEN** la creación se rechaza con la regla `RN-AG-04`

#### Scenario: Turno en un bloqueo del profesional
- **GIVEN** un bloqueo de `prof-1` de `10:00` a `11:00`
- **WHEN** recepción crea un turno de `prest-control` con `prof-1` e inicio `10:30`
- **THEN** la creación se rechaza con la regla `RN-AG-04`

#### Scenario: Bloqueo de otro sillón no afecta
- **GIVEN** un bloqueo de `sillon-2` de `10:00` a `11:00`
- **WHEN** recepción crea un turno de `prest-control` en `sillon-1` con inicio `10:00`
- **THEN** el turno se crea

#### Scenario: Turno contiguo a un bloqueo
- **GIVEN** el bloqueo global `18:30-19:00`
- **WHEN** recepción crea un turno de `prest-control` con inicio `18:00`
- **THEN** el turno se crea con fin `18:30`

### Requirement: Sin solapamiento por profesional
El sistema SHALL rechazar un turno que se solape (`[inicio, fin)`, RN-AG-01) con un turno activo del mismo profesional, aunque sea en otro sillón, con la regla `RN-AG-02`, la dimensión `profesional` y el identificador del turno en conflicto.

#### Scenario: Mismo profesional en otro sillón
- **GIVEN** el turno activo `t-1` de `prof-1` en `sillon-1` de `10:00` a `11:00`
- **WHEN** recepción crea un turno de `prest-control` con `prof-1` en `sillon-2`, otro paciente, inicio `10:30`
- **THEN** la creación se rechaza con `RN-AG-02`, dimensión `profesional` y conflicto con el turno `t-1`

#### Scenario: Solapamiento contenido
- **GIVEN** el turno activo `t-1` de `prof-1` de `10:00` a `11:00`
- **WHEN** recepción crea un turno de `prest-control` (30') con `prof-1` e inicio `10:15`
- **THEN** la creación se rechaza con `RN-AG-02` y dimensión `profesional`

#### Scenario: Turno back-to-back aceptado
- **GIVEN** el turno activo `t-1` de `prof-1` en `sillon-1` de `10:00` a `10:30`
- **WHEN** recepción crea un turno de `prest-control` con `prof-1` en `sillon-1`, otro paciente, inicio `10:30`
- **THEN** el turno se crea con inicio `10:30` y fin `11:00`

### Requirement: Sin solapamiento por sillón
El sistema SHALL rechazar un turno que se solape con un turno activo del mismo sillón, aunque sea de otro profesional, con la regla `RN-AG-02`, la dimensión `sillon` y el identificador del turno en conflicto. Si hay conflicto por profesional y por sillón a la vez, MUST informarse la dimensión `profesional`.

#### Scenario: Mismo sillón con otro profesional
- **GIVEN** el turno activo `t-1` de `prof-1` en `sillon-1` de `10:00` a `10:30`
- **WHEN** recepción crea un turno de `prest-control` con `prof-2` en `sillon-1`, otro paciente, inicio `10:00`
- **THEN** la creación se rechaza con `RN-AG-02`, dimensión `sillon` y conflicto con el turno `t-1`

#### Scenario: Otro profesional y otro sillón en el mismo horario
- **GIVEN** el turno activo `t-1` de `prof-1` en `sillon-1` de `10:00` a `10:30`
- **WHEN** recepción crea un turno de `prest-control` con `prof-2` en `sillon-2`, otro paciente, inicio `10:00`
- **THEN** el turno se crea

### Requirement: Paciente sin turnos superpuestos
El sistema SHALL rechazar un turno que se solape con un turno activo del mismo paciente, aunque sea con otro profesional y otro sillón, con la regla `RN-AG-05`, la dimensión `paciente` y el identificador del turno en conflicto.

#### Scenario: Paciente con turno superpuesto en otro profesional y sillón
- **GIVEN** el turno activo `t-1` de `pac-01` con `prof-1` en `sillon-1` de `10:00` a `10:30`
- **WHEN** recepción crea un turno para `pac-01` con `prof-2` en `sillon-2` con inicio `10:00`
- **THEN** la creación se rechaza con `RN-AG-05`, dimensión `paciente` y conflicto con el turno `t-1`

#### Scenario: Paciente con turno contiguo
- **GIVEN** el turno activo `t-1` de `pac-01` de `10:00` a `10:30`
- **WHEN** recepción crea un turno para `pac-01` con `prof-2` en `sillon-2` con inicio `10:30`
- **THEN** el turno se crea

### Requirement: Turnos cancelados no ocupan la agenda
El sistema SHALL ignorar los turnos en estado `cancelado` en todas las validaciones de solapamiento (RN-AG-10).

#### Scenario: Turno cancelado en el mismo horario no bloquea
- **GIVEN** el turno `t-1` de `pac-01` con `prof-1` en `sillon-1` de `10:00` a `10:30` en estado `cancelado`
- **WHEN** recepción crea un turno para `pac-01` con `prof-1` en `sillon-1` con inicio `10:00`
- **THEN** el turno se crea

### Requirement: Validación con lista de turnos provista
La validación de un turno candidato SHALL considerar únicamente los turnos existentes que recibe, sin acceso a I/O ni al reloj (RN-AG-12), de modo que un caso de uso posterior pueda excluir un turno de la comparación.

#### Scenario: Turno excluido de la lista no genera conflicto
- **GIVEN** un candidato de `prof-1` de `10:00` a `10:30` y una lista de turnos existentes que no incluye al turno `t-1` (mismo horario y profesional)
- **WHEN** se valida el candidato con esa lista
- **THEN** la validación es exitosa

#### Scenario: Primer conflicto informado es el de inicio más temprano
- **GIVEN** un candidato de `prof-1` de `10:00` a `11:00` y turnos activos de `prof-1` `t-2` (`10:30-11:00`) y `t-1` (`10:00-10:30`)
- **WHEN** se valida el candidato
- **THEN** la validación falla con `RN-AG-02`, dimensión `profesional` y conflicto con `t-1`

### Requirement: Datos del turno creado
El sistema SHALL guardar el turno nuevo con un `id` único, `estado` `reservado`, `senado` `false`, `esSobreturno` `false`, `origen` (el enviado o `recepcion` por defecto), `creadoPor` igual al usuario de la request y `creadoEn` igual a la hora del reloj inyectado, y MUST responder `201` con ese turno.

#### Scenario: Alta exitosa vía API
- **GIVEN** la API con el seed y el reloj fijo en `2026-11-30T09:00:00-03:00`
- **WHEN** se hace `POST /api/turnos` con `X-Usuario: u-recepcion`, `X-Rol: recepcion` y `{ pacienteId: "pac-01", prestacionId: "prest-control", profesionalId: "prof-1", sillonId: "sillon-1", inicio: "2026-12-01T10:00:00-03:00" }`
- **THEN** la respuesta es `201` con `estado` `reservado`, `senado` `false`, `esSobreturno` `false`, `origen` `recepcion`, `creadoPor` `u-recepcion`, `creadoEn` igual al reloj y `fin` `2026-12-01T13:30:00.000Z`

#### Scenario: Origen whatsapp informado
- **GIVEN** la API con el seed
- **WHEN** se hace `POST /api/turnos` válido con `origen: "whatsapp"`
- **THEN** la respuesta es `201` con `origen` `whatsapp`

### Requirement: Error de regla como 409 con turno en conflicto
Cuando la creación viola una regla de negocio, la API SHALL responder `409` con `{ error: { tipo: "regla", regla, mensaje, dimension?, conflicto?: { turnoId } } }` (DD-08) y MUST NOT guardar el turno.

#### Scenario: Conflicto por profesional vía API
- **GIVEN** la API con el turno de `prof-1` en `sillon-1` de `10:00` a `10:30` ya creado con id `X`
- **WHEN** se hace `POST /api/turnos` como recepción con `prof-1` en `sillon-2`, otro paciente, inicio `10:00`
- **THEN** la respuesta es `409` con `error.regla` `RN-AG-02`, `error.dimension` `profesional` y `error.conflicto.turnoId` `X`, y `GET /api/turnos` sigue devolviendo un solo turno

#### Scenario: Regla de horario vía API
- **GIVEN** la API con el seed
- **WHEN** se hace `POST /api/turnos` como recepción con `prest-trat` e inicio `12:30`
- **THEN** la respuesta es `409` con `error.regla` `RN-AG-04`

### Requirement: Payload de alta inválido
La API SHALL responder `400` con `error.tipo` `entrada` cuando falte o no sea string alguno de `pacienteId`, `prestacionId`, `profesionalId`, `sillonId` o `inicio`; cuando `inicio` no sea una fecha ISO 8601 con zona horaria explícita; cuando `origen` no sea `recepcion`, `whatsapp` ni `telefono`; o cuando un id no exista.

#### Scenario: Falta el inicio
- **GIVEN** la API con el seed
- **WHEN** se hace `POST /api/turnos` como recepción sin `inicio`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

#### Scenario: Inicio sin zona horaria
- **GIVEN** la API con el seed
- **WHEN** se hace `POST /api/turnos` como recepción con `inicio` `2026-12-01T10:00:00`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

#### Scenario: Prestación inexistente
- **GIVEN** la API con el seed
- **WHEN** se hace `POST /api/turnos` como recepción con `prestacionId` `prest-inexistente`
- **THEN** la respuesta es `400` con `error.tipo` `entrada` y un mensaje que menciona la prestación

### Requirement: Permiso de alta por rol
El sistema SHALL permitir crear turnos a los roles `recepcion`, `admin` y `paciente`; MUST rechazar con `403` (`error.tipo` `permiso`) a `odontologo` y a requests sin usuario, sin guardar el turno.

#### Scenario: Odontólogo no puede crear
- **GIVEN** la API con el seed
- **WHEN** se hace `POST /api/turnos` válido con `X-Usuario: u-odonto-1` y `X-Rol: odontologo`
- **THEN** la respuesta es `403` con `error.tipo` `permiso` y no se guarda ningún turno

#### Scenario: Request sin rol no puede crear
- **GIVEN** la API con el seed
- **WHEN** se hace `POST /api/turnos` válido sin headers `X-Usuario` ni `X-Rol`
- **THEN** la respuesta es `403` con `error.tipo` `permiso`

#### Scenario: Admin puede crear
- **GIVEN** la API con el seed
- **WHEN** se hace `POST /api/turnos` válido con `X-Usuario: u-admin` y `X-Rol: admin`
- **THEN** la respuesta es `201`

#### Scenario: Paciente puede crear
- **GIVEN** la API con el seed
- **WHEN** se hace `POST /api/turnos` válido con `X-Rol: paciente` y `origen: "whatsapp"`
- **THEN** la respuesta es `201`

### Requirement: Auditoría del alta
Cada alta exitosa SHALL registrar un evento de auditoría con el usuario, el rol, la fecha del reloj inyectado, la acción de alta, la entidad `turno` y el id del turno creado (RN-AU-01). Un alta rechazada MUST NOT registrar evento.

#### Scenario: Alta exitosa genera evento
- **GIVEN** el reloj fijo en `2026-11-30T09:00:00-03:00` y una auditoría vacía
- **WHEN** `u-recepcion` con rol `recepcion` crea un turno válido
- **THEN** la auditoría tiene un evento con `usuarioId` `u-recepcion`, `rol` `recepcion`, `fecha` igual al reloj, `entidad` `turno` y `entidadId` igual al id del turno

#### Scenario: Alta rechazada no genera evento
- **GIVEN** una auditoría vacía
- **WHEN** se intenta crear un turno con inicio `10:10`
- **THEN** la auditoría sigue vacía

### Requirement: Consulta de turnos con filtros
`GET /api/turnos` SHALL responder `200` con `{ turnos }`: los turnos activos ordenados por inicio, filtrados opcionalmente por `profesionalId`, `sillonId` y el rango `[desde, hasta)` con semántica de solapamiento. `desde` y `hasta` MUST enviarse juntos, como fechas ISO con zona y `desde < hasta`; si no, `400`.

#### Scenario: Filtro por profesional y rango
- **GIVEN** turnos de `prof-1` de `09:00-09:30` y `10:00-10:30` y de `prof-2` de `10:00-10:30`
- **WHEN** se hace `GET /api/turnos?profesionalId=prof-1&desde=2026-12-01T09:30:00-03:00&hasta=2026-12-01T11:00:00-03:00`
- **THEN** la respuesta es `200` con solo el turno de `prof-1` de `10:00-10:30` (el de `09:00-09:30` es contiguo y no se incluye)

#### Scenario: Filtro por sillón
- **GIVEN** turnos en `sillon-1` y en `sillon-2`
- **WHEN** se hace `GET /api/turnos?sillonId=sillon-2`
- **THEN** la respuesta es `200` con solo los turnos de `sillon-2`

#### Scenario: Sin filtros devuelve todos ordenados
- **GIVEN** turnos creados a las `11:00` y a las `09:00`
- **WHEN** se hace `GET /api/turnos`
- **THEN** la respuesta es `200` con los dos turnos, el de `09:00` primero

#### Scenario: Rango incompleto o invertido
- **GIVEN** la API con el seed
- **WHEN** se hace `GET /api/turnos?desde=2026-12-01T09:00:00-03:00` sin `hasta`, o con `desde` posterior a `hasta`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

### Requirement: Transiciones de estado válidas
El sistema SHALL permitir únicamente las transiciones de estado de RN-AG-09: desde `reservado` hacia `confirmado`, `cancelado`, `ausente` o `atendido`; desde `confirmado` hacia `cancelado`, `atendido` o `ausente`. Los estados `cancelado`, `atendido` y `ausente` son finales: toda transición desde ellos, y toda transición a su mismo estado actual, MUST rechazarse con el error de regla `RN-AG-09` sin modificar el turno.

#### Scenario: Reservado pasa a confirmado
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** recepción lo confirma
- **THEN** el turno queda en estado `confirmado`

#### Scenario: Confirmado pasa a atendido
- **GIVEN** el turno `T` en estado `confirmado`
- **WHEN** recepción lo marca atendido
- **THEN** el turno queda en estado `atendido`

#### Scenario: Reservado pasa directo a ausente
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** recepción lo marca ausente
- **THEN** el turno queda en estado `ausente`

#### Scenario: Atendido no puede cancelarse
- **GIVEN** el turno `T` en estado `atendido`
- **WHEN** recepción lo cancela con motivo "Pedido del paciente"
- **THEN** la operación se rechaza con la regla `RN-AG-09` y el turno sigue `atendido`

#### Scenario: Cancelado no puede confirmarse
- **GIVEN** el turno `T` en estado `cancelado`
- **WHEN** recepción lo confirma
- **THEN** la operación se rechaza con la regla `RN-AG-09` y el turno sigue `cancelado`

#### Scenario: Ausente no puede marcarse atendido
- **GIVEN** el turno `T` en estado `ausente`
- **WHEN** recepción lo marca atendido
- **THEN** la operación se rechaza con la regla `RN-AG-09`

#### Scenario: Confirmar un turno ya confirmado
- **GIVEN** el turno `T` en estado `confirmado`
- **WHEN** recepción lo confirma otra vez
- **THEN** la operación se rechaza con la regla `RN-AG-09`

### Requirement: Ventana de cancelación de 24 horas para el paciente
El sistema SHALL permitir que un usuario con rol `paciente` cancele un turno solo si, según el reloj, faltan 24 horas o más para el inicio del turno; si faltan menos de 24 horas (incluido un turno ya iniciado o pasado) MUST rechazarlo con el error de regla `RN-AG-06`. Los roles `recepcion` y `admin` SHALL poder cancelar sin importar la anticipación (RN-AG-06).

#### Scenario: Paciente cancela con 25 horas de anticipación
- **GIVEN** el turno `T` en estado `reservado` y el reloj marca `2026-11-30 09:00`
- **WHEN** el paciente lo cancela con motivo "No puedo asistir"
- **THEN** el turno queda en estado `cancelado`

#### Scenario: Paciente cancela con 23 horas de anticipación
- **GIVEN** el turno `T` en estado `reservado` y el reloj marca `2026-11-30 11:00`
- **WHEN** el paciente lo cancela con motivo "No puedo asistir"
- **THEN** la operación se rechaza con la regla `RN-AG-06` y el turno sigue `reservado`

#### Scenario: Paciente cancela exactamente 24 horas antes
- **GIVEN** el turno `T` en estado `confirmado` y el reloj marca `2026-11-30 10:00`
- **WHEN** el paciente lo cancela con motivo "No puedo asistir"
- **THEN** el turno queda en estado `cancelado`

#### Scenario: Recepción cancela con 1 hora de anticipación
- **GIVEN** el turno `T` en estado `reservado` y el reloj marca `2026-12-01 09:00`
- **WHEN** recepción lo cancela con motivo "Paciente avisó por teléfono"
- **THEN** el turno queda en estado `cancelado`

#### Scenario: Admin cancela un turno ya iniciado
- **GIVEN** el turno `T` en estado `confirmado` y el reloj marca `2026-12-01 10:10`
- **WHEN** admin lo cancela con motivo "Corte de luz"
- **THEN** el turno queda en estado `cancelado`

### Requirement: Datos de la cancelación
Al cancelar, el sistema SHALL conservar el turno con estado `cancelado`, el motivo informado, el identificador del usuario que canceló y la fecha de actualización tomada del reloj. El motivo MUST ser un texto no vacío; si falta, la operación MUST rechazarse como entrada inválida sin modificar el turno.

#### Scenario: Cancelación guarda motivo y autor
- **GIVEN** el turno `T` en estado `reservado` y el reloj marca `2026-11-30 09:00`
- **WHEN** `u-recepcion` lo cancela con motivo "Paciente avisó por teléfono"
- **THEN** el turno queda con estado `cancelado`, motivo de cancelación "Paciente avisó por teléfono", cancelado por `u-recepcion` y fecha de actualización `2026-11-30 09:00`

#### Scenario: Cancelación sin motivo
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** recepción lo cancela sin motivo (o con motivo vacío)
- **THEN** la operación se rechaza como entrada inválida y el turno sigue `reservado`

### Requirement: Cancelar libera el horario
Un turno cancelado SHALL dejar de ocupar al profesional, al sillón y al paciente: un turno nuevo en el mismo horario, profesional y sillón MUST aceptarse (RN-AG-06, RN-AG-10). Al cancelar, el sistema SHALL emitir un evento interno `turnoLiberado` con el identificador del turno, profesional, sillón, inicio y fin liberados, sin notificar a nadie más en este change.

#### Scenario: Reocupar el horario tras cancelar
- **GIVEN** el turno `T` cancelado
- **WHEN** recepción crea un turno de `prest-control` para `pac-02` con `prof-1` en `sillon-1` el `2026-12-01` a las `10:00`
- **THEN** el turno nuevo se crea en estado `reservado`

#### Scenario: Cancelar emite turnoLiberado
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** recepción lo cancela con motivo "Paciente avisó por teléfono"
- **THEN** se emite un evento `turnoLiberado` con el id de `T`, `prof-1`, `sillon-1`, inicio `10:00` y fin `10:30`

#### Scenario: Cancelación rechazada no libera
- **GIVEN** el turno `T` en estado `reservado` y el reloj marca `2026-11-30 11:00`
- **WHEN** el paciente lo cancela y la operación se rechaza por `RN-AG-06`
- **THEN** no se emite `turnoLiberado` y crear otro turno de `prof-1` en `sillon-1` a las `10:00` se rechaza con `RN-AG-02`

### Requirement: Permisos para cambiar el estado del turno
El sistema SHALL aplicar la matriz RBAC: confirmar lo pueden `admin`, `recepcion` y `paciente`; cancelar lo pueden `admin`, `recepcion` y `paciente` (este último sujeto a la ventana de 24 horas); marcar atendido o ausente lo pueden `admin`, `recepcion` y `odontologo`, este último solo en turnos de su propio profesional. Cualquier otro caso, incluido un request sin rol, MUST rechazarse como falta de permiso sin modificar el turno. El permiso se verifica antes que la regla de estado.

#### Scenario: Odontólogo no puede cancelar
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** `u-odonto-1` lo cancela con motivo "Me enfermé"
- **THEN** la operación se rechaza por falta de permiso y el turno sigue `reservado`

#### Scenario: Odontólogo no puede confirmar
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** `u-odonto-1` lo confirma
- **THEN** la operación se rechaza por falta de permiso

#### Scenario: Odontólogo marca atendido su propio turno
- **GIVEN** el turno `T` de `prof-1` en estado `confirmado`
- **WHEN** `u-odonto-1` lo marca atendido
- **THEN** el turno queda en estado `atendido`

#### Scenario: Odontólogo no puede marcar ausente un turno de otro profesional
- **GIVEN** el turno `T` de `prof-1` en estado `reservado`
- **WHEN** `u-odonto-2` lo marca ausente
- **THEN** la operación se rechaza por falta de permiso y el turno sigue `reservado`

#### Scenario: Paciente no puede marcar atendido
- **GIVEN** el turno `T` en estado `confirmado`
- **WHEN** el paciente lo marca atendido
- **THEN** la operación se rechaza por falta de permiso

#### Scenario: Paciente confirma
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** el paciente lo confirma
- **THEN** el turno queda en estado `confirmado`

#### Scenario: Request sin rol
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** un usuario sin rol lo confirma
- **THEN** la operación se rechaza por falta de permiso

#### Scenario: Permiso se evalúa antes que el estado
- **GIVEN** el turno `T` en estado `atendido`
- **WHEN** `u-odonto-1` lo cancela
- **THEN** la operación se rechaza por falta de permiso (no por `RN-AG-09`)

### Requirement: Auditoría de cambios de estado y cancelación
Cada cambio de estado y cada cancelación exitosos SHALL registrar un evento de auditoría inmutable con usuario, rol, fecha del reloj, entidad `turno`, id del turno, la acción (`confirmar`, `atender`, `ausente` o `cancelar`) y el detalle antes/después del turno (RN-AU-01). Una operación rechazada MUST NOT registrar eventos.

#### Scenario: Cancelación genera evento de auditoría
- **GIVEN** el turno `T` en estado `reservado` y el reloj marca `2026-11-30 09:00`
- **WHEN** `u-recepcion` lo cancela con motivo "Paciente avisó por teléfono"
- **THEN** se registra un evento con usuario `u-recepcion`, rol `recepcion`, acción `cancelar`, entidad `turno`, el id de `T`, fecha `2026-11-30 09:00` y un detalle con el estado anterior `reservado` y el posterior `cancelado` con su motivo

#### Scenario: Confirmación genera evento de auditoría
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** `u-recepcion` lo confirma
- **THEN** se registra un evento con acción `confirmar` y detalle con estado anterior `reservado` y posterior `confirmado`

#### Scenario: Operación rechazada no genera evento
- **GIVEN** el turno `T` en estado `atendido`
- **WHEN** recepción lo cancela y la operación se rechaza por `RN-AG-09`
- **THEN** no se registra ningún evento de auditoría nuevo

### Requirement: Endpoints de cambio de estado
La API SHALL exponer `POST /api/turnos/:id/confirmar`, `POST /api/turnos/:id/atender`, `POST /api/turnos/:id/ausente` y `POST /api/turnos/:id/cancelar` (este último con cuerpo JSON `{ "motivo": string }`). Una operación exitosa MUST responder `200` con el turno actualizado; una violación de regla `409` con el código de la regla y el turno en conflicto (el propio turno, DD-08); falta de permiso `403`; entrada inválida `400`; turno inexistente `404`.

#### Scenario: Confirmar vía API
- **GIVEN** la API con el seed y el turno `T` creado en estado `reservado`
- **WHEN** recepción hace `POST /api/turnos/{id de T}/confirmar`
- **THEN** responde `200` con el turno en estado `confirmado`

#### Scenario: Cancelar un turno atendido vía API
- **GIVEN** la API con el turno `T` en estado `atendido`
- **WHEN** recepción hace `POST /api/turnos/{id de T}/cancelar` con motivo "Error de carga"
- **THEN** responde `409` con `error.regla` `RN-AG-09` y `error.conflicto.turnoId` igual al id de `T`

#### Scenario: Paciente fuera de ventana vía API
- **GIVEN** la API con el reloj en `2026-11-30 11:00` y el turno `T` en estado `reservado`
- **WHEN** un request con rol `paciente` hace `POST /api/turnos/{id de T}/cancelar` con motivo "No puedo asistir"
- **THEN** responde `409` con `error.regla` `RN-AG-06` y `error.conflicto.turnoId` igual al id de `T`

#### Scenario: Cancelar y reocupar vía API
- **GIVEN** la API con el turno `T` creado
- **WHEN** recepción hace `POST /api/turnos/{id de T}/cancelar` con motivo "Paciente avisó por teléfono" y luego `POST /api/turnos` para `pac-02` con `prof-1`, `sillon-1`, `prest-control` el `2026-12-01T10:00:00-03:00`
- **THEN** la cancelación responde `200` con estado `cancelado`, motivo y `canceladoPor` `u-recepcion`, y el alta responde `201`

#### Scenario: Odontólogo cancela vía API
- **GIVEN** la API con el turno `T` creado
- **WHEN** un request con `X-Usuario: u-odonto-1` y `X-Rol: odontologo` hace `POST /api/turnos/{id de T}/cancelar` con motivo "Me enfermé"
- **THEN** responde `403` y el turno sigue `reservado`

#### Scenario: Odontólogo atiende su turno vía API
- **GIVEN** la API con el turno `T` de `prof-1` creado
- **WHEN** un request con `X-Usuario: u-odonto-1` y `X-Rol: odontologo` hace `POST /api/turnos/{id de T}/atender`
- **THEN** responde `200` con el turno en estado `atendido`

#### Scenario: Cancelar sin motivo vía API
- **GIVEN** la API con el turno `T` creado
- **WHEN** recepción hace `POST /api/turnos/{id de T}/cancelar` con cuerpo `{}`
- **THEN** responde `400` y el turno sigue `reservado`

#### Scenario: Turno inexistente vía API
- **GIVEN** la API con el seed
- **WHEN** recepción hace `POST /api/turnos/turno-inexistente/confirmar`
- **THEN** responde `404`

### Requirement: Reprogramación revalida la agenda excluyendo el propio turno
Al reprogramar un turno, el sistema SHALL aplicar sobre el nuevo horario las mismas reglas que al crear (RN-AG-01 intervalo `[inicio, fin)`, RN-AG-03 alineación a bloques de 15 minutos, RN-AG-04 horario de atención y bloqueos, RN-AG-02 solapamiento por profesional y por sillón, RN-AG-05 solapamiento del paciente), con el mismo orden y los mismos códigos de error, comparando contra los turnos activos **excepto el propio turno reprogramado** (RN-AG-08). El nuevo `fin` MUST ser el nuevo inicio más la duración de la prestación del turno. Si alguna regla falla, la reprogramación MUST rechazarse sin modificar el turno.

#### Scenario: Correr el turno 15 minutos hacia adelante solapando consigo mismo
- **GIVEN** el turno `T` de `10:00` a `10:30`
- **WHEN** recepción reprograma `T` a `10:15`
- **THEN** la reprogramación se acepta y `T` queda de `10:15` a `10:45`

#### Scenario: Mover a un horario ocupado por otro turno del mismo sillón
- **GIVEN** el turno `T` y otro turno `U` de `pac-02` con `prof-2` en `sillon-1` de `11:00` a `11:30`
- **WHEN** recepción reprograma `T` a `11:00`
- **THEN** la reprogramación se rechaza con la regla `RN-AG-02`, dimensión `sillon`, turno en conflicto `U`, y `T` sigue de `10:00` a `10:30`

#### Scenario: Mover a un horario ocupado por otro turno del mismo profesional
- **GIVEN** el turno `T` y otro turno `U` de `pac-02` con `prof-1` en `sillon-2` de `11:00` a `11:30`
- **WHEN** recepción reprograma `T` a `11:15`
- **THEN** la reprogramación se rechaza con la regla `RN-AG-02`, dimensión `profesional` y turno en conflicto `U`

#### Scenario: Mover a un horario en que el paciente ya tiene otro turno
- **GIVEN** el turno `T` y otro turno `V` de `pac-01` con `prof-2` en `sillon-2` de `11:00` a `11:30`
- **WHEN** recepción reprograma `T` a `11:00`
- **THEN** la reprogramación se rechaza con la regla `RN-AG-05`, dimensión `paciente` y turno en conflicto `V`

#### Scenario: Mover fuera de la franja del profesional
- **GIVEN** el turno `T`
- **WHEN** recepción reprograma `T` a `12:45` (terminaría `13:15`, fuera de la franja `09:00-13:00`)
- **THEN** la reprogramación se rechaza con la regla `RN-AG-04` y `T` sigue de `10:00` a `10:30`

#### Scenario: Mover sobre un bloqueo
- **GIVEN** el turno `T`
- **WHEN** recepción reprograma `T` a `18:30`
- **THEN** la reprogramación se rechaza con la regla `RN-AG-04`

#### Scenario: Mover a un inicio no alineado a 15 minutos
- **GIVEN** el turno `T`
- **WHEN** recepción reprograma `T` a `10:10`
- **THEN** la reprogramación se rechaza con la regla `RN-AG-03`

#### Scenario: Mover pegado a otro turno del mismo sillón
- **GIVEN** el turno `T` y otro turno `U` de `pac-02` con `prof-2` en `sillon-1` de `11:00` a `11:30`
- **WHEN** recepción reprograma `T` a `10:30` (terminaría justo a las `11:00`)
- **THEN** la reprogramación se acepta y `T` queda de `10:30` a `11:00`

#### Scenario: Mover a otro día
- **GIVEN** el turno `T`
- **WHEN** recepción reprograma `T` al miércoles `2026-12-02` a las `15:00`
- **THEN** la reprogramación se acepta y `T` queda el `2026-12-02` de `15:00` a `15:30`

### Requirement: Reprogramación a otro profesional o sillón
La reprogramación SHALL aceptar, además del nuevo inicio, un profesional y/o un sillón distintos; si no se indican, se conservan los del turno. Las reglas de la reprogramación MUST evaluarse con el profesional y el sillón resultantes. Un profesional o sillón indicado que no existe MUST rechazarse como entrada inválida sin modificar el turno.

#### Scenario: Cambiar de sillón en el mismo horario
- **GIVEN** el turno `T` en `sillon-1`
- **WHEN** recepción reprograma `T` a `10:00` en `sillon-2`
- **THEN** la reprogramación se acepta y `T` queda en `sillon-2` de `10:00` a `10:30` con `prof-1`

#### Scenario: Cambiar de profesional
- **GIVEN** el turno `T` con `prof-1`
- **WHEN** recepción reprograma `T` a `11:00` con `prof-2`
- **THEN** la reprogramación se acepta y `T` queda con `prof-2` de `11:00` a `11:30` en `sillon-1`

#### Scenario: El nuevo profesional está ocupado
- **GIVEN** el turno `T` y otro turno `U` de `pac-02` con `prof-2` en `sillon-2` de `10:00` a `10:30`
- **WHEN** recepción reprograma `T` a `10:00` con `prof-2`
- **THEN** la reprogramación se rechaza con la regla `RN-AG-02`, dimensión `profesional` y turno en conflicto `U`

#### Scenario: Profesional inexistente
- **GIVEN** el turno `T`
- **WHEN** recepción reprograma `T` a `11:00` con el profesional `prof-inexistente`
- **THEN** la reprogramación se rechaza como entrada inválida y `T` no cambia

### Requirement: Estados que admiten reprogramación
Solo los turnos en estado `reservado` o `confirmado` SHALL poder reprogramarse, y la reprogramación MUST conservar su estado. Reprogramar un turno en estado final (`cancelado`, `atendido` o `ausente`) MUST rechazarse con el error de regla `RN-AG-09` y el propio turno como turno en conflicto, sin modificarlo. La regla de estado se evalúa antes que la ventana de 24 horas y que las reglas de agenda.

#### Scenario: Reprogramar un turno confirmado conserva el estado
- **GIVEN** el turno `T` en estado `confirmado`
- **WHEN** recepción reprograma `T` a `11:00`
- **THEN** la reprogramación se acepta y `T` sigue `confirmado`, de `11:00` a `11:30`

#### Scenario: Turno cancelado no se reprograma
- **GIVEN** el turno `T` en estado `cancelado`
- **WHEN** recepción reprograma `T` a `11:00`
- **THEN** la reprogramación se rechaza con la regla `RN-AG-09` y turno en conflicto `T`

#### Scenario: Turno atendido no se reprograma
- **GIVEN** el turno `T` en estado `atendido`
- **WHEN** recepción reprograma `T` a `11:00`
- **THEN** la reprogramación se rechaza con la regla `RN-AG-09` y `T` sigue `atendido` de `10:00` a `10:30`

#### Scenario: Turno ausente no se reprograma aunque el horario sea inválido
- **GIVEN** el turno `T` en estado `ausente`
- **WHEN** recepción reprograma `T` a `12:45`
- **THEN** la reprogramación se rechaza con la regla `RN-AG-09` (no `RN-AG-04`)

### Requirement: Ventana de 24 horas del paciente al reprogramar
Un usuario con rol `paciente` SHALL poder reprogramar un turno solo si, según el reloj, faltan 24 horas o más para el inicio **actual** del turno (RN-AG-08, misma ventana que cancelar); si faltan menos, MUST rechazarse con el error de regla `RN-AG-06` y el propio turno como turno en conflicto, sin modificarlo, cualquiera sea el nuevo horario pedido. Los roles `recepcion` y `admin` SHALL poder reprogramar sin importar la anticipación. La ventana se evalúa antes que las reglas de agenda.

#### Scenario: Paciente reprograma con 25 horas de anticipación
- **GIVEN** el turno `T` y el reloj marca `2026-11-30 09:00`
- **WHEN** el paciente reprograma `T` al `2026-12-02` a las `10:00`
- **THEN** la reprogramación se acepta

#### Scenario: Paciente reprograma exactamente 24 horas antes
- **GIVEN** el turno `T` y el reloj marca `2026-11-30 10:00`
- **WHEN** el paciente reprograma `T` al `2026-12-02` a las `10:00`
- **THEN** la reprogramación se acepta

#### Scenario: Paciente reprograma con 23 horas de anticipación
- **GIVEN** el turno `T` y el reloj marca `2026-11-30 11:00`
- **WHEN** el paciente reprograma `T` al `2026-12-02` a las `10:00`
- **THEN** la reprogramación se rechaza con la regla `RN-AG-06`, turno en conflicto `T`, y `T` sigue de `10:00` a `10:30` del `2026-12-01`

#### Scenario: Recepción reprograma con 1 hora de anticipación
- **GIVEN** el turno `T` y el reloj marca `2026-12-01 09:00`
- **WHEN** recepción reprograma `T` a `11:00`
- **THEN** la reprogramación se acepta

#### Scenario: Paciente fuera de ventana hacia un horario inválido
- **GIVEN** el turno `T` y el reloj marca `2026-11-30 11:00`
- **WHEN** el paciente reprograma `T` a `12:45`
- **THEN** la reprogramación se rechaza con la regla `RN-AG-06` (no `RN-AG-04`)

### Requirement: Permisos para reprogramar
El sistema SHALL permitir reprogramar a los roles `admin`, `recepcion` y `paciente` (este último sujeto a la ventana de 24 horas). El rol `odontologo`, incluso sobre turnos de su propio profesional, y un request sin rol MUST rechazarse como falta de permiso sin modificar el turno. El permiso se verifica antes que cualquier otra validación.

#### Scenario: Admin reprograma
- **GIVEN** el turno `T`
- **WHEN** `u-admin` reprograma `T` a `11:00`
- **THEN** la reprogramación se acepta

#### Scenario: Odontólogo no puede reprogramar su propio turno
- **GIVEN** el turno `T` de `prof-1`
- **WHEN** `u-odonto-1` reprograma `T` a `11:00`
- **THEN** la reprogramación se rechaza por falta de permiso y `T` sigue de `10:00` a `10:30`

#### Scenario: Request sin rol
- **GIVEN** el turno `T`
- **WHEN** un usuario sin rol reprograma `T` a `11:00`
- **THEN** la reprogramación se rechaza por falta de permiso

#### Scenario: Permiso antes que el estado
- **GIVEN** el turno `T` en estado `atendido`
- **WHEN** `u-odonto-1` reprograma `T` a `11:00`
- **THEN** la reprogramación se rechaza por falta de permiso (no por `RN-AG-09`)

### Requirement: Datos de la reprogramación
Una reprogramación aceptada SHALL conservar el identificador, el paciente, la prestación, el estado, el origen, el autor y la fecha de creación del turno, y SHALL actualizar inicio, fin, profesional, sillón y la fecha de actualización tomada del reloj. El nuevo inicio es obligatorio y MUST ser una fecha válida con zona horaria explícita; si falta o es inválido, la operación MUST rechazarse como entrada inválida. Pedir exactamente el mismo inicio, profesional y sillón actuales MUST rechazarse como entrada inválida (no hay nada que reprogramar). Un turno inexistente MUST informarse como no encontrado.

#### Scenario: Reprogramación conserva identidad y actualiza horario
- **GIVEN** el turno `T` creado por `u-recepcion` y el reloj marca `2026-11-30 09:00`
- **WHEN** recepción reprograma `T` a `11:00`
- **THEN** `T` conserva su id, `pac-01`, `prest-control`, estado `reservado` y creador `u-recepcion`, queda de `11:00` a `11:30` y su fecha de actualización es `2026-11-30 09:00`

#### Scenario: Reprogramación sin nuevo inicio
- **GIVEN** el turno `T`
- **WHEN** recepción reprograma `T` sin indicar el nuevo inicio
- **THEN** la reprogramación se rechaza como entrada inválida y `T` no cambia

#### Scenario: Reprogramación al mismo horario, profesional y sillón
- **GIVEN** el turno `T`
- **WHEN** recepción reprograma `T` a `10:00` con `prof-1` en `sillon-1`
- **THEN** la reprogramación se rechaza como entrada inválida y no se registra auditoría

#### Scenario: Reprogramar un turno inexistente
- **GIVEN** ningún turno con id `turno-inexistente`
- **WHEN** recepción reprograma `turno-inexistente` a `11:00`
- **THEN** la operación se informa como turno no encontrado

### Requirement: Reprogramación libera el horario anterior
Tras una reprogramación aceptada, el horario anterior SHALL dejar de estar ocupado por el turno: un turno nuevo en el horario, profesional y sillón anteriores MUST aceptarse si no choca con el horario nuevo. Al reprogramar, el sistema SHALL emitir un evento interno `turnoLiberado` con el identificador del turno y el profesional, sillón, inicio y fin **anteriores**, sin notificar a nadie más en este change. Una reprogramación rechazada MUST NOT emitir el evento ni liberar el horario.

#### Scenario: El horario anterior acepta un turno nuevo
- **GIVEN** el turno `T` reprogramado a `11:00`
- **WHEN** recepción crea un turno de `prest-control` para `pac-02` con `prof-1` en `sillon-1` el `2026-12-01` a las `10:00`
- **THEN** el turno nuevo se crea en estado `reservado`

#### Scenario: Reprogramar emite turnoLiberado con el horario anterior
- **GIVEN** el turno `T` de `prof-1` en `sillon-1` de `10:00` a `10:30`
- **WHEN** recepción reprograma `T` a `11:00` en `sillon-2`
- **THEN** se emite un evento `turnoLiberado` con el id de `T`, `prof-1`, `sillon-1`, inicio `10:00` y fin `10:30`

#### Scenario: Reprogramación rechazada no libera
- **GIVEN** el turno `T` y el reloj marca `2026-11-30 11:00`
- **WHEN** el paciente reprograma `T` a `11:00` y se rechaza por `RN-AG-06`
- **THEN** no se emite `turnoLiberado` y crear otro turno de `prof-1` en `sillon-1` a las `10:00` se rechaza con `RN-AG-02`

### Requirement: Auditoría de la reprogramación
Cada reprogramación aceptada SHALL registrar un evento de auditoría inmutable con usuario, rol, fecha del reloj, entidad `turno`, id del turno, acción `reprogramar` y el detalle del turno antes y después (RN-AU-01). Una reprogramación rechazada MUST NOT registrar eventos.

#### Scenario: Reprogramación genera evento de auditoría con antes y después
- **GIVEN** el turno `T` y el reloj marca `2026-11-30 09:00`
- **WHEN** `u-recepcion` reprograma `T` a `11:00` en `sillon-2`
- **THEN** se registra un evento con usuario `u-recepcion`, rol `recepcion`, acción `reprogramar`, entidad `turno`, el id de `T`, fecha `2026-11-30 09:00` y un detalle con el antes (`10:00`, `sillon-1`) y el después (`11:00`, `sillon-2`)

#### Scenario: Reprogramación rechazada no genera evento
- **GIVEN** el turno `T` y otro turno `U` en `sillon-1` de `11:00` a `11:30`
- **WHEN** recepción reprograma `T` a `11:00` y se rechaza por `RN-AG-02`
- **THEN** no se registra ningún evento de auditoría nuevo

### Requirement: Endpoint de reprogramación
La API SHALL exponer `POST /api/turnos/:id/reprogramar` con cuerpo JSON `{ "inicio": string, "profesionalId"?: string, "sillonId"?: string }`, donde `inicio` es una fecha ISO 8601 con zona horaria explícita. Una reprogramación aceptada MUST responder `200` con el turno actualizado; una violación de regla `409` con el código de la regla, la dimensión cuando aplique y el turno en conflicto (DD-08); falta de permiso `403`; entrada inválida `400`; turno inexistente `404`.

#### Scenario: Reprogramar vía API
- **GIVEN** la API con el seed y el turno `T` creado
- **WHEN** recepción hace `POST /api/turnos/{id de T}/reprogramar` con `inicio` `2026-12-01T10:15:00-03:00`
- **THEN** responde `200` con el turno de `10:15` a `10:45` y el mismo id

#### Scenario: Conflicto de sillón vía API
- **GIVEN** la API con el turno `T` y otro turno `U` de `pac-02` con `prof-2` en `sillon-1` de `11:00` a `11:30`
- **WHEN** recepción hace `POST /api/turnos/{id de T}/reprogramar` con `inicio` `2026-12-01T11:00:00-03:00`
- **THEN** responde `409` con `error.regla` `RN-AG-02`, `error.dimension` `sillon` y `error.conflicto.turnoId` igual al id de `U`

#### Scenario: Fuera de franja vía API
- **GIVEN** la API con el turno `T`
- **WHEN** recepción hace `POST /api/turnos/{id de T}/reprogramar` con `inicio` `2026-12-01T12:45:00-03:00`
- **THEN** responde `409` con `error.regla` `RN-AG-04`

#### Scenario: Reocupar el horario anterior vía API
- **GIVEN** la API con el turno `T` reprogramado a `2026-12-01T11:00:00-03:00`
- **WHEN** recepción hace `POST /api/turnos` para `pac-02` con `prof-1`, `sillon-1`, `prest-control` el `2026-12-01T10:00:00-03:00`
- **THEN** responde `201`

#### Scenario: Paciente fuera de ventana vía API
- **GIVEN** la API con el reloj en `2026-11-30 11:00` y el turno `T`
- **WHEN** un request con rol `paciente` hace `POST /api/turnos/{id de T}/reprogramar` con `inicio` `2026-12-02T10:00:00-03:00`
- **THEN** responde `409` con `error.regla` `RN-AG-06` y `error.conflicto.turnoId` igual al id de `T`

#### Scenario: Odontólogo reprograma vía API
- **GIVEN** la API con el turno `T`
- **WHEN** un request con `X-Usuario: u-odonto-1` y `X-Rol: odontologo` hace `POST /api/turnos/{id de T}/reprogramar` con `inicio` `2026-12-01T11:00:00-03:00`
- **THEN** responde `403` y `T` sigue de `10:00` a `10:30`

#### Scenario: Inicio sin zona horaria vía API
- **GIVEN** la API con el turno `T`
- **WHEN** recepción hace `POST /api/turnos/{id de T}/reprogramar` con `inicio` `2026-12-01T11:00:00`
- **THEN** responde `400`

#### Scenario: Turno inexistente vía API
- **GIVEN** la API con el seed
- **WHEN** recepción hace `POST /api/turnos/turno-inexistente/reprogramar` con `inicio` `2026-12-01T11:00:00-03:00`
- **THEN** responde `404` con `error.tipo` `no-encontrado`
