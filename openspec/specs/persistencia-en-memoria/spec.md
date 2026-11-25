# persistencia-en-memoria Specification

## Purpose

Define el comportamiento observable mínimo de los repositorios en memoria y de la auditoría que sostienen al resto de los módulos, para que los casos de uso de turnos puedan apoyarse en ellos sin base de datos (DD-03).

## Requirements

### Requirement: Guardar y recuperar turnos
El repositorio de turnos SHALL permitir guardar un turno, recuperarlo por `id` y actualizarlo (lo usan cancelar y reprogramar en C-03/C-04).

#### Scenario: Guardar y buscar por id
- **GIVEN** un repositorio de turnos vacío
- **WHEN** se guarda el turno `t-1` y se lo busca por `id`
- **THEN** se obtiene el turno `t-1` con los mismos datos

#### Scenario: Actualizar reemplaza el turno guardado
- **GIVEN** el turno `t-1` guardado con estado `reservado`
- **WHEN** se actualiza `t-1` con estado `cancelado` y se lo busca por `id`
- **THEN** se obtiene `t-1` con estado `cancelado`

### Requirement: Listar turnos activos
El repositorio de turnos SHALL listar solo turnos activos (estado distinto de `cancelado`; RN-AG-10), filtrando opcionalmente por profesional, sillón y rango `[desde, hasta)`. El filtro por rango MUST usar la semántica de solapamiento semiabierto.

#### Scenario: Listar activos filtra por rango, profesional y sillón y excluye cancelados
- **GIVEN** turnos de los profesionales `p-1` y `p-2` en los sillones `s-1` y `s-2`, uno de ellos `cancelado`, y uno contiguo al rango consultado
- **WHEN** se listan los activos con `profesionalId = p-1`, `sillonId = s-1` y un rango `[09:30, 10:30)`
- **THEN** solo se obtienen los turnos no cancelados de `p-1` en `s-1` que se solapan con el rango, sin el turno contiguo

### Requirement: Auditoría de solo inserción
La auditoría SHALL registrar eventos `{ fecha, usuarioId, rol, accion, entidad, entidadId, detalle }` en orden de llegada; el puerto MUST exponer solo la operación de registrar (no se editan ni borran eventos).

#### Scenario: Registrar solo agrega y los eventos se listan en orden
- **GIVEN** una auditoría en memoria vacía
- **WHEN** se registran dos eventos `crear` y luego `cancelar`
- **THEN** la auditoría contiene ambos eventos en ese orden y el puerto no ofrece operaciones de edición ni borrado

### Requirement: Persistencia de configuración en memoria
Los repositorios en memoria de sillones, prestaciones, profesionales y bloqueos SHALL permitir guardar (alta o reemplazo por `id`), actualizar un registro existente y eliminar por `id`. Guardar y leer MUST usar copias defensivas, de modo que mutar un objeto devuelto no altere el estado almacenado. Actualizar un `id` inexistente MUST devolver un error de regla sin modificar el repositorio.

#### Scenario: Guardar y recuperar un sillón
- **GIVEN** un repositorio de sillones vacío
- **WHEN** se guarda el sillón `s-1` y se lo busca por `id`
- **THEN** se obtiene `s-1` con los mismos datos

#### Scenario: Guardar con un id existente reemplaza el registro
- **GIVEN** la prestación `p-1` con `duracionMin` 30 guardada
- **WHEN** se guarda `p-1` con `duracionMin` 45
- **THEN** al buscar `p-1` se obtiene `duracionMin` 45 y hay una sola prestación `p-1`

#### Scenario: Actualizar un profesional existente
- **GIVEN** el profesional `prof-1` guardado con una franja
- **WHEN** se actualiza `prof-1` con otra disponibilidad
- **THEN** al buscar `prof-1` se obtiene la nueva disponibilidad

#### Scenario: Actualizar un id inexistente falla sin crear el registro
- **GIVEN** un repositorio de prestaciones vacío
- **WHEN** se intenta actualizar `p-inexistente`
- **THEN** el resultado es un error de regla y `p-inexistente` sigue sin existir

#### Scenario: Eliminar un bloqueo lo quita del listado
- **GIVEN** el bloqueo `b-1` guardado
- **WHEN** se elimina `b-1`
- **THEN** `b-1` ya no se obtiene por `id` ni aparece en `listar()` ni en `listarEn()`

#### Scenario: El listado por rango refleja los cambios
- **GIVEN** un repositorio de bloqueos con `b-1` en `[09:00, 10:00)`
- **WHEN** se elimina `b-1` y se consulta el rango `[09:00, 10:00)`
- **THEN** la lista devuelta no contiene `b-1`

#### Scenario: Las copias defensivas aíslan el estado almacenado
- **GIVEN** el sillón `s-1` guardado
- **WHEN** se obtiene por `id` y se muta el objeto devuelto
- **THEN** una nueva búsqueda de `s-1` devuelve los datos originales
