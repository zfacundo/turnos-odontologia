# Tasks

> TDD estricto: primero el test rojo (con nombre "dado … cuando … entonces …"), después el mínimo código verde, y luego refactorizar. Sin mocks de dominio ni de repositorios: se usan el seed real en memoria y `RelojFijo` en `2026-11-30T09:00:00-03:00`. Solo se editan archivos de la Zona (`src/simulators/whatsapp/`, `public/bot.html`, `public/js/bot.js`, `tests/simulators/whatsapp/`), más el montaje en `src/api/app.ts`. **No arrancar el apply hasta que los mockups estén aprobados** (`mockups/README.md` con `Approval: approved`).
>
> Criterio de aceptación visual: `mockups/bot-reserva.html` y `mockups/bot-gestion.html`, con sus capturas en `mockups/previews/`.

## 1. Conversación pura

- [x] 1.1 Safety net: correr `npm test` y registrar la línea de base de `master` (568 en verde, 14 en rojo de C-09 y C-10 por routers sin montar). Verificar que los fallos sean exactamente esos 14.
- [x] 1.2 En `tests/simulators/whatsapp/conversacion.test.ts`, escribir en rojo los tests del menú inicial ("hola" o primer mensaje → 2 opciones; "menú" desde cualquier paso vuelve al menú) y del flujo de tipo y profesional (prestaciones sin Urgencia, profesionales activos). Crear `src/simulators/whatsapp/conversacion.ts` con `Sesion`, `Entrada`, `Efecto`, `avanzar` y `resolver` (design D1 y D2) hasta ponerlos en verde.
- [x] 1.3 Tests de horarios con huecos fijos: con un resultado de huecos se muestran exactamente los 3 primeros con etiquetas `Lun 30/11 09:00` (hora del consultorio) más "Ver más días"; "Ver más días" declara el efecto de buscar desde el día siguiente; sin huecos en 14 días se informa y se ofrece "Volver al menú". Implementar el formateo puro de fecha y hora hasta verde.
- [x] 1.4 Tests de identificación y reserva: paciente conocido → efecto `reservar` sin pedir datos; desconocido → pide nombre y DNI con `pideTexto`; parseo de "Paciente Ficticio Once, 99.000.011" (DNI sin puntos); formato inválido vuelve a pedir los datos; un resultado 409 RN-AG-02/04 → "Ese horario ya se ocupó" con efecto de recalcular el mismo día; RN-AG-05 → "Ya tenés otro turno a esa hora"; reserva exitosa → tarjeta "Turno reservado" con fecha, hora, prestación y profesional.
- [x] 1.5 Tests de gestión: próximo turno → Confirmo / Necesito cambiarlo / Cancelar turno; sin turnos → "No encontré turnos" + "Pedir un turno"; Confirmo exitoso y RN-AG-09 → "ya estaba confirmado"; "Cancelar turno" pide confirmación, "No" vuelve a las opciones, "Sí, cancelar" declara el efecto de cancelar; RN-AG-06 → "comunicate con recepción"; "Necesito cambiarlo" deriva a recepción; una opción desconocida → "No entendí" con las mismas opciones. Refactorizar con los tests en verde.

## 2. Orquestación con los casos de uso y API

