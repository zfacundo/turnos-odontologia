## Why

Actualmente, la lista de contactos del WhatsApp simulado no coincide con los pacientes registrados en el sistema odontológico.

Esto ocurre porque el simulador utilizaba teléfonos definidos manualmente, incluyendo contactos que no correspondían a pacientes existentes.

Además, el formulario de alta de pacientes presenta dificultades al cargar DNI y teléfonos ficticios válidos.

## What Changes

- Obtener los contactos de WhatsApp desde el repositorio de pacientes.
- Eliminar los teléfonos fijos del selector de WhatsApp.
- Actualizar automáticamente los contactos cuando se registra un paciente.
- Facilitar la carga de DNI y teléfonos ficticios en el formulario.
- Mantener los datos en memoria, respetando el carácter simulado del proyecto.
- Agregar y actualizar pruebas automatizadas.

## Capabilities

### New Capabilities

- `sincronizacion-pacientes-whatsapp`: mantener sincronizados los pacientes registrados y los contactos del WhatsApp simulado.

### Modified Capabilities

- Mejorar el formulario de registro de pacientes para facilitar la carga de datos ficticios válidos.

## Impact

Archivos relacionados:

- `public/bot.html`
- `public/js/bot.js`
- `public/admin/js/clientes.js`
- `src/simulators/whatsapp/router.ts`
- Pruebas automatizadas de pacientes y WhatsApp.

La mejora reutiliza el repositorio de pacientes y no requiere servicios externos.
