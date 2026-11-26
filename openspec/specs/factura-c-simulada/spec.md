# factura-c-simulada Specification

## Purpose

Permite que recepción o administración emitan la Factura C de un turno atendido a través de un simulador local de ARCA. El simulador genera un número correlativo y un CAE ficticio, y muestra un comprobante sin validez fiscal, sin integrar ningún servicio real (RN-SM-03, RN-SM-04, DD-02).

> Convenciones: salvo indicación, el turno de referencia `T` es de `prest-control` ("Control y limpieza") para `pac-01` (DNI ficticio `99000001`) con `prof-1` en `sillon-1`, el martes `2026-12-01` de `10:00` a `10:30` (UTC-03:00), en estado `atendido` y sin factura. "Recepción" es un pedido con el rol simulado `recepcion`. "Facturar `T`" significa `POST /api/sim/arca/facturas` con `{ "turnoId": <id de T> }`. El reloj marca `2026-12-01T12:00:00-03:00`. El aviso de simulación es exactamente `SIMULACIÓN — sin validez fiscal`. Las fechas de emisión y de vencimiento son fechas de calendario `AAAA-MM-DD` en `America/Argentina/Buenos_Aires`. En los escenarios, el simulador arranca sin facturas emitidas.

## Requirements

### Requirement: Emisión de Factura C sobre un turno atendido
Cuando recepción o administración facturan un turno `atendido` que todavía no tiene factura, el sistema SHALL registrar una Factura C con `simulado: true` y MUST responder `201`. El turno no se modifica.

#### Scenario: Facturar un turno atendido
- **GIVEN** el turno `T` en estado `atendido` y sin factura
- **WHEN** recepción factura `T`
- **THEN** la respuesta es `201` con una factura para el `turnoId` de `T`, de tipo `C`, con número, CAE y `simulado: true`
- **AND** el turno `T` sigue igual que antes, en estado `atendido`

#### Scenario: Administración también puede facturar
- **GIVEN** el turno `T` en estado `atendido` y sin factura
- **WHEN** un pedido con el rol `admin` factura `T`
- **THEN** la respuesta es `201` con una factura para `T`

### Requirement: Numeración correlativa
Cada factura emitida SHALL tener un número con formato `PPPPP-NNNNNNNN`. `PPPPP` es el punto de venta ficticio fijo `00001` y `NNNNNNNN` es un contador que empieza en `1` y sube de a uno con cada emisión exitosa, completado con ceros a la izquierda. La numeración MUST ser global, no por turno.

#### Scenario: La primera factura tiene el número 1
- **GIVEN** el simulador sin facturas emitidas
- **WHEN** recepción factura `T`
- **THEN** la factura tiene el número `00001-00000001`

#### Scenario: Dos emisiones consecutivas son correlativas
- **GIVEN** los turnos `T` y `U`, ambos `atendido` y sin factura
- **WHEN** recepción factura `T` y después factura `U`
- **THEN** la factura de `T` tiene el número `00001-00000001` y la de `U` tiene el número `00001-00000002`

### Requirement: Un pedido fallido no consume número
Los pedidos que se rechazan con `400`, `403`, `404` o `409` MUST NOT registrar una factura ni avanzar el contador.

#### Scenario: Un rechazo entre dos emisiones no deja huecos
- **GIVEN** el turno `T` `atendido`, el turno `R` `reservado` y el turno `U` `atendido`, ninguno con factura
- **WHEN** recepción factura `T`, después intenta facturar `R` (que recibe `409`) y después factura `U`
- **THEN** la factura de `T` tiene el número `00001-00000001` y la de `U` tiene el número `00001-00000002`

#### Scenario: Un pedido con rol no habilitado no registra factura
- **GIVEN** el turno `T` en estado `atendido` y sin factura
- **WHEN** un pedido con el rol `odontologo` factura `T`
- **THEN** la respuesta es `403`
- **AND** cuando después recepción factura `T`, la factura tiene el número `00001-00000001`

