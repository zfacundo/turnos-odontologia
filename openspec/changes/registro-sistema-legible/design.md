## Context

Para la motivación, ver `proposal.md`. Lo que hay hoy en el código:

- `EventoAuditoria` = `{ fecha, usuarioId, rol, accion, entidad, entidadId, detalle? }`. El puerto `Auditoria` es **solo inserción**.
- Inventario real de productores (relevado con `grep "auditoria.registrar"` en `src/`):

| Productor | `accion` | `entidad` / `entidadId` | `detalle` |
|---|---|---|---|
| `crearTurno.ts` | `crear` | turno / id | JSON del `Turno` (`pacienteId`, `profesionalId`, `inicio`, `origen`, `esSobreturno`, …) |
| `cambiarEstadoTurno.ts` (`persistirCambio`) | `confirmar`, `atender`, `ausente`, `cancelar` | turno / id | `{ antes: Turno, despues: Turno }` (en `cancelar`, `despues.motivoCancelacion`) |
| `reprogramarTurno.ts` | `reprogramar` | turno / id | `{ antes, despues }` |
| `simulators/mercadopago/pagarSena.ts` | `sena_aprobada`, `sena_rechazada` | turno / id | `{ pagoId, monto, simulado }` |
| `simulators/arca/emitirFacturaC.ts` | `factura_emitida` | turno / id | `{ facturaId, numero, cae, importe, simulado }` |
| `historia/registrarEntrada.ts` | `historia-crear` | paciente / id | — |
| `historia/listarHistoria.ts` | `historia-consultar` | paciente / id | — |
| `auth/iniciarSesion.ts`, `auth/cerrarSesion.ts` | `login`, `logout` | sesion / **usuarioId** (no el token) | — |

- No se auditan hoy: los bloqueos (`configuracion/crearBloqueo.ts`, `eliminarBloqueo.ts`) ni los sobreturnos (C-13 no está implementado: `crearTurno` pone `esSobreturno: false`).
- `registroLegible(eventos)` solo formatea `crear` y lo hace con `pacienteId`. Para el resto arma `${accion}: ${entidad} ${entidadId}.`. El payload de `GET /api/registro` es `{ fecha, usuarioId, rol, mensaje }`.
- El panel (`public/admin/js/agenda.js` → `formatearRegistro`) usa solo `fecha` y `mensaje`: muestra los últimos 10, del más reciente al más antiguo.
- `Deps` tiene `pacientes`, `profesionales`, `turnos` (`buscarPorId` devuelve también cancelados) y `usuarios` (con `nombre` y `rol`).

## Goals / Non-Goals

**Goals:**
- Que la traducción evento → mensaje sea una **función pura**, testeable por tipo de evento con TDD estricto.
- Que el payload crezca solo de forma aditiva y que `GET /api/auditoria` no cambie.
- Que los nombres se resuelvan **al leer** (no al auditar), sin tocar a ningún productor.

**Non-Goals:**
- Agregar auditoría de bloqueos o de otras acciones (zona C-07; cambiaría qué se audita).
- Paginar o filtrar el registro, o traducir el texto a otros idiomas.
- Cambiar la tarjeta del panel.

## Decisions

### D1. Función pura `describirEvento(evento, directorio)` y un directorio de nombres
`src/application/auditoria/mensajesRegistro.ts` (nuevo) exporta `describirEvento(evento: EventoAuditoria, dir: DirectorioRegistro): string` y una tabla `accion → describir`. `DirectorioRegistro` es una interfaz de **solo lectura**:

```ts
interface DirectorioRegistro {
  nombrePaciente(id: string): string | undefined;
  nombreProfesional(id: string): string | undefined;
  usuario(id: string): { nombre: string; rol: Rol } | undefined;
  turno(id: string): { pacienteId: string; profesionalId: string; inicio: Date } | undefined;
}
```

`registroLegible(eventos, dir)` mapea cada evento a `{ fecha, usuarioId, rol, accion, entidad, entidadId, mensaje }`. La ruta arma el directorio con `directorioDesde(deps)` (adaptador fino sobre los repositorios en memoria reales).

**Alternativas**: (a) Enriquecer el `detalle` en cada productor con los nombres: toca 9 archivos de 6 zonas, cambia qué se guarda en un log HIGH-adjacent y duplica datos personales en la auditoría. Se descartó. (b) Pasar `deps` entero a la función: la ata a Express/Deps y complica los tests. Se descartó.

**Tests**: se construye el directorio con `directorioDesde(cargarSeed(new RelojFijo(...)))`, con repositorios reales y sin mocks (Regla Dura 7). Los eventos de entrada son literales `EventoAuditoria` armados en el test (datos, no dobles).

### D2. De dónde sale el turno
Para las acciones con `entidad: 'turno'`, primero se usa el `detalle`: `crear` → el turno, y `{antes, despues}` → `despues` (y `antes` para el horario y el profesional anterior en `reprogramar`). Si el detalle no sirve (ausente, no es JSON o le faltan campos), se usa `dir.turno(entidadId)`. Si tampoco aparece, se usan los textos de reemplazo del spec. El parseo usa `unknown` + narrowing (Regla Dura 4) y nunca lanza.

**Por qué el detalle primero**: refleja el estado **en el momento del evento**. Si el turno después se reprogramó, un `confirmar` anterior debe mostrar su horario de entonces.

