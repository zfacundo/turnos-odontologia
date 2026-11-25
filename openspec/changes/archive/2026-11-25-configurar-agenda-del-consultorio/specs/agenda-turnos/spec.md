# Spec Delta

## ADDED Requirements

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
