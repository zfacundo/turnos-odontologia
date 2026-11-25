# Design

## Context

La motivación está en proposal.md (Why). Lo que ya existe en `master` y condiciona el diseño:

- Casos de uso a reutilizar sin modificarlos:
  - `consultarHuecos(deps, usuario, { prestacionId, profesionalId, fecha })` (C-05). Devuelve huecos ordenados desde la hora del `Clock`.
  - `crearTurno(deps, usuario, entrada)` (C-02). Acepta `origen: 'whatsapp'` y responde 409 por RN-AG-02/04/05.
  - `cambiarEstadoTurno(deps, usuario, { turnoId, accion: 'confirmar' })` y `cancelarTurno(deps, usuario, { turnoId, motivo })` (C-03). El rol `paciente` puede confirmar y cancelar; para cancelar exige 24 h o más de anticipación (RN-AG-06), y confirmar un turno ya confirmado devuelve RN-AG-09.
  - `registrarPaciente(pacientes, cuerpo)` (C-08). Valida DNI `99xxxxxx` y teléfono `+54 9 11 0000-00NN`, y rechaza DNI duplicados.
- `PacienteRepository` ofrece `buscarPorDni` y `listar`, pero no tiene búsqueda por teléfono. `TurnoRepository.listarActivos({ pacienteId })` sí existe.
- Hay simuladores previos (`src/simulators/mercadopago/`, `obras-sociales/`) con un patrón establecido: el router recibe `Deps`, guarda su estado propio en memoria dentro del módulo (sin tocar `Deps`) y responde con `simulado: true` y un aviso.
- Design system aprobado, revisión 1 (`design-system/`): tokens, chat, chips, tarjeta "Turno reservado" y franja de simulación.

## Goals / Non-Goals

**Goals:**
- Que toda la lógica de conversación (qué preguntar, qué opciones mostrar, cómo interpretar la respuesta) se pueda testear sin Express ni repositorios.
- Que las escrituras pasen **solo** por los casos de uso existentes (RN-WA-02).
- No tocar archivos de otra Zona, salvo la línea de montaje en `app.ts`.

**Non-Goals:**
- Persistir las conversaciones (viven en memoria, igual que el resto de los datos).
- Procesar lenguaje natural: el paciente elige opciones. El único texto libre es "nombre y DNI", más "hola" o "menú" para volver al inicio.
- Reprogramar, urgencia, "Hablar con la doctora" y lista de espera.

## Decisions

### D1. Máquina de estados pura con efectos declarados
`conversacion.ts` exporta dos funciones puras:
- `avanzar(sesion, entrada) → { sesion, respuesta } | { sesion, efecto }`
- `resolver(sesion, resultadoDelEfecto) → { sesion, respuesta }`

Un **efecto** es un pedido declarativo: `buscarHuecos`, `identificarPaciente`, `reservar`, `buscarProximoTurno`, `confirmar` o `cancelar`. `bot.ts` ejecuta el efecto con los casos de uso reales y le devuelve el resultado a la máquina.
- **Por qué**: la ficha pide una máquina de estados pura, y los tests de dominio cubren cada transición con datos fijos. Los efectos son el único punto de I/O.
- **Alternativa descartada**: que la máquina reciba `deps` y llame directo a los casos de uso. Es más corto, pero la máquina deja de ser pura y los tests necesitan el seed completo para cada paso.

### D2. Pasos de la conversación
```
inicio --(cualquier texto)--> menu
menu --Pedir un turno--> tipo --(prestacion)--> profesional --(profesional)--> horarios
horarios --(hueco)--> [paciente conocido?] --si--> reservar --> reservado
                                          --no--> datos --(nombre, DNI)--> reservar
horarios --Ver mas dias--> horarios (dia habil siguiente con huecos)
reservar --409--> horarios (mismo dia, recalculado, con aviso)
menu --Ver o cambiar mi turno--> gestion --Confirmo--> confirmado
                                         --Cancelar turno--> confirmarCancelacion --Si--> cancelado | rechazo 24 h
                                         --Necesito cambiarlo--> derivar a recepcion
cualquier paso --"hola"/"menu"/Volver al menu--> menu
```
- Tipos de consulta: las prestaciones del catálogo **excepto** `prest-urg` (la urgencia del día está fuera de alcance), en el orden del catálogo.
- Profesionales: todos los activos, en el orden del catálogo.

