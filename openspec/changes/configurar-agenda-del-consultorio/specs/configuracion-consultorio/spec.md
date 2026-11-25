# Spec Delta

## Purpose

Permite al administrador (y, para bloqueos, a recepción y al odontólogo sobre sus propios horarios) gestionar la configuración del consultorio por API: sillones, prestaciones, disponibilidad semanal de profesionales y bloqueos de agenda, con validación de las reglas RN-CF-02/03/04 y errores consistentes con DD-08.

## ADDED Requirements

### Requirement: Crear sillón
El sistema SHALL permitir al administrador crear un sillón con `nombre` no vacío ni compuesto solo por espacios. La respuesta exitosa MUST ser `201` con `{ id, nombre, activo: true }`. El rol recepcionista, odontólogo o paciente MUST recibir `403`. Una entrada malformada MUST recibir `400`.

#### Scenario: El administrador crea un sillón
- **GIVEN** un usuario con rol `admin`
- **WHEN** hace `POST /api/sillones` con `{ "nombre": "Sillón 3" }`
- **THEN** la respuesta es `201` con el sillón creado, `activo` en `true` y un `id` no vacío

#### Scenario: Recepción intenta crear un sillón
- **GIVEN** un usuario con rol `recepcion`
- **WHEN** hace `POST /api/sillones` con un nombre válido
- **THEN** la respuesta es `403` y no se crea ningún sillón

#### Scenario: Falta el nombre del sillón
- **GIVEN** un usuario con rol `admin`
- **WHEN** hace `POST /api/sillones` con `{}`
- **THEN** la respuesta es `400`

#### Scenario: Nombre de sillón vacío o solo espacios
- **GIVEN** un usuario con rol `admin`
- **WHEN** hace `POST /api/sillones` con `nombre` igual a `""` o `"   "`
- **THEN** la respuesta es `400` con `error.tipo` `entrada` y no se crea el sillón

### Requirement: Desactivar sillón sin borrar turnos
El sistema SHALL desactivar un sillón por baja lógica (`activo = false`) cuando el administrador hace `DELETE /api/sillones/:id`, respondiendo `200` con el sillón actualizado. La operación MUST ser idempotente: si el sillón ya está inactivo, MUST responder `200` con `activo: false`. La baja MUST conservar los turnos existentes y MUST NOT eliminarlos. Un `id` inexistente MUST responder `404`; un rol distinto de administrador MUST responder `403`.

#### Scenario: Desactivar un sillón lo marca inactivo
- **GIVEN** el sillón `sillon-1` activo y un usuario `admin`
- **WHEN** hace `DELETE /api/sillones/sillon-1`
- **THEN** la respuesta es `200` con `activo` en `false` y el sillón sigue existiendo con el mismo `id`

#### Scenario: Desactivar un sillón ya inactivo es idempotente
- **GIVEN** el sillón `sillon-1` con `activo` en `false`
- **WHEN** el administrador hace `DELETE /api/sillones/sillon-1`
- **THEN** la respuesta es `200` con `activo` en `false` y no se produce ningún error

#### Scenario: La baja conserva los turnos del sillón
- **GIVEN** un turno activo asignado a `sillon-1`
- **WHEN** el administrador desactiva `sillon-1` y se consultan los turnos
- **THEN** el turno sigue existiendo y aparece en la consulta de turnos

#### Scenario: Desactivar un sillón inexistente
- **GIVEN** un usuario `admin`
- **WHEN** hace `DELETE /api/sillones/sillon-inexistente`
- **THEN** la respuesta es `404`

#### Scenario: Recepción intenta desactivar un sillón
- **GIVEN** un usuario con rol `recepcion` y el sillón `sillon-1` activo
- **WHEN** hace `DELETE /api/sillones/sillon-1`
- **THEN** la respuesta es `403` y el sillón sigue activo

### Requirement: Crear prestación con duración válida
El sistema SHALL permitir al administrador crear una prestación con `codigo` y `nombre` no vacíos ni compuestos solo por espacios, y `duracionMin`, validando RN-CF-01. Una duración inválida MUST responder `409` con `error.regla` igual a `RN-CF-01`. La respuesta exitosa MUST ser `201`. Un rol distinto de administrador MUST recibir `403`.

