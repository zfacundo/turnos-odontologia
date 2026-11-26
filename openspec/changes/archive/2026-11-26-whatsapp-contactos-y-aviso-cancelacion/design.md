# Design

## Context

Ver `proposal.md` (Why). Estado observado (rama `confirmacion-turno-whatsapp`, con el trabajo de ese change aún sin commitear):

- `src/simulators/whatsapp/router.ts`:
  - `GET /sim/whatsapp/contactos` → `{ simulado: true, total, contactos: [{ id, nombre, telefono }] }` con `deps.pacientes.listar()`, sin rol ni enmascarado.
  - `POST /sim/whatsapp/mensaje` y `POST /sim/whatsapp/recordatorio` leen `telefono` del cuerpo (`telefonoDe`, regex `^\+54 9 11 0000-00\d{2}$`) y atienden con `procesar(deps, telefono, sesiones.get(telefono) ?? nuevaSesion(), …)`. Las sesiones son un `Map` por teléfono. El router no usa `X-Rol`: «representa al paciente del teléfono».
  - `GET /sim/whatsapp/avisos?telefono=` valida el mismo formato y devuelve `consultarAvisosCancelacion(deps, telefono)` (bandeja por teléfono en `bandejaSimulada.ts`).
- `src/simulators/whatsapp/bot.ts` identifica al paciente con `pacientePorTelefono` y, si el número no existe, registra uno nuevo con ese teléfono (flujo `+54 9 11 0000-0099` del spec `bot-whatsapp`).
- `public/js/bot.js` (sin login): `sincronizarContactos()` sondea `/contactos` cada 3 s, arma `new Option(paciente.telefono + ' · ' + paciente.nombre, paciente.telefono)`, compara por `telefono`; `enviar()` y el botón de recordatorio mandan `{ telefono: selTelefono.value }`; `consultarAvisos()` pide `/avisos?telefono=…` cada 3 s y deduplica por `id`; `reiniciar()` escribe el teléfono en la cabecera.
- `src/application/pacientes/pacientePublico.ts` enmascara: DNI `99****05`, teléfono `+54 9 11 0000-**01` (`slice(0,-4) + '**' + slice(-2)`); lo usan `GET /api/pacientes`, el panel y la Factura C.
- `src/api/routes/turnos.ts`, `POST /turnos/:id/cancelar`: tras `cancelarTurno` exitoso, bloque inline en `try/catch` que, si `paciente?.telefono`, formatea `turno.inicio` con `Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' })`, resuelve el profesional (fallback a id) y registra `'Hola, ' + nombre + '. Te informamos que tu turno del ' + fecha + ' con ' + profesional + ' fue cancelado. Para solicitar otro turno, comunicate con recepción.'` con `registrarAvisoCancelacion`. Errores → `console.error('No se pudo registrar el aviso simulado:', error)`. **No hay condición de rol ni de origen**: cualquier cancelación exitosa por esta ruta avisa si el paciente tiene teléfono. Los caracteres del bloque están correctos (`notificación`, `operación`, `algún`, `recepción`); no hay `?` rotos.

## Goals / Non-Goals

**Goals:**
- A: que ninguna respuesta del simulador exponga el teléfono completo de otros pacientes, sin romper la pantalla del bot (selección, chat, recordatorio 24 h, sondeo de avisos).
- B: sacar el aviso de cancelación de la ruta con el mismo patrón que la confirmación, sin cambiar texto ni condiciones.

**Non-Goals:**
- Autenticar al paciente del bot (sigue siendo una simulación sin login).
- Cambiar la clave interna de sesiones y bandeja (sigue siendo el teléfono).
- Quitar `telefono` de los endpoints de mensaje/recordatorio/avisos (se mantiene por compatibilidad y para el flujo de número nuevo).
- Tocar `confirmacionTurno.ts`, `bandejaSimulada.ts`, `pacientePublico.ts` o el dominio.
- Eliminar `registrarAvisoCancelacion` de `avisosCancelacion.ts` (puede quedar sin uso en `src/`; ver Open Questions).

## Decisions

### D1 (A). Recomendado: opción 1 — contacto enmascarado + identificación por `pacienteId`

- `GET /sim/whatsapp/contactos` devuelve `{ simulado: true, total, contactos: [{ id, nombre, telefonoEnmascarado }] }`. El enmascarado reutiliza `pacientePublico(p).telefono` (no se edita `pacientePublico.ts`, zona de Integrante 3).
- Nuevo módulo `src/simulators/whatsapp/contactoSimulado.ts`:
  - `contactoPublico(paciente): ContactoSimulado` — puro.
  - `resolverTelefono(deps, fuente: Record<string, unknown>): string` — exactamente uno de `telefono` (formato ficticio) o `pacienteId` (paciente existente con teléfono no vacío); si no, lanza `ErrorDeEntrada` (el router ya traduce a `400 entrada`). Reemplaza a `telefonoDe` y a la validación inline de `/avisos` (que lee de `req.query`).
- El router usa `resolverTelefono` en los tres endpoints; el resto (sesiones, `procesar`, bandeja) no cambia, por eso «misma conversación por paciente o por teléfono» sale gratis.
- `public/js/bot.js`: valor de la opción = `paciente.id`; texto = `paciente.telefonoEnmascarado + ' · ' + paciente.nombre`; comparación por `id`; `enviar`, recordatorio y `consultarAvisos` mandan `pacienteId` (`/avisos?pacienteId=` con `encodeURIComponent`); la cabecera muestra el texto de la opción seleccionada (enmascarado).

