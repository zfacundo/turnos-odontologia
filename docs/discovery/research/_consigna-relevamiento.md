# Consigna de relevamiento (brief para agentes de investigación)

Fecha de consulta para todas las fuentes: **2026-11-22**.

Rol: analista sénior de mercado y producto SaaS especializado en salud digital y odontología en Argentina y Latinoamérica.

Objetivo: relevar sistemas odontológicos que permitan gestionar turnos y agenda de pacientes, para comparar funcionalidades y detectar oportunidades de un producto competitivo para el mercado argentino.

## Reglas de evidencia (NO negociables)

1. Solo fuentes verificables: sitio oficial, documentación pública, páginas de precios, centros de ayuda, videos oficiales, marketplaces confiables (Capterra, G2, GetApp, App Store, Google Play) y reseñas verificadas.
2. Cada afirmación lleva su URL. Fecha de consulta: 2026-11-22.
3. **No inventes**. Si no lo encontraste publicado, escribí exactamente `No evidenciado`. Nunca deduzcas ni completes por analogía.
4. Etiquetá cada dato:
   - `[Comprobado]` → lo demuestra el producto, la documentación, el centro de ayuda, un video oficial o capturas reales.
   - `[Comercial]` → el proveedor lo afirma en marketing sin demostrarlo.
5. Solo registrá URLs que efectivamente abriste (WebFetch) o que aparecieron como resultado de búsqueda con el contenido citado. Si una URL no cargó, decilo.
6. Si un producto candidato no existe, está discontinuado o no gestiona turnos, descartalo y anotalo en "Descartados".

## Ficha por sistema (usar estos encabezados exactos)

```
## <Nombre del producto>
- **Empresa / país / URL oficial**:
- **Segmento objetivo** (odontólogo independiente, consultorio, clínica, cadena, centro multidisciplinario, laboratorio):
- **Modalidad** (SaaS, nube, app móvil, local, híbrida):
- **Gestión de agenda** (vista diaria/semanal, múltiples profesionales, múltiples sillones/boxes, duración variable de prestaciones, bloqueos, sobreturnos, prevención de solapamientos):
- **Turnos digitales** (reserva online 24/7, enlace de reserva, web, redes, chatbot, WhatsApp, confirmación, cancelación, reprogramación, lista de espera):
- **Automatización** (recordatorios, confirmaciones, seguimiento de ausentes, recuperación de pacientes, controles periódicos, campañas):
- **Gestión odontológica** (ficha clínica, anamnesis, odontograma, periodontograma, imágenes/RX, presupuestos, planes de tratamiento):
- **Administración** (caja, cobros, facturación, señas, Mercado Pago, obras sociales/prepagas, liquidaciones, reportes):
- **Integraciones** (WhatsApp Business API, Google Calendar, sitio web, API pública, Mercado Pago, AFIP/ARCA, radiología, firma digital, marketing):
- **Operación** (sucursales, roles y permisos, auditoría, exportación de datos, soporte, capacitación):
- **Seguridad y cumplimiento** (datos de salud, privacidad, trazabilidad, backup, control de acceso, normativa argentina: Ley 25.326, Ley 26.529, historia clínica electrónica):
- **Modelo comercial** (prueba gratis, plan gratis, precios publicados, moneda, modalidad de cobro, costos extra):
- **Fortalezas / limitaciones / diferenciales**:
- **Evidencia de adopción** (casos de éxito, nº de clientes SOLO si está publicado, reseñas verificables):
- **Relevancia para Argentina** (alta/media/baja + por qué: opera en AR, precios en ARS, Mercado Pago, AFIP, obras sociales):
- **Fuentes** (lista: URL · tipo [sitio oficial | precios | centro de ayuda | video oficial | marketplace | reseña] · consultada el 2026-11-22):
```

Dentro de cada campo, cada sub-ítem con su etiqueta, por ejemplo:
`Recordatorios por WhatsApp [Comprobado: https://...]; lista de espera: No evidenciado`.

## Al final del archivo

- **Descartados**: candidatos que no califican y por qué.
- **Fuentes de mejor calidad para verificación manual**: elegí 5-6 URLs de tipos distintos (sitio oficial, precios, centro de ayuda, video oficial, marketplace/reseña) que un humano pueda abrir para comprobar afirmaciones concretas; para cada una, la afirmación exacta que respalda.
