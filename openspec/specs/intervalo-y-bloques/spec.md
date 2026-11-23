# intervalo-y-bloques Specification

## Purpose

Define el intervalo de tiempo semiabierto `[inicio, fin)` sobre el que se modela toda ocupación de agenda, la detección de solapamiento entre intervalos y la alineación de horarios a bloques de 15 minutos (RN-AG-01, RN-AG-03, RN-DA-03).

## Requirements

### Requirement: Intervalo semiabierto válido
El sistema SHALL representar un intervalo como `[inicio, fin)` y MUST rechazar la creación de un intervalo cuyo `inicio` no sea estrictamente anterior a `fin`, devolviendo un error de regla con código `RN-AG-01` (sin lanzar excepción).

#### Scenario: Intervalo con inicio anterior al fin es aceptado
- **GIVEN** inicio `2026-12-01T09:00-03:00` y fin `2026-12-01T09:30-03:00`
- **WHEN** se crea el intervalo
- **THEN** el resultado es exitoso y conserva inicio y fin

#### Scenario: Intervalo con inicio igual al fin es rechazado
- **GIVEN** inicio y fin ambos `2026-12-01T09:00-03:00`
- **WHEN** se crea el intervalo
- **THEN** el resultado es un error con regla `RN-AG-01`

#### Scenario: Intervalo con inicio posterior al fin es rechazado
- **GIVEN** inicio `2026-12-01T10:00-03:00` y fin `2026-12-01T09:00-03:00`
- **WHEN** se crea el intervalo
- **THEN** el resultado es un error con regla `RN-AG-01`

### Requirement: Detección de solapamiento
El sistema SHALL considerar que dos intervalos A y B se solapan si y solo si `A.inicio < B.fin` y `B.inicio < A.fin`. Intervalos contiguos (uno termina exactamente cuando empieza el otro) MUST NOT considerarse solapados. La operación MUST ser simétrica.

#### Scenario: Intervalos contiguos no se solapan
- **GIVEN** A = `[09:00, 09:30)` y B = `[09:30, 10:00)` del mismo día
- **WHEN** se evalúa si A y B se solapan
- **THEN** el resultado es `false`

#### Scenario: Intervalo contenido se solapa
- **GIVEN** A = `[09:00, 10:00)` y B = `[09:30, 09:45)` del mismo día
- **WHEN** se evalúa si A y B se solapan
- **THEN** el resultado es `true`

#### Scenario: Solapamiento parcial
- **GIVEN** A = `[09:00, 09:45)` y B = `[09:30, 10:15)` del mismo día
- **WHEN** se evalúa si A y B se solapan
- **THEN** el resultado es `true`

#### Scenario: Intervalos separados no se solapan
- **GIVEN** A = `[09:00, 09:30)` y B = `[10:00, 10:30)` del mismo día
- **WHEN** se evalúa si A y B se solapan
- **THEN** el resultado es `false`

#### Scenario: La operación es simétrica
- **GIVEN** cualquiera de los pares anteriores
- **WHEN** se evalúa `seSolapan(A, B)` y `seSolapan(B, A)`
- **THEN** ambos resultados son iguales

#### Scenario: Intervalos idénticos se solapan
- **GIVEN** A = B = `[09:00, 09:30)`
- **WHEN** se evalúa si A y B se solapan
- **THEN** el resultado es `true`

### Requirement: Alineación a bloques de 15 minutos
El sistema SHALL considerar alineado un instante si, en la zona horaria del consultorio (`America/Argentina/Buenos_Aires`), sus minutos son 0, 15, 30 o 45 y sus segundos y milisegundos son 0.

#### Scenario: Inicio a las 9:10 no está alineado
- **GIVEN** el instante `2026-12-01T09:10:00-03:00`
- **WHEN** se evalúa la alineación a bloques de 15 minutos
- **THEN** el resultado es `false`

#### Scenario: Inicio a las 9:15 está alineado
- **GIVEN** el instante `2026-12-01T09:15:00-03:00`
- **WHEN** se evalúa la alineación a bloques de 15 minutos
- **THEN** el resultado es `true`

#### Scenario: Hora en punto está alineada
- **GIVEN** el instante `2026-12-01T14:00:00-03:00`
- **WHEN** se evalúa la alineación a bloques de 15 minutos
- **THEN** el resultado es `true`

#### Scenario: Segundos distintos de cero no están alineados
- **GIVEN** el instante `2026-12-01T09:15:30-03:00`
- **WHEN** se evalúa la alineación a bloques de 15 minutos
- **THEN** el resultado es `false`

### Requirement: Intervalo alineado a bloques
El sistema SHALL ofrecer la creación de un intervalo alineado, que además de `inicio < fin` MUST exigir que `inicio` y `fin` estén alineados a bloques de 15 minutos, devolviendo un error de regla `RN-AG-03` si alguno no lo está.

#### Scenario: Intervalo alineado es aceptado
- **GIVEN** inicio `09:15` y fin `10:00` del mismo día
- **WHEN** se crea un intervalo alineado
- **THEN** el resultado es exitoso

#### Scenario: Intervalo con inicio desalineado es rechazado
- **GIVEN** inicio `09:10` y fin `09:40` del mismo día
- **WHEN** se crea un intervalo alineado
- **THEN** el resultado es un error con regla `RN-AG-03`

#### Scenario: Intervalo con fin desalineado es rechazado
- **GIVEN** inicio `09:00` y fin `09:20` del mismo día
- **WHEN** se crea un intervalo alineado
- **THEN** el resultado es un error con regla `RN-AG-03`
