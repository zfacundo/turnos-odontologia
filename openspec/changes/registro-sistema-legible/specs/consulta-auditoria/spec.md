## MODIFIED Requirements

### Requirement: Registro legible del sistema

El sistema SHALL proporcionar GET /api/registro para presentar los eventos como mensajes comprensibles.

La consulta SHALL respetar los mismos permisos establecidos para la auditoría.

Cada elemento de `registro[]` SHALL incluir `fecha`, `usuarioId`, `rol` y `mensaje` (como hasta ahora) y, de forma aditiva, los valores crudos `accion`, `entidad` y `entidadId` del evento original, sin modificarlos. El orden SHALL ser el mismo que el de GET /api/auditoria (cronológico, del más antiguo al más reciente). GET /api/auditoria MUST NOT cambiar.

#### Scenario: Consultar registro como recepción
- **WHEN** un usuario con rol "recepcion" solicita GET /api/registro
- **THEN** el servidor responde HTTP 200
- **AND** devuelve una colección de mensajes legibles

#### Scenario: Consultar registro como odontólogo
- **WHEN** un usuario con rol "odontologo" solicita GET /api/registro
- **THEN** el servidor responde HTTP 403

#### Scenario: Registro sin eventos
- **GIVEN** que no existen eventos de auditoría
- **WHEN** un usuario autorizado solicita GET /api/registro
- **THEN** el servidor responde HTTP 200
- **AND** devuelve una colección vacía

#### Scenario: El payload conserva los datos crudos del evento
- **GIVEN** que recepción confirmó un turno
- **WHEN** un usuario autorizado solicita GET /api/registro
- **THEN** el elemento del evento tiene `accion` "confirmar", `entidad` "turno", `entidadId` igual al id del turno, y `fecha`, `usuarioId`, `rol` y `mensaje`
- **AND** GET /api/auditoria devuelve ese mismo evento con los mismos campos que antes del cambio

### Requirement: Mensajes de creación de turnos

El sistema SHALL convertir los eventos de creación de turnos en mensajes legibles que empiezan con "Turno creado:" e identifican al paciente y al profesional por su nombre, y al turno por día y hora del consultorio, sin el id del turno ni del paciente. Si el turno creado es un sobreturno, el mensaje SHALL empezar con "Sobreturno creado:".

#### Scenario: Turno creado correctamente
- **GIVEN** que recepción ("Recepcionista Ficticia") crea un turno de `pac-01` ("Paciente Ficticio Uno") con `prof-1` ("Dra. Ficticia Perez") el martes `2026-12-01` a las `10:00` (UTC-03:00), con origen recepción
- **WHEN** se consulta GET /api/registro
- **THEN** el mensaje es "Turno creado: Paciente Ficticio Uno con Dra. Ficticia Perez, Mar 01/12 10:00. Por Recepcionista Ficticia."
- **AND** el mensaje no contiene el id del turno ni `pac-01`

#### Scenario: Turno creado por WhatsApp
- **GIVEN** que el bot de WhatsApp simulado crea un turno de `pac-01` con `prof-1` el martes `2026-12-01` a las `10:00`
- **WHEN** se consulta GET /api/registro
- **THEN** el mensaje es "Turno creado: Paciente Ficticio Uno con Dra. Ficticia Perez, Mar 01/12 10:00 (WhatsApp). Por el paciente por WhatsApp (simulación)."
- **AND** el mensaje no contiene el teléfono del paciente

#### Scenario: Sobreturno creado
- **GIVEN** un evento `crear` de turno cuyo detalle tiene `esSobreturno` en `true`
- **WHEN** se arma el registro legible
- **THEN** el mensaje empieza con "Sobreturno creado:" y sigue con el mismo formato de paciente, profesional, día y hora

#### Scenario: Conservar información del evento
- **GIVEN** que existe un evento de creación
- **WHEN** se consulta el registro legible
- **THEN** se conserva la información del usuario, rol y fecha del evento
- **AND** se proporciona una descripción comprensible de la acción

## ADDED Requirements

### Requirement: Mensajes legibles para cada tipo de evento

El registro legible SHALL describir cada tipo de evento auditable con un mensaje en español con la forma `<Qué pasó>: <de quién y cuándo>. Por <quién>.` En esa forma:

- **Turno** (`<T>`): `<nombre del paciente> con <nombre del profesional>, <Ddd dd/mm HH:mm>`, en hora de America/Argentina/Buenos_Aires (ej.: "Paciente Ficticio Uno con Dra. Ficticia Perez, Mar 01/12 10:00"). Los datos se toman del detalle del evento y, si falta, del turno guardado.
- **Quién** (`<A>`): el nombre del usuario si es un usuario del sistema. Si el `usuarioId` es del canal WhatsApp simulado, "el paciente por WhatsApp (simulación)". Si el rol es paciente sin usuario conocido, "el paciente". Si no, el rol legible ("Administración", "Recepción", "Odontología").

