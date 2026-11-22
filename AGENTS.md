<!-- active-stack:agent-instruction -->
# Turnos Odontología — Instrucciones para Agentes

> Este archivo (y su copia `CLAUDE.md`) es lo PRIMERO que todo agente lee al entrar al repo.
> Generado a partir de `knowledge-base/` y `CHANGES.md`. No editar a mano sin re-sincronizar ambos archivos.

Sistema de gestión de turnos y agenda de pacientes para consultorios odontológicos chicos de Argentina (1-3 sillones, 1-4 odontólogos), con prevención de solapamientos por profesional y por sillón, y simuladores de WhatsApp, Mercado Pago, obras sociales, ARCA y odontograma. Trabajo práctico universitario; entrega 2026-11-24.

---

## Stack Tecnológico

| Capa | Tecnologías | Versión mínima |
|---|---|---|
| Lenguaje | TypeScript (modo `strict`) | 5.x |
| Runtime | Node.js | 20 LTS |
| Dominio | TypeScript puro (sin dependencias de framework ni I/O) | — |
| API | Express | 4.x |
| Persistencia | Repositorios **en memoria** detrás de interfaces (DD-03) | — |
| Tests | Vitest (unitarios de dominio + integración de API con supertest) | 1.x |
| UI | HTML + CSS + JavaScript sin framework, servida como estáticos por Express; estilo del prototipo | — |
| Integraciones | **Ninguna real.** WhatsApp, Mercado Pago, obras sociales y ARCA son simuladores internos | — |

Detalle completo: [knowledge-base/02_descripcion_general.md](knowledge-base/02_descripcion_general.md)

---

## Base de Conocimiento

La fuente de verdad del dominio vive en `knowledge-base/`. **Leé el archivo relevante ANTES de implementar.**

| Archivo | Cuándo leerlo |
|---------|---------------|
| [01_vision_y_objetivos.md](knowledge-base/01_vision_y_objetivos.md) | Propósito, alcance y relación con el Discovery |
| [03_actores_y_roles.md](knowledge-base/03_actores_y_roles.md) | Roles (recepcionista, odontólogo, administrador, paciente) y permisos |
| [04_modelo_de_datos.md](knowledge-base/04_modelo_de_datos.md) | Entidades: turno, profesional, sillón, prestación, paciente, bloqueo |
| [05_reglas_de_negocio.md](knowledge-base/05_reglas_de_negocio.md) | Reglas codificadas (RN-AG-01..07 = R1-R7 de agenda, RN-DA-01 datos ficticios, etc.) |
| [06_funcionalidades.md](knowledge-base/06_funcionalidades.md) | Historias de usuario por épica |
| [07_flujos_principales.md](knowledge-base/07_flujos_principales.md) | Flujos E2E (crear, cancelar, reprogramar, bot, simuladores) |
| [08_arquitectura_propuesta.md](knowledge-base/08_arquitectura_propuesta.md) | Capas, estructura de carpetas, módulos por feature |
| [09_decisiones_y_supuestos.md](knowledge-base/09_decisiones_y_supuestos.md) | Decisiones DD-01..DD-12 y supuestos SU-xx |
| [10_preguntas_abiertas.md](knowledge-base/10_preguntas_abiertas.md) | ⚠️ Inconsistencias a resolver ANTES de codear |

> ⚠️ Las preguntas de prioridad **Alta** de `10_preguntas_abiertas.md` ya están resueltas (2026-11-22). Revisá las de prioridad Media que afecten tu change antes de proponerlo.

Discovery y prototipos: [docs/discovery/discovery.md](docs/discovery/discovery.md), [docs/discovery/prototipo/](docs/discovery/prototipo/).

---

## Skills Disponibles

| Agente | Rol | Skills que carga |
|--------|-----|------------------|
| **Ciclo OPSX** | Explorar, proponer, implementar y archivar cada change | `openspec-explore`, `openspec-propose`, `openspec-apply-change`, `openspec-archive-change`, `openspec-update-change`, `openspec-sync-specs` |
| **Fundación** | Contexto, roadmap e instrucciones | `active-orchestrator`, `discovery-research`, `web-scraper`, `kb-creator`, `roadmap-generator`, `agent-instruction`, `find-skill` |
| **Meta** | Crear o mejorar skills | `skill-creator` |

No hay skills específicas de TypeScript/Express/Vitest instaladas (find-skill solo recomendó; ver `.active-orchestrator-state.json` → `skills.recommended`). Las convenciones de stack viven en las Reglas Duras de abajo.

> Los compact rules de cada skill los resuelve el orquestador desde [.atl/skill-registry.md](.atl/skill-registry.md) (generado por `skill-registry`). Esta tabla solo mapea skill→rol.

---

## Roadmap de Changes

El plan de implementación completo está en [CHANGES.md](CHANGES.md). Resumen:

