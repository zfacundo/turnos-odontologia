## ADDED Requirements

> Convenciones adicionales: salvo indicación, el turno de referencia `T` es de `prest-control` (30 min) para `pac-01` con `prof-1` en `sillon-1` el martes `2026-12-01` de `10:00` a `10:30` (UTC-03:00), creado por recepción en estado `reservado`, y el reloj marca `2026-11-30 09:00`. "El reloj marca X" significa que el `Clock` inyectado devuelve X. Horario de atención del seed: lunes a viernes `09:00-13:00` y `14:00-19:00`; bloqueo "reservado urgencias" de `18:30` a `19:00` cada día hábil. Usuarios simulados del seed: `u-admin` (admin), `u-recepcion` (recepcion), `u-odonto-1` (odontologo de `prof-1`); el paciente se identifica solo con el rol `paciente`. "Reprogramar `T` a H" significa pedir el nuevo inicio H el mismo día, manteniendo profesional y sillón salvo que se indique otro.

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
