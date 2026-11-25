# Mockups — `panel-reemplaza-agenda-vieja`

- **Design system**: revisión 1 (`design-system/`, aprobada el 2026-11-25). **No se modifica.**
  - Los estilos nuevos son aditivos y usan solo tokens `--adm-*` que ya existen.
  - Están en el `<style>` de cada mockup y en la implementación pasan a `public/admin/admin.css`.
  - `adm.css` y `shell.js` son copias de los mockups aprobados de `panel-admin-agenda`.
- **Approval: approved (2026-11-25, by user).** Desbloquea las tareas visuales: grupos 4 y 5 de `tasks.md`. Ajuste pedido al implementar: el botón "Actualizar" de "Lo que hizo el sistema" debe tener contraste AA (el turquesa sobre azul oscuro casi no se lee).
- **Preview: not rendered.** El visor integrado no permite abrir `file://` de forma interactiva en esta sesión, y no se levantó ningún servidor. Hay que revisarlo a mano antes de aprobar (ver "Cómo verlos").

## Pantallas y estados

### `agenda.html` → `/admin/#/agenda`

La barra "Solo mockup · ver como" cambia entre Recepción, Admin y Odontóloga. En la app, el rol sale de la sesión.

- **Nuevo** — botón "+ Nuevo turno" (admin y recepción). Abre el formulario en el drawer. Estados de referencia:
  - campo obligatorio vacío;
  - 409 con `RN-AG-01` y el turno en conflicto;
  - toast "Turno creado".
- **Nuevo** — tarjeta "Lo que hizo el sistema" (admin y recepción). Estado de referencia: vacío.
- **Nuevo** — ícono de WhatsApp en el bloque y "Origen" en el detalle.
- **Nuevo** — turnos ya terminados atenuados. Hoy es martes 01/12, 11:00, y el turno que termina 11:00 ya cuenta.
- **Nuevo** — enlace **"Odontograma"** en el detalle, solo para la odontóloga.
- La odontóloga no ve "Nuevo turno", el registro ni "Cancelar turno…".

### `odontograma.html` → `/admin/#/odontograma/<turnoId>`

- **Odontóloga** (pieza 16 a revisar y 36 hecha):
  - encabezado del turno;
  - 4 cuadrantes FDI;
  - detalle con caras y síntomas;
  - "Marcar como realizado".
- **Recepción o admin** con la ruta escrita a mano: el aviso de acceso restringido que ya tiene el panel. No se piden piezas.
- **Turno inexistente.**

### Sin mockup (no hay cambio visual)

- Redirecciones de `/`, `/index.html` y `/odontograma.html`.
- Cambio de `href` del enlace "Agenda" en `public/bot.html` y `public/sim/arca.html`: mismo texto y estilo, cambia solo el destino.

## Reglas aplicadas

- **Motion**: solo `transform` y `opacity`, `ease-out`, menos de 300 ms.
  - El drawer usa 240 ms con `translateX`, igual que el panel.
  - Al presionar una pieza o un botón: `scale(0.97)`.
  - El atenuado de pasados es una `opacity` fija, sin transición.
  - Con `prefers-reduced-motion` no hay transform.
- **Rojo y azul del odontograma (RN-OD-04)**, armados con `--adm-error-*` y `--adm-st-atendido-*`. Además del color llevan "!" y "✓" y el estado en el nombre accesible, para no depender solo del color.
- **Objetivos táctiles** de 44 px como mínimo (`--adm-tap`) en piezas, caras y botones.
- **Datos ficticios** coherentes con el seed: "Paciente Ficticio …", `Dra. Ficticia Perez`, `Sillon 1`/`Sillon 2`, semana 30/11–06/12/2026.
- El rótulo SIMULACIÓN queda en la barra lateral.

## Cómo verlos

1. Desde la raíz del repo: `python -m http.server 8765`.
2. Abrir `http://localhost:8765/openspec/changes/panel-reemplaza-agenda-vieja/mockups/agenda.html`.
3. Revisarlo en 1440×900 y en 390×844: sin scroll horizontal de página; la grilla se desplaza dentro de su contenedor.
