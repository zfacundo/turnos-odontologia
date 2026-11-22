# Informe de Discovery — Sistema de gestión de turnos odontológicos

| | |
|---|---|
| **Materia** | Desarrollo de Software — Trabajo Global |
| **Integrantes** | `[COMPLETAR: 5 integrantes + team lead]` |
| **Fecha** | 2026-11-22 |
| **Documento** | Informe de Discovery (síntesis de tres relevamientos de mercado) |

---

## 1. Resumen ejecutivo

**Qué se investigó.** Se sintetizaron tres relevamientos de mercado realizados el 2026-11-22 sobre sistemas que gestionan turnos y agenda de pacientes en odontología: (a) productos que operan en Argentina, (b) productos latinoamericanos no argentinos y (c) productos internacionales usados como referencia. Tras deduplicar (Dentalink y AgendaPro aparecían en dos relevamientos) y excluir los que no demostraron alcance odontológico (Doctolib, Clinic Cloud), quedaron **18 sistemas comparables**. Para cada uno se construyó una tabla comparativa con etiqueta de evidencia por celda y una matriz de puntuación ponderada 0-5.

**Hallazgos principales.**

1. **La evidencia es mayoritariamente comercial.** Ningún producto argentino tiene una funcionalidad de agenda respaldada por documentación pública, centro de ayuda o video ([Comprobado]); todo lo relevado en sus sitios es afirmación de marketing ([Comercial]). La única evidencia [Comprobado] vinculada a Argentina son los títulos de los artículos del módulo argentino de Dentalink (obras sociales y receta electrónica) y su guía de notificación por WhatsApp, que documenta un envío **manual**.
2. **El núcleo de agenda está poco documentado en todo el mercado.** Solo 2 de 18 sistemas evidencian agenda por sillón/box (AgendaPro y ClinIA, ambos [Comercial]) y solo 2 evidencian prevención de solapamientos (DentalSoft [Comercial] y Simples Dental [Comprobado en ficha de App Store]). La lista de espera para cubrir huecos solo aparece en dos productos estadounidenses (Open Dental [Comprobado] y NexHealth [Comprobado en listado de productos]).
3. **Lo estándar es otra cosa:** agenda web, odontograma (14 de 18), recordatorios automáticos (WhatsApp en Latinoamérica, SMS/email en EE. UU. y Reino Unido) y reserva online (16 de 18, casi siempre [Comercial]).
4. **Vacío argentino: la combinación local.** Ningún sistema evidencia a la vez obras sociales, Mercado Pago, facturación ARCA, reserva online y WhatsApp automático. DentalSoft cubre todo salvo ARCA; ClinIA todo salvo Mercado Pago; DentalTec tiene obras sociales y ARCA pero no reserva online; AgendaPro tiene reserva online y Mercado Pago pero no obras sociales ni ARCA.
5. **Opacidad de precios.** De los 8 sistemas con relevancia alta o media para Argentina, solo 3 publican precio (DentalSoft, AgendaPro, Odonto.ar), y en dos de ellos la moneda no es explícita.

**Ranking de la matriz B (top 5):** DentalSoft 2,50 · AgendaPro 2,33 · Simples Dental 2,21 · Dentalink 2,05 · ClinIA 1,92 (sobre 5). Las notas son bajas porque la regla castiga la evidencia solo comercial (tope 3) y lo no evidenciado (0); miden **evidencia publicada**, no calidad real del producto.

**MVP recomendado.** Un núcleo de agenda **demostrablemente correcto**: catálogo de prestaciones con duración variable, múltiples profesionales y sillones/boxes, disponibilidad y bloqueos, **creación de turnos sin solapamientos por profesional y por sillón** (primer change), cancelación y reprogramación con revalidación y registro de auditoría. Como diferenciadores alcanzables en el TP: lista de espera para huecos liberados, reglas de cancelación/reprogramación visibles y recordatorio con enlace de confirmación. Integraciones con WhatsApp Business API, Mercado Pago, obras sociales y ARCA quedan para etapas posteriores.

---

## 2. Nota metodológica

**Fuentes.** Tres relevamientos internos realizados con WebSearch y WebFetch según la consigna `research/_consigna-relevamiento.md`:

- `research/argentina.md` — 8 sistemas que operan en Argentina.
- `research/latam.md` — 7 sistemas latinoamericanos no argentinos (incluye Dentalink y AgendaPro, también presentes en el relevamiento argentino).
- `research/internacional.md` — 7 sistemas fuera de Latinoamérica.

Este informe **no agrega búsquedas nuevas**: es una síntesis crítica de esos tres archivos. No se realizaron consultas web de desambiguación (0 de 3 permitidas); las contradicciones se documentan en la sección 9 para que el equipo las resuelva en la verificación manual.

**Fecha de consulta.** Todas las fuentes fueron consultadas el **2026-11-22**.

**Definición de etiquetas** (heredada de la consigna):

| Etiqueta | Significado |
|---|---|
| **Comprobado (…)** | La funcionalidad está demostrada por el producto, documentación pública, centro de ayuda, video oficial, capturas reales o ficha de tienda de aplicaciones (App Store/Google Play). |
| **Comercial (…)** | El proveedor la afirma en su sitio o material de marketing sin demostrarla. |
| **No evidenciado** | No se encontró publicada en las fuentes abiertas. **No significa que el producto carezca de la función**, sino que no hay evidencia. Nunca se completa por analogía. |

Cuando un relevamiento declara que un dato fue **inferido** (por ejemplo, que los precios de DentalSoft estarían en pesos), en este informe se registra como **"No evidenciado (moneda no explícita)"**.

**Limitaciones.**

- **Marketplaces bloqueados:** Capterra, GetApp y G2 devolvieron HTTP 403. Los datos de esos sitios provienen solo de fragmentos de resultados de búsqueda y se tratan como **no confirmados** (no puntúan en la matriz B).
- **Sitios no abiertos:** Doctolib (403), Gesden (403), la página de precios de Ascend by Dentrix (404), varias páginas de Open Dental (404) y varias páginas de Dentally y Curve Dental vistas solo como resultado de búsqueda.
- **Centros de ayuda leídos solo por títulos:** los artículos del módulo argentino de Dentalink no cargaron su cuerpo; solo se confirmó la existencia y título de los artículos. Esto prueba que existe documentación sobre el tema, no el detalle de la funcionalidad.
- **Sin videos oficiales:** ningún relevamiento registró un video oficial con URL; Dentidesk menciona tutoriales en YouTube sin enlace.
- **Fichas de tienda de aplicaciones:** la consigna las considera [Comprobado], pero su texto es redactado por el propio proveedor. Se respeta la etiqueta, con la advertencia de la sección 9.
- **Precios:** no se convirtieron monedas; las cifras se reportan tal como se publicaron.

**Sistemas excluidos de las tablas A y B.**

- **Doctolib** (Francia): el relevamiento internacional indica que no califica como sistema odontológico; sitio oficial no cargó (403) y la evidencia proviene de agregadores y documentos antiguos.
- **Clinic Cloud** (España): producto genérico de clínicas; el relevamiento internacional no pudo evidenciar funcionalidad dental y el argentino lo marca como "No califica" para Argentina.
- **Descartados por los relevamientos:** Medesk, Doctoralia Pro, TurneroMed, Dentech, Medilink, Dently, EasyDental, BestoSys, DentiMax, Gesden, CentralCliniq y otros no verificados (Odonthia y DentalCore quedan como candidatos de segunda ronda).

---

## 3. A. Tabla comparativa

Orden: relevancia para Argentina (operación local y circuitos argentinos primero; referencias internacionales al final). Dentalink y AgendaPro fusionan la evidencia de los relevamientos argentino y latinoamericano. Fecha de consulta de todas las fuentes: 2026-11-22.

