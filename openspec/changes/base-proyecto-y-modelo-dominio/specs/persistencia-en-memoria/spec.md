# Spec Delta

## Purpose

Define el comportamiento observable mínimo de los repositorios en memoria y de la auditoría que sostienen al resto de los módulos, para que los casos de uso de turnos puedan apoyarse en ellos sin base de datos (DD-03).

## ADDED Requirements

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
