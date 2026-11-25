# agenda-turnos Specification

## Purpose

Permite crear y consultar turnos de la agenda del consultorio garantizando que no se solapen por profesional, por sillón ni por paciente, que respeten la duración de la prestación, los bloques de 15 minutos, el horario de atención y los bloqueos, y que cada alta quede auditada.

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

### Requirement: Alta de turno con sillón y profesional activos
El sistema SHALL rechazar el alta de un turno cuando el sillón o el profesional elegidos están inactivos, respondiendo `409` con `error.regla` igual a `RN-CF-04` y sin persistir el turno. La verificación MUST aplicarse en `POST /api/turnos` con la misma forma de error que las demás reglas de agenda.

#### Scenario: Sillón inactivo rechaza el alta
- **GIVEN** el sillón `sillon-1` con `activo` en `false`
- **WHEN** recepción hace `POST /api/turnos` para un horario válido en `sillon-1`
- **THEN** la respuesta es `409` con `error.regla` `RN-CF-04` y no se crea el turno

#### Scenario: Profesional inactivo rechaza el alta
- **GIVEN** el profesional `prof-1` con `activo` en `false` y un sillón activo
- **WHEN** recepción hace `POST /api/turnos` para un horario válido de `prof-1`
- **THEN** la respuesta es `409` con `error.regla` `RN-CF-04` y no se crea el turno

#### Scenario: Desactivar un recurso impide crear turnos nuevos sobre él
- **GIVEN** un sillón activo con un turno existente
- **WHEN** el administrador lo desactiva y recepción intenta crear otro turno en ese sillón
- **THEN** la respuesta es `409` con `RN-CF-04`, mientras el turno anterior sigue existiendo

#### Scenario: Recursos activos mantienen el alta exitosa
- **GIVEN** el sillón `sillon-1` y el profesional `prof-1` activos
- **WHEN** recepción hace `POST /api/turnos` para un horario válido
- **THEN** la respuesta es `201` y el turno queda `reservado`
