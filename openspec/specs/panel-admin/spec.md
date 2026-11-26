# panel-admin Specification

## Purpose

Ofrecer un panel de administración web para recepción, odontólogos y administración, con login simulado por rol, agenda semanal, dashboard simple, clientes (pacientes) e historial clínico, usando una paleta propia (`--adm-*`) que no altera el resto de la UI.

## Requirements

### Requirement: Pantalla de login del panel
El panel SHALL servirse en `/admin/` y mostrar, sin sesión, una pantalla de login con el nombre del producto (`BRAND_NAME`), un rótulo visible "SIMULACIÓN — usuarios ficticios, sin contraseñas", y la lista de usuarios de `GET /api/auth/usuarios` agrupados por rol. Al elegir un usuario y confirmar, el panel MUST hacer el login, guardar el token **solo** en `sessionStorage` y abrir el dashboard. Un error `401` o de red MUST mostrarse como mensaje en la pantalla, sin perder la selección.

#### Scenario: Ingreso de recepción
- **GIVEN** la pantalla de login sin sesión
- **WHEN** el usuario elige "Recepcionista Ficticia" y confirma
- **THEN** el panel abre el dashboard y el token queda en `sessionStorage`, no en `localStorage`

#### Scenario: Rótulo de simulación
- **GIVEN** la pantalla de login
- **WHEN** se renderiza
- **THEN** se ve el rótulo "SIMULACIÓN" y no hay ningún campo de contraseña

#### Scenario: Error de login
- **GIVEN** la API responde `401` al login
- **WHEN** el usuario confirma
- **THEN** la pantalla muestra un mensaje de error anunciado a lectores de pantalla y sigue en el login

### Requirement: Secciones protegidas por sesión y rol
Toda sección del panel SHALL requerir una sesión válida: sin token, o si la API responde `401`, el panel MUST borrar el token y volver al login con el aviso "Tu sesión venció, volvé a ingresar". La navegación MUST mostrar solo las secciones que el rol puede usar, según esta matriz: Dashboard (admin, recepción, odontólogo), Agenda (admin, recepción, odontólogo), Clientes (admin, recepción, odontólogo — solo lectura para odontólogo), Historial clínico (admin solo lectura, odontólogo lectura y alta; recepción sin acceso). Entrar por URL a una sección no permitida MUST mostrar un aviso "Tu rol no tiene acceso a esta sección" sin pedir datos a la API.

#### Scenario: Sin sesión redirige al login
- **GIVEN** un `sessionStorage` sin token
- **WHEN** se abre `/admin/#/agenda`
- **THEN** se muestra la pantalla de login

#### Scenario: Sesión vencida
- **GIVEN** un token guardado que la API responde con `401`
- **WHEN** el panel pide datos del dashboard
- **THEN** el token se borra y se muestra el login con el aviso de sesión vencida

#### Scenario: Recepción no ve historial clínico
- **GIVEN** una sesión de `u-recepcion`
- **WHEN** se renderiza la navegación
- **THEN** no aparece la entrada "Historial clínico"
- **AND** abrir `/admin/#/historial/pac-01` muestra el aviso de acceso denegado

#### Scenario: Cerrar sesión
- **GIVEN** una sesión activa
- **WHEN** el usuario elige "Cerrar sesión" en la barra superior
- **THEN** el panel llama a `POST /api/auth/logout`, borra el token y muestra el login

### Requirement: Shell del panel
El panel SHALL tener una barra lateral (sidebar) con el logo y `BRAND_NAME`, las secciones permitidas y la sección activa marcada con `aria-current="page"`, y una barra superior con el título de la sección, el nombre y rol del usuario y "Cerrar sesión". En anchos menores a 768px la barra lateral MUST colapsarse detrás de un botón de menú accesible (`aria-expanded`, cierre con `Escape`), y el panel MUST no tener scroll horizontal de página a 390px.

#### Scenario: Sección activa
- **GIVEN** una sesión de `u-admin` en la agenda
- **WHEN** se inspecciona la navegación
- **THEN** el enlace "Agenda" tiene `aria-current="page"`

