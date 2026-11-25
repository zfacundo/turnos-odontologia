# Design

## Context

Motivación en proposal.md (Why). Estado actual:

- El bot (C-06, archivado) separa `conversacion.ts` (máquina de estados pura que declara efectos) de `bot.ts` (ejecuta los efectos con los casos de uso). El router guarda sesiones por teléfono y, desde el PR #18, también expone `GET /sim/whatsapp/avisos` (avisos de cancelación de C-09), que este change no toca.
- C-11 expone `pagarSena(deps, usuario, { turnoId, resultado })`: solo rol `paciente`, valida RN-SM-01 (turno reservado/confirmado y no señado), marca `senado: true` si aprueba, guarda el intento en un `PagoSenaRepository` y lo audita. El monto ficticio es `MONTO_SENA_SIMULADA` (5000) en `pagoSena.ts`, que es puro.
- C-08 expone `consultarAfiliado(padron, nro)` sobre `PadronObraSocialEnMemoria` (padrón estático `AF-0001..0004`; `AF-0004` es la falla simulada RN-SM-02).
- La agenda (C-09, `public/js/agenda.js`) arma el texto de cada tarjeta con ícono 💬 para `origen: whatsapp`, pero no muestra `senado`.

## Goals / Non-Goals

**Goals:**
- Mantener `conversacion.ts` puro: seña y obra social se agregan como efectos nuevos (`pagarSena`, `consultarObraSocial`).
- Llamar a `pagarSena` y `consultarAfiliado` sin modificarlos (Zonas de C-11 y C-08).

**Non-Goals:**
- Reprogramar desde el bot (se quita "Necesito cambiarlo").
- Asociar el número de afiliado a la ficha del paciente o usar la cobertura para calcular precios.
- Compartir el historial de pagos entre el bot y la pantalla de Mercado Pago (ver D4).

## Decisions

### D1. Paso `revisarHorario` antes de reservar
Elegir `hueco:<n>` ya no declara `identificarPorTelefono`: guarda `elegido` y responde con el resumen y las opciones `reservar` ("Confirmar turno") y `atras` ("Volver atrás"). `reservar` declara `identificarPorTelefono` y sigue el flujo de C-06. `atras` vuelve a mostrar `sesion.huecos` con una función pura `mostrarHorarios`, sin volver a consultar la agenda; si el horario se ocupó mientras tanto, el 409 de la reserva ya lo resuelve (re-oferta del mismo día).
- **Alternativa descartada**: recalcular huecos al volver atrás. Agrega un efecto sin beneficio visible: la reserva igual valida contra la agenda.
- Ids nuevos (`reservar`, `atras`) para no chocar con `confirmar` ("Confirmo" de la gestión).

### D2. Seña como efecto `pagarSena`
- Pasos nuevos: `ofrecerSena` (después de reservar o tras un rechazo: "Pagar seña" / "Volver al menú") y `pagoSena` (pantalla simulada con `aprobar-pago`, `rechazar-pago` y "Volver al menú").
- `sena` ("Pagar seña") desde `ofrecerSena` o desde `gestion` pasa a `pagoSena` con el texto "Mercado Pago (SIMULACIÓN) · Seña: $5.000 (monto ficticio)". El monto se importa de `mercadopago/pagoSena.ts` (puro, sin I/O).
- `aprobar-pago` / `rechazar-pago` declaran `{ tipo: 'pagarSena', turnoId, resultado }`. `bot.ts` llama a `pagarSena` con el usuario simulado del bot (rol `paciente`, design D5 de C-06).
- Resultado → respuesta: aprobado → tarjeta "Seña pagada" (horario, monto, "Mercado Pago · simulación") y paso `fin`; rechazado → "El pago fue rechazado (simulación). Tu turno sigue reservado, sin seña." y paso `ofrecerSena`; RN-SM-01 → "Este turno ya tiene la seña pagada." y `fin`.

### D3. Gestión sin "Necesito cambiarlo"
- La opción del menú pasa a `ver` "Ver mi turno". `TurnoResumen` suma `senado`.
- Opciones de `gestion`: "Confirmo", "Pagar seña" solo si `!senado`, y "Cancelar turno". Si está señado, el texto del turno agrega "Seña pagada".
- La opción `cambiar` se elimina; si llega, cae en "No entendí" como cualquier id desconocido.

