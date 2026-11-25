# bot-whatsapp Specification

## Purpose

Simula el canal de WhatsApp del paciente: una conversación guiada por opciones que reserva, confirma y cancela turnos contra la agenda real usando los mismos casos de uso que recepción, siempre rotulada como simulación y sin integraciones externas (RN-WA-01..04, RN-SM-04).

> Convenciones de los escenarios: reloj fijo en el lunes `2026-11-30 09:00` (UTC-03:00), salvo que se indique otra hora. Datos del seed: prestaciones `Control y limpieza`, `Ortodoncia`, `Tratamiento`, `Estética dental` y `Urgencia`; profesionales `Dra. Ficticia Perez` (`prof-1`) y `Dr. Ficticio Gomez` (`prof-2`) con franjas lunes a viernes `09:00-13:00` y `14:00-19:00`; paciente `pac-01` "Paciente Ficticio Uno" con teléfono `+54 9 11 0000-0001`; el teléfono `+54 9 11 0000-0099` no pertenece a ningún paciente. "El paciente" es quien escribe desde el teléfono indicado a `POST /api/sim/whatsapp/mensaje`.

## Requirements

### Requirement: Menú inicial
El bot SHALL responder a cualquier mensaje de un teléfono sin conversación activa, y a los textos "hola" o "menú" en cualquier momento, con un saludo y las opciones "Pedir un turno" y "Ver o cambiar mi turno".

#### Scenario: Primer mensaje muestra el menú
- **WHEN** el paciente `+54 9 11 0000-0001` escribe "Hola! Quería sacar un turno"
- **THEN** el bot responde con un saludo y exactamente las opciones "Pedir un turno" y "Ver o cambiar mi turno"

#### Scenario: "menú" vuelve al inicio desde cualquier paso
- **GIVEN** una conversación que está mostrando horarios
- **WHEN** el paciente escribe "menú"
- **THEN** el bot vuelve a mostrar el menú inicial

### Requirement: Tipo de consulta y profesional
Al elegir "Pedir un turno", el bot SHALL ofrecer como tipos de consulta las prestaciones del catálogo excepto Urgencia, y después de elegir una SHALL ofrecer los profesionales activos.

#### Scenario: Tipos de consulta sin urgencia
- **GIVEN** el menú inicial
- **WHEN** el paciente elige "Pedir un turno"
- **THEN** las opciones son "Control y limpieza", "Ortodoncia", "Tratamiento" y "Estética dental", y no aparece "Urgencia"

#### Scenario: Elegir el profesional
- **GIVEN** el paciente eligió "Pedir un turno"
- **WHEN** elige "Control y limpieza"
- **THEN** las opciones son "Dra. Ficticia Perez" y "Dr. Ficticio Gomez"

### Requirement: Horarios ofrecidos desde la agenda real
El bot SHALL ofrecer exactamente los primeros 3 huecos que devuelve la consulta de disponibilidad para la prestación, el profesional y el primer día con huecos a partir de la fecha actual (buscando hasta 14 días), más la opción "Ver más días". Nunca MUST ofrecer una lista estática (RN-WA-01).

#### Scenario: Primeros 3 huecos del día
- **GIVEN** una agenda sin turnos
- **WHEN** el paciente elige "Control y limpieza" y "Dra. Ficticia Perez"
- **THEN** las opciones de horario son "Lun 30/11 09:00", "Lun 30/11 09:15" y "Lun 30/11 09:30", seguidas de "Ver más días"

#### Scenario: Un turno existente cambia los horarios ofrecidos
- **GIVEN** un turno de `prof-1` el lunes `2026-11-30` de `09:00` a `09:30`
- **WHEN** el paciente elige "Control y limpieza" y "Dra. Ficticia Perez"
- **THEN** las opciones de horario son "Lun 30/11 09:30", "Lun 30/11 09:45" y "Lun 30/11 10:00"

#### Scenario: Día sin huecos pasa al siguiente día hábil
- **GIVEN** el reloj en el lunes `2026-11-30 19:00`
- **WHEN** el paciente elige "Control y limpieza" y "Dra. Ficticia Perez"
- **THEN** las opciones de horario son del martes 1/12, empezando por "Mar 1/12 09:00"

#### Scenario: Ver más días
- **GIVEN** el bot está mostrando horarios del lunes 30/11
- **WHEN** el paciente elige "Ver más días"
- **THEN** las opciones son los primeros 3 huecos del martes 1/12 más "Ver más días"

#### Scenario: Sin horarios en 14 días
- **GIVEN** un profesional sin franjas de disponibilidad
- **WHEN** se piden horarios para ese profesional
- **THEN** el bot informa que no hay horarios en las próximas 2 semanas y ofrece "Volver al menú"

