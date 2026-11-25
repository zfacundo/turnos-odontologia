

# Tasks — C-09: Vista de agenda y registro del sistema



## 1. Preparación y revisión



- [x] 1.1 Revisar el contrato de GET /api/turnos y POST /api/turnos.

- [x] 1.2 Verificar el modelo de estados y RN-DA-03.

- [x] 1.3 Revisar la implementación existente de auditoría.

- [x] 1.4 Aprobar las especificaciones y el diseño de C-09.



## 2. Desarrollo de la agenda visual



- [x] 2.1 Crear public/index.html.

- [x] 2.2 Crear public/js/agenda.js.

- [x] 2.3 Implementar la vista diaria y semanal con bloques de 15 minutos.

- [x] 2.4 Mostrar turnos obtenidos mediante GET /api/turnos.

- [x] 2.5 Implementar filtros por profesional y sillón.

- [x] 2.6 Mostrar colores, estados, origen WhatsApp y horarios pasados.

- [x] 2.7 Implementar el selector de rol simulado.



## 3. Formulario de turnos



- [x] 3.1 Crear el formulario de nuevo turno.

- [x] 3.2 Conectarlo con POST /api/turnos.

- [x] 3.3 Mostrar los errores 409 y el turno en conflicto.

- [x] 3.4 Actualizar la agenda después de crear un turno.



## 4. Auditoría y registro



- [x] 4.1 Implementar listarAuditoria reutilizando los eventos existentes.

- [x] 4.2 Implementar registroLegible.

- [x] 4.3 Crear las rutas GET /api/auditoria y GET /api/registro.

- [x] 4.4 Integrar las rutas con Express, coordinando los archivos compartidos.

- [x] 4.5 Implementar el panel "Lo que hizo el sistema".



## 5. Verificación



- [x] 5.1 Crear tests de permisos de auditoría.

- [x] 5.2 Verificar el orden cronológico de los eventos.

- [x] 5.3 Verificar que crear un turno genere un mensaje legible.

- [x] 5.4 Verificar que no existan rutas de edición o borrado de auditoría.

- [x] 5.5 Probar manualmente los filtros y la creación de turnos.

- [x] 5.6 Ejecutar npm test y npm run typecheck.



- [x] 5.7 Verificar aviso de cancelación con tests automatizados.
- [x] 5.8 Probar manualmente cancelación y WhatsApp simulado.

## 6. Cierre



- [ ] 6.1 Revisar que se cumplan las especificaciones.

- [x] 6.2 Registrar los cambios mediante commits.

- [x] 6.3 Preparar el Pull Request para revisión de Facundo.

- [ ] 6.4 Archivar el Change siguiendo el procedimiento del equipo.
