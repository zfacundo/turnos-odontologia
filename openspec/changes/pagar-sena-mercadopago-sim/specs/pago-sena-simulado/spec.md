# Spec Delta

## Purpose

Permite que el paciente pague la seña de su turno a través de un simulador local de Mercado Pago que aprueba o rechaza, marcando el turno como señado sin integrar ningún servicio real (RN-SM-01, RN-SM-04, DD-02).

## ADDED Requirements

> Convenciones: salvo indicación, el turno de referencia `T` es de `prest-control` para `pac-01` con `prof-1` en `sillon-1` el martes `2026-12-01` de `10:00` a `10:30` (UTC-03:00), creado por recepción, en estado `reservado` y con `senado: false`. "El paciente" es un pedido con el rol simulado `paciente`. "Pagar `T` con resultado R" significa `POST /api/sim/mercadopago/pagos` con `{ "turnoId": <id de T>, "resultado": R }`. El reloj marca `2026-11-30T09:00:00-03:00`. El aviso de simulación es exactamente `SIMULACIÓN — no es Mercado Pago real`.

### Requirement: Pago aprobado marca el turno como señado
Cuando el paciente paga con resultado `aprobado` un turno habilitado, el sistema SHALL marcar el turno con `senado: true`, SHALL registrar un pago de seña con estado `aprobado` y MUST responder `201`. El estado del turno no cambia: "señado" es una marca, no un estado (IN-04).

#### Scenario: Aprobar la seña de un turno reservado
- **GIVEN** el turno `T` en estado `reservado` y `senado: false`
- **WHEN** el paciente paga `T` con resultado `aprobado`
- **THEN** la respuesta es `201` con un pago en estado `aprobado` para `T`
- **AND** el turno `T` queda con `senado: true` y sigue en estado `reservado`

#### Scenario: Aprobar la seña de un turno confirmado
- **GIVEN** el turno `T` en estado `confirmado` y `senado: false`
- **WHEN** el paciente paga `T` con resultado `aprobado`
- **THEN** la respuesta es `201` y el turno `T` queda con `senado: true` y sigue en estado `confirmado`

### Requirement: Pago rechazado no cambia el turno
Cuando el paciente paga con resultado `rechazado` un turno habilitado, el sistema SHALL registrar un pago de seña con estado `rechazado`, MUST responder `201` y MUST dejar el turno sin ningún cambio.

#### Scenario: Rechazar la seña de un turno reservado
- **GIVEN** el turno `T` en estado `reservado` y `senado: false`
- **WHEN** el paciente paga `T` con resultado `rechazado`
- **THEN** la respuesta es `201` con un pago en estado `rechazado` para `T`
- **AND** el turno `T` sigue igual que antes: estado `reservado` y `senado: false`

#### Scenario: Un rechazo previo no impide aprobar después
- **GIVEN** el turno `T` con un pago `rechazado` ya registrado
- **WHEN** el paciente paga `T` con resultado `aprobado`
- **THEN** la respuesta es `201` y el turno `T` queda con `senado: true`
- **AND** quedan registrados dos pagos para `T`: uno `rechazado` y uno `aprobado`

### Requirement: Registro de cada intento de pago
El sistema SHALL registrar cada intento aceptado (aprobado o rechazado) como un pago de seña con identificador, turno, monto ficticio, estado, fecha del reloj y `simulado: true`. Un turno MUST tener como máximo un pago `aprobado`. Los pedidos rechazados con `400`, `403`, `404` o `409` MUST NOT registrar ningún pago.

#### Scenario: El pago registrado tiene todos sus datos
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** el paciente paga `T` con resultado `aprobado`
- **THEN** el pago de la respuesta tiene un `id`, el `turnoId` de `T`, el monto ficticio fijo del simulador, `estado: "aprobado"`, `fecha` igual a `2026-11-30T09:00:00-03:00` y `simulado: true`

#### Scenario: Un pedido rechazado por regla no registra pago
- **GIVEN** el turno `T` en estado `cancelado`
- **WHEN** el paciente paga `T` con resultado `aprobado`
- **THEN** la respuesta es `409` y no queda registrado ningún pago para `T`

### Requirement: Solo se señan turnos reservados o confirmados
El sistema SHALL aceptar el pago solo si el turno está en estado `reservado` o `confirmado` (SU-07). Para un turno `cancelado`, `atendido` o `ausente`, MUST responder `409` con la regla `RN-SM-01`, un mensaje que cite SU-07 y `conflicto.turnoId` igual al turno, sin modificarlo. Esto aplica a ambos resultados.

