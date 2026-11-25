# Spec Delta

## ADDED Requirements

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
