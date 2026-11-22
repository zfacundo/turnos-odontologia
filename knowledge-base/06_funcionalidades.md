# Funcionalidades

Organizadas por **épica** y **historia de usuario** (US-NNN). Prioridad: **MVP** (imprescindible), **SIM** (simulador del ajuste 6.4, parte del MVP), **OPC** (opcional si el tiempo alcanza).

## Épica 1: Configuración del consultorio (MVP)

### US-001 — Gestionar sillones
**Como** administrador **quiero** dar de alta y desactivar sillones **para** que la agenda conozca los recursos físicos.
- [ ] Alta con nombre; listado; desactivar sin borrar turnos (RN-CF-04).
**Reglas**: RN-CF-03, RN-CF-04

### US-002 — Configurar prestaciones con duración
**Como** administrador **quiero** definir cada prestación con su duración **para** que la agenda calcule el fin del turno y los huecos.
- [ ] Duración múltiplo de 15 (rechazo si no).
- [ ] Seed: control 30, ortodoncia 45, tratamiento 60.
**Reglas**: RN-AG-03, RN-CF-01

### US-003 — Configurar disponibilidad del profesional
**Como** administrador **quiero** cargar las franjas semanales de cada profesional **para** que solo se den turnos en su horario.
- [ ] Franjas por día de semana sin superposición (RN-CF-02).
**Reglas**: RN-AG-04, RN-CF-02

### US-004 — Bloquear horarios
**Como** odontólogo (o recepción/admin) **quiero** bloquear horarios (vacaciones, feriado, mantenimiento de sillón, reserva de urgencias) **para** que no se asignen turnos ahí.
- [ ] Bloqueo por profesional, por sillón o global.
**Reglas**: RN-AG-04

## Épica 2: Turnos sin solapamientos (MVP — núcleo)

### US-010 — Crear turno sin solapamientos ⭐ primer change OPSX
**Como** recepcionista **quiero** crear un turno eligiendo paciente, prestación, profesional, sillón e inicio **para** no generar choques.

**Criterios de aceptación**:
- [ ] El fin se calcula como inicio + duración de la prestación (R3).
- [ ] Inicio alineado a bloques de 15 min (R3).
- [ ] Rechaza si se solapa con otro turno activo del mismo profesional (R2), indicando el turno en conflicto.
- [ ] Rechaza si se solapa con otro turno activo del mismo sillón (R2), indicando el turno en conflicto.
- [ ] Acepta un turno que empieza exactamente cuando termina otro (R1).
- [ ] Rechaza fuera del horario del profesional o dentro de un bloqueo (R4).
- [ ] Rechaza si el paciente ya tiene un turno superpuesto (R5).
- [ ] Ignora turnos cancelados (RN-AG-10).
- [ ] Registra evento de auditoría (RN-AU-01).
- [ ] La validación es una función pura de dominio cubierta por tests Vitest sin Express.
**Reglas**: RN-AG-01..05, RN-AG-10..12, RN-AU-01

### US-011 — Cancelar turno
**Como** recepcionista **quiero** cancelar un turno **para** liberar el horario.
- [ ] Estado `cancelado` con motivo y autor; el horario queda libre.
- [ ] Notifica a la lista de espera (si existe el módulo).
- [ ] Paciente solo hasta 24 h antes; recepción siempre.
**Reglas**: RN-AG-06, RN-AU-01

### US-012 — Reprogramar turno
**Como** recepcionista **quiero** mover un turno a otro horario **para** acomodar al paciente sin choques.
- [ ] Misma validación que crear, excluyendo el propio turno.
- [ ] El horario anterior queda libre.
**Reglas**: RN-AG-08, RN-AG-01..05

### US-013 — Cambiar estado del turno
**Como** recepción/odontólogo **quiero** marcar confirmado, atendido o ausente **para** reflejar lo que pasó.
- [ ] Solo transiciones válidas (RN-AG-09).
**Reglas**: RN-AG-09

### US-014 — Ver huecos libres
**Como** recepcionista o bot **quiero** consultar los huecos libres para una prestación/profesional/fecha **para** ofrecer solo horarios válidos.
- [ ] Huecos calculados con el mismo motor que valida la creación.
**Reglas**: RN-AG-01..04, RN-WA-01

## Épica 3: Vistas de agenda (MVP)

### US-020 — Agenda diaria y semanal
**Como** odontólogo/recepcionista **quiero** ver la agenda diaria y semanal filtrable por profesional y por sillón **para** organizar el día.
- [ ] Grilla tipo prototipo (días × horarios), colores por tipo de prestación (control, ortodoncia, tratamiento, estética, urgencia), estado visible ("Sin confirmar", "Confirmó", "Atendido"), ícono de origen WhatsApp, horarios pasados atenuados.
- [ ] Filtro por profesional y por sillón.

