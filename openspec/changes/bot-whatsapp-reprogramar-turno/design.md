## Context

Para la motivación, ver `proposal.md`. Esto es lo que hay hoy en el código:

- `src/simulators/whatsapp/conversacion.ts` es una máquina de estados **pura**. No lee el reloj ni hace I/O: declara un `Efecto`, `bot.ts` lo ejecuta con los casos de uso reales y devuelve un `ResultadoEfecto` a `resolver()`. Los pasos de gestión del turno son `gestion` y `confirmarCancelacion`. `mostrarTurno()` arma las opciones de "Ver mi turno" **y** las del recordatorio (`opcionesTurno()`).
- `TurnoResumen` (lo que la conversación conoce del turno) trae `id`, `inicio`, los **nombres** de la prestación y del profesional, `estado` y `senado`. No trae ids de prestación ni de profesional.
- `bot.ts` ejecuta todo como el usuario del canal `whatsapp:<tel>` con rol `paciente`. `buscarHuecos` recorre hasta 14 días con `consultarHuecos` y se queda con los 3 primeros.
- `reprogramarTurno(deps, usuario, { turnoId, inicio, profesionalId?, sillonId? })` (C-04) valida en este orden: rol, entrada, existencia del turno, RN-AG-09, RN-AG-06 (ventana de 24 h por rol), "sin cambios" y RN-AG-01..05 excluyendo el propio turno. Después persiste, audita `reprogramar` con antes/después y emite `turnoLiberado` (`deps.eventos` es opcional; `DepsBot` no lo tiene). Conserva `senado`, `origen` y `estado` (spread del turno).
- `validarVentanaCancelacion(turno, rol, ahora)` es dominio puro (`>= 24 h` es válido).
- `public/js/bot.js` dibuja genéricamente `mensajes[]` (texto o `tarjeta`) y `opciones[]` como chips. Solo `cancelar` y `rechazar-pago` usan el estilo `danger`.

## Goals / Non-Goals

**Goals:**
- Agregar el subflujo "Cambiar horario" a la máquina de estados, reutilizando la oferta de huecos, "Ver más días" y los avisos de horario ocupado que ya existen.
- Ejecutar la reprogramación solo con `reprogramarTurno`, sin lógica de validación duplicada en el simulador.
- Verificar la ventana de 24 h **antes** de ofrecer horarios, para no hacer elegir al paciente un horario que después se rechaza.

**Non-Goals:**
- Cambiar de profesional o de prestación desde el bot. El cambio es solo de día y hora; el sillón lo decide el hueco elegido.
- Avisar a la lista de espera (C-14, stretch). `DepsBot` sigue sin `eventos`, así que el evento `turnoLiberado` no se publica desde el bot, igual que en la cancelación por WhatsApp.
- Cambios en `router.ts`, `public/bot.html` o `public/js/bot.js` (ver D6).
- Cambios en `reprogramarTurno.ts` (zona C-04).

## Decisions

### D1. Rótulo "Cambiar horario" (id `cambiar`) en lugar de "Necesito cambiarlo"
CHANGES.md (C-06) usa "Necesito cambiarlo". Elegimos "Cambiar horario" porque describe la acción (verbo + objeto, como "Pagar seña" y "Cancelar turno") y entra en un chip angosto a 390 px. **Alternativa**: "Necesito cambiarlo", que es más coloquial pero ambiguo (¿cambiar qué?). El rótulo queda fijado en el spec. Si el equipo prefiere el de CHANGES.md, se cambia solo el texto del chip. Va entre "Pagar seña" y "Cancelar turno", para que la acción destructiva quede última.

### D2. Ids de prestación y profesional en `TurnoResumen` (aditivo)
Para buscar huecos de la misma prestación y profesional, la conversación necesita sus ids. Agregamos `prestacionId` y `profesionalId` a `TurnoResumen`, que llena `resumen()` en `bot.ts`. **Alternativa**: buscar por nombre en el `Catalogo`. Es frágil (dos prestaciones con el mismo nombre) y no sirve para "Urgencia", que `tiposDeConsulta()` filtra.

### D3. Pasos nuevos y un "objetivo" en la sesión, reutilizando `horarios`
- La `Sesion` suma `objetivo?: 'reservar' | 'reprogramar'`. "Cambiar horario" pone `objetivo: 'reprogramar'`, `prestacion`/`profesional` (armados desde el `TurnoResumen`) y conserva `turno`.
- El paso `horarios`, "Ver más días" y `resolver('buscarHuecos')` (con los avisos `ocupado` y `pacienteOcupado`) se reutilizan tal cual. Solo cambia a dónde lleva elegir un hueco: con `objetivo === 'reprogramar'` va al paso nuevo `revisarCambio` ("Confirmar cambio" / "Volver atrás") en vez de `revisarHorario`.
- El mensaje "sin horarios en 14 días" distingue el objetivo: al reprogramar agrega "Tu turno sigue igual."
- `menu()` arranca con una sesión limpia, así que "Volver al menú" descarta el objetivo.
- **Alternativa**: duplicar los pasos (`horariosCambio`, etc.). Duplica la lógica de "Ver más días" y de los avisos; se descartó.

