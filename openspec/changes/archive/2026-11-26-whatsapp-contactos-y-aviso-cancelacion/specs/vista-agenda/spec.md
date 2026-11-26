## ADDED Requirements

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
