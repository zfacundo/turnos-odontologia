## Context

- La motivación está en `proposal.md`. Los requisitos, en `specs/vista-agenda/spec.md` y `specs/odontograma/spec.md`.
- La rama `panel-admin-agenda` ya implementa el panel en `public/admin/`:
  - login simulado con token `Bearer` en `sessionStorage` (`adm.token`);
  - middleware `identidad`: el token gana y sin `Authorization` se usa `X-Rol` (DD-09);
  - guardas de ruta puras en `public/admin/js/permisos-ui.js`;
  - agenda semanal con drawer de detalle (confirmar, atender, ausente, cancelar).
- Ese change sigue sin archivar. Su spec `panel-admin` todavía no está en `openspec/specs/`. Por eso los deltas de este change modifican solo `vista-agenda` y `odontograma`, que sí son specs principales. Así se evita un MODIFIED sobre una capability que todavía no existe.
- La agenda vieja (`public/index.html` + `public/js/agenda.js`, zona C-09) usa Arial y colores propios. Guarda el rol en `localStorage` y lo manda como `X-Rol` por `public/js/api.js`.
- `public/odontograma.html` (zona C-10) reutiliza ese `localStorage` y además tiene su propio selector de rol, que arranca en "Paciente".
- En el server, `src/api/routes/odontograma.ts` solo exige que haya un usuario con rol: recepción y paciente pueden leer y escribir `a_revisar`, y solo `hecho` queda reservado al odontólogo.
- Hoy ninguna página enlaza al odontograma.
- KB `03_actores_y_roles.md` (matriz) dice: odontograma R para admin y recepción, R/U para el odontólogo, C/U para el paciente. HU de la épica 8 en `06_funcionalidades.md`: "Como paciente quiero tocar la pieza que me duele". El pedido del usuario contradice esas dos fuentes (ver S-1).

### Funciones de la agenda vieja frente a la del panel

| Función de la agenda vieja (spec `vista-agenda`) | Panel hoy | Qué hace este change |
|---|---|---|
| Turnos reales de `GET /api/turnos` | Sí (por semana) | Nada (MODIFIED solo de redacción) |
| Grilla de 15 min | Sí | Nada (sin delta) |
| Vista **diaria** y semanal | Solo semanal + mini-calendario | **G-3**: se quita la vista diaria (REMOVED) |
| Filtros por profesional y sillón | Sí (y por estado) | Nada (sin delta) |
| Color por **prestación** | Color por **estado**; prestación en el bloque (≥45 min) y en el detalle | **G-4**: se pasa a color por estado (MODIFIED) |
| Rótulos "Sin confirmar / Confirmó / Atendido" | "Sin confirmar / Confirmado / Atendido / Ausente" | MODIFIED a los rótulos del panel |
| Indicador de origen **WhatsApp** | **No** | **G-2**: se agrega (ícono en el bloque, nombre accesible y detalle) |
| Atenuar horarios **pasados** | **No** | **G-2**: se agrega (clase `.pasado` con opacidad) |
| Horarios en hora de Argentina | Sí | Nada |
| **Crear turno** (formulario) | **No** | **G-1**: botón "Nuevo turno" + formulario en el drawer |
| Selector de rol simulado | Login simulado | REMOVED (lo reemplaza el login) |
| Registro **"Lo que hizo el sistema"** | **No** | **G-1**: tarjeta en la agenda (admin y recepción) |
| Cancelar con motivo + aviso por WhatsApp | Sí (drawer); el aviso lo genera el server | MODIFIED de redacción |
| "Seña pagada" | "$" en el bloque, chip "$ Señado" en el detalle | MODIFIED al texto del panel |
| Confirmar / atender / ausente | No estaba en la vieja; el panel sí lo tiene | — |
| Reprogramar | No estaba en ninguna de las dos UIs (solo API y bot) | Fuera de alcance (ver Non-Goals) |
| Bloqueos / sobreturno | La vieja no los mostraba; el panel muestra bloqueos | — |

## Goals / Non-Goals

**Goals:**
- Que `/` lleve al panel y que no quede ningún enlace a la agenda vieja.
- No perder ninguna función que la agenda vieja ofrecía, salvo las que se quitan a propósito (G-3, G-4 y el selector de rol). Cada una queda como decisión explícita.
- Que el odontograma se abra desde el detalle del turno, que solo lo use el odontólogo y que el server lo haga cumplir.
- Que el estilo sea solo `--adm-*` y la animación siga "Tema y motion" (`transform`/`opacity`, <300 ms, `prefers-reduced-motion`).

