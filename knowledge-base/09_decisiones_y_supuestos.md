# Decisiones y Supuestos

## Decisiones documentadas

### DD-01 — Núcleo de agenda como primer change y cimiento del MVP
**Decisión**: el primer change OPSX es "crear turno sin solapamientos por profesional y por sillón"; todo el MVP se apoya en él.
**Contexto**: vacío principal del mercado (informe §5.3.2): solo 2/18 evidencian agenda por sillón y 2/18 prevención de solapamientos; ningún argentino documenta qué pasa con dos turnos en conflicto.
**Alternativas consideradas**: empezar por bot de WhatsApp o reserva online (estándar de mercado, 16/18).
**Justificación**: es el diferencial demostrable y es requisito de la consigna (ciclo OPSX completo).
**Trade-offs aceptados**: la demo vistosa (bot) llega después del núcleo.

### DD-02 — Simuladores internos en lugar de integraciones reales (ajuste 6.4)
**Decisión**: WhatsApp, Mercado Pago, obras sociales y ARCA se implementan como **simuladores internos con datos ficticios**, rotulados como simulación; se suma el odontograma.
**Contexto**: el informe §6.3 dejaba estas integraciones para etapas posteriores; el equipo ajustó (inspección "Ajustar", 2026-11-22) para poder demostrar el sistema de punta a punta.
**Alternativas consideradas**: integraciones reales (costo de Meta por mensaje, credenciales, homologación ARCA); omitirlas por completo.
**Justificación**: muestra el circuito local completo (vacío §5.3.1) sin costo ni riesgo legal.
**Trade-offs aceptados**: riesgo de confusión con integraciones reales → mitigado con rótulos (RN-DA-02); alcance mayor.

### DD-03 — Persistencia en memoria detrás de interfaces de repositorio
**Decisión**: repositorios **en memoria** que implementan interfaces (`TurnoRepository`, etc.), con seed ficticio al iniciar.
**Contexto**: TP universitario, sin entorno de despliegue definido, con foco en la corrección del dominio; 6 personas deben poder correr el proyecto sin instalar una base de datos.
**Alternativas consideradas**: SQLite (persistente, poca infraestructura); PostgreSQL (realista, requiere Docker/servidor); archivo JSON.
**Justificación**: cero instalación, tests rápidos y deterministas, y la interfaz permite cambiar a SQLite/JSON más adelante sin tocar dominio ni casos de uso.
**Trade-offs aceptados**: los datos se pierden al reiniciar (aceptable con seed ficticio); sin concurrencia real (las validaciones se ejecutan de forma síncrona dentro del proceso, sin carreras).

### DD-04 — Dominio puro separado de API y UI (hexagonal liviana)
**Decisión**: `src/domain` no importa Express, I/O ni `Date.now()`; el reloj se inyecta.
**Contexto**: el primer change debe ser testeable como lógica pura de dominio.
**Alternativas consideradas**: lógica en los controladores de Express.
**Justificación**: tests Vitest rápidos y sin servidor; reutilización del mismo motor por recepción, bot y lista de espera.
**Trade-offs aceptados**: algo más de estructura (puertos, casos de uso) para un TP.

### DD-05 — Stack TypeScript + Node + Express + Vitest; UI HTML/JS
**Decisión**: restricción del Discovery §9. UI sin framework, basada en el prototipo `agenda_odontologia.html` (paleta, tipografías Bricolage Grotesque/DM Sans, tema claro/oscuro, panel de registro).
**Justificación**: consigna del equipo; el prototipo ya resuelve la UX.
**Trade-offs aceptados**: sin componentes reutilizables de un framework; se compensa con módulos JS por pantalla.

### DD-06 — Intervalo semiabierto `[inicio, fin)` y bloques de 15 min
**Decisión**: R1 y R3 se encapsulan en un value object `Intervalo` y una función `seSolapan`.
**Justificación**: elimina ambigüedad de turnos consecutivos; 15 min admite 30/45/60 del seed.
**Trade-offs aceptados**: el prototipo dibuja slots de 30 min; la grilla de UI deberá renderizar en 15 min o agrupar.

### DD-07 — Módulos separables para un equipo de 6
**Decisión**: estructura por feature (vertical slices) con puntos compartidos mínimos (`shared`, `ports`, `app.ts`, tokens CSS), y changes repartidos equitativamente entre los 6 integrantes; el team lead controla la rama principal y los PR.
**Contexto**: riesgo "Conflictos de merge: 6 personas trabajando en paralelo sobre el núcleo de agenda" (Discovery §10).
**Justificación**: cada change toca principalmente su carpeta; los simuladores dependen de casos de uso, no del interior del dominio.
**Trade-offs aceptados**: el núcleo de agenda es un cuello de botella inicial (debe cerrarse antes de paralelizar).

### DD-08 — Errores de regla como 409 con código de regla y conflicto
**Decisión**: la API responde `409` con `{ regla: "RN-AG-02", dimension, conflicto }`.
**Justificación**: informe §6.3 pide "mensajes de error que indiquen el turno en conflicto"; documentar reglas públicamente es en sí un diferencial (§5.4.1).

