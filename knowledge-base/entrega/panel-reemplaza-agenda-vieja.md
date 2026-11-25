# Handoff — panel-reemplaza-agenda-vieja

Rama: `panel-admin-agenda` (contiene `panel-admin-agenda` + merge de `origin/master`). Sin commits: todo queda en el árbol de trabajo.

## Qué se hizo
- La agenda vieja (`public/index.html` + `public/js/agenda.js`) y la página suelta del odontograma (`public/odontograma.html` + `public/js/odontograma.js`) se retiraron. `GET /` y `/index.html` responden 302 a `/admin/`; `/odontograma.html` responde 302 a `/admin/#/agenda`.
- La agenda del panel suma: botón "+ Nuevo turno" (admin y recepción), tarjeta "Lo que hizo el sistema" (admin y recepción), ícono de WhatsApp y "Origen" en el detalle, atenuado de turnos terminados y enlace "Odontograma" (solo odontólogo).
- Odontograma como ruta del panel `#/odontograma/<turnoId>` (sin entrada en la barra lateral), solo odontólogo. La API lo hace cumplir: cualquier otro rol o sin usuario recibe 403 antes de buscar el turno.
- Enlaces "Agenda" de `bot.html` y `sim/arca.html` apuntan a `/admin/#/agenda`.
- Botón "Actualizar" del registro con contraste AA (blanco sobre `--adm-blue-700`), no el turquesa del mockup.
- KB actualizada (S-1): matriz de `03_actores_y_roles.md`, HU US-070 en `06`, supuesto SU-09 en `09`, y dos frases de `01_vision_y_objetivos.md` que nombraban al paciente como actor del odontograma. `design-system/README.md`: se quitó la "inconsistencia conocida". `tokens.css` no se tocó.

## Inventario (tarea 1.2)
Baseline: 1088 tests en verde. Consumidores previstos por D9 y confirmados, sin ninguno nuevo: `public/bot.html` y `public/sim/arca.html` (`href="/"`), `public/index.html` y `public/odontograma.html` (cargan `js/api.js`), `tests/simulators/whatsapp/pantalla.test.ts` (leía `public/js/agenda.js`). Después del borrado el `grep` solo encuentra comentarios y los tests nuevos.

## Zonas ajenas tocadas (revisión del team lead)
- C-09: borrado de `public/index.html` y `public/js/agenda.js` (sin commit; D2 pide un commit aparte `refactor(panel-reemplaza-agenda-vieja): retirar agenda vieja`).
- C-10: borrado de `public/odontograma.html` y `public/js/odontograma.js`; `src/api/routes/odontograma.ts` (guarda de rol) y `tests/api/odontograma.test.ts`.
- C-06 y C-12: solo el `href` de "Agenda" en `public/bot.html` y `public/sim/arca.html`.
- `src/api/app.ts` (compartido, aditivo): dos redirecciones antes de `express.static`.
- `public/admin/*`: aditivo sobre el panel (`admin.css`, `dom.js` con el ícono `whatsapp`, `main.js` con la vista `odontograma`, `api-admin.js` con `ErrorApi.conflicto`).

## Tests ajustados y por qué (comentario `// spec: panel-reemplaza-agenda-vieja`)
- `tests/api/odontograma.test.ts`: los GET/PUT de `a_revisar` pasan de recepción a odontólogo; se agregan 8 casos de 403/200/token. `preparar` sigue creando el turno con recepción (crear turnos es de recepción).
- `tests/api/admin-estaticos.test.ts`: `/` ya no es 200 sino 302; se agregan `/index.html`, `/odontograma.html` y las páginas que siguen en 200.
- `tests/simulators/whatsapp/pantalla.test.ts`: el caso "seña pagada" lee `public/admin/js/agenda.js`.
- Nuevos: `tests/api/sin-enlaces-viejos.test.ts`, `tests/panel/odontograma-calculos.test.ts`, y casos nuevos en `permisos-ui`, `agenda-calculos` y `api-admin`.

## D6
`public/js/api.js` se conserva (sin consumidores en `public/`; es zona C-01). Decide el team lead.

## Decisiones S y G (aprobadas por el usuario el 2026-11-25, tal cual en `design.md`)
S-1 solo odontólogo; S-2 cualquier odontólogo accede a cualquier turno (verificado: Gómez abre el turno de Pérez); S-3 admin sin lectura; S-4 sin usuario sigue en 403; S-5 la protección de la ruta es de UI, la autoridad es la API. G-1 crear turno y registro se agregan; G-2 WhatsApp y atenuado se agregan; G-3 sin vista diaria; G-4 color por estado.