**Pros:** privacidad más fuerte (el navegador nunca recibe teléfonos completos), coherente con `pacientePublico`; el id `pac-NN` ya circula en otras respuestas (`GET /api/turnos`) y no es dato personal; cambio aditivo en mensaje/recordatorio/avisos (los tests de contrato con `telefono` quedan verdes). **Contras:** rompe el contrato de `/contactos` (`telefono` → `telefonoEnmascarado`); toca router, nuevo módulo y `bot.js`; la aserción de `pantalla.test.ts` sobre el formato de la opción cambia (por spec). Riesgo residual aceptado: sin login, cualquiera puede hablar como `pac-01` con su id (igual que hoy con su teléfono).

### D2 (A). Alternativas descartadas (a confirmar en Q-1)

- **Opción 2 — teléfono completo con restricción por rol/encabezado.** El bot no tiene sesión; habría que enviar un encabezado simulado (p. ej. `X-Rol: recepcion`) desde `bot.js`. Pros: cambio mínimo, `bot.js` casi igual. Contras: el encabezado es trivial de falsificar, no protege nada; la pantalla de paciente actuaría como recepción (contradice el comentario del router y el modelo de roles); sigue entregando teléfonos completos al navegador.
- **Opción 3 — teléfono enmascarado + token opaco por contacto.** Pros: privacidad equivalente a la 1 y no expone ni el id. Contras: requiere un mapa token↔teléfono en memoria con ciclo de vida (rotación, reinicio del servidor), más estado y más tests; el `id` del paciente ya es opaco y no sensible, así que la opción 1 es esta misma idea sin estado extra.

### D3 (B). `src/simulators/whatsapp/cancelacionTurno.ts`

Mismo patrón que `confirmacionTurno.ts` (D2 de `confirmacion-turno-whatsapp`):
- `mensajeCancelacionTurno({ paciente, profesional, inicio }): string` — **pura**; mismo `Intl.DateTimeFormat` es-AR / Buenos Aires; texto idéntico al actual.
- `registrarAvisoCancelacionTurno(deps, turno, registrar = registrarMensajeSimulado): boolean` — si el paciente del turno tiene teléfono no vacío, resuelve el profesional (fallback a id), arma el texto y lo registra en la bandeja; devuelve `true` si registró. **Nunca lanza**: `console.error('No se pudo registrar el aviso simulado:', error)` y `false`.
- Sin parámetro `usuario`: hoy no hay condición de rol ni de origen, y agregarla sería inventar comportamiento (regla 12).
- La ruta queda: `registrarAvisoCancelacionTurno(deps, resultado.valor.turno);` antes de `res.status(200).json(...)`. Se quita el import de `registrarAvisoCancelacion` de `turnos.ts` si queda sin uso.
- El formateador se duplica como constante local (no se toca `confirmacionTurno.ts`); unificarlo es un refactor posterior opcional.
- Capability: `vista-agenda` (ADDED), junto a «Cancelación desde la agenda y aviso simulado», cuyo texto no necesita cambios.

### D4. Tests sin mocks

Repos en memoria reales (`cargarSeed(new RelojFijo(new Date('2026-11-30T09:00:00-03:00')))`), turnos creados y cancelados con los casos de uso reales. La falla del aviso se prueba pasando un `registrar` que lanza (puerto del simulador, no un repo). Paciente sin teléfono: se guarda en el repo en memoria con `telefono: ''`. Fecha de texto exacto `2026-12-01T13:00:00Z` → `1/12/26, 10:00 a. m.` comparando con `\s` normalizado (D5 de la confirmación).

## Risks / Trade-offs

- [BREAKING en `/contactos`] → el único consumidor conocido es `public/js/bot.js` (se actualiza en el mismo change); verificar con `git grep "sim/whatsapp/contactos"` antes del Apply.
- [`turnos.ts` y `router.ts` son compartidos / de otra zona] → cambios acotados, revisión del team lead (regla 11); HIGH para A.
- [Apply sobre trabajo sin commitear] → `confirmacion-turno-whatsapp` debe estar commiteado/mergeado antes (bandeja, `turnos.ts`, `bot.js`).
- [Change `bot-whatsapp-reprogramar-turno`] → cancelado sin implementar el 2026-11-26 por decisión del team lead; ya no hay riesgo de solape.
- [Formato de fecha dependiente de ICU] → normalización de espacios en el test.

## Migration Plan

Sin datos que migrar (todo en memoria). Despliegue junto con `bot.js` (mismo estático). Rollback: revertir el commit.

## Open Questions

- **Q-1 (RESUELTA, 2026-11-26, team lead): aprobada la opción 1** (contactos `{ id, nombre, telefonoEnmascarado }`; el bot identifica al contacto por `pacienteId`; los endpoints siguen aceptando `telefono`; exactamente uno de los dos, si no `400`). Pregunta original: ¿se aprueba la opción 1 (contactos enmascarados + `pacienteId`), que cambia el contrato de `GET /api/sim/whatsapp/contactos`? Alternativas en D2. Sin esta aprobación no se aplica la parte A; la parte B es independiente.
- Q-2 (decidida por el team lead: se conserva `registrarAvisoCancelacion`): ¿se elimina `registrarAvisoCancelacion` de `avisosCancelacion.ts` si queda sin uso en `src/`, o se conserva como API del módulo? Propuesta: conservarla en este change.
- Q-3 (fuera de alcance, team lead): ¿unificar el formateador de fecha de confirmación y cancelación en un módulo común? Fuera de alcance.