### DD-09 — Autenticación simulada por rol
**Decisión**: selector de usuario/rol en la UI; la autorización por rol sí se aplica y testea.
**Justificación**: TP con datos ficticios; el foco es la agenda. Ver pregunta abierta sobre auth real.

**Ampliación (`panel-admin-agenda`, aprobada 2026-11-25 por el usuario)**: login simulado con token opaco en memoria (8 h, `sessionStorage` en el panel) que convive con `X-Usuario`/`X-Rol`; con `Authorization` se ignoran los headers (S-4). Sin contraseñas, rate limiting ni CORS (S-1, S-9, S-10). Los headers simulados siguen activos (S-6; desactivarlos sería otro change). Historial clínico con mínimo privilegio (S-7) y agenda del panel coloreada por estado (S-8). Detalle: `openspec/changes/panel-admin-agenda/design.md` (S-1..S-10).

### DD-10 — Solo datos ficticios
**Decisión**: nunca datos reales de pacientes en repo, ejemplos, tests ni capturas (RN-DA-01).
**Contexto**: riesgo de datos de salud (Discovery §10); Ley 25.326/26.529.

## Supuestos inferidos

### SU-01 — Pacientes prefieren reservar por bot
**Supuesto**: el segmento prefiere el bot a escribir a mano.
**Origen**: Discovery §10 (supuesto sin probar).
**Riesgo si es falso**: el simulador de WhatsApp aporta poco valor real.
**Cómo validar**: entrevistas a pacientes / consultorios.

### SU-02 — Agenda por sillón es un dolor real
**Supuesto**: los consultorios sufren choques de sillón.
**Origen**: Discovery §10 (inferido de ausencia en competidores, no validado con odontólogos).
**Riesgo si es falso**: el diferencial principal pierde peso.
**Cómo validar**: entrevista con odontólogos de consultorios de 2-3 sillones.

### SU-03 — Un turno usa exactamente un profesional y un sillón
**Origen**: Discovery §3 caso de uso 1 e informe §6.3.5.
**Riesgo si es falso**: prestaciones con asistente/2 sillones requerirían modelo multi-recurso.
**Cómo validar**: consulta con odontólogo.

### SU-04 — Zona horaria única del consultorio (Argentina)
**Origen**: segmento argentino. **Riesgo**: bajo. **Cómo validar**: confirmar con el equipo.

### SU-05 — Duraciones de estética y urgencia
**Supuesto**: Blanqueamiento/Estética 60 min y Urgencia 30 min (no definidos en fuentes).
**Origen**: leyenda del prototipo (tipos `est`, `urg`) sin duración. **Cómo validar**: pregunta abierta al equipo.

### SU-06 — Sobreturno no exime R5 ni R4 (CONFIRMADO por el equipo, 2026-11-22)
**Supuesto**: el sobreturno solo exime del solapamiento por profesional/sillón; el paciente no puede estar en dos turnos y debe ser dentro del horario.
**Origen**: interpretación de R7. **Cómo validar**: pregunta abierta.

### SU-07 — Factura C (sim) se emite sobre turnos atendidos; seña (sim) sobre reservados/confirmados
**Origen**: inferencia del flujo de consultorio. **Cómo validar**: pregunta abierta.

### SU-08 — Persistencia en memoria es aceptable para la entrega
**Origen**: DD-03; confirmado por DD-11 (entrega 2026-11-24, sin despliegue). **Riesgo si es falso**: migrar a SQLite (bajo costo gracias a interfaces).

### DD-11 — Plazo de entrega: martes 2026-11-24
**Decisión**: la entrega es el 2026-11-24 (dos días desde la fundación). El roadmap prioriza changes chicos, independientes y repartidos en 6 integrantes; los simuladores se mantienen mínimos (una pantalla, datos fijos). Sin despliegue: se ejecuta en local siguiendo el README.
**Origen**: respuesta del equipo, 2026-11-22.

### DD-12 — Una duración por prestación
**Decisión**: en el MVP cada prestación tiene una única duración, sin sobrescritura por profesional.
**Por qué**: mantiene chico el primer change y el modelo de Prestación.
**Origen**: respuesta del equipo, 2026-11-22.

### SU-09 — Solo el odontólogo ve y usa el odontograma (CONFIRMADO por el usuario, 2026-11-25)
**Supuesto**: el odontograma lo registra y lo marca "hecho" únicamente el rol `odontologo`, desde el detalle del turno en el panel. Admin, recepción y paciente reciben 403 en `GET`/`PUT /api/turnos/:id/piezas`. Cualquier odontólogo accede a las piezas de cualquier turno (S-2); sin usuario sigue en 403 (S-4).
**Reemplaza**: la matriz anterior (admin y recepción R, paciente C/U) y la HU "como paciente quiero tocar la pieza que me duele".
**Origen**: change `panel-reemplaza-agenda-vieja` (decisiones S-1..S-5). **Riesgo si es falso**: volver a abrir el acceso de lectura a admin (S-3).
