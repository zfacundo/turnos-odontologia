# Tasks

> TDD estricto: en cada tarea primero va el test rojo (con nombre "dado … cuando … entonces …"), después el mínimo código que lo pone en verde, y luego triangular y refactorizar. Sin mocks de dominio ni de repositorios; solo se fija el reloj con `RelojFijo`. Fechas fijas con offset `-03:00`. Solo se editan archivos de la Zona de C-05, más la línea de montaje en `src/api/app.ts`.

## 1. Dominio: cálculo puro de huecos

- [x] 1.1 Safety net: correr `npm test` y registrar el baseline de tests en verde (162 de C-01 y C-02) antes de empezar.
- [x] 1.2 En `tests/domain/agenda/huecos.test.ts` (datos del seed), escribir en rojo los tests de franja: tratamiento de 60 minutos con último hueco de la mañana a las 12:00 y sin 12:15; control de 30 minutos con 32 huecos (09:00 a 12:30 y 14:00 a 18:00); sin huecos en el almuerzo; sábado sin huecos. Crear `src/domain/agenda/huecos.ts` con `Hueco`, `ContextoHuecos` y `calcularHuecos` (design D2 y D3, recorrido que delega en `validarNuevoTurno`) hasta ponerlos en verde.
- [x] 1.3 Tests de bloqueos: el bloqueo de urgencias excluye 18:15, 18:30 y 18:45 y conserva 18:00; el último tratamiento de la tarde es 17:30; un bloqueo de `prof-2` no afecta a `prof-1`; un bloqueo de `sillon-1` de 09:00 a 10:00 lleva los huecos a `sillon-2`. Verificar en verde.
- [x] 1.4 Tests de solapamiento: un turno de `prof-1` de 10:00 a 10:30 deja libres 09:30 y 10:30 y elimina 09:45, 10:00 y 10:15; con `sillon-1` ocupado por `prof-2`, el hueco de 10:00 se ofrece en `sillon-2`; con turnos en ambos sillones (incluido el caso de un `prof-3` ficticio), se eliminan los huecos que se solapan y 10:30 sigue libre; un turno cancelado no ocupa. Verificar en verde.
- [x] 1.5 Tests de sillón preferido y del límite `desde`: un hueco por inicio, en `sillon-1` cuando ambos están libres; un sillón fuera de `sillonIds` (inactivo) no se ofrece; con `desde` 10:10 el primer hueco es 10:15; con `desde` 10:00 el primer hueco es 10:00; con `desde` posterior a todo el día la lista queda vacía. Implementar el centinela de paciente (design D4) y verificar en verde.
- [x] 1.6 Test de consistencia bidireccional (design D8) sobre el seed, con turnos activos y cancelados de `prof-1` y `prof-2`, para cada prestación y cada profesional. Primero, que todo hueco sea aceptado por `validarNuevoTurno` para un paciente sin turnos. Segundo, que todo inicio alineado que ese validador acepte en algún sillón y que no sea anterior a `desde` figure en la lista. Refactorizar con los tests en verde y verificar que `huecos.ts` no importe Express, `fs` ni `src/application/`, y que no use `new Date()` ni `Date.now()` sin argumentos.

## 2. Aplicación y API: consulta de disponibilidad

- [x] 2.1 En `tests/api/disponibilidad.test.ts` (supertest con el seed y `RelojFijo` en 2026-11-30 09:00), escribir en rojo el test de consulta feliz: `prest-trat` para `prof-1` el 2026-12-01 responde `200` y el primer hueco es `{ inicio: "2026-12-01T12:00:00.000Z", fin: "2026-12-01T13:00:00.000Z", sillonId: "sillon-1" }`. Crear `src/application/agenda/consultarHuecos.ts` (design D6) y `src/api/routes/disponibilidad.ts` (design D7), y montar el router en `src/api/app.ts` con una sola línea antes del 404 de `/api` (design D8), hasta ponerlo en verde.
- [x] 2.2 Tests de API de agenda real: el turno creado vía `POST /api/turnos` en `sillon-1` y en `sillon-2` de 10:00 a 10:30 elimina 09:45, 10:00 y 10:15 y deja libre 10:30; un turno cancelado no ocupa (si C-03 todavía no expone la cancelación, se cubre en el dominio de 1.4); la secuencia `prest-orto` de `prof-2` tiene inicios estrictamente crecientes; el sábado responde `200` con `[]`. Verificar en verde.
- [x] 2.3 Tests del reloj: con el reloj en 2026-12-01 10:10, el primer hueco es 10:15; con el reloj en 10:00, el primero es 10:00; la fecha 2026-11-30 con el reloj en 2026-12-01 devuelve `[]`. Verificar en verde.
- [x] 2.4 Tests de entrada inválida (`400`, `error.tipo` `entrada`): falta `prestacionId`; fecha `2026-12-1`; fecha `2026-02-30`; `profesionalId` repetido; prestación inexistente; profesional inexistente. Implementar la validación de la ruta y del caso de uso hasta ponerlos en verde.
- [x] 2.5 Tests de permiso y de solo lectura: `admin`, `recepcion`, `odontologo` y `paciente` reciben `200`; sin `X-Rol` la respuesta es `403` con `error.tipo` `permiso`; después de consultar, `GET /api/turnos` sigue vacío y la auditoría no tiene eventos. Implementar hasta ponerlos en verde.
- [x] 2.6 Test de consistencia de punta a punta: reservar con `POST /api/turnos` (`pac-01`) el primer hueco de `prest-trat` devuelto por la API responde `201`. Verificar en verde.

## 3. Verificación integral

- [x] 3.1 Correr `npm test` (todo en verde, baseline de 1.1 más los tests nuevos) y `npm run typecheck` (sin errores), y verificar que cada escenario de `specs/disponibilidad/spec.md` tenga al menos un test.
- [x] 3.2 Correr `openspec validate calcular-huecos-libres --strict` sin errores y revisar con `git diff --name-only master` que solo cambien archivos de la Zona más la línea de `src/api/app.ts`.

## Workflow follow-up

- Escribir el handoff en `knowledge-base/entrega/C-05.md` (qué se hizo, cómo se verificó, qué sigue y decisiones abiertas).
- Abrir un PR con `.github/pull_request_template.md` hacia `master`, solo con la autorización de Integrante 2; la revisión y el merge los hace el team lead.
- Después del merge, archivar el change con `/opsx:archive` y marcar C-05 como hecho en `CHANGES.md` (lo coordina el team lead).
