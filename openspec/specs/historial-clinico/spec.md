# historial-clinico Specification

## Purpose

Registrar un historial clínico **simple y ficticio** por paciente (fecha, profesional, procedimiento, notas y turno vinculado opcional), de solo inserción y accesible únicamente por los roles autorizados, sin pretender ser una historia clínica electrónica legal.

## Requirements

### Requirement: Entrada de historial clínico
Cada entrada SHALL tener `id`, `pacienteId`, `fecha` (ISO 8601 con zona), `profesionalId`, `profesionalNombre`, `procedimiento` (texto de 1 a 120 caracteres), `notas` (texto de 0 a 1000 caracteres), `turnoId` opcional, `creadoPor`, `creadoEn` y `simulado: true`.

#### Scenario: Forma de la entrada creada
- **GIVEN** el paciente `pac-01` y un token válido de `u-odonto-1`
- **WHEN** se hace `POST /api/pacientes/pac-01/historia` con `{ "fecha": "2026-12-01T10:00:00-03:00", "procedimiento": "Control y limpieza", "notas": "Sin hallazgos (dato ficticio)" }`
- **THEN** la respuesta es `201` con `pacienteId = 'pac-01'`, `profesionalId = 'prof-1'`, `creadoPor = 'u-odonto-1'` y `simulado: true`

### Requirement: Consulta del historial de un paciente
La API SHALL exponer `GET /api/pacientes/:id/historia`, que responde `200` con `{ entradas, simulado: true }` ordenadas por `fecha` descendente. Un paciente inexistente MUST responder `404` con `error.tipo = 'no-encontrado'`. Un paciente sin entradas MUST responder `200` con `entradas` vacío.

#### Scenario: Orden descendente
- **GIVEN** el paciente `pac-01` con entradas del `2026-10-01` y del `2026-11-15`
- **WHEN** un `admin` hace `GET /api/pacientes/pac-01/historia`
- **THEN** la primera entrada es la del `2026-11-15`

#### Scenario: Paciente sin historial
- **GIVEN** el paciente `pac-02` sin entradas
- **WHEN** un `odontologo` hace `GET /api/pacientes/pac-02/historia`
- **THEN** la respuesta es `200` con `entradas` vacío

#### Scenario: Paciente inexistente
- **GIVEN** no existe el paciente `pac-999`
- **WHEN** un `admin` hace `GET /api/pacientes/pac-999/historia`
- **THEN** la respuesta es `404` con `error.tipo = 'no-encontrado'`

### Requirement: Permisos del historial clínico
La lectura del historial SHALL permitirse solo a `admin` y `odontologo`. El alta SHALL permitirse solo a `odontologo`, y el `profesionalId` de la entrada MUST tomarse del usuario identificado (nunca del cuerpo). Cualquier otro rol (`recepcion`, `paciente`) o la ausencia de usuario MUST responder `403` con `error.tipo = 'permiso'`, sin revelar si el paciente tiene entradas.

#### Scenario: Recepción no lee historial
- **GIVEN** un token válido de `u-recepcion`
- **WHEN** se hace `GET /api/pacientes/pac-01/historia`
- **THEN** la respuesta es `403` con `error.tipo = 'permiso'`

#### Scenario: Admin no da de alta entradas
- **GIVEN** un token válido de `u-admin`
- **WHEN** se hace `POST /api/pacientes/pac-01/historia` con datos válidos
- **THEN** la respuesta es `403` con `error.tipo = 'permiso'` y no se crea la entrada

#### Scenario: El profesional del cuerpo se ignora
- **GIVEN** un token válido de `u-odonto-1` (profesional `prof-1`)
- **WHEN** se hace `POST /api/pacientes/pac-01/historia` con datos válidos y `"profesionalId": "prof-2"`
- **THEN** la respuesta es `201` con `profesionalId = 'prof-1'`

#### Scenario: Sin usuario
- **GIVEN** una request sin `Authorization` ni `X-Rol`
- **WHEN** se hace `GET /api/pacientes/pac-01/historia`
- **THEN** la respuesta es `403` con `error.tipo = 'permiso'`