## Resultado del grupo 8 (navegador, 2026-11-25, hora del server = real)
- `/` y `/index.html` → panel (login); `/odontograma.html` → `/admin/#/agenda`. OK.
- Login por rol: recepción (sin Historial), admin, Pérez y Gómez (con Historial). OK. Pérez entra con el filtro de su profesional.
- Crear turno: campos vacíos → errores por campo con `aria-invalid` y foco en el primero, sin POST; caso feliz → toast "Turno creado", el turno aparece y el registro se actualiza; 409 `RN-AG-02` con el id del turno en conflicto y el formulario abierto con los datos. OK.
- Confirmar, atender, ausente y cancelar (sin motivo → "El motivo de cancelación es obligatorio."; con motivo → sale de la grilla, toast). El registro se actualiza en cada una. El aviso de cancelación aparece en `/api/sim/whatsapp/avisos` del paciente, sin motivo. OK.
- Odontóloga: sin "+ Nuevo turno", sin tarjeta de registro y sin ninguna request a `/api/registro` (medido con resource timing); ve el enlace "Odontograma".
- Odontograma: pieza 16 sin síntomas → "Seleccioná al menos un síntoma." y no se envía PUT; con síntoma + cara O → rojo con "!" y `aria-label` "a revisar"; "Marcar como realizado" → azul con "✓" y botón deshabilitado "Pieza ya realizada". Un segundo PUT por API devuelve 409 `RN-OD-04` (la UI no puede provocarlo porque deshabilita el botón). `#/odontograma/turno-inexistente` → "No encontramos ese turno." + "Volver a la agenda". Recepción y admin con la ruta a mano → "Tu rol no tiene acceso a esta sección." y cero requests a la API; sin enlace en el detalle. `curl` con `X-Rol: recepcion` → 403.
- Bot: turno reservado (aparece con ícono de WhatsApp, "Origen: WhatsApp (simulado)"); seña rechazada → `senado` false; seña aprobada → "$" y chip "$ Señado"; obra social AF-0001 encontrada y AF-9999 "No encontré el afiliado"; recordatorio; cancelar a menos de 24 h rechazado con el mensaje de R6; cancelar con más de 24 h → "Turno cancelado".
- Mercado Pago (`?turnoId=`): aprobar → `senado` true; rechazar → sin cambio; rótulo SIMULACIÓN visible.
- Obras sociales: encontrada y "afiliado no encontrado", con rótulo.
- ARCA: turno atendido → Factura C simulada Nº 00001-00000001; turno reservado → "No se puede facturar … RN-SM-03".
- Atenuado: un turno de hoy 09:00 (ya terminado) lleva `.pasado` y "ya terminó"; los futuros no.
- Sin 404 en Network para las páginas y assets del panel, bot, sim y ARCA. Consola: solo los 401/404/409 provocados a propósito.
- 390×844: el odontograma no tiene scroll horizontal. En la agenda como recepción se encontró scroll horizontal (437 px) por el botón "+ Nuevo turno"; se corrigió con `.week-nav { flex-wrap: wrap }` y se re-midió en 390 px (agenda, detalle y formulario: 390 px).
- Capturas en `openspec/changes/panel-reemplaza-agenda-vieja/verify/` (formulario con 409 y odontograma con pieza hecha), solo datos ficticios.

## Desvíos y puntos para decidir
1. **El bot no tiene "reprogramar"** (ni en menú ni por texto; no hay código de reprogramar en `src/simulators/whatsapp/`). El Non-Goals de `design.md` decía que se verificaba por el bot. Se verificó `POST /api/turnos/:id/reprogramar` (200, el turno cambia en el panel y queda `reprogramar` en el registro). Si se quiere reprogramar por el bot, es otro change.
2. **El registro no es muy legible**: `GET /api/registro` devuelve textos como "confirmar: turno <uuid>." o "sena_aprobada: turno <uuid>." (solo "crear" tiene mensaje armado). Se muestra tal cual, como pide el spec; mejorar `registroLegible` es backend (zona C-08/auditoría).
3. `ErrorApi` mapea `conflicto`; `mensajeDe` antepone la regla en errores genéricos.
4. `etiquetaEstado` del módulo del odontograma se llamó `etiquetaEstadoPieza` para no chocar con la de la agenda.
5. Los borrados siguen sin commit (el equipo pidió commit aparte tipo `refactor`).

## No verificado
- Lectores de pantalla y orden de foco con teclado en el odontograma (solo se verificó el foco programático).
- Captura de pantalla de cada flujo (solo dos); el panel real en 1440×900 (el panel del navegador es angosto, ~620 px).
- Hover/estados con puntero fino.
