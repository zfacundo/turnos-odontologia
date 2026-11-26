## ADDED Requirements

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

## MODIFIED Requirements

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
