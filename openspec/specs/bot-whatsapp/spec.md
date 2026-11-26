# bot-whatsapp Specification

## Purpose

Simula el canal de WhatsApp del paciente: una conversación guiada por opciones que reserva, confirma y cancela turnos contra la agenda real usando los mismos casos de uso que recepción, siempre rotulada como simulación y sin integraciones externas (RN-WA-01..04, RN-SM-04).

> Convenciones de los escenarios: reloj fijo en el lunes `2026-11-30 09:00` (UTC-03:00), salvo que se indique otra hora. Datos del seed: prestaciones `Control y limpieza`, `Ortodoncia`, `Tratamiento`, `Estética dental` y `Urgencia`; profesionales `Dra. Ficticia Perez` (`prof-1`) y `Dr. Ficticio Gomez` (`prof-2`) con franjas lunes a viernes `09:00-13:00` y `14:00-19:00`; paciente `pac-01` "Paciente Ficticio Uno" con teléfono `+54 9 11 0000-0001`; el teléfono `+54 9 11 0000-0099` no pertenece a ningún paciente. "El paciente" es quien escribe desde el teléfono indicado a `POST /api/sim/whatsapp/mensaje`.

## Requirements

### Requirement: Menú inicial
El bot SHALL responder a cualquier mensaje de un teléfono sin conversación activa, y a los textos "hola" o "menú" en cualquier momento, con un saludo y las opciones "Pedir un turno", "Ver mi turno" y "Consultar mi obra social".

#### Scenario: Primer mensaje muestra el menú
- **WHEN** el paciente `+54 9 11 0000-0001` escribe "Hola! Quería sacar un turno"
- **THEN** el bot responde con un saludo y exactamente las opciones "Pedir un turno", "Ver mi turno" y "Consultar mi obra social"

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

### Requirement: Recordatorio de demostración
`POST /api/sim/whatsapp/recordatorio` SHALL enviar al teléfono el recordatorio de su próximo turno activo ("te recordamos tu turno … ¿Confirmás tu asistencia?") con las opciones de "Ver mi turno" (RN-WA-03).

#### Scenario: Recordatorio con opciones
- **GIVEN** `pac-01` tiene un turno reservado y sin seña el martes a las `10:00`
- **WHEN** se envía el recordatorio a `+54 9 11 0000-0001`
- **THEN** el bot escribe el recordatorio con fecha, hora y profesional y ofrece "Confirmo", "Pagar seña" y "Cancelar turno"

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
`POST /api/sim/whatsapp/mensaje` y `POST /api/sim/whatsapp/recordatorio` SHALL responder `200` con `simulado: true`, el aviso "Simulación — no es WhatsApp real", los mensajes del bot, las opciones y si se espera texto. MUST responder `400` con `error.tipo` `entrada` si no llega exactamente uno de `telefono` o `pacienteId`, si el teléfono no tiene el formato ficticio, si el paciente no existe o no tiene teléfono, o si el mensaje no trae exactamente uno de opción o texto.

#### Scenario: Respuesta rotulada como simulación
- **WHEN** el paciente `+54 9 11 0000-0001` escribe "hola"
- **THEN** la respuesta es `200` con `simulado: true` y `aviso` "Simulación — no es WhatsApp real"

#### Scenario: Teléfono real o inválido rechazado
- **WHEN** se envía un mensaje desde el teléfono `+54 9 11 4321-0000`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

#### Scenario: Mensaje sin opción ni texto
- **WHEN** se envía un mensaje con teléfono válido y sin `opcionId` ni `texto`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

#### Scenario: Paciente identificado por id
- **WHEN** se envía un mensaje con `pacienteId` `pac-01` y texto "hola"
- **THEN** la respuesta es `200` con `simulado: true` y `aviso` "Simulación — no es WhatsApp real"

#### Scenario: Teléfono y paciente a la vez
- **WHEN** se envía un mensaje con `telefono` `+54 9 11 0000-0001` y `pacienteId` `pac-01`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

### Requirement: Pantalla rotulada y sin red externa
La pantalla del bot SHALL mostrar siempre el rótulo "Simulación — no es WhatsApp real" (RN-WA-04) y el módulo del simulador MUST NOT realizar llamadas de red salientes (RN-SM-04).

#### Scenario: Rótulo en la pantalla
- **WHEN** se pide `GET /bot.html`
- **THEN** el HTML contiene "Simulación — no es WhatsApp real"

#### Scenario: Sin red saliente
- **WHEN** se revisan las fuentes del módulo del simulador de WhatsApp
- **THEN** no importan módulos de red (`http`, `https`, `net`) ni usan `fetch`

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
"Consultar mi obra social" SHALL pedir el número de afiliado como texto y mostrarlo normalizado para que el paciente elija "Confirmar" o "Volver atrás" (vuelve a pedirlo, sin consultar). Al confirmar, SHALL responder con obra social, plan, cobertura, copago y estado del padrón ficticio, con el caso de uso del simulador de obras sociales y rotulado como simulación. Un número inexistente SHALL volver a pedirse; una falla simulada SHALL informarse sin datos de cobertura.

