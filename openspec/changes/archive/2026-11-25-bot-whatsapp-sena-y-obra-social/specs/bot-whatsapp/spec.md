## MODIFIED Requirements

### Requirement: Menú inicial
El bot SHALL responder a cualquier mensaje de un teléfono sin conversación activa, y a los textos "hola" o "menú" en cualquier momento, con un saludo y las opciones "Pedir un turno", "Ver mi turno" y "Consultar mi obra social".

#### Scenario: Primer mensaje muestra el menú
- **WHEN** el paciente `+54 9 11 0000-0001` escribe "Hola! Quería sacar un turno"
- **THEN** el bot responde con un saludo y exactamente las opciones "Pedir un turno", "Ver mi turno" y "Consultar mi obra social"

#### Scenario: "menú" vuelve al inicio desde cualquier paso
- **GIVEN** una conversación que está mostrando horarios
- **WHEN** el paciente escribe "menú"
- **THEN** el bot vuelve a mostrar el menú inicial

### Requirement: Identificación del paciente
Después de que el paciente confirma el horario, si el teléfono pertenece a un paciente el bot SHALL reservar a su nombre sin pedir datos. Si no, SHALL pedir nombre completo y DNI, reusar al paciente con ese DNI si existe o registrarlo con el teléfono de la conversación, y volver a pedir los datos si no son válidos.

#### Scenario: Teléfono conocido no pide datos
- **GIVEN** el paciente `+54 9 11 0000-0001` eligió "Lun 30/11 09:00"
- **WHEN** elige "Confirmar turno"
- **THEN** el bot reserva a nombre de "Paciente Ficticio Uno" sin pedir nombre ni DNI

#### Scenario: Teléfono nuevo pide nombre y DNI
- **GIVEN** el paciente `+54 9 11 0000-0099` eligió "Lun 30/11 09:00"
- **WHEN** elige "Confirmar turno"
- **THEN** el bot pide nombre completo y DNI y habilita el ingreso de texto

#### Scenario: Paciente nuevo queda registrado
- **GIVEN** el bot pidió nombre y DNI al teléfono `+54 9 11 0000-0099`
- **WHEN** el paciente escribe "Paciente Ficticio Once, 99.000.011"
- **THEN** existe un paciente con DNI `99000011`, nombre "Paciente Ficticio Once" y teléfono `+54 9 11 0000-0099`, y el turno se reserva a su nombre

#### Scenario: DNI existente se reusa
- **GIVEN** el bot pidió nombre y DNI al teléfono `+54 9 11 0000-0099`
- **WHEN** el paciente escribe "Paciente Ficticio Dos, 99000002"
- **THEN** el turno se reserva a nombre del paciente `pac-02` y no se registra un paciente nuevo

#### Scenario: Datos inválidos vuelven a pedirse
- **GIVEN** el bot pidió nombre y DNI
- **WHEN** el paciente escribe "Juan 12345678"
- **THEN** el bot explica el formato esperado, vuelve a pedir los datos y no reserva ningún turno

### Requirement: Reserva con los casos de uso de la agenda
Al confirmar el horario e identificar al paciente, el bot SHALL crear el turno con el mismo caso de uso que recepción, con origen `whatsapp` y estado `reservado`, y responder con la tarjeta "Turno reservado" con fecha, hora, prestación y profesional, ofreciendo "Pagar seña" y "Volver al menú" (RN-WA-02).

#### Scenario: Reserva completa aparece en la agenda
- **GIVEN** el paciente `+54 9 11 0000-0001` eligió "Lun 30/11 09:00" de "Control y limpieza" con "Dra. Ficticia Perez"
- **WHEN** elige "Confirmar turno"
- **THEN** `GET /api/turnos` incluye un turno de `pac-01` con `prof-1` a las `09:00`, `origen` `whatsapp`, `estado` `reservado` y `senado` `false`, y el bot muestra la tarjeta "Turno reservado" con "Lun 30/11 09:00", "Control y limpieza" y "Dra. Ficticia Perez", y las opciones "Pagar seña" y "Volver al menú"