Los mensajes por acción SHALL ser:

| `accion` | Mensaje |
|---|---|
| `confirmar` | `Turno confirmado: <T>. Por <A>.` |
| `atender` | `Turno atendido: <T>. Por <A>.` |
| `ausente` | `Paciente ausente: <T>. Por <A>.` |
| `cancelar` con motivo | `Turno cancelado: <T>. Motivo: «<motivo>». Por <A>.` |
| `cancelar` sin motivo | `Turno cancelado: <T>. Sin motivo registrado. Por <A>.` |
| `reprogramar` | `Turno reprogramado: <paciente> con <profesional nuevo>, de <Ddd dd/mm HH:mm anterior> a <Ddd dd/mm HH:mm nuevo>. Por <A>.` Si cambió el profesional, agrega `(antes con <profesional anterior>)` después del profesional nuevo |
| `sena_aprobada` | `Seña aprobada (simulación): <monto> del turno de <T>. Por <A>.` |
| `sena_rechazada` | `Seña rechazada (simulación): turno de <T>. Por <A>.` |
| `factura_emitida` | `Factura C emitida (simulación): N° <número> por <importe>, turno de <T>. Por <A>.` |
| `historia-crear` | `Entrada de historia clínica registrada: <nombre del paciente>. Por <A>.` |
| `historia-consultar` | `Historia clínica consultada: <nombre del paciente>. Por <A>.` |
| `login` | `Inicio de sesión: <nombre del usuario> (<rol legible>).` |
| `logout` | `Cierre de sesión: <nombre del usuario> (<rol legible>).` |
| otra | `Acción registrada en el sistema: <accion>. Por <A>.` |

Los montos SHALL mostrarse como pesos con separador de miles (ej.: "$5.000"). Si un nombre o un horario no se puede resolver, el mensaje SHALL decir "paciente sin identificar", "profesional sin identificar" o "horario sin datos" en su lugar. En ningún caso SHALL mostrar el uuid, y armar el registro MUST NOT fallar por un detalle ausente o mal formado.

#### Scenario: Turno confirmado
- **GIVEN** que recepción confirma el turno de `pac-01` con `prof-1` del martes `2026-12-01 10:00`
- **WHEN** se consulta GET /api/registro
- **THEN** el mensaje es "Turno confirmado: Paciente Ficticio Uno con Dra. Ficticia Perez, Mar 01/12 10:00. Por Recepcionista Ficticia."

#### Scenario: Turno atendido
- **GIVEN** que la odontóloga "Dra. Ficticia Perez" marca como atendido el turno de `pac-01` del martes `10:00`
- **WHEN** se consulta GET /api/registro
- **THEN** el mensaje es "Turno atendido: Paciente Ficticio Uno con Dra. Ficticia Perez, Mar 01/12 10:00. Por Dra. Ficticia Perez."

#### Scenario: Paciente ausente
- **GIVEN** que recepción marca como ausente el turno de `pac-01` del martes `10:00`
- **WHEN** se consulta GET /api/registro
- **THEN** el mensaje empieza con "Paciente ausente: Paciente Ficticio Uno con Dra. Ficticia Perez, Mar 01/12 10:00."

#### Scenario: Turno cancelado con motivo
- **GIVEN** que recepción cancela el turno de `pac-01` del martes `10:00` con motivo "El paciente avisó por teléfono"
- **WHEN** se consulta GET /api/registro
- **THEN** el mensaje es "Turno cancelado: Paciente Ficticio Uno con Dra. Ficticia Perez, Mar 01/12 10:00. Motivo: «El paciente avisó por teléfono». Por Recepcionista Ficticia."

#### Scenario: Turno cancelado sin motivo en el detalle
- **GIVEN** un evento `cancelar` de un turno cuyo detalle no trae `motivoCancelacion`
- **WHEN** se arma el registro legible
- **THEN** el mensaje contiene "Sin motivo registrado." y no contiene "Motivo: «"

#### Scenario: Motivo de cancelación largo
- **GIVEN** un evento `cancelar` con un motivo de 200 caracteres
- **WHEN** se arma el registro legible
- **THEN** el motivo se muestra recortado a 80 caracteres terminados en "…"

#### Scenario: Cancelación por WhatsApp
- **GIVEN** que el paciente cancela por el bot de WhatsApp simulado su turno del martes `10:00`
- **WHEN** se consulta GET /api/registro
- **THEN** el mensaje empieza con "Turno cancelado: Paciente Ficticio Uno con Dra. Ficticia Perez, Mar 01/12 10:00." y termina con "Por el paciente por WhatsApp (simulación)."

#### Scenario: Turno reprogramado
- **GIVEN** que recepción reprograma el turno de `pac-01` con `prof-1` del martes `2026-12-01 10:00` al miércoles `2026-12-02 11:00` con el mismo profesional
- **WHEN** se consulta GET /api/registro
- **THEN** el mensaje es "Turno reprogramado: Paciente Ficticio Uno con Dra. Ficticia Perez, de Mar 01/12 10:00 a Mié 02/12 11:00. Por Recepcionista Ficticia."