| # | Producto / Proveedor | País | Segmento | Modalidad | Reserva online | Recordatorios / WhatsApp | Múltiples sillones / boxes | Prevención de solapamientos | Odontograma | Obras sociales | Mercado Pago | AFIP / ARCA | Precio publicado | Fuente principal y fecha |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **DentalSoft** / DentalSoft | Comercial (Argentina; oficinas en La Plata y Rosario) | Comercial (independiente, consultorio y clínica; hasta 10 profesionales por plan) | Comercial (nube) | Comercial (reserva en 4 pasos, reconoce paciente por DNI, filtra por especialidad y obra social; plan Pro) | Comercial (email automático; WhatsApp automático y asistente de IA solo en plan Pro; en plan Gestión el envío es manual) | No evidenciado | Comercial (sobreturnos y urgencias con detección de solapamientos) | Comercial (18 estados, notación FDI, historial de cambios) | Comercial (cobertura por plan calculada por turno; liquidación por obra social y plan) | Comercial (caja, links de pago, señas y cobro de deuda; parte en plan Pro) | No evidenciado | Comercial (Free $0 por 3 meses; Gestión $30.000/mes; Pro $60.000/mes, por profesional); moneda: No evidenciado (moneda no explícita) | https://dentalsoft.com.ar/ · 2026-11-22 |
| 2 | **AgendaPro** (vertical dental) / AgendaPro Inc. | Comprobado (AgendaPro Inc., pie de página); país de origen: No evidenciado; Comercial (sitio y precios para Argentina, oficina en Santiago de Chile) | Comercial (consultorios y clínicas, multisucursal; producto multi-rubro) | Comercial (nube en AWS) | Comercial (24/7, sitio de reserva, Google Maps/Search, asistente de IA en WhatsApp, Instagram y Messenger) | Comercial (WhatsApp automático 1, 2 o 3 días antes; email y SMS; campañas) | Comercial (agenda por odontólogo, prestación y sillón con duración por práctica) | No evidenciado | Comercial (odontograma por sesión) | No evidenciado (la página argentina menciona FONASA, que es chileno) | Comercial (links de Mercado Pago para seña o pago total) | No evidenciado (facturación en el menú sin mención de ARCA) | Comercial (desde ARS 13.900/mes; prueba de 14 días sin tarjeta) | https://agendapro.com/ar/dental/software-odontologico · 2026-11-22 |
| 3 | **ClinIA** / Emprinet | Comercial (orientado a Argentina) | Comercial (consultorios, clínicas PyME, centros municipales, hospitales públicos, cadenas) | No evidenciado (solo se menciona acceso web) | Comercial (turnero web y app; asistente de IA por WhatsApp que valida contra la agenda) | Comercial (recordatorios automáticos por WhatsApp y correo) | Comercial (agenda por profesional, especialidad o consultorio/sillón) | No evidenciado | Comercial (FDI de 52 piezas, versionado, dentición permanente/mixta/temporaria) | Comercial (facturación a obras sociales y prepagas; verificación de cobertura vía PUCO) | No evidenciado | Comercial (factura electrónica ARCA) | No evidenciado (costo por usuario sin monto; demo gratuita de 45 min) | https://www.clinia.com.ar/odontologia · 2026-11-22 |
| 4 | **DentalTec** / Tándem Digital | Comercial (Argentina) | Comercial (consultorios con varios profesionales; círculos odontológicos) | Comercial (100% web) | No evidenciado | Comercial (WhatsApp automático; declara 40% menos ausentismo) | No evidenciado | No evidenciado | Comercial (interactivo, CIE-10, todas las caras, imágenes adjuntas) | Comercial (validación en tiempo real con más de 15 obras sociales; facturación Círculo/Federación/CORA) | No evidenciado | Comercial (planillas con integración ARCA) | No evidenciado (solo "Solicitar Demo Gratuita") | https://web.dentaltec.com.ar/software-odontologos-argentina · 2026-11-22 |
| 5 | **Bilog** / Bilog | Comercial (Argentina) | Comercial (consultorios, clínicas, obras sociales y gerenciadoras) | Comercial (aplicaciones web y móvil); SaaS/local: No evidenciado | Comercial (reserva, cancelación y consulta online, también pacientes nuevos; asistente iAngela) | Comercial (recordatorios "con un clic" por WhatsApp; automatización no descrita) | No evidenciado | No evidenciado | Comercial (mencionado sin detalle) | Comercial (liquidación a obras sociales) | No evidenciado | No evidenciado | No evidenciado (cuota según plan sin montos) | https://bilog.com.ar/ · 2026-11-22 |
| 6 | **Dentalink** / Software Dentalink | Comercial (Chile; Capterra la ubica en Santiago, fragmento no confirmado); módulo para Argentina | Comercial (clínicas y profesionales; plan Multisucursal) | Comercial (nube en AWS) | Comercial ("Agenda online 24/7", agendamiento online y por WhatsApp; Contact Center IA) | Comprobado (notificación por WhatsApp desde la agenda diaria, **manual** vía WhatsApp Web, con plantilla y enlace de confirmación); Comercial (confirmaciones automáticas) | No evidenciado | No evidenciado | Comercial (plan Esencial) | Comprobado (solo títulos de artículos: crear obra social, recaudar pagos, conciliaciones) | No evidenciado | No evidenciado | No evidenciado (planes a cotizar; "desde USD 29" solo en fragmento de Capterra no confirmado) | https://ayuda.softwaredentalink.com/es/collections/19196578-modulo-exclusivo-para-argentina · 2026-11-22 |
| 7 | **Odonto.ar** / Odonto.ar | No evidenciado (país no declarado; dominio .ar) | Comercial (planes de 1, 5 y 10 usuarios) | Comercial (web sin instalación) | Comercial (link compartible con anticipación mínima, duraciones, motivos y reglas de cancelación/reprogramación) | No evidenciado | No evidenciado | No evidenciado | Comercial (interactivo, con autor y fecha de cada cambio) | Comercial (planes, coberturas, cálculo de parte obra social/paciente, nomenclador personalizable) | No evidenciado (Mercado Pago solo para pagar la suscripción) | No evidenciado | Comercial (Individual 29, Profesional 49, Clínica 99 por mes; prueba de 30 días); moneda: No evidenciado (moneda no explícita, rotulada "USD/aprox. ARS") | https://odonto.ar/ · 2026-11-22 |
| 8 | **OdontoGRAMA** / Solsoftware | No evidenciado (país no declarado; dominio .com.ar y teléfono +54) | Comercial (odontólogo con asistentes y profesionales asociados) | Comercial (nube) | No evidenciado | No evidenciado | No evidenciado | No evidenciado | No evidenciado (no se describe como función) | Comercial (facturación a prepagas y obras sociales) | No evidenciado | No evidenciado | No evidenciado (prueba gratuita sin precios) | https://odontograma.com.ar/ · 2026-11-22 |
| 9 | **Klinicos** / Klinicos | Comercial (Uruguay; precios en UYU) | Comercial (de 1 a 10 profesionales; Enterprise a cotizar) | Comercial (web/nube) | Comercial (enlace público: el paciente elige servicio, profesional y horario) | Comercial (WhatsApp el día anterior; confirmación y aviso de cambios por WhatsApp) | No evidenciado | No evidenciado | Comercial (fechado, comparación de versiones; periodontograma de 6 sitios) | No evidenciado | Comercial (mención mínima en preguntas frecuentes) | No evidenciado | Comercial (UYU 890 / 1.690 / 2.290 por mes; prueba de 14 días) | https://klinicos.app · 2026-11-22 |
| 10 | **Odeen** / Odeen SpA | Comercial (Chile) | Comercial (clínicas dentales y estética facial) | Comercial (nube/web) | Comercial (página pública de reserva con cobro de seña por Mercado Pago) | Comercial (confirmaciones y recordatorios por WhatsApp en plan Red) | No evidenciado | No evidenciado | Comercial (por diente y cara; periodontograma) | No evidenciado | Comercial (seña al reservar) | No evidenciado | No evidenciado (prueba de 14 días sin precios) | https://www.odeen.cl · 2026-11-22 |
| 11 | **NexHealth** / NexHealth | Comprobado (EE. UU., página cargada) | Comercial (prácticas dentales y médicas; capa sobre el sistema clínico existente) | Comprobado (SaaS sincronizado mediante "NexHealth Synchronizer") | Comprobado (widget de agenda y lista de espera en listado de productos); Comercial (reserva desde Google Maps, web y redes) | Comercial (recordatorios por texto); WhatsApp: No evidenciado | No evidenciado | No evidenciado | No evidenciado (no es su función) | No evidenciado | No evidenciado | No evidenciado | No evidenciado (cotización por módulos) | https://www.nexhealth.com/pricing · 2026-11-22 |
| 12 | **Open Dental** / Open Dental Software | Comprobado (EE. UU., página cargada) | Comprobado (escuelas, múltiples ubicaciones, precios por volumen) | Comprobado (local en servidor Windows; Cloud solo para EE. UU.) | Comprobado (Web Sched para pacientes nuevos y existentes; lista ASAP con enlace único) | Comprobado (recall automático por email/texto; eConfirmations); WhatsApp: No evidenciado | No evidenciado | Comprobado parcial (la lista ASAP crea bloqueos); Comercial (mejoras de "Blockouts"); prevención explícita: No evidenciado | Comercial (gráfico dental 3D) | No evidenciado | No evidenciado | No evidenciado | Comprobado (soporte USD 89/mes "otros países"; eServices bundle USD 165/mes; contrato 12 meses) | https://opendental.com/site/fees.html · 2026-11-22 |
| 13 | **Dentidesk** / DENTIDESK SPA | Comprobado (Chile, ficha App Store) | Comercial (clínicas; versión académica y sindicatos) | Comercial (web + app); Comprobado (la app iOS solo consulta agenda) | Comercial ("Agendamiento online" en integraciones) | Comercial (recordatorios personalizados por cita); WhatsApp automático: el proveedor lo anuncia como "próxima alternativa" (no disponible) | No evidenciado | No evidenciado | Comercial (nomenclatura chilena, internacional o universal) | No evidenciado | No evidenciado | No evidenciado (factura con SII Chile) | No evidenciado (prueba de 15 días; "desde USD 50" solo en fragmento de Capterra) | https://dentidesk.com · 2026-11-22 |
| 14 | **Simples Dental** / Simples Dental Software SA | Comprobado (Brasil, ficha App Store) | Comercial (dentistas y clínicas) | Comprobado (web + app iOS/Android; Alexa) | Comercial (enlace de agendamiento 24/7; "Secretaria IA" por WhatsApp) | Comprobado (confirmación automática por WhatsApp desde la ficha del paciente; alertas de retorno) | No evidenciado | Comprobado (agenda "sin conflicto de horarios" y gestión de encaixes, según ficha App Store) | Comprobado (odontograma virtual, ficha App Store) | No evidenciado | No evidenciado | No evidenciado | Comprobado (compras integradas App Store: R$ 179,90 / 259,90 / 359,90) | https://apps.apple.com/BR/app/id954861717 · 2026-11-22 |
| 15 | **Clinicorp** / Clinicorp | Comercial (Brasil) | Comercial (odontología y estética; redes y franquicias en Enterprise) | Comercial (web + apps) | Comercial (agendamiento online vía Google Mi Negocio; agentes de IA que reservan, reprograman y cancelan) | Comercial (confirmaciones y recordatorios automáticos por WhatsApp) | No evidenciado | No evidenciado | No evidenciado | No evidenciado | No evidenciado | No evidenciado | Comercial (Standard R$ 149,90/mes; Premium R$ 369,90/mes) | https://www.clinicorp.com · 2026-11-22 |
| 16 | **Dentally** / Dentally | Comprobado (Reino Unido, página cargada) | Comprobado (multi-sitio, usuarios ilimitados, tabla de planes) | Comercial (nube con portal del paciente) | Comercial (Portal 24/7 con enlace; cambio o cancelación "con reglas"); Comprobado (Portal no incluido en plan Starter) | Comercial (recordatorios y confirmaciones automáticas por SMS/email); WhatsApp: No evidenciado | No evidenciado en la agenda (el precio se calcula por sillón) | No evidenciado | Comercial (charting gráfico y numérico) | No evidenciado | No evidenciado | No evidenciado | Comprobado (GBP sin IVA, ~£134 a £1.021/mes según plan y sillones) | https://www.dentally.com/en-gb/pricing · 2026-11-22 |
| 17 | **Curve Dental** / Curve Dental | Comprobado (EE. UU./Canadá, página cargada) | Comercial (consultorios y grupos multi-ubicación) | Comercial (nube en navegador) | Comercial (Curve GRO: autoagendamiento con tipos de cita controlados por el consultorio) | Comercial (texto/email automáticos; texting bidireccional); WhatsApp: No evidenciado | No evidenciado | No evidenciado | Comercial (charting y perio charting) | No evidenciado | No evidenciado | No evidenciado | No evidenciado (cotización) | https://curvedental.com/dental-patient-engagement-software · 2026-11-22 |
| 18 | **Ascend by Dentrix** / Henry Schein One (no verificado) | Comprobado (EE. UU., página cargada) | Comercial (consultorios y multi-ubicación) | Comercial (nube) | Comercial (reserva online) | Comercial (recordatorios de recare y citas; mensajería bidireccional); WhatsApp: No evidenciado | No evidenciado | No evidenciado | No evidenciado | No evidenciado | No evidenciado | No evidenciado | Comercial (Ascend Starter USD 199/mes) | https://www.dentrixascend.com/ · 2026-11-22 |

