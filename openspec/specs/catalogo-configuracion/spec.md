# catalogo-configuracion Specification

## Purpose

Define el modelo de configuración del consultorio (sillones, prestaciones con su duración, profesionales con disponibilidad semanal y bloqueos), su carga inicial ficticia y la consulta del catálogo por API.

## Requirements

### Requirement: Duración de prestación en bloques de 15 minutos
El sistema SHALL aceptar una prestación solo si su `duracionMin` es un entero mayor que 0 y múltiplo de 15 (RN-CF-01). Cada prestación MUST tener una única duración (DD-12). Una duración inválida MUST devolver un error de regla con código `RN-CF-01`, sin lanzar excepción.

#### Scenario: Prestación con duración 30 es aceptada
- **GIVEN** una prestación "Control y limpieza" con `duracionMin` 30
- **WHEN** se valida la prestación
- **THEN** el resultado es exitoso y conserva la duración 30

#### Scenario: Prestación con duración 45 es aceptada
- **GIVEN** una prestación "Ortodoncia" con `duracionMin` 45
- **WHEN** se valida la prestación
- **THEN** el resultado es exitoso

#### Scenario: Prestación con duración 20 es rechazada
- **GIVEN** una prestación con `duracionMin` 20
- **WHEN** se valida la prestación
- **THEN** el resultado es un error con regla `RN-CF-01`

#### Scenario: Prestación con duración 0 es rechazada
- **GIVEN** una prestación con `duracionMin` 0
- **WHEN** se valida la prestación
- **THEN** el resultado es un error con regla `RN-CF-01`

#### Scenario: Prestación con duración negativa es rechazada
- **GIVEN** una prestación con `duracionMin` -15
- **WHEN** se valida la prestación
- **THEN** el resultado es un error con regla `RN-CF-01`

#### Scenario: Prestación con duración no entera es rechazada
- **GIVEN** una prestación con `duracionMin` 22.5
- **WHEN** se valida la prestación
- **THEN** el resultado es un error con regla `RN-CF-01`

### Requirement: Seed de configuración
Al iniciar con seed, el sistema SHALL cargar 2 sillones activos, 2 profesionales activos con disponibilidad lunes a viernes 09:00-13:00 y 14:00-19:00, y 5 prestaciones: control 30, ortodoncia 45, tratamiento 60, estética 60 y urgencia 30 minutos. Todas las prestaciones del seed MUST cumplir RN-CF-01.

#### Scenario: El seed carga los sillones y profesionales esperados
- **GIVEN** repositorios en memoria cargados con el seed
- **WHEN** se listan sillones y profesionales
- **THEN** hay 2 sillones y 2 profesionales, todos activos

#### Scenario: Disponibilidad de los profesionales del seed
- **GIVEN** repositorios en memoria cargados con el seed
- **WHEN** se consulta la disponibilidad de cada profesional
- **THEN** cada uno tiene, para cada día de lunes a viernes, las franjas `09:00-13:00` y `14:00-19:00`, y ninguna franja sábado ni domingo

#### Scenario: Prestaciones del seed con sus duraciones
- **GIVEN** repositorios en memoria cargados con el seed
- **WHEN** se listan las prestaciones
- **THEN** hay 5 prestaciones con códigos `control` 30, `orto` 45, `trat` 60, `est` 60 y `urg` 30, todas válidas según RN-CF-01

### Requirement: Bloqueo reservado para urgencias en el seed
El seed SHALL incluir un bloqueo con motivo "reservado urgencias" en el último bloque de la tarde (18:30-19:00) de cada día hábil del período sembrado. Todo bloqueo MUST tener un intervalo válido alineado a 15 minutos y puede referir a un profesional, a un sillón, o a ninguno (bloqueo global).

#### Scenario: Cada día hábil tiene su bloqueo de urgencias
- **GIVEN** repositorios en memoria cargados con el seed para un período que contiene el lunes `2026-12-07`
- **WHEN** se listan los bloqueos de ese día
- **THEN** existe un bloqueo con motivo "reservado urgencias" e intervalo `[18:30, 19:00)` hora del consultorio

#### Scenario: No hay bloqueo de urgencias en fin de semana
- **GIVEN** repositorios en memoria cargados con el seed para un período que contiene el sábado `2026-12-05`
- **WHEN** se listan los bloqueos de ese día
- **THEN** no existe bloqueo de urgencias ese día

### Requirement: Consulta del catálogo
El sistema SHALL exponer `GET /api/catalogo` que responde `200` con un JSON `{ sillones, prestaciones, profesionales }` tomado de los repositorios inyectados. La consulta es de solo lectura y MUST NOT requerir un rol en particular.

#### Scenario: El catálogo devuelve el seed
- **GIVEN** la API creada con repositorios en memoria cargados con el seed
- **WHEN** se hace `GET /api/catalogo`
- **THEN** la respuesta es `200` con 2 sillones, 2 profesionales y 5 prestaciones

#### Scenario: Las prestaciones del catálogo incluyen su duración
- **GIVEN** la API creada con el seed
- **WHEN** se hace `GET /api/catalogo`
- **THEN** cada prestación trae `id`, `codigo`, `nombre` y `duracionMin`, y la de código `orto` tiene `duracionMin` 45

#### Scenario: Catálogo con repositorios vacíos
- **GIVEN** la API creada con repositorios en memoria vacíos
- **WHEN** se hace `GET /api/catalogo`
- **THEN** la respuesta es `200` con las tres listas vacías
