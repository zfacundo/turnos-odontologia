# Design

## Context

Ver `proposal.md` (Why). Estado actual tras el PR #35:

- `src/api/routes/turnos.ts`, handler `POST /turnos`: después de `crearTurno(...)` exitoso, un bloque inline (`// CONFIRMACION_AGENDA_WHATSAPP`) consulta paciente/profesional/prestación en `deps`, formatea `turno.inicio` con `Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' })`, arma el texto (con `?Te esperamos!`) y llama a `registrarAvisoCancelacion(deps, telefono, mensaje)` dentro de un `try/catch` con `console.error`.
- `src/simulators/whatsapp/avisosCancelacion.ts`: bandeja en memoria por `Deps` (`WeakMap<Deps, Map<telefono, AvisoCancelacion[]>>`) con contador de ids a nivel de módulo; `registrarAvisoCancelacion` / `consultarAvisosCancelacion`. La consume `GET /api/sim/whatsapp/avisos` (`router.ts`) y `public/js/bot.js` muestra cada aviso nuevo como burbuja del bot (sondeo cada 3 s, deduplicado por `id`).
- `tests/simulators/whatsapp/avisosCancelacion.test.ts` ya espera 2 avisos (confirmación + cancelación) y cubre tres casos de la confirmación por API.
- El `Paciente` del dominio tiene `telefono: string` obligatorio; «sin teléfono» = cadena vacía.

## Goals / Non-Goals

**Goals:**
- Sacar la lógica de la ruta: la ruta queda con una sola llamada tras el alta exitosa.
- Separar lo puro (armado del texto) de lo que tiene efectos (registro en la bandeja simulada).
- Dejar de usar una función «de cancelación» para registrar una confirmación, sin alterar el aviso de cancelación.
- Corregir `¡Te esperamos!` y los acentos rotos.

**Non-Goals:**
- Extraer el bloque inline del aviso de cancelación de `POST /turnos/:id/cancelar` (mismo patrón, otro pedido; se deja anotado).
- Cambiar el endpoint `GET /api/sim/whatsapp/avisos`, su forma de respuesta o `public/js/bot.js`.
- Persistir los avisos más allá de la memoria del proceso.

## Decisions

### D1. Capability: `vista-agenda` (ADDED)
El requisito hermano «Cancelación desde la agenda y aviso simulado» (C-09 / PR #18) vive en `vista-agenda`, junto a «Creación de turnos». La confirmación es su contraparte al crear desde la agenda, así que se agrega ahí. Alternativas: `bot-whatsapp` (describe la conversación iniciada por el paciente; la confirmación la dispara recepción, no el bot) y `agenda-turnos` (reglas del caso de uso `crearTurno`; meter un efecto de simulador ahí acoplaría el núcleo con el simulador, contra 08_arquitectura: «los simuladores dependen de `application/`, nunca al revés»).

### D2. Ubicación: `src/simulators/whatsapp/confirmacionTurno.ts`
Exporta:
- `mensajeConfirmacionTurno({ paciente, profesional, prestacion, inicio }): string` — **pura**: recibe nombres ya resueltos y el `Date` de inicio; no llama a `Date.now()`/`new Date()` ni toca `deps`. Formatea con el mismo `Intl.DateTimeFormat` es-AR / Buenos Aires de hoy (sin cambio de formato salvo el `¡`).
- `registrarConfirmacionTurno(deps, turno, usuario, registrar = registrarMensajeSimulado): boolean` — aplica la condición (origen `recepcion`, rol `recepcion`/`admin`, paciente con teléfono no vacío), resuelve nombres con los repositorios de `deps` (fallback a ids), arma el texto con la función pura y lo registra. Devuelve `true` si registró. **Nunca lanza**: captura cualquier error, lo informa con `console.error('No se pudo registrar la confirmación simulada:', error)` y devuelve `false`.

Por qué en `simulators/` y no en `application/`: es un efecto exclusivo del simulador de WhatsApp (bandeja en memoria, rótulo SIMULACIÓN) y ya depende de `Deps` igual que `avisosCancelacion.ts`; ponerlo en `application/agenda` haría que el núcleo conozca al simulador (dirección prohibida por 08_arquitectura). La ruta en `api/` sí puede depender del simulador (ya lo hace hoy).

La ruta queda:
```ts
registrarConfirmacionTurno(deps, resultado.valor, usuario);
res.status(201).json(resultado.valor);
```

### D3. Bandeja neutral: `src/simulators/whatsapp/bandejaSimulada.ts`
Se mueve la `WeakMap` y el contador de ids a un módulo neutral con `registrarMensajeSimulado(deps, telefono, texto)` y `consultarMensajesSimulados(deps, telefono)` (tipo `MensajeSimulado { id, texto }`). `avisosCancelacion.ts` mantiene su API pública (`AvisoCancelacion`, `registrarAvisoCancelacion`, `consultarAvisosCancelacion`) delegando en la bandeja, así `router.ts`, la ruta de cancelar y sus tests no cambian. Al compartir bandeja y contador, el orden confirmación → cancelación y los ids únicos (que `bot.js` usa para deduplicar) se preservan. Alternativa descartada: agregar `registrarMensajeSimulado` dentro de `avisosCancelacion.ts` (seguiría importándose «cancelación» desde la confirmación).

### D4. Falla del aviso sin mocks de repositorios
El parámetro `registrar` (por defecto la bandeja real) es el puerto del simulador; en el test de falla se pasa una función que lanza. No se mockea dominio ni repositorios (regla 7): se usan repos en memoria reales y `RelojFijo`. El `201` ante falla queda garantizado porque `registrarConfirmacionTurno` nunca lanza; a nivel API se verifica el camino feliz y los casos sin confirmación.

### D5. Fecha en tests
El escenario de texto exacto usa `2026-12-01T13:00:00Z` → `1/12/26, 10:00 a. m.` (verificado en Node 20 con ICU completo: espacios normales U+0020). Si otra versión de ICU usa espacios finos, el test compara normalizando `\s` → `' '`; el texto producido no se altera.

## Risks / Trade-offs

- [Toca `src/api/routes/turnos.ts`, archivo compartido] → cambio acotado al bloque de confirmación y a un import; revisión del team lead (regla 11).
- [Mover la bandeja puede romper el aviso de cancelación] → `avisosCancelacion.test.ts` corre como red de seguridad antes y después sin cambios.
- [Contador de ids a nivel módulo compartido entre apps de test] → mismo comportamiento que hoy; los ids solo necesitan ser únicos por proceso.
- [Formato de fecha dependiente de ICU] → mitigado en D5.

## Migration Plan

Sin migración de datos (todo en memoria). Rollback: revertir el commit; el contrato HTTP no cambia.

## Open Questions

- `GET /api/sim/whatsapp/contactos` devuelve teléfonos sin enmascarar (fuera de alcance; a decidir por el team lead en otro change).
- ¿Extraer también el aviso de cancelación inline de `POST /turnos/:id/cancelar` a `simulators/whatsapp/`? No cambia este spec; candidato a un change posterior.