#### Scenario: Sidebar en mobile
- **GIVEN** un ancho de 390px
- **WHEN** el usuario toca el botón de menú y luego presiona `Escape`
- **THEN** la barra lateral se abre con `aria-expanded="true"` y se cierra devolviendo el foco al botón

### Requirement: Dashboard simple
El dashboard SHALL mostrar los KPIs de `GET /api/panel/resumen` del día: turnos del día, confirmados, pendientes de confirmar (`reservado`), huecos libres y señados, con números tabulares, más una lista de próximos turnos y una barra simple de turnos por estado. Para odontólogo MUST rotularse "Tu agenda de hoy". Sin turnos MUST mostrarse un estado vacío con acceso a la agenda.

#### Scenario: KPIs del día
- **GIVEN** el resumen con `turnosDelDia = 6` y `porEstado.confirmado = 4`
- **WHEN** se abre el dashboard
- **THEN** la tarjeta "Turnos de hoy" muestra 6 y "Confirmados" muestra 4

#### Scenario: Día vacío
- **GIVEN** el resumen con `turnosDelDia = 0`
- **WHEN** se abre el dashboard
- **THEN** se muestra "No hay turnos para hoy" con un enlace a la agenda

### Requirement: Agenda semanal del panel
La agenda SHALL mostrar una grilla semanal Lunes a Domingo con filas de 15 minutos, la columna del día actual resaltada y los turnos como bloques ubicados por hora de inicio y alto proporcional a su duración, con paciente, prestación y hora en texto. El color del bloque MUST indicar el estado del turno (reservado, confirmado, atendido, ausente; los cancelados no se muestran porque la consulta existente devuelve solo turnos activos) y no ser el único indicador: el estado MUST figurar también en texto o en el nombre accesible. A la izquierda MUST haber un mini-calendario mensual para elegir la semana y la leyenda de colores; arriba, filtros por profesional, sillón y estado y controles de semana anterior/siguiente. Los datos MUST salir de `GET /api/turnos` con `desde`/`hasta` de la semana, y odontólogo MUST ver por defecto filtrado su propio profesional. Cambiar de semana o de filtro MUST ser instantáneo (sin animación).

#### Scenario: Turno en la grilla
- **GIVEN** un turno `confirmado` el martes de 10:00 a 10:45 de Paciente Ficticio Uno
- **WHEN** se abre la semana de ese martes
- **THEN** el bloque aparece en la columna "Martes", ocupa 3 filas de 15 minutos y su nombre accesible incluye "confirmado"

#### Scenario: Filtrar por sillón
- **GIVEN** turnos en "Sillon 1" y "Sillon 2"
- **WHEN** se elige el filtro "Sillon 2"
- **THEN** solo quedan visibles los turnos de "Sillon 2"

#### Scenario: Elegir semana en el mini-calendario
- **GIVEN** la agenda en la semana actual
- **WHEN** se elige un día de la semana siguiente en el mini-calendario
- **THEN** la grilla muestra la semana de ese día y se pide `GET /api/turnos` con el `desde` y `hasta` de esa semana

#### Scenario: Semana sin turnos
- **GIVEN** una semana sin turnos
- **WHEN** se abre
- **THEN** la grilla se muestra vacía con el mensaje "Sin turnos en esta semana"

### Requirement: Detalle de turno desde la agenda
Al activar un bloque (click, `Enter` o `Space`) la agenda SHALL abrir un panel de detalle con paciente, profesional, sillón, prestación, horario, estado y marca de seña, y las acciones que el rol ya puede hacer por la API existente (confirmar, cancelar con motivo, marcar atendido/ausente). Un rechazo de la API (`403`/`409`) MUST mostrarse con su mensaje. El panel MUST cerrarse con `Escape` devolviendo el foco al bloque.

#### Scenario: Confirmar desde el detalle
- **GIVEN** una sesión de recepción y un turno `reservado`
- **WHEN** abre el detalle y elige "Confirmar"
- **THEN** el panel llama a `POST /api/turnos/:id/confirmar` y el bloque pasa a color de confirmado

#### Scenario: Error de la API
- **GIVEN** la API responde `409` con un mensaje de regla
- **WHEN** se ejecuta la acción
- **THEN** el mensaje se muestra en el detalle y el turno no cambia

