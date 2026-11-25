# Tasks

## 1. Precondición y estructura

- [x] 1.1 Verificar rama `C-08-ficha-paciente-y-cobertura-obra-social-sim`, `git status --branch`, `npm run typecheck` y `npm test`; verificar que el baseline registre exactamente 14 fallos preexistentes en `tests/api/auditoria.test.ts` y `tests/api/odontograma.test.ts`, sin cambios propios aún.
- [x] 1.2 Crear la estructura prevista en `design.md` (`src/application/pacientes/`, `src/simulators/obras-sociales/`, `public/sim/obras-sociales.html`, directorios de tests) y verificar que los paths existan antes de escribir los primeros tests.

## 2. Ficha de paciente: validación, unicidad, actualización y enmascaramiento (TDD)

- [x] 2.1 Escribir en `tests/application/pacientes/registrarPaciente.test.ts` los tests rojos con nombres dado/cuando/entonces para alta válida, DNI inválido, teléfono inválido, `email` no ficticio, `email` vacío o con espacios, `obraSocialId`/`nroAfiliado` inválidos, `nombre`/`dni` vacíos o con espacios y campos obligatorios ausentes; verificar que `npx vitest run tests/application/pacientes/registrarPaciente.test.ts` falle por módulo inexistente.
- [x] 2.2 Implementar `src/application/pacientes/validarPaciente.ts` y `registrarPaciente.ts` con `Result`, `ErrorDeEntrada` y mapeo de DNI duplicado a `DNI_DUPLICADO` con `dimension: 'paciente'`; verificar que el archivo de tests pase en verde sin modificar `src/domain/shared/result.ts`.
- [x] 2.3 Escribir en `tests/application/pacientes/pacientePublico.test.ts` el test rojo dado/cuando/entonces que exige `dni` `99****01` y `telefono` `+54 9 11 0000-**01`; verificar que falle antes de la implementación.
- [x] 2.4 Implementar `src/application/pacientes/pacientePublico.ts` como único punto de enmascaramiento para listado, detalle y `PUT`; verificar que el test pase en verde, que ambos endpoints usen el mismo helper y que el repositorio siga guardando DNI y teléfono completos.
- [x] 2.5 Escribir e implementar `src/application/pacientes/buscarPacientes.ts` con test dado/cuando/entonces para listar y buscar por id inexistente; verificar que el test pase en verde.
- [x] 2.6 Escribir en `tests/application/pacientes/actualizarPaciente.test.ts` los tests rojos dado/cuando/entonces para: conservar el DNI propio dos veces seguidas (`200` idempotente), asignar el DNI de otro paciente (`409 DNI_DUPLICADO`), id inexistente (`404 paciente no encontrado`) y `nombre` con solo espacios (`400 entrada`); verificar que falle antes de implementar.
- [x] 2.7 Implementar `src/application/pacientes/actualizarPaciente.ts` reutilizando `validarPaciente` y el mapeo de DNI duplicado, sin crear una ficha nueva; verificar que `npx vitest run tests/application/pacientes/actualizarPaciente.test.ts` pase en verde.

## 3. API de ficha de paciente (TDD)

- [x] 3.1 Escribir en `tests/api/pacientes.test.ts` la suite roja con supertest que cubra: alta válida `201`; `400 entrada` por DNI/teléfono inválidos, campos ausentes, `nombre`/`dni` vacíos o con espacios y email inválido; `409` por DNI duplicado con `error.tipo = 'regla'` y no `400`; `PUT` idempotente con el DNI propio `200`, `PUT` con DNI ajeno `409`, `PUT` de id inexistente `404` y `PUT` con nombre vacío `400`; listado y detalle con el mismo enmascaramiento, más la comprobación de que el DNI crudo sigue vigente; altas con `obraSocialId`/`nroAfiliado` `AF-9999` y email ficticio; y permisos (`recepcion` `201`/`200`, `odontologo` `403` en alta y `PUT`, `paciente` `403`, sin `X-Rol` `403`); verificar que todos fallen antes de implementar.
- [x] 3.2 Implementar `src/api/routes/pacientes.ts` con factory `pacientesRouter(deps, repo = new PacienteRepositoryEnMemoria())`, métodos `POST`, `PUT` y `GET`, validación de `X-Rol`, `lanzarSiFallo` y serialización con `pacientePublico`; verificar que la suite pase en verde.
- [x] 3.3 Agregar en `src/api/app.ts` el import y el `app.use` del router de pacientes conservando los montajes existentes; verificar que `npm run typecheck` pase y que `npx vitest run tests/api/pacientes.test.ts` siga en verde.

