# Arquitectura Propuesta

## Patrones aplicados

| Patrón | Dónde se usa | Por qué |
|---|---|---|
| Hexagonal liviana (puertos y adaptadores) | `src/domain` ← `src/application` ← `src/api` / `src/infrastructure` | El dominio de agenda debe ser demostrablemente correcto y testeable sin Express ni persistencia |
| Funciones puras de validación | `src/domain/agenda/` (`seSolapan`, `validarNuevoTurno`, `calcularHuecos`) | El primer change se prueba como lógica pura con Vitest |
| Value Object | `Intervalo` `[inicio, fin)`, `BloqueDe15` | Encapsula R1 y R3 en un solo lugar |
| Result / Either en lugar de excepciones | Retorno de validaciones de dominio | Errores de negocio explícitos (regla + conflicto) mapeables a 409 |
| Repository (interfaz) | `TurnoRepository`, `PacienteRepository`, ... en `src/application/ports` | Implementación en memoria hoy, reemplazable sin tocar dominio |
| Caso de uso (application service) | `crearTurno`, `cancelarTurno`, `reprogramarTurno`, ... | Orquesta repos + dominio + auditoría + autorización por rol |
| Event/observer interno simple | Cancelación → lista de espera; acciones → registro del sistema | Desacopla lista de espera y bot del núcleo |
| Módulos por feature (vertical slices) | `agenda`, `configuracion`, `pacientes`, `lista-espera`, `simuladores/*`, `odontograma` | Permite repartir changes entre 6 personas con mínimos conflictos de merge |
| Reloj inyectable | `Clock` puerto | Tests deterministas de la regla de 24 h y del recordatorio |

## Estructura de directorios

```
turnos-odontologia/
├── src/
│   ├── domain/                      # PURO: sin imports de express, fs, Date.now()
│   │   ├── shared/                  # Intervalo, Result, errores de regla, bloques 15'
│   │   ├── agenda/                  # Turno, estados, validarNuevoTurno, calcularHuecos (R1–R7)
│   │   ├── configuracion/           # Prestacion, Profesional/Disponibilidad, Sillon, Bloqueo
│   │   ├── pacientes/
│   │   ├── lista-espera/
│   │   └── odontograma/             # piezas FDI, nombres, caras, síntomas
│   ├── application/
│   │   ├── ports/                   # interfaces de repositorios, Clock, Auditoria
│   │   ├── agenda/                  # casos de uso de turnos
│   │   ├── configuracion/
│   │   ├── pacientes/
│   │   └── lista-espera/
│   ├── infrastructure/
│   │   ├── memory/                  # repositorios en memoria
│   │   ├── seed/                    # datos FICTICIOS
│   │   └── clock/
│   ├── simulators/                  # SIMULACIÓN — nunca llaman a servicios externos
│   │   ├── whatsapp/                # bot: máquina de estados de conversación
│   │   ├── mercadopago/
│   │   ├── obras-sociales/
│   │   └── arca/
│   ├── api/
│   │   ├── routes/                  # un archivo de rutas por módulo
│   │   ├── middleware/              # rol simulado, manejo de errores → HTTP
│   │   └── app.ts                   # createApp(deps) — inyección de dependencias
│   └── server.ts
├── public/                          # UI HTML/CSS/JS basada en el prototipo
│   ├── index.html                   # agenda semanal + registro + lista de espera + KPIs
│   ├── bot.html / bot.js            # chat WhatsApp SIMULADO
│   ├── odontograma.html
│   ├── sim/                         # pantallas falsas MP / ARCA / obras sociales
│   └── styles/tokens.css            # tokens del prototipo (claro/oscuro)
├── tests/
│   ├── domain/                      # unitarios puros (R1–R7) — los más importantes
│   ├── application/
│   └── api/                         # integración con supertest
├── docs/discovery/                  # fuentes (no tocar)
├── knowledge-base/
└── openspec/
```

### Fronteras de módulo y trabajo en equipo (6 integrantes)

- Cada módulo (`agenda`, `configuracion`, `pacientes`, `lista-espera`, `odontograma`, cada simulador, UI) es una carpeta propia en `domain/`, `application/`, `api/routes/` y `tests/` → un change toca mayormente su carpeta.
- **Puntos compartidos de alto riesgo de conflicto**: `src/domain/shared/`, `src/application/ports/`, `src/api/app.ts`, `public/styles/tokens.css`, seed. Se estabilizan en los primeros changes (el núcleo de agenda) y luego se modifican solo de forma aditiva; el team lead revisa los PR que los tocan.
- Registro de rutas: cada módulo exporta un `Router`; `app.ts` solo los monta (cambio de una línea por módulo).
- Los simuladores dependen de casos de uso de `application/`, nunca al revés → pueden desarrollarse en paralelo una vez que existe el núcleo.
- El dominio de agenda es dependencia de casi todo: el primer change ("crear turno sin solapamientos") debe cerrarse antes de paralelizar.

## Seguridad

- **Autenticación**: simulada (selector de usuario/rol en la UI → headers `X-Usuario`/`X-Rol`). Rotulada como simulación. No hay contraseñas.
- **Autorización**: por rol en la capa de aplicación según la matriz RBAC (`03_actores_y_roles.md`); tests de permisos (p. ej. sobreturno solo recepción/admin — R7; ventana de 24 h del paciente — R6).
- **Validación de input**: en el borde de la API (tipos, formato de fecha ISO, alineación a 15 min) antes de llegar al dominio. **Suposición:** validación manual o con una librería de esquemas liviana (p. ej. zod) — decisión del primer change.
- **Datos**: solo ficticios (RN-DA-01). Revisión en PR de que seeds, fixtures y capturas no contengan datos reales.
- **Secrets**: no hay (no hay integraciones reales). Si en el futuro se integran servicios reales, sus credenciales irían en variables de entorno nunca versionadas.
- **Simuladores**: sin llamadas de red salientes; un test puede verificarlo.

## Variables de entorno

| Variable | Descripción | Ejemplo | Sensible |
|---|---|---|---|
| `PORT` | Puerto del servidor Express | `3000` | N |
| `TZ` | Zona horaria del consultorio | `America/Argentina/Buenos_Aires` | N |
| `SEED` | Cargar datos ficticios al iniciar | `true` | N |
| `SIM_NOW` | Fecha/hora simulada para la demo (reloj inyectable) | `2026-10-14T12:30:00-03:00` | N |
| `NODE_ENV` | Entorno | `development` | N |

## Testing

- **Vitest** para todo. Prioridad: `tests/domain/agenda/*.test.ts` cubre R1–R7 con casos borde (back-to-back, solapamiento parcial, contenido, mismo profesional distinto sillón, mismo sillón distinto profesional, fuera de franja, en bloqueo, paciente doble, sobreturno por rol, cancelado no ocupa, ventana 24 h).
- Tests de API con `supertest` sobre `createApp(deps)` con repos en memoria.
- Strict TDD habilitado en el flujo OPSX del equipo (red → green → refactor).
