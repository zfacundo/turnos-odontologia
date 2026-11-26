> TDD estricto: en cada tarea, primero el test en rojo (nombre dado / cuando / entonces), después el mínimo código para que pase y al final el refactor. Tests en `tests/panel/` (entorno node, Vitest). No se mockea el dominio; solo se usan dobles de `window`/`document`/`localStorage`/`matchMedia` para el código de navegador.
>
> **Bloqueo visual**: los grupos 3 a 6 no arrancan hasta que `mockups/README.md` diga `Approval: approved`. Los grupos 0 a 2 pueden avanzar antes.
>
> **Zona**: `admin.css`, `index.html`, `main.js`, `agenda.js` y `dashboard.js` son compartidos → solo cambios aditivos y PR con revisión del equipo.

## 0. Red de seguridad

- [x] 0.1 Correr `npx vitest run tests/panel` y `npm run typecheck`; anotar el baseline (N tests en verde, typecheck limpio). Si algo falla, frenar y reportarlo como fallo previo. Guardar una copia de `design-system/tokens.css` y `public/styles/tokens.css` (`git diff --stat` vacío para esos archivos al final).

## 1. Lógica pura (`public/admin/js/tema-calculos.js` + `.d.ts`)

- [x] 1.1 RED/GREEN/TRIANGULATE: en `tests/panel/tema-calculos.test.ts`, `normalizarTema`: "dado 'claro' u 'oscuro' cuando se normaliza entonces se devuelve igual" y "dado null, '', 'negro', 'OSCURO' o 42 cuando se normaliza entonces es null". Crear el módulo y su `.d.ts` (D3). Verifica: tests en verde y `npm run typecheck` limpio.
- [x] 1.2 RED/GREEN/TRIANGULATE: `resolverTema` con la tabla completa (guardado válido/inválido/ausente × `prefiereOscuro` true/false), incluidos los escenarios del spec "Sistema en oscuro sin elección", "Sistema en claro sin elección", "Elección guardada prevalece" y "Valor guardado inválido". Verifica: tests en verde.
- [x] 1.3 RED/GREEN: `alternarTema` (claro→oscuro, oscuro→claro), `esquemaDeColor` (claro→light, oscuro→dark) y `CLAVE_TEMA === 'adm.tema'`. Verifica: tests en verde.
- [x] 1.4 REFACTOR: nombres y tipos del `.d.ts` sin `any`; la tabla de casos queda exportada desde el test como fuente para la paridad (2.2). Verifica: suite de `tema-calculos.test.ts` en verde.

## 2. Arranque y persistencia (sin UI visible)

- [x] 2.1 RED/GREEN: en `tests/panel/tema-arranque.test.ts`, ejecutar `public/admin/tema-arranque.js` con `node:vm` y dobles: "dado adm.tema=oscuro cuando corre el arranque entonces html tiene data-tema=oscuro y colorScheme dark"; "dado localStorage que lanza cuando corre entonces usa matchMedia sin lanzar". Crear el script clásico (D5). Verifica: tests en verde.
- [x] 2.2 RED/GREEN: test de paridad: para cada caso de la tabla de 1.2, el arranque y `resolverTema` dan el mismo tema. Verifica: test en verde.
- [x] 2.3 RED/GREEN: en `tests/panel/tema-calculos.test.ts` (o `tema.test.ts`), `iniciarTema` de `public/admin/js/tema.js` con documento y almacén falsos: alternar guarda `adm.tema`, sincroniza `aria-pressed` de todos los `[data-tema-toggle]` y cambia `data-tema`; con almacén que lanza, el tema cambia igual sin error ("Almacenamiento bloqueado"); sin elección guardada, un `change` de `matchMedia` cambia el tema; con elección guardada, lo ignora ("Cambio del sistema con el panel abierto", "Elección guardada prevalece"). Verifica: tests en verde.
- [x] 2.4 RED/GREEN: acotar en `tests/panel/estatico-admin.test.ts` la regla de `localStorage` (D4): solo `tema.js` puede mencionarlo y solo con `CLAVE_TEMA`; `api-admin.js`, `sesion.js` y `main.js` siguen sin mencionarlo; `tema-arranque.js` cumple la misma regla. Agregar "dado una sesión cuando se cierra entonces adm.tema no se borra" en el test de `sesion`/`main` correspondiente ("Elección sobrevive a cerrar sesión", "Token fuera del almacenamiento local"). Verifica: suite de `tests/panel` en verde.

## 3. Mockups (gate)

- [x] 3.1 (aprobado 2026-11-26 por el usuario, defaults de las 4 preguntas) Revisar con el usuario `mockups/comparar.html` (claro vs oscuro de login, dashboard, agenda con drawer, historial con toast y error) y las 4 preguntas abiertas de `design.md`. El usuario cambia `mockups/README.md` a `Approval: approved` (o pide ajustes, que vuelven a Propose). Verifica: README con `approved`, fecha y quién aprobó.

## 4. Tema oscuro en CSS (`public/admin/admin.css`, bloque aditivo al final)

