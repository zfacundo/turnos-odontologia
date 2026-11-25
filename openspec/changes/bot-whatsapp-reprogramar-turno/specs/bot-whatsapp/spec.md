## MODIFIED Requirements

### Requirement: Ver mi turno
Al elegir "Ver mi turno", el bot SHALL mostrar el próximo turno activo (reservado o confirmado, con inicio posterior al reloj) del paciente del teléfono, indicando si la seña está pagada, con las opciones "Confirmo", "Pagar seña" (solo si el turno no está señado), "Cambiar horario" y "Cancelar turno", en ese orden. Si no hay turnos, SHALL informarlo y ofrecer "Pedir un turno".

#### Scenario: Muestra el próximo turno sin seña
- **GIVEN** `pac-01` tiene un turno reservado y sin seña el martes `2026-12-01` a las `10:00`
- **WHEN** desde `+54 9 11 0000-0001` elige "Ver mi turno"
- **THEN** el bot muestra ese turno y exactamente las opciones "Confirmo", "Pagar seña", "Cambiar horario" y "Cancelar turno"

#### Scenario: Turno señado no ofrece pagar
- **GIVEN** el turno del martes de `pac-01` tiene `senado` `true`
- **WHEN** desde `+54 9 11 0000-0001` elige "Ver mi turno"
- **THEN** el bot indica "Seña pagada" y ofrece exactamente "Confirmo", "Cambiar horario" y "Cancelar turno"

#### Scenario: Sin turnos
- **WHEN** desde `+54 9 11 0000-0099` elige "Ver mi turno"
- **THEN** el bot informa que no encontró turnos próximos para ese número y ofrece "Pedir un turno"

### Requirement: Recordatorio de demostración
`POST /api/sim/whatsapp/recordatorio` SHALL enviar al teléfono el recordatorio de su próximo turno activo ("te recordamos tu turno … ¿Confirmás tu asistencia?") con las opciones de "Ver mi turno", incluida "Cambiar horario" (RN-WA-03: Confirmar / Cambiar / Cancelar).

#### Scenario: Recordatorio con opciones
- **GIVEN** `pac-01` tiene un turno reservado y sin seña el martes a las `10:00`
- **WHEN** se envía el recordatorio a `+54 9 11 0000-0001`
- **THEN** el bot escribe el recordatorio con fecha, hora y profesional y ofrece "Confirmo", "Pagar seña", "Cambiar horario" y "Cancelar turno"

#### Scenario: Recordatorio sin turnos
- **WHEN** se envía el recordatorio a `+54 9 11 0000-0099`
- **THEN** el bot informa que no hay turnos próximos para ese número

## ADDED Requirements

### Requirement: Cambiar el horario del turno desde el bot
"Cambiar horario" SHALL permitir que el paciente mueva su turno a otro hueco libre con la **misma prestación y el mismo profesional**, usando el mismo caso de uso de reprogramación que recepción, con el usuario del canal y rol paciente (RN-WA-02, RN-AG-08). El flujo es este:

1. Si faltan menos de 24 h para el inicio del turno, el bot MUST responder "Faltan menos de 24 h para tu turno: para cambiarlo comunicate con recepción.", MUST NOT ofrecer horarios y el turno MUST NOT cambiar (RN-AG-06).
2. Si no, el bot SHALL ofrecer exactamente los primeros 3 huecos de la consulta de disponibilidad para esa prestación y ese profesional, desde la fecha del reloj y buscando hasta 14 días, más "Ver más días", igual que al pedir un turno (RN-WA-01).
3. Al elegir un horario, el bot SHALL mostrar un resumen con el horario actual y el nuevo, y las opciones "Confirmar cambio" y "Volver atrás". "Volver atrás" vuelve a mostrar los mismos horarios.
4. "Confirmar cambio" SHALL reprogramar el **mismo** turno: mismo id, paciente, prestación, profesional, estado, origen y seña. El horario anterior queda libre. El bot responde con la tarjeta "Turno reprogramado" (nuevo día y hora, prestación y profesional, y una línea que dice que el horario anterior quedó liberado) y la opción "Volver al menú".
5. Si al confirmar el horario ya está ocupado (RN-AG-02/RN-AG-03), el bot MUST avisar "Ese horario ya se ocupó. Te muestro otros:" y volver a ofrecer horarios del mismo día. Si el paciente ya tiene otro turno a esa hora (RN-AG-05), MUST avisar "Ya tenés otro turno a esa hora. Elegí otro horario:" y volver a ofrecer. En ningún caso el turno cambia ni se crea otro.
6. Si al confirmar el turno ya no está activo (RN-AG-09) o quedó dentro de las 24 h (RN-AG-06), el bot MUST derivar a recepción y el turno MUST NOT cambiar.

