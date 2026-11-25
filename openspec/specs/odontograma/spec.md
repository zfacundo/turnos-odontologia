# odontograma Specification

## Purpose
TBD - created by archiving change odontograma-donde-te-duele. Update Purpose after archive.

## Requirements

### Requirement: Piezas FDI permanentes

El sistema SHALL admitir exactamente 32 piezas permanentes,
organizadas en cuatro cuadrantes según RN-OD-01.

#### Scenario: Piezas válidas
- **WHEN** se inicializa el odontograma
- **THEN** existen 32 piezas distribuidas en cuatro cuadrantes

#### Scenario: Número inválido
- **WHEN** se intenta registrar la pieza 19 o 51
- **THEN** el sistema rechaza la operación

### Requirement: Selección de piezas y síntomas

La interfaz SHALL mostrar el nombre de la pieza seleccionada
y permitir seleccionar síntomas y caras dentales.

#### Scenario: Seleccionar pieza 16
- **WHEN** el paciente selecciona la pieza 16
- **THEN** ve el nombre "Primer molar superior derecho"
- **AND** puede seleccionar síntomas y caras dentales

#### Scenario: Síntoma inválido
- **WHEN** se envía un síntoma no reconocido
- **THEN** el servidor rechaza la operación

### Requirement: Asociación de piezas con turnos

El sistema SHALL asociar las piezas a un turno existente
mediante PUT /api/turnos/:id/piezas.

#### Scenario: Guardar pieza 36
- **GIVEN** que existe un turno válido
- **WHEN** se agrega la pieza 36 con dolor al masticar
- **THEN** queda asociada al turno con estado a_revisar

#### Scenario: Consultar piezas
- **GIVEN** que existen piezas asociadas a un turno
- **WHEN** se consulta GET /api/turnos/:id/piezas
- **THEN** se devuelven las piezas registradas en ese turno

#### Scenario: Turno inexistente
- **WHEN** se consultan piezas de un turno inexistente
- **THEN** el servidor responde HTTP 404

### Requirement: Estados y permisos

El sistema SHALL utilizar los estados a_revisar y hecho.
Solo el odontólogo SHALL poder marcar una pieza como hecha.

#### Scenario: Pieza pendiente
- **GIVEN** que una pieza tiene estado a_revisar
- **WHEN** aparece en el odontograma
- **THEN** se muestra en rojo

#### Scenario: Pieza realizada
- **GIVEN** que una pieza tiene estado hecho
- **WHEN** aparece en el odontograma
- **THEN** se muestra en azul

#### Scenario: Odontólogo marca realizado
- **GIVEN** que una pieza está pendiente
- **WHEN** un odontólogo la marca como hecha
- **THEN** el sistema guarda el estado hecho

#### Scenario: Paciente no puede marcar realizado
- **GIVEN** que una pieza está pendiente
- **WHEN** un paciente intenta marcarla como hecha
- **THEN** el servidor responde HTTP 403

### Requirement: Datos ficticios

El sistema MUST utilizar únicamente datos ficticios
en ejemplos y pruebas según RN-DA-01.

#### Scenario: Demostración
- **WHEN** se ejecuta una demostración del odontograma
- **THEN** se utilizan pacientes y turnos ficticios
