# Tasks

> TDD estricto: en cada tarea, primero el test rojo (nombre "dado … cuando … entonces …"), después el mínimo código verde, triangular y refactorizar. Sin mocks de dominio ni de repositorios; solo `RelojFijo` cuando haga falta. Fechas fijas con offset `-03:00`. Este change toca archivos compartidos (ver `proposal.md` - Impact) y el PR los marca para revisión del team lead.

## 1. Baseline y persistencia con escritura

- [x] 1.1 Safety net: correr `npm test` y `npm run typecheck` y registrar el baseline de tests verdes; si algo falla, detenerse y reportarlo como falla preexistente. Baseline 2026-11-24: 315 verdes / 14 rojos preexistentes de C-09/C-10 (rutas no montadas en `app.ts`); el equipo autorizó seguir solo con C-07.
- [x] 1.2 En `tests/infrastructure/configuracion-repos.test.ts`, tests rojos de `guardar`/`buscarPorId`/`actualizar`/`eliminar` y copias defensivas para sillones, prestaciones, profesionales y bloqueos; agregar `RepositorioMutable` a `src/application/ports/repositorios.ts`, crear `src/infrastructure/memory/repositorio-en-memoria.ts` y hacer que los cuatro repos lo extiendan hasta verde. Verificar con `npm test tests/infrastructure/configuracion-repos.test.ts` y que los tests de seed y turnos sigan verdes.
- [x] 1.3 Triangular: `actualizar`/`eliminar` de un id inexistente devuelven error sin crear ni borrar, `listarEn` de bloqueos refleja altas y bajas, y el orden de `listar()` se conserva; refactorizar la base hasta verde.

## 2. Dominio de configuración

- [x] 2.1 En `tests/domain/configuracion/disponibilidad.test.ts`, test rojo: lunes `09:00-13:00` + lunes `12:00-15:00` → `RN-CF-02`; crear `src/domain/configuracion/disponibilidad.ts` (design D4) hasta verde.
- [x] 2.2 Triangular `validarDisponibilidad`: franjas contiguas `09:00-13:00` + `13:00-15:00` válidas, `09:10` desalineada → `RN-CF-02`, `desde >= hasta` → `RN-CF-02`, días distintos sin conflicto, arreglo vacío válido; el dominio NO valida forma (`diaSemana`/`HH:mm`): eso es `entrada` (`400`) en la API. Verificar que el archivo no importe Express, `fs`, `src/application/` ni use `new Date()`/`Date.now()` sin argumentos.
- [x] 2.3 En `tests/domain/configuracion/bloqueo.test.ts`, test rojo: intervalo alineado válido y `09:10-10:00` → `RN-AG-03`; agregar `validarBloqueo` en `src/domain/configuracion/bloqueo.ts` reutilizando `crearIntervaloAlineado` hasta verde; triangular `inicio >= fin` → `RN-AG-01` y verificar pureza.

## 3. Casos de uso de configuración

- [x] 3.1 En `tests/application/configuracion/sillones.test.ts` (seed real), tests rojos de `crearSillon` (admin crea, recepción → `permiso`, nombre solo espacios → `entrada`) y `desactivarSillon` (admin desactiva, segunda baja idempotente con `activo:false`, conserva turnos, id inexistente → `no-encontrado`, recepción → `permiso`); crear `src/application/configuracion/errores.ts`, `crearSillon.ts` y `desactivarSillon.ts` hasta verde.
- [x] 3.2 En `tests/application/configuracion/prestaciones.test.ts`, tests rojos de `crearPrestacion` (45' ok, 20' → `regla` `RN-CF-01`, recepción → `permiso`, `codigo` o `nombre` solo espacios → `entrada`) y `actualizarPrestacion` (actualiza, duración inválida no modifica, id inexistente → `no-encontrado`); crear ambos casos de uso hasta verde.
- [x] 3.3 En `tests/application/configuracion/disponibilidad.test.ts`, tests rojos de `definirDisponibilidad`: reemplazo total, mismo cuerpo dos veces idempotente, `[]` borra franjas, solapamiento → `regla` `RN-CF-02` sin cambios, `09:10` → `regla` `RN-CF-02`, `diaSemana` 8 y `25:00`/`9:00` → `entrada` (forma), profesional inexistente → `no-encontrado`, recepción → `permiso`; crear `definirDisponibilidad.ts` hasta verde.
- [x] 3.4 En `tests/application/configuracion/bloqueos.test.ts`, tests rojos de `crearBloqueo`: admin/recepción crean cualquier bloqueo, odontólogo `u-odonto-1` crea uno de `prof-1`, odontólogo con `prof-2`/global → `permiso`, referencia inexistente → `entrada`, `09:10` → `regla` `RN-AG-03`, `inicio >= fin` → `RN-AG-01`, motivo vacío o solo espacios → `entrada`; crear `crearBloqueo.ts` hasta verde.
- [x] 3.5 En el mismo `tests/application/configuracion/bloqueos.test.ts`, tests rojos de `eliminarBloqueo`: admin y recepción borran cualquiera, odontólogo borra el propio, odontólogo con uno ajeno/global → `permiso`, id inexistente → `no-encontrado`; crear `eliminarBloqueo.ts` hasta verde.