Las respuestas SHALL mantener el contrato de la API simulada (`simulado: true` y el aviso "Simulación — no es WhatsApp real") y el flujo MUST NOT hacer llamadas de red salientes (RN-SM-04).

#### Scenario: Cambio de horario exitoso
- **GIVEN** `pac-01` tiene un turno reservado de "Control y limpieza" con `prof-1` el martes `2026-12-01` a las `10:00` en `sillon-1`, y el reloj está en el lunes `2026-11-30 09:00`
- **WHEN** desde `+54 9 11 0000-0001` elige "Ver mi turno", "Cambiar horario", "Lun 30/11 09:30" y "Confirmar cambio"
- **THEN** `GET /api/turnos` muestra **el mismo** turno (mismo id) de `pac-01` con `prof-1` y "Control y limpieza" de `09:30` a `10:00` del lunes, en estado `reservado` y con `origen` sin cambiar; no hay otro turno de `pac-01`; y el bot muestra la tarjeta "Turno reprogramado" con "Lun 30/11 09:30", "Control y limpieza · Dra. Ficticia Perez" y el aviso de que "Mar 1/12 10:00" quedó liberado, con la opción "Volver al menú"

#### Scenario: Se ofrecen huecos de la misma prestación y profesional
- **GIVEN** `pac-01` tiene un turno reservado de "Control y limpieza" con `prof-1` el martes `2026-12-01` a las `10:00` y el reloj está en el lunes `2026-11-30 09:00`
- **WHEN** elige "Ver mi turno" y "Cambiar horario"
- **THEN** las opciones de horario son "Lun 30/11 09:00", "Lun 30/11 09:15" y "Lun 30/11 09:30", seguidas de "Ver más días", y son las 3 primeras que devuelve la consulta de disponibilidad de "Control y limpieza" con `prof-1` para el lunes

#### Scenario: Resumen antes de confirmar y volver atrás
- **GIVEN** el bot está ofreciendo horarios para cambiar el turno del martes `10:00` de `pac-01`
- **WHEN** el paciente elige "Lun 30/11 09:30"
- **THEN** el bot muestra el horario actual "Mar 1/12 10:00" y el nuevo "Lun 30/11 09:30 · Control y limpieza · Dra. Ficticia Perez", y ofrece exactamente "Confirmar cambio" y "Volver atrás"; si después elige "Volver atrás", vuelve a ofrecer los mismos horarios y el turno sigue a las `10:00` del martes

#### Scenario: El horario anterior queda libre
- **GIVEN** `pac-01` cambió desde el bot su turno del martes `2026-12-01 10:00` con `prof-1` al lunes `2026-11-30 09:30`
- **WHEN** recepción crea un turno de otro paciente con `prof-1` en `sillon-1` el martes a las `10:00`
- **THEN** la creación es exitosa (`201`)

#### Scenario: Turno señado conserva la seña
- **GIVEN** `pac-01` tiene el turno del martes `10:00` con `senado` `true`
- **WHEN** lo cambia desde el bot a "Lun 30/11 09:30"
- **THEN** el turno reprogramado sigue con `senado` `true` y la tarjeta "Turno reprogramado" indica "Seña pagada"