#### Scenario: Prestación de 45 minutos es creada
- **GIVEN** un usuario `admin`
- **WHEN** hace `POST /api/prestaciones` con `duracionMin` 45
- **THEN** la respuesta es `201` y la prestación conserva `duracionMin` 45

#### Scenario: Prestación de 20 minutos es rechazada
- **GIVEN** un usuario `admin`
- **WHEN** hace `POST /api/prestaciones` con `duracionMin` 20
- **THEN** la respuesta es `409` con `error.regla` `RN-CF-01` y no se crea la prestación

#### Scenario: Recepción intenta crear una prestación
- **GIVEN** un usuario con rol `recepcion`
- **WHEN** hace `POST /api/prestaciones` con una duración válida
- **THEN** la respuesta es `403`

#### Scenario: Código o nombre de prestación vacío o solo espacios
- **GIVEN** un usuario `admin`
- **WHEN** hace `POST /api/prestaciones` con `codigo` o `nombre` iguales a `""` o `"   "`
- **THEN** la respuesta es `400` con `error.tipo` `entrada` y no se crea la prestación

### Requirement: Actualizar prestación
El sistema SHALL permitir al administrador actualizar nombre y duración de una prestación existente con `PUT /api/prestaciones/:id`, validando RN-CF-01 y respondiendo `200` con la prestación actualizada. Una duración inválida MUST responder `409` con `RN-CF-01` sin modificar la prestación. Un `id` inexistente MUST responder `404` y un rol no administrador MUST responder `403`.

#### Scenario: Actualizar la duración a 45 minutos
- **GIVEN** la prestación `prest-control` con `duracionMin` 30 y un usuario `admin`
- **WHEN** hace `PUT /api/prestaciones/prest-control` con `duracionMin` 45
- **THEN** la respuesta es `200` y la prestación queda con `duracionMin` 45

#### Scenario: Actualización con duración inválida no modifica nada
- **GIVEN** la prestación `prest-control` con `duracionMin` 30
- **WHEN** el administrador hace `PUT /api/prestaciones/prest-control` con `duracionMin` 20
- **THEN** la respuesta es `409` con `RN-CF-01` y la prestación conserva `duracionMin` 30

#### Scenario: Actualizar una prestación inexistente
- **GIVEN** un usuario `admin`
- **WHEN** hace `PUT /api/prestaciones/prest-inexistente` con datos válidos
- **THEN** la respuesta es `404`

### Requirement: Reemplazar la disponibilidad semanal del profesional
El sistema SHALL permitir al administrador reemplazar toda la disponibilidad de un profesional con `PUT /api/profesionales/:id/disponibilidad`, recibiendo un arreglo de franjas `{ diaSemana, desde, hasta }` con `diaSemana` de 1 a 7 y horas `HH:mm`. La operación MUST ser idempotente: el estado resultante depende solo del último cuerpo recibido. Un arreglo vacío MUST dejar al profesional sin franjas. Un `id` inexistente MUST responder `404`; un rol no administrador MUST responder `403`.

#### Scenario: Reemplazo total de la semana
- **GIVEN** el profesional `prof-1` con sus franjas del seed y un usuario `admin`
- **WHEN** hace `PUT /api/profesionales/prof-1/disponibilidad` con una única franja lunes `10:00-12:00`
- **THEN** la respuesta es `200` y el profesional tiene exactamente esa franja, sin las anteriores

#### Scenario: Reenviar el mismo cuerpo no cambia el resultado
- **GIVEN** la disponibilidad de `prof-1` ya reemplazada por un cuerpo
- **WHEN** el administrador reenvía exactamente el mismo cuerpo
- **THEN** la respuesta es `200` y la disponibilidad consultada es idéntica a la del envío anterior

#### Scenario: Un arreglo vacío borra las franjas
- **GIVEN** el profesional `prof-1` con franjas cargadas
- **WHEN** el administrador hace `PUT /api/profesionales/prof-1/disponibilidad` con `[]`
- **THEN** la respuesta es `200` y `prof-1` queda sin franjas

