> TDD estricto: en cada tarea, primero el test en rojo (nombre dado / cuando / entonces), después el mínimo código para que pase, después la triangulación con un segundo caso y al final el refactor. El directorio se arma con los repositorios en memoria reales del seed (`cargarSeed(new RelojFijo(...))`); no se mockea nada (Regla Dura 7). Fechas fijas: turno del martes `2026-12-01T10:00:00-03:00`.
>
> Sin cambio visual: no hay mockup (design D7). **No se tocan** los productores de auditoría, el puerto `Auditoria` ni `GET /api/auditoria` (design D8).

## 0. Red de seguridad

- [ ] 0.1 Correr `npx vitest run tests/api/auditoria.test.ts tests/panel/agenda-calculos.test.ts` y anotar el baseline (N tests en verde). Si algo falla, frenar y reportarlo como fallo previo.

## 1. Utilidades puras (`src/application/auditoria/mensajesRegistro.ts`)

- [ ] 1.1 RED/GREEN/TRIANGULATE: `etiquetaTurno(inicio)`. "dado 2026-12-01T13:00Z cuando se formatea entonces es Mar 01/12 10:00", más un segundo caso que cruza de día (`2026-12-02T02:30Z` → "Mar 01/12 23:30"). Verifica: tests en `tests/application/auditoria/mensajesRegistro.test.ts` en verde.
- [ ] 1.2 RED/GREEN/TRIANGULATE: `montoPesos` ($5.000, $25.000, $500) y `recortarMotivo` (motivo corto sin cambios; 200 caracteres → 80 + "…"). Verifica: tests en verde.
- [ ] 1.3 RED/GREEN/TRIANGULATE: `quien(evento, dir)` (D4). Usuario del seed → su nombre; `whatsapp:+54 9 11 0000-0001` → "el paciente por WhatsApp (simulación)" (sin teléfono); rol paciente desconocido → "el paciente"; recepción desconocida → "Recepción". Verifica: 4 tests en verde.
- [ ] 1.4 RED/GREEN: `DirectorioRegistro` + `directorioDesde(deps)` con los repositorios del seed: resuelve `pac-01` → "Paciente Ficticio Uno", `prof-1` → "Dra. Ficticia Perez", `u-recepcion` → usuario, y un turno creado con `crearTurno`; un id inexistente → `undefined`. Verifica: tests en verde.

## 2. Mensaje por tipo de evento (una tarea por fila de la tabla del spec)

Cada test arma el evento con el caso de uso real (o un literal `EventoAuditoria` para los bordes) y compara el **mensaje completo** del escenario.

- [ ] 2.1 RED/GREEN/TRIANGULATE: `crear` con origen recepción, con origen WhatsApp ("(WhatsApp)" y "Por el paciente por WhatsApp (simulación)") y con `esSobreturno: true` ("Sobreturno creado:"). Verifica: 3 tests en verde.
- [ ] 2.2 RED/GREEN: `confirmar` (recepción) y `atender` (Dra. Ficticia Perez). Verifica: mensajes exactos del spec.
- [ ] 2.3 RED/GREEN: `ausente`. Verifica: el mensaje empieza con "Paciente ausente: …".
- [ ] 2.4 RED/GREEN/TRIANGULATE: `cancelar` con motivo, sin motivo en el detalle, con un motivo de 200 caracteres y por WhatsApp. Verifica: 4 tests en verde.
- [ ] 2.5 RED/GREEN/TRIANGULATE: `reprogramar` con el mismo profesional ("de Mar 01/12 10:00 a Mié 02/12 11:00") y con otro profesional ("(antes con Dra. Ficticia Perez)"). Verifica: 2 tests en verde.
- [ ] 2.6 RED/GREEN: `sena_aprobada` ($5.000) y `sena_rechazada`, producidos con `pagarSena` del simulador de Mercado Pago. Verifica: mensajes del spec.
- [ ] 2.7 RED/GREEN: `factura_emitida` con `emitirFacturaC` sobre un turno atendido. Verifica: contiene "N° 00001-00000001 por $25.000" y **no** contiene el CAE.
- [ ] 2.8 RED/GREEN: `historia-crear` (con un texto clínico ficticio en la entrada) y `historia-consultar`. Verifica: mensajes exactos y ninguna parte del texto clínico.
- [ ] 2.9 RED/GREEN: `login` y `logout` con `iniciarSesion`/`cerrarSesion`. Verifica: "Inicio de sesión: Recepcionista Ficticia (Recepción)." / "Cierre de sesión: …" y que no aparece el token.
- [ ] 2.10 RED/GREEN/TRIANGULATE: bordes. `accion` desconocida → "Acción registrada en el sistema: exportar. Por …" sin el uuid. Detalle no JSON + turno inexistente → textos de reemplazo, sin lanzar. Detalle sin turno pero turno guardado → se usa el repositorio (D2). Verifica: 3 tests en verde.
- [ ] 2.11 REFACTOR: tabla `accion → describir` sin `switch` duplicado y parseo del detalle con `unknown` + narrowing (sin `any`). Verifica: todos los tests del grupo 1 y 2 en verde y `npx tsc --noEmit` limpio.

## 3. Privacidad y cobertura del inventario

- [ ] 3.1 RED/GREEN: test de propiedad (D5). Con un evento de cada tipo generado por los casos de uso reales, ningún `mensaje` coincide con un uuid (`/[0-9a-f]{8}-[0-9a-f]{4}-/i`), DNI o teléfonos del seed, el token de sesión, el CAE ni el texto clínico. Verifica: test en verde.
- [ ] 3.2 RED/GREEN: test de inventario. Busca en `src/` los literales `accion: '<x>'` y las acciones de `AccionTurno`/`pagarSena`, y falla si alguna no tiene mensaje propio en la tabla. Verifica: test en verde con las 13 acciones actuales.

## 4. API (`src/application/auditoria/registroLegible.ts`, `src/api/routes/auditoria.ts`)

- [ ] 4.1 RED/GREEN: en `tests/api/auditoria.test.ts`, `GET /api/registro` devuelve cada elemento con `accion`, `entidad`, `entidadId`, `fecha`, `usuarioId`, `rol` y `mensaje`, en orden cronológico. Cambiar `registroLegible(eventos, dir)` y la ruta para que pasen `directorioDesde(deps)`. Verifica: test en verde.
- [ ] 4.2 Actualizar el test existente que espera `pac-01` en el mensaje de "Turno creado:": ahora espera "Turno creado: Paciente Ficticio Uno con Dra. Ficticia Perez, …" y que **no** contenga `pac-01` ni el id del turno. Verifica: test en verde.
- [ ] 4.3 RED/GREEN: "dado N eventos cuando se pide GET /api/registro dos veces entonces GET /api/auditoria devuelve los mismos N eventos sin cambios", y los permisos actuales (odontólogo → 403) siguen iguales. Verifica: tests en verde.

## 5. Panel y cierre

- [ ] 5.1 Confirmar que `tests/panel/agenda-calculos.test.ts` (`formatearRegistro`) sigue en verde sin cambios, y que en `npm run dev` la tarjeta "Lo que hizo el sistema" muestra los mensajes nuevos sin romper el layout a 390 y 1440 px. Verifica: captura en `knowledge-base/entrega/` o en el PR. Si el layout se rompe, volver a Propose con un mockup.
- [ ] 5.2 Correr `npm test` y `npx tsc --noEmit`. Verifica: todo en verde.
- [ ] 5.3 En la descripción del PR, marcar que necesita la revisión del team lead y del Integrante 4 (zona C-09) y que el change es solo de lectura sobre un log HIGH-adjacent (design D8).