**Non-Goals:**
- Reprogramar desde el panel. Ninguna UI lo tenía. Se verifica por el bot en el grupo final.
- Vista diaria, salvo que el usuario la pida (G-3).
- Odontograma para el paciente o desde el bot (ver S-1).
- Cambiar `design-system/tokens.css`, `public/styles/tokens.css` o las reglas de dominio.
- Restringir al odontólogo a sus propios turnos (S-2).
- Borrar `public/js/api.js` (D6).

## Decisions

### D1. Redirecciones en `src/api/app.ts`, antes de `express.static`
- `app.get(['/', '/index.html'], …)` responde `302` a `/admin/`.
- `app.get('/odontograma.html', …)` responde `302` a `/admin/#/agenda`. El fragmento `#` viaja en `Location` y el navegador lo respeta.
- Van antes del middleware estático para que el borrado de los archivos no dependa del orden.
- Alternativa descartada: dejar `index.html` con un `<meta refresh>`. Deja HTML muerto en la zona C-09 y no se puede testear con supertest de forma limpia.
- Es una edición aditiva de un archivo compartido, que revisa el team lead.

### D2. Borrar (no adaptar) la agenda vieja y la página suelta del odontograma
- Se borran `public/index.html`, `public/js/agenda.js`, `public/odontograma.html` y `public/js/odontograma.js`. El usuario pidió "sacala", y adaptarlas duplicaría el panel.
- Lo que tenían de valor se mueve al panel:
  - formulario de alta y registro → `agenda.js` del panel;
  - mapa FDI, nombres, caras y síntomas → `public/admin/js/odontograma-calculos.js` (puro) + `public/admin/js/odontograma.js` (vista).
- **Zonas ajenas**: C-09 (agenda) y C-10 (odontograma). Se marca para revisión del team lead en el PR y en el handoff `knowledge-base/entrega/panel-reemplaza-agenda-vieja.md`.

### D3. El odontograma como ruta del panel `#/odontograma/<turnoId>`, fuera de la barra lateral
- `permisos-ui.js` suma una lista aparte de rutas sin menú: `{ id: 'odontograma', roles: ['odontologo'] }`.
  - `puedeVer` consulta las secciones del menú y también esas rutas;
  - `seccionesPara` sigue devolviendo solo las del menú, así que no aparece en la barra lateral;
  - nueva función pura `puedeVerOdontograma(rol)`, que usa el drawer.
- `main.js` registra la vista `odontograma`. Para recepción y admin usa el aviso de acceso restringido que ya existe, que no hace requests.
- Alternativa B (descartada como principal y anotada para el usuario): conservar `public/odontograma.html`, leer `?turno=` y mandar el `Bearer` desde `sessionStorage`. Problemas:
  - `sessionStorage` no se comparte de forma confiable entre pestañas, así que el enlace tendría que abrirse en la misma pestaña;
  - una página estática no se puede proteger en el server sin cookies, porque la navegación no manda `Authorization`;
  - seguiría con Arial y colores propios, fuera de "Tema y motion".
- Con D3, la página "se protege" igual que el resto del panel: la UI no la muestra y la API, que es la autoridad, responde `403`.

### D4. Guarda de rol en `src/api/routes/odontograma.ts` (zona C-10)
- `comprobarAcceso` pasa a exigir `usuario?.rol === 'odontologo'`, tanto en `GET` como en `PUT`. Si no se cumple, lanza `ErrorDePermiso` (403, con el mapeo uniforme de `errores.ts`).
- Se valida antes de buscar el turno: un rol sin permiso no puede distinguir un turno existente de uno inexistente.
- La regla de `hecho` sigue tal cual, aunque ya queda cubierta por la guarda general.
- Sin usuario se mantiene en `403`, igual que hoy. No pasa a 401, para no cambiar el contrato DD-09 de los headers simulados.
- Con token, `identidad` ya resuelve el usuario: no hay que tocar el middleware.

### D5. Altas en la agenda del panel: "Nuevo turno" en el mismo drawer y tarjeta de registro
- **Nuevo turno**:
  - botón en `week-nav`, visible solo si `puedeCrearTurnos(rol)` (admin y recepción, función pura nueva en `permisos-ui.js`);
  - abre el drawer existente en modo formulario: paciente (de `/api/pacientes`), prestación, profesional y sillón (de `/api/catalogo`), y fecha y hora (`input type="date"` + `select` de horas cada 15 min, de 08:00 a 19:45);
  - la validación previa es pura (`validarNuevoTurno` en `agenda-calculos.js`): campos obligatorios y armado del ISO con `-03:00`;
  - un `409` muestra `regla`, mensaje y turno en conflicto, que el panel ya recibe en `ErrorApi` (habría que exponer `conflicto` si viene en el cuerpo: cambio aditivo en `api-admin.js`);
  - si sale bien: toast "Turno creado", se recarga la semana del turno y se refresca el registro.
