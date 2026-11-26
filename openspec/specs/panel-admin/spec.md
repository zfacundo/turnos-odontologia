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
El panel SHALL usar tokens CSS con prefijo `--adm-*` definidos en una hoja propia del panel, basados en la paleta #001040, #00457A, #0088BE, #97CAD9 y #DCE8EE, con un tema claro y un tema oscuro derivados de esa paleta (en el oscuro, superficies grafito neutro sin tinte azul y la paleta azul como acento). Los archivos `design-system/tokens.css` y `public/styles/tokens.css` MUST NOT modificarse, y `public/index.html`, el bot y los simuladores MUST conservar su estilo actual. En **ambos** temas todo texto MUST cumplir contraste WCAG AA (4.5:1 texto normal, 3:1 texto grande), los elementos de interfaz (bordes de controles, botón primario frente a su fondo, bloques de estado identificados por color) MUST alcanzar 3:1, y todo elemento interactivo MUST mostrar un foco visible de 3px con contraste de al menos 3:1 contra el fondo donde se dibuja.

#### Scenario: Estilos existentes sin cambios
- **GIVEN** el change implementado
- **WHEN** se comparan `design-system/tokens.css` y `public/styles/tokens.css` con su versión anterior
- **THEN** no tienen diferencias

#### Scenario: Botón primario con contraste AA
- **GIVEN** el botón primario del panel sobre fondo `#0088BE`
- **WHEN** se mide el contraste de su texto
- **THEN** es de al menos 4.5:1

#### Scenario: Texto AA en tema oscuro
- **GIVEN** los tokens del tema oscuro
- **WHEN** se mide el texto principal, el secundario, los enlaces, el error y el texto de cada estado del turno sobre su fondo
- **THEN** cada par es de al menos 4.5:1

#### Scenario: Interfaz y foco en tema oscuro
- **GIVEN** los tokens del tema oscuro
- **WHEN** se mide el borde de los controles, el botón primario y el foco contra la superficie y el fondo
- **THEN** cada par es de al menos 3:1

### Requirement: Movimiento accesible
Las animaciones del panel SHALL usar solo `transform` y `opacity`, durar como máximo 300ms y no aplicarse a acciones repetidas (cambiar de semana, navegar el sidebar, filtrar). Con `prefers-reduced-motion: reduce` MUST eliminarse todo desplazamiento y escala, conservando como máximo fundidos de opacidad.

#### Scenario: Reduced motion
- **GIVEN** el sistema con `prefers-reduced-motion: reduce`
- **WHEN** se abre el detalle de un turno
- **THEN** el panel aparece sin desplazamiento ni escala

### Requirement: Acción "Emitir factura" para recepción y administración
El detalle del turno de la agenda semanal del panel SHALL mostrar la acción "Emitir factura" solo a las sesiones con rol `recepcion` o `admin`, con el mismo comportamiento para los dos. Para `odontologo`, MUST NOT mostrarse. Con el turno en estado `atendido`, la acción MUST ser un enlace que navega en la misma pestaña a `/sim/arca.html?turnoId=<id>`, con el id codificado con `encodeURIComponent`. La acción MUST NOT llamar a la API.

#### Scenario: Recepción con un turno atendido
- **GIVEN** una sesión de recepción y el turno `t-1` en estado `atendido`
- **WHEN** abre el detalle de `t-1` en la agenda semanal
- **THEN** ve la acción "Emitir factura" habilitada, con destino `/sim/arca.html?turnoId=t-1`
- **AND** al elegirla, el navegador abre ese destino en la misma pestaña

#### Scenario: Administración con un turno atendido
- **GIVEN** una sesión de admin y el turno `t-1` en estado `atendido`
- **WHEN** abre el detalle de `t-1` en la agenda semanal
- **THEN** ve la acción "Emitir factura" habilitada, con destino `/sim/arca.html?turnoId=t-1`
- **AND** al elegirla, el navegador abre ese destino en la misma pestaña

