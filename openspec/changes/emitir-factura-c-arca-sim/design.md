# Design

## Context

La motivación está en `proposal.md`, y el comportamiento en `specs/factura-c-simulada/spec.md`. Estas son las condiciones que definen el enfoque:

- **Patrón de simulador de C-11** (`src/simulators/mercadopago/`): un dominio puro, un repositorio en memoria propio que no se agrega a `Deps`, un caso de uso que devuelve `Result` con errores tipados, y un router que traduce esos errores a `ErrorDePermiso`, `ErrorDeEntrada`, `FalloDeRegla` o a un 404 directo. Se monta con una sola línea en `app.ts`.
- **`ErrorDeRegla.conflicto`** (`src/domain/shared/result.ts`) acepta solo `{ turnoId }`. El 409 de "turno ya facturado" tiene que llevar además el `facturaId` (decisión 1), y `result.ts` es un archivo compartido fuera de la Zona.
- **Turno `atendido`**: es un estado terminal (`estados.ts`: `atendido: []`), así que un turno facturado sigue siendo `atendido` para siempre.
- **Zona horaria**: el repo ya trata `America/Argentina/Buenos_Aires` como UTC-03:00 fijo y sin horario de verano, con la constante `OFFSET_MS` en `validarNuevoTurno.ts`, `cargar-seed.ts` y `conversacion.ts`.
- **DNI enmascarado**: `pacientePublico` (C-08, `src/application/pacientes/pacientePublico.ts`) se exporta y enmascara el DNI como `99****01`. `enmascararDni` no se exporta.
- **`Prestacion`** no tiene precio.
- **Línea base de `master`**: 14 tests en rojo (`tests/api/odontograma.test.ts` y `tests/api/auditoria.test.ts`), ajenos a C-12.
- **Política visual**: `system-and-mockups`, con el design system en la Revisión 1 aprobada. La pantalla `arca.html` necesita un mockup aprobado.

## Goals / Non-Goals

**Goals:**
- Que el número, el CAE y las fechas sean 100 % determinísticos con un `RelojFijo`, para que los tests puedan comparar valores exactos.
- Que un pedido fallido no pueda consumir número, por la forma del diseño y no solo por disciplina.
- Mantener el mismo esqueleto que C-11, para que el equipo lo lea igual.

**Non-Goals:**
- Persistir la numeración o las facturas entre reinicios (DD-03).
- Resolver concurrencia: las emisiones son síncronas dentro del mismo proceso (DD-03).
- Unificar la constante de zona horaria del repo: cada módulo tiene la suya y C-12 sigue esa costumbre.

## Decisions

### D1 — Archivos del módulo
`src/simulators/arca/` va a tener:
- `facturaC.ts`, dominio puro: tipos, constantes, `validarEmisionFacturaC`, `formatearNumero`, `generarCae` y `fechaArgentina`/`sumarDias`.
- `facturaCRepository.ts`, con el puerto y su implementación en memoria.
- `emitirFacturaC.ts`, el caso de uso.
- `router.ts`.

Se copió la división de C-11.

### D2 — El número sale del repositorio, no de un contador separado
`FacturaCRepository` tiene `guardar(factura)`, `buscarPorTurno(turnoId)` y `ultimoNumero()` (devuelve 0 si no hay facturas). El caso de uso calcula `ultimoNumero() + 1` **después** de todas las validaciones y antes de guardar. Así, un pedido que falla no puede consumir número: si no se guarda nada, el número no avanza.
- *Alternativa descartada*: un contador `siguienteNumero()` que se incrementa al pedirlo. Si alguien lo llama antes de una validación, deja un hueco, y el test del spec solo lo detectaría si justo ese camino está cubierto.

### D3 — Formato del número y del CAE
- El número es `PUNTO_DE_VENTA` (`'00001'`) + `-` + el número completado a 8 dígitos. Por ejemplo, `00001-00000001`.
- El CAE es `AAMMDD` (fecha de emisión en Argentina) + el punto de venta en 2 dígitos (`'01'`) + el número en 6 dígitos, en total 14. Por ejemplo, `26120101000001`.

La decisión de Integrante 5 pide "fecha + punto de venta + número, completado a 14 dígitos". Pero la versión completa no entra: 6 + 5 + 8 = 19 dígitos. Por eso se recorta el punto de venta a 2 dígitos y el número a 6.
- *Alternativa 1*: AAMMDD + PV de 5 dígitos + número de 3. Entra en 14, pero repite CAE después de 999 facturas en el mismo día.
- *Alternativa 2*: un hash de (fecha, PV, número) llevado a 14 dígitos. Es determinístico, pero no se puede verificar a mano, y el dominio tendría que usar `node:crypto` o su propio hash.
- La elegida es única hasta 999.999 facturas, que es inalcanzable con persistencia en memoria.
- Integrante 5 confirmó este formato el 2026-11-25.

