# Design

## Context

La motivación está en proposal.md (Why). Lo que heredamos de C-01 y C-02 y condiciona este diseño:

- `validarNuevoTurno(candidato, { prestacion, profesional, bloqueos, turnos })` es una función pura. Calcula `fin`, exige alineación a 15 minutos, franja, ausencia de bloqueos y ausencia de solapamiento por profesional, sillón y paciente, e ignora los cancelados. Considera únicamente los turnos que recibe.
- `Profesional.disponibilidad: Franja[]` usa `diaSemana` ISO (1 = lunes) y `desde`/`hasta` en `'HH:mm'` con la hora del consultorio. La zona horaria es UTC-03:00 fija, sin horario de verano.
- Puertos disponibles: `TurnoRepository<Turno>.listarActivos({ rango })`, `BloqueoRepository.listarEn(rango)`, `SillonRepository.listar()` (los sillones tienen `activo`) y `Clock.ahora()`.
- `errores.ts` ya convierte `ErrorDeEntrada` en 400 y `ErrorDePermiso` en 403. `rolSimulado` deja `res.locals.usuario: Usuario | undefined`.
- Seed: el bloqueo global "reservado urgencias" (18:30 a 19:00) cubre 4 semanas desde el lunes de la semana del reloj.

## Goals / Non-Goals

**Goals:**
- Que los huecos sean consistentes con el alta **por construcción**, no por duplicar reglas.
- No modificar `validarNuevoTurno`, `turno.ts` ni ningún archivo de otra Zona. Lo único compartido es una línea en `app.ts`.

**Non-Goals:**
- Filtrar por profesional `activo`. C-02 tampoco lo valida, así que queda igual para mantener la coherencia.
- Optimizar el algoritmo. El volumen máximo por día es de unos 36 inicios × 3 sillones, y no hace falta aritmética de intervalos.
- Validar RN-AG-05 (paciente): no hay paciente al consultar.

## Decisions

### D1. Generar candidatos y validarlos con el motor de alta
`calcularHuecos` genera todos los inicios candidatos y le pregunta a `validarNuevoTurno` si cada uno es válido. No calcula "restas de intervalos" por su cuenta.
- **Por qué**: US-014 pide "el mismo motor que valida la creación". Si mañana cambia una regla de alta, los huecos cambian solos, y no hay dos implementaciones que puedan divergir.
- **Alternativa descartada**: restar bloqueos y turnos a las franjas con aritmética de intervalos. Es más eficiente, pero duplica RN-AG-02 y RN-AG-04 y abre la puerta a inconsistencias. La consistencia es justamente el criterio de aceptación central.

### D2. Firma pura
```ts
interface Hueco { readonly inicio: Date; readonly fin: Date; readonly sillonId: string }
interface ContextoHuecos {
  readonly fecha: string;                 // 'YYYY-MM-DD', fecha local del consultorio
  readonly desde: Date;                   // límite inferior (la hora del Clock, inyectada)
  readonly prestacion: Prestacion;
  readonly profesional: Profesional;
  readonly sillonIds: readonly string[];  // sillones activos, en el orden de preferencia
  readonly bloqueos: readonly Bloqueo[];
  readonly turnos: readonly TurnoExistente[];
}
function calcularHuecos(ctx: ContextoHuecos): Hueco[]
```
El dominio no lee el reloj: recibe `desde` (regla dura 5). El caso de uso pasa `clock.ahora()`.

### D3. Recorrido
1. A partir de `fecha` se calcula el día ISO de la semana con aritmética UTC, sin depender del TZ del proceso.
2. Para cada franja de ese día, en orden por `desde`, se arma el instante `${fecha}T${desde}:00-03:00`. Desde ahí se avanza de 15 en 15 minutos mientras `inicio + duración <= hasta` (RN-AG-01: terminar justo en el cierre es válido).
3. Se descarta todo candidato con `inicio < desde`. Un inicio igual a `desde` se conserva.
4. Para cada candidato se recorren los `sillonIds` en orden. El primero que `validarNuevoTurno` acepta produce el hueco y se pasa al siguiente inicio. Así queda **un hueco por horario** (decisión de explore).
5. El resultado sale ordenado por inicio, porque las franjas y los pasos se recorren en orden.

