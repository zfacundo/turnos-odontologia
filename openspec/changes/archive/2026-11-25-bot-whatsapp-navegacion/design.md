## Context

`conversacion.ts` es una máquina de estados pura (`avanzar` / `resolver`). Hoy cada paso arma sus propias opciones:
- "Volver al menú" aparece solo en algunos pasos;
- "Volver atrás" solo en el resumen del horario.

La sesión ya guarda todo lo necesario para reconstruir los pasos anteriores: `prestacion`, `profesional`, `huecos`, `fechaMostrada`, `elegido` y `turno`.

## Goals / Non-Goals

**Goals:**
- La misma fila de navegación (atrás / menú) en todos los pasos distintos del menú.
- "Volver atrás" que sea seguro: nunca reserva, paga ni cancela.

**Non-Goals:**
- No hay historial genérico (pila de pantallas).
- No se deshacen acciones ya hechas.
- No cambian la API, los efectos ni los casos de uso.

## Decisions

### D1. Destino explícito de "Volver atrás" en lugar de una pila
Cada paso conoce su paso anterior, y "Volver atrás" lo reconstruye con funciones que ya existen o se extraen:
- `mostrarTipos`;
- `mostrarProfesionales`;
- `mostrarHorarios`;
- `revisarHorario`;
- `ofrecerSena` / `mostrarTurno`.

Se descartó una pila de sesiones porque permitiría volver al resumen de un turno ya reservado y reservarlo otra vez, lo que daría un 409 RN-AG-05 confuso.

En los horarios, "Volver atrás" vuelve a los profesionales, aunque se haya usado "Ver más días": "Ver más días" avanza dentro del mismo paso.

### D2. Origen de la pantalla de pago
La pantalla de pago se abre desde "¿Querés pagar la seña ahora?" o desde "Ver mi turno". La sesión guarda `origenPago: 'ofrecerSena' | 'gestion'` para que "Volver atrás" vuelva al lugar correcto.

### D3. Una sola función arma la fila de navegación
`conNavegacion(opciones, atras: boolean)` agrega `[Volver atrás?] Volver al menú` al final. Cada paso declara si tiene "atrás", y el resto de la función no cambia.

Dónde no hay "Volver atrás":
- tipo, afiliado y gestión: el paso anterior es el menú;
- confirmar cancelación: "No" ya vuelve al turno;
- después de una acción ya hecha (reserva, pago, confirmación, cancelación, cobertura o aviso final).

El id `atras` se reutiliza en todos los pasos.

### D4. Estilo secundario en la pantalla
`bot.js` marca con la clase `chip nav` los ids `atras` y `menu`. `bot.html` agrega:

```css
.chip.nav { border-color: var(--line); color: var(--muted); }
```

Los tokens ya existen, así que no cambia la revisión del design system. Los botones siguen en el mismo contenedor `.opts`. La fila de navegación queda al final porque así lo devuelve la API.

### D5. Confirmar el número de afiliado
El texto escrito en `afiliado` ya no declara `consultarObraSocial`: guarda `nroAfiliado` normalizado y pasa al paso `confirmarAfiliado` ("¿El número de afiliado es AF-0001?") con "Confirmar" (id `confirmar-afiliado`), "Volver atrás" y "Volver al menú". "Confirmar" declara el efecto; "Volver atrás" vuelve a `pedirAfiliado`. El efecto, el caso de uso y los mensajes de resultado no cambian.

## Risks / Trade-offs

- **Más botones por paso:** los pasos con muchas opciones pueden verse cargados. Por eso la navegación es secundaria y "Volver atrás" no se duplica con "Volver al menú".
- **Tests que comparan listas exactas de opciones:** hay que actualizarlos. Se agrega un helper de tests `NAV` para que se lean claros.

## UI Mockups

- Design system revision: 1
- Decision: yes (2026-11-25). Revisión 2: sin "Salir", a pedido de Integrante 2. Revisión 3: confirmación del número de afiliado.
- Mockups: `openspec/changes/bot-whatsapp-navegacion/mockups/`
- Approval: approved (2026-11-25, by user; revisión 3)
- Preview: rendered (2026-11-25, `mockups/previews/bot-navegacion-390.png`, `bot-navegacion-1440.png`)
- Visual verify: passed (2026-11-25). Recorrido en el panel del navegador: profesional, horarios, resumen, reservado, pago y "Volver atrás" desde horarios y pago, coinciden con el mockup; sin errores de consola. Revisión 3: confirmar el número de afiliado (Confirmar / Volver atrás) coincide con el mockup (`verify/bot-confirmar-afiliado-390.jpg`). Capturas de horarios en `mockups/verify/` (390 y 1440; la de 1440 está reducida por el panel).
