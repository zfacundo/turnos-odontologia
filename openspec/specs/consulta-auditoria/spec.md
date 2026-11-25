# consulta-auditoria Specification

## Purpose
TBD - created by archiving change vista-agenda-y-registro-del-sistema. Update Purpose after archive.

## Requirements

### Requirement: Consulta de eventos de auditoría

El sistema SHALL proporcionar GET /api/auditoria para consultar los eventos registrados.

La consulta SHALL respetar los permisos establecidos en RN-AU-02.

#### Scenario: Recepción consulta la auditoría

\- \*\*GIVEN\*\* que existen eventos registrados

\- \*\*WHEN\*\* un usuario con rol "recepcion" solicita GET /api/auditoria

\- \*\*THEN\*\* el servidor responde HTTP 200

\- \*\*AND\*\* devuelve los eventos registrados

#### Scenario: Administración consulta la auditoría

\- \*\*WHEN\*\* un usuario con rol "admin" solicita GET /api/auditoria

\- \*\*THEN\*\* el servidor responde HTTP 200

\- \*\*AND\*\* devuelve los eventos registrados

#### Scenario: Odontólogo intenta consultar auditoría

\- \*\*WHEN\*\* un usuario con rol "odontologo" solicita GET /api/auditoria

\- \*\*THEN\*\* el servidor responde HTTP 403

#### Scenario: Consulta sin autorización

\- \*\*WHEN\*\* un usuario sin rol autorizado solicita GET /api/auditoria

\- \*\*THEN\*\* el servidor responde HTTP 403

### Requirement: Orden cronológico de eventos

El sistema SHALL devolver los eventos de auditoría ordenados cronológicamente.

#### Scenario: Eventos registrados fuera de orden

\- \*\*GIVEN\*\* que existen eventos con diferentes fechas

\- \*\*WHEN\*\* un usuario autorizado consulta GET /api/auditoria

\- \*\*THEN\*\* recibe los eventos ordenados desde el más antiguo hasta el más reciente

### Requirement: Registro legible del sistema

El sistema SHALL proporcionar GET /api/registro para presentar los eventos como mensajes comprensibles.

La consulta SHALL respetar los mismos permisos establecidos para la auditoría.

#### Scenario: Consultar registro como recepción

\- \*\*WHEN\*\* un usuario con rol "recepcion" solicita GET /api/registro

\- \*\*THEN\*\* el servidor responde HTTP 200

\- \*\*AND\*\* devuelve una colección de mensajes legibles

#### Scenario: Consultar registro como odontólogo

\- \*\*WHEN\*\* un usuario con rol "odontologo" solicita GET /api/registro

\- \*\*THEN\*\* el servidor responde HTTP 403

#### Scenario: Registro sin eventos

\- \*\*GIVEN\*\* que no existen eventos de auditoría

\- \*\*WHEN\*\* un usuario autorizado solicita GET /api/registro

\- \*\*THEN\*\* el servidor responde HTTP 200

\- \*\*AND\*\* devuelve una colección vacía

### Requirement: Mensajes de creación de turnos

El sistema SHALL convertir los eventos de creación de turnos en mensajes legibles.

#### Scenario: Turno creado correctamente

\- \*\*GIVEN\*\* que un usuario autorizado crea un turno

\- \*\*WHEN\*\* se consulta GET /api/registro

\- \*\*THEN\*\* aparece un mensaje que comienza con "Turno creado:"

\- \*\*AND\*\* el mensaje identifica el turno registrado

#### Scenario: Conservar información del evento

\- \*\*GIVEN\*\* que existe un evento de creación

\- \*\*WHEN\*\* se consulta el registro legible

\- \*\*THEN\*\* se conserva la información del usuario, rol y fecha del evento

\- \*\*AND\*\* se proporciona una descripción comprensible de la acción

### Requirement: Reutilización de auditoría existente

El sistema SHALL utilizar los eventos de auditoría registrados por las funcionalidades existentes.

La consulta SHALL trabajar sin modificar los eventos originales.

#### Scenario: Consultar un evento existente

\- \*\*GIVEN\*\* que la aplicación registró un evento de auditoría

\- \*\*WHEN\*\* un usuario autorizado consulta GET /api/auditoria

\- \*\*THEN\*\* el evento aparece en la respuesta

\- \*\*AND\*\* conserva su información original

### Requirement: Auditoría de solo lectura

El sistema MUST NOT proporcionar operaciones para modificar o eliminar eventos de auditoría, según RN-AU-02.

#### Scenario: Intentar modificar un evento

\- \*\*WHEN\*\* un usuario solicita PATCH /api/auditoria/turno-1

\- \*\*THEN\*\* el servidor responde HTTP 404

\- \*\*AND\*\* no modifica ningún evento

#### Scenario: Intentar eliminar un evento

\- \*\*WHEN\*\* un usuario solicita DELETE /api/auditoria/turno-1

\- \*\*THEN\*\* el servidor responde HTTP 404

\- \*\*AND\*\* no elimina ningún evento

### Requirement: Registro de operaciones exitosas

El sistema SHALL conservar la auditoría de las operaciones de creación exitosas sin registrar como exitosas las operaciones rechazadas.

#### Scenario: Registrar creación válida

\- \*\*GIVEN\*\* que una solicitud POST /api/turnos crea un turno correctamente

\- \*\*WHEN\*\* se consulta GET /api/auditoria

\- \*\*THEN\*\* existe un evento correspondiente a esa creación

#### Scenario: Creación rechazada por conflicto

\- \*\*GIVEN\*\* que una solicitud POST /api/turnos es rechazada con HTTP 409

\- \*\*WHEN\*\* se consulta GET /api/auditoria

\- \*\*THEN\*\* no existe un evento de creación exitosa correspondiente a la solicitud rechazada