## 4. Simulador de obra social: padrón y caso de uso (TDD)

- [x] 4.1 Escribir en `tests/simulators/obras-sociales/padron.test.ts` los tests rojos dado/cuando/entonces para `AF-0001` (80/20), `AF-0002` (60/40), `AF-0003` (0/100), `AF-0004` (error simulado), inexistente, determinismo y ausencia del nombre del paciente; verificar que falle por módulo inexistente.
- [x] 4.2 Implementar `src/simulators/obras-sociales/padron.ts`, `afiliado.ts` y `padronRepository.ts` con tipos puros, `simulado: true`, `AVISO_SIMULACION` y copias defensivas; verificar que el test pase en verde.
- [x] 4.3 Escribir en `tests/simulators/obras-sociales/consultarAfiliado.test.ts` el test rojo dado/cuando/entonces del caso de uso con `Result`, con `400 entrada` para `nro` vacío y `409 RN-SM-02` para `AF-0004`; implementar `consultarAfiliado.ts` y verificar que pase en verde sin tocar `result.ts`.

## 5. API y pantalla del simulador (TDD)

- [x] 5.1 Escribir en `tests/simulators/obras-sociales/api.test.ts` la suite roja con supertest que cubra los siete requisitos de `cobertura-obra-social-simulada`: activo, copago, sin nombre, `400 entrada` por falta de `:nro` y por `%20`, `404 afiliado no encontrado`, `sin_cobertura`, `409 RN-SM-02` de `AF-0004` con `error.tipo = 'regla'` y contraste explícito contra `400`, ausencia de red, permisos y falta de `X-Rol`; verificar que falle antes de implementar.
- [x] 5.2 Implementar `src/simulators/obras-sociales/router.ts` con factory `obrasSocialesRouter(deps, repo = new PadronObraSocialEnMemoria())` y montarlo en `src/api/app.ts`; verificar que la suite pase en verde y que `npm run typecheck` siga correcto.
- [x] 5.3 Crear `public/sim/obras-sociales.html` con aviso visible «SIMULACIÓN», campo de nº de afiliado y `fetch` solo a `/api/sim/obras-sociales/afiliados/:nro`; verificar por inspección del archivo que el texto y la URL local estén presentes y que no haya URLs externas.

## 6. Verificación final e integración

- [x] 6.1 Ejecutar `npx vitest run tests/application/pacientes tests/api/pacientes.test.ts tests/simulators/obras-sociales` y verificar que todas las pruebas nuevas pasen en verde.
- [x] 6.2 Ejecutar `npm run typecheck` y `npm test`; verificar que no haya errores de tipos y que el único rojo siga siendo el baseline conocido de 14 fallos de auditoría/odontograma.
- [x] 6.3 Ejecutar `openspec validate ficha-paciente-y-cobertura-obra-social-sim --strict` y verificar que no queden deltas, scenarios ni longitudes de descripción que incumplan el esquema.
- [x] 6.4 Revisar `git status --branch` y verificar que solo aparezcan los archivos previstos del change más los dos Markdown de entrega ya existentes, sin commits ni cambios accidentales en `src/` compartido.

## Workflow follow-up

- Presentar el resumen del Propose y detenerse antes de Apply, según lo pedido por el usuario.
- Adjuntar las decisiones D1-D15 al PR para que el team lead apruebe los archivos compartidos de D2, D6 y D11.
