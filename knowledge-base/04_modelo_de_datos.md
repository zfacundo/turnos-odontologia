# Modelo de Datos

> Todos los datos de ejemplo y seed son **ficticios**. Nunca se almacenan datos reales de pacientes en el repositorio, ejemplos, tests ni capturas (RN-DA-01).

## Dominios

| Dominio | Descripción |
|---|---|
| Configuración del consultorio | Sillones, prestaciones (duración), profesionales y su disponibilidad semanal, bloqueos |
| Agenda / Turnos | Turno, intervalo `[inicio, fin)`, estados, sobreturno, validación de solapamientos — **núcleo** |
| Pacientes | Ficha mínima ficticia |
| Lista de espera | Pacientes esperando un hueco |
| Auditoría y registro | Quién/cuándo/qué de cada alta, cambio, cancelación; registro visible "Lo que hizo el sistema" |
| Odontograma | Piezas FDI marcadas en un turno |
| Simuladores | Pagos de seña, padrón de obras sociales, facturas C, conversaciones del bot (todo ficticio) |

## ERD

```
Profesional 1───* Disponibilidad (franjas semanales)
Profesional 1───* Bloqueo (profesionalId opcional)
Sillon      1───* Bloqueo (sillonId opcional)
Prestacion  1───* Turno
Profesional 1───* Turno
Sillon      1───* Turno
Paciente    1───* Turno
Turno       1───* PiezaMarcada (odontograma)
Turno       1───0..1 PagoSena (sim)
Turno       1───0..1 FacturaC (sim)
Paciente    *───0..1 ObraSocial (via nroAfiliado, padrón sim)
Paciente    1───* EntradaListaEspera
Turno/otros 1───* EventoAuditoria
```

## Entidades

### Intervalo (value object, dominio puro)
- `inicio: Date`, `fin: Date` — semiabierto `[inicio, fin)`.
- Constraint: `inicio < fin`; ambos alineados a bloques de 15 min (minutos ∈ {0, 15, 30, 45}).
- Operación clave: `seSolapan(a, b) = a.inicio < b.fin && b.inicio < a.fin` (contiguos **no** se solapan — R1).

### Sillon
- `id: string`, `nombre: string` (p. ej. "Sillón 1"), `activo: boolean`.

### Prestacion
- `id: string`, `codigo: 'control' | 'orto' | 'trat' | 'est' | 'urg' | string`, `nombre: string`, `duracionMin: number` (múltiplo de 15), `color` (token de UI del prototipo).
- Opcional (informe §6.3): `duracionPorProfesional?: Record<profesionalId, number>`.
- Constraint: `duracionMin > 0 && duracionMin % 15 === 0`.

### Profesional
- `id: string`, `nombre: string` (ficticio, p. ej. "Dra. Ficticia Pérez"), `matricula: string` (ficticia), `activo: boolean`.
- `disponibilidad: Franja[]` donde `Franja = { diaSemana: 0..6, desde: 'HH:mm', hasta: 'HH:mm' }`.

### Bloqueo
- `id`, `profesionalId?: string`, `sillonId?: string`, `intervalo: Intervalo`, `motivo: string` (feriado, vacaciones, mantenimiento, "reservado urgencias").
- Constraint: al menos uno de `profesionalId`/`sillonId`, o ninguno = bloqueo global del consultorio (feriado).

### Paciente
- `id`, `nombre: string`, `dni: string` (ficticio), `telefono: string` (ficticio, identifica al paciente en el bot simulado), `email?`, `obraSocialId?`, `nroAfiliado?`.
- Constraint: `dni` único.

### Turno
- `id`, `pacienteId`, `profesionalId`, `sillonId`, `prestacionId`.
- `inicio: Date`, `fin: Date` (calculado: `inicio + duración de la prestación` — R3).
- `estado: 'reservado' | 'confirmado' | 'cancelado' | 'atendido' | 'ausente'`.
- `senado: boolean` (marca del Mercado Pago simulado; ver IN-04).
- `esSobreturno: boolean` (R7), `origen: 'recepcion' | 'whatsapp' | 'telefono'`.
- `motivoCancelacion?: string`, `canceladoPor?: usuarioId`, `creadoPor`, `creadoEn`, `actualizadoEn`.
- Constraints: R1–R5 (ver `05_reglas_de_negocio.md`). Un turno `cancelado` **no** ocupa agenda (no participa de la validación de solapamiento) pero se conserva el registro.
- Índices lógicos: por `profesionalId + inicio`, `sillonId + inicio`, `pacienteId + inicio`.

