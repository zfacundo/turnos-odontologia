

\# Design — C-09: Vista de agenda y registro



\## Contexto



El sistema ya cuenta con una API para crear y consultar turnos, desarrollada en C-02.



C-09 reutilizará estas funcionalidades para construir una interfaz visual y agregar consultas de auditoría.



\## Decisión 1: Interfaz de usuario



Se utilizarán HTML, CSS y JavaScript, siguiendo las tecnologías existentes.



\- public/index.html: estructura de la pantalla.

\- public/js/agenda.js: comportamiento de la agenda.

\- public/js/api.js: comunicación con el servidor existente.



La interfaz incluirá vistas diaria y semanal, filtros, formulario de turnos y panel de registro.



Se tomará como referencia el prototipo del Discovery.



\## Decisión 2: Gestión de turnos



La interfaz utilizará:



\- GET /api/turnos: consultar turnos.

\- POST /api/turnos: crear turnos.

\- GET /api/catalogo: obtener información del catálogo.



No se duplicarán las validaciones de negocio de C-02.



La agenda organizará visualmente los turnos en bloques de 15 minutos.



\## Decisión 3: Auditoría



Se reutilizarán los eventos registrados por el sistema.



Se desarrollarán:



\- listarAuditoria: consultar eventos.

\- registroLegible: convertir eventos en mensajes.

\- GET /api/auditoria: consultar auditoría.

\- GET /api/registro: consultar mensajes legibles.



Los endpoints respetarán los permisos establecidos en RN-AU-02.



La auditoría será de solo lectura.



\## Decisión 4: Integración



Las nuevas rutas se registrarán en la aplicación Express existente.



Antes de implementar la lectura de auditoría, se revisará cómo exponer los eventos sin romper el contrato actual ni modificar archivos compartidos sin autorización.



\## Decisión 5: Verificación



Se utilizarán:



\- Tests automatizados para la API de auditoría.

\- Pruebas manuales para la interfaz.

\- npm test para comprobar que las funcionalidades anteriores continúan funcionando.

\- npm run typecheck para comprobar los tipos.



\## Riesgos y decisiones pendientes



\- Comprobar el mapeo de estados del turno.

\- Confirmar cómo exponer la lectura de eventos de auditoría.

\- Coordinar con el Team Lead las modificaciones a archivos compartidos.

\- Mantener la interfaz dentro del alcance definido en C-09.