#### Scenario: Horario tomado entre medio
- **GIVEN** el paciente eligió "Lun 30/11 09:00" y, antes de que confirme, recepción crea un turno de `prof-1` de `09:00` a `09:30`
- **WHEN** el paciente elige "Confirmar turno"
- **THEN** el bot informa que ese horario ya se ocupó, ofrece "Lun 30/11 09:30", "Lun 30/11 09:45" y "Lun 30/11 10:00", y no crea un segundo turno a las `09:00`

#### Scenario: El paciente ya tiene un turno a esa hora
- **GIVEN** `pac-01` tiene un turno con `prof-2` el lunes de `09:00` a `09:30`
- **WHEN** desde `+54 9 11 0000-0001` elige "Lun 30/11 09:00" con "Dra. Ficticia Perez" y "Confirmar turno"
- **THEN** el bot informa que ya tiene otro turno a esa hora y vuelve a ofrecer horarios

### Requirement: Recordatorio de demostración
`POST /api/sim/whatsapp/recordatorio` SHALL enviar al teléfono el recordatorio de su próximo turno activo ("te recordamos tu turno … ¿Confirmás tu asistencia?") con las opciones de "Ver mi turno" (RN-WA-03).

#### Scenario: Recordatorio con opciones
- **GIVEN** `pac-01` tiene un turno reservado y sin seña el martes a las `10:00`
- **WHEN** se envía el recordatorio a `+54 9 11 0000-0001`
- **THEN** el bot escribe el recordatorio con fecha, hora y profesional y ofrece "Confirmo", "Pagar seña" y "Cancelar turno"

#### Scenario: Recordatorio sin turnos
- **WHEN** se envía el recordatorio a `+54 9 11 0000-0099`
- **THEN** el bot informa que no hay turnos próximos para ese número

## ADDED Requirements

### Requirement: Revisar el horario antes de reservar
Al elegir un horario, el bot SHALL mostrar un resumen con fecha, hora, prestación y profesional y las opciones "Confirmar turno" y "Volver atrás", sin reservar todavía. "Volver atrás" SHALL mostrar otra vez los mismos horarios ofrecidos, sin crear ningún turno.

#### Scenario: Elegir un horario muestra el resumen
- **GIVEN** el bot ofrece horarios de "Control y limpieza" con "Dra. Ficticia Perez"
- **WHEN** el paciente elige "Lun 30/11 09:00"
- **THEN** el bot muestra "Lun 30/11 09:00", "Control y limpieza" y "Dra. Ficticia Perez" con exactamente las opciones "Confirmar turno" y "Volver atrás", y no existe un turno nuevo

#### Scenario: Volver atrás
- **GIVEN** el bot muestra el resumen de "Lun 30/11 09:00"
- **WHEN** el paciente elige "Volver atrás"
- **THEN** el bot vuelve a ofrecer "Lun 30/11 09:00", "Lun 30/11 09:15", "Lun 30/11 09:30" y "Ver más días", y no existe un turno nuevo

### Requirement: Ver mi turno
Al elegir "Ver mi turno", el bot SHALL mostrar el próximo turno activo (reservado o confirmado, con inicio posterior al reloj) del paciente del teléfono, indicando si la seña está pagada, con las opciones "Confirmo", "Pagar seña" (solo si el turno no está señado) y "Cancelar turno". Si no hay turnos, SHALL informarlo y ofrecer "Pedir un turno".

#### Scenario: Muestra el próximo turno sin seña
- **GIVEN** `pac-01` tiene un turno reservado y sin seña el martes `2026-12-01` a las `10:00`
- **WHEN** desde `+54 9 11 0000-0001` elige "Ver mi turno"
- **THEN** el bot muestra ese turno y exactamente las opciones "Confirmo", "Pagar seña" y "Cancelar turno"

#### Scenario: Turno señado no ofrece pagar
- **GIVEN** el turno del martes de `pac-01` tiene `senado` `true`
- **WHEN** desde `+54 9 11 0000-0001` elige "Ver mi turno"
- **THEN** el bot indica "Seña pagada" y ofrece exactamente "Confirmo" y "Cancelar turno"

