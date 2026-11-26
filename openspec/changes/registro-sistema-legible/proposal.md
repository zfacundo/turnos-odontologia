## Why

La tarjeta "Lo que hizo el sistema" del panel muestra lo que devuelve `GET /api/registro`, y hoy solo `crear` tiene un mensaje legible, que además identifica al paciente por su id (`paciente pac-01`). Para el resto de los eventos sale la línea cruda: "confirmar: turno 3f2a…-uuid.", "sena_aprobada: turno 3f2a….". Recepción y administración no pueden leer qué pasó, con quién ni a qué hora sin cruzar uuids a mano.

## What Changes

- `GET /api/registro` devuelve un `mensaje` en español legible para **todos** los eventos auditables que existen hoy en el código: `crear` (y `crear` de un sobreturno), `confirmar`, `atender`, `ausente`, `cancelar` (con o sin motivo), `reprogramar`, `sena_aprobada`, `sena_rechazada`, `factura_emitida`, `historia-crear`, `historia-consultar`, `login` y `logout`. Una acción desconocida tiene un mensaje genérico, también sin ids.
- El mensaje identifica al **paciente** y al **profesional** por su nombre, al **turno** por día y hora (America/Argentina/Buenos_Aires) y a **quién lo hizo** por el nombre del usuario o como "el paciente por WhatsApp (simulación)". Nunca muestra uuids.
- Privacidad: el mensaje MUST NOT incluir secretos ni tokens de sesión, DNI, teléfono ni contenido clínico (las entradas de historia clínica solo dicen que se registró o se consultó la historia del paciente). El motivo de cancelación se muestra recortado.
- Cada elemento de `registro[]` suma `accion`, `entidad` y `entidadId` crudos junto a `fecha`, `usuarioId`, `rol` y `mensaje`. Es un cambio **aditivo**: ningún campo existente se quita ni se renombra. `GET /api/auditoria` no cambia.
- El mensaje de creación conserva el prefijo "Turno creado:" que fija el spec actual. Deja de llevar el id del paciente y pasa a llevar su nombre. El test `tests/api/auditoria.test.ts` que espera `pac-01` dentro del mensaje se actualiza, porque eso es justo lo que el change corrige.
- **No hay cambio visual**: la tarjeta del panel ya dibuja `fecha` + `mensaje` y su layout no cambia. Por eso no hace falta mockup (ver `design.md`, D7).

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `consulta-auditoria`: "Registro legible del sistema" pasa a exigir mensajes para todos los eventos y los campos crudos en el payload. "Mensajes de creación de turnos" identifica al paciente por nombre y al turno por día y hora. Se agregan los requisitos de mensajes por tipo de evento y de privacidad del registro.

## Impact

- **Código (zona C-09, Integrante 4, que debe revisar)**: `src/application/auditoria/registroLegible.ts` (reescrito como función pura con un directorio de nombres), un módulo puro nuevo de mensajes en `src/application/auditoria/`, `src/api/routes/auditoria.ts` (arma el directorio desde `deps` y lo pasa) y `tests/api/auditoria.test.ts`, con tests nuevos en `tests/application/auditoria/`.
- **Sin cambios**: los productores de auditoría (`crearTurno`, `cambiarEstadoTurno`, `cancelarTurno`, `reprogramarTurno`, `pagarSena`, `emitirFacturaC`, historia y auth), el puerto `Auditoria` (solo inserción), `GET /api/auditoria` y los permisos (admin y recepción, RN-AU-02), y `public/admin/js/agenda.js` y `agenda-calculos.js`.
- **Governance**: MEDIUM. Está **al lado de un dominio HIGH** (el log de auditoría): el change es solo de lectura y presentación y MUST NOT debilitar el registro. No cambia qué se audita, no borra ni edita eventos y no relaja permisos.
- **Fuera de alcance**: auditar los bloqueos (hoy `crearBloqueo`/`eliminarBloqueo` no registran eventos) y producir sobreturnos (C-13, stretch). Ver Open Questions en `design.md`.