### D4 — Fechas en el calendario de Argentina
`fechaArgentina(instante)` le resta `OFFSET_MS` (3 h) al instante y toma el año, el mes y el día en UTC. Devuelve `'AAAA-MM-DD'`. `sumarDias(fecha, 10)` hace la cuenta con `Date.UTC(...)`, siempre construyendo `Date` con argumentos, y cruza bien meses y años. `fechaEmision` y `vencimientoCae` son textos `AAAA-MM-DD`, no `Date`, porque son fechas de calendario y no instantes. Esto evita que la serialización JSON a UTC las corra un día. La factura también guarda `emitidaEn: Date`, que es el instante del reloj.
- *Alternativa descartada*: `Intl.DateTimeFormat` con `timeZone`. Funciona, pero es distinto de lo que usa el resto del dominio y depende del ICU de Node.

### D5 — Importe y concepto
- `IMPORTE_FACTURA_SIMULADA = 25000`: un número entero de pesos ficticios, constante, igual que `MONTO_SENA_SIMULADA`. El cuerpo no lo puede cambiar.
- El concepto es `prestacion.nombre`, que se busca con `deps.prestaciones.buscarPorId`. Si la prestación no existe, se usa `'Prestación odontológica'`.

### D6 — Emisor y receptor
- `EMISOR_SIMULADO = { razonSocial: 'Consultorio Ficticio', cuit: '20-99999999-0', condicionIva: 'Monotributo' }`, una constante del dominio.
- El receptor es `{ condicion: 'Consumidor Final', nombre?, dni? }`. Si `deps.pacientes.buscarPorId(turno.pacienteId)` encuentra al paciente, se completan `nombre` y `dni: pacientePublico(paciente).dni`. Así se reutiliza C-08 **sin modificarlo**, como pidió la decisión 8. Si el paciente no existe, el receptor queda solo como "Consumidor Final".
- La factura guarda únicamente el DNI ya enmascarado, nunca el completo.
- *Riesgo aceptado*: si C-08 cambia su formato de máscara, cambia el de la factura. El test de datos del comprobante lo va a detectar.

### D7 — Errores y el 409 con `facturaId`
El caso de uso devuelve uno de estos errores:
```
| { tipo: 'permiso' | 'entrada' | 'no-encontrado'; mensaje }
| { tipo: 'regla'; error: ErrorDeRegla }                       // estado distinto de atendido (SU-07)
| { tipo: 'ya-facturado'; mensaje; turnoId; facturaId }
```
Para `ya-facturado`, el router responde **directamente** con `409` y el mismo cuerpo que arma `manejadorDeErrores`, pero agregando `facturaId`. Es el mismo mecanismo que C-11 usa para su 404:
`{ error: { tipo: 'regla', regla: 'RN-SM-03', mensaje, conflicto: { turnoId, facturaId } } }`.
- *Alternativa descartada*: agregar `facturaId?` a `ErrorDeRegla.conflicto` en `result.ts`. Sería un cambio aditivo en un archivo compartido, que requiere PR del team lead y le cambia el tipo a todos los módulos. Queda anotado como sugerencia en el handoff. Integrante 5 confirmó este enfoque el 2026-11-25.

### D8 — Orden del caso de uso
Gana el primer fallo:
1. rol (`admin`/`recepcion`, si no → 403);
2. cuerpo (400);
3. turno inexistente (404);
4. estado distinto de `atendido` (409 `RN-SM-03`, el mensaje cita SU-07, `conflicto.turnoId`);
5. ya facturado (409 con `facturaId`);
6. armar la factura (`id = randomUUID()`, número, CAE y fechas con `deps.clock.ahora()`);
7. guardar;
8. auditar `factura_emitida` sobre la entidad `turno`, con `detalle = JSON.stringify({ facturaId, numero, cae, importe, simulado: true })`.

El estado se valida antes que el duplicado. Como `atendido` es terminal, un turno ya facturado siempre llega al paso 5.

### D9 — Respuesta y router
`arcaRouter(deps, facturas = new FacturaCRepositoryEnMemoria())` monta `POST /sim/arca/facturas` y responde `201`:
```
{ simulado: true, aviso: 'SIMULACIÓN — sin validez fiscal',
  factura: { id, turnoId, tipo: 'C', numero, cae, fechaEmision, vencimientoCae, emitidaEn,
             importe, concepto, emisor, receptor, simulado: true } }
```
El repositorio es parámetro del router para que los tests puedan inyectar uno y revisarlo. En `app.ts` solo se agregan el `import` y `app.use('/api', arcaRouter(deps));` antes del 404 de `/api`.

### D10 — Pantalla `public/sim/arca.html`
- Arriba, una franja de simulación persistente con "SIMULACIÓN — sin validez fiscal", también visible al imprimir.
- Lee `?turnoId=`. Si falta, muestra un aviso y deja el botón deshabilitado.
- Tiene un botón "Emitir factura C". **La pantalla no emite sola al cargar**, para que recargar la página no genere un 409 sin que nadie lo haya pedido. Así se cumple la decisión 12: la pantalla hace el POST, pero solo con un gesto explícito.
- Si la emisión sale bien, muestra el comprobante con: tipo C con su recuadro, número, fechas, emisor, receptor, concepto, importe, CAE y vencimiento. También aparece un botón "Imprimir" (`window.print()`), y la hoja de impresión oculta los controles.
- Si hay error, muestra el `mensaje` del cuerpo. En el 409 de duplicado, agrega "Este turno ya tiene factura".
- Llama a `fetch('/api/sim/arca/facturas', { headers: { 'X-Rol': 'recepcion', … } })`, solo con una ruta relativa.
- Los estilos vienen de `/styles/tokens.css`, sin recursos remotos nuevos.
- El aspecto debe seguir el mockup aprobado (ver UI Mockups).

