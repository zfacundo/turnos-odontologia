# Visión y Objetivos

> Fuentes: `docs/discovery/discovery.md` (Discovery aprobado de 11 puntos, fuente de verdad), `docs/discovery/informe-discovery.md` (secciones 1, 5 y 6, incluida 6.4), prototipos en `docs/discovery/prototipo/`.

## Propósito del sistema

**Turnos Odontología** es un sistema de gestión de turnos para consultorios odontológicos chicos de Argentina (1 a 3 sillones, 1 a 4 odontólogos) cuyo núcleo es una **agenda demostrablemente correcta**: cada turno ocupa a la vez un profesional, un sillón y una duración derivada de la prestación, y el sistema impide los solapamientos en ambas dimensiones.

Hoy estos consultorios manejan la agenda en papel, Excel o WhatsApp a mano. Eso genera choques de profesional y de sillón, huecos que nadie reocupa y ausentismo, y obliga a recepción a confirmar cada turno uno por uno. El relevamiento de 18 sistemas del mercado muestra que casi ningún competidor **demuestra** agenda por sillón (2 de 18, solo declarado) ni prevención de solapamientos (2 de 18, 1 comprobado). El sistema apunta exactamente a ese vacío.

Contexto: es un **Trabajo Práctico universitario** (Desarrollo de Software — Trabajo Global) desarrollado por un equipo de 6 integrantes (5 + team lead) con flujo OPSX. Todos los datos son **ficticios**.

## Contexto de mercado (resumen del Discovery)

| Competidor prioritario | País | Puntaje B (0-5) | Por qué importa |
|---|---|---|---|
| DentalSoft | Argentina | 2,50 | Único argentino que declara detección de solapamientos; obras sociales y Mercado Pago; precios publicados (moneda no explícita). |
| AgendaPro | Chile (sitio /ar) | 2,33 | Único con agenda por sillón **y** duración por práctica declaradas; ARS 13.900/mes; Mercado Pago. |
| Dentalink | Chile (módulo AR) | 2,05 | Única documentación pública de circuitos argentinos (obras sociales); WhatsApp manual comprobado. |
| ClinIA | Argentina | 1,92 | Declara ARCA, PUCO y agenda por consultorio/sillón. |
| Bilog | Argentina | 1,36 | Mayor adopción argentina declarada; reserva y cancelación online. |

Simples Dental (Brasil, 2,21) quedó 3.º en la matriz pero se reemplaza por Bilog en la lista de demo por relevancia local. Referencias de UX: **Open Dental** (Web Sched + lista ASAP), **Dentally** (portal con reglas de cancelación) y **NexHealth** (capa de turnos separable con API).

**Vacíos del mercado argentino que el sistema ataca** (informe §5.3):
1. El motor de agenda es una caja negra: nadie documenta qué ocurre cuando dos turnos compiten por el mismo profesional o sillón.
2. Lista de espera ausente en productos argentinos y latinoamericanos.
3. Autogestión limitada del paciente (reglas de cancelación/reprogramación).
4. Ningún sistema combina obras sociales + Mercado Pago + ARCA + reserva online + WhatsApp automático (el MVP lo **simula** para demostrar el circuito).
5. Trazabilidad / cumplimiento poco explícitos (auditoría de turnos desde el diseño).

## Objetivos por actor

| Actor | Objetivo principal | Objetivos secundarios |
|---|---|---|
| Recepcionista | Crear turnos sin choques de profesional ni de sillón | Cancelar y reprogramar liberando el horario; dar sobreturnos con permiso; ver la lista de espera |
| Odontólogo | Ver su agenda diaria y semanal | Bloquear horarios; registrar en el odontograma qué pieza le duele al paciente |
| Administrador del consultorio | Configurar sillones, prestaciones (duración) y horarios de profesionales | Consultar auditoría e indicadores |
| Paciente | Reservar, confirmar, cancelar o reprogramar por el bot de WhatsApp (simulado) | Pagar seña (simulado); consultar cobertura de obra social (simulado) |

## Alcance v1.0 (MVP del TP)

Núcleo de agenda (imprescindible):
- Profesionales con disponibilidad semanal; sillones/boxes; prestaciones con duración variable.
- Bloqueos de agenda (feriados, vacaciones, mantenimiento de sillón).
- **Crear turno sin solapamientos por profesional y por sillón** — **primer change OPSX obligatorio**.
- Cancelar y reprogramar (reprogramar aplica la misma validación que crear).
- Estados del turno: reservado, confirmado, cancelado, atendido, ausente.
- Vista diaria y semanal por profesional y por sillón.
- Ficha mínima de paciente (datos ficticios).
- Roles básicos y auditoría de altas, cambios y cancelaciones.

Simuladores (ajuste del equipo, informe §6.4 — **no son integraciones reales**, se rotulan como simulación):
- **WhatsApp simulado**: bot que reserva, confirma, cancela y reprograma contra la agenda real del sistema (prototipo `agenda_odontologia.html`).
- **Mercado Pago simulado**: "pagar seña" → pantalla falsa que aprueba/rechaza → turno "señado".
- **Obras sociales simulado**: padrón ficticio de 3-4 obras sociales; por número de afiliado devuelve cobertura y % de copago.
- **ARCA simulado**: "factura C" con CAE ficticio mostrada como comprobante.
- **Odontograma**: FDI en 4 cuadrantes, 5 caras por pieza, "Agregar pieza al turno" (referencia `odontograma-referencia.png`).

Opcionales (si el tiempo lo permite, en este orden de prioridad del informe):
- Lista de espera que ofrece los huecos liberados.
- Reglas de autogestión configurables (anticipación mínima, ventana de cancelación).
- Sobreturno explícito con permiso y registro en auditoría.
- Indicadores (turnos, por WhatsApp, confirmados, libres) como en el prototipo.

## Fuera de alcance

- **Integraciones reales**: WhatsApp Business API, Mercado Pago, padrones de obras sociales, ARCA, Google Calendar (etapas posteriores).
- Historia clínica completa, presupuestos y planes de tratamiento (el odontograma del MVP es solo la selección de pieza para el turno).
- Liquidaciones a obras sociales y nomenclador.
- Múltiples sucursales con agenda consolidada.
- Reportes avanzados de ocupación por sillón y ausentismo.
- API pública de turnos para terceros.
- Cumplimiento formal de Ley 25.326 y Ley 26.529 (a analizar con asesoramiento).
- **Datos reales de pacientes**: nunca, en ninguna parte (repo, ejemplos, tests, capturas).

## Métricas de éxito

- 0 turnos solapados por profesional o por sillón creados por la API (salvo sobreturno explícito auditado), demostrado por tests de dominio en Vitest.
- 100 % de las reglas R1–R7 cubiertas por tests automatizados.
- Demo de punta a punta: reserva por bot simulado → recordatorio/confirmación → cancelación → reocupación por lista de espera, reflejado en la agenda y en el registro del sistema.
- Los 4 simuladores visibles en la UI con rótulo explícito de "Simulación".
- Primer change ("crear turno sin solapamientos") completó el ciclo OPSX (explore → propose → apply → archive).
- Changes repartidos de forma equitativa entre los 6 integrantes.