**Lectura rápida de la tabla (conteos sobre 18 sistemas):**

| Atributo | Con alguna evidencia | De ellos, [Comprobado] |
|---|---|---|
| Reserva online | 16 | 2 (Open Dental; NexHealth en listado de productos) |
| Recordatorios automáticos (cualquier canal) | 16 (Dentalink manual comprobado; Bilog "con un clic") | 3 (Dentalink manual, Open Dental, Simples Dental) |
| Odontograma | 14 | 1 (Simples Dental, ficha App Store) |
| Múltiples sillones/boxes en agenda | 2 (AgendaPro, ClinIA) | 0 |
| Prevención de solapamientos | 2 (DentalSoft, Simples Dental) + 1 parcial (bloqueos de Open Dental) | 1 (Simples Dental) |
| Obras sociales argentinas | 7 | 1 (Dentalink, solo títulos) |
| Mercado Pago como cobro a pacientes | 4 (DentalSoft, AgendaPro, Odeen, Klinicos mínima) | 0 |
| AFIP/ARCA | 2 (ClinIA, DentalTec) | 0 |
| Precio publicado | 9 | 3 (Open Dental, Dentally, Simples Dental en App Store) |

---

## 4. B. Matriz de puntuación 0-5

### 4.1 Criterios, pesos y sub-ítems

| Código | Criterio | Peso | Sub-ítems (cada uno se puntúa 0-5) |
|---|---|---|---|
| C1 | Turnos y automatización | 25% | T1 agenda multi-profesional / por sillón / duración variable · T2 prevención de solapamientos, sobreturnos y bloqueos · T3 recordatorios y confirmaciones automáticos · T4 seguimiento, recall, campañas o lista de espera |
| C2 | Funcionalidad clínica odontológica | 20% | K1 odontograma · K2 ficha / historia clínica / anamnesis · K3 presupuestos o plan de tratamiento · K4 periodontograma o imágenes/RX |
| C3 | Integraciones locales y WhatsApp | 15% | I1 WhatsApp (recordatorio, confirmación o asistente) · I2 obras sociales/prepagas argentinas · I3 ARCA/AFIP u organismos argentinos (PUCO, RENAPER, receta electrónica) · I4 Mercado Pago para cobrar a pacientes |
| C4 | Administración, cobros y facturación | 15% | A1 caja y cobros · A2 señas o links de pago online (cualquier proveedor) · A3 facturación electrónica fiscal (cualquier jurisdicción) · A4 liquidaciones, honorarios o reportes |
| C5 | Experiencia del paciente | 10% | P1 reserva online autogestionada · P2 cancelación/reprogramación por el paciente · P3 canal conversacional o portal del paciente |
| C6 | Seguridad, exportación y trazabilidad | 10% | S1 roles y permisos · S2 auditoría / historial de cambios · S3 backup, cifrado o certificación · S4 exportación de datos |
| C7 | Precio y facilidad de adopción | 5% | E1 precio publicado · E2 prueba gratis o plan gratis (una demo no cuenta) · E3 moneda ARS explícita |

C3 mide el ajuste al **ecosistema argentino**; C4 mide la **función administrativa** sin importar el país. Por eso Mercado Pago puede sumar en I4 y en A2, y la facturación SII chilena suma en A3 pero no en I3. La API pública no tiene sub-ítem propio: se valora en el análisis cualitativo (sección C).

### 4.2 Escala y reglas de evidencia

| Nota | Significado |
|---|---|
| **5** | [Comprobado] con detalle funcional que cubre el sub-ítem. |
| **4** | [Comprobado] parcial: solo títulos de artículos, función manual, listado de productos sin detalle o cobertura de parte del sub-ítem. |
| **3** | [Comercial] con detalle funcional específico que cubre el sub-ítem. **Es el tope para evidencia comercial.** |
| **2** | [Comercial] genérico (mención sin detalle) o detallado pero que cubre solo parte del sub-ítem. |
| **1** | [Comercial] marginal: mención mínima o indirecta (solo en preguntas frecuentes, solo en un menú, frase vaga de marketing). |
| **0** | **No evidenciado.** También 0 cuando la función se anuncia como futura ("próximamente"), cuando el dato solo proviene de un tercero no abierto (fragmentos de Capterra/GetApp) o cuando el sub-ítem es argentino y la evidencia es de otra jurisdicción. |

Reglas complementarias:

1. **"No evidenciado" = 0 en ese sub-ítem.** No se promedia ni se deduce a partir de otros sub-ítems o de productos similares.
2. **[Comercial] nunca supera 3.** Si un sub-ítem tiene evidencia [Comprobado] y [Comercial], se toma la nota más alta aplicable.
3. Nota del criterio = promedio simple de sus sub-ítems. **Total = Σ (peso × nota del criterio)**, en escala 0-5.
4. La matriz mide **evidencia publicada y verificable**, no la calidad real del producto ni su relevancia para Argentina (esa se refleja en el orden de la tabla A y en la sección D).

### 4.3 Matriz ordenada por total

Cada celda muestra las notas de los sub-ítems en orden (p. ej., T1·T2·T3·T4) y su promedio.

