## ADDED Requirements

> Convenciones adicionales: salvo indicación, el turno de referencia `T` es de `prest-control` para `pac-01` con `prof-1` en `sillon-1` el martes `2026-12-01` de `10:00` a `10:30` (UTC-03:00), creado por recepción. "El reloj marca X" significa que el `Clock` inyectado devuelve X. Usuarios simulados del seed: `u-admin` (admin), `u-recepcion` (recepcion), `u-odonto-1` (odontologo de `prof-1`), `u-odonto-2` (odontologo de `prof-2`); el paciente se identifica solo con el rol `paciente`.

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