### Requirement: CAE ficticio determinístico
Cada factura SHALL tener un CAE ficticio de exactamente 14 dígitos que depende solo de la fecha de emisión, el punto de venta y el número. Está formado por la fecha de emisión `AAMMDD`, el punto de venta en 2 dígitos (`01`) y el número de la factura en 6 dígitos. Los mismos datos MUST producir siempre el mismo CAE, sin azar.

#### Scenario: CAE de la primera factura del día
- **GIVEN** el reloj en `2026-12-01T12:00:00-03:00` y el simulador sin facturas emitidas
- **WHEN** recepción factura `T`
- **THEN** la factura tiene `cae` igual a `26120101000001`, que tiene 14 dígitos

#### Scenario: CAE de la segunda factura
- **GIVEN** la factura `00001-00000001` ya emitida el `2026-12-01`
- **WHEN** recepción factura otro turno `U` `atendido` con el reloj en `2026-12-01T12:00:00-03:00`
- **THEN** la factura de `U` tiene `cae` igual a `26120101000002`

### Requirement: Fecha de emisión y vencimiento del CAE
La factura SHALL tener `fechaEmision` igual a la fecha de calendario del reloj en Argentina y `vencimientoCae` igual a `fechaEmision` + 10 días corridos. Es un supuesto del simulador, inspirado en el plazo real de ARCA.

#### Scenario: Vencimiento a 10 días
- **GIVEN** el reloj en `2026-12-01T12:00:00-03:00`
- **WHEN** recepción factura `T`
- **THEN** la factura tiene `fechaEmision` `2026-12-01` y `vencimientoCae` `2026-12-11`

#### Scenario: Emisión un minuto antes de la medianoche de Argentina
- **GIVEN** el reloj en `2026-11-30T23:59:00-03:00`, que en UTC ya es `2026-12-01`
- **WHEN** recepción factura `T`
- **THEN** la factura tiene `fechaEmision` `2026-11-30`, `vencimientoCae` `2026-12-10` y un `cae` que empieza con `261130`

#### Scenario: El vencimiento cruza el fin de año
- **GIVEN** el reloj en `2026-12-28T10:00:00-03:00`
- **WHEN** recepción factura `T`
- **THEN** la factura tiene `fechaEmision` `2026-12-28` y `vencimientoCae` `2027-01-07`

### Requirement: Importe, emisor y receptor ficticios
La factura SHALL tener:
- el importe ficticio fijo del simulador;
- el concepto con el nombre de la prestación del turno;
- un emisor fijo con razón social `Consultorio Ficticio`, CUIT `20-99999999-0` y condición `Monotributo`;
- un receptor con condición `Consumidor Final`, el nombre del paciente del turno y su DNI enmascarado (primeros 2 dígitos, `****` y últimos 2).

El DNI completo MUST NOT aparecer en la respuesta.

#### Scenario: Datos del comprobante
- **GIVEN** el turno `T` del paciente `pac-01` con DNI `99000001`
- **WHEN** recepción factura `T`
- **THEN** la factura tiene el importe ficticio fijo del simulador y el concepto `Control y limpieza`
- **AND** el emisor es `Consultorio Ficticio`, CUIT `20-99999999-0`, `Monotributo`
- **AND** el receptor es `Consumidor Final` con el nombre de `pac-01` y DNI `99****01`
- **AND** el texto `99000001` no aparece en ninguna parte de la respuesta

#### Scenario: Turno cuyo paciente no existe
- **GIVEN** el turno `T` `atendido` con un `pacienteId` que no está en el repositorio de pacientes
- **WHEN** recepción factura `T`
- **THEN** la respuesta es `201` y el receptor es `Consumidor Final`, sin nombre ni DNI

### Requirement: Solo se facturan turnos atendidos
El sistema SHALL aceptar la emisión solo si el turno está `atendido` (SU-07). Para un turno `reservado`, `confirmado`, `cancelado` o `ausente`, MUST responder `409` con la regla `RN-SM-03`, un mensaje que cite SU-07 y `conflicto.turnoId` igual al turno, sin registrar ninguna factura.