### D4. Efectos nuevos: `verificarCambio` y `reprogramar`
- `{ tipo: 'verificarCambio', turnoId }`: `bot.ts` busca el turno y aplica `validarVentanaCancelacion(turno, 'paciente', clock.ahora())`, la misma función de dominio que usa `reprogramarTurno`. Responde `{ permitido: true }` o `{ regla: 'RN-AG-06' | 'RN-AG-09' | 'no-encontrado' }`. Si está permitido, `resolver` declara `buscarHuecos` con los ids del turno.
- `{ tipo: 'reprogramar', turnoId, inicio, sillonId }`: `bot.ts` llama a `reprogramarTurno(deps, usuarioBot, { turnoId, inicio, sillonId })` **sin** `profesionalId` (queda el del turno) y devuelve `{ turno: TurnoResumen }` o `{ regla }`.
- La verificación previa es solo para la UX. La autoridad sigue siendo `reprogramarTurno`, que vuelve a validar RN-AG-06/09 al confirmar (escenario "El turno se cancela antes de confirmar el cambio").
- **Alternativa**: no verificar antes y dejar que falle al confirmar. Le hace elegir un horario a un paciente que no puede cambiar; se descartó.
- `DepsBot` no necesita repositorios nuevos: `reprogramarTurno` usa `turnos`, `profesionales`, `sillones`, `prestaciones`, `bloqueos`, `clock` y `auditoria`, que ya están en el `Pick`.

### D5. Cómo se traduce cada resultado de `reprogramar`

| Resultado | Respuesta del bot | Paso |
|---|---|---|
| ok | Tarjeta "Turno reprogramado" (nuevo horario · prestación · profesional · "Seña pagada" si corresponde · "Liberamos tu horario anterior (<antes>)."). Opción "Volver al menú" | `fin` |
| `RN-AG-02`, `RN-AG-03`, `RN-AG-01`, `RN-AG-04` | `aviso: 'ocupado'` → `buscarHuecos` desde `fechaMostrada` | `horarios` |
| `RN-AG-05` | `aviso: 'pacienteOcupado'` → `buscarHuecos` | `horarios` |
| `RN-AG-06` | "Faltan menos de 24 h para tu turno: para cambiarlo comunicate con recepción." | `fin` |
| `RN-AG-09`, `no-encontrado`, `entrada`, `permiso` | "No pude cambiar el turno. Comunicate con recepción." | `fin` |

Es el mismo criterio que `resolver('reservar')`: toda regla de agenda distinta de RN-AG-05 se trata como "ese horario ya se ocupó".

### D6. Pantalla sin cambios de código
`bot.js` ya dibuja tarjetas y chips genéricos, y "Cambiar horario" no es destructivo (no va en `PELIGRO`). Por eso `public/bot.html` y `public/js/bot.js` no cambian. El cambio visual es de **contenido** del chat (chip nuevo, resumen antes/ahora, tarjeta "Turno reprogramado") y se documenta en `mockups/bot-reprogramar.html` (`Approval: pending`). Si la revisión del mockup pide un estilo nuevo, se vuelve a Propose.

### D7. Textos con el formato actual
Los horarios usan `etiquetaHorario()` ("Lun 30/11 09:30", "Mar 1/12 10:00"), igual que el resto del bot.

## Risks / Trade-offs

- [Carrera entre la verificación previa y la confirmación (el reloj avanza o recepción cancela)] → `reprogramarTurno` revalida todo al confirmar; los escenarios de error lo cubren.
- [El paciente elige un hueco que se superpone con su turno actual (mismo profesional)] → No puede pasar: `consultarHuecos` ya cuenta el turno actual como ocupado. Si el nuevo horario coincide con el actual, el caso de uso responde `entrada` ("igual al actual") y el bot deriva a recepción.
- [Se puede mover el turno a un hueco a menos de 24 h desde ahora] → Es lo que permite hoy RN-AG-08 (la ventana se mide sobre el turno **actual**). Queda como supuesto; ver Open Questions.
- [Cambian tests existentes que fijan "las 3 opciones" de "Ver mi turno" y del recordatorio] → Se actualizan en el mismo change, dentro de la zona C-06.
- [Zona de un compañero] → `src/simulators/whatsapp/*` y `tests/simulators/whatsapp/*` son de la zona C-06 (Integrante 2). **El team lead y el Integrante 2 deben revisar el PR**. El cambio es aditivo: se agregan pasos, efectos y opciones; `crearTurno`, `cancelarTurno` y el contrato de la API no cambian.

## Migration Plan

No hay datos persistentes: las sesiones del bot viven en memoria. Una sesión iniciada antes del deploy simplemente no tendrá `objetivo`, que vale `reservar` por omisión. Rollback: revertir el PR.

## Open Questions

- ¿El nuevo horario también debería estar a 24 h o más del momento actual? Hoy RN-AG-08 no lo exige y el spec sigue a la KB. Si el equipo lo quiere, es una regla nueva de C-04 y no de este change.
- Rótulo definitivo del chip ("Cambiar horario" o "Necesito cambiarlo"): no cambia el comportamiento. Se decide en la revisión del mockup.
