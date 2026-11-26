## Context

El panel Clientes y el WhatsApp simulado utilizaban diferentes fuentes para mostrar pacientes y teléfonos.

El formulario de alta también presenta dificultades porque el servidor exige formatos ficticios específicos.

## Goals / Non-Goals

### Goals

- Compartir la misma fuente de pacientes.
- Actualizar automáticamente los contactos de WhatsApp.
- Eliminar los contactos ficticios que no existen en Clientes.
- Facilitar el alta de pacientes válidos.
- Verificar la sincronización con pruebas.

### Non-Goals

- Integrar WhatsApp real.
- Almacenar datos de pacientes reales.
- Modificar la persistencia en memoria.
- Cambiar las reglas clínicas o de turnos.

## Decisions

### Fuente única de datos

El repositorio de pacientes será la fuente de información de Clientes y WhatsApp.

El simulador consultará los contactos mediante un endpoint de la API, evitando mantener teléfonos fijos en el HTML.

### Actualización de contactos

La pantalla de WhatsApp consultará periódicamente la lista de pacientes para incorporar nuevos contactos sin reiniciar el servidor.

### Registro de pacientes

El formulario propondrá DNI y teléfono ficticios compatibles con las validaciones del servidor.

Las validaciones de negocio seguirán realizándose en el backend.

## Risks / Trade-offs

- La actualización periódica genera consultas adicionales, aceptables para el simulador.
- Los pacientes nuevos no se conservarán después de reiniciar el servidor porque el repositorio es en memoria.
- Las pruebas antiguas que esperaban teléfonos fijos deberán actualizarse.

## Verification

- Ejecutar npm run typecheck.
- Ejecutar npm test.
- Crear un paciente desde el panel.
- Comprobar que aparezca en Clientes y WhatsApp.
- Verificar que no existan contactos ajenos al listado de pacientes.
- Comprobar el comportamiento ante datos inválidos.