| # | Sistema | C1 Turnos (25%) | C2 Clínica (20%) | C3 Integr. locales (15%) | C4 Administración (15%) | C5 Paciente (10%) | C6 Seguridad (10%) | C7 Precio (5%) | **Total /5** |
|---|---|---|---|---|---|---|---|---|---|
| 1 | DentalSoft | 2·3·3·3 → 2,75 | 3·3·3·2 → 2,75 | 3·3·0·3 → 2,25 | 3·3·0·3 → 2,25 | 3·2·3 → 2,67 | 2·2·2·3 → 2,25 | 3·3·0 → 2,00 | **2,50** |
| 2 | AgendaPro | 3·2·3·3 → 2,75 | 3·3·2·2 → 2,50 | 3·0·0·3 → 1,50 | 3·3·1·3 → 2,50 | 3·2·3 → 2,67 | 2·0·3·0 → 1,25 | 3·3·3 → 3,00 | **2,33** |
| 3 | Simples Dental | 1·4·4·4 → 3,25 | 4·4·0·4 → 3,00 | 4·0·0·0 → 1,00 | 3·2·2·2 → 2,25 | 2·0·3 → 1,67 | 0·0·1·0 → 0,25 | 4·3·0 → 2,33 | **2,21** |
| 4 | Dentalink | 2·0·4·3 → 2,25 | 2·2·2·2 → 2,00 | 4·4·4·0 → 3,00 | 2·2·0·4 → 2,00 | 2·2·3 → 2,33 | 0·0·3·0 → 0,75 | 1·1·0 → 0,67 | **2,05** |
| 5 | ClinIA | 2·0·3·0 → 1,25 | 3·3·3·1 → 2,50 | 3·3·3·0 → 2,25 | 3·0·3·2 → 2,00 | 2·3·3 → 2,67 | 2·2·3·1 → 2,00 | 0·0·0 → 0,00 | **1,92** |
| 6 | Clinicorp | 1·0·3·3 → 1,75 | 0·3·3·3 → 2,25 | 3·0·0·0 → 0,75 | 3·3·2·3 → 2,75 | 2·3·3 → 2,67 | 2·0·0·0 → 0,50 | 3·0·0 → 1,00 | **1,78** |
| 7 | Open Dental | 2·4·5·5 → 4,00 | 3·0·0·4 → 1,75 | 0·0·0·0 → 0,00 | 1·0·0·0 → 0,25 | 5·0·0 → 1,67 | 0·0·4·0 → 1,00 | 5·0·0 → 1,67 | **1,74** |
| 8 | Odeen | 1·1·3·3 → 2,00 | 3·2·2·2 → 2,25 | 2·0·0·3 → 1,25 | 3·3·0·0 → 1,50 | 3·0·0 → 1,00 | 0·2·3·3 → 2,00 | 0·3·0 → 1,00 | **1,71** |
| 9 | Dentally | 4·0·3·3 → 2,50 | 3·4·3·0 → 2,50 | 0·0·0·0 → 0,00 | 2·3·0·0 → 1,25 | 3·3·3 → 3,00 | 0·0·1·0 → 0,25 | 4·0·0 → 1,33 | **1,70** |
| 10 | DentalTec | 2·0·3·0 → 1,25 | 3·2·0·2 → 1,75 | 3·3·3·0 → 2,25 | 0·0·3·3 → 1,50 | 0·0·0 → 0,00 | 3·2·0·2 → 1,75 | 0·0·0 → 0,00 | **1,40** |
| 11 | Bilog | 2·0·2·0 → 1,00 | 2·3·0·2 → 1,75 | 2·3·0·0 → 1,25 | 2·0·0·3 → 1,25 | 3·2·2 → 2,33 | 3·2·1·0 → 1,50 | 0·0·0 → 0,00 | **1,36** |
| 12 | Odonto.ar | 2·0·0·0 → 0,50 | 3·3·2·2 → 2,50 | 0·3·0·0 → 0,75 | 1·0·0·2 → 0,75 | 3·3·0 → 2,00 | 2·2·0·0 → 1,00 | 3·3·0 → 2,00 | **1,25** |
| 13 | Klinicos | 2·0·3·0 → 1,25 | 3·0·0·3 → 1,50 | 3·0·0·1 → 1,00 | 3·1·0·0 → 1,00 | 3·0·0 → 1,00 | 0·2·3·0 → 1,25 | 3·3·0 → 2,00 | **1,24** |
| 14 | Curve Dental | 1·0·3·3 → 1,75 | 2·0·2·3 → 1,75 | 0·0·0·0 → 0,00 | 3·3·0·0 → 1,50 | 3·0·2 → 1,67 | 0·0·2·0 → 0,50 | 0·0·0 → 0,00 | **1,23** |
| 15 | Ascend by Dentrix | 1·0·2·2 → 1,25 | 0·2·0·3 → 1,25 | 0·0·0·0 → 0,00 | 3·2·0·0 → 1,25 | 2·0·2 → 1,33 | 2·0·3·0 → 1,25 | 3·0·0 → 1,00 | **1,06** |
| 16 | NexHealth | 1·0·2·4 → 1,75 | 0·0·0·0 → 0,00 | 0·0·0·0 → 0,00 | 4·4·0·2 → 2,50 | 4·0·0 → 1,33 | 0·0·4·0 → 1,00 | 0·0·0 → 0,00 | **1,05** |
| 17 | Dentidesk | 2·0·2·0 → 1,00 | 3·3·0·2 → 2,00 | 0·0·0·0 → 0,00 | 0·0·3·3 → 1,50 | 2·0·0 → 0,67 | 0·0·1·0 → 0,25 | 0·3·0 → 1,00 | **1,02** |
| 18 | OdontoGRAMA | 1·0·0·1 → 0,50 | 0·2·0·2 → 1,00 | 0·2·0·0 → 0,50 | 3·0·0·2 → 1,25 | 0·0·0 → 0,00 | 0·0·1·0 → 0,25 | 0·2·0 → 0,67 | **0,65** |

### 4.4 Cálculo reproducible

Total = 0,25×C1 + 0,20×C2 + 0,15×C3 + 0,15×C4 + 0,10×C5 + 0,10×C6 + 0,05×C7.

- **DentalSoft**: 0,25×2,75 + 0,20×2,75 + 0,15×2,25 + 0,15×2,25 + 0,10×2,67 + 0,10×2,25 + 0,05×2,00 = **2,50**
- **AgendaPro**: 0,25×2,75 + 0,20×2,50 + 0,15×1,50 + 0,15×2,50 + 0,10×2,67 + 0,10×1,25 + 0,05×3,00 = **2,33**
- **Simples Dental**: 0,25×3,25 + 0,20×3,00 + 0,15×1,00 + 0,15×2,25 + 0,10×1,67 + 0,10×0,25 + 0,05×2,33 = **2,21**
- **Dentalink**: 0,25×2,25 + 0,20×2,00 + 0,15×3,00 + 0,15×2,00 + 0,10×2,33 + 0,10×0,75 + 0,05×0,67 = **2,05**
- **ClinIA**: 0,25×1,25 + 0,20×2,50 + 0,15×2,25 + 0,15×2,00 + 0,10×2,67 + 0,10×2,00 + 0,05×0,00 = **1,92**
- **Clinicorp**: 0,25×1,75 + 0,20×2,25 + 0,15×0,75 + 0,15×2,75 + 0,10×2,67 + 0,10×0,50 + 0,05×1,00 = **1,78**
- **Open Dental**: 0,25×4,00 + 0,20×1,75 + 0,15×0,00 + 0,15×0,25 + 0,10×1,67 + 0,10×1,00 + 0,05×1,67 = **1,74**
- **Odeen**: 0,25×2,00 + 0,20×2,25 + 0,15×1,25 + 0,15×1,50 + 0,10×1,00 + 0,10×2,00 + 0,05×1,00 = **1,71**
- **Dentally**: 0,25×2,50 + 0,20×2,50 + 0,15×0,00 + 0,15×1,25 + 0,10×3,00 + 0,10×0,25 + 0,05×1,33 = **1,70**
- **DentalTec**: 0,25×1,25 + 0,20×1,75 + 0,15×2,25 + 0,15×1,50 + 0,10×0,00 + 0,10×1,75 + 0,05×0,00 = **1,40**
- **Bilog**: 0,25×1,00 + 0,20×1,75 + 0,15×1,25 + 0,15×1,25 + 0,10×2,33 + 0,10×1,50 + 0,05×0,00 = **1,36**
- **Odonto.ar**: 0,25×0,50 + 0,20×2,50 + 0,15×0,75 + 0,15×0,75 + 0,10×2,00 + 0,10×1,00 + 0,05×2,00 = **1,25**
- **Klinicos**: 0,25×1,25 + 0,20×1,50 + 0,15×1,00 + 0,15×1,00 + 0,10×1,00 + 0,10×1,25 + 0,05×2,00 = **1,24**
- **Curve Dental**: 0,25×1,75 + 0,20×1,75 + 0,15×0,00 + 0,15×1,50 + 0,10×1,67 + 0,10×0,50 + 0,05×0,00 = **1,23**
- **Ascend by Dentrix**: 0,25×1,25 + 0,20×1,25 + 0,15×0,00 + 0,15×1,25 + 0,10×1,33 + 0,10×1,25 + 0,05×1,00 = **1,06**
- **NexHealth**: 0,25×1,75 + 0,20×0,00 + 0,15×0,00 + 0,15×2,50 + 0,10×1,33 + 0,10×1,00 + 0,05×0,00 = **1,05**
- **Dentidesk**: 0,25×1,00 + 0,20×2,00 + 0,15×0,00 + 0,15×1,50 + 0,10×0,67 + 0,10×0,25 + 0,05×1,00 = **1,02**
- **OdontoGRAMA**: 0,25×0,50 + 0,20×1,00 + 0,15×0,50 + 0,15×1,25 + 0,10×0,00 + 0,10×0,25 + 0,05×0,67 = **0,65**

