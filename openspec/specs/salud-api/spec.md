# salud-api Specification

## Purpose

Define el contrato transversal de la API HTTP: chequeo de salud, identificación simulada del usuario por rol y el formato uniforme con que se reportan errores de regla (409), de entrada (400) y de permiso (403) a todos los módulos.

## Requirements

### Requirement: Chequeo de salud
El sistema SHALL exponer `GET /api/health` que responde `200` con un JSON `{ status: "ok" }`, sin requerir headers de rol.

#### Scenario: Health responde ok
- **GIVEN** la API creada con repositorios en memoria
- **WHEN** se hace `GET /api/health`
- **THEN** la respuesta es `200` con cuerpo `{ "status": "ok" }`

#### Scenario: Ruta inexistente
- **GIVEN** la API creada con repositorios en memoria
- **WHEN** se hace `GET /api/no-existe`
- **THEN** la respuesta es `404` con un JSON de error

### Requirement: Rol simulado por headers
El sistema SHALL identificar al usuario de cada request **sin header `Authorization`** a partir de los headers `X-Usuario` y `X-Rol` (autenticación simulada, DD-09). Los roles válidos son `admin`, `recepcion`, `odontologo` y `paciente`. Un `X-Rol` con otro valor MUST responder `400`. La ausencia de headers MUST dejar la request sin usuario, sin error. Cuando la request trae header `Authorization`, la identificación MUST hacerse solo por el token de sesión (capacidad `autenticacion-simulada`) y los headers `X-Usuario`/`X-Rol` MUST ignorarse, incluso si `X-Rol` es inválido.

#### Scenario: Request con rol válido
- **GIVEN** la API creada
- **WHEN** se hace `GET /api/health` con `X-Usuario: u-recepcion` y `X-Rol: recepcion`
- **THEN** la respuesta es `200`

#### Scenario: Request con rol inválido
- **GIVEN** la API creada
- **WHEN** se hace `GET /api/health` con `X-Rol: superusuario`
- **THEN** la respuesta es `400` con un error de entrada que menciona el header `X-Rol`

#### Scenario: Request sin headers de rol
- **GIVEN** la API creada
- **WHEN** se hace `GET /api/catalogo` sin `X-Usuario` ni `X-Rol`
- **THEN** la respuesta es `200`

#### Scenario: Token válido ignora un X-Rol inválido
- **GIVEN** un token válido de `u-admin`
- **WHEN** se hace `GET /api/health` con `Authorization: Bearer <token>` y `X-Rol: superusuario`
- **THEN** la respuesta es `200`

### Requirement: Mapeo uniforme de errores
El sistema SHALL traducir los errores a HTTP con un cuerpo `{ error: { tipo, regla?, mensaje, dimension?, conflicto? } }`: error de regla de negocio → `409` con el código de regla y, si existen, dimensión y conflicto (DD-08); error de entrada → `400`; error de autenticación (token ausente cuando el endpoint lo exige, con esquema no soportado, inexistente o vencido) → `401` con `tipo = 'autenticacion'`; error de permiso → `403`; error no previsto → `500` sin exponer detalles internos. Las respuestas `401` MUST NOT revelar si un usuario o token existió.

#### Scenario: Error de regla se responde con 409
- **GIVEN** un handler que falla con un error de regla `RN-AG-02`, dimensión `profesional` y conflicto con el turno `t-1`
- **WHEN** se procesa la request
- **THEN** la respuesta es `409` con `error.regla` = `RN-AG-02`, `error.dimension` = `profesional` y `error.conflicto.turnoId` = `t-1`

#### Scenario: Error de entrada se responde con 400
- **GIVEN** un handler que falla con un error de entrada
- **WHEN** se procesa la request
- **THEN** la respuesta es `400` con `error.tipo` = `entrada` y un mensaje

#### Scenario: Error de autenticación se responde con 401
- **GIVEN** un handler que falla con un error de autenticación
- **WHEN** se procesa la request
- **THEN** la respuesta es `401` con `error.tipo` = `autenticacion` y un mensaje genérico

#### Scenario: Error de permiso se responde con 403
- **GIVEN** un handler que falla con un error de permiso
- **WHEN** se procesa la request
- **THEN** la respuesta es `403` con `error.tipo` = `permiso`

#### Scenario: Error inesperado se responde con 500 sin detalles
- **GIVEN** un handler que lanza un error no previsto con mensaje interno "boom"
- **WHEN** se procesa la request
- **THEN** la respuesta es `500` y el cuerpo no contiene "boom" ni el stack trace

### Requirement: Composición por inyección de dependencias
El sistema SHALL construir la aplicación HTTP a partir de dependencias inyectadas (repositorios, reloj, auditoría), de modo que los tests usen repositorios en memoria y un reloj fijo sin levantar un puerto de red.

#### Scenario: Dos apps con dependencias distintas son independientes
- **GIVEN** una app creada con el seed y otra creada con repositorios vacíos
- **WHEN** se hace `GET /api/catalogo` a cada una
- **THEN** la primera devuelve 2 sillones y la segunda 0

### Requirement: Reloj inyectable
El sistema SHALL obtener la hora actual exclusivamente de un reloj inyectado. Cuando la variable `SIM_NOW` está definida con una fecha ISO válida, el reloj MUST devolver siempre ese instante; si `SIM_NOW` es inválida, el arranque MUST fallar con un mensaje claro.

#### Scenario: Reloj fijo por SIM_NOW
- **GIVEN** `SIM_NOW` = `2026-10-14T12:30:00-03:00`
- **WHEN** se consulta la hora actual dos veces
- **THEN** ambas devuelven `2026-10-14T15:30:00Z`

#### Scenario: SIM_NOW inválida
- **GIVEN** `SIM_NOW` = `no-es-fecha`
- **WHEN** se construye el reloj
- **THEN** falla con un mensaje que menciona `SIM_NOW`
