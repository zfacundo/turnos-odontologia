# autenticacion-simulada Specification

## Purpose

Identificar a las personas usuarias del panel de administración mediante un login **simulado** con usuarios ficticios del seed y un token de sesión opaco en memoria, sin contraseñas reales, conviviendo con los headers simulados `X-Usuario`/`X-Rol` existentes.

## Requirements

### Requirement: Usuarios disponibles para el login
La API SHALL exponer `GET /api/auth/usuarios` sin autenticación, que devuelve solo los usuarios simulados del seed con rol `admin`, `recepcion` u `odontologo`, cada uno con `id`, `nombre` y `rol`, y el campo `simulado: true`. La respuesta MUST NOT incluir tokens, sesiones ni datos de pacientes.

#### Scenario: Listado de usuarios del panel
- **GIVEN** el seed cargado con 1 `admin`, 1 `recepcion` y 2 `odontologo`
- **WHEN** se hace `GET /api/auth/usuarios` sin headers
- **THEN** la respuesta es `200` con 4 usuarios, cada uno con `id`, `nombre` y `rol`
- **AND** el cuerpo incluye `simulado: true`

#### Scenario: El listado no expone secretos
- **GIVEN** existe al menos una sesión activa
- **WHEN** se hace `GET /api/auth/usuarios`
- **THEN** ningún elemento de la respuesta contiene un campo `token`

### Requirement: Login simulado por usuario
La API SHALL exponer `POST /api/auth/login` con cuerpo `{ "usuarioId": string }`. Si `usuarioId` corresponde a un usuario del panel (`admin`, `recepcion`, `odontologo`), MUST responder `201` con `{ token, expiraEn, usuario: { id, nombre, rol, profesionalId? }, simulado: true }`. El login MUST NOT pedir ni aceptar contraseñas. Un `usuarioId` inexistente o de rol `paciente` MUST responder `401` con `error.tipo = 'autenticacion'` y un mensaje que no revele cuáles usuarios existen. Un cuerpo sin `usuarioId` textual MUST responder `400` con `error.tipo = 'entrada'`.

#### Scenario: Login de recepción
- **GIVEN** el usuario simulado `u-recepcion`
- **WHEN** se hace `POST /api/auth/login` con `{ "usuarioId": "u-recepcion" }`
- **THEN** la respuesta es `201` con un `token` no vacío, `usuario.rol = 'recepcion'` y `simulado: true`

#### Scenario: Login de odontólogo trae su profesional
- **GIVEN** el usuario simulado `u-odonto-1` vinculado a `prof-1`
- **WHEN** se hace `POST /api/auth/login` con `{ "usuarioId": "u-odonto-1" }`
- **THEN** la respuesta es `201` con `usuario.profesionalId = 'prof-1'`

#### Scenario: Usuario inexistente
- **GIVEN** no existe el usuario `u-fantasma`
- **WHEN** se hace `POST /api/auth/login` con `{ "usuarioId": "u-fantasma" }`
- **THEN** la respuesta es `401` con `error.tipo = 'autenticacion'`
- **AND** no se crea ninguna sesión

#### Scenario: Cuerpo inválido
- **GIVEN** la API creada
- **WHEN** se hace `POST /api/auth/login` con `{ "usuarioId": 42 }`
- **THEN** la respuesta es `400` con `error.tipo = 'entrada'`

### Requirement: Token de sesión opaco con vencimiento
Cada login SHALL crear una sesión en memoria con un token opaco de al menos 128 bits de entropía, distinto en cada login, que no contiene datos del usuario. La sesión MUST vencer 8 horas después de creada según el reloj inyectado. Una sesión vencida MUST tratarse como inexistente.

#### Scenario: Dos logins generan tokens distintos
- **GIVEN** el usuario `u-admin`
- **WHEN** se hace login dos veces
- **THEN** los dos tokens son distintos y ambos son válidos

#### Scenario: Token vigente antes de las 8 horas
- **GIVEN** un login de `u-admin` a las `2026-12-01T09:00:00-03:00`
- **WHEN** el reloj marca `2026-12-01T16:59:00-03:00` y se hace `GET /api/auth/sesion` con ese token
- **THEN** la respuesta es `200`