#### Scenario: Facturar un turno reservado
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** recepción factura `T`
- **THEN** la respuesta es `409` con `regla: "RN-SM-03"`, un mensaje que menciona SU-07 y `conflicto.turnoId` igual al id de `T`
- **AND** no queda registrada ninguna factura para `T`

#### Scenario: Facturar un turno confirmado
- **GIVEN** el turno `T` en estado `confirmado`
- **WHEN** recepción factura `T`
- **THEN** la respuesta es `409` con `regla: "RN-SM-03"`, un mensaje que menciona SU-07 y `conflicto.turnoId` igual al id de `T`
- **AND** no queda registrada ninguna factura para `T`

#### Scenario: Facturar un turno cancelado
- **GIVEN** el turno `T` en estado `cancelado`
- **WHEN** recepción factura `T`
- **THEN** la respuesta es `409` con `regla: "RN-SM-03"`, un mensaje que menciona SU-07 y `conflicto.turnoId` igual al id de `T`
- **AND** no queda registrada ninguna factura para `T`

#### Scenario: Facturar un turno ausente
- **GIVEN** el turno `T` en estado `ausente`
- **WHEN** recepción factura `T`
- **THEN** la respuesta es `409` con `regla: "RN-SM-03"`, un mensaje que menciona SU-07 y `conflicto.turnoId` igual al id de `T`
- **AND** no queda registrada ninguna factura para `T`

### Requirement: Un turno se factura una sola vez
Un turno MUST tener como máximo una factura. Si el turno ya fue facturado, el sistema MUST responder `409` con la regla `RN-SM-03`, el mensaje "turno ya facturado" y `conflicto` con el `turnoId` y el `facturaId` de la factura existente, sin registrar otra factura.

#### Scenario: Facturar dos veces el mismo turno
- **GIVEN** el turno `T` ya facturado con la factura `F`
- **WHEN** recepción factura `T` otra vez
- **THEN** la respuesta es `409` con `regla: "RN-SM-03"`, un mensaje que contiene "turno ya facturado" y `conflicto` igual a `{ turnoId: <id de T>, facturaId: <id de F> }`
- **AND** sigue habiendo una sola factura para `T`, y la próxima emisión exitosa de otro turno tiene el número `00001-00000002`

### Requirement: Turno inexistente
Si el `turnoId` no corresponde a ningún turno, el sistema MUST responder `404` sin registrar ninguna factura.

#### Scenario: Facturar un turno que no existe
- **WHEN** recepción factura el turno `turno-inexistente`
- **THEN** la respuesta es `404` con un mensaje que menciona `turno-inexistente`

### Requirement: Validación del cuerpo
El cuerpo MUST ser un objeto JSON con `turnoId` de tipo texto no vacío. En cualquier otro caso, el sistema MUST responder `400` sin registrar ninguna factura. El cliente no puede fijar el importe ni otros datos del comprobante: los demás campos se ignoran.

#### Scenario: Cuerpo sin turnoId
- **WHEN** recepción hace `POST /api/sim/arca/facturas` con `{}`
- **THEN** la respuesta es `400`

#### Scenario: turnoId que no es texto
- **WHEN** recepción hace `POST /api/sim/arca/facturas` con `{ "turnoId": 123 }`
- **THEN** la respuesta es `400`

#### Scenario: Cuerpo que no es un objeto
- **WHEN** recepción hace `POST /api/sim/arca/facturas` con `["turno-T"]`
- **THEN** la respuesta es `400`

#### Scenario: Un importe enviado por el cliente se ignora
- **GIVEN** el turno `T` en estado `atendido` y sin factura
- **WHEN** recepción hace `POST /api/sim/arca/facturas` con `{ "turnoId": <id de T>, "importe": 1 }`
- **THEN** la respuesta es `201` y la factura tiene el importe ficticio fijo del simulador, no `1`

