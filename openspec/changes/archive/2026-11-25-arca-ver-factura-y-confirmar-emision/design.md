# Design

## Context

- El simulador de ARCA (C-12, archivado en `openspec/changes/archive/2026-11-25-emitir-factura-c-arca-sim/`) vive en `src/simulators/arca/`: `facturaC.ts` (dominio puro: tipos, constantes, `validarEmisionFacturaC`, `formatearNumero`, `generarCae`, `fechaArgentina`, `sumarDias`), `emitirFacturaC.ts` (caso de uso; arma la factura en línea, guarda y audita), `facturaCRepository.ts` (`guardar`, `buscarPorTurno`, `ultimoNumero`, en memoria) y `router.ts` (solo `POST /api/sim/arca/facturas`, montado en `/api` por `src/api/app.ts`).
- `public/sim/arca.html` lee `?turnoId=`, emite con un clic (`POST` con `X-Rol: recepcion`, `X-Usuario: recepcion-sim`) y dibuja el comprobante con `textContent` (helpers `texto`, `mostrarFila`, `avisar`, `mostrarComprobante`). Antes de emitir, la pantalla no conoce ni el paciente ni la prestación: solo el id del turno.
- Tests estáticos que tocan la pantalla: `tests/simulators/arca/pantalla.test.ts` (rótulo, botón "Emitir factura C", **la única llamada `fetch` es `'/api/sim/arca/facturas'`**, `X-Rol` recepción, sin URLs absolutas), `tests/api/admin-estaticos.test.ts` (la ruta se sirve) y `tests/api/sin-enlaces-viejos.test.ts` ("Agenda" apunta a `/admin/#/agenda`). `sin-red.test.ts` revisa que los fuentes del simulador no usen red.
- No hay jsdom ni happy-dom en el proyecto; los tests de pantallas son estáticos (regex sobre el HTML) más verificación manual en el navegador.
- El change `panel-boton-emitir-factura` (misma rama, sin commitear) solo toca `public/admin/`; no se pisa con este.

## Goals / Non-Goals

**Goals:**
- Poder ver, en cualquier momento, la factura de un turno: la emitida o una vista previa calculada sin efectos.
- Confirmar la emisión con una ventana modal accesible antes del `POST`.
- Reusar la construcción del comprobante entre emitir y previsualizar, sin duplicar lógica.

**Non-Goals:**
- Listar todas las facturas, anular o emitir notas de crédito.
- Persistir facturas fuera de la memoria.
- Cambios en el panel de administración (`public/admin/`).
- Cambiar el contrato del `POST /api/sim/arca/facturas`.

## Decisions

### D1. Endpoint `GET /api/sim/arca/facturas/:turnoId`
Ruta de lectura bajo el mismo recurso que el `POST`. Respuestas:

```ts
// 200
{ simulado: true, aviso: 'SIMULACIÓN — sin validez fiscal', estado: 'emitida', factura: FacturaC }
{ simulado: true, aviso, estado: 'vista-previa', emitible: true,  factura: BorradorFacturaC }
{ simulado: true, aviso, estado: 'vista-previa', emitible: false, motivo: ErrorDeRegla /* RN-SM-03 */, factura: BorradorFacturaC }
// 403 { error: { tipo: 'permiso', ... } } vía ErrorDePermiso
// 404 { error: { tipo: 'no-encontrado', mensaje } } (mismo formato que el POST)
```

Un turno no `atendido` responde `200` con `emitible: false` y no `409`: consultar no viola ninguna regla; la regla se aplica al emitir. *Alternativa descartada*: `409` para turnos no atendidos, que impediría mostrar la vista previa pedida.

### D2. Construcción compartida del comprobante (dominio puro)
En `facturaC.ts` se separa el "cuerpo" común del comprobante:

```ts
export interface CuerpoFacturaC { turnoId; tipo: 'C'; fechaEmision; importe; concepto; emisor; receptor; simulado: true }
export interface FacturaC extends CuerpoFacturaC { id; numero: string; cae: string; vencimientoCae: string; emitidaEn: Date }
export interface BorradorFacturaC extends CuerpoFacturaC { numero: null; cae: null; vencimientoCae: null }
export function armarCuerpoFacturaC(e: { turnoId: string; concepto: string; receptor: Receptor; ahora: Date }): CuerpoFacturaC
export function armarBorradorFacturaC(e: …): BorradorFacturaC // = cuerpo + nulls
```

`FacturaC` conserva exactamente los mismos campos que hoy (no cambia el `POST`). `emitirFacturaC` pasa a armar `{ ...armarCuerpoFacturaC(...), id, numero, cae, vencimientoCae, emitidaEn }`. El borrador no tiene `id` ni `emitidaEn`.