#### Scenario: Pagar un turno cancelado
- **GIVEN** el turno `T` en estado `cancelado`
- **WHEN** el paciente paga `T` con resultado `aprobado`
- **THEN** la respuesta es `409` con `regla: "RN-SM-01"`, un mensaje que menciona SU-07 y `conflicto.turnoId` igual al id de `T`
- **AND** el turno `T` sigue con `senado: false`

#### Scenario: Pagar un turno atendido
- **GIVEN** el turno `T` en estado `atendido`
- **WHEN** el paciente paga `T` con resultado `aprobado`
- **THEN** la respuesta es `409` con `regla: "RN-SM-01"`, un mensaje que menciona SU-07 y `conflicto.turnoId` igual al id de `T`
- **AND** el turno `T` sigue con `senado: false`

#### Scenario: Pagar un turno ausente
- **GIVEN** el turno `T` en estado `ausente`
- **WHEN** el paciente paga `T` con resultado `aprobado`
- **THEN** la respuesta es `409` con `regla: "RN-SM-01"`, un mensaje que menciona SU-07 y `conflicto.turnoId` igual al id de `T`
- **AND** el turno `T` sigue con `senado: false`

#### Scenario: Un rechazo sobre un turno no habilitado también es 409
- **GIVEN** el turno `T` en estado `cancelado`
- **WHEN** el paciente paga `T` con resultado `rechazado`
- **THEN** la respuesta es `409` con `regla: "RN-SM-01"`

### Requirement: Un turno ya señado no se vuelve a señar
El sistema MUST rechazar con `409`, regla `RN-SM-01` y el mensaje "turno ya señado" (con `conflicto.turnoId` igual al turno) todo pago sobre un turno que ya tiene `senado: true`, sea cual sea el resultado pedido, sin registrar un pago nuevo ni modificar el turno.

#### Scenario: Aprobar otra vez un turno ya señado
- **GIVEN** el turno `T` en estado `reservado` con `senado: true` por un pago `aprobado` previo
- **WHEN** el paciente paga `T` con resultado `aprobado`
- **THEN** la respuesta es `409` con `regla: "RN-SM-01"`, un mensaje que contiene "turno ya señado" y `conflicto.turnoId` igual al id de `T`
- **AND** sigue habiendo un único pago `aprobado` para `T`

#### Scenario: Rechazar sobre un turno ya señado
- **GIVEN** el turno `T` con `senado: true`
- **WHEN** el paciente paga `T` con resultado `rechazado`
- **THEN** la respuesta es `409` con `regla: "RN-SM-01"` y el turno `T` sigue con `senado: true`

### Requirement: Turno inexistente
El sistema MUST responder `404` con `error.tipo: "no-encontrado"` cuando el `turnoId` no corresponde a ningún turno, sin registrar ningún pago.

#### Scenario: Pagar un turno que no existe
- **GIVEN** que no existe ningún turno con id `turno-inexistente`
- **WHEN** el paciente paga `turno-inexistente` con resultado `aprobado`
- **THEN** la respuesta es `404` con `error.tipo: "no-encontrado"`

### Requirement: Solo el paciente puede pagar la seña
El sistema SHALL permitir el pago solo con el rol `paciente` (matriz de roles de `03_actores_y_roles.md`). Los roles `admin`, `recepcion` y `odontologo`, y un pedido sin rol, MUST recibir `403` sin registrar ningún pago. El sistema no verifica que el turno sea del paciente que paga (no hay vínculo usuario ↔ paciente).

#### Scenario: Recepción no puede pagar la seña
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** un usuario con rol `recepcion` paga `T` con resultado `aprobado`
- **THEN** la respuesta es `403` y el turno `T` sigue con `senado: false`

#### Scenario: Admin no puede pagar la seña
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** un usuario con rol `admin` paga `T` con resultado `aprobado`
- **THEN** la respuesta es `403`

#### Scenario: Odontólogo no puede pagar la seña
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** un usuario con rol `odontologo` paga `T` con resultado `aprobado`
- **THEN** la respuesta es `403`

#### Scenario: Pedido sin rol
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** se paga `T` con resultado `aprobado` sin header de rol
- **THEN** la respuesta es `403`

### Requirement: Cuerpo del pedido válido
El sistema MUST responder `400` con `error.tipo: "entrada"` cuando el cuerpo no es un objeto JSON, cuando falta `turnoId` o no es un texto no vacío, o cuando `resultado` no es exactamente `aprobado` o `rechazado`. En ese caso no se registra ningún pago.