- **Total**: 12 changes asignados (2 por integrante, 6 integrantes) + 2 opcionales sin responsable (C-13 sobreturno, C-14 lista de espera).
- **Camino crítico**: `C-01 base-proyecto-y-modelo-dominio → C-02 crear-turno-sin-solapamientos → C-03 cambiar-estado-y-cancelar-turno → C-04 reprogramar-turno → C-06 bot-whatsapp-simulado` (C-06 espera además a C-05 y C-08).
- **Primer change**: `C-01` (esqueleto + modelo base, team lead). **Primer change OPSX obligatorio del TP**: `C-02 crear-turno-sin-solapamientos` (team lead).
- C-01 y C-02 son bloqueantes: cuando estén mergeados, los demás trabajan en paralelo, cada uno dentro de su **Zona**.

**Antes de iniciar un item**: leé [CHANGES.md](CHANGES.md), identificá las dependencias del change, su **Zona** y los archivos de "Leer antes".

---

## Reglas Duras

> Reglas **globales** ya definidas en el archivo global de instrucciones del cliente activo (orquestador, governance, TDD, engram): el proyecto las **hereda**. Acá viven solo las reglas **específicas de este proyecto** + las universales que el global no cubra.

Confirmadas por el equipo el 2026-11-22. Son contrato; romperlas es un defecto.

### Flujo de trabajo y git
1. NUNCA push directo a la rama principal (`master`, como pide la consigna) ni force-push → una rama por change `<id>-<slug>` (ej. `C-02-crear-turno-sin-solapamientos`), PR con la plantilla `.github/pull_request_template.md`, el team lead mergea.
2. NUNCA commits sin formato → conventional commits con el slug del change como scope (ej. `feat(crear-turno-sin-solapamientos): validar solapamiento por sillón`).
3. NUNCA commitear secretos, `.env` ni credenciales.

### Stack TypeScript
4. NUNCA usar `any` → `tsconfig` en modo `strict`; usar `unknown` + narrowing.
5. NUNCA importar Express, `fs` ni llamar a `Date.now()`/`new Date()` sin argumentos en `src/domain/` → el dominio es puro; la hora llega por un `Clock` inyectado.
6. NUNCA comparar el fin de un turno con `<=` → los intervalos son `[inicio, fin)` (un turno que empieza cuando termina otro es válido); zona horaria `America/Argentina/Buenos_Aires`; fechas fijas en los tests.
7. NUNCA mockear el dominio ni los repositorios → usar los repositorios en memoria reales; solo se mockea/fija el `Clock`.
8. Cada escenario del spec tiene al menos un test Vitest, con nombre en formato dado / cuando / entonces.

### Dominio y equipo
9. NUNCA datos reales de pacientes (nombres, DNI, teléfonos) en código, tests, ejemplos, seeds ni capturas → datos ficticios evidentes (ej. DNI 99.xxx.xxx).
10. NUNCA llamadas de red reales a WhatsApp, Mercado Pago, ARCA ni padrones de obras sociales → todo local y rotulado «SIMULACIÓN» en la UI y en la respuesta de la API.
11. NUNCA editar fuera de la **Zona** del propio change (ver CHANGES.md y `.github/CODEOWNERS`) → los archivos compartidos solo se tocan de forma aditiva y con revisión del team lead.
12. NUNCA inventar en Apply algo que no está en el spec aprobado → volver a Propose y ajustar el spec.
13. Violación de una regla de negocio → la API responde `409` con el código de la regla (`RN-AG-0x`) y el turno en conflicto (DD-08).

---

## Flujo de Trabajo

```
1. Leer la KB relevante (knowledge-base/)          → entender el dominio
2. Identificar el change en CHANGES.md             → respetar dependencias y Zona
3. /opsx:explore → /opsx:propose                    → spec con escenarios dado/cuando/entonces (feliz, error, borde)
4. /opsx:apply con TDD estricto                     → test rojo → verde → refactor, solo lo del spec
5. Verify: npm test en verde (sin rojo no se archiva)
6. PR con la plantilla → revisión → merge → /opsx:archive
```

Aplicar TODAS las reglas duras en cada paso. Ante conflicto entre la KB y este archivo, las reglas duras prevalecen.
<!-- /active-stack:agent-instruction -->

<!-- active-stack:team-mode -->
## Reglas de equipo

Proyecto de equipo: la configuración vive en `.active-stack/team.json`.

- Al iniciar la sesión, si existe `.active-stack/team.json`, usá la skill `active-delivery` para identificar a la persona y mostrar «qué me toca». Detalle en las `references/` de esa skill.
- Una rama y un worktree por ficha: `<id>-slug`. Nunca dos agentes en la misma rama o carpeta.
- Nada directo a `main`. PR chicos. Commit, push y PR solo con autorización de la persona.
- No inventes nombres ni cuentas de integrantes: lo que falte queda pendiente hasta que el equipo lo complete.

**Si la skill `active-delivery` no está disponible en este cliente**, aplicá la misma convención a mano:

1. Una rama por ficha (`<id>-slug`) creada desde la rama principal actualizada.
2. Todo cambio entra por pull request; sin push a `main` ni force-push.
3. Al terminar, dejá el handoff en `knowledge-base/entrega/<id>.md`: qué se hizo, cómo se verificó, qué sigue y qué decisiones quedan abiertas.
<!-- /active-stack:team-mode -->