### D3. Horarios ofrecidos (RN-WA-01)
- Se busca el primer día con huecos desde la fecha del reloj, día por día, **hasta 14 días**. Se ofrecen los **primeros 3** huecos que devuelve `consultarHuecos` para ese día, sin reordenar ni filtrar.
- "Ver más días" sigue buscando desde el día siguiente al que se mostró. Si en 14 días no hay huecos, el bot lo informa y ofrece volver al menú.
- Cada opción de horario guarda internamente `{ inicio, sillonId }` del hueco. La etiqueta visible es `Lun 30/11 09:00`, en hora del consultorio (UTC-03:00), y la arma una función pura.

### D4. Identificación del paciente (decisión de explore)
1. Si el teléfono de la conversación coincide con el de un paciente (`pacientes.listar()` filtrado por teléfono), se usa ese paciente y no se piden datos.
2. Si no, el bot pide "nombre completo y DNI". Se interpreta como `<nombre>, <DNI>`: la última coma separa los dos campos y al DNI se le quitan los puntos.
   - Si el DNI ya existe (`buscarPorDni`), se reusa ese paciente.
   - Si no, se registra con `registrarPaciente({ nombre, dni, telefono })`.
   - Un formato inválido o un error de validación de C-08 vuelve a pedir los datos con el motivo.

### D5. Usuario simulado y origen
- Los casos de uso se invocan con `{ id: 'whatsapp:<telefono>', nombre: 'Bot WhatsApp (simulación)', rol: 'paciente' }`. Así `creadoPor` identifica el canal y la ventana de 24 h aplica igual que para cualquier paciente.
- `crearTurno` recibe `origen: 'whatsapp'`.
- `cancelarTurno` recibe el motivo fijo `"Cancelado por el paciente por WhatsApp (simulación)"`.

### D6. Errores de los casos de uso → mensajes del bot
| Resultado | Respuesta del bot |
|---|---|
| `crearTurno` 409 (RN-AG-02 o RN-AG-04) | "Ese horario ya se ocupó. Te muestro otros:" + los 3 primeros huecos recalculados del mismo día |
| `crearTurno` 409 RN-AG-05 | "Ya tenés otro turno a esa hora. Elegí otro horario:" + huecos recalculados |
| `cancelarTurno` RN-AG-06 | "Faltan menos de 24 h para tu turno: para cancelarlo comunicate con recepción." El turno no cambia |
| `cambiarEstadoTurno` RN-AG-09 al confirmar | "Tu turno ya estaba confirmado." |
| Sin turnos próximos en "Ver o cambiar" | "No encontré turnos próximos para este número." + "Pedir un turno" |
| Opción desconocida para el paso actual | "No entendí. Elegí una de las opciones:" + las mismas opciones (no cambia de paso) |

### D7. Contrato HTTP
- `POST /api/sim/whatsapp/mensaje`, con cuerpo `{ telefono, opcionId }` (respuesta a un botón) o `{ telefono, texto }` (texto libre).
- `POST /api/sim/whatsapp/recordatorio`, con cuerpo `{ telefono }`: busca el próximo turno activo del paciente (`reservado` o `confirmado`, con inicio posterior al reloj) y abre el paso `gestion` con el texto del recordatorio.
- Respuesta `200`: `{ simulado: true, aviso: "Simulación — no es WhatsApp real", mensajes: [{ texto, tarjeta?: { titulo, lineas[] } }], opciones: [{ id, etiqueta }], pideTexto: boolean }`.
- `400 entrada`: teléfono ausente o fuera del formato ficticio, cuerpo sin `opcionId` ni `texto`, o con los dos.
- No se usan `X-Rol` ni `X-Usuario`: el endpoint representa al paciente del teléfono.
- Las sesiones viven en un `Map<telefono, Sesion>` propio del router. Se puede inyectar para los tests, como hace el repositorio de pagos de C-11.

