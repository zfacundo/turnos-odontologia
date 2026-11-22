# Discovery — Turnos Odontología

**Fecha**: 2026-11-22
**Fuentes investigadas**: 18 sistemas relevados (Argentina, Latinoamérica e internacionales). Detalle y evidencia en `docs/discovery/informe-discovery.md` y relevamientos en `docs/discovery/research/`.
**Prototipos de referencia del equipo**: `docs/discovery/prototipo/agenda_odontologia.html` (bot de WhatsApp + agenda + registro + lista de espera) y `docs/discovery/prototipo/odontograma-referencia.png` (odontograma "¿Dónde te duele?").

## 1. Problema que resuelve

Los consultorios odontológicos chicos de Argentina (1 a 3 sillones, 1 a 4 odontólogos) manejan la agenda en papel, Excel o WhatsApp a mano. Eso genera choques de profesional y de sillón, huecos que nadie reocupa y ausentismo, y obliga a recepción a confirmar cada turno uno por uno. El relevamiento muestra que casi ningún competidor **demuestra** agenda por sillón (2 de 18, solo declarado) ni prevención de solapamientos (2 de 18, 1 comprobado).

## 2. Usuarios / roles

- **Recepcionista**: crea, cancela y reprograma turnos; da sobreturnos con permiso.
- **Odontólogo**: consulta su agenda diaria/semanal y bloquea horarios.
- **Administrador del consultorio**: configura sillones, prestaciones con su duración y horarios de los profesionales.
- **Paciente**: reserva, confirma, cancela o reprograma por el bot de WhatsApp (simulado) y marca en el odontograma dónde le duele.

## 3. Casos de uso

1. Como recepcionista, quiero crear un turno eligiendo paciente, prestación, profesional y sillón, para no generar choques.
2. Como recepcionista, quiero cancelar o reprogramar un turno, para liberar el horario.
3. Como administrador, quiero configurar la duración de cada prestación y la disponibilidad de cada profesional, para que la agenda calcule los huecos libres.
4. Como odontólogo, quiero ver mi agenda del día y de la semana y bloquear horarios.

## 4. Competidores / soluciones existentes

| Competidor | País | Puntaje B (0-5) | Diferenciadores / por qué importa |
|---|---|---|---|
| DentalSoft | Argentina | 2,50 | Único argentino que declara detección de solapamientos; obras sociales y Mercado Pago; precios publicados (moneda no explícita). |
| AgendaPro | Chile (sitio /ar) | 2,33 | Único con agenda por sillón **y** duración por práctica declaradas; ARS 13.900/mes; Mercado Pago. |
| Simples Dental | Brasil | 2,21 | Agenda "sin conflicto de horarios" según ficha App Store; baja relevancia para Argentina. |
| Dentalink | Chile (módulo AR) | 2,05 | Única documentación de circuitos argentinos (obras sociales) en centro de ayuda; WhatsApp manual comprobado. |
| ClinIA | Argentina | 1,92 | Declara ARCA, PUCO y agenda por consultorio/sillón. |

**Notas**: los cinco anteriores son los recomendados para demo (con Bilog en lugar de Simples Dental por relevancia local). Referencias de UX: Open Dental (Web Sched + lista ASAP), Dentally (portal con reglas de cancelación) y NexHealth (capa de turnos separable con API). Lista completa de 18 sistemas en la sección A del informe.

## 5. Funcionalidades necesarias (MVP)

Núcleo de agenda:
- Profesionales con disponibilidad semanal; sillones/boxes; prestaciones con duración variable.
- Bloqueos de agenda.
- **Crear turno sin solapamientos por profesional y por sillón** (primer change).
- Cancelar y reprogramar (misma validación que crear).
- Estados del turno: reservado, confirmado, cancelado, atendido, ausente.
- Vista diaria y semanal por profesional y por sillón.
- Ficha mínima de paciente (datos ficticios).
- Roles básicos y auditoría de altas, cambios y cancelaciones.

