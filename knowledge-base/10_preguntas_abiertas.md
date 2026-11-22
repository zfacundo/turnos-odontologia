# Preguntas Abiertas

## Inconsistencias detectadas

### IN-01 — Duración de "control"
**Documento A dice**: `informe-discovery.md` §6.3.3 — "control 20 min, endodoncia 60 min".
**Documento B dice**: `discovery.md` §7 R3 — "control 30 min, tratamiento 60 min, ortodoncia 45 min"; además 20 min no es múltiplo de 15.
**Impacto**: seed y tests de duración.
**Resolución propuesta**: adoptar el Discovery aprobado (30 min), que es la fuente de verdad y es compatible con bloques de 15 min.

### IN-02 — Roles
**Documento A dice**: informe §6.3.11 — "Roles básicos (administrativo, profesional)".
**Documento B dice**: discovery §2 — Recepcionista, Odontólogo, Administrador del consultorio, Paciente.
**Impacto**: matriz RBAC.
**Resolución propuesta**: adoptar los 4 roles del Discovery (aplicada en `03_actores_y_roles.md`).

### IN-03 — Odontograma en el MVP
**Documento A dice**: informe §6.3 lo lista en "Etapas posteriores".
**Documento B dice**: informe §6.4 y discovery §5 lo suman al MVP.
**Resolución propuesta**: prevalece el ajuste 6.4 (MVP incluye odontograma de selección de pieza para el turno, no historia clínica completa).

### IN-04 — Estado "señado"
**Documento A dice**: discovery §5 — el pago simulado deja el turno "señado".
**Documento B dice**: discovery §5 — estados del turno: reservado, confirmado, cancelado, atendido, ausente (sin "señado").
**Impacto**: máquina de estados.
**Resolución propuesta**: modelar "señado" como **marca** (`senado: boolean`) independiente del estado, no como estado nuevo.

### IN-05 — Granularidad de la grilla del prototipo
**Documento A dice**: prototipo `agenda_odontologia.html` usa slots de 30 min y un solo profesional ("Dra. [Apellido]"), sin sillones.
**Documento B dice**: R3 bloques de 15 min; agenda por profesional **y** por sillón.
**Resolución propuesta**: el prototipo es referencia visual; la UI real renderiza bloques de 15 min y agrega filtros por profesional/sillón.

### IN-06 — Ventana de cancelación fija vs configurable
**Documento A dice**: R6 — paciente hasta 24 h antes.
**Documento B dice**: opcional "reglas de autogestión configurables (ventana de cancelación)".
**Resolución propuesta**: 24 h por defecto; configurable solo si se implementa la funcionalidad opcional.

## Preguntas abiertas (priorizadas)

### Del Discovery (§11)

| Prioridad | Pregunta | Bloquea | Decisor |
|---|---|---|---|
| ~~Alta~~ Resuelta 2026-11-22 | ¿Fecha de entrega y entorno de despliegue? → **Entrega: martes 2026-11-24.** Sin entorno de despliegue (se corre local). Ver DD-11. | Planificación del roadmap; DD-03 persistencia | Equipo |
| Media | ¿Hace falta habilitación para la historia clínica electrónica en Argentina (Ley 26.529)? | Etapas posteriores (HCE real); alcance del odontograma | Equipo + asesoramiento |
| Baja | ¿Cuál es el costo real de la API de WhatsApp Business para un consultorio chico? | Integración real post-MVP | Equipo |
| Baja | ¿Cómo se validaría en producción el padrón de afiliados de cada obra social? | Integración real post-MVP | Equipo |

### Puntos "No evidenciado" del informe (Discovery §11) — a verificar en demos / verificación manual

| Prioridad | Punto no evidenciado | Fuente a verificar | Decisor |
|---|---|---|---|
| Media | Agenda por sillón **comprobada** en algún competidor (AgendaPro y ClinIA solo la declaran [Comercial]) | Demos de AgendaPro y ClinIA | Equipo |
| Baja | Moneda de los precios de **DentalSoft** (no explícita; inferida ARS) | dentalsoft.com.ar (verificación fila 1) | Equipo |
| Baja | Moneda de los precios de **Odonto.ar** (rotulada "USD/aprox. ARS") | odonto.ar | Equipo |
| Baja | Cifras de clientes de **AgendaPro** (contradictorias: +30.000 vs +10.000 clínicas; sin desglose Argentina) | Demo AgendaPro | Equipo |
| Baja | Recordatorios **automáticos** de **Dentalink** (solo manual comprobado) | Centro de ayuda / demo | Equipo |
| Baja | Recordatorios **automáticos** de **Bilog** ("con un clic"; automatización no descrita) | Demo Bilog | Equipo |
| Baja | Emisión **ARCA** en **DentalSoft** | Demo DentalSoft | Equipo |
| Baja | Emisión **ARCA** en **AgendaPro** (facturación sin mención de ARCA) | Demo AgendaPro | Equipo |

Pendientes manuales de la fase discovery (estado del orquestador): verificación personal de 5+ fuentes (informe §7), integrantes en la portada, versión PDF del informe.

### Producto / dominio (detectadas al armar la KB)

| Prioridad | Pregunta | Bloquea | Decisor |
|---|---|---|---|
| ~~Alta~~ Resuelta 2026-11-22 | ¿El sobreturno exime también de R4 o R5? → **No.** Solo habilita superponer profesional/sillón (R2); R4 y R5 se siguen validando. SU-06 confirmado. | Change de sobreturno | Equipo |
| ~~Alta~~ Resuelta 2026-11-22 | ¿Duración distinta por profesional para una misma prestación? → **No en el MVP:** una duración por prestación. Ver DD-12. | Modelo de Prestación / primer change | Equipo |
| Media | Duración de Estética/Blanqueamiento y Urgencia (supuesto SU-05: 60 y 30 min) | Seed | Equipo |
| Media | ¿El turno de urgencia del día es un bloqueo "reservado urgencias" que el bot libera, o un sillón/horario dedicado? | Flujo urgencia | Equipo |
| Media | ¿Cuándo se emite la factura C simulada (turno atendido?) y cuándo se puede pagar seña (reservado/confirmado?) — SU-07 | Simuladores MP/ARCA | Equipo |
| Media | ¿Pasado el turno sin marcar, pasa a "ausente" automáticamente o manualmente? | Estados | Equipo |
| Media | ¿El paciente también puede reprogramar por el bot dentro de las 24 h previas? (supuesto: misma ventana que cancelar) | RN-AG-08 / bot | Equipo |
| Baja | ¿Se requiere autenticación real o alcanza el selector de rol simulado (DD-09)? | Seguridad | Team lead / cátedra |
| Baja | ¿Criterio de prioridad de la lista de espera (antigüedad vs compatibilidad)? | Lista de espera | Equipo |
| Baja | Versiones mínimas de Node/TypeScript/Express/Vitest | Setup del repo | Team lead |
| Baja | ¿Librería de validación de input (zod) o validación manual? | API | Equipo |

### Discovery técnico (kb.discovery)

Todos los campos de `kb.discovery` pudieron inferirse con confianza de las fuentes; no hay campos de baja confianza.