#### Scenario: Confirmación del número
- **GIVEN** el bot pidió el número de afiliado
- **WHEN** el paciente escribe " af-0001 "
- **THEN** el bot pregunta "¿El número de afiliado es AF-0001?" con las opciones "Confirmar", "Volver atrás" y "Volver al menú", sin consultar el padrón

#### Scenario: Corregir el número con Volver atrás
- **GIVEN** el bot pregunta "¿El número de afiliado es AF-0011?"
- **WHEN** el paciente elige "Volver atrás"
- **THEN** el bot vuelve a pedir el número de afiliado sin consultar el padrón

#### Scenario: Afiliado encontrado
- **GIVEN** el menú inicial
- **WHEN** el paciente elige "Consultar mi obra social", escribe "AF-0001" y elige "Confirmar"
- **THEN** el bot responde con "OS-01", "Plan Base", cobertura "80%", copago "20%" y estado "activo", rotulado como simulación

#### Scenario: Número en minúsculas
- **GIVEN** el bot pidió el número de afiliado
- **WHEN** el paciente escribe " af-0002 " y elige "Confirmar"
- **THEN** el bot responde con "OS-02", "Plan Copago", cobertura "60%", copago "40%" y estado "con copago"

#### Scenario: Afiliado inexistente
- **GIVEN** el bot pidió el número de afiliado
- **WHEN** el paciente escribe "AF-9999" y elige "Confirmar"
- **THEN** el bot informa que no encontró ese número en el padrón simulado y vuelve a pedir el número

#### Scenario: Falla simulada del padrón
- **GIVEN** el bot pidió el número de afiliado
- **WHEN** el paciente escribe "AF-0004" y elige "Confirmar"
- **THEN** el bot informa que el padrón no respondió (falla simulada), no muestra datos de cobertura y ofrece "Volver al menú"

### Requirement: Navegación en cada paso
En cada paso distinto del menú, el bot SHALL agregar al final "Volver atrás" (si corresponde) y "Volver al menú", en ese orden; las opciones enumeradas por los demás requisitos son las propias del paso. "Volver atrás" MUST NOT aparecer si el paso anterior es el menú, en la confirmación de cancelación ni después de una acción ya hecha (reserva, pago, confirmación, cancelación, cobertura o aviso final).

#### Scenario: Profesional con fila de navegación
- **GIVEN** el paciente eligió "Pedir un turno" y "Control y limpieza"
- **WHEN** el bot ofrece los profesionales
- **THEN** las opciones son "Dra. Ficticia Perez", "Dr. Ficticio Gomez", "Volver atrás" y "Volver al menú"

#### Scenario: Tipo de consulta sin "Volver atrás"
- **GIVEN** el menú inicial
- **WHEN** el paciente elige "Pedir un turno"
- **THEN** las opciones terminan en "Volver al menú" y no aparece "Volver atrás"

#### Scenario: Sin "Volver atrás" después de reservar
- **GIVEN** el paciente confirmó "Lun 30/11 09:00"
- **WHEN** el bot responde "Turno reservado"
- **THEN** las opciones son "Pagar seña" y "Volver al menú", y no aparece "Volver atrás"

### Requirement: Volver atrás
"Volver atrás" SHALL llevar al paso anterior sin crear, modificar ni pagar turnos: profesional → tipo de consulta; horarios → profesional; resumen → horarios; datos del paciente → resumen; pantalla de pago → el paso desde el que se abrió ("¿Querés pagar la seña ahora?" o "Ver mi turno").

#### Scenario: Volver atrás desde los horarios
- **GIVEN** el bot ofrece horarios de "Control y limpieza" con "Dra. Ficticia Perez"
- **WHEN** el paciente elige "Volver atrás"
- **THEN** el bot vuelve a ofrecer "Dra. Ficticia Perez" y "Dr. Ficticio Gomez", y no existe un turno nuevo

#### Scenario: Volver atrás desde los profesionales
- **GIVEN** el bot ofrece los profesionales para "Control y limpieza"
- **WHEN** el paciente elige "Volver atrás"
- **THEN** el bot vuelve a ofrecer los tipos de consulta

#### Scenario: Volver atrás desde los datos del paciente
- **GIVEN** el paciente `+54 9 11 0000-0099` confirmó "Lun 30/11 09:00" y el bot le pide nombre y DNI
- **WHEN** el paciente elige "Volver atrás"
- **THEN** el bot vuelve a mostrar el resumen de "Lun 30/11 09:00" con "Confirmar turno", y no existe un turno nuevo

#### Scenario: Volver atrás desde la pantalla de pago
- **GIVEN** el paciente reservó un turno, eligió "Pagar seña" y el bot muestra la pantalla de pago
- **WHEN** el paciente elige "Volver atrás"
- **THEN** el bot vuelve a preguntar "¿Querés pagar la seña ahora?" y el turno sigue sin seña