### 4.5 Decisiones de asignación no obvias

- **Dentalink T3 = 4 e I1 = 4:** la notificación por WhatsApp está [Comprobado] en el centro de ayuda, pero es manual (vía WhatsApp Web) → [Comprobado] parcial.
- **Dentalink I2, I3 y A4 = 4:** artículos del módulo argentino confirmados solo por título.
- **Simples Dental T2, T3, K1, K2, K4, I1 = 4:** la evidencia es la ficha de App Store, que la consigna acepta como [Comprobado], pero describe la función sin detalle de reglas → parcial. **Su tercer puesto se explica por el tipo de fuente, no por relevancia para Argentina** (es baja).
- **Open Dental T3, T4, P1 = 5:** la página de Web Sched describe con detalle recall automático, lista ASAP y reserva de pacientes nuevos y existentes.
- **Dentidesk I1 = 0:** el propio proveedor anuncia el WhatsApp automático como "próxima alternativa".
- **Odonto.ar I4 = 0:** Mercado Pago solo se usa para cobrar la suscripción, no a pacientes.
- **Klinicos T4 = 0:** la "lista de espera" del sitio es para registrarse en el producto, no para pacientes.
- **DentalSoft y Odonto.ar E3 = 0:** moneda no explícita.
- **NexHealth y Open Dental K2 = 0:** "formularios digitales"/eClipboard no se describen como historia clínica ni anamnesis. Dentally sí suma en K2 porque su Portal incluye anamnesis explícita y notas clínicas con IA en la tabla de precios.
- **Dentally T1 = 4:** multi-sitio y usuarios ilimitados [Comprobado] en la tabla de planes; la agenda por sillón no está evidenciada.

---

## 5. C. Análisis competitivo

### 5.1 Estándar de mercado (lo que "todos" tienen)

Según la tabla A, un producto que no ofrezca lo siguiente queda por debajo del promedio:

- **Agenda web o en la nube** con acceso desde varios dispositivos: 16 de 18 lo declaran (ClinIA no explicita la modalidad y Open Dental es local, con nube solo para EE. UU.).
- **Reserva online del paciente** mediante enlace o página pública: 16 de 18, aunque solo 2 la tienen [Comprobado].
- **Recordatorios automáticos:** 16 de 18. En Latinoamérica el canal esperado es **WhatsApp** (DentalSoft, AgendaPro, ClinIA, DentalTec, Klinicos, Odeen, Clinicorp, Simples Dental); en EE. UU. y Reino Unido, SMS/email.
- **Odontograma y ficha clínica:** 14 de 18 evidencian odontograma; los productos argentinos suman detalles como notación FDI, versionado o historial de cambios (DentalSoft, ClinIA, Odonto.ar).
- **Para Argentina, obras sociales:** 7 de los 8 sistemas relevantes para el país evidencian algún manejo de obras sociales (la excepción es AgendaPro). Es **requisito de entrada** para competir como sistema de gestión completo, no un diferencial.
- **Asistentes de IA por WhatsApp** que agendan: ya los declaran DentalSoft, ClinIA, AgendaPro, Dentalink, Bilog (iAngela), Simples Dental y Clinicorp. Todos [Comercial]: el mercado los promociona, pero ninguno los demuestra públicamente.

### 5.2 Diferenciadores reales (solo comprobados)

Con la regla de esta sección (solo [Comprobado]), la lista es corta, y eso ya es un hallazgo:

| Diferenciador | Quién | Evidencia |
|---|---|---|
| Lista de espera que ofrece huecos liberados con enlace único para aceptar/rechazar | Open Dental (ASAP) | Comprobado: websched.html |
| Lista de espera y widget de agenda como módulos | NexHealth | Comprobado: listado de productos en /pricing |
| Reserva online que crea la ficha del paciente nuevo e ingresa el turno automáticamente al sistema | Open Dental (Web Sched) | Comprobado: websched.html |
| API pública documentada de citas y pacientes, con webhooks y sandbox | NexHealth; Open Dental | Comprobado: docs.nexhealth.com; opendentalcloud.html (integraciones vía API) |
| Monetización modular y transparente por servicio (reserva, confirmaciones, formularios) | Open Dental | Comprobado: fees.html |
| Agenda sin conflicto de horarios con gestión explícita de sobreturnos ("encaixes") | Simples Dental | Comprobado: ficha App Store |
| Documentación pública de circuitos argentinos (obras sociales, conciliaciones, receta electrónica) | Dentalink | Comprobado: centro de ayuda (solo títulos) |
| Notificación por WhatsApp con plantilla y enlace de confirmación, sin API de Meta | Dentalink | Comprobado: centro de ayuda (envío manual) |

Ningún diferenciador comprobado pertenece a un producto argentino. Los diferenciadores que declaran los proveedores locales (validación de afiliados en tiempo real de DentalTec, PUCO/RENAPER/ARCA de ClinIA, liquidación por obra social y plan de DentalSoft) pueden ser reales, pero en este Discovery son **afirmaciones comerciales** y deben verificarse en las demos.

### 5.3 Vacíos frecuentes del mercado argentino

1. **Nadie evidencia la combinación local completa.** Ninguno de los 18 sistemas evidencia a la vez obras sociales + Mercado Pago + ARCA + reserva online + WhatsApp automático (ver resumen ejecutivo, hallazgo 4).
2. **El motor de agenda es una caja negra.** Agenda por sillón/box: solo AgendaPro y ClinIA ([Comercial]). Prevención de solapamientos: solo DentalSoft entre los argentinos ([Comercial]). Duración variable por prestación: solo AgendaPro ("duración por práctica") y Odonto.ar (duraciones en el link de reserva), ambos [Comercial]. Ningún producto argentino documenta qué ocurre cuando dos turnos compiten por el mismo profesional o sillón.
3. **Lista de espera ausente.** Ningún producto argentino ni latinoamericano evidencia lista de espera de pacientes.
4. **Autogestión limitada del paciente.** Solo Odonto.ar declara reglas de cancelación/reprogramación configurables; Bilog permite cancelar online; ClinIA lo canaliza por IA. Los demás no lo evidencian.
5. **Cumplimiento normativo poco explícito.** Solo AgendaPro declara alineación con la Ley 25.326 (datos personales) y la Ley 26.529 (derechos del paciente e historia clínica); Bilog cita la Ley 25.506 (firma electrónica). DentalSoft, DentalTec, ClinIA, Odonto.ar y OdontoGRAMA no nombran ninguna ley.
6. **Opacidad de precios.** 5 de los 8 sistemas relevantes para Argentina no publican precio (Bilog, DentalTec, ClinIA, Dentalink, OdontoGRAMA), y 2 de los 3 que sí lo publican no explicitan la moneda.
7. **WhatsApp automático como upsell caro.** DentalSoft lo reserva al plan Pro (el doble del plan Gestión) y aclara que Meta cobra por mensaje; Dentalink documenta un envío manual; Dentidesk todavía no lo ofrece.
8. **Sin documentación pública verificable.** Salvo Dentalink, ningún producto argentino tiene centro de ayuda, documentación o video oficial relevado.

### 5.4 Oportunidades de innovación

Basadas en los vacíos anteriores y en patrones comprobados en otros mercados:

1. **Agenda con restricciones explícitas y demostrables.** Un modelo donde cada turno ocupa a la vez un profesional, un sillón/box y una duración derivada de la prestación, con validación de no solapamiento en ambas dimensiones. Es el vacío 2 y es exactamente el primer change del TP. Documentarlo públicamente (reglas, mensajes de conflicto) sería, en sí mismo, un diferencial frente a competidores que solo lo declaran.
2. **Lista de espera que cubre huecos** (patrón ASAP de Open Dental y NexHealth, [Comprobado]): al cancelarse un turno, ofrecer el hueco a pacientes en espera compatibles con la prestación y el profesional. No hay evidencia de esto en Argentina.
3. **Autogestión con reglas** (patrón Dentally/Odonto.ar): anticipación mínima para reservar, ventana límite para cancelar o reprogramar y revalidación automática de disponibilidad.
4. **Recordatorio con enlace de confirmación sin depender de la API de Meta** (patrón Dentalink, [Comprobado]): un enlace `wa.me` con mensaje prellenado y link de confirmación es de costo cero y sirve como paso previo a WhatsApp Business API.
5. **Seña con Mercado Pago al reservar** (patrón Odeen; también DentalSoft y AgendaPro, [Comercial]): ataca el ausentismo con un medio de pago local. Es candidato para una etapa posterior.
6. **Trazabilidad del turno como requisito, no como extra:** registrar quién creó, movió o canceló cada turno. Es barato al diseñar el modelo de datos desde el inicio y responde al vacío 5 (Ley 26.529 exige integridad de la documentación clínica; la agenda es la puerta de entrada).
7. **Transparencia comercial y documental:** precio en ARS explícito y documentación pública de funciones, frente a un mercado mayoritariamente opaco (vacíos 6 y 8).

