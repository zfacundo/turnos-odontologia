# Design - C-10 Odontograma

## Context

C-02 ya proporciona turnos y un repositorio para consultarlos.
El odontograma debe asociar piezas a esos turnos sin modificar
el dominio central de agenda.

## Decisions

### Dominio

Las piezas permanentes usan numeración FDI, cuatro cuadrantes
y cinco caras: V, L, M, D y O.

Los síntomas y números de pieza se validan antes de guardar.

### Almacenamiento

Repositorio propio en memoria, organizado por turno y número de pieza.
Los datos son ficticios y temporales.

### API

GET /api/turnos/:id/piezas devuelve las piezas del turno.

PUT /api/turnos/:id/piezas agrega o actualiza una pieza.
Solo el rol odontologo puede establecer el estado hecho.

Las rutas se registran mediante un router independiente.

### Interfaz

public/odontograma.html contiene la pantalla.
public/js/odontograma.js dibuja las 32 piezas y consulta la API.

Rojo indica a_revisar y azul indica hecho.
La pantalla incluye selección de turno, síntomas y caras.

## Verification

- Validación de piezas y caras mediante Vitest.
- Pruebas API de consulta, guardado y permisos.
- Prueba manual de rojo a azul, conservando el estado.
- npm run typecheck y npm test.

## Limitations

El almacenamiento es en memoria y se pierde al reiniciar el servidor.
No implementa una historia clínica completa.
