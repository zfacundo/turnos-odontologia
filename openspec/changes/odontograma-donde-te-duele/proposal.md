## Why

El paciente necesita indicar qué pieza dental le duele antes de la consulta, para que el odontólogo conozca qué revisar.

## What Changes

- Odontograma permanente de 32 piezas con numeración FDI.
- Selección de pieza, caras dentales y síntomas.
- Asociación de piezas a turnos existentes.
- Estados a_revisar y hecho, representados en rojo y azul.
- API GET/PUT para consultar y guardar piezas.
- Permiso exclusivo del odontólogo para marcar piezas como realizadas.
- Pruebas de dominio y API.

## Capabilities

### New Capabilities

- `odontograma`: registro y visualización de piezas dentales asociadas a turnos.

## Impact

Nuevos archivos en src/domain/odontograma, src/application/odontograma,
src/api/routes/odontograma.ts, public/odontograma.html,
public/js/odontograma.js y tests.

Se registra un router adicional en src/api/app.ts.

Fuera de alcance: historia clínica, presupuestos, planes de tratamiento
y dientes temporales.