#### Scenario: Turno reprogramado con otro profesional
- **GIVEN** que recepción reprograma el turno de `pac-01` de `prof-1` a `prof-2` ("Dr. Ficticio Gomez")
- **WHEN** se consulta GET /api/registro
- **THEN** el mensaje contiene "con Dr. Ficticio Gomez (antes con Dra. Ficticia Perez), de"

#### Scenario: Seña aprobada
- **GIVEN** que se aprueba la seña simulada de $5.000 del turno de `pac-01` del martes `10:00`
- **WHEN** se consulta GET /api/registro
- **THEN** el mensaje empieza con "Seña aprobada (simulación): $5.000 del turno de Paciente Ficticio Uno con Dra. Ficticia Perez, Mar 01/12 10:00."

#### Scenario: Seña rechazada
- **GIVEN** que se rechaza la seña simulada del turno de `pac-01` del martes `10:00`
- **WHEN** se consulta GET /api/registro
- **THEN** el mensaje empieza con "Seña rechazada (simulación): turno de Paciente Ficticio Uno con Dra. Ficticia Perez, Mar 01/12 10:00."

#### Scenario: Factura C emitida
- **GIVEN** que se emite la factura C simulada número `00001-00000001` por $25.000 del turno atendido de `pac-01` del martes `10:00`
- **WHEN** se consulta GET /api/registro
- **THEN** el mensaje empieza con "Factura C emitida (simulación): N° 00001-00000001 por $25.000, turno de Paciente Ficticio Uno con Dra. Ficticia Perez, Mar 01/12 10:00."
- **AND** el mensaje no contiene el CAE

#### Scenario: Historia clínica registrada sin contenido clínico
- **GIVEN** que la odontóloga registra una entrada de historia clínica de `pac-01` con un texto clínico
- **WHEN** se consulta GET /api/registro
- **THEN** el mensaje es "Entrada de historia clínica registrada: Paciente Ficticio Uno. Por Dra. Ficticia Perez."
- **AND** el mensaje no contiene ninguna parte del texto de la entrada

#### Scenario: Historia clínica consultada
- **GIVEN** que la odontóloga consulta la historia clínica de `pac-01`
- **WHEN** se consulta GET /api/registro
- **THEN** el mensaje es "Historia clínica consultada: Paciente Ficticio Uno. Por Dra. Ficticia Perez."

#### Scenario: Inicio y cierre de sesión sin token
- **GIVEN** que "Recepcionista Ficticia" inicia sesión y después la cierra
- **WHEN** se consulta GET /api/registro
- **THEN** los mensajes son "Inicio de sesión: Recepcionista Ficticia (Recepción)." y "Cierre de sesión: Recepcionista Ficticia (Recepción)."
- **AND** ningún mensaje contiene el token de la sesión

#### Scenario: Acción desconocida
- **GIVEN** un evento con `accion` "exportar" sobre la entidad "turno" con un uuid como `entidadId`
- **WHEN** se arma el registro legible
- **THEN** el mensaje es "Acción registrada en el sistema: exportar. Por <A>." y no contiene el uuid

#### Scenario: Detalle mal formado y turno inexistente
- **GIVEN** un evento `confirmar` cuyo `detalle` no es JSON válido y cuyo `entidadId` no corresponde a ningún turno guardado
- **WHEN** se arma el registro legible
- **THEN** el mensaje es "Turno confirmado: paciente sin identificar con profesional sin identificar, horario sin datos. Por <A>." y armar el registro no falla

### Requirement: Privacidad del registro legible

El `mensaje` del registro legible MUST NOT incluir uuids ni ids internos, tokens de sesión ni otros secretos, DNI, teléfonos, CAE ni contenido de la historia clínica o del odontograma. Los datos crudos (`accion`, `entidad`, `entidadId`, `usuarioId`) SHALL quedar solo en sus campos propios del payload. El registro legible es de solo lectura: MUST NOT modificar, borrar ni agregar eventos de auditoría.

#### Scenario: Ningún mensaje filtra datos sensibles
- **GIVEN** un registro con un evento de cada tipo de la tabla de mensajes, producidos por los casos de uso reales con el seed ficticio (incluidos un login, una entrada de historia clínica y una reserva por WhatsApp)
- **WHEN** se consulta GET /api/registro
- **THEN** ningún `mensaje` contiene un uuid, el token de la sesión, un DNI del seed, un teléfono del seed, el CAE de la factura ni el texto de la entrada de historia clínica

#### Scenario: Consultar el registro no altera la auditoría
- **GIVEN** que existen N eventos de auditoría
- **WHEN** un usuario autorizado solicita GET /api/registro dos veces
- **THEN** GET /api/auditoria sigue devolviendo exactamente los mismos N eventos, sin cambios
