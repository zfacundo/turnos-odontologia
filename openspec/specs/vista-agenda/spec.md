# vista-agenda Specification

## Purpose
TBD - created by archiving change vista-agenda-y-registro-del-sistema. Update Purpose after archive.

## Requirements

### Requirement: Consulta de turnos

El sistema SHALL consultar GET /api/turnos para obtener los turnos reales y mostrarlos en la agenda visual.

#### Scenario: Agenda con turnos

\- \*\*GIVEN\*\* que existen turnos registrados

\- \*\*WHEN\*\* el usuario abre la agenda

\- \*\*THEN\*\* el sistema consulta GET /api/turnos

\- \*\*AND\*\* muestra los turnos recibidos en sus fechas y horarios correspondientes

#### Scenario: Agenda vacía

\- \*\*GIVEN\*\* que no existen turnos registrados

\- \*\*WHEN\*\* el usuario abre la agenda

\- \*\*THEN\*\* muestra una grilla vacía sin generar errores

### Requirement: Grilla de 15 minutos

La agenda SHALL organizar los horarios en intervalos de 15 minutos, respetando RN-AG-03.

Cada turno SHALL ocupar visualmente el tiempo comprendido entre su inicio y su fin.

#### Scenario: Turno de 30 minutos

\- \*\*GIVEN\*\* que existe un turno de 30 minutos

\- \*\*WHEN\*\* se muestra en la agenda

\- \*\*THEN\*\* ocupa visualmente dos intervalos de 15 minutos

#### Scenario: Turno de 45 minutos

\- \*\*GIVEN\*\* que existe un turno de 45 minutos

\- \*\*WHEN\*\* se muestra en la agenda

\- \*\*THEN\*\* ocupa visualmente tres intervalos de 15 minutos

#### Scenario: Turno de 60 minutos

\- \*\*GIVEN\*\* que existe un turno de 60 minutos

\- \*\*WHEN\*\* se muestra en la agenda

\- \*\*THEN\*\* ocupa visualmente cuatro intervalos de 15 minutos

### Requirement: Vistas diaria y semanal

La interfaz SHALL permitir alternar entre una vista diaria y una semanal.

#### Scenario: Vista diaria

\- \*\*WHEN\*\* el usuario selecciona "Día"

\- \*\*THEN\*\* visualiza los horarios correspondientes a la fecha seleccionada

#### Scenario: Vista semanal

\- \*\*WHEN\*\* el usuario selecciona "Semana"

\- \*\*THEN\*\* visualiza los siete días de la semana correspondiente a la fecha seleccionada

### Requirement: Filtros por profesional y sillón

El sistema SHALL ofrecer filtros por profesional y sillón utilizando los datos de GET /api/catalogo.

Los filtros SHALL funcionar individualmente y en combinación.

#### Scenario: Filtrar por profesional

\- \*\*GIVEN\*\* que existen turnos de distintos profesionales

\- \*\*WHEN\*\* el usuario selecciona un profesional

\- \*\*THEN\*\* se muestran solamente los turnos correspondientes a ese profesional

#### Scenario: Filtrar por sillón

\- \*\*GIVEN\*\* que existen turnos asignados a diferentes sillones

\- \*\*WHEN\*\* el usuario selecciona "Sillón 2"

\- \*\*THEN\*\* se muestran solamente los turnos asignados al Sillón 2

#### Scenario: Combinar filtros

\- \*\*WHEN\*\* el usuario selecciona un profesional y un sillón

\- \*\*THEN\*\* se muestran solamente los turnos que cumplen ambas condiciones

#### Scenario: Mostrar todos

\- \*\*WHEN\*\* el usuario selecciona "Todos" en ambos filtros

\- \*\*THEN\*\* se muestran los turnos de todos los profesionales y sillones

### Requirement: Información visual de los turnos

La agenda SHALL mostrar información suficiente para identificar cada turno.

La interfaz SHALL diferenciar las prestaciones mediante colores y mostrar el estado, profesional, sillón y paciente.

#### Scenario: Identificar una prestación

\- \*\*GIVEN\*\* que existen turnos con distintas prestaciones

\- \*\*WHEN\*\* se muestran en la agenda

\- \*\*THEN\*\* utilizan colores diferenciados por prestación

\- \*\*AND\*\* muestran el nombre de la prestación correspondiente

#### Scenario: Mostrar estado reservado

\- \*\*GIVEN\*\* que un turno tiene estado "reservado"

\- \*\*WHEN\*\* aparece en la agenda

\- \*\*THEN\*\* muestra el texto "Sin confirmar"

#### Scenario: Mostrar estado confirmado

\- \*\*GIVEN\*\* que un turno tiene estado "confirmado"

\- \*\*WHEN\*\* aparece en la agenda

\- \*\*THEN\*\* muestra el texto "Confirmó"

#### Scenario: Mostrar estado atendido

\- \*\*GIVEN\*\* que un turno tiene estado "atendido"

\- \*\*WHEN\*\* aparece en la agenda

\- \*\*THEN\*\* muestra el texto "Atendido"

