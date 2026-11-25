## Purpose

Dar al dashboard del panel un resumen de solo lectura del día (turnos por estado, señados, huecos libres y próximos turnos) calculado a partir de los turnos y la disponibilidad existentes, sin modificar ningún dato.

## ADDED Requirements

### Requirement: Resumen del día
La API SHALL exponer `GET /api/panel/resumen?fecha=YYYY-MM-DD`, que responde `200` con `{ fecha, turnosDelDia, porEstado, senados, huecosLibres, proximos, simulado: true }`. `fecha` se interpreta en `America/Argentina/Buenos_Aires`; si se omite, MUST usarse la fecha local del reloj inyectado. `turnosDelDia` MUST contar los turnos no cancelados que empiezan ese día; `porEstado` MUST traer las cuatro claves de estados activos `reservado`, `confirmado`, `atendido` y `ausente` (con `0` si no hay); los turnos cancelados no se cuentan porque no ocupan agenda (RN-AG-10); `senados` MUST contar los turnos no cancelados con `senado: true`.

#### Scenario: Conteo por estado
- **GIVEN** el `2026-12-01` con 2 turnos `reservado`, 1 `confirmado` y 1 `cancelado`
- **WHEN** un `admin` hace `GET /api/panel/resumen?fecha=2026-12-01`
- **THEN** `turnosDelDia = 3`, `porEstado.reservado = 2`, `porEstado.confirmado = 1` y `porEstado.atendido = 0`
- **AND** `porEstado` no tiene la clave `cancelado`

#### Scenario: Día sin turnos
- **GIVEN** el `2026-12-06` sin turnos
- **WHEN** un `recepcion` hace `GET /api/panel/resumen?fecha=2026-12-06`
- **THEN** `turnosDelDia = 0` y todas las claves de `porEstado` valen `0`

#### Scenario: Fecha por defecto del reloj
- **GIVEN** el reloj en `2026-12-01T23:30:00-03:00`
- **WHEN** un `admin` hace `GET /api/panel/resumen` sin `fecha`
- **THEN** `fecha = '2026-12-01'`

#### Scenario: Turno que empieza en el borde del día
- **GIVEN** un turno que empieza `2026-12-02T00:00:00-03:00`
- **WHEN** se pide el resumen del `2026-12-01`
- **THEN** ese turno no se cuenta en `turnosDelDia`

### Requirement: Huecos libres del día
`huecosLibres` SHALL ser la cantidad de huecos libres del día para la prestación de menor duración del catálogo, sumando todos los profesionales activos visibles para el usuario, con las mismas reglas que la consulta de disponibilidad existente.

#### Scenario: Turno ocupado reduce huecos
- **GIVEN** el resumen del `2026-12-01` con `huecosLibres = N` para un admin
- **WHEN** se crea un turno válido ese día y se vuelve a pedir el resumen
- **THEN** `huecosLibres` es menor que `N`

### Requirement: Próximos turnos
`proximos` SHALL listar hasta 5 turnos no cancelados del día cuyo inicio es igual o posterior al instante del reloj, ordenados por inicio ascendente, cada uno con `id`, `inicio`, `fin`, `estado`, `pacienteNombre`, `profesionalNombre`, `sillonNombre` y `prestacionNombre`. El nombre del paciente MUST ser el que ya expone la ficha pública.

#### Scenario: Máximo cinco y en orden
- **GIVEN** 7 turnos futuros no cancelados el `2026-12-01`
- **WHEN** se pide el resumen del `2026-12-01` a las `08:00`
- **THEN** `proximos` tiene 5 elementos ordenados por `inicio`

#### Scenario: Turnos pasados no aparecen
- **GIVEN** el reloj en `2026-12-01T12:00:00-03:00` y un turno a las `10:00` de ese día
- **WHEN** se pide el resumen del `2026-12-01`
- **THEN** el turno de las `10:00` no está en `proximos`

### Requirement: Permisos y alcance del resumen
El resumen SHALL estar disponible para `admin`, `recepcion` y `odontologo`. Para `odontologo` todos los conteos y `proximos` MUST limitarse a los turnos y huecos de su propio `profesionalId`. `paciente` o la ausencia de usuario MUST responder `403` con `error.tipo = 'permiso'`. Una `fecha` con formato inválido MUST responder `400` con `error.tipo = 'entrada'`. El endpoint MUST NOT modificar datos ni registrar auditoría.

#### Scenario: Odontólogo ve solo lo suyo
- **GIVEN** el `2026-12-01` con 2 turnos de `prof-1` y 3 de `prof-2`
- **WHEN** `u-odonto-1` (profesional `prof-1`) pide el resumen de ese día
- **THEN** `turnosDelDia = 2`

#### Scenario: Paciente no accede
- **GIVEN** la cabecera `X-Rol: paciente`
- **WHEN** se hace `GET /api/panel/resumen`
- **THEN** la respuesta es `403` con `error.tipo = 'permiso'`

#### Scenario: Fecha inválida
- **GIVEN** un `admin`
- **WHEN** se hace `GET /api/panel/resumen?fecha=01-12-2026`
- **THEN** la respuesta es `400` con `error.tipo = 'entrada'`
