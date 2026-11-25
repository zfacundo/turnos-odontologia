# Spec Delta

## Purpose

Permite que recepción o administración emitan la Factura C de un turno atendido a través de un simulador local de ARCA. El simulador genera un número correlativo y un CAE ficticio, y muestra un comprobante sin validez fiscal, sin integrar ningún servicio real (RN-SM-03, RN-SM-04, DD-02).

## ADDED Requirements

> Convenciones: salvo indicación, el turno de referencia `T` es de `prest-control` ("Control y limpieza") para `pac-01` (DNI ficticio `99000001`) con `prof-1` en `sillon-1`, el martes `2026-12-01` de `10:00` a `10:30` (UTC-03:00), en estado `atendido` y sin factura. "Recepción" es un pedido con el rol simulado `recepcion`. "Facturar `T`" significa `POST /api/sim/arca/facturas` con `{ "turnoId": <id de T> }`. El reloj marca `2026-12-01T12:00:00-03:00`. El aviso de simulación es exactamente `SIMULACIÓN — sin validez fiscal`. Las fechas de emisión y de vencimiento son fechas de calendario `AAAA-MM-DD` en `America/Argentina/Buenos_Aires`. En los escenarios, el simulador arranca sin facturas emitidas.

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
El sistema SHALL servir `/sim/arca.html`, rotulada "SIMULACIÓN — sin validez fiscal". Para emitir la factura, la pantalla MUST llamar solo al endpoint del simulador, con el rol `recepcion`.

#### Scenario: La pantalla está rotulada
- **WHEN** se pide `GET /sim/arca.html`
- **THEN** la respuesta es `200` y el HTML contiene `SIMULACIÓN — sin validez fiscal`

#### Scenario: La pantalla solo llama al endpoint del simulador
- **WHEN** se revisa el HTML de `/sim/arca.html`
- **THEN** sus llamadas van solo a la ruta relativa `/api/sim/arca/facturas`, con el rol `recepcion`
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
