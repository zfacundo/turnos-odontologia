# Proposal

## Why

El paciente necesita poder "pagar una seña" para asegurar su turno (US-060, RN-SM-01), y la demo del TP tiene que mostrar ese circuito de punta a punta sin integrar el Mercado Pago real (DD-02, RN-SM-04). Hoy el turno ya tiene la marca `senado` (C-02), pero nada la pone en `true`.

**Por qué este change ahora**: C-11 es el change asignado a Integrante 5 en CHANGES.md. Depende solo de C-02, que ya está mergeado (GATE 2 abierto), así que se puede hacer en paralelo sin bloquear a nadie. Toca casi únicamente su propia Zona (`src/simulators/mercadopago/`, `public/sim/mercadopago.html`, `tests/simulators/mercadopago/`) y, al ser un simulador sin dinero ni credenciales, tiene governance LOW. Además deja el patrón de simulador (módulo propio + router montado con una línea) que después reutiliza C-12 (ARCA).

## What Changes

- Nuevo endpoint `POST /api/sim/mercadopago/pagos` con cuerpo `{ turnoId, resultado: 'aprobado' | 'rechazado' }`, permitido solo al rol `paciente`.
- Cada intento válido (aprobado o rechazado) queda registrado como un pago de seña simulado (`simulado: true`), con un monto ficticio fijo.
- Un pago aprobado marca el turno con `senado: true`; un pago rechazado no cambia el turno.
- Solo se puede señar un turno `reservado` o `confirmado` que todavía no esté señado (SU-07). Cualquier otro caso responde `409` con la regla `RN-SM-01`. Un turno inexistente responde `404`, un cuerpo inválido `400` y un rol no habilitado `403`.
- Cada intento registrado se audita (`sena_aprobada` / `sena_rechazada`).
- La respuesta exitosa lleva `simulado: true` y el aviso "SIMULACIÓN — no es Mercado Pago real".
- Nueva pantalla `public/sim/mercadopago.html?turnoId=…` con botones Aprobar / Rechazar, rotulada "SIMULACIÓN — no es Mercado Pago real", que llama al endpoint y muestra el resultado.
- El módulo no hace ningún request de red, y un test lo verifica.
- Fuera de alcance: SDK, API o webhooks reales de Mercado Pago, credenciales, reembolsos, "señado" como estado nuevo (IN-04), `GET` de pagos y el efecto de cancelar o reprogramar sobre `senado`.

## Capabilities

### New Capabilities
- `pago-sena-simulado`: pago de seña de un turno con el simulador de Mercado Pago: quién puede pagar, sobre qué turnos, qué efecto tiene aprobar o rechazar, qué se registra y audita, y cómo se rotula la simulación en la API y en la pantalla.

### Modified Capabilities
_(ninguna: `agenda-turnos` ya define el campo `senado`; este change solo le da un escritor sin cambiar sus requisitos)._

## Impact

- **Código nuevo (Zona de C-11)**: `src/simulators/mercadopago/` (dominio, caso de uso, repositorio en memoria de pagos, router), `public/sim/mercadopago.html`, `tests/simulators/mercadopago/`.
- **Compartido, solo aditivo**: `src/api/app.ts`, para montar el router (una línea de `app.use` y su `import`).
- **Puertos que se usan sin modificarlos**: `TurnoRepository<Turno>` (`buscarPorId`, `actualizar`), `Clock`, `Auditoria`.
- **Nota para el team lead**: la línea base de `master` tiene 14 tests en rojo (`odontograma` y `auditoria`), porque `app.ts` no monta esos routers. Es ajeno a C-11, pero bloquea su verificación en verde.
- Sin dependencias nuevas ni llamadas de red.
