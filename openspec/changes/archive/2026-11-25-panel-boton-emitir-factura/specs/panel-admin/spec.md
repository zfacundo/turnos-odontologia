## ADDED Requirements

### Requirement: Acción "Emitir factura" para recepción y administración
El detalle del turno de la agenda semanal del panel SHALL mostrar la acción "Emitir factura" solo a las sesiones con rol `recepcion` o `admin`, con el mismo comportamiento para los dos. Para `odontologo`, MUST NOT mostrarse. Con el turno en estado `atendido`, la acción MUST ser un enlace que navega en la misma pestaña a `/sim/arca.html?turnoId=<id>`, con el id codificado con `encodeURIComponent`. La acción MUST NOT llamar a la API.

#### Scenario: Recepción con un turno atendido
- **GIVEN** una sesión de recepción y el turno `t-1` en estado `atendido`
- **WHEN** abre el detalle de `t-1` en la agenda semanal
- **THEN** ve la acción "Emitir factura" habilitada, con destino `/sim/arca.html?turnoId=t-1`
- **AND** al elegirla, el navegador abre ese destino en la misma pestaña

#### Scenario: Administración con un turno atendido
- **GIVEN** una sesión de admin y el turno `t-1` en estado `atendido`
- **WHEN** abre el detalle de `t-1` en la agenda semanal
- **THEN** ve la acción "Emitir factura" habilitada, con destino `/sim/arca.html?turnoId=t-1`
- **AND** al elegirla, el navegador abre ese destino en la misma pestaña

#### Scenario: Odontólogo no ve la acción
- **GIVEN** una sesión de odontólogo y un turno propio en estado `atendido`
- **WHEN** abre el detalle del turno
- **THEN** no aparece la acción "Emitir factura"

#### Scenario: Id con caracteres especiales
- **GIVEN** una sesión de recepción y un turno `atendido` con id `t 1/&?`
- **WHEN** se decide la acción de factura para ese turno
- **THEN** el destino es `/sim/arca.html?turnoId=t%201%2F%26%3F`

### Requirement: "Emitir factura" deshabilitada si el turno no está atendido
Para las sesiones de recepción y de administración, con el turno en cualquier estado distinto de `atendido`, la acción "Emitir factura" SHALL mostrarse deshabilitada. MUST NOT tener destino de navegación, MUST tener `aria-disabled="true"` y MUST mostrar el texto de ayuda visible "Disponible cuando el turno esté atendido".

#### Scenario: Recepción con un turno reservado
- **GIVEN** una sesión de recepción y un turno en estado `reservado`
- **WHEN** abre el detalle del turno
- **THEN** ve la acción "Emitir factura" deshabilitada, con `aria-disabled="true"` y sin destino de navegación
- **AND** ve el texto "Disponible cuando el turno esté atendido"

#### Scenario: Recepción con un turno confirmado
- **GIVEN** una sesión de recepción y un turno en estado `confirmado`
- **WHEN** abre el detalle del turno
- **THEN** la acción "Emitir factura" aparece deshabilitada, con el texto "Disponible cuando el turno esté atendido"

#### Scenario: Administración con un turno reservado
- **GIVEN** una sesión de admin y un turno en estado `reservado`
- **WHEN** abre el detalle del turno
- **THEN** ve la acción "Emitir factura" deshabilitada, con `aria-disabled="true"` y sin destino de navegación
- **AND** ve el texto "Disponible cuando el turno esté atendido"

#### Scenario: Recepción con un turno cancelado o ausente
- **GIVEN** una sesión de recepción y un turno en estado `cancelado` o `ausente`
- **WHEN** se decide la acción de factura para ese turno
- **THEN** la acción es visible, está deshabilitada y no tiene destino de navegación
