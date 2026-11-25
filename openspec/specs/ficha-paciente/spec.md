# ficha-paciente Specification

## Purpose

Expone una ficha de paciente consultable y actualizable por API para recepción y odontólogos, con alta y edición validadas de datos ficticios, DNI único, campos opcionales de obra social y enmascaramiento de los datos sensibles solo en las respuestas HTTP.

## Requirements

### Requirement: Alta de paciente con datos ficticios

La API SHALL aceptar `POST /api/pacientes` con `nombre`, `dni` y `telefono`, y opcionalmente `email`, `obraSocialId` y `nroAfiliado`. El `dni` MUST cumplir `^99\d{6}$` y el `telefono` MUST cumplir `^\+54 9 11 0000-00\d{2}$`; cualquier campo faltante o inválido MUST responder `400` con `error.tipo = 'entrada'`. Un alta válida SHALL responder `201` con el paciente creado y su `id`.

#### Scenario: Alta válida de paciente ficticio
- **GIVEN** la API con repositorios en memoria y el rol `recepcion`
- **WHEN** se hace `POST /api/pacientes` con `nombre` «Paciente Ficticio Uno», `dni` `99000011` y `telefono` `+54 9 11 0000-0011`
- **THEN** la respuesta es `201` y el cuerpo trae `id`, `nombre`, `dni` y `telefono`

#### Scenario: DNI con formato no ficticio
- **GIVEN** la API y el rol `recepcion`
- **WHEN** se hace `POST /api/pacientes` con `dni` `12345678`
- **THEN** la respuesta es `400` con `error.tipo = 'entrada'` y no se crea ningún paciente

#### Scenario: Teléfono con formato no ficticio
- **GIVEN** la API y el rol `recepcion`
- **WHEN** se hace `POST /api/pacientes` con `telefono` `1133333333`
- **THEN** la respuesta es `400` con `error.tipo = 'entrada'` y no se crea ningún paciente

#### Scenario: Campos obligatorios ausentes
- **GIVEN** la API y el rol `recepcion`
- **WHEN** se hace `POST /api/pacientes` con un objeto JSON vacío
- **THEN** la respuesta es `400` con `error.tipo = 'entrada'`

### Requirement: Entrada malformada devuelve 400

La API SHALL responder `400` con `error.tipo = 'entrada'` cuando `nombre` o `dni` estén vacíos o contengan solo espacios, o cuando `email` no cumpla el formato ficticio definido en `datos-ficticios`. Estos casos MUST distinguirse de las violaciones de regla, que responden `409` con `error.tipo = 'regla'` y `error.regla`.

#### Scenario: Nombre vacío o con espacios
- **GIVEN** la API y el rol `recepcion`
- **WHEN** se hace `POST /api/pacientes` con `nombre` `'   '`, `dni` `99000011` y `telefono` válido
- **THEN** la respuesta es `400` con `error.tipo = 'entrada'` y no se crea ningún paciente

#### Scenario: DNI vacío o con espacios
- **GIVEN** la API y el rol `recepcion`
- **WHEN** se hace `POST /api/pacientes` con `dni` `'   '` y el resto de campos válidos
- **THEN** la respuesta es `400` con `error.tipo = 'entrada'` y no se crea ningún paciente

#### Scenario: Email con formato inválido
- **GIVEN** la API y el rol `recepcion`
- **WHEN** se hace `POST /api/pacientes` con `email` `ficticio@@ejemplo`
- **THEN** la respuesta es `400` con `error.tipo = 'entrada'`

#### Scenario: DNI duplicado no es entrada malformada
- **GIVEN** un paciente existente con DNI `99000001`
- **WHEN** se hace `POST /api/pacientes` con `dni` `99000001` y datos válidos
- **THEN** la respuesta es `409` con `error.tipo = 'regla'` y `error.regla = 'DNI_DUPLICADO'`, no `400` con `error.tipo = 'entrada'`

### Requirement: DNI único en alta de paciente