#### Scenario: Identificar origen WhatsApp

\- \*\*GIVEN\*\* que un turno tiene origen "whatsapp"

\- \*\*WHEN\*\* aparece en la agenda

\- \*\*THEN\*\* se muestra un indicador visual de WhatsApp

#### Scenario: Atenuar horarios pasados

\- \*\*GIVEN\*\* que un horario ya transcurrió

\- \*\*WHEN\*\* se muestra en la agenda

\- \*\*THEN\*\* aparece visualmente atenuado

### Requirement: Horarios locales

La interfaz SHALL presentar las fechas y horas según la zona horaria argentina utilizada por el consultorio.

#### Scenario: Mostrar un turno almacenado en UTC

\- \*\*GIVEN\*\* que un turno comienza a las 13:00 UTC

\- \*\*WHEN\*\* corresponde a las 10:00 de Argentina

\- \*\*THEN\*\* la agenda muestra las 10:00

### Requirement: Creación de turnos

La interfaz SHALL proporcionar un formulario para crear turnos mediante POST /api/turnos.

La validación de las reglas de negocio SHALL permanecer en el servidor.

#### Scenario: Crear turno correctamente

\- \*\*GIVEN\*\* que el usuario tiene permisos y los datos son válidos

\- \*\*WHEN\*\* completa el formulario y presiona "Crear turno"

\- \*\*THEN\*\* la interfaz envía POST /api/turnos

\- \*\*AND\*\* muestra un mensaje de confirmación

\- \*\*AND\*\* actualiza la agenda

#### Scenario: Conflicto de horario

\- \*\*GIVEN\*\* que el horario solicitado entra en conflicto con otro turno

\- \*\*WHEN\*\* el servidor responde HTTP 409

\- \*\*THEN\*\* la interfaz muestra un mensaje de conflicto

\- \*\*AND\*\* muestra el identificador del turno en conflicto cuando está disponible

#### Scenario: Rol sin permiso

\- \*\*GIVEN\*\* que el usuario tiene rol "odontologo"

\- \*\*WHEN\*\* intenta crear un turno sin autorización

\- \*\*THEN\*\* el servidor responde HTTP 403

\- \*\*AND\*\* la interfaz informa que no tiene permiso

### Requirement: Selector de rol simulado

La interfaz SHALL permitir seleccionar un rol simulado para utilizar los mecanismos de autenticación existentes.

#### Scenario: Seleccionar recepción

\- \*\*WHEN\*\* el usuario selecciona "Recepción"

\- \*\*THEN\*\* la interfaz guarda el rol simulado

\- \*\*AND\*\* las solicitudes posteriores utilizan los encabezados X-Usuario y X-Rol mediante api.js

#### Scenario: Cambiar de rol

\- \*\*WHEN\*\* el usuario selecciona otro rol

\- \*\*THEN\*\* las siguientes solicitudes utilizan el nuevo rol

### Requirement: Integración con el registro

La pantalla SHALL mostrar un panel denominado "Lo que hizo el sistema".

#### Scenario: Actualizar registro

\- \*\*WHEN\*\* un usuario autorizado consulta el panel

\- \*\*THEN\*\* la interfaz obtiene los mensajes mediante GET /api/registro

#### Scenario: Crear turno y actualizar registro

\- \*\*WHEN\*\* un turno se crea correctamente

\- \*\*THEN\*\* la interfaz actualiza la agenda

\- \*\*AND\*\* vuelve a consultar el registro del sistema

### Requirement: Cancelación desde la agenda y aviso simulado

La agenda SHALL permitir que recepción y administración soliciten la cancelación de un turno activo, indicando un motivo y confirmando la operación.

La cancelación SHALL utilizar POST /api/turnos/:id/cancelar y respetar las validaciones y permisos del servidor.

Cuando la cancelación sea exitosa, el sistema SHALL registrar un aviso en el WhatsApp simulado del paciente correspondiente.

#### Scenario: Cancelación exitosa

- **GIVEN** que existe un turno activo
- **AND** el usuario tiene rol recepción o administración
- **WHEN** selecciona el turno, escribe el motivo y confirma
- **THEN** el sistema solicita su cancelación al servidor
- **AND** actualiza la agenda y el registro de auditoría
- **AND** registra un aviso de cancelación en el WhatsApp simulado del paciente

#### Scenario: Cancelación rechazada

- **GIVEN** que el servidor rechaza una cancelación
- **WHEN** el usuario intenta cancelar el turno
- **THEN** la agenda informa el error
- **AND** no se genera un aviso de cancelación

#### Scenario: Rol sin permiso en la agenda

- **GIVEN** que el usuario selecciona el rol odontólogo
- **WHEN** consulta la agenda
- **THEN** la interfaz no muestra el panel de cancelación

#### Scenario: Privacidad del aviso

- **GIVEN** que un turno fue cancelado correctamente
- **WHEN** se consulta el WhatsApp simulado de otro paciente
- **THEN** no se muestra el aviso de ese turno
- **AND** el mensaje de cancelación no incluye información clínica ni el motivo registrado