### Requirement: Solo recepción y administración emiten
Solo los roles `admin` y `recepcion` SHALL poder emitir facturas. Los pedidos con el rol `odontologo` o `paciente`, o sin rol, MUST recibir `403`. El permiso se controla antes que el cuerpo y que la existencia del turno.

#### Scenario: El odontólogo no puede facturar
- **GIVEN** el turno `T` en estado `atendido`
- **WHEN** un pedido con el rol `odontologo` factura `T`
- **THEN** la respuesta es `403`

#### Scenario: El paciente no puede facturar
- **GIVEN** el turno `T` en estado `atendido`
- **WHEN** un pedido con el rol `paciente` factura `T`
- **THEN** la respuesta es `403`

#### Scenario: Pedido sin rol
- **WHEN** un pedido sin rol simulado hace `POST /api/sim/arca/facturas` con `{ "turnoId": "turno-inexistente" }`
- **THEN** la respuesta es `403`, no `404`

### Requirement: Auditoría de la emisión
Cada emisión exitosa SHALL dejar un evento de auditoría con la acción `factura_emitida` sobre la entidad `turno` y el id del turno. El evento lleva el usuario, el rol, la fecha del reloj y un detalle con el id, el número, el CAE, el importe y `simulado: true`. Los pedidos fallidos MUST NOT auditarse.

#### Scenario: Se audita la emisión
- **GIVEN** el turno `T` en estado `atendido` y sin factura
- **WHEN** recepción factura `T`
- **THEN** la auditoría tiene un evento `factura_emitida` sobre el turno `T`, con rol `recepcion`, fecha `2026-12-01T12:00:00-03:00` y un detalle con el número `00001-00000001` y `simulado: true`

#### Scenario: Un pedido fallido no se audita
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** recepción factura `T` y recibe `409`
- **THEN** la auditoría no tiene ningún evento `factura_emitida`

### Requirement: Rótulo de simulación en la respuesta
La respuesta `201` SHALL llevar `simulado: true` en la raíz, `aviso` igual a `SIMULACIÓN — sin validez fiscal` y la factura emitida, también con `simulado: true`.

#### Scenario: Respuesta rotulada
- **GIVEN** el turno `T` en estado `atendido` y sin factura
- **WHEN** recepción factura `T`
- **THEN** la respuesta `201` tiene `simulado: true`, `aviso: "SIMULACIÓN — sin validez fiscal"` y `factura.simulado: true`

### Requirement: Pantalla del comprobante simulado
El sistema SHALL servir `/sim/arca.html`, rotulada "SIMULACIÓN — sin validez fiscal". Para emitir y para ver la factura, la pantalla MUST llamar solo a los endpoints del simulador (`POST /api/sim/arca/facturas` y `GET /api/sim/arca/facturas/<turnoId>`), con rutas relativas y el rol `recepcion`.

#### Scenario: La pantalla está rotulada
- **WHEN** se pide `GET /sim/arca.html`
- **THEN** la respuesta es `200` y el HTML contiene `SIMULACIÓN — sin validez fiscal`

#### Scenario: La pantalla solo llama al endpoint del simulador
- **WHEN** se revisa el HTML de `/sim/arca.html`
- **THEN** sus llamadas van solo a rutas relativas que empiezan con `/api/sim/arca/facturas`, con el rol `recepcion`
- **AND** el HTML no contiene ninguna URL absoluta `http://` ni `https://`

### Requirement: Sin llamadas de red
El simulador MUST NOT hacer requests de red ni usar SDKs, certificados ni credenciales de ARCA/AFIP (RN-SM-04).

#### Scenario: Emitir no usa la red
- **GIVEN** un detector que falla ante cualquier intento de usar `fetch`, `http`, `https` o `net`
- **WHEN** se facturan dos turnos atendidos
- **THEN** las dos emisiones terminan bien y el detector no registró ninguna llamada