#### Scenario: Reemplazar la disponibilidad de un profesional inexistente
- **GIVEN** un usuario `admin`
- **WHEN** hace `PUT /api/profesionales/prof-inexistente/disponibilidad` con `[]`
- **THEN** la respuesta es `404`

### Requirement: Entrada malformada de configuración
El sistema SHALL responder `400` con `error.tipo` `entrada` cuando la entrada no tiene la forma esperada, sin evaluar reglas de negocio: `diaSemana` fuera de 1..7 o no entero, horas que no cumplen exactamente `HH:mm` (p. ej. `25:00` o `9:00`), o `nombre`/`codigo`/`motivo` vacíos o compuestos solo por espacios. Estos casos MUST NOT responder `409`.

#### Scenario: Día de la semana fuera de rango
- **GIVEN** un usuario `admin`
- **WHEN** hace `PUT /api/profesionales/prof-1/disponibilidad` con una franja `diaSemana` 8
- **THEN** la respuesta es `400` con `error.tipo` `entrada` y no `409`

#### Scenario: Hora imposible en una franja
- **GIVEN** un usuario `admin`
- **WHEN** hace `PUT /api/profesionales/prof-1/disponibilidad` con una franja desde `25:00` hasta `13:00`
- **THEN** la respuesta es `400` con `error.tipo` `entrada` y no `409`

#### Scenario: Hora sin formato HH:mm
- **GIVEN** un usuario `admin`
- **WHEN** hace `PUT /api/profesionales/prof-1/disponibilidad` con una franja desde `9:00` hasta `13:00`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

#### Scenario: Código de prestación vacío
- **GIVEN** un usuario `admin`
- **WHEN** hace `POST /api/prestaciones` con `codigo` `"   "`
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

#### Scenario: Motivo de bloqueo solo con espacios
- **GIVEN** un usuario `admin`
- **WHEN** hace `POST /api/bloqueos` con `motivo` `"   "` y un intervalo válido
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

### Requirement: Franjas sin superposición y alineadas
Con una forma válida (ver "Entrada malformada de configuración"), el sistema SHALL rechazar con `409` y `error.regla` igual a `RN-CF-02` un conjunto de franjas en el que dos franjas del mismo `diaSemana` se superponen, o en el que `desde` o `hasta` no están alineados a 15 minutos (p. ej. `09:10`), o en el que `desde` no es anterior a `hasta`. Un rechazo MUST dejar la disponibilidad anterior sin cambios.

#### Scenario: Franjas superpuestas el lunes son rechazadas
- **GIVEN** un usuario `admin`
- **WHEN** hace `PUT /api/profesionales/prof-1/disponibilidad` con lunes `09:00-13:00` y lunes `12:00-15:00`
- **THEN** la respuesta es `409` con `RN-CF-02` y la disponibilidad de `prof-1` no cambia

#### Scenario: Franja desalineada es rechazada
- **GIVEN** un usuario `admin`
- **WHEN** hace `PUT /api/profesionales/prof-1/disponibilidad` con una franja desde `09:10` hasta `13:00`
- **THEN** la respuesta es `409` con `RN-CF-02`

#### Scenario: Franja con fin anterior al inicio es rechazada
- **GIVEN** un usuario `admin`
- **WHEN** hace `PUT /api/profesionales/prof-1/disponibilidad` con una franja desde `13:00` hasta `09:00`
- **THEN** la respuesta es `409` con `RN-CF-02`

#### Scenario: Franjas contiguas del mismo día son válidas
- **GIVEN** un usuario `admin`
- **WHEN** hace `PUT /api/profesionales/prof-1/disponibilidad` con lunes `09:00-13:00` y lunes `13:00-15:00`
- **THEN** la respuesta es `200`

