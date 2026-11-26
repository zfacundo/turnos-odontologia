## 1. Mockup

- [x] 1.1 Mockup `mockups/bot-navegacion.html` con la fila de navegación en profesional, horarios, datos, pago y después de reservar; capturas a 390 y 1440
- [x] 1.2 Aprobación del mockup registrada en `design.md`

## 2. Tests en rojo

- [x] 2.1 `conversacion.test.ts`: un test por escenario de "Navegación en cada paso"
- [x] 2.2 `bot.test.ts` / `api.test.ts`: volver atrás desde horarios y datos sin crear turnos
- [x] 2.3 `pantalla.test.ts`: `bot.js` marca `atras`/`menu` como `chip nav` y `bot.html` define `.chip.nav`
- [x] 2.4 Actualizar las listas exactas de opciones existentes con la fila de navegación

## 3. Implementación

- [x] 3.1 `conNavegacion` en `conversacion.ts`
- [x] 3.2 Destinos de "Volver atrás" (D1) y `origenPago` (D2)
- [x] 3.3 Estilo `chip nav` en `bot.js` y `bot.html`

## 4. Verificación

- [x] 4.1 `npm test` y `npm run typecheck` en verde; `openspec validate bot-whatsapp-navegacion --strict`
- [x] 4.2 Recorrido en el navegador y capturas en `mockups/verify/`; comparar con el mockup
- [x] 4.3 Handoff `knowledge-base/entrega/C-06c.md`

## 5. Confirmación del número de afiliado (revisión 3)

- [x] 5.1 Variante en el mockup y aprobación
- [x] 5.2 Tests en rojo: confirmación, Volver atrás y consulta tras Confirmar (conversación, bot y API)
- [x] 5.3 Paso `confirmarAfiliado` en `conversacion.ts`
- [x] 5.4 `npm test`, typecheck, validate y recorrido en el navegador