### Requirement: Sección de clientes
La sección Clientes SHALL listar los pacientes de `GET /api/pacientes` (con los datos enmascarados que ya define la ficha) con búsqueda por nombre en el navegador (el DNI llega enmascarado), y abrir la ficha de un paciente con sus datos y, si el rol puede, el acceso a su historial clínico. Recepción y admin MUST poder dar de alta y editar con los endpoints existentes; odontólogo MUST ver la sección en solo lectura.

#### Scenario: Buscar paciente
- **GIVEN** los 10 pacientes ficticios del seed
- **WHEN** se escribe "Tres" en la búsqueda
- **THEN** la lista muestra solo "Paciente Ficticio Tres"

#### Scenario: Odontólogo en solo lectura
- **GIVEN** una sesión de `u-odonto-1`
- **WHEN** abre Clientes
- **THEN** no se muestran los botones de alta ni edición

#### Scenario: Sin resultados
- **GIVEN** la lista de pacientes
- **WHEN** se busca "zzz"
- **THEN** se muestra "No encontramos pacientes con ese criterio"

### Requirement: Vista de historial clínico
La vista de historial de un paciente SHALL mostrar las entradas de `GET /api/pacientes/:id/historia` en una línea de tiempo descendente (fecha, profesional, procedimiento, notas y, si hay `turnoId`, la acción "Ver piezas del turno" que muestra en el mismo panel las piezas de `GET /api/turnos/:id/piezas`) con un rótulo "Datos ficticios — no es una historia clínica legal". Para odontólogo MUST haber un formulario de alta (fecha, procedimiento, notas, turno opcional) con validación en línea; las entradas MUST NOT ofrecer editar ni borrar. Para admin la vista MUST ser de solo lectura.

#### Scenario: Alta de entrada
- **GIVEN** una sesión de `u-odonto-1` en el historial de `pac-01`
- **WHEN** completa procedimiento y fecha válida y guarda
- **THEN** la nueva entrada aparece primera en la línea de tiempo

#### Scenario: Validación en línea
- **GIVEN** el formulario de alta
- **WHEN** se intenta guardar con procedimiento vacío
- **THEN** el campo se marca inválido con `aria-invalid="true"` y un mensaje asociado, sin llamar a la API

#### Scenario: Admin sin formulario
- **GIVEN** una sesión de `u-admin`
- **WHEN** abre el historial de `pac-01`
- **THEN** ve las entradas y no ve el formulario de alta

### Requirement: Tema propio del panel y aislamiento de estilos
El panel SHALL usar tokens CSS con prefijo `--adm-*` definidos en una hoja propia del panel, basados en la paleta #001040, #00457A, #0088BE, #97CAD9 y #DCE8EE. Los archivos `design-system/tokens.css` y `public/styles/tokens.css` MUST NOT modificarse, y `public/index.html`, el bot y los simuladores MUST conservar su estilo actual. Todo texto MUST cumplir contraste WCAG AA (4.5:1 texto normal, 3:1 texto grande y elementos de interfaz) y todo elemento interactivo MUST mostrar un foco visible de 3px.

#### Scenario: Estilos existentes sin cambios
- **GIVEN** el change implementado
- **WHEN** se comparan `design-system/tokens.css` y `public/styles/tokens.css` con su versión anterior
- **THEN** no tienen diferencias

#### Scenario: Botón primario con contraste AA
- **GIVEN** el botón primario del panel sobre fondo `#0088BE`
- **WHEN** se mide el contraste de su texto
- **THEN** es de al menos 4.5:1

### Requirement: Movimiento accesible
Las animaciones del panel SHALL usar solo `transform` y `opacity`, durar como máximo 300ms y no aplicarse a acciones repetidas (cambiar de semana, navegar el sidebar, filtrar). Con `prefers-reduced-motion: reduce` MUST eliminarse todo desplazamiento y escala, conservando como máximo fundidos de opacidad.

#### Scenario: Reduced motion
- **GIVEN** el sistema con `prefers-reduced-motion: reduce`
- **WHEN** se abre el detalle de un turno
- **THEN** el panel aparece sin desplazamiento ni escala
