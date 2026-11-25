# Reglas de Negocio

Cada regla tiene un código `RN-{DOMINIO}-{NN}`. Las reglas de agenda conservan su código del Discovery (R1–R7) para trazabilidad con `docs/discovery/discovery.md` §7.

## Dominio: Agenda / Turnos (RN-AG) — reglas R1–R7 del Discovery

- **RN-AG-01 (R1) — Intervalo semiabierto.** Un turno ocupa el intervalo `[inicio, fin)`. Un turno que empieza justo cuando termina otro es **válido** (turnos consecutivos "back-to-back" no se solapan). Formalmente, dos intervalos A y B se solapan sii `A.inicio < B.fin && B.inicio < A.fin`.
- **RN-AG-02 (R2) — Sin solapamiento por profesional ni por sillón.** Un turno no puede superponerse con otro turno activo (no cancelado) del **mismo profesional**, ni con otro turno activo del **mismo sillón**. Se valida en **ambas dimensiones**; el error debe indicar el turno en conflicto y la dimensión (profesional/sillón).
- **RN-AG-03 (R3) — Duración por prestación y bloques de 15 min.** La duración la define la prestación (p. ej. control 30 min, tratamiento 60 min, ortodoncia 45 min); `fin = inicio + duración`. La agenda trabaja en **bloques de 15 minutos**: el inicio debe estar alineado a :00, :15, :30 o :45 y toda duración es múltiplo de 15.
- **RN-AG-04 (R4) — Horario de atención y bloqueos.** Solo se asignan turnos **completamente dentro** del horario de atención del profesional (alguna franja de su disponibilidad para ese día contiene `[inicio, fin)`) y **fuera de sus bloqueos** (y de bloqueos del sillón o globales del consultorio).
- **RN-AG-05 (R5) — Paciente sin turnos superpuestos.** Un paciente no puede tener dos turnos activos superpuestos (misma semántica `[inicio, fin)`).
- **RN-AG-06 (R6) — Cancelación.** Cancelar **libera** el horario (profesional y sillón) y **avisa a la lista de espera**. El **paciente** puede cancelar hasta **24 h antes** del inicio; después, solo **recepción** (o administrador) puede cancelar. El turno cancelado se conserva con estado `cancelado`, motivo y autor.
- **RN-AG-07 (R7) — Sobreturno.** El sobreturno (turno que se superpone deliberadamente) **solo** lo da **recepción o el administrador**; queda **marcado** (`esSobreturno = true`) y se registra en **auditoría**. El odontólogo y el paciente no pueden dar sobreturnos. Un sobreturno exime de RN-AG-02 únicamente; RN-AG-03 sigue aplicando. **Suposición:** también debe respetar RN-AG-05 (un paciente no puede estar en dos turnos a la vez) — ver preguntas abiertas.

Reglas derivadas:
- **RN-AG-08 — Reprogramar = revalidar.** Reprogramar aplica la misma validación que crear (RN-AG-01..05), excluyendo al propio turno de la comparación; el horario anterior queda libre (y dispara RN-AG-06 lista de espera). La ventana de 24 h para el paciente aplica igual que en cancelar.
- **RN-AG-09 — Estados válidos.** Estados: `reservado`, `confirmado`, `cancelado`, `atendido`, `ausente`. Transiciones: `reservado → confirmado | cancelado | ausente | atendido`; `confirmado → cancelado | atendido | ausente`; `cancelado`, `atendido`, `ausente` son finales.
- **RN-AG-10 — Turnos cancelados no ocupan.** Solo los turnos en estado `reservado` o `confirmado` participan de las validaciones de solapamiento.
- **RN-AG-11 — Fin calculado.** El cliente no envía `fin`; el sistema lo calcula a partir de la prestación (y de la duración por profesional si existe).
- **RN-AG-12 — Validación pura.** Toda regla RN-AG-01..07 se implementa como función pura del dominio (entradas: turno candidato + turnos existentes + disponibilidad + bloqueos + rol), sin acceso a I/O, para ser testeable con Vitest.

## Dominio: Configuración (RN-CF)

- **RN-CF-01** — La duración de una prestación es > 0 y múltiplo de 15 min.
- **RN-CF-02** — Las franjas de disponibilidad de un profesional para un mismo día no se superponen y están alineadas a 15 min.
- **RN-CF-03** — Solo el administrador configura sillones, prestaciones y horarios de profesionales; el odontólogo puede bloquear sus propios horarios.
- **RN-CF-04** — Desactivar un sillón/profesional no borra turnos existentes; impide crear nuevos.