- [x] 4.1 RED: en `tests/panel/tema-estatico.test.ts`, leer el bloque `:root[data-tema="oscuro"]` y calcular los tokens efectivos (claro ∪ oscuro). Tests de contraste del spec "Texto AA en tema oscuro" e "Interfaz y foco en tema oscuro" con los pares de la tabla D2 (texto, muted, link, error, cada estado, señado, on-accent, borde de control, foco vs surface/bg/surface-2/sidebar, bordes de bloque vs surface ≥ 3:1, barras vs pista ≥ 3:1, toast). Verifica: tests en rojo (bloque inexistente).
- [x] 4.2 GREEN: agregar el bloque `:root[data-tema="oscuro"]` con los tokens de D2 copiados de `mockups/adm-oscuro.css` aprobado. Verifica: 4.1 en verde y los tests existentes del tema claro siguen en verde.
- [x] 4.3 RED/GREEN: "dado la hoja cuando se buscan literales claros (#FFFFFF, #E6EEF2, #F1F7FA, #F2F5F7, #EEF2F5, #E2E9EE, #E9B9A9, #A9D6BC) fuera de :root entonces cada selector que los usa tiene una sobrescritura [data-tema=\"oscuro\"]" y "dado los componentes que usan --adm-navy/--adm-blue-100 como fondo o texto semántico entonces tienen sobrescritura oscura". Agregar las reglas del inventario D9. Verifica: tests en verde.
- [x] 4.4 RED/GREEN: "dado la barra superior clara cuando se mide el foco entonces es >= 3:1" (hoy 1.70:1). Agregar `.topbar :focus-visible { outline-color: var(--adm-focus-color) }` como regla nueva (D9). Verifica: test en verde.
- [x] 4.5 RED/GREEN: "dado el bloque oscuro cuando se buscan transition o animation entonces no hay" (spec "Cambio instantáneo") y los tests de motion existentes siguen en verde. Verifica: suite `tests/panel` en verde.

## 5. HTML, botón y JS de vistas

- [x] 5.1 RED/GREEN: en `tests/panel/tema-estatico.test.ts`, "dado index.html cuando se lee el head entonces tema-arranque.js es un script clásico sin defer/async/module y aparece antes del link a admin.css" ("Sin destello al recargar en oscuro"); "dado index.html entonces hay dos botones [data-tema-toggle] (login y topbar) con type=button, aria-label='Tema oscuro' y aria-pressed". Editar `index.html` (aditivo). Verifica: tests en verde y el test existente de `index.html` sigue en verde.
- [x] 5.2 RED/GREEN: "dado main.js cuando se lee entonces importa iniciarTema y lo llama una vez al arrancar". Agregar las 2 líneas en `main.js` y los estilos `.tema-btn` (ícono, 44px) en el bloque aditivo. Verifica: test en verde.
- [x] 5.3 RED/GREEN: "dado agenda.js y dashboard.js cuando se buscan colores literales o tokens de barra entonces el swatch de bloqueo usa var(--adm-bloqueo-a/b, literal) y las barras var(--adm-bar-*, valor actual)". Editar las líneas de D9. Verifica: tests en verde y `npx vitest run tests/panel` completo en verde.

## 6. Verificación en navegador (ambos temas)

- [x] 6.1 Con `npm run dev`, recorrer login, dashboard, agenda (bloques de los 4 estados, "$ Señado", bloqueo, día actual y cerrado, drawer, toast), clientes (tabla, ficha, formulario con error), historial (rótulo, formulario con error) y odontograma (pieza "!" roja y "✓" azul) en claro y oscuro a 1440 y 390 px; comparar con los mockups aprobados. Verifica: capturas `mockups/verify/<vista>-<tema>-<ancho>.png`, sin fondos claros residuales en oscuro y sin scroll horizontal a 390. _(Hecho en el panel de navegador del agente: escaneo de fondos claros por JS, scrollWidth = 390 y capturas vistas en pantalla; NO se guardaron PNG en `mockups/verify/`.)_
- [x] 6.2 Script Edge headless (base: `verify/a11y-teclado-reduced-motion.mjs` de `panel-admin-agenda`): (a) con `adm.tema=oscuro`, capturar el primer cuadro tras recargar y comprobar el fondo oscuro (sin destello); (b) `prefers-color-scheme: dark` emulado sin elección → oscuro; cambio de emulación en vivo → cambia; (c) `Tab` hasta el botón y `Space` → `aria-pressed` alterna; (d) con `prefers-reduced-motion`, alternar no anima. Verifica: `mockups/verify/tema.json` con todos los checks en `true`. _(Hecho a mano en el panel de navegador, no con script Edge headless: sin destello por muestreo de un iframe, `prefers-color-scheme` emulado + cambio en vivo, Tab + Space y reduced-motion cubierto por test estático. NO se generó `tema.json`.)_

## 7. Cierre

- [x] 7.1 `npm test` y `npm run typecheck` en verde; `git diff --stat` sin cambios en `design-system/tokens.css` ni `public/styles/tokens.css`. Verifica: salida de los comandos anotada en el handoff.
- [x] 7.2 Handoff en `knowledge-base/entrega/panel-tema-oscuro.md` (qué se hizo, cómo se verificó, decisiones abiertas) y entrada en `CHANGES.md` (aditiva). Verifica: archivos presentes; PR abierto con revisión del equipo pedida por tocar archivos compartidos del panel.
