# Spec Delta

## Purpose

Permite consultar los huecos libres de un profesional para una prestación y una fecha, calculados con las mismas reglas que validan el alta de un turno, para que recepción y el bot simulado ofrezcan solo horarios que realmente se pueden reservar (US-014, RN-WA-01).

> Convenciones de los escenarios: todas las horas son de `America/Argentina/Buenos_Aires` (UTC-03:00). La fecha consultada es el martes `2026-12-01` y el reloj está fijo en el lunes `2026-11-30 09:00`, salvo que se indique otra cosa. Datos del seed: profesionales `prof-1` y `prof-2` con franjas lunes a viernes `09:00-13:00` y `14:00-19:00`; sillones activos `sillon-1` y `sillon-2`; prestaciones `prest-control` (30'), `prest-orto` (45') y `prest-trat` (60'); bloqueo global "reservado urgencias" `18:30-19:00` cada día hábil. "Consulta" significa `GET /api/disponibilidad` con `prestacionId`, `profesionalId` y `fecha`, hecha por recepción.

## ADDED Requirements

### Requirement: Huecos dentro del horario de atención en bloques de 15 minutos
El sistema SHALL ofrecer como huecos los inicios alineados a 15 minutos dentro de las franjas del profesional para el día de la semana de la fecha consultada, tales que `[inicio, inicio + duración)` quede completamente contenido en la franja (RN-AG-01, RN-AG-03, RN-AG-04). Un hueco que termina justo en el cierre de la franja MUST ofrecerse.

#### Scenario: Tratamiento de 60 minutos en un día sin turnos
- **GIVEN** una agenda sin turnos
- **WHEN** se consulta `prest-trat` para `prof-1`
- **THEN** los huecos de la mañana empiezan de `09:00` a `12:00` cada 15 minutos, el último de la mañana es `12:00` y no aparece `12:15`

#### Scenario: Control de 30 minutos en un día sin turnos
- **GIVEN** una agenda sin turnos
- **WHEN** se consulta `prest-control` para `prof-1`
- **THEN** los huecos son `09:00` a `12:30` y `14:00` a `18:00`, cada 15 minutos (32 huecos)

#### Scenario: Sin huecos en el corte de almuerzo
- **GIVEN** una agenda sin turnos
- **WHEN** se consulta `prest-control` para `prof-1`
- **THEN** ningún hueco empieza entre `12:45` y `13:45`

#### Scenario: Día sin franjas del profesional
- **GIVEN** una agenda sin turnos
- **WHEN** se consulta `prest-control` para `prof-1` con fecha sábado `2026-12-05`
- **THEN** la respuesta es `200` con una lista de huecos vacía

### Requirement: Huecos fuera de bloqueos
El sistema SHALL excluir los horarios que se solapen con un bloqueo global, con un bloqueo del profesional consultado o con un bloqueo del sillón asignado (RN-AG-04). Los bloqueos de otro profesional MUST NOT afectar los huecos.

#### Scenario: El bloqueo "reservado urgencias" no aparece como hueco
- **GIVEN** una agenda sin turnos y el bloqueo global `18:30-19:00`
- **WHEN** se consulta `prest-control` para `prof-1`
- **THEN** `18:00` es un hueco y ningún hueco empieza a las `18:15`, `18:30` ni `18:45`

#### Scenario: Tratamiento de 60 minutos antes del bloqueo de urgencias
- **GIVEN** una agenda sin turnos y el bloqueo global `18:30-19:00`
- **WHEN** se consulta `prest-trat` para `prof-1`
- **THEN** el último hueco de la tarde es `17:30`

#### Scenario: Bloqueo de otro profesional no afecta
- **GIVEN** un bloqueo de `prof-2` de `09:00` a `13:00`
- **WHEN** se consulta `prest-control` para `prof-1`
- **THEN** los huecos de la mañana de `prof-1` son `09:00` a `12:30`, igual que sin el bloqueo

#### Scenario: Bloqueo del sillón preferido usa el otro sillón
- **GIVEN** un bloqueo de `sillon-1` de `09:00` a `10:00`
- **WHEN** se consulta `prest-control` para `prof-1`
- **THEN** los huecos `09:00`, `09:15`, `09:30` y `09:45` se ofrecen en `sillon-2` y el hueco `10:00` en `sillon-1`

### Requirement: Huecos sin solapamiento por profesional
El sistema SHALL excluir los horarios que se solapen (`[inicio, fin)`, RN-AG-01) con un turno activo del profesional consultado, en cualquier sillón (RN-AG-02).

#### Scenario: Turno del profesional elimina los huecos que lo solapan
- **GIVEN** un turno activo de `prof-1` en `sillon-1` de `10:00` a `10:30`
- **WHEN** se consulta `prest-control` para `prof-1`
- **THEN** `09:30` y `10:30` son huecos y no aparecen `09:45`, `10:00` ni `10:15`

### Requirement: Huecos sin solapamiento por sillón
El sistema SHALL asignar a cada hueco un sillón activo sin turnos activos que se solapen (RN-AG-02). Si ningún sillón activo está libre en ese horario, el horario MUST NOT ofrecerse.

#### Scenario: Sillón ocupado por otro profesional usa el otro sillón
- **GIVEN** un turno activo de `prof-2` en `sillon-1` de `10:00` a `10:30`
- **WHEN** se consulta `prest-control` para `prof-1`
- **THEN** el hueco `10:00` se ofrece en `sillon-2`

#### Scenario: Turnos en ambos sillones eliminan los huecos que los solapan
- **GIVEN** turnos activos de `10:00` a `10:30`, uno de `prof-2` en `sillon-1` y otro de `prof-1` en `sillon-2`
- **WHEN** se consulta `prest-control` para `prof-1`
- **THEN** no aparecen `09:45`, `10:00` ni `10:15`, y `09:30` y `10:30` siguen siendo huecos

#### Scenario: Ambos sillones ocupados por otros profesionales
- **GIVEN** un profesional ficticio adicional `prof-3` con las mismas franjas, un turno activo de `prof-2` en `sillon-1` y uno de `prof-3` en `sillon-2`, ambos de `10:00` a `10:30`
- **WHEN** se calculan los huecos de `prest-control` para `prof-1`
- **THEN** no aparecen `09:45`, `10:00` ni `10:15`, y `10:30` sigue siendo hueco

### Requirement: Un hueco por horario con sillón preferido
El sistema SHALL devolver a lo sumo un hueco por inicio, asignado al primer sillón activo libre en orden ascendente de identificador. Los sillones inactivos MUST NOT ofrecerse.

#### Scenario: Ambos sillones libres prefiere sillon-1
- **GIVEN** una agenda sin turnos
- **WHEN** se consulta `prest-control` para `prof-1`
- **THEN** cada inicio aparece una sola vez y todos los huecos se ofrecen en `sillon-1`

#### Scenario: Sillón inactivo no se ofrece
- **GIVEN** `sillon-1` inactivo y una agenda sin turnos
- **WHEN** se calculan los huecos de `prest-control` para `prof-1`
- **THEN** todos los huecos se ofrecen en `sillon-2`

### Requirement: Turnos cancelados no ocupan huecos
El sistema SHALL ignorar los turnos en estado `cancelado` al calcular los huecos (RN-AG-10).

#### Scenario: Horario de un turno cancelado vuelve a ofrecerse
- **GIVEN** un turno cancelado de `prof-1` en `sillon-1` de `10:00` a `10:30`
- **WHEN** se consulta `prest-control` para `prof-1`
- **THEN** `10:00` es un hueco en `sillon-1`

### Requirement: Sin huecos en el pasado
El sistema SHALL ofrecer solo huecos cuyo inicio sea igual o posterior a la hora actual del reloj del sistema.

#### Scenario: Consulta del mismo día descarta los horarios ya pasados
- **GIVEN** el reloj en `2026-12-01 10:10` y una agenda sin turnos
- **WHEN** se consulta `prest-control` para `prof-1` con fecha `2026-12-01`
- **THEN** el primer hueco es `10:15`

#### Scenario: Un hueco que empieza exactamente ahora se ofrece
- **GIVEN** el reloj en `2026-12-01 10:00` y una agenda sin turnos
- **WHEN** se consulta `prest-control` para `prof-1` con fecha `2026-12-01`
- **THEN** el primer hueco es `10:00`

#### Scenario: Fecha pasada sin huecos
- **GIVEN** el reloj en `2026-12-01 10:00`
- **WHEN** se consulta `prest-control` para `prof-1` con fecha `2026-11-30`
- **THEN** la respuesta es `200` con una lista de huecos vacía

### Requirement: Huecos consistentes con el alta de turnos
Todo hueco ofrecido SHALL ser aceptado por el alta de turnos para un paciente sin turnos ese día, con el mismo inicio, profesional, prestación y sillón. Todo inicio que el alta aceptaría en algún sillón activo, y que no sea anterior al reloj, MUST aparecer como hueco (US-014, RN-WA-01).

#### Scenario: Todo hueco del seed se puede reservar
- **GIVEN** el seed con algunos turnos activos y cancelados de `prof-1` y `prof-2`
- **WHEN** se calculan los huecos de cada prestación del seed para cada profesional y para la fecha consultada
- **THEN** cada hueco es aceptado por la validación de alta para un paciente sin turnos

#### Scenario: Ningún horario reservable queda fuera
- **GIVEN** el mismo seed con turnos
- **WHEN** se prueban todos los inicios alineados del día en cada sillón activo con la validación de alta
- **THEN** cada inicio aceptado y no anterior al reloj figura entre los huecos

#### Scenario: Reservar un hueco ofrecido por la API
- **GIVEN** una agenda sin turnos
- **WHEN** se consulta `prest-trat` para `prof-1` y recepción crea un turno para `pac-01` con el primer hueco devuelto
- **THEN** el alta responde `201`

### Requirement: Formato de la respuesta
`GET /api/disponibilidad` SHALL responder `200` con `{ huecos }`: una lista ordenada por inicio ascendente donde cada hueco tiene `inicio` y `fin` en ISO 8601 y `sillonId`, con `fin = inicio + duración de la prestación`.

#### Scenario: Primer hueco de un tratamiento
- **GIVEN** una agenda sin turnos
- **WHEN** se consulta `prest-trat` para `prof-1`
- **THEN** la respuesta es `200` y el primer hueco es `{ inicio: "2026-12-01T12:00:00.000Z", fin: "2026-12-01T13:00:00.000Z", sillonId: "sillon-1" }`

#### Scenario: Huecos ordenados por inicio
- **GIVEN** una agenda sin turnos
- **WHEN** se consulta `prest-orto` para `prof-2`
- **THEN** los inicios de los huecos son estrictamente crecientes

### Requirement: Entrada de la consulta inválida
La API SHALL responder `400` con `error.tipo` `entrada` cuando falte, esté vacío o se repita alguno de `prestacionId`, `profesionalId` o `fecha`; cuando `fecha` no tenga el formato `YYYY-MM-DD` o no sea una fecha de calendario real; o cuando la prestación o el profesional no existan.

#### Scenario: Falta la prestación
- **WHEN** se consulta sin `prestacionId`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

#### Scenario: Fecha con formato inválido
- **WHEN** se consulta con fecha `2026-12-1`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

#### Scenario: Fecha inexistente en el calendario
- **WHEN** se consulta con fecha `2026-02-30`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

#### Scenario: Parámetro repetido
- **WHEN** se consulta con `profesionalId` enviado dos veces
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

#### Scenario: Prestación inexistente
- **WHEN** se consulta con `prestacionId` `prest-inexistente`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

#### Scenario: Profesional inexistente
- **WHEN** se consulta con `profesionalId` `prof-inexistente`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

### Requirement: Permiso de consulta
El sistema SHALL permitir consultar huecos a los roles `recepcion`, `admin`, `odontologo` y `paciente`, y MUST rechazar con `403` (`error.tipo` `permiso`) una request sin usuario.

#### Scenario: Cada rol puede consultar
- **WHEN** consultan `admin`, `recepcion`, `odontologo` y `paciente`
- **THEN** cada uno recibe `200`

#### Scenario: Sin usuario se rechaza
- **WHEN** se consulta sin el header `X-Rol`
- **THEN** la respuesta es `403` con `error.tipo` `permiso`

### Requirement: La consulta no modifica la agenda
Consultar huecos SHALL ser una operación de solo lectura: MUST NOT crear ni modificar turnos ni registrar eventos de auditoría.

#### Scenario: Tras consultar la agenda sigue igual
- **GIVEN** una agenda sin turnos
- **WHEN** se consulta `prest-control` para `prof-1`
- **THEN** `GET /api/turnos` sigue devolviendo una lista vacía y la auditoría no tiene eventos
