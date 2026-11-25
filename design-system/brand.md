# Marca — Turnos Odontología

| Elemento | Valor | Fuente |
|---|---|---|
| Nombre del producto | **Turnos Odontología** | `knowledge-base/01_vision_y_objetivos.md` |
| Nombre del consultorio que se muestra en el bot | (TBD). El prototipo usa "Consultorio Sonríe" como ejemplo | `docs/discovery/prototipo/agenda_odontologia.html` |
| Profesional en los mensajes del bot | El nombre ficticio del seed (por ejemplo, "Dra. Ficticia Perez"). El prototipo usa "Dra. [Apellido]" | `src/infrastructure/seed/datos-seed.ts` |
| Logo | (TBD): `assets/logo.svg` es un marcador **provisional** y así lo indica | — |
| Imágenes | Sin fotos. Los íconos son SVG lineales simples, como en el prototipo (WhatsApp, calendario, campana) | prototipo |

## Tono

- Español rioplatense, cercano y breve, como en el prototipo: "¿Me pasás tu nombre completo y DNI?", "Te escribo 24 h antes para confirmar".
- El bot habla en primera persona como "el asistente del consultorio" y nunca se presenta como un humano.
- Los errores explican qué pasó y qué hacer: "Ese horario ya se ocupó. Te muestro otros".

## Reglas de uso

- **Rótulo de simulación obligatorio** (RN-WA-04, RN-SM-04, RN-DA-02): toda pantalla de simulador muestra arriba una franja con `--sim-bg`/`--sim-fg` y un texto del tipo "Simulación — no es WhatsApp real". Nunca se usa un logo ni los colores oficiales de WhatsApp, Meta, Mercado Pago ni ARCA.
- **Solo datos ficticios** (RN-DA-01): nombres "Paciente Ficticio …", DNI 99.xxx.xxx y teléfonos `+54 9 11 0000-00NN`, también en mockups y capturas.
- El color de cada prestación (`--t-*`) identifica el tipo de turno en la agenda, el bot y las etiquetas. No se usa para otra cosa.
- El acento (`--accent`) se reserva para la acción principal, el foco y los elementos interactivos.