#### Scenario: Menos de 24 h deriva a recepción y no ofrece horarios
- **GIVEN** `pac-01` tiene un turno reservado el lunes `2026-11-30` a las `15:00` y el reloj está en el lunes a las `09:00`
- **WHEN** elige "Ver mi turno" y "Cambiar horario"
- **THEN** el bot responde "Faltan menos de 24 h para tu turno: para cambiarlo comunicate con recepción.", no ofrece horarios, ofrece "Volver al menú" y el turno sigue el lunes a las `15:00`

#### Scenario: Justo 24 h antes se permite cambiar
- **GIVEN** `pac-01` tiene un turno reservado el martes `2026-12-01` a las `09:00` y el reloj está en el lunes `2026-11-30` a las `09:00`
- **WHEN** elige "Ver mi turno" y "Cambiar horario"
- **THEN** el bot ofrece horarios para cambiar el turno (la ventana permite exactamente 24 h de anticipación)

#### Scenario: Horario tomado entre medio
- **GIVEN** el bot ofrece "Lun 30/11 09:30" para cambiar el turno del martes `10:00` de `pac-01`, y antes de que confirme recepción crea un turno de otro paciente con `prof-1` de `09:30` a `10:00` del lunes
- **WHEN** el paciente elige "Lun 30/11 09:30" y "Confirmar cambio"
- **THEN** el bot responde "Ese horario ya se ocupó. Te muestro otros:", ofrece horarios del lunes que no incluyen "Lun 30/11 09:30", y el turno de `pac-01` sigue el martes a las `10:00`

#### Scenario: El paciente ya tiene otro turno a esa hora
- **GIVEN** `pac-01` tiene el turno del martes `10:00` con `prof-1` y otro turno con `prof-2` el lunes de `09:30` a `10:00`
- **WHEN** desde el bot elige cambiar el turno del martes a "Lun 30/11 09:30" con "Dra. Ficticia Perez" y "Confirmar cambio"
- **THEN** el bot responde "Ya tenés otro turno a esa hora. Elegí otro horario:", vuelve a ofrecer horarios y el turno del martes no cambia

#### Scenario: El turno se cancela antes de confirmar el cambio
- **GIVEN** el bot muestra el resumen para cambiar el turno del martes `10:00` de `pac-01` y, antes de que confirme, recepción cancela ese turno
- **WHEN** el paciente elige "Confirmar cambio"
- **THEN** el bot responde que no pudo cambiar el turno y que se comunique con recepción, ofrece "Volver al menú" y el turno sigue `cancelado` a las `10:00` del martes

#### Scenario: Sin horarios para cambiar en 14 días
- **GIVEN** el profesional del turno de `pac-01` no tiene huecos libres en los próximos 14 días
- **WHEN** elige "Cambiar horario"
- **THEN** el bot informa que no hay horarios libres en las próximas 2 semanas, que su turno sigue igual, y ofrece "Volver al menú"

#### Scenario: Ver más días al cambiar
- **GIVEN** el bot ofrece horarios del lunes 30/11 para cambiar el turno de `pac-01`
- **WHEN** el paciente elige "Ver más días"
- **THEN** las opciones son los primeros 3 huecos del martes 1/12 que devuelve la consulta de disponibilidad de "Control y limpieza" con `prof-1` (que ya tiene en cuenta el turno actual de las `10:00`), más "Ver más días"

#### Scenario: Respuesta del cambio rotulada como simulación
- **WHEN** el paciente `+54 9 11 0000-0001` elige "Confirmar cambio" en `POST /api/sim/whatsapp/mensaje`
- **THEN** la respuesta es `200` con `simulado: true` y `aviso` "Simulación — no es WhatsApp real", y el módulo del simulador sigue sin importar `http`, `https` ni `net` y sin usar `fetch`

#### Scenario: Reprogramación auditada como paciente por WhatsApp
- **GIVEN** `pac-01` confirmó el cambio de su turno desde el bot
- **WHEN** recepción consulta `GET /api/auditoria`
- **THEN** hay un evento `reprogramar` del turno con `rol` `paciente` y un `usuarioId` del canal WhatsApp simulado
