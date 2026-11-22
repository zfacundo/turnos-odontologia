# Descripción General

## Stack tecnológico

Restricción del Discovery (§9): TypeScript + Node para la lógica de dominio, API con Express, tests con Vitest; interfaz HTML/JS basada en el prototipo.

| Capa | Tecnologías | Versión mínima |
|---|---|---|
| Lenguaje | TypeScript (modo `strict`) | 5.x |
| Runtime | Node.js | 20 LTS |
| Dominio | TypeScript puro (sin dependencias de framework ni I/O) | — |
| API | Express | 4.x |
| Persistencia | Repositorios **en memoria** detrás de interfaces (ver DD-03) | — |
| Tests | Vitest (unitarios de dominio + integración de API con supertest) | 1.x |
| UI | HTML + CSS + JavaScript (sin framework), servida como estáticos por Express; estilo tomado del prototipo | — |
| Tipografías UI | Bricolage Grotesque (display), DM Sans (cuerpo) — del prototipo | — |

**Suposición:** las versiones mínimas no están fijadas en las fuentes; se proponen las LTS vigentes y se registran en `10_preguntas_abiertas.md`.

## Arquitectura general

Monolito modular en un único repositorio, con el **dominio puro en el centro** (arquitectura hexagonal liviana). El primer change ("crear turno sin solapamientos") vive íntegramente en el dominio y se prueba sin levantar Express.

```
            ┌─────────────────────────────────────────────┐
            │  UI HTML/JS (public/)                        │
            │  Agenda semanal · Bot WhatsApp (SIMULADO) ·  │
            │  Registro del sistema · Lista de espera ·    │
            │  Odontograma · Pantallas de simuladores      │
            └───────────────────┬─────────────────────────┘
                                │ fetch JSON
            ┌───────────────────▼─────────────────────────┐
            │  API Express (src/api/)                      │
            │  rutas → controladores → casos de uso        │
            │  auth simulada por rol (header X-Rol)        │
            └───────────────────┬─────────────────────────┘
                                │
            ┌───────────────────▼─────────────────────────┐
            │  Aplicación (src/application/)               │
            │  casos de uso: crearTurno, cancelarTurno...  │
            │  orquesta dominio + repositorios + auditoría │
            └───────┬───────────────────────────┬─────────┘
                    │                           │
   ┌────────────────▼───────────┐   ┌───────────▼──────────────────┐
   │ Dominio puro (src/domain/) │   │ Infraestructura               │
   │ Intervalo, reglas R1–R7,   │   │ (src/infrastructure/)         │
   │ validarTurno(), slots 15'  │   │ repos en memoria, seed        │
   │ SIN Express, SIN I/O       │   │ ficticio, reloj               │
   └────────────────────────────┘   └───────────────────────────────┘
                    ▲
   ┌────────────────┴──────────────────────────────────────────┐
   │ Simuladores (src/simulators/) — módulos internos ficticios │
   │ whatsapp · mercadopago · obras-sociales · arca             │
   │ consumen casos de uso; NUNCA llaman servicios externos     │
   └───────────────────────────────────────────────────────────┘
```

Justificación:
- El Discovery exige que el núcleo de agenda sea **demostrablemente correcto** → dominio puro, testeable con Vitest sin infraestructura.
- 6 integrantes en paralelo → módulos separables por carpeta (agenda, pacientes, simuladores, UI) para reducir conflictos de merge.
- Referencia NexHealth (informe §6.2): "capa de turnos" separable de la historia clínica, API de citas diseñada desde el inicio.

## Integraciones externas

**Ninguna integración real en el MVP.** Todo lo siguiente es un **simulador interno con datos ficticios**, rotulado como "SIMULACIÓN" en la interfaz y en la documentación.

| Servicio (simulado) | Propósito | Tipo | Integración real (fuera de alcance) |
|---|---|---|---|
| WhatsApp (bot simulado) | Paciente reserva, confirma, cancela, reprograma; recordatorio 24 h antes; ofrecimiento a lista de espera | Módulo interno + panel de chat en la UI (prototipo) | WhatsApp Business API (Meta) |
| Mercado Pago (simulado) | "Pagar seña" → pantalla falsa aprueba/rechaza → turno "señado" | Módulo interno + pantalla falsa | Mercado Pago Checkout |
| Obras sociales (simulado) | Padrón ficticio de 3-4 obras sociales; nº de afiliado → cobertura y % de copago | Módulo interno con datos seed | Padrones / PUCO |
| ARCA (simulado) | "Factura C" con CAE ficticio mostrada como comprobante | Módulo interno | Web services de ARCA (ex AFIP) |
| Google Calendar | — | — | Fuera de alcance |

## API REST (resumen)

Prefijo `/api`. Respuestas JSON. Errores de regla de negocio → `409 Conflict` con código de regla (p. ej. `RN-AG-02`) y el turno en conflicto; validación de entrada → `400`; permiso → `403`.

| Recurso | Endpoints principales |
|---|---|
| Profesionales | `GET/POST /api/profesionales`, `PUT /api/profesionales/:id/disponibilidad` |
| Sillones | `GET/POST /api/sillones` |
| Prestaciones | `GET/POST /api/prestaciones`, `PUT /api/prestaciones/:id` |
| Bloqueos | `GET/POST/DELETE /api/bloqueos` |
| Pacientes | `GET/POST /api/pacientes`, `GET /api/pacientes/:id` |
| Turnos | `POST /api/turnos`, `GET /api/turnos?desde&hasta&profesionalId&sillonId`, `POST /api/turnos/:id/cancelar`, `POST /api/turnos/:id/reprogramar`, `POST /api/turnos/:id/confirmar`, `POST /api/turnos/:id/atender`, `POST /api/turnos/:id/ausente` |
| Huecos libres | `GET /api/disponibilidad?prestacionId&profesionalId&fecha` |
| Lista de espera | `GET/POST /api/lista-espera` |
| Auditoría / registro | `GET /api/auditoria`, `GET /api/registro` |
| Indicadores | `GET /api/indicadores?semana` |
| Simuladores | `POST /api/sim/whatsapp/mensaje`, `POST /api/sim/mercadopago/pagos`, `GET /api/sim/obras-sociales/afiliados/:nro`, `POST /api/sim/arca/facturas` |
| Odontograma | `PUT /api/turnos/:id/piezas` |