#### Scenario: El código del simulador no tiene clientes de red
- **WHEN** se revisan los fuentes del simulador de ARCA
- **THEN** ninguno llama a `fetch` ni importa `http`, `https`, `net`, `tls`, clientes HTTP o SDKs de ARCA/AFIP, y ninguno contiene URLs `http(s)://`

### Requirement: Consulta de la factura emitida
Recepción y administración SHALL poder consultar la factura de un turno con `GET /api/sim/arca/facturas/<turnoId>` ("consultar la factura de `T`"). Si el turno ya fue facturado, el sistema MUST responder `200` con `simulado: true`, `aviso` igual a `SIMULACIÓN — sin validez fiscal`, `estado: "emitida"` y la factura guardada, con los mismos datos que se devolvieron al emitirla. La consulta MUST NOT registrar otra factura, avanzar el contador ni auditar.

#### Scenario: Ver una factura emitida
- **GIVEN** el turno `T` ya facturado con la factura `F` número `00001-00000001`
- **WHEN** recepción consulta la factura de `T`
- **THEN** la respuesta es `200` con `simulado: true`, `aviso: "SIMULACIÓN — sin validez fiscal"`, `estado: "emitida"` y `factura` con el id de `F`, el número `00001-00000001`, el CAE `26120101000001` y `simulado: true`

#### Scenario: Administración también puede ver la factura
- **GIVEN** el turno `T` ya facturado con la factura `F`
- **WHEN** un pedido con el rol `admin` consulta la factura de `T`
- **THEN** la respuesta es `200` con `estado: "emitida"` y la factura `F`

#### Scenario: Ver la factura no la vuelve a emitir
- **GIVEN** el turno `T` ya facturado con la factura `00001-00000001` y un evento `factura_emitida` en la auditoría
- **WHEN** recepción consulta la factura de `T` dos veces y después factura otro turno `U` `atendido`
- **THEN** la auditoría tiene un solo evento `factura_emitida` sobre `T`
- **AND** la factura de `U` tiene el número `00001-00000002`

### Requirement: Vista previa de la factura sin emitir
Cuando se consulta la factura de un turno que no tiene factura, el sistema SHALL responder `200` con `simulado: true`, el `aviso` de simulación, `estado: "vista-previa"`, `emitible` y un borrador `factura` armado con las mismas reglas que la emisión, con `fechaEmision` igual a la fecha del reloj en Argentina y con `numero`, `cae` y `vencimientoCae` en `null`. El DNI completo MUST NOT aparecer en la respuesta.

#### Scenario: Ver la vista previa de un turno atendido
- **GIVEN** el turno `T` en estado `atendido` y sin factura
- **WHEN** recepción consulta la factura de `T`
- **THEN** la respuesta es `200` con `estado: "vista-previa"`, `emitible: true` y sin `motivo`
- **AND** `factura` tiene el `turnoId` de `T`, tipo `C`, el importe ficticio fijo del simulador, el concepto `Control y limpieza`, el emisor `Consultorio Ficticio`, el receptor `Consumidor Final` con DNI `99****01`, `fechaEmision` `2026-12-01`, `numero: null`, `cae: null`, `vencimientoCae: null` y `simulado: true`
- **AND** el texto `99000001` no aparece en ninguna parte de la respuesta

### Requirement: La vista previa no tiene efectos
Consultar la vista previa MUST NOT registrar una factura, consumir número ni auditar.

#### Scenario: La vista previa no consume número, no guarda y no audita
- **GIVEN** el turno `T` en estado `atendido` y sin factura
- **WHEN** recepción consulta la factura de `T` dos veces y después factura `T`
- **THEN** las dos consultas responden `estado: "vista-previa"`
- **AND** la factura de `T` tiene el número `00001-00000001`
- **AND** la auditoría tiene un solo evento `factura_emitida`, el de la emisión