### US-021 — Indicadores (OPC)
**Como** administrador **quiero** ver KPIs (turnos, por WhatsApp, confirmados, libres) **para** medir la semana. (Prototipo.)

### US-022 — Registro "Lo que hizo el sistema"
**Como** recepcionista **quiero** ver un registro legible de lo que hizo el sistema **para** entender cambios automáticos (prototipo).

## Épica 4: Pacientes (MVP)

### US-030 — Ficha mínima de paciente
**Como** recepcionista **quiero** registrar nombre, DNI, contacto y obra social (descriptiva) **para** asignar turnos.
- [ ] Solo datos ficticios (RN-DA-01). DNI único.

## Épica 5: Roles y auditoría (MVP)

### US-040 — Roles básicos
**Como** usuario **quiero** operar según mi rol (admin, recepción, odontólogo; paciente vía bot) **para** respetar permisos (ver RBAC en `03_actores_y_roles.md`).

### US-041 — Auditoría de turnos
**Como** administrador **quiero** consultar quién creó, movió o canceló cada turno y cuándo.
**Reglas**: RN-AU-01, RN-AU-02

### US-042 — Sobreturno explícito (OPC)
**Como** recepcionista o administrador **quiero** dar un sobreturno marcado **para** atender un caso excepcional dejando constancia.
- [ ] Rechazado para odontólogo y paciente; marcado y auditado.
**Reglas**: RN-AG-07

## Épica 6: Bot de WhatsApp SIMULADO (SIM)

### US-050 — Reservar por el bot
**Como** paciente **quiero** pedir turno por el bot (menú → tipo de consulta → horarios libres → nombre y DNI) **para** reservar sin llamar.
- [ ] El bot ofrece huecos reales (RN-WA-01); "Ver más días".
- [ ] El turno aparece en la agenda con origen WhatsApp y estado "Sin confirmar".
- [ ] Rótulo "Simulación".

### US-051 — Recordatorio y confirmación 24 h antes
**Como** paciente **quiero** recibir un recordatorio y responder Confirmo / Necesito cambiarlo / Cancelar turno.

### US-052 — Cancelar / reprogramar por el bot
Respeta la ventana de 24 h (RN-AG-06); al cancelar dispara la lista de espera.

### US-053 — Urgencia por el bot
**Como** paciente con dolor fuerte **quiero** obtener el turno de urgencia del día **para** atenderme hoy; la doctora recibe un aviso (simulado).

### US-054 — Hablar con la doctora
Deriva la conversación y genera aviso (toast) para el profesional.

## Épica 7: Simuladores de pago, cobertura y facturación (SIM)

### US-060 — Pagar seña (Mercado Pago SIMULADO)
**Como** paciente **quiero** pagar una seña **para** asegurar mi turno. Pantalla falsa aprueba/rechaza → turno "señado". (RN-SM-01)

### US-061 — Consultar cobertura (Obras sociales SIMULADO)
**Como** recepcionista **quiero** ingresar el nº de afiliado **para** ver cobertura y % de copago del padrón ficticio. (RN-SM-02)

### US-062 — Emitir Factura C (ARCA SIMULADO)
**Como** recepcionista **quiero** emitir una "factura C" con CAE ficticio **para** mostrar el comprobante. (RN-SM-03)

## Épica 8: Odontograma (SIM)

### US-070 — "¿Dónde te duele?"
**Como** paciente **quiero** tocar la pieza que me duele en un odontograma FDI **para** que la doctora llegue sabiendo qué revisar.
- [ ] 4 cuadrantes FDI, 5 caras por pieza.
- [ ] Al tocar: número + nombre ("16 · Primer molar superior derecho") + síntomas.
- [ ] Botón "Agregar pieza N al turno".
- [ ] Rojo = a revisar; azul = hecho.
**Reglas**: RN-OD-01..04

## Épica 9: Lista de espera (OPC)

### US-080 — Ofrecer huecos liberados
**Como** sistema **quiero** ofrecer el hueco liberado a pacientes en espera compatibles **para** reocupar la agenda sin intervención.
- [ ] Ofrecimiento y aceptación visibles en registro y toast ("…tomó el turno que liberó…").
**Reglas**: RN-LE-01..03

## Épica 10: Autogestión configurable (OPC)

### US-090 — Reglas de autogestión
**Como** administrador **quiero** configurar anticipación mínima para reservar y ventana de cancelación **para** adaptar las reglas (por defecto 24 h — R6).
