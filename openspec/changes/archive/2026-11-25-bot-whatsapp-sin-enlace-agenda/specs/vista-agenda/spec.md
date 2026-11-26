## MODIFIED Requirements

### Requirement: Retiro de la agenda anterior

La agenda del consultorio SHALL ser únicamente la del panel (`/admin/#/agenda`). `GET /` y `GET /index.html` SHALL responder `302` con `Location: /admin/`. Ninguna página servida desde `public/` SHALL tener un enlace "Agenda" que apunte a `/` o a `/index.html`. Los enlaces "Agenda" que existan SHALL apuntar a `/admin/#/agenda`. La pantalla del bot de WhatsApp simulado MUST NOT tener enlace "Agenda", porque representa el teléfono del paciente.

#### Scenario: La raíz redirige al panel
- **WHEN** un navegador pide `GET /`
- **THEN** el servidor responde `302` con `Location: /admin/`

#### Scenario: Enlace guardado a la agenda vieja
- **WHEN** se pide `GET /index.html`
- **THEN** el servidor responde `302` con `Location: /admin/`

#### Scenario: Sin enlaces a la agenda vieja
- **WHEN** se revisan todas las páginas HTML de `public/`
- **THEN** ninguna tiene un `href` igual a `/` o a `/index.html`

#### Scenario: Otras páginas siguen sirviéndose
- **WHEN** se piden `/bot.html`, `/sim/mercadopago.html`, `/sim/obras-sociales.html`, `/sim/arca.html` y `/styles/tokens.css`
- **THEN** cada una responde `200`

#### Scenario: Navegación desde el bot
- **GIVEN** la pantalla del bot de WhatsApp simulado
- **WHEN** se revisa su barra de navegación
- **THEN** no tiene un enlace "Agenda" ni ningún `href` hacia `/admin/`