### Requirement: Identificación del paciente
Si el teléfono pertenece a un paciente, el bot SHALL reservar a su nombre sin pedir datos. Si no, SHALL pedir nombre completo y DNI, reusar al paciente con ese DNI si existe o registrarlo con el teléfono de la conversación, y volver a pedir los datos si no son válidos.

#### Scenario: Teléfono conocido no pide datos
- **GIVEN** el paciente `+54 9 11 0000-0001` está viendo horarios
- **WHEN** elige "Lun 30/11 09:00"
- **THEN** el bot reserva a nombre de "Paciente Ficticio Uno" sin pedir nombre ni DNI

#### Scenario: Teléfono nuevo pide nombre y DNI
- **GIVEN** el paciente `+54 9 11 0000-0099` está viendo horarios
- **WHEN** elige "Lun 30/11 09:00"
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
Al elegir un horario e identificar al paciente, el bot SHALL crear el turno con el mismo caso de uso que recepción, con origen `whatsapp` y estado `reservado`, y responder con la tarjeta "Turno reservado" con fecha, hora, prestación y profesional (RN-WA-02).

#### Scenario: Reserva completa aparece en la agenda
- **GIVEN** el paciente `+54 9 11 0000-0001` está viendo horarios de "Control y limpieza" con "Dra. Ficticia Perez"
- **WHEN** elige "Lun 30/11 09:00"
- **THEN** `GET /api/turnos` incluye un turno de `pac-01` con `prof-1` a las `09:00`, `origen` `whatsapp` y `estado` `reservado`, y el bot muestra la tarjeta "Turno reservado" con "Lun 30/11 09:00", "Control y limpieza" y "Dra. Ficticia Perez"

#### Scenario: Horario tomado entre medio
- **GIVEN** el bot ofreció "Lun 30/11 09:00" y, antes de que el paciente elija, recepción crea un turno de `prof-1` de `09:00` a `09:30`
- **WHEN** el paciente elige "Lun 30/11 09:00"
- **THEN** el bot informa que ese horario ya se ocupó, ofrece "Lun 30/11 09:30", "Lun 30/11 09:45" y "Lun 30/11 10:00", y no crea un segundo turno a las `09:00`

#### Scenario: El paciente ya tiene un turno a esa hora
- **GIVEN** `pac-01` tiene un turno con `prof-2` el lunes de `09:00` a `09:30`
- **WHEN** desde `+54 9 11 0000-0001` elige "Lun 30/11 09:00" con "Dra. Ficticia Perez"
- **THEN** el bot informa que ya tiene otro turno a esa hora y vuelve a ofrecer horarios

### Requirement: Ver o cambiar mi turno
Al elegir "Ver o cambiar mi turno", el bot SHALL mostrar el próximo turno activo (reservado o confirmado, con inicio posterior al reloj) del paciente del teléfono con las opciones "Confirmo", "Necesito cambiarlo" y "Cancelar turno", o informar que no encontró turnos y ofrecer "Pedir un turno".

#### Scenario: Muestra el próximo turno
- **GIVEN** `pac-01` tiene un turno reservado el martes `2026-12-01` a las `10:00`
- **WHEN** desde `+54 9 11 0000-0001` elige "Ver o cambiar mi turno"
- **THEN** el bot muestra ese turno y las opciones "Confirmo", "Necesito cambiarlo" y "Cancelar turno"

#### Scenario: Sin turnos
- **WHEN** desde `+54 9 11 0000-0099` elige "Ver o cambiar mi turno"
- **THEN** el bot informa que no encontró turnos próximos para ese número y ofrece "Pedir un turno"

### Requirement: Confirmar asistencia
"Confirmo" SHALL pasar el turno a `confirmado` con el mismo caso de uso que recepción. Si el turno ya estaba confirmado, el bot MUST informarlo sin error.

#### Scenario: Confirmo
- **GIVEN** el bot muestra el turno reservado de `pac-01` del martes a las `10:00`
- **WHEN** el paciente elige "Confirmo"
- **THEN** el turno queda en estado `confirmado` y el bot agradece la confirmación

#### Scenario: Ya confirmado
- **GIVEN** el turno de `pac-01` ya está `confirmado`
- **WHEN** el paciente vuelve a elegir "Confirmo"
- **THEN** el bot responde que el turno ya estaba confirmado y el estado no cambia

### Requirement: Cancelar con ventana de 24 horas
"Cancelar turno" SHALL pedir confirmación y, al confirmar, cancelar con el mismo caso de uso que recepción como paciente. Si faltan menos de 24 h para el turno, el bot MUST responder que se comunique con recepción y el turno MUST NOT cancelarse (RN-AG-06).