### Requirement: Listar bloqueos con filtros
El sistema SHALL exponer `GET /api/bloqueos` para administrador, recepción y odontólogo, devolviendo `200` con la lista de bloqueos. Los filtros `desde` y `hasta` MUST enviarse juntos, con zona horaria explícita y `desde < hasta`, y MUST devolver solo los bloqueos que se solapan con `[desde, hasta)`. Los filtros `profesionalId` y `sillonId` MUST restringir la lista a los bloqueos de esa dimensión o globales. Sin usuario autenticado MUST responder `403`; filtros malformados MUST responder `400`.

#### Scenario: Listar todos los bloqueos
- **GIVEN** una API con el seed y un usuario `recepcion`
- **WHEN** hace `GET /api/bloqueos` sin filtros
- **THEN** la respuesta es `200` con la lista de bloqueos del seed

#### Scenario: Filtrar por rango de fechas
- **GIVEN** el seed con bloqueos de urgencias en varios días
- **WHEN** se consulta `GET /api/bloqueos` con `desde` y `hasta` de un lunes
- **THEN** la respuesta incluye el bloqueo de ese día y excluye los de otros días

#### Scenario: Filtrar por profesional incluye los globales
- **GIVEN** un bloqueo propio de `prof-1`, un bloqueo de `prof-2` y un bloqueo global
- **WHEN** se consulta `GET /api/bloqueos?profesionalId=prof-1`
- **THEN** la respuesta incluye el bloqueo de `prof-1` y el global, y excluye el de `prof-2`

#### Scenario: Rango de fechas malformado
- **GIVEN** un usuario `recepcion`
- **WHEN** hace `GET /api/bloqueos` solo con `desde`, o con `desde` posterior a `hasta`
- **THEN** la respuesta es `400`

#### Scenario: Consulta sin usuario
- **GIVEN** una request sin `X-Rol`
- **WHEN** se hace `GET /api/bloqueos`
- **THEN** la respuesta es `403`

### Requirement: Crear bloqueo con intervalo válido
El sistema SHALL permitir crear un bloqueo con `motivo` no vacío ni compuesto solo por espacios, un intervalo válido y, opcionalmente, `profesionalId` y/o `sillonId`; sin ambos el bloqueo es global. La respuesta exitosa MUST ser `201`. Un intervalo con `inicio >= fin` MUST responder `409` con `RN-AG-01`; uno desalineado a 15 minutos MUST responder `409` con `RN-AG-03`; una referencia inexistente MUST responder `400`.

#### Scenario: Recepción crea un bloqueo global
- **GIVEN** un usuario `recepcion`
- **WHEN** hace `POST /api/bloqueos` con motivo "Feriado", intervalo `2026-12-08T09:00-03:00` a `2026-12-08T13:00-03:00` y sin profesional ni sillón
- **THEN** la respuesta es `201` con el bloqueo creado y sin `profesionalId` ni `sillonId`

#### Scenario: Bloqueo con intervalo desalineado
- **GIVEN** un usuario `admin`
- **WHEN** hace `POST /api/bloqueos` con inicio `09:10` y fin `10:00`
- **THEN** la respuesta es `409` con `error.regla` `RN-AG-03`

#### Scenario: Bloqueo con fin anterior al inicio
- **GIVEN** un usuario `admin`
- **WHEN** hace `POST /api/bloqueos` con inicio `10:00` y fin `09:00`
- **THEN** la respuesta es `409` con `error.regla` `RN-AG-01`

#### Scenario: Bloqueo sin motivo
- **GIVEN** un usuario `admin`
- **WHEN** hace `POST /api/bloqueos` sin `motivo`, con `motivo` vacío o con solo espacios
- **THEN** la respuesta es `400`

#### Scenario: Bloqueo con referencia inexistente
- **GIVEN** un usuario `admin`
- **WHEN** hace `POST /api/bloqueos` con `profesionalId` o `sillonId` que no existen
- **THEN** la respuesta es `400` y no se crea el bloqueo

### Requirement: Permisos para crear bloqueos
Administrador y recepción SHALL poder crear cualquier bloqueo. El odontólogo MUST poder crear solo bloqueos cuyo `profesionalId` coincida con el suyo y MUST recibir `403` en cualquier otro caso, incluido un bloqueo global o sin `profesionalId` resuelto.