## 4. RN-CF-04 en el alta de turnos

- [x] 4.1 En `tests/application/agenda/crearTurno-rncf04.test.ts` (archivo nuevo, seed real), tests rojos: con `sillon-1` inactivo → `{ tipo: 'regla' }` `RN-CF-04` sin persistir; con `prof-1` inactivo → `RN-CF-04`; con ambos activos → turno `reservado`; editar `src/application/agenda/crearTurno.ts` (design D6) hasta verde, confirmando que los tests de C-02 siguen verdes.
- [x] 4.2 Triangular el orden: si el sillón está inactivo y además el horario se solapa o cae fuera de franja, gana `RN-CF-04`; una entidad inexistente sigue dando `entrada`; refactorizar con tests verdes.

## 5. API de configuración y montaje

- [x] 5.1 En `tests/api/configuracion.test.ts` (supertest, `cargarSeed(RelojFijo)`), tests rojos de sillones: admin `POST` → `201`, recepción `POST` → `403`, `{}` → `400`, nombre `"   "` → `400` `entrada`, admin `DELETE` → `200` con `activo:false`, segundo `DELETE` → `200` idempotente, `DELETE` inexistente → `404`; crear `src/api/routes/configuracion.ts` y montarlo en `src/api/app.ts` (import + 1 línea) hasta verde.
- [x] 5.2 Tests de prestaciones en la API: `POST` 45' → `201`, 20' → `409 RN-CF-01`, `PUT` → `200`, `PUT` inválido → `409` sin cambios, `codigo`/`nombre` solo espacios → `400` `entrada`, id inexistente → `404`, recepción → `403`; implementar rutas hasta verde.
- [x] 5.3 Tests de disponibilidad en la API: `PUT` con semana completa → `200`, reenvío idéntico → `200` e idempotente, `[]` → `200`, lunes `09:00-13:00` + `12:00-15:00` → `409 RN-CF-02`, `09:10` → `409 RN-CF-02`, `diaSemana` 8 → `400` `entrada`, `25:00` y `9:00` → `400` `entrada`, profesional inexistente → `404`, recepción → `403`, cuerpo no arreglo → `400`; implementar la ruta hasta verde.
- [x] 5.4 Tests de bloqueos — lectura: `GET` con seed → `200`; rango de un día incluye ese día y excluye otros; `profesionalId` incluye propios y globales; `desde` solo o `desde >= hasta` → `400`; sin `X-Rol` → `403`; implementar el filtrado hasta verde.
- [x] 5.5 Tests de bloqueos — escritura: `POST` de recepción global → `201`; odontólogo propio → `201`; odontólogo ajeno → `403`; `motivo` solo espacios → `400` `entrada`; desalineado → `409 RN-AG-03`; `DELETE` de recepción → `204` y ya no aparece; odontólogo ajeno → `403`; inexistente → `404`; implementar `POST` y `DELETE` hasta verde.
- [x] 5.6 Test end-to-end de RN-CF-04: crear un turno, desactivar su sillón por `DELETE /api/sillones/:id`, verificar que `GET /api/turnos` conserva el turno y que `POST /api/turnos` en ese sillón → `409` con `error.regla` `RN-CF-04`; corregir lo que falte y refactorizar la ruta (helpers de parseo y traducción de errores).

## 6. Verificación integral

- [x] 6.1 Correr `npm test` completo y `npm run typecheck` en verde; confirmar que cada escenario de `specs/configuracion-consultorio/spec.md`, `specs/agenda-turnos/spec.md` y `specs/persistencia-en-memoria/spec.md` de este change tiene al menos un test "dado … cuando … entonces …". Excepción autorizada 2026-11-24: `npm test` → 425 verdes / 14 rojos preexistentes de C-09/C-10 (rutas de auditoría y odontograma no montadas en `app.ts`); todo el código de C-07 y sus 110 tests nuevos están verdes, y `npm run typecheck` está limpio. Los 61 escenarios de los 3 specs quedan cubiertos por tests con nombres "dado … cuando … entonces …".
- [x] 6.2 Correr `openspec validate configurar-agenda-del-consultorio --strict` y revisar `git diff --stat` confirmando que, fuera de los archivos nuevos, solo cambiaron de forma acotada `src/application/ports/repositorios.ts`, los cuatro repos de `src/infrastructure/memory/`, `src/application/agenda/crearTurno.ts` y `src/api/app.ts`. Validate: válido. `git diff --stat`: 8 archivos modificados, todos dentro de la lista permitida (además se agregó `validarBloqueo` a `src/domain/configuracion/bloqueo.ts`, dominio de la Zona ampliada aprobada en design D1).

## Workflow follow-up

- Dejar el handoff en `knowledge-base/entrega/C-07.md` con decisiones, verificación y riesgos (incluido el chequeo que C-04 debe replicar).
- Commit con conventional commits y scope `configurar-agenda-del-consultorio`, push de la rama y PR con la plantilla, señalando los archivos compartidos para el team lead.
- Tras la revisión, merge y `/opsx:archive`.