#### Scenario: Resultado inválido
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** el paciente paga `T` con resultado `pendiente`
- **THEN** la respuesta es `400` con `error.tipo: "entrada"`

#### Scenario: Falta el turnoId
- **WHEN** el paciente envía `{ "resultado": "aprobado" }`
- **THEN** la respuesta es `400` con `error.tipo: "entrada"`

#### Scenario: Cuerpo que no es un objeto
- **WHEN** el paciente envía el cuerpo JSON `["aprobado"]`
- **THEN** la respuesta es `400` con `error.tipo: "entrada"`

### Requirement: Auditoría de cada intento de pago
El sistema SHALL registrar un evento de auditoría por cada pago registrado, con la acción `sena_aprobada` o `sena_rechazada` según el resultado, la entidad `turno`, el id del turno, el usuario y el rol que pagaron, y la fecha del reloj. Los pedidos rechazados con `400`, `403`, `404` o `409` MUST NOT auditarse.

#### Scenario: Se audita un pago aprobado
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** el paciente paga `T` con resultado `aprobado`
- **THEN** la auditoría tiene un evento con acción `sena_aprobada`, entidad `turno`, el id de `T`, rol `paciente` y fecha `2026-11-30T09:00:00-03:00`

#### Scenario: Se audita un pago rechazado
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** el paciente paga `T` con resultado `rechazado`
- **THEN** la auditoría tiene un evento con acción `sena_rechazada` para `T`

#### Scenario: Un 409 no se audita
- **GIVEN** el turno `T` en estado `atendido`
- **WHEN** el paciente paga `T` con resultado `aprobado`
- **THEN** la auditoría no tiene ningún evento `sena_aprobada` ni `sena_rechazada` para `T`

### Requirement: Rótulo de simulación en la respuesta de la API
Toda respuesta exitosa del endpoint de pago MUST incluir `simulado: true` y el campo `aviso` con el texto exacto `SIMULACIÓN — no es Mercado Pago real` (RN-DA-02, RN-SM-04), además del pago registrado y el estado de la marca `senado` del turno.

#### Scenario: La respuesta se rotula como simulación
- **GIVEN** el turno `T` en estado `reservado`
- **WHEN** el paciente paga `T` con resultado `rechazado`
- **THEN** la respuesta `201` incluye `simulado: true`, `aviso: "SIMULACIÓN — no es Mercado Pago real"`, el pago con `simulado: true` y el turno `T` con `senado: false`

### Requirement: Sin requests de red
El simulador MUST NOT hacer ningún request de red ni usar credenciales (RN-SM-04). Todo el flujo de pago se resuelve dentro del proceso.

#### Scenario: El flujo completo no abre conexiones de red
- **GIVEN** el turno `T` en estado `reservado` y un detector que registra cualquier llamada a `fetch` o a los clientes `http`/`https` de Node
- **WHEN** el paciente paga `T` con resultado `aprobado` y después con resultado `rechazado` sobre otro turno habilitado
- **THEN** el detector no registró ninguna llamada de red

#### Scenario: El código del simulador no usa clientes de red
- **WHEN** se revisa el código fuente de `src/simulators/mercadopago/`
- **THEN** no contiene llamadas a `fetch` ni importa `http`, `https`, `net` ni ningún SDK de Mercado Pago

### Requirement: Pantalla de pago simulada
El sistema SHALL servir `/sim/mercadopago.html?turnoId=<id>`, una pantalla con el rótulo visible `SIMULACIÓN — no es Mercado Pago real` y los botones Aprobar y Rechazar. Cada botón MUST llamar al endpoint de pago con el rol `paciente` y el `turnoId` de la URL. La pantalla MUST llamar solo a rutas relativas del propio servidor.

#### Scenario: La pantalla se sirve rotulada
- **WHEN** se pide `GET /sim/mercadopago.html`
- **THEN** la respuesta es `200` con HTML que contiene `SIMULACIÓN — no es Mercado Pago real` y los botones Aprobar y Rechazar

#### Scenario: La pantalla solo llama al servidor propio
- **WHEN** se revisa el HTML y el script de la pantalla de pago
- **THEN** la única llamada de red es a la ruta relativa `/api/sim/mercadopago/pagos`, se envía con el rol `paciente`, toma el `turnoId` de la URL y no hay URLs absolutas a dominios externos