## Dominio: Lista de espera (RN-LE) — opcional

- **RN-LE-01** — Al liberarse un hueco (cancelación o reprogramación) se ofrece a pacientes en espera **compatibles** con la prestación, el profesional y la duración del hueco, en orden de antigüedad.
- **RN-LE-02** — Si el paciente acepta, el turno se crea con la validación completa (RN-AG); si el hueco ya fue tomado, se informa y se ofrece otro.
- **RN-LE-03** — Cada ofrecimiento y aceptación queda en el registro del sistema.

## Dominio: Bot WhatsApp simulado (RN-WA)

- **RN-WA-01** — El bot **solo ofrece huecos libres** calculados por el motor de agenda real (nunca una lista estática).
- **RN-WA-02** — El bot reserva, confirma, cancela y reprograma invocando los **mismos casos de uso** que la recepción; aplica la ventana de 24 h (RN-AG-06).
- **RN-WA-03** — El recordatorio se "envía" 24 h antes del turno (simulado, visible en el chat/registro) y permite Confirmar / Cambiar / Cancelar.
- **RN-WA-04** — La interfaz del bot muestra siempre el rótulo **"Simulación — no es WhatsApp real"**.

## Dominio: Simuladores de pago, cobertura y facturación (RN-SM)

- **RN-SM-01** — Mercado Pago simulado: "pagar seña" abre una pantalla falsa que aprueba o rechaza; si aprueba, el turno queda **señado**; si rechaza, el turno no cambia.
- **RN-SM-02** — Obras sociales simulado: con un número de afiliado del padrón ficticio (3-4 obras sociales) devuelve cobertura y % de copago; número inexistente → "afiliado no encontrado".
- **RN-SM-03** — ARCA simulado: emite "Factura C" con **CAE ficticio** y la muestra como comprobante. **Suposición:** se emite para turnos `atendido`.
- **RN-SM-04** — Ningún simulador realiza llamadas de red a servicios externos ni usa credenciales reales. Todos se rotulan "SIMULACIÓN" en UI y documentación.

## Dominio: Odontograma (RN-OD)

- **RN-OD-01** — Notación **FDI** en 4 cuadrantes: superior derecho 18-11, superior izquierdo 21-28, inferior izquierdo 31-38, inferior derecho 48-41; **5 caras** por pieza.
- **RN-OD-02** — Al tocar una pieza se muestra su nombre (p. ej. "16 · Primer molar superior derecho") y opciones de síntoma: dolor al masticar, caries o arreglo roto, dolor que no se va (posible conducto), pieza que falta (implante).
- **RN-OD-03** — El botón **"Agregar pieza N al turno"** asocia la pieza (y síntomas) al turno del paciente.
- **RN-OD-04** — Colores: **rojo = pieza a revisar**; **azul = lo que ya está hecho** (como se marca en la ficha).

## Dominio: Auditoría (RN-AU)

- **RN-AU-01** — Cada alta, modificación, cancelación, reprogramación y sobreturno de turno genera un evento de auditoría inmutable con usuario, rol, fecha/hora y detalle antes/después.
- **RN-AU-02** — La auditoría solo se lee (admin, recepción); no se edita ni borra.

## Dominio: Historial clínico simple (RN-HC) — change `panel-admin-agenda`

- **RN-HC-01** — Una entrada de historial puede vincular un turno solo si el turno existe y pertenece al mismo paciente; si no, la API responde `409` con `RN-HC-01`.
- **RN-HC-02** — La fecha de una entrada no puede ser posterior al instante del reloj (`fecha <= ahora` es válido); si lo es, la API responde `409` con `RN-HC-02`.
- El historial es de solo inserción (sin editar ni borrar; una corrección es una entrada nueva), ficticio (`simulado: true`) y **no** es una historia clínica electrónica legal (Ley 26.529 sigue abierta). Lectura: admin y odontólogo; alta: solo odontólogo con su propio `profesionalId`; recepción sin acceso (S-7). La auditoría (`historia-crear`, `historia-consultar`) nunca guarda procedimiento ni notas.

## Dominio: Datos (RN-DA) — Excepciones globales

- **RN-DA-01** — **Nunca almacenar datos reales de pacientes** en el repositorio, ejemplos, tests, seeds, fixtures ni capturas. Solo datos ficticios.
- **RN-DA-02** — Los simuladores se rotulan como simulación en la interfaz y en la documentación; nunca se presentan como integraciones reales.
- **RN-DA-03** — Fechas/horas se manejan en zona horaria del consultorio (`America/Argentina/Buenos_Aires`). **Suposición** — ver preguntas abiertas.