---

## 6. D. Recomendación final

### 6.1 Cinco competidores prioritarios para demo

| # | Competidor | Justificación | Qué verificar en la demo |
|---|---|---|---|
| 1 | **DentalSoft** | 1.º en la matriz (2,50); argentino, precios publicados, el único argentino que declara detección de solapamientos; obras sociales y Mercado Pago. Ofrece demo con clínica de ejemplo sin tarjeta. | Cómo detecta solapamientos y maneja sobreturnos; si existe agenda por sillón; moneda real de los planes; si emite factura ARCA. |
| 2 | **AgendaPro** | 2.º (2,33); el único con agenda por sillón **y** duración por práctica declaradas; precio en ARS, Mercado Pago, prueba de 14 días sin tarjeta. Representa al competidor regional multi-rubro. | Agenda por sillón con duración variable en acción; prevención de solapamientos; si hay obras sociales o ARCA en Argentina. |
| 3 | **Dentalink** | 4.º (2,05) y el mejor en integraciones locales (C3 = 3,00) gracias a la única documentación [Comprobado] de circuitos argentinos. Competidor regional con módulo argentino. | Contenido de los artículos de obras sociales y receta electrónica; si existe recordatorio automático (no solo manual); precio para Argentina. |
| 4 | **ClinIA** | 5.º (1,92); el único que declara a la vez ARCA, PUCO/RENAPER y agenda por consultorio/sillón; apunta también al sector público. Demo gratuita de 45 minutos. | Agenda por sillón y cómo resuelve conflictos; flujo de confirmación, cancelación y reprogramación por WhatsApp con IA; precio por usuario. |
| 5 | **Bilog** | Mayor adopción argentina declarada (más de 1.500 clínicas, 5.000 usuarios) y reserva y cancelación online de pacientes; liquidación a obras sociales, profesionales y laboratorios. | Si los recordatorios por WhatsApp son automáticos o manuales; manejo de sillones y solapamientos; modelo de precios. |

**Suplente:** DentalTec (1,40), si el equipo quiere profundizar en circuitos de obras sociales y ARCA; no se priorizó porque no evidencia reserva online, que es el centro del producto.

### 6.2 Tres productos de referencia de UX

| # | Producto | Por qué es referencia | Qué tomar |
|---|---|---|---|
| 1 | **Open Dental — Web Sched + ASAP** | La experiencia de reserva y de cobertura de huecos mejor documentada del relevamiento ([Comprobado]: websched.html). | Flujo de reserva para paciente nuevo y existente; lista ASAP con enlace único para aceptar o rechazar un hueco; bloqueos al notificar. |
| 2 | **Dentally — Dentally Portal** | Integra reserva, cambio/cancelación "con reglas", formularios previos y pago en un solo portal; precios por plan [Comprobado] que muestran cómo se empaqueta la autogestión. | Reglas visibles de cancelación/reprogramación; portal con verificación por celular y código de un solo uso; anamnesis previa a la consulta. |
| 3 | **NexHealth** | Es la referencia más cercana a un producto **de turnos** independiente del sistema clínico: reserva, lista de espera y recalls como módulos [Comprobado en listado], con API documentada (webhooks, sandbox). | Arquitectura de "capa de turnos" separable de la historia clínica; widget de reserva; diseño de API de citas desde el inicio. |

### 6.3 MVP

El primer change será **"crear turno sin solapamientos"**. El MVP se ordena para que ese change sea el cimiento y todo lo demás se apoye en él.

**Imprescindible (MVP del TP)**

1. Gestión de **profesionales** con su disponibilidad semanal (franjas horarias).
2. Gestión de **sillones/boxes** del consultorio.
3. Catálogo de **prestaciones con duración variable** (p. ej., control 20 min, endodoncia 60 min), con opción de duración distinta por profesional.
4. **Bloqueos** de agenda (feriados, vacaciones, mantenimiento de un sillón).
5. **Crear turno** (paciente + profesional + sillón + prestación + inicio, con fin calculado por la duración) **validando**: (a) que no se solape con otro turno del **mismo profesional**, (b) que no se solape con otro turno del **mismo sillón**, (c) que caiga dentro de la disponibilidad del profesional y fuera de bloqueos. Mensajes de error que indiquen el turno en conflicto.
6. **Cancelar** turno (libera profesional y sillón; conserva el registro con estado y motivo).
7. **Reprogramar** turno, aplicando la misma validación que al crear.
8. **Estados del turno:** reservado, confirmado, cancelado, atendido, ausente.
9. **Vista de agenda** diaria y semanal, filtrable por profesional y por sillón.
10. **Ficha mínima de paciente:** nombre, DNI, contacto y obra social como dato descriptivo (sin integración).
11. **Roles básicos** (administrativo, profesional) y **registro de auditoría** de cada alta, modificación y cancelación de turno (quién y cuándo).

**Diferenciador (si el tiempo del TP lo permite, en este orden)**

1. **Lista de espera:** al cancelar un turno, mostrar pacientes en espera compatibles con la prestación, el profesional y la duración del hueco.
2. **Reglas de autogestión configurables:** anticipación mínima para reservar y ventana límite para cancelar o reprogramar.
3. **Recordatorio con enlace de confirmación** vía enlace `wa.me` con mensaje prellenado (sin API de Meta) y registro de la confirmación en el turno.
4. **Sobreturno explícito:** permitir el solapamiento solo con marca de sobreturno y permiso del rol, dejándolo registrado en la auditoría (en lugar de prohibirlo o permitirlo silenciosamente).
5. **Reserva online autogestionada** por el paciente mediante un enlace público, reutilizando el mismo motor de validación.

**Etapas posteriores (fuera del alcance del TP)**

1. Recordatorios automáticos por **WhatsApp Business API** y asistente conversacional (costo por mensaje de Meta).
2. **Seña o pago con Mercado Pago** al reservar.
3. **Obras sociales:** coberturas, nomenclador, validación de afiliados y liquidaciones.
4. **Facturación electrónica ARCA.**
5. **Odontograma, historia clínica, presupuestos** y planes de tratamiento.
6. **Múltiples sucursales** con agenda consolidada.
7. **Reportes** de ocupación por sillón y de ausentismo.
8. Sincronización con **Google Calendar** y **API pública** de turnos.
9. Cumplimiento formal de la **Ley 25.326 y la Ley 26.529** (política de privacidad, consentimiento, retención), a analizar con asesoramiento.

### 6.4 Ajuste del equipo tras la revisión (protocolo de inspección: Ajustar, 2026-11-22)

Al revisar esta recomendación, el equipo decidió **ajustar** el MVP para que el sistema pueda demostrarse funcionando de punta a punta. Los cambios respecto de 6.3 son:

- **Se suman al MVP cinco simuladores muy simples**, que reemplazan a las integraciones reales (estas siguen en "Etapas posteriores"):
  1. **WhatsApp (bot simulado):** chat del paciente que reserva, confirma, cancela y reprograma contra la agenda real del sistema, tomando como referencia el prototipo `docs/discovery/prototipo/agenda_odontologia.html`. No usa la API de Meta.
  2. **Mercado Pago (simulado):** botón "pagar seña" que abre una pantalla de pago falsa, aprueba o rechaza y marca el turno como "señado".
  3. **Obras sociales (simulado):** padrón ficticio de 3-4 obras sociales; ingresando el número de afiliado devuelve cobertura y porcentaje de copago.
  4. **ARCA (simulado):** emite una "factura C" con CAE ficticio y la muestra como comprobante.
  5. **Odontograma:** notación FDI en cuatro cuadrantes, 5 caras por pieza; el paciente toca la pieza que le duele y la agrega al turno (rojo: a revisar; azul: lo ya hecho, como se marca en la ficha). Referencia visual: `docs/discovery/prototipo/odontograma-referencia.png`.
- **La interfaz** toma como referencia visual el prototipo (paleta, tipografías, tema claro/oscuro, panel de registro de lo que hizo el sistema).
- **Las integraciones reales** (WhatsApp Business API, Mercado Pago, padrones de obras sociales, ARCA) **siguen fuera del alcance** y su costo real queda como pregunta abierta.
- **Organización:** los changes del roadmap se reparten de forma equitativa entre los 6 integrantes (5 + team lead).

---

## 7. Verificación de fuentes

Fuentes seleccionadas para verificación manual por el equipo, de tipos distintos. **Las dos últimas columnas las completan los estudiantes a mano.**

> Nota: los relevamientos no registraron ningún **video oficial** con URL (Dentidesk menciona tutoriales en YouTube sin enlace). Si el equipo encuentra uno, puede sumarlo como fila 9.