- [x] 2.1 En `tests/simulators/whatsapp/bot.test.ts` (seed real y `RelojFijo`), escribir en rojo los tests de `src/simulators/whatsapp/bot.ts`. Cubren: ejecutar `buscarHuecos` con `consultarHuecos` día por día (hasta 14), `identificarPaciente` (por teléfono con `listar`, por DNI con `buscarPorDni` o registrando con `registrarPaciente`), `reservar` con `crearTurno` (`origen: 'whatsapp'`, usuario `whatsapp:<telefono>` con rol `paciente`), `buscarProximoTurno`, `confirmar` con `cambiarEstadoTurno` y `cancelar` con `cancelarTurno` y el motivo fijo (design D4 y D5). Implementar hasta verde.
- [x] 2.2 Tests de punta a punta con el bot: la reserva completa desde `+54 9 11 0000-0001` deja un turno `reservado` con origen `whatsapp` en `GET /api/turnos`; los horarios ofrecidos son iguales a los 3 primeros de `consultarHuecos`; un turno creado por recepción entre la oferta y la elección hace que el bot informe y re-ofrezca sin duplicar; `pac-01` con turno de `prof-2` a la misma hora → RN-AG-05; un número nuevo queda registrado con DNI `99000011`; un DNI existente (`99000002`) se reusa.
- [x] 2.3 Tests de gestión de punta a punta: Confirmo deja el turno `confirmado`; cancelar un turno del martes 10:00 con el reloj del lunes 09:00 lo cancela; cancelar uno del lunes 15:00 se rechaza y queda `reservado`; "Necesito cambiarlo" no modifica nada; un profesional sin franjas → "no hay horarios en las próximas 2 semanas" (con repositorios en memoria armados en el test).
- [x] 2.4 En `tests/simulators/whatsapp/api.test.ts` (supertest), escribir en rojo el contrato HTTP: `POST /api/sim/whatsapp/mensaje` y `/recordatorio` → `200` con `simulado: true`, el aviso, `mensajes`, `opciones` y `pideTexto`; teléfono faltante o real (`+54 9 11 4321-0000`) → `400 entrada`; sin `opcionId` ni `texto`, o con los dos → `400`; recordatorio con turno → texto y 3 opciones, sin turno → aviso. Crear `src/simulators/whatsapp/router.ts`, con el mapa de sesiones inyectable (design D7), y montarlo en `src/api/app.ts` con un import y una línea antes del 404 de `/api`, hasta verde.
- [x] 2.5 En `tests/simulators/whatsapp/sin-red.test.ts`, verificar que las fuentes de `src/simulators/whatsapp/` no importan `http`, `https` ni `net` y no usan `fetch` (design D9). Verificar en verde.

## 3. Pantalla

- [x] 3.1 En `tests/simulators/whatsapp/pantalla.test.ts`, escribir en rojo: `GET /bot.html` responde `200` y contiene "Simulación — no es WhatsApp real", el selector de teléfono y el botón "Enviar recordatorio 24 h"; `GET /js/bot.js` responde `200`. Crear `public/bot.html` y `public/js/bot.js` siguiendo `mockups/bot-reserva.html` y `mockups/bot-gestion.html` (design D8: layout de dos columnas en escritorio y apilado en mobile, chips como `<button>`, `aria-live`, foco en el primer chip, barra de texto habilitada solo con `pideTexto`) hasta verde.
- [x] 3.2 Verificación visual contra los mockups aprobados. Levantar `npm run dev` con `SIM_NOW=2026-11-30T09:00:00-03:00`, completar en `bot.html` una reserva desde `+54 9 11 0000-0099` y un recordatorio → Confirmo desde `+54 9 11 0000-0001`, y capturar a 390×844 y 1440×900 en `mockups/verify/`. Revisar errores de consola y requests fallidas. Reportar las diferencias por prioridad (blocker / major / minor) y registrar `Visual verify:` en `design.md`. Detener el servidor.

## 4. Verificación integral

- [x] 4.1 Correr `npm test` (sin fallos nuevos respecto de la línea de base de 1.1; los 14 de C-09/C-10 siguen siendo los únicos rojos si nadie los arregló antes) y `npm run typecheck` sin errores. Verificar que cada escenario de `specs/bot-whatsapp/spec.md` tenga al menos un test.
- [x] 4.2 Correr `openspec validate bot-whatsapp-simulado --strict` sin errores y revisar con `git diff --name-only master` que solo cambien archivos de la Zona, `src/api/app.ts` (montaje), el change OPSX y el handoff.

## Workflow follow-up

- Escribir el handoff en `knowledge-base/entrega/C-06.md`, incluyendo el PR de seguimiento para conectar "Necesito cambiarlo" con `reprogramarTurno` cuando C-04 esté en `master`.
- PR a `master` con la plantilla, solo con autorización de Integrante 2; la revisión y el merge los hace el team lead.
- Después del merge: `/opsx:archive` y marcar C-06 en `CHANGES.md`.
- Informar al team lead de los 14 tests rojos de C-09/C-10 (routers de auditoría y odontograma sin montar en `src/api/app.ts`).