- **Registro**:
  - tarjeta "Lo que hizo el sistema" en la columna izquierda, debajo de la leyenda, solo para admin y recepción (`puedeVerRegistro(rol)`);
  - muestra los últimos 10 mensajes de `GET /api/registro`, invertidos, con fecha y hora de Argentina, y el botón "Ver más" o "Actualizar";
  - se refresca después de crear, cancelar y cambiar estado.
- Alternativa descartada: una sección "Registro" en la barra lateral. Agrega navegación por una función secundaria, y en la vieja vivía junto a la agenda.

### D6. `public/js/api.js` se conserva
- Queda sin consumidores en `public/`, pero es zona C-01 y podría usarlo otra pantalla futura.
- Se deja anotado en el handoff para que decida el team lead. No borrarlo evita tocar una tercera zona ajena.

### D7. Indicadores nuevos en la grilla, sin tokens nuevos
- **WhatsApp**: ícono SVG chico de globo de chat dentro del bloque, más "reservado por WhatsApp" en el nombre accesible (`nombreAccesible`, función pura que ya existe) y "Origen: WhatsApp (simulado)" en el `dl` del detalle.
- **Pasados**: función pura `terminoAntesDe(turno, ahoraMs)`, que compara `fin <= ahora`. Es lo mismo que "el intervalo `[inicio, fin)` ya terminó" y no compara el fin de un turno contra otro turno, así que no choca con la regla dura 6. Le agrega la clase `.pasado` (`opacity: .55`, sin transición) al bloque.
- La hora sale de `ctx.ahoraIso()` (la del navegador), que el panel ya inyecta. Así es testeable con hora fija.
- **Enlace al odontograma**: `<a class="btn btn-secondary" href="#/odontograma/<id>">Odontograma</a>` en las acciones del drawer, solo si `puedeVerOdontograma(rol)`.

### D8. Vista del odontograma en el panel
- Layout `split`:
  - card izquierda con las 2 arcadas (4 cuadrantes, botones de pieza de 44 px de alto como mínimo, `aria-pressed` y `aria-label` "16, Primer molar superior derecho, a revisar") y la leyenda;
  - card derecha con el detalle: caras V/M/O/D/L como `toggle`, síntomas como checkboxes, y los botones "Agregar pieza N al turno" y "Marcar como realizado".
- Encabezado: datos del turno (paciente, prestación y horario), sacados de `GET /api/turnos` filtrado por el id, más "Volver a la agenda".
- Colores con `--adm-*`:
  - a revisar = `--adm-error-bg`/`--adm-error-fg`, con borde y una "!" en el texto, para que no dependa solo del color;
  - hecho = `--adm-st-atendido-bg`/`-fg`, con "✓".
  - Así se respeta el rojo/azul de RN-OD-04 con la paleta del panel.
- Motion: la selección de pieza usa `transform: scale(0.97)` al presionar (`--adm-dur-press`). No hay animaciones de layout. Con `prefers-reduced-motion`, ya se anula por la regla global de `admin.css`.
- Textos: "¿Qué sentís?" pasa a "Síntomas referidos", porque ahora carga el odontólogo.

### D9. Tests que se ajustan, solo porque cambia el spec
- `tests/api/admin-estaticos.test.ts`: el último caso pide `/` → hoy espera `200`, pasa a esperar `302` + `Location: /admin/`. Se agregan casos para `/index.html` y `/odontograma.html`, y `/sim/*.html` sigue en `200`.
- `tests/simulators/whatsapp/pantalla.test.ts`: el caso "seña pagada" lee `public/js/agenda.js`, que se borra. Pasa a leer `public/admin/js/agenda.js` y a verificar que la marca depende de `t.senado`. Mejor aún, se cubre con un test de la función pura de nombre accesible.
- `tests/api/odontograma.test.ts`: los `preparar`, `GET` y `PUT` de `a_revisar` que usaban `RECEPCION` pasan a `ODONTOLOGO`. Los casos "recepción no marca hecho" y "paciente no marca hecho" se mantienen (siguen en 403). Se agregan los 403 nuevos del spec.
- Cada test ajustado lleva un comentario `// spec: panel-reemplaza-agenda-vieja` para que se pueda rastrear.