### D3. Datos del turno compartidos (aplicación)
`receptorDe` (paciente → receptor con DNI enmascarado vía `pacientePublico`) y la resolución del concepto (`prestaciones.buscarPorId(...)?.nombre ?? CONCEPTO_POR_DEFECTO`) se extraen a una función exportada `entradaDelComprobante(deps, turno, ahora)` en un módulo nuevo `src/simulators/arca/comprobanteDelTurno.ts`, usada por los dos casos de uso. También se exporta `puedeOperarFacturas(usuario)` (roles `admin` y `recepcion`) para que emitir y ver usen el mismo control.

### D4. Caso de uso `verFacturaC` sin efectos por tipo
`src/simulators/arca/verFacturaC.ts`:

```ts
export interface DepsVerFacturaC {
  readonly turnos: TurnoRepository<Turno>;
  readonly pacientes: PacienteRepository;
  readonly prestaciones: PrestacionRepository;
  readonly facturas: Pick<FacturaCRepository, 'buscarPorTurno'>;
  readonly clock: Clock;
}
export function verFacturaC(deps, usuario, turnoId: string): Result<VistaFacturaC, ErrorVerFacturaC>
```

Las dependencias no incluyen `auditoria` ni `guardar`/`ultimoNumero`: el compilador garantiza que la consulta no tiene efectos. Orden: rol (`403`) → turno (`404`) → factura existente (`emitida`) → borrador con `validarEmisionFacturaC` para `emitible`/`motivo`. Si el turno ya tiene factura se devuelve `emitida` sin mirar el estado del turno.

### D5. Router
`router.get('/sim/arca/facturas/:turnoId', …)` reutiliza el mismo `depsFactura` y el mismo repositorio de facturas que el `POST` (es el que instancia `arcaRouter`). `permiso` → `next(new ErrorDePermiso(...))`; `no-encontrado` → `404` con el mismo cuerpo que el `POST`. No se toca `Deps` ni `app.ts`.

### D6. Pantalla: botón "Ver factura" y vista previa
- `<button class="btn btn-secondary" id="ver">Ver factura</button>` dentro de `.actions`, al lado de "Emitir factura C".
- `consultar()` hace `fetch('/api/sim/arca/facturas/' + encodeURIComponent(turnoId), { headers: { 'X-Rol': 'recepcion', 'X-Usuario': 'recepcion-sim' } })`.
- `mostrarComprobante(f, modo)` con `modo` `'emitida' | 'vista-previa'`: un rótulo nuevo `#c-vista-previa` ("VISTA PREVIA — no emitida", oculto en modo emitida); en vista previa, número, CAE y vencimiento se escriben `—` y "Imprimir" queda oculto. Todo con `textContent`.
- `emitida` → además `emitir.disabled = true` y `avisar('warn', 'Este turno ya tiene factura', …)`.
- `vista-previa` con `emitible: false` → `avisar('warn', 'No se puede emitir todavía', 'El turno tiene que estar atendido para emitir la factura. ' + motivo.regla)`.
- Sin `turnoId`, "Ver factura" se deshabilita junto con "Emitir factura C".

### D7. Ventana de confirmación
- `<dialog id="confirmar" aria-labelledby="t-confirmar" aria-describedby="confirmar-texto">` con `<h2 id="t-confirmar">¿Emitir Factura C?</h2>`, un `<dl>` con paciente (`receptor.nombre` o `Consumidor Final`), prestación (`concepto`) e importe (`pesos(importe)`), el texto "La emisión (simulada) no se puede deshacer." y los botones "Cancelar" (`#confirmar-cancelar`) y "Emitir" (`#confirmar-emitir`, primario).
- Flujo de "Emitir factura C": `consultar()` → si `emitida`, se dibuja como en D6 y no se abre la ventana; si `vista-previa`, se llenan los datos y se llama `dialogo.showModal()` y luego `cancelar.focus()`.
- "Cancelar" → `dialogo.close()`. `Escape` lo maneja el `<dialog>` nativo (evento `cancel`). El evento `close` devuelve el foco a "Emitir factura C". Clic en el fondo no cierra (evita cierres accidentales; `Cancelar`/`Escape` alcanzan).
- "Emitir" → `dialogo.close()` y el `POST` existente, sin cambios en el manejo de respuestas. "Emitir" se deshabilita mientras el pedido está en curso para evitar dobles envíos.
- Animación: fundido de opacidad de 120 ms; con `prefers-reduced-motion: reduce`, sin transición.
- Si `emitible` es `false`, la ventana no se abre porque "Emitir factura C" ya está deshabilitado (D8). Como defensa, si la ventana llegara a estar abierta con un turno no emitible, "Emitir" queda deshabilitado (Q-2 resuelta). El servidor sigue siendo la única fuente de la regla: si el `POST` responde `409`, se avisa como hoy.