El sistema SHALL rechazar un alta cuyo `dni` ya pertenezca a otro paciente con `409` y `error.regla = 'DNI_DUPLICADO'`, `error.tipo = 'regla'` y `error.dimension = 'paciente'` (DD-08), sin modificar el paciente existente ni crear uno nuevo.

#### Scenario: Alta con DNI ya registrado
- **GIVEN** un paciente existente con DNI `99000001`
- **WHEN** se hace `POST /api/pacientes` con `dni` `99000001` y otro `nombre`
- **THEN** la respuesta es `409` con `error.regla = 'DNI_DUPLICADO'` y `error.dimension = 'paciente'`

#### Scenario: El paciente existente no se modifica
- **GIVEN** un paciente existente con DNI `99000001` y nombre «Paciente Original»
- **WHEN** se intenta un alta con el mismo DNI y nombre «Paciente Duplicado»
- **THEN** al consultar `GET /api/pacientes` sigue existiendo un único paciente con ese DNI y su nombre es «Paciente Original»

### Requirement: Actualización de ficha de paciente

La API SHALL exponer `PUT /api/pacientes/:id` con las mismas validaciones del alta. Conservar el `dni` propio SHALL ser válido e idempotente: repetir la petición MUST dar `200` con la misma representación enmascarada, sin crear otra ficha. Asignar el `dni` de otro paciente SHALL dar `409` con `error.regla = 'DNI_DUPLICADO'`; un `id` inexistente SHALL dar `404` con `error.mensaje = 'paciente no encontrado'`.

#### Scenario: Actualización idempotente con el DNI propio
- **GIVEN** un paciente con id `pac-11`, DNI `99000011` y teléfono `+54 9 11 0000-0011`
- **WHEN** se hace `PUT /api/pacientes/pac-11` dos veces con el mismo cuerpo que conserva ese DNI
- **THEN** ambas respuestas son `200`, devuelven la misma ficha enmascarada y sigue existiendo una única ficha con ese DNI

#### Scenario: Actualización con el DNI de otro paciente
- **GIVEN** los pacientes `pac-01` con DNI `99000001` y `pac-11` con DNI `99000011`
- **WHEN** se hace `PUT /api/pacientes/pac-11` con `dni` `99000001`
- **THEN** la respuesta es `409` con `error.tipo = 'regla'`, `error.regla = 'DNI_DUPLICADO'` y `error.dimension = 'paciente'`, y `pac-01` conserva sus datos

#### Scenario: Actualización de un id inexistente
- **GIVEN** la API con repositorios en memoria
- **WHEN** se hace `PUT /api/pacientes/no-existe` con datos válidos
- **THEN** la respuesta es `404` con `error.mensaje = 'paciente no encontrado'`

#### Scenario: Actualización con nombre vacío
- **GIVEN** la API y el rol `recepcion`
- **WHEN** se hace `PUT /api/pacientes/pac-11` con `nombre` `'   '` y el resto de campos válidos
- **THEN** la respuesta es `400` con `error.tipo = 'entrada'` y la ficha no se modifica

### Requirement: Consulta de fichas con datos enmascarados

La API SHALL exponer `GET /api/pacientes` y `GET /api/pacientes/:id` con `dni` enmascarado como dos primeros y dos últimos dígitos con `****` y `telefono` con los dos últimos dígitos en `**`. El mismo enmascaramiento SHALL aplicarse en ambos endpoints y MUST hacerse solo en la respuesta HTTP, sin alterar los datos crudos en memoria. Un `id` inexistente SHALL responder `404` con `error.mensaje = 'paciente no encontrado'`.

#### Scenario: Listado de fichas enmascaradas
- **GIVEN** un paciente con DNI `99000001` y teléfono `+54 9 11 0000-0001`
- **WHEN** se hace `GET /api/pacientes`
- **THEN** la respuesta es `200` y esa ficha trae `dni` `99****01` y `telefono` `+54 9 11 0000-**01`

