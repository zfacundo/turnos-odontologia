# datos-ficticios Specification

## Purpose

Garantiza que los datos de pacientes y usuarios que el sistema carga al iniciar sean evidentemente ficticios y verificables automáticamente, para no almacenar nunca datos reales de salud (RN-DA-01, DD-10).

## Requirements

### Requirement: Pacientes ficticios en el seed
El seed SHALL cargar alrededor de 10 pacientes ficticios (entre 8 y 12). Cada DNI MUST estar en el rango ficticio `99.000.000`–`99.999.999` (8 dígitos que comienzan con `99`, almacenado sin puntos) y cada teléfono MUST tener el formato ficticio `+54 9 11 0000-00NN`.

#### Scenario: Cantidad de pacientes del seed
- **GIVEN** repositorios en memoria cargados con el seed
- **WHEN** se listan los pacientes
- **THEN** hay entre 8 y 12 pacientes

#### Scenario: Todos los DNI están en el rango ficticio
- **GIVEN** repositorios en memoria cargados con el seed
- **WHEN** se revisa el DNI de cada paciente
- **THEN** todos cumplen el patrón `^99\d{6}$`

#### Scenario: Todos los teléfonos están en el rango ficticio
- **GIVEN** repositorios en memoria cargados con el seed
- **WHEN** se revisa el teléfono de cada paciente
- **THEN** todos cumplen el patrón `^\+54 9 11 0000-00\d{2}$`

### Requirement: DNI único de paciente
El repositorio de pacientes SHALL garantizar que no existan dos pacientes con el mismo DNI; guardar un paciente con un DNI ya registrado MUST devolver un error de regla, sin modificar el paciente existente.

#### Scenario: El seed no repite DNI
- **GIVEN** repositorios en memoria cargados con el seed
- **WHEN** se comparan los DNI de todos los pacientes
- **THEN** no hay DNI repetidos

#### Scenario: Guardar un DNI duplicado es rechazado
- **GIVEN** un repositorio de pacientes que ya contiene un paciente con DNI `99000001`
- **WHEN** se guarda otro paciente con DNI `99000001`
- **THEN** el resultado es un error de regla y el repositorio sigue teniendo un único paciente con ese DNI

#### Scenario: Buscar paciente por DNI
- **GIVEN** un repositorio de pacientes que contiene un paciente con DNI `99000002`
- **WHEN** se busca por DNI `99000002`
- **THEN** se obtiene ese paciente; y al buscar `99000099` no se obtiene ninguno

### Requirement: Usuarios simulados del seed
El seed SHALL cargar usuarios simulados para el selector de rol: 1 `admin`, 1 `recepcion` y 2 `odontologo`, cada odontólogo vinculado a uno de los profesionales del seed. Los nombres de usuarios y profesionales MUST ser ficticios.

#### Scenario: Usuarios por rol
- **GIVEN** el seed cargado
- **WHEN** se agrupan los usuarios por rol
- **THEN** hay 1 `admin`, 1 `recepcion` y 2 `odontologo`

#### Scenario: Cada odontólogo apunta a un profesional existente
- **GIVEN** el seed cargado
- **WHEN** se revisan los usuarios con rol `odontologo`
- **THEN** cada uno tiene un `profesionalId` que existe en el repositorio de profesionales y son distintos entre sí

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