### D4. Dependencias de los simuladores en el bot
`procesar(deps, telefono, sesion, entrada, sims)` recibe `sims: { pagos: PagoSenaRepository; padron: PadronObraSocialRepository }`. `whatsappRouter(deps, sesiones, sims)` crea por defecto un `PagoSenaRepositoryEnMemoria` propio y un `PadronObraSocialEnMemoria`, sin tocar `Deps` ni `app.ts`.
- La marca `senado` vive en el `TurnoRepository` compartido, así que la agenda y la pantalla de Mercado Pago ven el turno señado. Lo que no se comparte es el historial de intentos de pago; la auditoría (`sena_aprobada`/`sena_rechazada`) sí queda en el registro común.
- **Alternativa descartada**: crear un único repositorio de pagos en `app.ts` y pasarlo a ambos routers. Requiere tocar la firma del montaje de C-11; queda como mejora si el equipo lo pide.

### D5. Obra social como efecto `consultarObraSocial`
- `os` ("Consultar mi obra social") pasa al paso `afiliado` con `pideTexto: true` y la opción "Volver al menú". El texto se normaliza (`trim` + mayúsculas) y declara `{ tipo: 'consultarObraSocial', nro }`.
- `bot.ts` llama a `consultarAfiliado(sims.padron, nro)` y devuelve `afiliado` o `error: 'no-encontrado' | 'falla'`.
- Éxito → tarjeta "Tu cobertura (simulación)" con "Obra social", "Plan", "Cobertura: 80%", "Copago: 20%" y "Estado: activo" (el estado se muestra con espacios: `con_copago` → "con copago"); opciones "Pedir un turno" y "Volver al menú". No encontrado → re-pregunta en `afiliado`. Falla → `fin` con "El padrón de obras sociales no respondió (falla simulada)."
- "hola"/"menú" siguen ganando sobre el texto libre, como en el paso `datos`.

### D6. Marca en la agenda
Una línea aditiva en `public/js/agenda.js`: si `turno.senado`, se agrega " · Seña pagada" a la tercera línea de la tarjeta. Es Zona de C-09: va en el PR con aviso al team lead.

### D7. Pantalla del bot
`public/js/bot.js` pinta como `chip danger` también "Rechazar pago (simulación)", y como alerta el texto del rechazo y de la falla del padrón. El resto del contrato de la API no cambia.

## UI Mockups

- Design system revision: 1
- Decision: yes, 2026-11-25
- Mockups: `openspec/changes/bot-whatsapp-sena-y-obra-social/mockups/`
- Approval: approved (2026-11-25, by user)
- Preview: rendered (2026-11-25, `mockups/previews/bot-{sena,obra-social}-{390,1440}.png`)
- Visual verify: differences (2026-11-25), solo de prioridad **minor**. Probado en el panel del navegador con `SIM_NOW=2026-11-30T09:00-03:00` (tsx, puerto 3100). Capturas en `mockups/verify/` (`bot-390x844.png`, `bot-1440x900.png`: estado inicial; `agenda-sena-1440x900.png`: tarjeta señada en la agenda).
  - Recorrido revisado desde `+54 9 11 0000-0001`: horario → "Volver atrás" → otro horario → "Confirmar turno" → "Pagar seña" → rechazado → reintento → aprobado ("Seña pagada"), y después "Ver mi turno" con "Seña pagada" y solo "Confirmo" / "Cancelar turno". Desde `+54 9 11 0000-0099`: menú con 3 opciones, `AF-9999` (re-pregunta), ` af-0001 ` (tarjeta de cobertura) y `AF-0004` (falla simulada). `GET /api/turnos` devolvió el turno con `origen: whatsapp` y `senado: true`; el registro del sistema mostró `sena_rechazada` y `sena_aprobada`. Sin errores de consola.
  - Minor 1: en la agenda, "Seña pagada" es texto plano al final de la tercera línea y no la pastilla del mockup, porque la tarjeta de C-09 se arma con `textContent`.
  - Minor 2: la tarjeta de cobertura no muestra la línea "Padrón ficticio: no se consultó ninguna obra social real." porque `bot.js` pinta solo la tarjeta cuando un mensaje la trae. El título dice "(simulación)" y la franja de simulación sigue visible.
  - Minors heredados de C-06: sin logo en el encabezado, hora de las burbujas con el reloj del navegador y chat con alto máximo.

## Risks / Trade-offs

- [Riesgo] Dos repositorios de pagos (bot y pantalla de Mercado Pago) → la marca `senado` es compartida y RN-SM-01 impide doble seña; solo el historial queda separado (D4).
- [Riesgo] El recordatorio y "Ver mi turno" cambian sus opciones → los tests de C-06 que esperan "Necesito cambiarlo" se actualizan en este change (comportamiento eliminado a pedido).
- [Trade-off] Tocar `agenda.js` (Zona de C-09) → cambio de una línea, aditivo, declarado en el PR.

## Migration Plan

No aplica: sin datos persistidos. El rollback es revertir el PR.