### Requirement: Vista previa de un turno no emitible
En la vista previa, `emitible` MUST ser `true` solo si el turno está `atendido`. Si no lo está, `emitible` MUST ser `false` y la respuesta MUST incluir `motivo` con `regla: "RN-SM-03"` y un mensaje que cite SU-07, sin responder `409`.

#### Scenario: Vista previa de un turno no atendido
- **GIVEN** el turno `T` en estado `reservado` y sin factura
- **WHEN** recepción consulta la factura de `T`
- **THEN** la respuesta es `200` con `estado: "vista-previa"`, `emitible: false` y `motivo` con `regla: "RN-SM-03"` y un mensaje que menciona SU-07
- **AND** no queda registrada ninguna factura para `T` y la auditoría no tiene eventos `factura_emitida`

### Requirement: Consulta de factura de un turno inexistente
Si el turno consultado no existe, el sistema MUST responder `404` con un mensaje que lo nombre, sin registrar ninguna factura.

#### Scenario: Consultar la factura de un turno que no existe
- **WHEN** recepción hace `GET /api/sim/arca/facturas/turno-inexistente`
- **THEN** la respuesta es `404` con un mensaje que menciona `turno-inexistente`

### Requirement: Solo recepción y administración consultan la factura
Solo los roles `admin` y `recepcion` SHALL poder consultar la factura de un turno. Los pedidos con el rol `odontologo` o `paciente`, o sin rol, MUST recibir `403`. El permiso se controla antes que la existencia del turno.

#### Scenario: El odontólogo no puede ver la factura
- **GIVEN** el turno `T` ya facturado
- **WHEN** un pedido con el rol `odontologo` consulta la factura de `T`
- **THEN** la respuesta es `403` y no contiene la factura

#### Scenario: El paciente no puede ver la factura
- **GIVEN** el turno `T` en estado `atendido`
- **WHEN** un pedido con el rol `paciente` consulta la factura de `T`
- **THEN** la respuesta es `403`

#### Scenario: Consulta sin rol de un turno inexistente
- **WHEN** un pedido sin rol simulado hace `GET /api/sim/arca/facturas/turno-inexistente`
- **THEN** la respuesta es `403`, no `404`

### Requirement: Botón Ver factura en la pantalla
La pantalla `/sim/arca.html` SHALL mostrar un botón "Ver factura" al lado de "Emitir factura C" que, al tocarlo, consulta la factura del turno. Los datos del servidor se escriben como texto, nunca como HTML. Sin `turnoId` en la URL, "Ver factura" MUST quedar deshabilitado igual que "Emitir factura C".

#### Scenario: La pantalla tiene el botón Ver factura
- **WHEN** se pide `GET /sim/arca.html`
- **THEN** el HTML tiene un botón "Ver factura" y un botón "Emitir factura C" dentro del mismo grupo de acciones

### Requirement: Ver la factura emitida en la pantalla
Si la factura del turno está emitida, la pantalla MUST mostrar el comprobante guardado con el mismo dibujo que al emitirlo (número, CAE, vencimiento e "Imprimir"), deshabilitar "Emitir factura C" y avisar "Este turno ya tiene factura".

#### Scenario: Ver una factura ya emitida desde la pantalla
- **GIVEN** el turno `T` ya facturado con la factura `00001-00000001`
- **WHEN** en la pantalla `/sim/arca.html?turnoId=<id de T>` se toca "Ver factura"
- **THEN** se ve el comprobante con el número `00001-00000001`, su CAE y el botón "Imprimir"
- **AND** "Emitir factura C" queda deshabilitado y se ve el aviso "Este turno ya tiene factura"

### Requirement: Ver la vista previa en la pantalla
Si la consulta devuelve una vista previa, la pantalla MUST mostrar el comprobante rotulado `VISTA PREVIA — no emitida`, con `—` en número, CAE y vencimiento del CAE y sin el botón "Imprimir". Si la vista previa no es emitible, MUST mostrar además un aviso visible de que la factura no se puede emitir hasta que el turno esté atendido.