Simuladores (decisión del equipo para demostrar el sistema funcionando; **no** son integraciones reales):
- **WhatsApp simulado**: bot que reserva, confirma, cancela y reprograma contra la agenda real del sistema, según el prototipo `agenda_odontologia.html`.
- **Mercado Pago simulado**: botón "pagar seña" → pantalla falsa que aprueba/rechaza → turno "señado".
- **Obras sociales simulado**: padrón ficticio de 3-4 obras sociales; por número de afiliado devuelve cobertura y % de copago.
- **ARCA simulado**: "factura C" con CAE ficticio mostrada como comprobante.
- **Odontograma**: según `odontograma-referencia.png` — notación FDI en 4 cuadrantes (18-11/21-28 arriba, 48-41/31-38 abajo), 5 caras por pieza; al tocar una pieza se muestra su nombre (p. ej. "16 · Primer molar superior derecho") y opciones de síntoma (dolor al masticar, caries o arreglo roto, dolor que no se va, pieza que falta) y el botón "Agregar pieza al turno". Rojo = a revisar; azul = lo ya hecho (como se marca en la ficha).

## 6. Funcionalidades opcionales

- Lista de espera que ofrece los huecos liberados (presente en el prototipo).
- Reglas de autogestión configurables (anticipación mínima, ventana de cancelación).
- Sobreturno explícito con permiso y registro en auditoría.
- Indicadores (turnos, por WhatsApp, confirmados, libres) como en el prototipo.

## 7. Reglas de negocio

- **R1.** Un turno ocupa el intervalo `[inicio, fin)`; un turno que empieza justo cuando termina otro es válido.
- **R2.** Un turno no puede superponerse con otro del mismo profesional ni del mismo sillón.
- **R3.** La duración la define la prestación (p. ej. control 30 min, tratamiento 60 min, ortodoncia 45 min); la agenda trabaja en bloques de 15 minutos.
- **R4.** Solo se asignan turnos dentro del horario de atención del profesional y fuera de sus bloqueos.
- **R5.** Un paciente no puede tener dos turnos superpuestos.
- **R6.** Cancelar libera el horario y avisa a la lista de espera; el paciente puede cancelar hasta 24 h antes, después solo recepción.
- **R7.** El sobreturno solo lo da recepción o el administrador, queda marcado y se registra en auditoría.

## 8. Integraciones

- **Ninguna integración real en el MVP.** WhatsApp, Mercado Pago, obras sociales y ARCA se implementan como **simuladores internos** con datos ficticios, claramente rotulados como simulación.
- Integraciones reales (WhatsApp Business API, Mercado Pago, padrones de obras sociales, ARCA, Google Calendar) quedan para etapas posteriores.

## 9. Restricciones

- **Stack**: TypeScript + Node para la lógica de dominio, API con Express, tests con Vitest; interfaz HTML/JS basada en el prototipo.
- **Datos**: solo datos ficticios; nunca datos reales de pacientes en el repositorio, ejemplos, tests ni capturas.
- **Equipo**: 6 integrantes (5 + team lead); los changes se reparten de forma equitativa; el team lead controla la rama principal y los PR.
- **Alcance**: Trabajo práctico universitario; el primer change obligatorio pasa por el ciclo OPSX completo.

## 10. Riesgos

- **Conflictos de merge**: 6 personas trabajando en paralelo sobre el núcleo de agenda.
- **Confusión de simuladores con integraciones reales**: deben rotularse como simulación en la interfaz y en la documentación.
- **Crecimiento del alcance**: agenda + bot + 4 simuladores en un TP.
- **Datos de salud**: riesgo de usar datos reales; la regla de datos ficticios es obligatoria.
- **Supuesto sin probar**: que los pacientes del segmento prefieran reservar por bot antes que escribir a mano (no validado con usuarios reales).
- **Supuesto sin probar**: que la agenda por sillón sea un dolor real del segmento (inferido de la ausencia en competidores, no validado con odontólogos).

## 11. Preguntas abiertas

- ¿Hace falta habilitación para la historia clínica electrónica en Argentina (Ley 26.529)?
- ¿Cuál es el costo real de la API de WhatsApp Business para un consultorio chico?
- ¿Cómo se validaría en producción el padrón de afiliados de cada obra social?
- ¿Fecha de entrega y entorno de despliegue (si lo hay)?
- Puntos "No evidenciado" del informe: agenda por sillón comprobada en algún competidor, monedas de DentalSoft y Odonto.ar, cifras de clientes de AgendaPro, recordatorios automáticos de Dentalink y Bilog, emisión ARCA en DentalSoft y AgendaPro.
