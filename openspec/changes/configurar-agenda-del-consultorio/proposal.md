# Proposal

## Why

Hoy la configuración del consultorio es de solo lectura: el seed crea sillones, prestaciones, disponibilidad y bloqueos, pero no hay forma de gestionarlos por API. C-07 necesita que el administrador dé de alta sillones y prestaciones, defina la disponibilidad semanal de cada profesional y gestione bloqueos, con las reglas RN-CF-01..04, y que esos cambios se reflejen de inmediato en la creación de turnos. Sin esto, la demo depende de editar el seed y no se puede cumplir el criterio de RN-CF-04 (un sillón desactivado no debe aceptar turnos nuevos).

## What Changes

- **Capability nueva `configuracion-consultorio`**: casos de uso y endpoints para gestionar sillones, prestaciones, disponibilidad de profesionales y bloqueos.
  - `POST /api/sillones` (admin) y `DELETE`/desactivación de sillón por baja lógica (admin). La baja conserva turnos existentes.
  - `POST /api/prestaciones` y `PUT /api/prestaciones/:id` (admin), validando RN-CF-01 con la función de dominio existente.
  - `PUT /api/profesionales/:id/disponibilidad` (admin): **reemplaza toda la semana** de forma idempotente, validando RN-CF-02.
  - `GET /api/bloqueos` con filtros opcionales (`desde`, `hasta`, `profesionalId`, `sillonId`), `POST /api/bloqueos` y `DELETE /api/bloqueos/:id`.
  - Permisos RN-CF-03: admin todo; recepción gestiona bloqueos; odontólogo gestiona solo bloqueos propios (requiere resolver `profesionalId` desde `deps.usuarios`, igual que C-03).
- **Dominio**: nueva `validarDisponibilidad` (RN-CF-02: franjas del mismo día sin superposición y alineadas a 15 minutos) y validación de `Bloqueo` como intervalo alineado (reutiliza `crearIntervaloAlineado`, RN-AG-03). `validarPrestacion` (RN-CF-01) se reutiliza sin cambios.
- **Persistencia**: se extienden los puertos y los repositorios en memoria de configuración con `guardar`, `actualizar` y `eliminar`; los repositorios actuales solo leen.
- **RN-CF-04 de punta a punta**: `crearTurno` verifica `sillon.activo` y `profesional.activo` y rechaza el alta con `409` (`RN-CF-04`) si alguno está inactivo. Desactivar no borra turnos y `GET /api/catalogo` sigue mostrando la entidad con `activo: false`.
- **Errores (DD-08)**: violación de regla de negocio → `409` con `error.regla`; entrada malformada → `400`; falta de permisos → `403`; recurso inexistente → `404`.
- **BREAKING**: ninguna. `GET /api/catalogo` mantiene su contrato y el seed sigue siendo válido.

## Capabilities

### New Capabilities

- `configuracion-consultorio`: gestión por API de sillones, prestaciones, disponibilidad semanal de profesionales y bloqueos, con las reglas RN-CF-02/03/04, RBAC y contratos de entrada/salida.

### Modified Capabilities

- `agenda-turnos`: se agrega el requisito de que el alta de un turno rechace un sillón o profesional inactivo con `RN-CF-04` (409). El resto de los requisitos de alta y consulta no cambia.
- `persistencia-en-memoria`: se agrega el requisito de que los repositorios en memoria de configuración permitan guardar, actualizar y eliminar (sillones, prestaciones, profesionales y bloqueos), manteniendo el clonado defensivo. Los requisitos de turnos y auditoría no cambian.

## Impact

- **Archivos nuevos (Zona C-07)**: `src/application/configuracion/*` (`crearSillon`, `desactivarSillon`, `crearPrestacion`, `actualizarPrestacion`, `definirDisponibilidad`, `crearBloqueo`, `eliminarBloqueo`), `src/api/routes/configuracion.ts`, `tests/domain/configuracion/disponibilidad.test.ts`, `tests/application/configuracion/*`, `tests/api/configuracion.test.ts`.
- **Compartidos tocados — requieren revisión del team lead** (CODEOWNERS asigna `src/domain/`, `src/application/ports/`, `src/infrastructure/` y `src/application/agenda/` al team lead):
  - `src/domain/configuracion/disponibilidad.ts` (nuevo, RN-CF-02) y `src/domain/configuracion/bloqueo.ts` (validación de intervalo).
  - `src/application/ports/repositorios.ts` (métodos de escritura en los puertos de configuración).
  - `src/infrastructure/memory/{sillon,prestacion,profesional,bloqueo}-repository.ts` (pasan a almacenamiento mutable con clonado).
  - `src/application/agenda/crearTurno.ts` (chequeo de `activo` para RN-CF-04).
  - `src/api/app.ts` (import + montaje de `configuracionRouter`).
- **Sin cambios**: `openspec/specs/catalogo-configuracion/spec.md` (contrato de `GET /api/catalogo` intacto), `src/domain/agenda/validarNuevoTurno.ts`, `src/domain/agenda/huecos.ts`, `src/domain/agenda/turno.ts`, `src/infrastructure/seed/datos-seed.ts`.
- **API**: 8 endpoints nuevos; respuestas `200/201/204`, `400`, `403`, `404`, `409`.
- **Dependencias**: ninguna nueva.
