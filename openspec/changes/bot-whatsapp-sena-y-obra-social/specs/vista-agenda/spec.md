## ADDED Requirements

### Requirement: Marca de seña pagada
La tarjeta de un turno con `senado` `true` SHALL mostrar el texto "Seña pagada", sin importar si la seña se pagó desde el bot de WhatsApp o desde el simulador de Mercado Pago. Un turno sin seña MUST NOT mostrarlo.

#### Scenario: Turno señado desde el bot
- **GIVEN** un turno de `pac-01` reservado por WhatsApp con la seña aprobada
- **WHEN** recepción abre la agenda del día del turno
- **THEN** la tarjeta del turno muestra "Seña pagada" junto al ícono de WhatsApp

#### Scenario: Turno sin seña
- **GIVEN** un turno con `senado` `false`
- **WHEN** se muestra en la agenda
- **THEN** su tarjeta no muestra "Seña pagada"
