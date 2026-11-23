

\# Tasks — C-09: Vista de agenda y registro del sistema



\## 1. Preparación y revisión



\- \[ ] 1.1 Revisar el contrato de GET /api/turnos y POST /api/turnos.

\- \[ ] 1.2 Verificar el modelo de estados y RN-DA-03.

\- \[ ] 1.3 Revisar la implementación existente de auditoría.

\- \[ ] 1.4 Aprobar las especificaciones y el diseño de C-09.



\## 2. Desarrollo de la agenda visual



\- \[ ] 2.1 Crear public/index.html.

\- \[ ] 2.2 Crear public/js/agenda.js.

\- \[ ] 2.3 Implementar la vista diaria y semanal con bloques de 15 minutos.

\- \[ ] 2.4 Mostrar turnos obtenidos mediante GET /api/turnos.

\- \[ ] 2.5 Implementar filtros por profesional y sillón.

\- \[ ] 2.6 Mostrar colores, estados, origen WhatsApp y horarios pasados.

\- \[ ] 2.7 Implementar el selector de rol simulado.



\## 3. Formulario de turnos



\- \[ ] 3.1 Crear el formulario de nuevo turno.

\- \[ ] 3.2 Conectarlo con POST /api/turnos.

\- \[ ] 3.3 Mostrar los errores 409 y el turno en conflicto.

\- \[ ] 3.4 Actualizar la agenda después de crear un turno.



\## 4. Auditoría y registro



\- \[ ] 4.1 Implementar listarAuditoria reutilizando los eventos existentes.

\- \[ ] 4.2 Implementar registroLegible.

\- \[ ] 4.3 Crear las rutas GET /api/auditoria y GET /api/registro.

\- \[ ] 4.4 Integrar las rutas con Express, coordinando los archivos compartidos.

\- \[ ] 4.5 Implementar el panel "Lo que hizo el sistema".



\## 5. Verificación



\- \[ ] 5.1 Crear tests de permisos de auditoría.

\- \[ ] 5.2 Verificar el orden cronológico de los eventos.

\- \[ ] 5.3 Verificar que crear un turno genere un mensaje legible.

\- \[ ] 5.4 Verificar que no existan rutas de edición o borrado de auditoría.

\- \[ ] 5.5 Probar manualmente los filtros y la creación de turnos.

\- \[ ] 5.6 Ejecutar npm test y npm run typecheck.



\## 6. Cierre



\- \[ ] 6.1 Revisar que se cumplan las especificaciones.

\- \[ ] 6.2 Registrar los cambios mediante commits.

\- \[ ] 6.3 Preparar el Pull Request para revisión de Facundo.

\- \[ ] 6.4 Archivar el Change siguiendo el procedimiento del equipo.