#### Scenario: Sin turnos
- **WHEN** desde `+54 9 11 0000-0099` elige "Ver mi turno"
- **THEN** el bot informa que no encontró turnos próximos para ese número y ofrece "Pedir un turno"

### Requirement: Pagar seña simulada
"Pagar seña" SHALL mostrar el monto ficticio de la seña rotulado como simulación de Mercado Pago y las opciones "Aprobar pago (simulación)", "Rechazar pago (simulación)" y "Volver al menú". El resultado SHALL registrarse con el mismo caso de uso del simulador de Mercado Pago, como paciente: aprobado deja el turno con `senado` `true` y responde con la tarjeta "Seña pagada"; rechazado no cambia el turno y ofrece reintentar. Un turno ya señado MUST NOT señarse de nuevo (RN-SM-01).

#### Scenario: Pago aprobado
- **GIVEN** el bot acaba de reservar el turno del lunes `09:00` de `pac-01`
- **WHEN** el paciente elige "Pagar seña" y después "Aprobar pago (simulación)"
- **THEN** `GET /api/turnos` muestra ese turno con `senado` `true` y el bot muestra la tarjeta "Seña pagada" con el monto

#### Scenario: Pago rechazado
- **GIVEN** el bot muestra el pago de la seña del turno del lunes `09:00` de `pac-01`
- **WHEN** el paciente elige "Rechazar pago (simulación)"
- **THEN** el turno sigue con `senado` `false` y el bot informa el rechazo y ofrece "Pagar seña" y "Volver al menú"

#### Scenario: Turno ya señado
- **GIVEN** el bot muestra el pago de la seña de un turno que recepción ya marcó con `senado` `true`
- **WHEN** el paciente elige "Aprobar pago (simulación)"
- **THEN** el bot informa que la seña ya estaba pagada y no registra un segundo pago aprobado

### Requirement: Consultar mi obra social
"Consultar mi obra social" SHALL pedir el número de afiliado como texto y responder con obra social, plan, porcentaje de cobertura, porcentaje de copago y estado del padrón ficticio, usando el mismo caso de uso que el simulador de obras sociales y rotulado como simulación. Un número que no está en el padrón SHALL volver a pedirse; una falla simulada del padrón SHALL informarse sin datos de cobertura.

#### Scenario: Afiliado encontrado
- **GIVEN** el menú inicial
- **WHEN** el paciente elige "Consultar mi obra social" y escribe "AF-0001"
- **THEN** el bot responde con "OS-01", "Plan Base", cobertura "80%", copago "20%" y estado "activo", rotulado como simulación

#### Scenario: Número en minúsculas
- **GIVEN** el bot pidió el número de afiliado
- **WHEN** el paciente escribe " af-0002 "
- **THEN** el bot responde con "OS-02", "Plan Copago", cobertura "60%", copago "40%" y estado "con copago"

#### Scenario: Afiliado inexistente
- **GIVEN** el bot pidió el número de afiliado
- **WHEN** el paciente escribe "AF-9999"
- **THEN** el bot informa que no encontró ese número en el padrón simulado y vuelve a pedir el número

#### Scenario: Falla simulada del padrón
- **GIVEN** el bot pidió el número de afiliado
- **WHEN** el paciente escribe "AF-0004"
- **THEN** el bot informa que el padrón no respondió (falla simulada), no muestra datos de cobertura y ofrece "Volver al menú"

## REMOVED Requirements

### Requirement: Ver o cambiar mi turno
**Reason**: La opción pasa a llamarse "Ver mi turno" y deja de ofrecer "Necesito cambiarlo"; suma "Pagar seña".
**Migration**: Ver el requisito "Ver mi turno".

### Requirement: Cambiar el turno deriva a recepción
**Reason**: Integrante 2 pidió quitar "Necesito cambiarlo" del bot (2026-11-25). Para cambiar un turno, el paciente se comunica con recepción, que usa reprogramar (C-04).
**Migration**: Ninguna en la API: la opción `cambiar` deja de ofrecerse y, si llega, el bot responde "No entendí".