#### Scenario: Token vencido a las 8 horas
- **GIVEN** un login de `u-admin` a las `2026-12-01T09:00:00-03:00`
- **WHEN** el reloj marca `2026-12-01T17:00:00-03:00` y se hace `GET /api/auth/sesion` con ese token
- **THEN** la respuesta es `401` con `error.tipo = 'autenticacion'`

### Requirement: Consulta de la sesión actual
La API SHALL exponer `GET /api/auth/sesion`, que con un `Authorization: Bearer <token>` válido responde `200` con `{ usuario: { id, nombre, rol, profesionalId? }, expiraEn, simulado: true }` sin devolver el token. Sin header `Authorization` MUST responder `401`.

#### Scenario: Sesión válida
- **GIVEN** un token válido de `u-recepcion`
- **WHEN** se hace `GET /api/auth/sesion` con `Authorization: Bearer <token>`
- **THEN** la respuesta es `200` con `usuario.id = 'u-recepcion'` y sin campo `token`

#### Scenario: Sin token
- **GIVEN** la API creada
- **WHEN** se hace `GET /api/auth/sesion` sin header `Authorization`
- **THEN** la respuesta es `401` con `error.tipo = 'autenticacion'`

### Requirement: Logout invalida el token
La API SHALL exponer `POST /api/auth/logout`, que con un token válido elimina la sesión y responde `204`. Después del logout, el mismo token MUST responder `401` en cualquier endpoint. Un logout con token inválido o vencido MUST responder `401`.

#### Scenario: Logout y reuso del token
- **GIVEN** un token válido de `u-admin`
- **WHEN** se hace `POST /api/auth/logout` con ese token y luego `GET /api/auth/sesion` con el mismo token
- **THEN** el logout responde `204` y la consulta posterior responde `401`

#### Scenario: Logout sin sesión
- **GIVEN** el token `token-inexistente`
- **WHEN** se hace `POST /api/auth/logout` con `Authorization: Bearer token-inexistente`
- **THEN** la respuesta es `401`

### Requirement: Precedencia del token sobre los headers simulados
Cuando una request trae header `Authorization`, la API SHALL identificar al usuario **solo** por la sesión del token e ignorar `X-Usuario` y `X-Rol`. Un `Authorization` que no tenga la forma `Bearer <token>`, o cuyo token no exista o esté vencido, MUST responder `401` con `error.tipo = 'autenticacion'` sin ejecutar la operación. El usuario identificado por token MUST traer su `profesionalId` cuando es odontólogo.

#### Scenario: El token gana sobre X-Rol
- **GIVEN** un token válido de `u-odonto-1`
- **WHEN** se hace `POST /api/pacientes` con ese token, `X-Rol: admin` y datos válidos
- **THEN** la respuesta es `403` con `error.tipo = 'permiso'` (se evaluó el rol `odontologo`)

#### Scenario: Token inválido en un endpoint protegido
- **GIVEN** la API creada
- **WHEN** se hace `GET /api/pacientes` con `Authorization: Bearer no-existe`
- **THEN** la respuesta es `401` con `error.tipo = 'autenticacion'`

#### Scenario: Authorization con esquema no soportado
- **GIVEN** la API creada
- **WHEN** se hace `GET /api/turnos` con `Authorization: Basic dXNlcjpwYXNz`
- **THEN** la respuesta es `401` con `error.tipo = 'autenticacion'`

#### Scenario: Sin Authorization se usan los headers simulados
- **GIVEN** la API creada
- **WHEN** se hace `GET /api/pacientes` sin `Authorization` y con `X-Usuario: u-recepcion`, `X-Rol: recepcion`
- **THEN** la respuesta es `200`

### Requirement: Auditoría de ingreso y egreso
Cada login exitoso y cada logout SHALL registrar un evento de auditoría con `accion` `login` o `logout`, `entidad = 'sesion'`, `entidadId` igual al id del usuario y el rol del usuario. El evento MUST NOT contener el token. Los intentos fallidos MUST NOT crear sesión.

#### Scenario: Login auditado sin token
- **GIVEN** la auditoría vacía
- **WHEN** `u-admin` hace login
- **THEN** la auditoría tiene un evento `login` con `entidadId = 'u-admin'` y ningún campo del evento contiene el token emitido