### Requirement: Validación del alta de historial
El alta SHALL responder `400` con `error.tipo = 'entrada'` cuando `fecha` no es ISO 8601 con zona, `procedimiento` está vacío o supera 120 caracteres, `notas` supera 1000 caracteres o `turnoId` no es texto. Una `fecha` posterior al instante del reloj MUST responder `409` con `regla = 'RN-HC-02'`. Un `turnoId` inexistente o de otro paciente MUST responder `409` con `regla = 'RN-HC-01'`. El paciente inexistente MUST responder `404`.

#### Scenario: Procedimiento vacío
- **GIVEN** un token válido de `u-odonto-1`
- **WHEN** se hace `POST /api/pacientes/pac-01/historia` con `"procedimiento": ""`
- **THEN** la respuesta es `400` con `error.tipo = 'entrada'`

#### Scenario: Notas demasiado largas
- **GIVEN** un token válido de `u-odonto-1`
- **WHEN** se hace el alta con `notas` de 1001 caracteres
- **THEN** la respuesta es `400` con `error.tipo = 'entrada'`

#### Scenario: Fecha futura
- **GIVEN** el reloj en `2026-12-01T10:00:00-03:00`
- **WHEN** `u-odonto-1` da de alta una entrada con `fecha = 2026-12-02T10:00:00-03:00`
- **THEN** la respuesta es `409` con `error.regla = 'RN-HC-02'`

#### Scenario: Fecha igual al instante actual
- **GIVEN** el reloj en `2026-12-01T10:00:00-03:00`
- **WHEN** `u-odonto-1` da de alta una entrada con `fecha = 2026-12-01T10:00:00-03:00`
- **THEN** la respuesta es `201`

#### Scenario: Turno de otro paciente
- **GIVEN** el turno `t-1` del paciente `pac-02`
- **WHEN** `u-odonto-1` da de alta una entrada para `pac-01` con `turnoId = 't-1'`
- **THEN** la respuesta es `409` con `error.regla = 'RN-HC-01'`

### Requirement: Historial de solo inserción
El historial SHALL ser de solo inserción: no existen operaciones de edición ni borrado. `PUT`, `PATCH` y `DELETE` sobre `/api/pacientes/:id/historia` o sus entradas MUST responder `404`. Una corrección MUST registrarse como una entrada nueva.

#### Scenario: Intento de borrar una entrada
- **GIVEN** una entrada `hc-1` del paciente `pac-01`
- **WHEN** un `odontologo` hace `DELETE /api/pacientes/pac-01/historia/hc-1`
- **THEN** la respuesta es `404` y la entrada sigue en el historial

### Requirement: Auditoría del historial clínico
Cada alta SHALL registrar un evento de auditoría `historia-crear` y cada consulta exitosa un evento `historia-consultar`, ambos con `entidad = 'paciente'`, `entidadId` igual al id del paciente, el usuario y su rol. Los eventos MUST NOT incluir el procedimiento ni las notas.

#### Scenario: Alta auditada sin contenido clínico
- **GIVEN** la auditoría vacía
- **WHEN** `u-odonto-1` da de alta una entrada para `pac-01` con notas "Sin hallazgos (dato ficticio)"
- **THEN** la auditoría tiene un evento `historia-crear` con `entidadId = 'pac-01'`
- **AND** ningún campo del evento contiene el texto de las notas

#### Scenario: Consulta rechazada no se audita como consulta
- **GIVEN** la auditoría vacía
- **WHEN** `u-recepcion` intenta `GET /api/pacientes/pac-01/historia`
- **THEN** la auditoría no tiene eventos `historia-consultar`

### Requirement: Historial ficticio en el seed
El seed SHALL cargar entradas de historial solo para pacientes ficticios del seed, con procedimientos y notas evidentemente ficticios, profesionales del seed y fechas anteriores al instante inicial del reloj del seed.

#### Scenario: Entradas del seed
- **GIVEN** el seed cargado
- **WHEN** se recorren las entradas de historial
- **THEN** cada `pacienteId` y `profesionalId` existe en el seed y cada entrada tiene `simulado: true`