### D3. Formato de fecha propio, con desplazamiento fijo
`etiquetaTurno(inicio)` → `"Mar 01/12 10:00"`. Usa el desplazamiento fijo UTC-03:00 de America/Argentina/Buenos_Aires (sin horario de verano desde 2009) y nombres de día propios (`Dom, Lun, Mar, Mié, Jue, Vie, Sáb`), como `etiquetaHorario` del bot pero con día y mes de dos dígitos. **Alternativa**: `Intl.DateTimeFormat('es-AR', { weekday: 'short' })`. Su salida ("mar", "mar.") depende de la versión de ICU del runtime y vuelve frágiles los tests. Se descartó. No se reutiliza el helper del bot porque vive en otra zona (`simulators/whatsapp`) y su formato de día y mes no lleva ceros.

### D4. Quién lo hizo
En este orden: `dir.usuario(usuarioId)?.nombre`; si `usuarioId` empieza con `whatsapp:`, "el paciente por WhatsApp (simulación)" (el teléfono que trae el id nunca va al mensaje); si `rol === 'paciente'`, "el paciente"; si no, el rol legible (`admin` → "Administración", `recepcion` → "Recepción", `odontologo` → "Odontología", `paciente` → "Paciente"). `login`/`logout` usan el mismo directorio de usuarios y el rol legible entre paréntesis.

### D5. Privacidad por construcción
- Los mensajes **solo** interpolan nombres del directorio, etiquetas de fecha, montos e importes formateados, el número de comprobante y el motivo recortado. Nunca interpolan `entidadId`, `usuarioId`, `detalle` crudo, `cae`, `pagoId` ni `facturaId`.
- El motivo de cancelación es texto libre de recepción: se recorta a 80 caracteres + "…" y se muestra entre «». Ver Open Questions.
- `historia-*` no tiene `detalle` y el mensaje no consulta el repositorio de historia, así que el contenido clínico no puede filtrarse.
- Un test de propiedad recorre todos los tipos de evento y verifica que ningún mensaje coincida con un regex de uuid, con DNI o teléfonos del seed, con el token de sesión ni con el CAE.

### D6. Compatibilidad del payload y del spec anterior
- Los campos nuevos (`accion`, `entidad`, `entidadId`) se agregan al final del objeto. El panel los ignora.
- Se conserva el prefijo "Turno creado:" que exige el escenario actual. `tests/api/auditoria.test.ts` deja de esperar `pac-01` en el mensaje y pasa a esperar "Paciente Ficticio Uno". Es el cambio de comportamiento que pide el change, no una regresión.
- Montos: `$` + separador de miles `.`, sin depender del locale (igual que `montoPesos` del bot, reimplementado en el módulo para no cruzar zonas).

### D7. Sin cambio visual y sin mockup
La tarjeta "Lo que hizo el sistema" ya dibuja `fecha` + `mensaje` en una lista. Los mensajes nuevos son más largos pero el layout no cambia (el texto ya hace wrap dentro de `ul.registro`). No hay pantallas, componentes ni estilos nuevos o modificados, así que, por la política `system-and-mockups`, **no hace falta mockup**. Si al implementar el texto rompe la tarjeta, se vuelve a Propose con un mockup.

### D8. Auditoría HIGH-adjacent: qué NO se toca
No se tocan el puerto `Auditoria`, su implementación en memoria, ningún productor, `GET /api/auditoria` ni los permisos (admin y recepción, RN-AU-02). `registroLegible` recibe `readonly EventoAuditoria[]` y no muta nada. Un escenario del spec verifica que `GET /api/auditoria` queda idéntico después de consultar el registro.

## Risks / Trade-offs

- [Nombres resueltos al leer: si un paciente cambia de nombre, los eventos viejos muestran el nombre nuevo] → Es aceptable para el TP (no hay edición de nombres en alcance). El registro crudo de `GET /api/auditoria` sigue siendo la fuente.
- [El motivo de cancelación puede tener datos sensibles escritos a mano] → Se recorta y solo lo ven admin y recepción, que ya lo ven en la agenda. Ver Open Questions.
- [La tabla de acciones queda desactualizada cuando un change futuro agrega una acción] → El fallback genérico no muestra ids. Una tarea agrega un test que falla si aparece en `src/` una `accion` literal nueva sin mensaje propio.
- [Zona de un compañero] → `src/application/auditoria/`, `src/api/routes/auditoria.ts` y `tests/api/auditoria.test.ts` son de la zona C-09 (Integrante 4). **El team lead y el Integrante 4 deben revisar el PR**. `src/api/routes/auditoria.ts` cambia de forma aditiva (pasa el directorio).

## Migration Plan

Sin datos persistentes (la auditoría vive en memoria). El deploy es directo y el rollback es revertir el PR. Los consumidores de `GET /api/registro` reciben campos extra y pueden ignorarlos.

## Open Questions

- ¿Hay que auditar la creación y eliminación de bloqueos? Hoy no se auditan. Agregarlo es otro change, en la zona C-07, y cuando exista se le suma un mensaje propio a la tabla.
- ¿El motivo de cancelación tiene que aparecer en el registro o alcanza con "Turno cancelado … (con motivo)"? El spec propone mostrarlo recortado. Si el equipo prefiere ocultarlo, cambia solo una fila de la tabla y un escenario.