#### Scenario: Ver la vista previa desde la pantalla
- **GIVEN** el turno `T` en estado `atendido` y sin factura
- **WHEN** en la pantalla de `T` se toca "Ver factura"
- **THEN** se ve el comprobante rotulado `VISTA PREVIA — no emitida`, con `—` en número, CAE y vencimiento del CAE, sin el botón "Imprimir"
- **AND** "Emitir factura C" sigue habilitado y no se registró ninguna factura

#### Scenario: Vista previa de un turno no atendido en la pantalla
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** en la pantalla de `T` se toca "Ver factura"
- **THEN** se ve la vista previa rotulada `VISTA PREVIA — no emitida` y un aviso visible que dice que no se puede emitir hasta que el turno esté atendido

### Requirement: Confirmación antes de emitir
Al tocar "Emitir factura C", la pantalla SHALL consultar la factura del turno. Si ya está emitida, MUST mostrarla como en "Ver factura" sin abrir la confirmación. Si no, MUST abrir una ventana modal titulada "¿Emitir Factura C?" que resume paciente, prestación e importe y advierte que la emisión simulada no se puede deshacer, con los botones "Cancelar" y "Emitir". Solo "Emitir" MUST hacer el `POST /api/sim/arca/facturas`.

#### Scenario: Se abre la confirmación con el resumen
- **GIVEN** el turno `T` en estado `atendido` y sin factura
- **WHEN** en la pantalla de `T` se toca "Emitir factura C"
- **THEN** se abre la ventana modal "¿Emitir Factura C?" con el nombre del paciente de `T`, `Control y limpieza` y el importe ficticio fijo, y la advertencia de que no se puede deshacer
- **AND** el foco está en "Cancelar" y todavía no se registró ninguna factura

#### Scenario: Confirmar emite la factura
- **GIVEN** la ventana "¿Emitir Factura C?" abierta para el turno `T` `atendido` y sin factura
- **WHEN** se toca "Emitir"
- **THEN** la ventana se cierra, la pantalla hace un solo `POST /api/sim/arca/facturas` con el `turnoId` de `T` y muestra el comprobante emitido con el número `00001-00000001`

#### Scenario: Turno ya facturado no abre la confirmación
- **GIVEN** el turno `T` ya facturado y la pantalla de `T` recién abierta
- **WHEN** se toca "Emitir factura C"
- **THEN** no se abre la ventana de confirmación ni se hace ningún `POST`
- **AND** se ve el comprobante emitido, "Emitir factura C" queda deshabilitado y se ve el aviso "Este turno ya tiene factura"

### Requirement: Cerrar la confirmación sin emitir
"Cancelar" y `Escape` MUST cerrar la ventana de confirmación sin emitir, y al cerrarse el foco MUST volver a "Emitir factura C".

#### Scenario: Cancelar no emite
- **GIVEN** la ventana "¿Emitir Factura C?" abierta para el turno `T`
- **WHEN** se toca "Cancelar"
- **THEN** la ventana se cierra, no se hace ningún `POST` y no queda registrada ninguna factura para `T`
- **AND** el foco vuelve a "Emitir factura C"

#### Scenario: Escape no emite
- **GIVEN** la ventana "¿Emitir Factura C?" abierta para el turno `T`
- **WHEN** se presiona `Escape`
- **THEN** la ventana se cierra, no se hace ningún `POST` y no queda registrada ninguna factura para `T`
- **AND** el foco vuelve a "Emitir factura C"

### Requirement: Ventana de confirmación accesible
La ventana de confirmación SHALL ser un `<dialog>` abierto con `showModal()`, con `aria-labelledby` apuntando a su título y el foco inicial en "Cancelar". Con `prefers-reduced-motion: reduce`, MUST aparecer sin animación de movimiento (como mucho un fundido de opacidad de 150 ms o menos).

#### Scenario: La pantalla declara la ventana accesible
- **WHEN** se revisa el HTML de `/sim/arca.html`
- **THEN** tiene un `<dialog>` con `aria-labelledby` que apunta a un título con el texto "¿Emitir Factura C?", los botones "Cancelar" y "Emitir", una llamada a `showModal()` y una regla `@media (prefers-reduced-motion: reduce)`

