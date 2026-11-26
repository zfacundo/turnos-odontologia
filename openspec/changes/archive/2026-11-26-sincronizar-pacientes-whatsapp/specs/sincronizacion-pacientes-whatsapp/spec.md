## ADDED Requirements

### Requirement: Sincronización de pacientes y WhatsApp

El sistema SHALL obtener los contactos del WhatsApp simulado desde el mismo repositorio de pacientes utilizado por el panel Clientes.

#### Scenario: Mostrar pacientes existentes
- **WHEN** se abre el WhatsApp simulado
- **THEN** se muestran los pacientes registrados con sus teléfonos
- **AND** no aparecen contactos definidos manualmente que no existan en Clientes

#### Scenario: Registrar un paciente nuevo
- **WHEN** se registra correctamente un paciente desde el panel
- **THEN** el paciente aparece en el listado de Clientes
- **AND** su contacto también aparece en el WhatsApp simulado

#### Scenario: Registro rechazado
- **WHEN** el servidor rechaza el alta de un paciente
- **THEN** no se agrega ningún contacto al WhatsApp simulado

### Requirement: Alta asistida de pacientes ficticios

El sistema SHALL facilitar la carga de DNI y teléfonos ficticios válidos, respetando las validaciones del servidor.

#### Scenario: Crear paciente correctamente
- **WHEN** se completa el formulario con datos válidos y no duplicados
- **THEN** se registra el paciente correctamente

#### Scenario: Datos inválidos
- **WHEN** se intenta registrar un paciente con datos inválidos
- **THEN** se muestra el error correspondiente
- **AND** el paciente no se registra