### Decisiones para revisión humana (governance: roles/auth)

- **S-1 (CRITICAL)** — *Solo el odontólogo ve y usa el odontograma.*
  - Esto contradice la matriz de KB 03 (admin y recepción R, paciente C/U) y la HU de la épica 8 ("como paciente…").
  - Por defecto se aplica el pedido del usuario. En apply se actualizan KB 03, KB 06 (la HU pasa a "como odontólogo quiero registrar dónde le duele al paciente…") y un supuesto nuevo en KB 09.
  - Consecuencia: el paciente pierde el "¿Dónde te duele?". Hoy no tenía ningún enlace para llegar, así que no se pierde ningún flujo que funcionara.
  - **Requiere OK explícito.**
- **S-2 (HIGH)** — *Cualquier odontólogo, no solo el profesional del turno.*
  - Por defecto, cualquier usuario `odontologo` accede a las piezas de cualquier turno. Motivos:
    - consultorio chico (interconsulta);
    - con `X-Rol` no hay `profesionalId`, así que restringirlo rompería los tests con headers;
    - el historial clínico del panel ya sigue el mismo criterio.
  - Alternativa: exigir que `usuario.profesionalId === turno.profesionalId` cuando el usuario viene por token. Es más estricto y suma un 403 más.
  - **Requiere decisión.**
- **S-3 (HIGH)** — *Admin pierde la lectura del odontograma.*
  - Hoy admin y recepción pueden leer. Con S-1 no.
  - Alternativa: admin con lectura y sin escritura, como en el historial clínico. Por defecto, **no**, porque el pedido dice "solo el rol odontólogo".
- **S-4 (HIGH)** — *Sin usuario sigue en 403 y no pasa a 401* (D4). Con un token inválido, `identidad` ya responde 401.
- **S-5 (MEDIUM)** — *La "protección" de la página es de UI.* El panel es estático: la ruta `#/odontograma/...` no se puede negar en el server. La autoridad es la API (403). Esto vale igual para el resto del panel.

### Faltantes que decide el usuario

- **G-1** — Crear turno y registro: se **agregan** al panel (D5). Sin ellos, recepción no podría dar turnos fuera del bot. Es lo mínimo para no perder funciones.
- **G-2** — Indicador de WhatsApp y atenuado de pasados: se **agregan** (D7). Es poco código y estaban en el spec.
- **G-3** — Vista diaria: se **quita** (REMOVED con migración al mini-calendario). Si el usuario la quiere, se vuelve a Propose y se agrega un toggle "Día/Semana" (≈1 tarea más).
- **G-4** — Color por prestación: pasa a color por **estado** (decisión del panel ya aprobada en sus mockups). La prestación sigue visible por nombre.

## Risks / Trade-offs

- [Borrar archivos de las zonas C-09 y C-10 sin su dueño] → El PR lo revisa el team lead y se avisa en el handoff. Los borrados van en un commit aparte (`refactor(panel-reemplaza-agenda-vieja): retirar agenda vieja`), para poder revertirlos sin tocar el resto.
- [`panel-admin-agenda` sin archivar] → Hay que archivarlo antes que este change. El delta de este change no depende de la spec `panel-admin`.
- [El odontograma sigue en memoria por instancia del router (`new RepositorioPiezas()` en el router)] → Ya pasaba antes y no cambia. Se anota.
- [Los tests que leían HTML viejo se rompen al borrarlo] → D9 enumera todos. La tarea de inventario corre `grep` antes y después del borrado.
- [Un enlace guardado a `/odontograma.html?turno=…` pierde el turno] → Redirige a la agenda. Es aceptable: antes no existía ese parámetro.
- [Hora del navegador para atenuar pasados] → Puede diferir de la del server. Es solo visual y la regla de negocio sigue en el server.
- [El formulario de alta duplica en parte la lógica de horarios] → Solo valida que los campos estén completos. Las reglas (RN-AG) quedan en el server y el panel muestra el 409.

## Migration Plan

1. Mergear `panel-admin-agenda` y archivarlo.
2. Mergear este change. Para volver atrás alcanza con revertir el commit de borrado y el de las redirecciones: el panel sigue andando sin ellos.
3. Después del merge, actualizar KB 03, 06 y 09 (S-1) y `design-system/README.md` (sacar la "inconsistencia conocida" de `public/index.html`, que deja de existir: edición de documentación, sin tocar tokens).

## Open Questions

- Si `public/js/api.js` se borra en un change posterior del team lead (D6). No cambia este plan.