#### Scenario: Odontólogo no ve la acción
- **GIVEN** una sesión de odontólogo y un turno propio en estado `atendido`
- **WHEN** abre el detalle del turno
- **THEN** no aparece la acción "Emitir factura"

#### Scenario: Id con caracteres especiales
- **GIVEN** una sesión de recepción y un turno `atendido` con id `t 1/&?`
- **WHEN** se decide la acción de factura para ese turno
- **THEN** el destino es `/sim/arca.html?turnoId=t%201%2F%26%3F`

### Requirement: "Emitir factura" deshabilitada si el turno no está atendido
Para las sesiones de recepción y de administración, con el turno en cualquier estado distinto de `atendido`, la acción "Emitir factura" SHALL mostrarse deshabilitada. MUST NOT tener destino de navegación, MUST tener `aria-disabled="true"` y MUST mostrar el texto de ayuda visible "Disponible cuando el turno esté atendido".

#### Scenario: Recepción con un turno reservado
- **GIVEN** una sesión de recepción y un turno en estado `reservado`
- **WHEN** abre el detalle del turno
- **THEN** ve la acción "Emitir factura" deshabilitada, con `aria-disabled="true"` y sin destino de navegación
- **AND** ve el texto "Disponible cuando el turno esté atendido"

#### Scenario: Recepción con un turno confirmado
- **GIVEN** una sesión de recepción y un turno en estado `confirmado`
- **WHEN** abre el detalle del turno
- **THEN** la acción "Emitir factura" aparece deshabilitada, con el texto "Disponible cuando el turno esté atendido"

#### Scenario: Administración con un turno reservado
- **GIVEN** una sesión de admin y un turno en estado `reservado`
- **WHEN** abre el detalle del turno
- **THEN** ve la acción "Emitir factura" deshabilitada, con `aria-disabled="true"` y sin destino de navegación
- **AND** ve el texto "Disponible cuando el turno esté atendido"

#### Scenario: Recepción con un turno cancelado o ausente
- **GIVEN** una sesión de recepción y un turno en estado `cancelado` o `ausente`
- **WHEN** se decide la acción de factura para ese turno
- **THEN** la acción es visible, está deshabilitada y no tiene destino de navegación

### Requirement: Selector de tema del panel
El panel SHALL ofrecer un botón de tema visible en la barra superior del shell y en la pantalla de login. El botón MUST tener el nombre accesible "Tema oscuro" y exponer su estado con `aria-pressed` (`"true"` cuando el tema oscuro está activo, `"false"` en tema claro), MUST poder activarse con click, `Enter` y `Space`, y MUST mostrar el foco visible de 3px del panel. Activarlo MUST alternar entre tema claro y oscuro en todo el panel sin recargar la página, sin perder la sección actual, la sesión ni lo escrito en formularios. El selector de tema MUST afectar solo a `/admin/`.

#### Scenario: Alternar a oscuro desde la barra superior
- **GIVEN** una sesión de `u-recepcion` en la agenda con el tema claro
- **WHEN** el usuario activa el botón "Tema oscuro"
- **THEN** el panel se muestra en tema oscuro, el botón queda con `aria-pressed="true"` y la agenda sigue abierta en la misma semana

#### Scenario: Volver a claro con el teclado
- **GIVEN** el panel en tema oscuro y el foco en el botón "Tema oscuro"
- **WHEN** el usuario presiona `Space`
- **THEN** el panel pasa a tema claro y el botón queda con `aria-pressed="false"`

#### Scenario: Selector en la pantalla de login
- **GIVEN** la pantalla de login sin sesión
- **WHEN** se renderiza
- **THEN** el botón "Tema oscuro" está presente, es alcanzable con `Tab` y alternarlo cambia el tema del login

#### Scenario: Formulario intacto al cambiar de tema
- **GIVEN** una sesión de `u-odonto-1` con texto escrito en el formulario de alta del historial de `pac-01`
- **WHEN** alterna el tema
- **THEN** el texto escrito sigue en el formulario y no se llama a la API

