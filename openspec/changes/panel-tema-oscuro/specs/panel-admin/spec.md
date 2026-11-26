## ADDED Requirements

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

## MODIFIED Requirements

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