#### Scenario: Cancelación con más de 24 h
- **GIVEN** `pac-01` tiene un turno reservado el martes `2026-12-01` a las `10:00` y el reloj está en el lunes a las `09:00`
- **WHEN** elige "Cancelar turno" y después "Sí, cancelar"
- **THEN** el turno queda `cancelado` con un motivo que indica WhatsApp y el bot confirma la cancelación

#### Scenario: Menos de 24 h deriva a recepción
- **GIVEN** `pac-01` tiene un turno reservado el lunes `2026-11-30` a las `15:00` y el reloj está en el lunes a las `09:00`
- **WHEN** elige "Cancelar turno" y después "Sí, cancelar"
- **THEN** el bot responde que se comunique con recepción y el turno sigue `reservado`

#### Scenario: Arrepentirse de cancelar
- **GIVEN** el bot pidió confirmar la cancelación
- **WHEN** el paciente elige "No"
- **THEN** el turno no cambia y el bot vuelve a mostrar las opciones del turno

### Requirement: Cambiar el turno deriva a recepción
Mientras reprogramar no esté disponible, "Necesito cambiarlo" SHALL responder que para cambiar el turno se comunique con recepción, sin modificar el turno.

#### Scenario: Necesito cambiarlo
- **GIVEN** el bot muestra el turno de `pac-01`
- **WHEN** el paciente elige "Necesito cambiarlo"
- **THEN** el bot indica comunicarse con recepción y el turno no cambia

### Requirement: Recordatorio de demostración
`POST /api/sim/whatsapp/recordatorio` SHALL enviar al teléfono el recordatorio de su próximo turno activo ("te recordamos tu turno … ¿Confirmás tu asistencia?") con las opciones "Confirmo", "Necesito cambiarlo" y "Cancelar turno" (RN-WA-03).

#### Scenario: Recordatorio con opciones
- **GIVEN** `pac-01` tiene un turno reservado el martes a las `10:00`
- **WHEN** se envía el recordatorio a `+54 9 11 0000-0001`
- **THEN** el bot escribe el recordatorio con fecha, hora y profesional y ofrece "Confirmo", "Necesito cambiarlo" y "Cancelar turno"

#### Scenario: Recordatorio sin turnos
- **WHEN** se envía el recordatorio a `+54 9 11 0000-0099`
- **THEN** el bot informa que no hay turnos próximos para ese número

### Requirement: Opción no reconocida
Ante una opción que no corresponde al paso actual, o un texto libre cuando no se pidió texto, el bot SHALL responder "No entendí" y repetir las opciones del paso actual sin cambiar de paso.

#### Scenario: Opción inválida
- **GIVEN** el bot está mostrando los tipos de consulta
- **WHEN** el paciente envía una opción inexistente
- **THEN** el bot responde que no entendió y repite los tipos de consulta

### Requirement: Contrato de la API simulada
`POST /api/sim/whatsapp/mensaje` y `POST /api/sim/whatsapp/recordatorio` SHALL responder `200` con `simulado: true`, el aviso "Simulación — no es WhatsApp real", los mensajes del bot, las opciones y si se espera texto. MUST responder `400` con `error.tipo` `entrada` si el teléfono falta o no tiene el formato ficticio, o si el mensaje no trae exactamente uno de opción o texto.

#### Scenario: Respuesta rotulada como simulación
- **WHEN** el paciente `+54 9 11 0000-0001` escribe "hola"
- **THEN** la respuesta es `200` con `simulado: true` y `aviso` "Simulación — no es WhatsApp real"

#### Scenario: Teléfono real o inválido rechazado
- **WHEN** se envía un mensaje desde el teléfono `+54 9 11 4321-0000`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

#### Scenario: Mensaje sin opción ni texto
- **WHEN** se envía un mensaje con teléfono válido y sin `opcionId` ni `texto`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

### Requirement: Pantalla rotulada y sin red externa
La pantalla del bot SHALL mostrar siempre el rótulo "Simulación — no es WhatsApp real" (RN-WA-04) y el módulo del simulador MUST NOT realizar llamadas de red salientes (RN-SM-04).

#### Scenario: Rótulo en la pantalla
- **WHEN** se pide `GET /bot.html`
- **THEN** el HTML contiene "Simulación — no es WhatsApp real"

#### Scenario: Sin red saliente
- **WHEN** se revisan las fuentes del módulo del simulador de WhatsApp
- **THEN** no importan módulos de red (`http`, `https`, `net`) ni usan `fetch`