El spec solo exige lo que se puede testear automáticamente: el rótulo y que la pantalla llame únicamente al endpoint con `X-Rol: recepcion`. El resto del comportamiento de esta pantalla es de interfaz y se revisa a mano en D12 (tarea 5.3), igual que en C-11:
- leer `?turnoId=`;
- emitir solo al tocar el botón;
- mostrar el comprobante y los mensajes de error, incluido el 409 "ya facturado";
- avisar y deshabilitar el botón si falta `turnoId`;
- la vista de impresión.

### D11 — Tests sin red
Igual que en C-11:
- *Dinámico*: se espían `fetch`, `http`, `https` y `net` para que fallen, y se emiten dos facturas.
- *Estático*: los `.ts` de `src/simulators/arca/` no tienen `fetch(`, ni imports de `http`, `https`, `net`, `tls` o `dgram`, ni `axios`, `node-fetch`, `undici`, `soap`, `afip` o `arca` como paquetes, ni URLs `http(s)://`. El HTML de `arca.html` no tiene URLs absolutas.

### D12 — Verificación manual y visual
Cubre lo que no está en el spec (D10). Con `npm run dev` y `SIM_NOW` fijo:
1. crear un turno, marcarlo `atender` (C-03) y abrir `/sim/arca.html?turnoId=<id>`. Al cargar, la pantalla muestra el turno y **no** emite nada; recargar tampoco emite;
2. tocar "Emitir factura C": aparece el comprobante con `00001-00000001`, el CAE, el vencimiento y el DNI enmascarado;
3. volver a emitir el mismo turno, desde otra pestaña o recargando y tocando el botón: muestra el 409 "Este turno ya tiene factura / turno ya facturado";
4. tocar "Imprimir": la vista previa muestra solo el comprobante, con la franja "SIMULACIÓN — sin validez fiscal" y la marca de agua, y sin controles;
5. abrir la pantalla sin `turnoId`: aparece el aviso "Falta el turno" y el botón está deshabilitado;
6. abrirla con un turno `reservado` y emitir: muestra el mensaje SU-07 (409).

Se capturan 390×844 y 1440×900 en `mockups/verify/` y se comparan con el mockup.

## Risks / Trade-offs

- [La numeración y las facturas se pierden al reiniciar el servidor (DD-03)] → Se documenta en el handoff. Es aceptable porque el comprobante no tiene validez fiscal.
- [CAE recortado a 6 dígitos de número: con más de 999.999 facturas se repetiría] → Es inalcanzable en memoria. Queda documentado en D3.
- [La respuesta del 409 de duplicado se arma en el router y no en el middleware compartido, y podrían desalinearse] → El test de API compara el cuerpo completo (`tipo`, `regla`, `mensaje`, `conflicto`).
- [Dependencia de `pacientePublico` de C-08] → El test de datos del comprobante fija el formato `99****01`.
- [Un error en el offset de medianoche correría la fecha y el CAE] → Hay escenario de borde (`23:59 -03:00`) y otro de cruce de año.
- [Línea base en rojo en `master`] → Se verifica C-12 con `npx vitest run tests/simulators/arca` y se reportan aparte los 14 tests ajenos.

## Open Questions

- **Importe**: ¿un valor por prestación (lo que implicaría precio en `Prestacion`, en la Zona de C-07) o descontar el copago de la obra social (C-08)? Por ahora es una constante. Cambiarlo después solo toca `facturaC.ts` y un escenario.
- **KB 04 y 03**: la KB no define `numero`, `fechaEmision`, emisor ni receptor con este detalle. Se propone que el team lead actualice 04 §Simuladores con la forma final de `FacturaC`.
- **Rango de DNI ficticio en la KB**: `knowledge-base/04_modelo_de_datos.md` §Seed pone de ejemplo `00.000.0NN`. Sin embargo, el spec vigente `datos-ficticios`, el seed (`99000001`…`99000010`) y la regla dura 9 usan `99.xxx.xxx`. C-12 sigue el spec y el seed: `pacientePublico` devuelve `99****01` para `pac-01` (verificado el 2026-11-25). Se propone que el team lead corrija el ejemplo de la KB 04.
- **`ErrorDeRegla.conflicto`**: ¿se generaliza en `result.ts` para admitir más ids? Es una decisión del team lead; ver D7.

## UI Mockups

- Design system revision: 1
- Decision: yes, 2026-11-25
- Mockups: `openspec/changes/emitir-factura-c-arca-sim/mockups/`
- Approval: approved (2026-11-25, by user)
- Preview: rendered (2026-11-25, Playwright, tema claro; `mockups/previews/arca-comprobante-{390,1440}.png`)
- Visual verify: pending