Mapeo con estados del prototipo (`agenda_odontologia.html`): `pend` ("Sin confirmar") → `reservado`; `ok` ("Confirmó") → `confirmado`; `done` ("Atendido") → `atendido`. El celda `hold` ("Reservado urgencias") del prototipo se modela como **Bloqueo** con motivo "reservado urgencias".

### PiezaMarcada (odontograma)
- `turnoId`, `pieza: number` (FDI: 11-18, 21-28, 31-38, 41-48), `caras?: ('V'|'L'|'M'|'D'|'O')[]` (5 caras), `sintomas: ('dolor_masticar'|'caries_arreglo_roto'|'dolor_persistente'|'pieza_faltante')[]`, `estado: 'a_revisar' | 'hecho'`.
- Constraint: `pieza` válida en FDI permanente (32 piezas). Rojo = `a_revisar`, Azul = `hecho`.

### EntradaListaEspera
- `id`, `pacienteId`, `preferencia: string` (p. ej. "Cualquier día, mañana", "Tardes"), `prestacionId?`, `profesionalId?`, `estado: 'esperando' | 'ofrecido' | 'asignado' | 'retirado'`, `creadoEn`.

### EventoAuditoria
- `id`, `fecha`, `usuarioId`, `rol`, `accion: 'crear' | 'cancelar' | 'reprogramar' | 'confirmar' | 'atender' | 'ausente' | 'sobreturno' | ...`, `entidad`, `entidadId`, `detalle` (antes/después).
- Inmutable (solo inserción).

### Registro del sistema (vista)
- Entradas legibles tipo "Turno creado: …", "Se liberó …", "Lista de espera: el bot le ofreció el turno a …" — panel "Lo que hizo el sistema" del prototipo. Se derivan de auditoría + eventos de simuladores.

### Simuladores (datos ficticios)
- **PagoSena (sim)**: `id`, `turnoId`, `monto`, `estado: 'aprobado' | 'rechazado'`, `fecha`, `simulado: true`.
- **ObraSocial (sim)**: `id`, `nombre` ficticio, `planes`, padrón `{ nroAfiliado, pacienteNombre, plan, cobertura, copagoPct }`.
- **FacturaC (sim)**: `id`, `turnoId`, `numero`, `cae` ficticio, `vencimientoCae`, `importe`, `simulado: true`.
- **MensajeBot (sim)**: `telefono`, `de: 'paciente' | 'bot'`, `texto`, `fecha`.

## Seed data inicial (ficticio)

- 2 sillones ("Sillón 1", "Sillón 2").
- 2 profesionales ficticios con disponibilidad lun-vie 9:00-13:00 y 14:00-19:00 (corte de almuerzo como en el prototipo).
- Prestaciones (Discovery R3 + leyenda del prototipo): Control y limpieza 30 min · Ortodoncia 45 min · Tratamiento 60 min · Estética/Blanqueamiento (duración no definida — ver preguntas abiertas; propuesta 60 min) · Urgencia (propuesta 30 min).
- ~10 pacientes ficticios (nombres inventados, DNI y teléfonos de rango claramente falso, p. ej. `00.000.0NN`, `+54 9 11 0000-00NN`).
- 2 entradas en lista de espera (como el prototipo: "Cualquier día, mañana", "Tardes").
- Padrón simulado de 3-4 obras sociales ficticias (p. ej. "OS Ficticia Salud", "Prepaga Demo") con % de copago.
- 1 bloqueo "reservado urgencias" diario a última hora (como el prototipo).
- Usuarios: 1 admin, 1 recepcionista, 2 odontólogos (selector de rol).