### D8. Pantalla
- `public/bot.html`:
  - Franja fija "Simulación — no es WhatsApp real".
  - Selector de teléfono ficticio: los del seed y uno no registrado, `+54 9 11 0000-0099`.
  - Panel de chat con burbujas, chips de opciones y una barra de texto que se habilita solo cuando `pideTexto` es verdadero.
  - Botón de demo "Enviar recordatorio 24 h".
- `public/js/bot.js`: usa `fetch` contra la propia API (mismo origen). Estilos con `public/styles/tokens.css`, siguiendo los componentes del design system (revisión 1).
- Accesibilidad: el chat es `aria-live="polite"`, las opciones son `<button>` y el foco vuelve al primer chip después de cada respuesta.

### D9. Sin red saliente (RN-SM-04)
El módulo `src/simulators/whatsapp/` no importa `http`, `https`, `net` ni clientes HTTP, y no usa `fetch`. Un test lo verifica leyendo las fuentes del módulo.

## UI Mockups

- Design system revision: 1
- Decision: yes, 2026-11-25
- Mockups: `openspec/changes/bot-whatsapp-simulado/mockups/`
- Approval: approved (2026-11-25, by user)
- Preview: rendered (2026-11-25, `mockups/previews/bot-reserva-{390,1440}.png`, `mockups/previews/bot-gestion-{390,1440}.png`)
- Visual verify: differences (2026-11-25), solo de prioridad **minor**. Se probó en el panel del navegador con `npm`/`tsx` y `SIM_NOW=2026-11-30T09:00-03:00`, a 1440×900 y 390×844, en tema claro. Capturas del estado inicial en `mockups/verify/bot-{390x844,1440x900}.png`.
  - Pantallas revisadas: la reserva completa desde `+54 9 11 0000-0099` (menú → tipo → profesional → horarios → nombre y DNI → "Turno reservado") y, desde `+54 9 11 0000-0001`, "Ver más días" → reserva → recordatorio 24 h → Confirmo → "Turno confirmado". La API confirmó los dos turnos con `origen: whatsapp` (uno `reservado`, el otro `confirmado`). La pantalla del bot no tuvo errores de consola ni requests fallidas; el único 404 (`/api/registro`) lo hizo la agenda de C-09 y no es de esta pantalla.
  - No se revisaron en la app real, pero sí en los tests de API y de bot: "horario tomado entre medio", cancelación con menos de 24 h y "Necesito cambiarlo".
  - Minor 1 (1440 y 390): el encabezado no tiene el logo provisional del mockup. La app todavía no tiene un asset de logo publicado (`public/`) y el logo sigue en (TBD).
  - Minor 2 (1440 y 390): la hora de las burbujas usa el reloj del navegador y no `SIM_NOW`; en el mockup se veían horas de la simulación.
  - Minor 3 (1440 y 390): el chat tiene alto máximo (60vh) con scroll interno, mientras que el mockup muestra la conversación completa. Es intencional para conversaciones largas.
  - Las capturas guardadas muestran el estado inicial porque Edge headless no puede recorrer el flujo; los estados intermedios se inspeccionaron en el panel del navegador.

## Risks / Trade-offs

- [Riesgo] El texto libre de nombre y DNI es frágil. → Mitigación: un solo formato documentado en el mensaje del bot ("Ej.: Paciente Ficticio Once, 99.000.011"), con re-pregunta ante un error.
- [Riesgo] Las sesiones en memoria se pierden al reiniciar. → Igual que todos los datos del sistema (DD-03); "hola" reinicia la conversación.
- [Trade-off] Buscar al paciente por teléfono recorre `listar()` porque el repositorio no tiene índice por teléfono. → Con 10 pacientes ficticios es irrelevante, y evita tocar archivos de C-08.
- [Trade-off] Mientras C-04 no esté en `master`, "Necesito cambiarlo" solo deriva a recepción. → Queda documentado en el handoff como PR de seguimiento.
- [Riesgo] `master` tiene 14 tests en rojo de C-09 y C-10 (routers sin montar en `app.ts`). → No es de esta Zona. Se informa al team lead y la verificación de C-06 compara contra esa línea de base.

## Migration Plan

No aplica: módulo y pantalla nuevos, sin datos persistidos. El rollback es revertir el PR.
