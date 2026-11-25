import { Router } from 'express';
import type { Deps } from '../../api/deps';
import { ErrorDeEntrada } from '../../api/middleware/errores';
import { procesar, simuladoresPorDefecto, type SimuladoresBot } from './bot';
import { consultarAvisosCancelacion } from './avisosCancelacion';
import { nuevaSesion, type Entrada, type Respuesta, type Sesion } from './conversacion';

export const AVISO_SIMULACION = 'Simulación — no es WhatsApp real';
/** Solo telefonos ficticios, mismo formato que la ficha de paciente (C-08). */
const TELEFONO_FICTICIO = /^\+54 9 11 0000-00\d{2}$/;

/** Conversaciones en memoria por telefono (design D7); inyectable para tests. */
export type SesionesWhatsApp = Map<string, Sesion>;

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function telefonoDe(cuerpo: Record<string, unknown>): string {
  const t = cuerpo.telefono;
  if (typeof t !== 'string' || !TELEFONO_FICTICIO.test(t)) {
    throw new ErrorDeEntrada('telefono debe ser un número ficticio con formato +54 9 11 0000-00NN.');
  }
  return t;
}

/** Exactamente uno de opcionId (boton) o texto (texto libre). */
function entradaDe(cuerpo: Record<string, unknown>): Entrada {
  const { opcionId, texto } = cuerpo;
  const hayOpcion = typeof opcionId === 'string' && opcionId !== '';
  const hayTexto = typeof texto === 'string' && texto.trim() !== '';
  if (hayOpcion === hayTexto) throw new ErrorDeEntrada('El mensaje debe traer exactamente uno de opcionId o texto.');
  return hayOpcion ? { tipo: 'opcion', id: opcionId as string } : { tipo: 'texto', texto: texto as string };
}

function cuerpoDe(body: unknown): Record<string, unknown> {
  if (!esObjeto(body)) throw new ErrorDeEntrada('El cuerpo debe ser un objeto JSON.');
  return body;
}

function json(r: Respuesta) {
  return { simulado: true, aviso: AVISO_SIMULACION, mensajes: r.mensajes, opciones: r.opciones, pideTexto: r.pideTexto };
}

/** Router del bot de WhatsApp SIMULADO (RN-WA-01..04, RN-SM-04). No usa X-Rol: representa al paciente del telefono. */
export function whatsappRouter(
  deps: Deps,
  sesiones: SesionesWhatsApp = new Map(),
  sims: SimuladoresBot = simuladoresPorDefecto(),
): Router {
  const router = Router();

  const atender = (telefono: string, entrada: Entrada): Respuesta => {
    const r = procesar(deps, telefono, sesiones.get(telefono) ?? nuevaSesion(), entrada, sims);
    sesiones.set(telefono, r.sesion);
    return r.respuesta;
  };

  router.post('/sim/whatsapp/mensaje', (req, res) => {
    const cuerpo = cuerpoDe(req.body);
    const telefono = telefonoDe(cuerpo);
    res.json(json(atender(telefono, entradaDe(cuerpo))));
  });

  router.post('/sim/whatsapp/recordatorio', (req, res) => {
    const telefono = telefonoDe(cuerpoDe(req.body));
    res.json(json(atender(telefono, { tipo: 'recordatorio' })));
  });

  router.get('/sim/whatsapp/avisos', (req, res) => {
    const telefono = req.query.telefono;

    if (typeof telefono !== 'string' ||
        !TELEFONO_FICTICIO.test(telefono)) {
      throw new ErrorDeEntrada('Teléfono ficticio inválido.');
    }

    res.json({
      simulado: true,
      aviso: AVISO_SIMULACION,
      avisos: consultarAvisosCancelacion(deps, telefono),
    });
  });

  return router;
}