| # | URL | Tipo | Qué afirma el informe | Resultado de la verificación humana | Corrección aplicada |
|---|---|---|---|---|---|
| 1 | https://dentalsoft.com.ar/ | Sitio oficial / precios | Planes Free $0 por 3 meses (hasta 50 turnos/mes), Gestión $30.000/mes y Pro $60.000/mes por profesional; WhatsApp automático solo en Pro; detección de solapamientos en sobreturnos; **moneda no explícita**. | `[COMPLETAR por el equipo]` | `[COMPLETAR por el equipo]` |
| 2 | https://agendapro.com/ar/dental/software-odontologico | Sitio oficial / precios | Desde ARS 13.900/mes; prueba de 14 días sin tarjeta; agenda por odontólogo, prestación y sillón; links de Mercado Pago; Leyes 25.326 y 26.529; cifras de "+30.000 clínicas" y "135.000 profesionales". | `[COMPLETAR por el equipo]` | `[COMPLETAR por el equipo]` |
| 3 | https://web.dentaltec.com.ar/software-odontologos-argentina | Sitio oficial | Validación en tiempo real con más de 15 obras sociales; planillas con integración ARCA; WhatsApp automático; **no menciona reserva online**. | `[COMPLETAR por el equipo]` | `[COMPLETAR por el equipo]` |
| 4 | https://ayuda.softwaredentalink.com/es/collections/19196578-modulo-exclusivo-para-argentina | Centro de ayuda | Existen artículos de Dentalink sobre crear obra social, recaudar pagos, conciliaciones y receta electrónica argentina (solo títulos confirmados; abrir el cuerpo de cada artículo). | `[COMPLETAR por el equipo]` | `[COMPLETAR por el equipo]` |
| 5 | https://intercom.help/softwaredentalink/es/articles/9493137-como-notificar-cita-por-whatsapp | Centro de ayuda | La notificación de cita por WhatsApp en Dentalink es manual vía WhatsApp Web, con plantilla y enlace de confirmación. | `[COMPLETAR por el equipo]` | `[COMPLETAR por el equipo]` |
| 6 | https://apps.apple.com/BR/app/id954861717 | App Store | Simples Dental: agenda "sin conflicto de horarios", encaixes, confirmación por WhatsApp, odontograma; compras integradas R$ 179,90 / 259,90 / 359,90; 4,7 con 813 calificaciones. | `[COMPLETAR por el equipo]` | `[COMPLETAR por el equipo]` |
| 7 | https://opendental.com/site/fees.html | Precios oficiales | Soporte USD 89/mes para "otros países"; eServices (Web Sched USD 75, ASAP USD 20, eConfirmations USD 25, bundle USD 165); contrato de 12 meses. Verificar si Argentina figura como "país en desarrollo". | `[COMPLETAR por el equipo]` | `[COMPLETAR por el equipo]` |
| 8 | https://www.capterra.es/software/196361/dentalink | Marketplace / reseñas | Dentalink "desde USD 29", prueba gratis, Argentina entre países disponibles, sede en Santiago y fundación en 2009 (dato **no confirmado**: la página dio 403). | `[COMPLETAR por el equipo]` | `[COMPLETAR por el equipo]` |

---

## 8. Hallazgos de calidad de datos

| # | Hallazgo | Sistemas | Impacto en este informe | Acción sugerida |
|---|---|---|---|---|
| 1 | **Cifras de clientes contradictorias.** La página argentina declara "+30.000 clínicas y consultorios en LATAM" y "más de 135.000 profesionales"; el blog del mismo proveedor declara "más de 10.000 clínicas y centros médicos". Además, ninguna cifra está desagregada para Argentina. | AgendaPro | No se usan cifras de clientes en la puntuación. | Preguntar en la demo cuántos clientes odontológicos tiene en Argentina. |
| 2 | **Referencias chilenas en la página argentina** (FONASA, sello CENS). | AgendaPro | Obras sociales argentinas = No evidenciado. | Verificar si el módulo de financiadores sirve para obras sociales argentinas. |
| 3 | **Relevancia para Argentina divergente entre relevamientos.** El relevamiento argentino califica a AgendaPro como "Media-alta" y a Dentalink como "Media"; el latinoamericano, a ambos como "Alta". | AgendaPro, Dentalink | Se fusionó la evidencia; el orden de la tabla A ubica a AgendaPro 2.º y a Dentalink 6.º según la evidencia local concreta. | Confirmar en demos. |
| 4 | **Estado de apertura de una misma URL contradictorio.** El relevamiento argentino declara la guía de WhatsApp de Dentalink "no abierta" (solo resultado de búsqueda); el latinoamericano la cita como [Comprobado] con contenido leído. | Dentalink | Se tomó la versión del relevamiento latinoamericano (contenido detallado). | Verificación manual (fila 5 de la sección 7). |
| 5 | **Dos URLs oficiales distintas** para Dentalink (`web-es.softwaredentalink.com/en/planes` y `www.softwaredentalink.com/es/en`) y dos dominios de ayuda (`ayuda.softwaredentalink.com` e `intercom.help/softwaredentalink`), con diferencias sobre la prueba gratis ("gestionada con ventas" frente a "No evidenciado"). | Dentalink | Prueba gratis puntuada como marginal (1). | Confirmar el sitio vigente. |
| 6 | **"Comprobado" solo por títulos.** Los artículos del módulo argentino de Dentalink no cargaron su cuerpo: se prueba la existencia de documentación, no el funcionamiento. | Dentalink | Puntuados como [Comprobado] parcial (4), no 5. | Leer los artículos completos. |
| 7 | **Contadores en "0" / placeholders.** La página mostraba contadores de clientes en 0 junto a "+12.000 doctores"; además, el dominio sin guion (cliniccloud.com) redirige a un dominio no relacionado. | Clinic Cloud | Excluido de las tablas (además, sin evidencia dental). | No usar sus cifras; usar solo `clinic-cloud.com`. |
| 8 | **"Open source" ambiguo.** Las páginas oficiales abiertas no lo declaran; un resultado de búsqueda lo describe como propietario con código visible bajo licencia propia. El precio de la API proviene de un directorio no oficial (apis.io). | Open Dental | No se afirma que sea open source; no puntúa. | Verificar la licencia en el sitio oficial. |
| 9 | **Monedas inferidas o ambiguas.** DentalSoft no explicita la moneda (el relevamiento la infirió ARS); Odonto.ar rotula "USD/aprox. ARS". | DentalSoft, Odonto.ar | "No evidenciado (moneda no explícita)" en tabla A; E3 = 0 en B. | Verificación manual (fila 1). |
| 10 | **Precios de terceros no confirmados:** "desde USD 29" (Dentalink) y "desde USD 50" (Dentidesk) provienen solo de fragmentos de Capterra; "desde €139/mes" para Doctolib, de agregadores. | Dentalink, Dentidesk, Doctolib | No puntúan (0). | Verificación manual (fila 8). |
| 11 | **Métricas de resultados sin respaldo:** 40% menos ausentismo, 98% de entrega, 64% menos débitos (DentalTec); "hasta 90% menos ausencias" (AgendaPro); ausentes "-15% en 30 días" (Curve); hueco cubierto "en 16 minutos" (NexHealth). | Varios | No se usan como evidencia funcional. | Tratarlas como marketing. |
| 12 | **Reseñas autodeclaradas.** DentalSoft muestra 5,0 en 11 reseñas de Google en su propio sitio; DentalTec, 5/5 con 30 reseñas; AgendaPro, 4,8 con +1.200 reseñas en Capterra/GetApp. Ninguna se pudo verificar en el marketplace (403). | DentalSoft, DentalTec, AgendaPro | No puntúan. | Revisar Google Maps y marketplaces manualmente. |
| 13 | **Identidad no confirmada.** La ficha de GetApp de "DentalSoft" se asume del mismo producto sin verificar; la propiedad de Ascend por Henry Schein One no se verificó; Odonto.ar y OdontoGRAMA no declaran país ni razón social. | DentalSoft, Ascend, Odonto.ar, OdontoGRAMA | País = No evidenciado donde corresponde. | Revisar pie legal y términos. |
| 14 | **Fichas de App Store redactadas por el proveedor.** La consigna las acepta como [Comprobado], pero su texto es del propio proveedor (p. ej., Dentidesk declara que la app "no recopila datos", sin verificación de Apple). | Simples Dental, Dentidesk | Explica en parte el 3.er puesto de Simples Dental; se puntuaron como [Comprobado] parcial (4). | Confirmar con capturas o pruebas reales. |
| 15 | **Etiqueta [Comprobado] sobre páginas no abiertas.** Algunos datos de Dentally ("standard/shared practice") figuran como [Comprobado] aunque provienen de un resultado de búsqueda. | Dentally | Segmento de Dentally se apoya en la tabla de precios (sí abierta). | Abrir las páginas. |
| 16 | **Inconsistencias internas de páginas de precios.** Dentally: la herramienta no pudo asociar cada cifra a la cantidad de sillones e indicó una contradicción sobre Dentally Vision en Essentials. Simples Dental: los nombres de planes del sitio (Pro Anual/Mensual) no coinciden con los de App Store (Essencial/Plus/Pro). | Dentally, Simples Dental | Precios citados como rangos. | Verificar. |
| 17 | **Nombre que sugiere una función no evidenciada.** OdontoGRAMA no describe un odontograma como función en su sitio. | OdontoGRAMA | Odontograma = No evidenciado. | Pedir demo si interesa. |
| 18 | **"Lista de espera" con otro significado.** En Klinicos es la lista para registrarse en el producto, no de pacientes. | Klinicos | T4 = 0. | — |
| 19 | **Cobertura de marketplaces y videos nula.** Capterra, GetApp y G2 devolvieron 403; no se relevaron videos oficiales. Las categorías "marketplace/reseña" y "video oficial" de la consigna quedaron sin evidencia primaria. | Todos | La matriz descansa en sitios oficiales, precios, centros de ayuda y App Store. | Completar en la verificación manual. |
| 20 | **Fuentes de Doctolib obsoletas** (política de privacidad de 2020 y condiciones de 2019) y sitio oficial bloqueado. | Doctolib | Excluido de las tablas. | — |

