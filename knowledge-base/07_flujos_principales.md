# Flujos Principales

## Flujo 1: Crear turno sin solapamientos (primer change)

**Disparador**: recepción confirma el formulario de nuevo turno (o el bot simulado elige un hueco).
**Actor**: Recepcionista (o Paciente vía bot simulado).

**Pasos**:
1. UI envía `POST /api/turnos` con `{ pacienteId, prestacionId, profesionalId, sillonId, inicio, sobreturno? }` y headers de rol.
2. API valida forma del input (400 si falta algo) y llama al caso de uso `crearTurno`.
3. Caso de uso carga del repositorio: prestación, disponibilidad del profesional, bloqueos relevantes y turnos activos del día para el profesional, el sillón y el paciente.
4. **Dominio puro** `validarNuevoTurno(candidato, contexto)`:
   1. Calcula `fin = inicio + duración` (R3); verifica alineación a 15 min (R3).
   2. Verifica que `[inicio, fin)` esté dentro de alguna franja del profesional y fuera de bloqueos (R4).
   3. Busca solapamiento con turnos del mismo profesional (R2) usando `[inicio, fin)` (R1).
   4. Busca solapamiento con turnos del mismo sillón (R2).
   5. Busca solapamiento con turnos del paciente (R5).
   6. Si hay solapamiento por profesional/sillón y `sobreturno=true`: permitido solo si rol ∈ {recepción, admin} (R7).
   7. Devuelve `Ok(turno)` o `Error({ regla, conflicto })`.
5. Si OK: el repositorio guarda el turno (`reservado`), se registra auditoría y entrada en el registro del sistema.
6. API responde `201` con el turno; la UI refresca la agenda (efecto "flash" del prototipo).

```
Recepción → UI → API ─→ crearTurno ─→ Repos (leer contexto)
                              │
                              └→ Dominio.validarNuevoTurno (puro)
                              ←  Ok | Error(regla, conflicto)
                         ─→ Repo.guardar + Auditoría
UI ← 201 turno | 409 {regla:"RN-AG-02", dimension:"sillon", conflicto:{...}}
```

**Casos de error**:
- Solapa profesional/sillón → `409` con regla RN-AG-02, dimensión y turno en conflicto.
- Fuera de horario o en bloqueo → `409` RN-AG-04.
- Paciente con turno superpuesto → `409` RN-AG-05.
- Inicio no alineado → `400`/`409` RN-AG-03.
- Sobreturno por rol no autorizado → `403` RN-AG-07.
- Back-to-back (empieza cuando termina otro) → **aceptado** (R1).

## Flujo 2: Cancelar turno y reocupar con lista de espera

**Disparador**: recepción cancela, o el paciente elige "Cancelar turno" en el bot.
**Actor**: Recepcionista / Paciente (bot simulado).

**Pasos**:
1. `POST /api/turnos/:id/cancelar` con motivo.
2. Si el actor es paciente y faltan < 24 h → rechazo ("comunicate con recepción") (R6).
3. Turno → `cancelado`; deja de ocupar profesional y sillón; auditoría.
4. Registro: "X canceló. Se liberó <día · hora>".
5. (OPC) Lista de espera: se busca paciente compatible (RN-LE-01); el bot simulado le ofrece el hueco; registro "Lista de espera: el bot le ofreció el turno a …".
6. Si acepta → Flujo 1 con el mismo hueco; registro "… aceptó. El horario volvió a ocuparse solo"; toast "Agenda actualizada".

**Casos de error**: turno ya cancelado/atendido → 409 (RN-AG-09); hueco tomado entre ofrecimiento y aceptación → se informa y se ofrece otro (RN-LE-02).

## Flujo 3: Reprogramar turno

1. `POST /api/turnos/:id/reprogramar` con nuevo `inicio` (y opcionalmente profesional/sillón).
2. Dominio revalida como en Flujo 1 excluyendo el propio turno (RN-AG-08).
3. Si OK: se actualiza; el horario anterior queda libre (puede disparar lista de espera); auditoría con antes/después.

## Flujo 4: Reserva por bot de WhatsApp SIMULADO (escena 1 del prototipo)

1. Paciente: "Hola! Quería sacar un turno" → menú (Pedir un turno / Ver o cambiar mi turno / Hablar con la doctora).
2. Elige tipo de consulta (Control y limpieza, Ortodoncia, Blanqueamiento, Dolor o urgencia).
3. Bot consulta `GET /api/disponibilidad` y ofrece hasta 3 huecos + "Ver más días"; las celdas se marcan "Ofrecido" en la agenda. Registro: "El bot leyó la agenda y encontró N horarios libres".
4. Paciente elige; bot pide nombre y DNI (ficticios); se crea/busca paciente.
5. Flujo 1 con origen `whatsapp`, estado `reservado` ("Sin confirmar").
6. Bot muestra tarjeta "Turno reservado"; registro "Recordatorio programado para 24 h antes".

## Flujo 5: Recordatorio y confirmación 24 h antes (escena 2)

1. Reloj simulado / botón de demo dispara recordatorio: "Hola …, te recordamos tu turno … ¿Confirmás tu asistencia?".
2. Confirmo → `confirmado`; Necesito cambiarlo → Flujo 3 por bot; Cancelar turno → Flujo 2.

## Flujo 6: Urgencia (escena 4)

1. Paciente: dolor fuerte → bot asigna el turno reservado para urgencias del día (se libera el bloqueo "reservado urgencias" y se crea turno tipo urgencia).
2. Registro "Urgencia: turno de hoy … asignado a …"; aviso a la doctora (toast).
3. Molestia leve → Flujo 4 con consulta común.

## Flujo 7: Pagar seña (Mercado Pago SIMULADO)

1. Paciente toca "Pagar seña" → pantalla falsa rotulada "SIMULACIÓN".
2. Elige Aprobar / Rechazar → `POST /api/sim/mercadopago/pagos`.
3. Aprobado → turno `senado = true`, registro; Rechazado → sin cambios, mensaje.

## Flujo 8: Consultar cobertura (Obras sociales SIMULADO)

1. Recepción ingresa nº de afiliado → `GET /api/sim/obras-sociales/afiliados/:nro`.
2. Devuelve obra social, plan, cobertura y % copago del padrón ficticio; inexistente → "no encontrado".

## Flujo 9: Emitir Factura C (ARCA SIMULADO)

1. Turno atendido → recepción "Emitir factura C" → `POST /api/sim/arca/facturas`.
2. Se genera número y CAE ficticio; se muestra el comprobante rotulado "SIMULACIÓN — sin validez fiscal".

## Flujo 10: Odontograma "¿Dónde te duele?"

1. Paciente (desde el bot simulado o al reservar) abre el odontograma FDI.
2. Toca una pieza → panel con número, nombre y síntomas.
3. "Agregar pieza N al turno" → `PUT /api/turnos/:id/piezas`; la pieza queda roja (a revisar).
4. El odontólogo ve la pieza en el turno; las ya tratadas se muestran en azul.

## Flujo 11: Configuración inicial (admin)

1. Alta de sillones → prestaciones con duración → profesionales con franjas → bloqueos.
2. A partir de ahí el motor calcula huecos libres (Flujo 4 paso 3).