### D8. Estado inicial al cargar y reacción al `409 ya facturado` (Q-1, Q-3)
- Con `?turnoId=` presente, al cargar la página se hace una sola `GET /api/sim/arca/facturas/<turnoId>` (función `cargarEstadoInicial()`); no se repite salvo que el usuario toque un botón.
  - `estado: 'emitida'` → "Emitir factura C" deshabilitado desde el inicio y la nota visible "Este turno ya tiene factura". El comprobante NO se dibuja solo: se muestra únicamente al tocar "Ver factura" (pantalla sin ruido).
  - `estado: 'vista-previa'` con `emitible: false` → "Emitir factura C" deshabilitado desde el inicio, con el motivo visible (el turno tiene que estar atendido, con la regla `RN-SM-03`).
  - `estado: 'vista-previa'` con `emitible: true` → "Emitir factura C" habilitado.
  - Si esa consulta inicial falla (red, `403`), se muestra el error con `avisar` y los botones quedan como estaban (habilitados), porque el servidor decide al emitir.
- Si el `POST` responde `409` con el mensaje de turno ya facturado, la pantalla hace una `GET` de la factura, dibuja el comprobante existente, deshabilita "Emitir factura C" y muestra la nota "Este turno ya tiene factura". Otros `409` (turno no atendido) siguen mostrando el aviso como hoy.
- La nota se escribe con `textContent` en un elemento `#nota-factura` (`role="status"`).

### D9. Tests
- Dominio: `armarCuerpoFacturaC` / `armarBorradorFacturaC` en `facturaC.test.ts`.
- Aplicación: `verFacturaC.test.ts` con repositorios en memoria reales, `AuditoriaEnMemoria` y `RelojFijo` (regla dura 7).
- API: casos `GET` en `api.test.ts` con supertest.
- Pantalla: `pantalla.test.ts` estático. El test que hoy exige `['/api/sim/arca/facturas']` como única llamada se ajusta al requisito modificado: toda llamada empieza con `/api/sim/arca/facturas`, siguen sin URLs absolutas ni `fetch` con argumento no literal. Se agregan aserciones para "Ver factura", `<dialog aria-labelledby>`, `showModal`, "¿Emitir Factura C?", "VISTA PREVIA — no emitida", `prefers-reduced-motion` y la ausencia de `innerHTML`.
- El comportamiento interactivo (cancelar, `Escape`, foco, confirmar) no tiene entorno DOM en el proyecto: se verifica a mano en el navegador (tarea final). No se agregan dependencias.

## Risks / Trade-offs

- **Zona ajena** (C-12, Integrante 5): los cambios son aditivos salvo el refactor de `emitirFacturaC` y el ajuste de un test de `pantalla.test.ts`. Mitigación: la red de seguridad de los tests existentes de `tests/simulators/arca/` antes y después del refactor; avisar al integrante en el handoff.
- **Fecha de la vista previa**: `fechaEmision` del borrador es la del reloj al consultar; si se emite otro día, el comprobante real tendrá otra fecha. Es aceptable para una vista previa y se rotula "no emitida".
- **Carreras**: entre abrir la ventana y confirmar, otra pestaña podría emitir; el `POST` responde `409 ya facturado` y la pantalla lo avisa como hoy.
- **Sin pruebas automáticas del modal**: depende de la verificación manual; se compensa con aserciones estáticas del HTML.

## Open Questions

Resueltas por el team lead el 2026-11-25:

- **Q-1 (resuelta: sí)**: la pantalla consulta la factura una vez al cargar (si hay `turnoId`). Emitida → "Emitir factura C" deshabilitado con la nota "Este turno ya tiene factura" (el comprobante se muestra solo con "Ver factura"). Vista previa no emitible → deshabilitado con el motivo visible. Emitible → habilitado. Ver D8.
- **Q-2 (resuelta: deshabilitar)**: la ventana de confirmación nunca se abre para un turno no emitible (el botón ya está deshabilitado por Q-1); si aun así estuviera abierta, "Emitir" queda deshabilitado. Ver D7.
- **Q-3 (resuelta: sí)**: ante `409 ya facturado` del `POST`, la pantalla consulta la factura, la muestra, deshabilita "Emitir factura C" y muestra la nota. Ver D8.