---

## 9. Referencias completas

Todas las URLs fueron consultadas el **2026-11-22** por los relevamientos de origen. Se indica el tipo y, cuando corresponde, la limitación de acceso.

### DentalSoft
- https://dentalsoft.com.ar/ · sitio oficial / precios · consultada el 2026-11-22
- https://www.getapp.com/all-software/a/dentalsoft/ · marketplace (solo fragmento de búsqueda; 403 al abrir) · consultada el 2026-11-22

### AgendaPro
- https://agendapro.com/ar/dental/software-odontologico · sitio oficial / precios · consultada el 2026-11-22
- https://agendapro.com/cl/dental/software-odontologico · sitio oficial · consultada el 2026-11-22
- https://agendapro.com/blog/software-dental/ · sitio oficial (blog) · consultada el 2026-11-22

### ClinIA
- https://www.clinia.com.ar/odontologia · sitio oficial · consultada el 2026-11-22

### DentalTec
- https://web.dentaltec.com.ar/software-odontologos-argentina · sitio oficial · consultada el 2026-11-22

### Bilog
- https://bilog.com.ar/ · sitio oficial · consultada el 2026-11-22
- https://bilog.com.ar/funcionalidades/ · sitio oficial · consultada el 2026-11-22

### Dentalink
- https://www.softwaredentalink.com/es/en · sitio oficial · consultada el 2026-11-22
- https://web-es.softwaredentalink.com/en/planes · precios · consultada el 2026-11-22
- https://ayuda.softwaredentalink.com/es/collections/19196578-modulo-exclusivo-para-argentina · centro de ayuda · consultada el 2026-11-22
- https://intercom.help/softwaredentalink/es/articles/9493137-como-notificar-cita-por-whatsapp · centro de ayuda · consultada el 2026-11-22
- https://ayuda.softwaredentalink.com/es/articles/14304573-como-recaudar-un-pago-con-obra-sociales · centro de ayuda (solo título; cuerpo no cargó) · consultada el 2026-11-22
- https://ayuda.softwaredentalink.com/es/articles/14744244-receta-electronica-argentina · centro de ayuda (solo título; cuerpo no cargó) · consultada el 2026-11-22
- https://www.capterra.es/software/196361/dentalink · marketplace (solo resultado de búsqueda; 403) · consultada el 2026-11-22
- https://www.capterra.com/p/196361/Dentalink/ · marketplace (solo resultado de búsqueda; no abierta) · consultada el 2026-11-22

### Odonto.ar
- https://odonto.ar/ · sitio oficial / precios · consultada el 2026-11-22

### OdontoGRAMA
- https://odontograma.com.ar/ · sitio oficial · consultada el 2026-11-22

### Klinicos
- https://klinicos.app · sitio oficial / precios · consultada el 2026-11-22

### Odeen
- https://www.odeen.cl · sitio oficial · consultada el 2026-11-22
- https://www.comparasoftware.com/odeen · marketplace / comparador (solo resultado de búsqueda) · consultada el 2026-11-22

### NexHealth
- https://www.nexhealth.com/ · sitio oficial · consultada el 2026-11-22
- https://www.nexhealth.com/pricing · precios · consultada el 2026-11-22
- https://docs.nexhealth.com/ · documentación · consultada el 2026-11-22

### Open Dental
- https://www.opendental.com/ · sitio oficial · consultada el 2026-11-22
- https://www.opendental.com/site/websched.html · sitio oficial / documentación · consultada el 2026-11-22
- https://opendental.com/site/fees.html · precios · consultada el 2026-11-22
- https://opendental.com/site/opendentalcloud.html · sitio oficial · consultada el 2026-11-22
- https://opendental.com/site/apispecification.html · documentación (resultado de búsqueda; no abierta) · consultada el 2026-11-22
- https://opendental.com/site/apilocal.html · documentación (resultado de búsqueda) · consultada el 2026-11-22
- https://www.opendental.com/site/apipermissions.html · documentación (resultado de búsqueda; no abierta) · consultada el 2026-11-22
- https://apis.io/plans/opendental/opendental-plans-pricing/ · directorio de terceros, no oficial (resultado de búsqueda) · consultada el 2026-11-22

### Dentidesk
- https://dentidesk.com · sitio oficial · consultada el 2026-11-22
- https://apps.apple.com/cl/app/dentidesk-app/id6741155287 · App Store · consultada el 2026-11-22
- https://www.capterra.es/software/184029/dentidesk · marketplace (solo resultado de búsqueda; 403) · consultada el 2026-11-22

### Simples Dental
- https://www.simplesdental.com · sitio oficial · consultada el 2026-11-22
- https://apps.apple.com/BR/app/id954861717 · App Store · consultada el 2026-11-22
- https://www.capterra.com/p/219187/Simples-Dental/ · marketplace (solo resultado de búsqueda; 403) · consultada el 2026-11-22

### Clinicorp
- https://www.clinicorp.com · sitio oficial / precios · consultada el 2026-11-22
- https://www.reclameaqui.com.br/empresa/clinicorp/ · reseña (solo resultado de búsqueda) · consultada el 2026-11-22

### Dentally
- https://www.dentally.com/en-gb/ · sitio oficial · consultada el 2026-11-22
- https://www.dentally.com/en-gb/pricing · precios · consultada el 2026-11-22
- https://dentally.com/en-gb/dentally-portal · sitio oficial · consultada el 2026-11-22
- https://www.dentally.com/en-gb/insights-hub/online-appointment-booking · sitio oficial (resultado de búsqueda; no abierta) · consultada el 2026-11-22
- https://dentally.com/en-gb/dental-software-features/patient-management · sitio oficial (resultado de búsqueda; no abierta) · consultada el 2026-11-22
- https://dentally.com/en-nz/who-we-help/standard-practice · sitio oficial (resultado de búsqueda) · consultada el 2026-11-22
- https://www.g2.com/products/dentally/reviews · marketplace (403) · consultada el 2026-11-22

### Curve Dental
- https://www.curvedental.com/ · sitio oficial · consultada el 2026-11-22
- https://curvedental.com/dental-patient-engagement-software · sitio oficial · consultada el 2026-11-22
- https://curvedental.com/pricing · precios (resultado de búsqueda; no abierta) · consultada el 2026-11-22
- https://curvedental.com/partner-list · sitio oficial (resultado de búsqueda; no abierta) · consultada el 2026-11-22
- https://www.g2.com/products/curve-dental-curve-dental/features · marketplace (resultado de búsqueda; no abierta) · consultada el 2026-11-22

### Ascend by Dentrix
- https://www.dentrixascend.com/ · sitio oficial · consultada el 2026-11-22
- https://www.dentrixascend.com/pricing · precios (no cargó, 404) · consultada el 2026-11-22

### Excluidos de las tablas (citados en las secciones 2 y 8)
- **Clinic Cloud:** https://www.clinic-cloud.com/ · sitio oficial · consultada el 2026-11-22
- **Doctolib:** https://www.doctolib.fr/ · sitio oficial (no cargó, 403) · consultada el 2026-11-22
- **Doctolib:** https://www.capterra.com/p/184480/Doctolib/pricing/ · marketplace (403; solo resultado de búsqueda) · consultada el 2026-11-22
- **Doctolib:** https://www.getapp.com/all-software/a/doctolib/ · marketplace (resultado de búsqueda) · consultada el 2026-11-22
- **Doctolib:** https://res.cloudinary.com/doctolib/image/upload/v1616079024/legal/Privacy-policy-B2C-FR-sept20.pdf · documento oficial antiguo (resultado de búsqueda) · consultada el 2026-11-22
- **Doctolib:** https://res.cloudinary.com/doctolib/image/upload/v1559560433/CGU_3_juin_2019_1_thphlk.pdf · documento oficial antiguo (resultado de búsqueda) · consultada el 2026-11-22
- **Medesk:** https://www.medesk.net/es/solutiones/odontologia · sitio oficial · consultada el 2026-11-22
- **Gesden:** https://www.gesden.com/ · sitio oficial (no cargó, 403) · consultada el 2026-11-22
