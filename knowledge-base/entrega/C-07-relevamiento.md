# Relevamiento — C-07 `configurar-agenda-del-consultorio` (fase Explore)

- **Fecha**: 2026-11-24
- **Rama**: `C-07-configurar-agenda` (limpia, sin commits locales)
- **Change OPSX**: todavía no scaffolded (`openspec/changes/` no tiene la carpeta)
- **Responsable de ficha**: Integrante 3 (`amaro3012-droid`, según `.github/CODEOWNERS`)
- **Depende de**: C-01 (completo). Puede correr en GATE 1/2, en paralelo con C-02.
- **Governance**: MEDIUM
- **Capabilities existentes relacionadas**: `catalogo-configuracion` (4 requisitos), `agenda-turnos`, `intervalo-y-bloques`, `persistencia-en-memoria`.

---

## 1. Qué pide la ficha (C-07)

Objetivo: que el administrador configure **sillones, prestaciones, disponibilidad de profesionales y bloqueos** por API, validando RN-CF-01..04, y que lo cargado se refleje en la validación de turnos.

Scope declarado en `CHANGES.md`:

- `src/application/configuracion/`: `crearSillon`, `desactivarSillon`, `crearPrestacion` / `actualizarPrestacion`, `definirDisponibilidad` (franjas sin superposición, alineadas a 15'), `crearBloqueo` / `eliminarBloqueo`.
- `src/api/routes/configuracion.ts`:
  - `POST /api/sillones`
  - `POST /api/prestaciones`
  - `PUT /api/prestaciones/:id`
  - `PUT /api/profesionales/:id/disponibilidad`
  - `GET/POST/DELETE /api/bloqueos`
- Permisos: admin todo; recepción bloqueos; odontólogo bloqueos propios (RN-CF-03).
- Tests de aplicación y API.

Fuera de alcance: pantalla de administración (la demo usa el seed), duración por profesional (DD-12), reglas de autogestión configurables (US-090).

Criterios de aceptación:
- Prestación de 20' → 400/409 `RN-CF-01`; de 45' → creada.
- Franjas lunes 9-13 y 12-15 → rechazo `RN-CF-02`.
- Recepcionista que intenta crear un sillón → 403.
- Desactivar un sillón conserva sus turnos e impide crear nuevos (RN-CF-04).

---

## 2. Qué ya existe

### 2.1 Dominio (`src/domain/`)

| Archivo | Estado |
|---|---|
| `configuracion/prestacion.ts:4-21` | `Prestacion { id, codigo, nombre, duracionMin }` + `validarPrestacion` con **RN-CF-01** ya implementada (`entero > 0 && % 15 === 0`), devuelve `Result`. |
| `configuracion/sillon.ts:1-5` | Solo el tipo `Sillon { id, nombre, activo }`. Sin reglas ni validación. |
| `configuracion/profesional.ts:2-17` | Tipos `DiaSemana` (ISO 1..7), `Franja { diaSemana, desde: 'HH:mm', hasta: 'HH:mm' }`, `Profesional { id, nombre, matricula, activo, disponibilidad }`. Sin validación de franjas (**RN-CF-02 ausente**). |
| `configuracion/bloqueo.ts:4-10` | Tipo `Bloqueo { id, intervalo, motivo, profesionalId?, sillonId? }`. Sin validación de intervalo ni de alcance. |
| `shared/intervalo.ts:10-35` | `crearIntervalo` (exige `inicio < fin`), `seSolapan` (semiabierto, RN-AG-01), `crearIntervaloAlineado` (además alinea a 15', RN-AG-03). |
| `shared/bloques.ts:2-14` | `BLOQUE_MIN = 15`, `estaAlineadoA15(fecha)`. |
| `shared/result.ts:1-19` | `Result<T,E>`, `fallo`, `ok`, `ErrorDeRegla { regla, mensaje, dimension?, conflicto? }`. |

Conclusión: **solo RN-CF-01 existe a nivel dominio**. No hay funciones puras para RN-CF-02 (franjas), RN-CF-03 (RBAC; hoy vive en casos de uso) ni RN-CF-04 (baja lógica).

### 2.2 Aplicación (`src/application/`)

- **No existe** la carpeta `src/application/configuracion/`.
- Puertos (`ports/repositorios.ts:44-63`) son **solo lectura**:
  - `SillonRepository`: `listar()`, `buscarPorId()`.
  - `PrestacionRepository`: `listar()`, `buscarPorId()`.
  - `ProfesionalRepository`: `listar()`, `buscarPorId()`.
  - `BloqueoRepository`: `listar()`, `listarEn(rango)`.
- Patrón de caso de uso a imitar: `agenda/crearTurno.ts:46-106` (`deps`, `usuario`, `entrada` → `Result<T, Error…>` con `tipo: 'permiso' | 'entrada' | 'regla'`), RBAC con array de roles, `randomUUID()`, auditoría.
- `agenda/consultarHuecos.ts:55-59` ya filtra `sillones.listar().filter(s => s.activo)` → un sillón inactivo no ofrece huecos. **No** filtra profesional inactivo (non-goal explícito de C-05).

### 2.3 Infraestructura (`src/infrastructure/`)

- Repos en memoria (`memory/sillon-repository.ts`, `prestacion-repository.ts`, `profesional-repository.ts`, `bloqueo-repository.ts`) reciben `readonly items[]` en el constructor y **solo clonan para leer**. No hay `guardar`/`actualizar`/`eliminar`; son inmutables después de construir.
- Seed (`seed/datos-seed.ts:7-43`, `seed/cargar-seed.ts:54-69`):
  - 2 sillones activos (`sillon-1`, `sillon-2`).
  - 5 prestaciones válidas: `control` 30, `orto` 45, `trat` 60, `est` 60, `urg` 30.
  - 2 profesionales activos, lun-vie `09:00-13:00` y `14:00-19:00` (10 franjas c/u).
  - Bloqueo global "reservado urgencias" `18:30-19:00` de lun a vie, 4 semanas desde el lunes del reloj.
- `seed/deps-vacias.ts` arma todo vacío para tests.

### 2.4 API (`src/api/`)

- `app.ts:21-23` monta `catalogoRouter`, `turnosRouter`, `disponibilidadRouter` (importa `odontogramaRouter` pero aún no lo monta: C-10 en curso).
- `routes/catalogo.ts:4-13`: `GET /api/catalogo` (solo lectura, sin rol).
- **No existe** `routes/configuracion.ts` ni el montaje en `app.ts`.
- `middleware/errores.ts:40-67`: `FalloDeRegla` → **409** con `regla`; `ErrorDeEntrada` → **400**; `ErrorDePermiso` → **403**; JSON malformado → 400; resto → 500.
- `middleware/rol-simulado.ts:6-20`: arma `Usuario` desde `X-Usuario`/`X-Rol`, **sin `profesionalId`**. El patrón para resolver el usuario completo está en `routes/turnos.ts:114-118` (busca en `deps.usuarios` por id+rol).

### 2.5 Tests existentes

- `tests/domain/configuracion/prestacion.test.ts`: cubre RN-CF-01 (30/45/15/60 ok; 20/0/-15/22.5/NaN fallan).
- `tests/infrastructure/seed-configuracion.test.ts`: 2 sillones + 2 profesionales activos, disponibilidad lun-vie, 5 prestaciones, bloqueos de urgencias alineados.
- `tests/api/catalogo.test.ts`: catálogo con seed y vacío.
- **No hay** tests de RN-CF-02, RN-CF-03 ni RN-CF-04; no hay `tests/application/configuracion/` ni `tests/api/configuracion.test.ts`.

---

## 3. Reglas aplicables y estado actual

| Regla | Enunciado | Estado | Dónde debería vivir |
|---|---|---|---|
| **RN-CF-01** | `duracionMin` entero > 0 y múltiplo de 15 | ✅ Implementada | `domain/configuracion/prestacion.ts` |
| **RN-CF-02** | Franjas del mismo día no se superponen y están alineadas a 15' | ❌ Falta | Función pura nueva en `domain/configuracion/` |
| **RN-CF-03** | Solo admin configura sillones/prestaciones/horarios; odontólogo bloquea solo lo propio | ❌ Falta (solo existe el patrón RBAC de turnos) | Casos de uso de `application/configuracion/` + resolución de `profesionalId` en la ruta |
| **RN-CF-04** | Desactivar sillón/profesional no borra turnos y **impide crear nuevos** | ⚠️ Parcial: existe el flag `activo`; `crearTurno` **no lo chequea** (crea en sillón/profesional inactivo). `consultarHuecos` sí filtra sillones activos. | Decisión de diseño: `validarNuevoTurno`/`crearTurno` (zonas compartidas) o solo `application/configuracion` |
| **RN-AG-04** | Turnos dentro de franja y fuera de bloqueos | ✅ Implementada en `validarNuevoTurno.ts:85-103` | Se reutiliza; C-07 solo crea datos que la alimentan |
| **RN-AG-03** | Alineación a bloques de 15' | ✅ `crearIntervaloAlineado` | Reutilizable para validar bloqueos |
| **DD-12** | Una duración por prestación | ✅ Respetada en el modelo | — |
| **RN-DA-01** | Datos ficticios | ✅ Seed ficticio | Mantener en tests/ejemplos |

---

## 4. Brechas concretas a cubrir

1. **Dominio**
   - `validarDisponibilidad(franjas)` (RN-CF-02): `desde < hasta`, minutos alineados a 15, sin solapamiento entre franjas del mismo `diaSemana`. (Decidir código de regla para `desde >= hasta`: RN-CF-02).
   - Validación de `Bloqueo` al crear: intervalo válido y alineado (usar `crearIntervaloAlineado`, probablemente código `RN-AG-03`).
   - Posible validación de baja lógica (RN-CF-04) si se decide ponerla en dominio.
   - Archivos nuevos en `src/domain/configuracion/` (zona team lead, ver §5).

2. **Puertos / repositorios en memoria**
   - Extender `SillonRepository`, `PrestacionRepository`, `ProfesionalRepository`, `BloqueoRepository` con escritura: `guardar`, `actualizar`, `eliminar` (o equivalentes).
   - Cambiar los repos en memoria a almacenamiento mutable interno (`Map` como `turno-repository.ts`) manteniendo el clonado defensivo.
   - `deps.ts` no cambia (mismas interfaces).

3. **Aplicación (`src/application/configuracion/`)**
   - `crearSillon`, `desactivarSillon` (baja lógica: `activo=false`, sin borrar turnos).
   - `crearPrestacion`, `actualizarPrestacion` (reutiliza `validarPrestacion`).
   - `definirDisponibilidad` (reemplaza la semana del profesional; valida RN-CF-02).
   - `crearBloqueo`, `eliminarBloqueo`.
   - RBAC RN-CF-03 + auditoría (RN-AU-01) si se considera configuración auditables (la ficha no lo exige; decidir).
   - Errores con el patrón `{ tipo: 'permiso' | 'entrada' | 'regla' | 'no-encontrado' }`.

4. **API (`src/api/routes/configuracion.ts`)**
   - Parseo/validación de cuerpos (`Franja` `'HH:mm'`, `diaSemana` 1..7, intervalo ISO con zona para bloqueos, `motivo` no vacío).
   - `GET /api/bloqueos` (definir filtros: fecha/rango, profesionalId, sillonId).
   - `DELETE /api/bloqueos/:id` (definir si es 204, 200 o 404).
   - Montaje en `app.ts` (+1 import y +1 `app.use`, admitido como compartido aditivo).

5. **Tests**
   - `tests/domain/configuracion/disponibilidad.test.ts` (RN-CF-02, si la validación va a dominio).
   - `tests/application/configuracion/*.test.ts` (casos de uso + RBAC + RN-CF-04).
   - `tests/api/configuracion.test.ts` (201/200/400/403/404/409).

---

## 5. Restricción crítica de Zona (bloqueante de coordinación)

La **Zona** declarada en `CHANGES.md` para C-07 es solo:

```
src/application/configuracion/
src/api/routes/configuracion.ts
tests/application/configuracion/
tests/api/configuracion.test.ts
src/api/app.ts        (compartido aditivo, 1 línea)
```

Pero `.github/CODEOWNERS` asigna al **team lead** (`@zfacundo`) todo:

```
src/domain/                       ← acá va RN-CF-02 y la validación de bloqueo
src/application/ports/            ← acá hay que agregar escritura a los repos
src/infrastructure/               ← acá hay que hacer mutables los repos en memoria
src/domain/agenda/validarNuevoTurno.ts  ← si RN-CF-04 se aplica al crear turno
src/application/agenda/crearTurno.ts    ← idem
```

**No se puede implementar C-07 completo sin tocar archivos fuera de la Zona.** Hay que acordar con el team lead una de estas salidas:

- **(A) Ampliar la Zona de C-07** para incluir `src/domain/configuracion/`, `src/application/ports/repositorios.ts`, `src/infrastructure/memory/{sillon,prestacion,profesional,bloqueo}-repository.ts`, y el chequeo de `activo` en la validación de alta.
- **(B) PR en dos partes**: C-07a (team lead: infra de escritura + validaciones de dominio) y C-07b (Integrante 3: casos de uso + API).
- **(C) Dejar RN-CF-04 fuera de C-07** y abrir un change aparte; pero incumple un criterio de aceptación de la ficha.

También hay que decidir **dónde** se enforcea RN-CF-04 al crear turnos:
- En `validarNuevoTurno` (recibe `sillon`/`profesional` con `activo`) → más puro, pero cambia firma y tests de C-02/C-05.
- En `crearTurno` al resolver entidades → cambio mínimo, pero deja `calcularHuecos` sin chequeo de profesional inactivo.
- Solo en `application/configuracion` al desactivar → no cumple "impide crear nuevos".

---

## 6. Decisiones abiertas para la fase Propose

1. **Capability**: ¿extender `catalogo-configuracion` (modificada) o crear `configuracion-consultorio` (nueva)? Recomendación: **nueva** `configuracion-consultorio` para las mutaciones y RBAC, dejando `catalogo-configuracion` como modelo/seed/consulta intacto.
2. **Zona/infra**: elegir (A), (B) o (C) de §5 y pedir aprobación del team lead.
3. **RN-CF-04**: ubicación del chequeo de `activo` y comportamiento de `GET /api/catalogo` (¿sigue mostrando inactivos? recomendación: sí, con `activo` visible; el filtrado es responsabilidad del consumidor).
4. **Contrato de `PUT /api/profesionales/:id/disponibilidad`**: ¿reemplaza toda la semana (array de `Franja`) o por día? Recomendación: reemplazo total, idempotente.
5. **Contrato de bloqueos**: campos obligatorios, `GET` con filtros, `DELETE` por id y status (204 vs 200), y si el odontólogo solo puede borrar los propios.
6. **Códigos de error**: RN-CF-01/02/03/04 y RN-AG-03 para intervalos de bloqueo. Recordar DD-08: regla → **409**; cuerpo malformado → **400**. Aclarar el "400/409" ambiguo del criterio de aceptación.
7. **Auditoría**: ¿las altas/bajas de configuración generan evento de auditoría? La ficha no lo pide; RN-AU-01 habla de turnos.
8. **IDs**: `randomUUID()` como en `crearTurno`, salvo ids legibles para seed.
9. **Duplicados**: ¿se permiten dos sillones con el mismo nombre o dos prestaciones con el mismo `codigo`? No está especificado.
10. **Efecto de `actualizarPrestacion` sobre turnos existentes**: los turnos guardan `fin`; un cambio de duración afecta solo turnos/huecos futuros. Confirmar que es aceptable.

---

## 7. Diagrama: estado actual y objetivo

```
ACTUAL (solo lectura)
  seed ──> repos en memoria (readonly) ──> GET /api/catalogo
                   │
                   └──> validarNuevoTurno / calcularHuecos
                        (usan disponibilidad, bloqueos, turnos)

OBJETIVO C-07 (escritura + reglas)
  admin/recep/odonto
        │  (RBAC RN-CF-03)
        v
  POST/PUT/DELETE /api/configuracion*  ──> application/configuracion/*
        │                                        │
        │                                        ├─ validarPrestacion     (RN-CF-01, existe)
        │                                        ├─ validarDisponibilidad (RN-CF-02, falta)
        │                                        ├─ validarBloqueo        (RN-AG-03, reutilizar)
        │                                        └─ baja lógica activo=false (RN-CF-04)
        v                                        v
  repos en memoria MUTABLES  <──────────────  guardar/actualizar/eliminar
        │
        └──> GET /api/catalogo, validarNuevoTurno, calcularHuecos
```

---

## 8. Baseline recomendado antes de Apply

No se ejecutó todavía en esta fase. En Apply, como primer paso:

```
npm test
npm run typecheck
openspec validate <change> --strict
```

Registrar el número de tests verdes como línea base (hoy hay 209 tests en verde según el handoff de C-05; C-09/C-10 pueden haber cambiado el número).

---

## 9. Próximo paso

Pasar a **Propose** con el change `configurar-agenda-del-consultorio`, resolviendo primero las decisiones 1-3 de §6 (capability, zona/infra y RN-CF-04), que condicionan el resto del diseño.

---

## 10. Ajuste del Propose (2026-11-24)

Se ajustaron los artefactos del change `configurar-agenda-del-consultorio` a pedido del equipo:

- **Forma vs. regla**: `diaSemana` fuera de 1..7, horas que no son `HH:mm` exacto (`25:00`, `9:00`) y textos (`nombre`/`codigo`/`motivo`) vacíos o solo espacios ahora son **entrada malformada → `400` (`error.tipo: entrada`)** y MUST NOT devolver `409`. Un valor con forma válida pero desalineado (`09:10`), `desde >= hasta` o franjas superpuestas sigue siendo **`409 RN-CF-02`** (o `RN-AG-01`/`RN-AG-03` en bloqueos).
- **Baja idempotente**: `DELETE /api/sillones/:id` sobre un sillón ya inactivo responde `200` con `activo:false`, sin error.
- **Artefactos tocados**: `specs/configuracion-consultorio/spec.md` (requisito "Entrada malformada de configuración", escenarios de espacios, baja idempotente y aclaración de "Franjas sin superposición y alineadas"), `design.md` (D4, D5 y D7) y `tasks.md` (2.2, 3.1-3.4, 5.1-5.3, 5.5).
- **Verificación**: `openspec validate configurar-agenda-del-consultorio --strict` → válido.
