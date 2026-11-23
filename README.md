# Turnos Odontologia

Agenda de turnos para consultorios odontologicos chicos (trabajo practico). **Todos los datos son ficticios** (DNI 99000001-99000010, telefonos `+54 9 11 0000-00NN`) y **la autenticacion es simulada** (headers `X-Usuario` / `X-Rol`). No hay integraciones reales.

## Requisitos

- Node.js 20 o superior

## Uso

```bash
npm install
npm run dev        # servidor con recarga en http://localhost:3000
npm test           # tests (Vitest + supertest)
npm run typecheck  # tsc --noEmit
npm run build && npm start
```

Probar: `curl localhost:3000/api/health` y `curl localhost:3000/api/catalogo`.

## Variables de entorno

| Variable | Efecto |
|---|---|
| `PORT` | Puerto HTTP (default `3000`) |
| `SEED` | `false` arranca con repositorios vacios (default: carga el seed ficticio) |
| `SIM_NOW` | Fecha ISO que fija el reloj (ej. `2026-10-14T12:30:00-03:00`); invalida = el arranque falla |
| `TZ` | Los tests la fijan en `America/Argentina/Buenos_Aires`; el dominio no depende de ella |

## Estructura

```
src/domain/        dominio puro (intervalos [inicio, fin), configuracion, pacientes)
src/application/   puertos (repositorios, Clock, Auditoria)
src/infrastructure repos en memoria, reloj, seed ficticio
src/api/           Express: createApp(deps), middleware de rol y errores, rutas
public/            estaticos (tokens.css, api.js)
tests/             Vitest, espejo de src/
knowledge-base/    fuente de verdad del dominio
openspec/          changes y specs
```

## Errores de la API

Cuerpo `{ error: { tipo, regla?, mensaje, dimension?, conflicto? } }`: regla de negocio `409`, entrada `400`, permiso `403`, inesperado `500`.