### Requirement: Estado inicial de la pantalla según la factura del turno
Cuando la URL de `/sim/arca.html` trae `?turnoId=`, la pantalla MUST consultar `GET /api/sim/arca/facturas/<turnoId>` una vez al cargar y habilitar o deshabilitar "Emitir factura C" según la respuesta (ver escenarios), sin registrar facturas.

#### Scenario: Turno ya facturado al abrir la pantalla
- **GIVEN** el turno `T` ya facturado
- **WHEN** se abre `/sim/arca.html?turnoId=<id de T>`
- **THEN** "Emitir factura C" está deshabilitado desde el inicio y se ve la nota "Este turno ya tiene factura"
- **AND** el comprobante no se muestra hasta que se toca "Ver factura"

#### Scenario: Turno no atendido al abrir la pantalla
- **GIVEN** el turno `T` en estado `reservado` y sin factura
- **WHEN** se abre `/sim/arca.html?turnoId=<id de T>`
- **THEN** "Emitir factura C" está deshabilitado desde el inicio y se ve el motivo: el turno tiene que estar atendido para emitir la factura

#### Scenario: Turno atendido al abrir la pantalla
- **GIVEN** el turno `T` en estado `atendido` y sin factura
- **WHEN** se abre `/sim/arca.html?turnoId=<id de T>`
- **THEN** "Emitir factura C" está habilitado y no se registró ninguna factura

#### Scenario: La pantalla declara la consulta inicial
- **WHEN** se revisa el HTML de `/sim/arca.html`
- **THEN** el script hace una llamada `GET` a una ruta que empieza con `/api/sim/arca/facturas/` al cargar la página, sin `innerHTML`

### Requirement: Factura ya emitida al intentar emitir (409)
Si el `POST /api/sim/arca/facturas` responde `409` porque el turno ya está facturado, la pantalla MUST consultar la factura del turno, mostrar el comprobante existente, deshabilitar "Emitir factura C" y mostrar la nota "Este turno ya tiene factura".

#### Scenario: Otra pestaña emitió entre la consulta y la confirmación
- **GIVEN** la ventana "¿Emitir Factura C?" abierta para el turno `T` y, mientras tanto, `T` fue facturado desde otra pestaña
- **WHEN** se toca "Emitir" y el `POST` responde `409` de turno ya facturado
- **THEN** la pantalla muestra el comprobante existente de `T`, "Emitir factura C" queda deshabilitado y se ve la nota "Este turno ya tiene factura"

#### Scenario: La pantalla maneja el 409 consultando la factura
- **WHEN** se revisa el HTML de `/sim/arca.html`
- **THEN** el script tiene un manejo del estado `409` que vuelve a consultar la factura con `GET`

### Requirement: Confirmar no es posible para un turno no emitible
La ventana de confirmación MUST NOT abrirse para un turno no emitible (porque "Emitir factura C" está deshabilitado). Si de todos modos estuviera abierta con un turno no emitible, el botón "Emitir" de la ventana MUST estar deshabilitado.

#### Scenario: Turno no atendido no abre la confirmación
- **GIVEN** el turno `T` en estado `reservado` y la pantalla de `T` abierta
- **WHEN** se intenta tocar "Emitir factura C"
- **THEN** el botón está deshabilitado, no se abre la ventana y no se hace ningún `POST`

#### Scenario: Emitir dentro de la ventana deshabilitado si no es emitible
- **GIVEN** la ventana de confirmación abierta con una consulta cuyo `emitible` es `false`
- **THEN** el botón "Emitir" de la ventana está deshabilitado

#### Scenario: La pantalla declara la regla de la ventana
- **WHEN** se revisa el HTML de `/sim/arca.html`
- **THEN** el script deshabilita el botón de la ventana ("Emitir") según `emitible`
