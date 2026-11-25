# Spec Delta

## ADDED Requirements

### Requirement: Datos ficticios en alta de pacientes por API

Además del seed, todo paciente creado o actualizado por `POST /api/pacientes` y `PUT /api/pacientes/:id` SHALL usar exclusivamente datos ficticios y verificables (RN-DA-01). El `email`, cuando se envíe, MUST terminar en `@ejemplo.invalid`; el `obraSocialId` MUST cumplir `^OS-\d{2}$` y el `nroAfiliado` MUST cumplir `^AF-\d{4}$`. Cualquier incumplimiento SHALL responder `400` sin crear ni modificar la ficha.

#### Scenario: Correo real es rechazado
- **GIVEN** la API y el rol `recepcion`
- **WHEN** se hace `POST /api/pacientes` con `email` `paciente@gmail.com`
- **THEN** la respuesta es `400` con `error.tipo = 'entrada'` y no se crea ningún paciente

#### Scenario: Correo vacío o con espacios es rechazado
- **GIVEN** la API y el rol `recepcion`
- **WHEN** se hace `POST /api/pacientes` con `email` `'   '`
- **THEN** la respuesta es `400` con `error.tipo = 'entrada'` y no se crea ningún paciente

#### Scenario: Correo ficticio es aceptado
- **GIVEN** la API y el rol `recepcion`
- **WHEN** se hace `POST /api/pacientes` con `email` `ficticio11@ejemplo.invalid`
- **THEN** la respuesta es `201` y la ficha conserva ese `email`

#### Scenario: Identificador de obra social con formato inválido
- **GIVEN** la API y el rol `recepcion`
- **WHEN** se hace `POST /api/pacientes` con `obraSocialId` `obra-social-real-1`
- **THEN** la respuesta es `400` con `error.tipo = 'entrada'`

#### Scenario: Número de afiliado ficticio válido
- **GIVEN** la API y el rol `recepcion`
- **WHEN** se hace `POST /api/pacientes` con `obraSocialId` `OS-01` y `nroAfiliado` `AF-9999`
- **THEN** la respuesta es `201` y ambos campos se conservan en la ficha
