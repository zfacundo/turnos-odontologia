# cobertura-obra-social-simulada Specification

## Purpose

Define la consulta local y determinista de afiliados de obras sociales ficticias, con cobertura, porcentaje de copago y planes, para que recepción pueda demostrar el Flujo 8 sin padrón real, credenciales ni llamadas de red, distinguiendo entradas malformadas de fallas simuladas.

## Requirements

### Requirement: Consulta simulada de afiliado

La API SHALL exponer `GET /api/sim/obras-sociales/afiliados/:nro` y, para un número del padrón ficticio, responder `200` con `obraSocial`, `plan`, `cobertura`, `copagoPct`, `planes`, `estado`, `simulado: true` y un `aviso` que indique «SIMULACIÓN». La respuesta MUST NOT incluir el nombre del paciente del padrón.

#### Scenario: Afiliado activo
- **GIVEN** el padrón simulado con `AF-0001` como afiliado activo
- **WHEN** se hace `GET /api/sim/obras-sociales/afiliados/AF-0001`
- **THEN** la respuesta es `200` con `cobertura` `80`, `copagoPct` `20`, `estado` `activo`, `simulado: true` y el aviso de simulación

#### Scenario: Afiliado con copago
- **GIVEN** el padrón simulado con `AF-0002` como afiliado con copago
- **WHEN** se hace `GET /api/sim/obras-sociales/afiliados/AF-0002`
- **THEN** la respuesta es `200` con `cobertura` `60`, `copagoPct` `40` y `estado` `con_copago`

#### Scenario: El nombre del padrón no se expone
- **GIVEN** una respuesta exitosa del padrón simulado
- **WHEN** se inspecciona el cuerpo de la respuesta
- **THEN** no aparece ningún campo con el nombre del paciente del padrón

### Requirement: Entrada malformada en la consulta de cobertura

La API SHALL responder `400` con `error.tipo = 'entrada'` cuando falte el parámetro `nro` o cuando su valor sea una cadena vacía o solo espacios. Este caso MUST distinguirse del error simulado del padrón, que responde `409` con `error.tipo = 'regla'` y `error.regla = 'RN-SM-02'`.

#### Scenario: Falta el número de afiliado
- **GIVEN** la API y la cabecera `X-Rol: recepcion`
- **WHEN** se hace `GET /api/sim/obras-sociales/afiliados`
- **THEN** la respuesta es `400` con `error.tipo = 'entrada'` y un mensaje que indica que falta el número de afiliado

#### Scenario: Número de afiliado con solo espacios
- **GIVEN** la API y la cabecera `X-Rol: recepcion`
- **WHEN** se hace `GET /api/sim/obras-sociales/afiliados/%20`
- **THEN** la respuesta es `400` con `error.tipo = 'entrada'`, no `404`

### Requirement: Afiliado inexistente

La API SHALL responder `404` con `error.mensaje = 'afiliado no encontrado'` cuando el número consultado no figure en el padrón simulado y no esté vacío (RN-SM-02).

#### Scenario: Número de afiliado desconocido
- **GIVEN** el padrón simulado
- **WHEN** se hace `GET /api/sim/obras-sociales/afiliados/AF-9999`
- **THEN** la respuesta es `404` con `error.mensaje = 'afiliado no encontrado'`

### Requirement: Caso sin cobertura

El padrón simulado SHALL incluir un afiliado de prueba sin cobertura; su consulta SHALL responder `200` con `cobertura` `0`, `copagoPct` `100` y `estado` `sin_cobertura`, sin lanzar una excepción ni contactar un servicio externo.

#### Scenario: Consulta de afiliado sin cobertura
- **GIVEN** el padrón simulado con `AF-0003` como afiliado sin cobertura
- **WHEN** se hace `GET /api/sim/obras-sociales/afiliados/AF-0003`
- **THEN** la respuesta es `200` con `cobertura` `0`, `copagoPct` `100` y `estado` `sin_cobertura`

### Requirement: Caso de error simulado

El padrón simulado SHALL incluir un afiliado de prueba que produce un error controlado; su consulta SHALL responder `409` con `error.tipo = 'regla'` y `error.regla = 'RN-SM-02'`, con un mensaje que indique que se trata de una falla simulada, sin efectuar llamadas de red. Un número presente como `AF-0004` MUST producir `409`, no `400`.

#### Scenario: Consulta de afiliado con error simulado
- **GIVEN** el padrón simulado con `AF-0004` como caso de error simulado
- **WHEN** se hace `GET /api/sim/obras-sociales/afiliados/AF-0004`
- **THEN** la respuesta es `409` con `error.tipo = 'regla'`, `error.regla = 'RN-SM-02'` y un mensaje que contiene «SIMULACIÓN»

#### Scenario: Error simulado no se confunde con entrada malformada
- **GIVEN** el padrón simulado con `AF-0004`
- **WHEN** se hace `GET /api/sim/obras-sociales/afiliados/AF-0004`
- **THEN** la respuesta es `409` con `error.tipo = 'regla'`, no `400` con `error.tipo = 'entrada'`

#### Scenario: El error simulado no modifica el padrón
- **GIVEN** el padrón simulado con `AF-0004`
- **WHEN** se consulta `AF-0004` y después `AF-0001`
- **THEN** la segunda respuesta sigue siendo `200` con los datos del afiliado activo

### Requirement: Ejecución sin servicios externos

La consulta SHALL ser determinista para un mismo número de afiliado y MUST NOT realizar llamadas de red, usar credenciales reales ni depender de la hora actual (RN-SM-04). Todo aviso y pantalla asociada SHALL rotular la operación como «SIMULACIÓN».

#### Scenario: Dos consultas iguales devuelven el mismo resultado
- **GIVEN** el padrón simulado
- **WHEN** se consulta dos veces `AF-0001`
- **THEN** ambos cuerpos de respuesta son equivalentes y ninguno incluye datos de la hora actual

#### Scenario: Pantalla rotulada como simulación
- **GIVEN** la pantalla `public/sim/obras-sociales.html` cargada en el navegador
- **WHEN** se consulta un número de afiliado
- **THEN** el aviso «SIMULACIÓN» es visible y la petición se dirige solo al servidor local

### Requirement: Permisos en la consulta simulada

La consulta de cobertura SHALL estar disponible para los roles `admin`, `recepcion`, `odontologo` y `paciente`, y SHALL responder `403` con `error.tipo = 'permiso'` cuando falte la cabecera `X-Rol` o el rol sea desconocido.

#### Scenario: Recepción consulta cobertura
- **GIVEN** la cabecera `X-Rol: recepcion`
- **WHEN** se hace `GET /api/sim/obras-sociales/afiliados/AF-0001`
- **THEN** la respuesta es `200` con `simulado: true`

#### Scenario: Paciente consulta cobertura
- **GIVEN** la cabecera `X-Rol: paciente`
- **WHEN** se hace `GET /api/sim/obras-sociales/afiliados/AF-0001`
- **THEN** la respuesta es `200` con `simulado: true`

#### Scenario: Sin cabecera de rol
- **GIVEN** una petición sin cabecera `X-Rol`
- **WHEN** se hace `GET /api/sim/obras-sociales/afiliados/AF-0001`
- **THEN** la respuesta es `403` con `error.tipo = 'permiso'`
