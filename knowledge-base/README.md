# Turnos Odontología — Base de Conocimiento

Base de conocimiento generada (kb-creator, modo `import`) a partir de `docs/discovery/discovery.md` (Discovery aprobado, fuente de verdad), `docs/discovery/informe-discovery.md` (secciones 5 y 6, incl. 6.4) y los prototipos de `docs/discovery/prototipo/`.

## Índice de Archivos

| Archivo | Contenido |
|---|---|
| [01_vision_y_objetivos.md](01_vision_y_objetivos.md) | Problema, competidores prioritarios, vacíos de mercado, objetivos por actor, alcance MVP (incl. simuladores 6.4), fuera de alcance, métricas |
| [02_descripcion_general.md](02_descripcion_general.md) | Stack TS + Node + Express + Vitest, arquitectura general, simuladores (no integraciones reales), API REST |
| [03_actores_y_roles.md](03_actores_y_roles.md) | Recepcionista, Odontólogo, Administrador, Paciente; matriz RBAC; auth simulada |
| [04_modelo_de_datos.md](04_modelo_de_datos.md) | Entidades (Turno, Intervalo, Prestación, Sillón, ...), ERD, mapeo de estados del prototipo, seed ficticio |
| [05_reglas_de_negocio.md](05_reglas_de_negocio.md) | Reglas de agenda R1–R7 (RN-AG-01..07) y derivadas; bot, simuladores, odontograma, auditoría, datos ficticios |
| [06_funcionalidades.md](06_funcionalidades.md) | Épicas e historias (US-010 = primer change "crear turno sin solapamientos") |
| [07_flujos_principales.md](07_flujos_principales.md) | Crear/cancelar/reprogramar turno, bot simulado, recordatorio, urgencia, simuladores, odontograma |
| [08_arquitectura_propuesta.md](08_arquitectura_propuesta.md) | Hexagonal liviana, dominio puro, directorios, fronteras de módulo para 6 integrantes, seguridad, env vars, testing |
| [09_decisiones_y_supuestos.md](09_decisiones_y_supuestos.md) | DD-01..DD-10 (persistencia en memoria, simuladores, dominio puro...) y supuestos |
| [10_preguntas_abiertas.md](10_preguntas_abiertas.md) | Inconsistencias, preguntas del Discovery, puntos "No evidenciado", preguntas de dominio |

## Quick Start para Desarrolladores

1. Entender el dominio → [01](01_vision_y_objetivos.md), [03](03_actores_y_roles.md)
2. Entender los datos → [04](04_modelo_de_datos.md)
3. Entender las reglas → [05](05_reglas_de_negocio.md) (R1–R7 son el corazón)
4. Entender la arquitectura → [02](02_descripcion_general.md), [08](08_arquitectura_propuesta.md)
5. Implementar → [07](07_flujos_principales.md), [06](06_funcionalidades.md)
6. Antes de codificar → [10](10_preguntas_abiertas.md)

## Resumen Ejecutivo

Sistema de turnos para consultorios odontológicos chicos de Argentina cuyo diferencial es una agenda **demostrablemente sin solapamientos por profesional y por sillón** (vacío del mercado: 2 de 18 competidores lo evidencian). El MVP de este TP universitario suma un bot de WhatsApp, Mercado Pago, obras sociales y ARCA como **simuladores internos con datos ficticios** (nunca integraciones reales) y un odontograma FDI. Stack TypeScript + Node + Express + Vitest con dominio puro testeable y persistencia en memoria detrás de interfaces; equipo de 6 con módulos separables. **Nunca datos reales de pacientes.**
