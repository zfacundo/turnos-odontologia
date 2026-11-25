# Proposal — C-09: Vista de agenda y registro del sistema



## Why



El sistema odontológico ya permite crear y consultar turnos mediante la API desarrollada en C-02, pero todavía necesita una interfaz visual para que los profesionales y recepcionistas puedan organizar su agenda.



También se necesita consultar el historial de acciones del sistema de manera comprensible, respetando los permisos de cada rol.



## What Changes

- Permitir que recepción y administración cancelen turnos desde la agenda.
- Registrar un aviso automático de cancelación en el WhatsApp simulado del paciente.
- Incorporar pruebas automatizadas para verificar las notificaciones y su separación por paciente.



- Crear una agenda visual con vistas diaria y semanal, organizada en bloques de 15 minutos.

- Incorporar filtros por profesional y sillón.

- Diferenciar las prestaciones mediante colores y mostrar el estado de cada turno, su origen de WhatsApp cuando corresponda y los horarios pasados atenuados.

- Crear un formulario de nuevo turno que utilice `POST /api/turnos` y muestre los conflictos cuando el servidor devuelva un error 409.

- Implementar un panel «Lo que hizo el sistema» con mensajes legibles.

- Incorporar `GET /api/auditoria` y `GET /api/registro`, respetando los permisos y las reglas de auditoría.

- Crear pruebas automatizadas para comprobar los endpoints de auditoría y registro.



**Fuera de alcance:**

- Bot conversacional de WhatsApp y envío de mensajes reales. Los avisos de cancelación son únicamente simulados.

- Lista de espera en la interfaz.

- Indicadores y estadísticas (KPIs).

- Edición o eliminación de eventos de auditoría.



## Capabilities



### New Capabilities



- `vista-agenda`: visualización diaria y semanal de los turnos, filtros y formulario de creación.

- `consulta-auditoria`: consulta de eventos de auditoría y presentación de un registro legible.



### Modified Capabilities



- Se reutiliza la gestión de turnos de C-02 sin modificar sus reglas de negocio.



## Impact



**Archivos previstos:**

- `public/index.html`

- `public/js/agenda.js`

- `src/application/auditoria/`

- `src/api/routes/auditoria.ts`

- `tests/api/auditoria.test.ts`



**Archivo compartido:**

- `src/api/app.ts`, para registrar las nuevas rutas, sujeto a revisión del equipo.



**APIs utilizadas:**

- `GET /api/turnos`

- `POST /api/turnos`



**Nuevas APIs:**

- `GET /api/auditoria`

- `GET /api/registro`



**Reglas de negocio:**

- RN-AU-01

- RN-AU-02

- RN-AG-03

- RN-DA-03



**Dependencia:** C-02 — Crear turnos sin solapamientos.



La implementación debe respetar las reglas del proyecto y reutilizar los componentes existentes siempre que sea posible.
