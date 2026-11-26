# Tasks

> Strict TDD: cada tarea de código sigue RED → GREEN → TRIANGULATE → REFACTOR. Los tests se escriben primero (con la herramienta Write) y se verifica que fallen. Nombres «dado … cuando … entonces …», datos ficticios del seed (`cargarSeed(new RelojFijo(new Date('2026-11-30T09:00:00-03:00')))`), repositorios en memoria reales, sin mocks de dominio ni repos. Un test por escenario como mínimo.
>
> Governance: **B = MEDIUM** (implementar con checkpoints). **A = HIGH** (privacidad / contrato de API de otra zona): **no aplicar los grupos 4-6 hasta que el team lead apruebe Q-1** en `design.md`. Prerrequisito: `confirmacion-turno-whatsapp` commiteado/mergeado.

## 1. Red de seguridad

- [x] 1.1 Verificar que el trabajo de `confirmacion-turno-whatsapp` está commiteado (bandeja, `turnos.ts`, `bot.js`); si no, frenar y reportarlo — **no está commiteado; el team lead (2026-11-26) aceptó construir sobre el árbol de trabajo sin commitear. Q-1 aprobada (opción 1).**
- [x] 1.2 Correr `npx vitest run` y registrar la línea base (hoy 1309 en verde); si algo falla, frenar y reportarlo como falla preexistente — confirmado 1309/1309
- [x] 1.3 Correr `npm run typecheck` sin errores antes de tocar código

## 2. B — Mensaje de cancelación puro

- [x] 2.1 RED: en `tests/simulators/whatsapp/cancelacionTurno.test.ts`, test del escenario «Texto exacto del aviso con hora de Buenos Aires» para `mensajeCancelacionTurno({ paciente, profesional, inicio })` (inicio `2026-12-01T13:00:00Z`, espacios normalizados); verificar que falla porque el módulo no existe
- [x] 2.2 GREEN: crear `src/simulators/whatsapp/cancelacionTurno.ts` con `mensajeCancelacionTurno` pura (sin `Date.now()`/`new Date()`, `Intl.DateTimeFormat` es-AR, `America/Argentina/Buenos_Aires`), con el texto copiado literal de la ruta actual; verificar que pasa
- [x] 2.3 TRIANGULATE: escenario «Acentos correctos en el aviso» (otro paciente/fecha: empieza con `Hola, <paciente>.`, termina con `comunicate con recepción.`, no contiene `recepci?n`) y un inicio a las 01:00Z que cae el día anterior en Buenos Aires; verificar que pasan

## 3. B — Registro del aviso y ruta de una línea

- [x] 3.1 RED: tests de `registrarAvisoCancelacionTurno(deps, turno, registrar?)` con un turno de `pac-01` creado y cancelado con `crearTurno` / `cancelarTurno` reales: registra el texto exacto en `+54 9 11 0000-0001` (vía `consultarMensajesSimulados`) y devuelve `true`; verificar que falla
- [x] 3.2 GREEN: implementar `registrarAvisoCancelacionTurno` (condición: paciente con teléfono no vacío; profesional con fallback a id; `registrarMensajeSimulado` por defecto; `try/catch` con `console.error('No se pudo registrar el aviso simulado:', error)`); verificar que pasa
- [x] 3.3 TRIANGULATE: «Profesional inexistente en el aviso» (texto con el id); «Paciente sin teléfono al cancelar» (paciente guardado con `telefono: ''` → `false`, nada registrado); «Falla al registrar el aviso de cancelación» (`registrar` que lanza → no propaga, `false`, el turno sigue `cancelado` en el repo); verificar que pasan
- [x] 3.4 RED: en `tests/api/aviso-cancelacion-whatsapp.test.ts` (supertest), escenario «Cancelación por API con aviso exacto» (recepción crea y cancela un turno de `pac-01` con inicio `2026-12-01T13:00:00Z` y `prof-1`; `/avisos` incluye el texto exacto); verificar que pasa ya con el código inline (caracterización) y dejarlo como red para el refactor
- [x] 3.5 REFACTOR: en `src/api/routes/turnos.ts` reemplazar el bloque inline por `registrarAvisoCancelacionTurno(deps, resultado.valor.turno);` antes del `200`; quitar el import de `registrarAvisoCancelacion` si queda sin uso; verificar que 3.4, `tests/simulators/whatsapp/avisosCancelacion.test.ts` y `tests/api/confirmacion-turno-whatsapp.test.ts` siguen verdes sin modificarlos
- [x] 3.6 Checkpoint MEDIUM: `npx vitest run` + `npm run typecheck` en verde; informar al orquestador antes de seguir con A

## 4. A — Contacto público y resolución del teléfono (requiere Q-1 aprobada)

- [x] 4.1 RED: en `tests/simulators/whatsapp/contactoSimulado.test.ts`, `contactoPublico` de `pac-01` → `{ id: 'pac-01', nombre: 'Paciente Ficticio Uno', telefonoEnmascarado: '+54 9 11 0000-**01' }` sin propiedad `telefono`; verificar que falla
- [x] 4.2 GREEN: crear `src/simulators/whatsapp/contactoSimulado.ts` con `contactoPublico` usando `pacientePublico(p).telefono`; verificar que pasa
- [x] 4.3 RED → GREEN: `resolverTelefono(deps, fuente)`: `{ pacienteId: 'pac-01' }` → `+54 9 11 0000-0001`; `{ telefono: '+54 9 11 0000-0099' }` → ese teléfono; ambos, ninguno, `pac-inexistente`, paciente con `telefono: ''` o teléfono con formato real → `ErrorDeEntrada`; verificar que pasan

