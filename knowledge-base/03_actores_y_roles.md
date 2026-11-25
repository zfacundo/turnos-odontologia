# Actores y Roles

## Actores del sistema

| Actor | Descripción | Cómo interactúa |
|---|---|---|
| Recepcionista | Personal administrativo del consultorio | UI de agenda: crea, cancela y reprograma turnos; da sobreturnos (con permiso); gestiona lista de espera y pacientes |
| Odontólogo (profesional) | Atiende en uno o más sillones | UI de agenda: consulta su agenda diaria/semanal, bloquea horarios, marca atendido/ausente, registra y marca "hecho" las piezas del odontograma del turno |
| Administrador del consultorio | Dueño/responsable | UI de configuración: sillones, prestaciones con duración, horarios de profesionales; ve auditoría e indicadores; puede todo lo que hace recepción |
| Paciente | Persona ficticia que pide turno | **Solo** vía bot de WhatsApp **simulado**; pagar seña (Mercado Pago simulado); consulta de cobertura (obras sociales simulado) |
| Sistema / Bot (actor automático) | Procesos internos | Envía recordatorio 24 h antes (simulado), ofrece huecos liberados a la lista de espera, escribe el registro "Lo que hizo el sistema" |

Nota: el informe §6.3 nombraba solo dos roles ("administrativo, profesional"); el Discovery aprobado (§2) define cuatro. Se adopta el Discovery (ver IN-02 en `10_preguntas_abiertas.md`).

## RBAC — Matriz de permisos

C = crear, R = leer, U = modificar, D = eliminar/cancelar. "Propio" = solo sus propios recursos.

| Recurso / acción | Administrador | Recepcionista | Odontólogo | Paciente (vía bot simulado) |
|---|---|---|---|---|
| Sillones | CRUD | R | R | — |
| Prestaciones (duración) | CRUD | R | R | R (catálogo del bot) |
| Profesionales y disponibilidad | CRUD | R | R; U (propia disponibilidad) | — |
| Bloqueos de agenda | CRUD | CRUD | CRUD (propios) | — |
| Pacientes (ficha mínima) | CRUD | CRU | R | C (alta al reservar) / R (propio) |
| Turno: crear | ✓ | ✓ | — | ✓ (propio, solo huecos libres) |
| Turno: confirmar | ✓ | ✓ | — | ✓ (propio) |
| Turno: cancelar | ✓ | ✓ (siempre) | — | ✓ (propio, **hasta 24 h antes** — R6) |
| Turno: reprogramar | ✓ | ✓ | — | ✓ (propio, misma ventana que cancelar) |
| Turno: marcar atendido / ausente | ✓ | ✓ | ✓ (propios) | — |
| **Sobreturno** | ✓ (auditado) | ✓ (auditado) | **✗** | **✗** (R7) |
| Agenda diaria/semanal | R (todas) | R (todas) | R (propia; todas en lectura) | — (solo huecos ofrecidos) |
| Lista de espera | CRUD | CRUD | R | C (anotarse) |
| Odontograma del turno | — | — | C/R/U (registra "a revisar" y marca "hecho") | — |
| Auditoría | R | R | — | — |
| Indicadores | R | R | R | — |
| Pago de seña (simulado) | R | R | — | C (propio) |
| Factura C (simulado) | CR | CR | R | R (propia) |
| Cobertura obra social (simulado) | R | R | R | R (propia) |

## Autenticación

**Suposición:** al ser un TP con datos ficticios, la autenticación es **simulada**: el usuario elige su rol/usuario en un selector de la UI y la API lo recibe en un header (`X-Usuario`, `X-Rol`). La autorización por rol sí se aplica en la capa de aplicación (y es testeable). Una autenticación real queda fuera del MVP — ver pregunta abierta.

**Ampliación (change `panel-admin-agenda`, DD-09 ampliada):** además de los headers simulados, existe un login simulado (`POST /api/auth/login` con `usuarioId`, sin contraseña) que devuelve un **token opaco** (256 bits, 8 h, en memoria, revocable con logout). Con `Authorization: Bearer <token>` la identidad sale **solo** de la sesión y se ignoran `X-Usuario`/`X-Rol`; sin `Authorization` rigen los headers como siempre (compatibilidad con bot, simuladores y tests). Los headers simulados siguen permitiendo suplantar roles (S-6): una auth real queda fuera del MVP.

| Recurso / acción (panel) | Administrador | Recepcionista | Odontólogo |
|---|---|---|---|
| Resumen del día (`GET /api/panel/resumen`) | R (todo) | R (todo) | R (propio) |
| Historial clínico: leer | R | **✗** | R |
| Historial clínico: alta | **✗** | **✗** | C (con su `profesionalId`) |
| Historial clínico: editar / borrar | — | — | — (no existe) |

## Rutas públicas

- `GET /` y estáticos de la UI (`/public/*`).
- `GET /api/health`.
- Endpoints del bot de WhatsApp simulado (`/api/sim/whatsapp/*`) actúan como "paciente" identificado por su número ficticio, sin login.
- `GET /api/prestaciones` (catálogo para el bot).