#### Scenario: Otras páginas no cambian
- **GIVEN** el tema oscuro elegido en el panel
- **WHEN** se abre `/bot.html`
- **THEN** el bot conserva su estilo actual

### Requirement: Tema por defecto según el sistema
Si el usuario nunca eligió un tema, el panel SHALL usar tema oscuro cuando el sistema declara `prefers-color-scheme: dark` y tema claro en cualquier otro caso. Mientras no haya elección guardada, un cambio de la preferencia del sistema con el panel abierto MUST reflejarse sin recargar. Una elección guardada MUST prevalecer sobre la preferencia del sistema.

#### Scenario: Sistema en oscuro sin elección
- **GIVEN** el sistema con `prefers-color-scheme: dark` y ninguna elección de tema guardada
- **WHEN** se abre `/admin/`
- **THEN** el panel se muestra en tema oscuro y el botón tiene `aria-pressed="true"`

#### Scenario: Sistema en claro sin elección
- **GIVEN** el sistema con `prefers-color-scheme: light` y ninguna elección guardada
- **WHEN** se abre `/admin/`
- **THEN** el panel se muestra en tema claro

#### Scenario: Elección guardada prevalece
- **GIVEN** la elección "claro" guardada y el sistema con `prefers-color-scheme: dark`
- **WHEN** se abre `/admin/`
- **THEN** el panel se muestra en tema claro

#### Scenario: Cambio del sistema con el panel abierto
- **GIVEN** ninguna elección guardada y el panel abierto en tema claro
- **WHEN** el sistema cambia a `prefers-color-scheme: dark`
- **THEN** el panel pasa a tema oscuro sin recargar

### Requirement: Persistencia de la elección de tema
Al alternar el tema, el panel SHALL guardar la elección en el almacenamiento local del navegador bajo la clave `adm.tema`, con valor exactamente `claro` u `oscuro`, para que sobreviva a recargar, cerrar la pestaña y cerrar sesión. Un valor guardado distinto de esos dos MUST ignorarse y tratarse como "sin elección". Si el almacenamiento no está disponible o lanza un error, el tema MUST seguir funcionando durante la visita, sin errores visibles. El token de sesión MUST seguir guardándose solo en `sessionStorage`, nunca en el almacenamiento local.

#### Scenario: Elección sobrevive a recargar
- **GIVEN** el usuario eligió tema oscuro
- **WHEN** recarga `/admin/`
- **THEN** el panel abre en tema oscuro aunque el sistema prefiera claro

#### Scenario: Elección sobrevive a cerrar sesión
- **GIVEN** una sesión con tema oscuro elegido
- **WHEN** el usuario cierra sesión
- **THEN** la pantalla de login se muestra en tema oscuro

#### Scenario: Valor guardado inválido
- **GIVEN** la clave `adm.tema` con el valor `negro`
- **WHEN** se abre `/admin/` con el sistema en `prefers-color-scheme: light`
- **THEN** el panel se muestra en tema claro, como si no hubiera elección

#### Scenario: Almacenamiento bloqueado
- **GIVEN** un navegador donde el almacenamiento local lanza error al leer o escribir
- **WHEN** el usuario alterna el tema
- **THEN** el tema cambia durante la visita y no se muestra ningún error

#### Scenario: Token fuera del almacenamiento local
- **GIVEN** una sesión iniciada con tema oscuro elegido
- **WHEN** se inspecciona el almacenamiento local
- **THEN** solo contiene la clave `adm.tema` del panel y ningún token de sesión

### Requirement: Tema aplicado antes del primer pintado
El tema resuelto SHALL aplicarse al documento antes de que el navegador pinte el primer cuadro de `/admin/`, de modo que con tema oscuro no se vea ningún cuadro en tema claro (sin destello) ni al abrir ni al recargar. Los controles nativos del navegador (barras de desplazamiento, selects, campos de fecha) MUST usar el esquema de color del tema activo.