## 5. A — Endpoints del simulador

- [x] 5.1 RED: en `tests/simulators/whatsapp/contactos.test.ts` (supertest), escenario «Contactos sin teléfono completo» (cuerpo sin `+54 9 11 0000-0001`, sin propiedad `telefono`, `simulado: true`); verificar que falla
- [x] 5.2 GREEN: `GET /sim/whatsapp/contactos` mapea con `contactoPublico`; verificar que pasa
- [x] 5.3 RED: tests de «Chat identificado por paciente», «Paciente identificado por id», «Misma conversación por paciente o por teléfono», «Recordatorio identificado por paciente», «Avisos identificados por paciente» (incluye `pac-02` sin el aviso), «Identificación inválida» y «Teléfono y paciente a la vez» en los tres endpoints; verificar que fallan
- [x] 5.4 GREEN: el router usa `resolverTelefono` en mensaje, recordatorio y avisos (para avisos, sobre `req.query`); verificar que pasan y que `tests/simulators/whatsapp/api.test.ts` y `avisosCancelacion.test.ts` siguen verdes sin cambios
- [x] 5.5 REFACTOR: quitar `telefonoDe` y la validación inline de `/avisos` si quedan sin uso; tests en verde

## 6. A — Pantalla del bot

- [x] 6.1 RED: en `tests/simulators/whatsapp/pantalla.test.ts`, escenario «Pantalla del bot sin teléfonos completos»: el JS arma la opción con `paciente.telefonoEnmascarado + ' · ' + paciente.nombre` y valor `paciente.id`, y envía `pacienteId` en mensaje, recordatorio y `/avisos?pacienteId=`; ajustar **solo** la aserción existente `paciente.telefono + ' · ' + paciente.nombre` (cambia por spec); verificar que falla
- [x] 6.2 GREEN: actualizar `public/js/bot.js` (valor por id, texto enmascarado, comparación por id, `pacienteId` en `enviar`, recordatorio y `consultarAvisos`, cabecera con el texto enmascarado) conservando el separador ` · ` sin caracteres rotos; verificar que pasa
- [x] 6.3 Verificar con `git grep -n "paciente.telefono\|?telefono=" public/js/bot.js` que no quedan usos del teléfono completo

## 7. Verificación integral y entrega

- [x] 7.1 `npx vitest run` (línea base + nuevos, todo verde) y `npm run typecheck` sin errores; `git grep -n "recepci?n\|' ? '" src public tests` sin resultados
- [x] 7.2 Verificación manual en navegador (la hace el orquestador) con `npm run dev` y seed: en `/bot.html` el selector muestra `+54 9 11 0000-**01 · Paciente Ficticio Uno` (sin teléfonos completos; revisar también la respuesta de `/api/sim/whatsapp/contactos` en la pestaña de red); elegir un contacto, chatear y reservar, «Enviar recordatorio 24 h»; desde el panel como recepción cancelar ese turno y ver en el bot la burbuja «… fue cancelado. Para solicitar otro turno, comunicate con recepción.»; otro contacto no ve el aviso **Verificado 2026-11-26 (team lead)** con `SIM_NOW=2026-12-01T08:00:00-03:00` en el navegador integrado:
  - `/api/sim/whatsapp/contactos` devuelve `{ id, nombre, telefonoEnmascarado }` sin teléfonos completos, y el HTML del bot tampoco los contiene.
  - Selector y cabecera: "+54 9 11 0000-**01 · Paciente Ficticio Uno"; el valor de la opción es `pac-01`.
  - Por chat se reservó el turno Mar 1/12 09:00, Control y limpieza, Dra. Ficticia Perez. El recordatorio 24 h respondió con ese turno. El sondeo es `/avisos?pacienteId=pac-01` y `mensaje`/`recordatorio` envían `{ pacienteId }`.
  - Desde el panel, como recepción, se canceló ese turno y en el bot apareció "Hola, Paciente Ficticio Uno. Te informamos que tu turno del 1/12/26, 9:00 a. m. con Dra. Ficticia Perez fue cancelado. Para solicitar otro turno, comunicate con recepción.". No hubo confirmación de alta porque el turno tenía origen WhatsApp, como dice la spec de `confirmacion-turno-whatsapp`.
  - Al cambiar a `pac-02`, el chat se reinició sin avisos.
  - Consola: solo un 401 del panel al restaurar una sesión de antes del reinicio del servidor, ajeno a este change.
- [x] 7.3 Escribir el handoff `knowledge-base/entrega/whatsapp-contactos-y-aviso-cancelacion.md`: qué se hizo (A y B), decisión de Q-1 y quién la aprobó, archivos compartidos tocados (`turnos.ts`, `router.ts`, `bot.js`), contrato nuevo de `/contactos`, cómo se verificó y preguntas abiertas (Q-2, Q-3)

## Workflow follow-up

- PR con la plantilla `.github/pull_request_template.md`, revisión del team lead e Integrantes 2/4, merge.
- Archivar el change con `/opsx:archive` después del merge.