#### Scenario: El odontólogo crea un bloqueo propio
- **GIVEN** el usuario `u-odonto-1` con `profesionalId` `prof-1`
- **WHEN** hace `POST /api/bloqueos` con `profesionalId` `prof-1`
- **THEN** la respuesta es `201`

#### Scenario: El odontólogo intenta bloquear a otro profesional
- **GIVEN** el usuario `u-odonto-1` con `profesionalId` `prof-1`
- **WHEN** hace `POST /api/bloqueos` con `profesionalId` `prof-2` o sin profesional
- **THEN** la respuesta es `403` y no se crea el bloqueo

#### Scenario: El administrador crea un bloqueo de cualquier alcance
- **GIVEN** un usuario `admin`
- **WHEN** hace `POST /api/bloqueos` con `profesionalId` `prof-2` y un intervalo válido
- **THEN** la respuesta es `201`

### Requirement: Eliminar bloqueo con permisos
El sistema SHALL eliminar un bloqueo con `DELETE /api/bloqueos/:id`, respondiendo `204` sin cuerpo cuando se elimina. Un `id` inexistente MUST responder `404`. Administrador y recepción MUST poder eliminar cualquier bloqueo. El odontólogo MUST poder eliminar solo bloqueos con su propio `profesionalId` y MUST recibir `403` en cualquier otro caso. Tras eliminar, el bloqueo MUST NOT aparecer en `GET /api/bloqueos`.

#### Scenario: Recepción elimina un bloqueo
- **GIVEN** un bloqueo existente y un usuario `recepcion`
- **WHEN** hace `DELETE /api/bloqueos/<id>` 
- **THEN** la respuesta es `204` y el bloqueo ya no aparece en `GET /api/bloqueos`

#### Scenario: El odontólogo elimina su propio bloqueo
- **GIVEN** un bloqueo con `profesionalId` `prof-1` y el usuario `u-odonto-1` de `prof-1`
- **WHEN** hace `DELETE /api/bloqueos/<id>`
- **THEN** la respuesta es `204`

#### Scenario: El odontólogo intenta eliminar un bloqueo ajeno
- **GIVEN** un bloqueo global o de `prof-2` y el usuario `u-odonto-1`
- **WHEN** hace `DELETE /api/bloqueos/<id>`
- **THEN** la respuesta es `403` y el bloqueo sigue existiendo

#### Scenario: Eliminar un bloqueo inexistente
- **GIVEN** un usuario `admin`
- **WHEN** hace `DELETE /api/bloqueos/bloq-inexistente`
- **THEN** la respuesta es `404`

### Requirement: Contrato de errores de configuración
Toda violación de una regla de negocio de configuración SHALL responder `409` con `error.tipo` igual a `regla` y `error.regla` con el código correspondiente (`RN-CF-01`, `RN-CF-02`, `RN-AG-01` o `RN-AG-03`). Una entrada malformada SHALL responder `400` con `error.tipo` igual a `entrada`; la falta de permisos SHALL responder `403` con `error.tipo` igual a `permiso`; un recurso inexistente SHALL responder `404` con `error.tipo` igual a `no-encontrado`.

#### Scenario: Regla de negocio devuelve 409 con código
- **GIVEN** un usuario `admin`
- **WHEN** intenta crear una prestación de 20 minutos
- **THEN** la respuesta es `409` con `error.regla` `RN-CF-01`

#### Scenario: Cuerpo malformado devuelve 400
- **GIVEN** un usuario `admin`
- **WHEN** hace `POST /api/sillones` con un cuerpo que no es un objeto JSON
- **THEN** la respuesta es `400` con `error.tipo` `entrada`

#### Scenario: Falta de permisos devuelve 403
- **GIVEN** un usuario `recepcion`
- **WHEN** intenta crear una prestación
- **THEN** la respuesta es `403` con `error.tipo` `permiso`

#### Scenario: Recurso inexistente devuelve 404
- **GIVEN** un usuario `admin`
- **WHEN** hace `DELETE /api/sillones/sillon-inexistente`
- **THEN** la respuesta es `404` con `error.tipo` `no-encontrado`