#### Scenario: Sin destello al recargar en oscuro
- **GIVEN** la elección "oscuro" guardada
- **WHEN** se recarga `/admin/` y se captura el primer cuadro pintado
- **THEN** el fondo de ese cuadro es el fondo del tema oscuro, no el del claro

#### Scenario: Controles nativos en oscuro
- **GIVEN** el panel en tema oscuro
- **WHEN** se abre el select de profesional en la agenda
- **THEN** el control usa el esquema de color oscuro del navegador

### Requirement: Cobertura del tema oscuro en todas las vistas
En tema oscuro, todas las vistas y componentes del panel SHALL usar la paleta oscura, sin restos de fondos claros: login, shell (sidebar, barra superior, menú mobile), dashboard (KPIs, barras por estado, próximos turnos, estados vacíos), agenda (mini-calendario, leyenda, filtros, grilla, día actual, días cerrados, bloqueos, bloques de turno, registro del sistema), detalle de turno (drawer y fondo), clientes (tabla, búsqueda, ficha, formularios), historial clínico (línea de tiempo, rótulo de datos ficticios, formulario), odontograma, avisos, toasts, enlace de salto y estados de foco. Los colores de estado del turno MUST conservar su significado (reservado, confirmado, atendido, ausente y la marca "$ Señado") y la leyenda MUST mostrar los mismos colores que los bloques; el estado MUST seguir figurando en texto o en el nombre accesible. En el odontograma, las piezas "a revisar" MUST seguir siendo rojas con la marca "!" y las "hecho" azules con la marca "✓" (RN-OD-04), en ambos temas.

#### Scenario: Turno confirmado en oscuro
- **GIVEN** el panel en tema oscuro y un turno `confirmado` en la semana visible
- **WHEN** se renderiza la grilla
- **THEN** el bloque usa el color de confirmado del tema oscuro, igual al de la leyenda, y su nombre accesible incluye "confirmado"

#### Scenario: Odontograma en oscuro
- **GIVEN** una sesión de `u-odonto-1` en tema oscuro con una pieza "a revisar" y otra "hecho"
- **WHEN** abre el odontograma del turno
- **THEN** la pieza "a revisar" se ve roja con "!" y la pieza "hecho" azul con "✓"

#### Scenario: Drawer y toast en oscuro
- **GIVEN** el panel en tema oscuro
- **WHEN** se abre el detalle de un turno y se confirma con éxito
- **THEN** el drawer, su fondo y el toast de confirmación usan colores del tema oscuro

#### Scenario: Formulario con error en oscuro
- **GIVEN** el formulario de alta del historial en tema oscuro
- **WHEN** se intenta guardar con procedimiento vacío
- **THEN** el campo inválido y su mensaje se ven con el color de error del tema oscuro y contraste AA

#### Scenario: Sin fondos claros residuales
- **GIVEN** el panel en tema oscuro
- **WHEN** se recorren login, dashboard, agenda, clientes, historial y odontograma
- **THEN** ninguna superficie, campo, celda de la grilla ni tabla conserva un fondo del tema claro

### Requirement: Cambio de tema sin animación de layout
El cambio de tema SHALL ser instantáneo: MUST NOT animar colores, tamaños ni posiciones, y MUST NOT disparar las animaciones de entrada (login, KPIs) ni desplazar el contenido. Con `prefers-reduced-motion: reduce` el cambio de tema MUST ser igualmente instantáneo. El resto del motion del panel no cambia en tema oscuro.

#### Scenario: Cambio instantáneo
- **GIVEN** el dashboard abierto
- **WHEN** el usuario alterna el tema
- **THEN** los colores cambian en el mismo cuadro, sin transición, y las tarjetas KPI no repiten su animación de entrada

#### Scenario: Reduced motion
- **GIVEN** el sistema con `prefers-reduced-motion: reduce`
- **WHEN** el usuario alterna el tema
- **THEN** el cambio es instantáneo y nada se desplaza ni escala