### D4. Paciente sin turnos
`validarNuevoTurno` exige un `pacienteId`. Se le pasa un identificador centinela interno que no coincide con ningún turno, con lo que la regla del paciente nunca se dispara. El riesgo se reduce porque `crearTurno` sigue validando RN-AG-05 al reservar.

### D5. Preferencia de sillón
Los sillones activos se ordenan por `id` de forma ascendente (`sillon-1` antes que `sillon-2`), y los inactivos se excluyen. El resultado es determinista y fácil de testear. **Alternativa descartada**: balancear la carga entre sillones. Agrega complejidad sin un pedido explícito.

### D6. Caso de uso `consultarHuecos`
`consultarHuecos(deps, usuario, { prestacionId, profesionalId, fecha }): Result<Hueco[], ErrorConsulta>`, con `ErrorConsulta = { tipo: 'permiso' | 'entrada', mensaje }`.
- Si no hay usuario, devuelve `permiso`. Cualquiera de los 4 roles puede consultar (decisión de explore).
- Si la prestación o el profesional no existen, devuelve `entrada`.
- Calcula el rango del día `[fecha 00:00-03:00, +24 h)` y carga con él `bloqueos.listarEn(rango)` y `turnos.listarActivos({ rango })`, sin filtrar por profesional ni por sillón: el dominio necesita las dos dimensiones.
- No guarda nada ni registra auditoría, porque es una consulta.

### D7. Validación de entrada en la ruta
- Cada uno de `prestacionId`, `profesionalId` y `fecha` tiene que venir como un string no vacío y una sola vez. Si llega repetido (un array en `req.query`), responde 400.
- `fecha` tiene que cumplir `^\d{4}-\d{2}-\d{2}$` y además ser una fecha de calendario real. `2026-02-30` responde 400. Se comprueba armando la fecha con `Date.UTC` y verificando que el año, el mes y el día no cambien.
- La respuesta es `200 { huecos: [{ inicio, fin, sillonId }] }`. Las fechas se serializan en ISO (UTC, con `Z`), igual que en `GET /api/turnos`.
- Que no haya huecos (fin de semana, día completo o fecha pasada) **no es un error**: responde `200` con `huecos: []`.

### D8. Montaje y tests dentro de la Zona
- `app.use('/api', disponibilidadRouter(deps))` va en `app.ts`, antes del 404 de `/api`. Es la única línea compartida.
- Los tests del caso de uso viven en `tests/api/disponibilidad.test.ts` (supertest con el seed real y `RelojFijo`), porque `tests/application/` no está en la Zona de C-05.
- `tests/domain/agenda/huecos.test.ts` incluye el **test de consistencia bidireccional** sobre los datos del seed. Por un lado, todo hueco devuelto es aceptado por `validarNuevoTurno` con un paciente sin turnos. Por el otro, todo inicio alineado de la franja que sea aceptado para algún sillón activo y posterior a `desde` aparece en la lista.

## Risks / Trade-offs

- [Riesgo] Si C-02 cambia el orden o las reglas de `validarNuevoTurno`, los huecos cambian. → Mitigación: es justamente lo buscado (D1), y el test de consistencia lo detecta.
- [Riesgo] El centinela de paciente (D4) podría coincidir con un id real. → Mitigación: usar un valor imposible para el seed y el formato de ids (por ejemplo, el string vacío no es válido en el alta), documentado en el código.
- [Trade-off] Un hueco por horario oculta que puede haber más de un sillón libre. → Si recepción lo necesita en una UI futura, se agrega un parámetro opcional sin romper el contrato.
- [Trade-off] Un sillón inactivo no ofrece huecos, aunque C-02 permite crear un turno en él. → La consistencia se mantiene en la dirección que importa: todo hueco ofrecido es válido.
- [Riesgo] Las ramas de C-09 y C-10 también tocan `app.ts`. → El conflicto, si aparece, es trivial (líneas de montaje independientes).

## UI Mockups

- Decision: no (no UI), 2026-11-23. C-05 es dominio, caso de uso y endpoint; la UI del bot es de C-06.

## Migration Plan

No aplica: endpoint nuevo, sin datos persistidos ni cambios de contrato existentes. El rollback es revertir el PR.