#### Scenario: Consulta por id enmascarada
- **GIVEN** un paciente con DNI `99000011` y campos opcionales `email`, `obraSocialId` y `nroAfiliado`
- **WHEN** se hace `GET /api/pacientes/<id>`
- **THEN** la respuesta es `200`, trae los campos opcionales y el DNI y teléfono enmascarados

#### Scenario: Mismo enmascaramiento en listado y detalle
- **GIVEN** un paciente con DNI `99000001` y teléfono `+54 9 11 0000-0001`
- **WHEN** se hacen `GET /api/pacientes` y `GET /api/pacientes/<id>`
- **THEN** ambas respuestas traen `dni` `99****01` y `telefono` `+54 9 11 0000-**01`

#### Scenario: Los datos crudos no se alteran
- **GIVEN** un paciente con DNI `99000001` ya consultado enmascarado
- **WHEN** se intenta dar de alta otro paciente con `dni` `99000001`
- **THEN** la respuesta es `409` con `error.regla = 'DNI_DUPLICADO'`, comprobando que el DNI completo sigue vigente en memoria

#### Scenario: Consulta de un id inexistente
- **GIVEN** la API con repositorios en memoria
- **WHEN** se hace `GET /api/pacientes/no-existe`
- **THEN** la respuesta es `404` con `error.mensaje = 'paciente no encontrado'`

### Requirement: Obra social descriptiva en la ficha

Los campos opcionales `obraSocialId` y `nroAfiliado` SHALL conservarse como texto descriptivo y MUST NOT validarse contra el padrón simulado durante el alta; la ficha SHALL poder crearse aunque ese número de afiliado no figure en el simulador de obra social.

#### Scenario: Alta con afiliado ausente del padrón
- **GIVEN** un `nroAfiliado` `AF-9999` que no existe en el padrón simulado
- **WHEN** se hace `POST /api/pacientes` con ese `nroAfiliado`
- **THEN** la respuesta es `201` y la ficha conserva `AF-9999`

#### Scenario: Alta sin datos de obra social
- **GIVEN** la API y el rol `recepcion`
- **WHEN** se hace `POST /api/pacientes` sin `obraSocialId` ni `nroAfiliado`
- **THEN** la respuesta es `201` y esos campos no aparecen en la ficha devuelta

### Requirement: Permisos por rol en la ficha

La API SHALL permitir altas y actualizaciones solo a `admin` y `recepcion`, consultas a `admin`, `recepcion` y `odontologo`, y SHALL responder `403` con `error.tipo = 'permiso'` para cualquier otro rol, incluido `paciente`, o para la ausencia de la cabecera `X-Rol`.

#### Scenario: Recepción da de alta
- **GIVEN** la cabecera `X-Rol: recepcion`
- **WHEN** se hace `POST /api/pacientes` con datos válidos
- **THEN** la respuesta es `201`

#### Scenario: Odontólogo intenta dar de alta
- **GIVEN** la cabecera `X-Rol: odontologo`
- **WHEN** se hace `POST /api/pacientes` con datos válidos
- **THEN** la respuesta es `403` con `error.tipo = 'permiso'`

#### Scenario: Odontólogo intenta actualizar
- **GIVEN** la cabecera `X-Rol: odontologo`
- **WHEN** se hace `PUT /api/pacientes/pac-11` con datos válidos
- **THEN** la respuesta es `403` con `error.tipo = 'permiso'` y la ficha no se modifica

#### Scenario: Paciente consulta fichas
- **GIVEN** la cabecera `X-Rol: paciente`
- **WHEN** se hace `GET /api/pacientes`
- **THEN** la respuesta es `403` con `error.tipo = 'permiso'`

#### Scenario: Falta la cabecera de rol
- **GIVEN** una petición sin cabecera `X-Rol`
- **WHEN** se hace `GET /api/pacientes/<id>`
- **THEN** la respuesta es `403` con `error.tipo = 'permiso'`
