import { Router } from 'express';
import type { Deps } from '../../api/deps';
import { ErrorDeEntrada } from '../../api/middleware/errores';
import { procesar, simuladoresPorDefecto, type SimuladoresBot } from './bot';
import { consultarAvisosCancelacion } from './avisosCancelacion';
import { contactoPublico, resolverTelefono } from './contactoSimulado';
import { nuevaSesion, type Entrada, type Respuesta, type Sesion } from './conversacion';

export const AVISO_SIMULACION = 'Simulación — no es WhatsApp real';

/** Conversaciones en memoria por telefono (design D7); inyectable para tests. */
export type SesionesWhatsApp = Map<string, Sesion>;

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
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
  sims: SimuladoresBot = simuladoresPorDefecto(deps.padron),
): Router {
  const router = Router();

  const atender = (telefono: string, entrada: Entrada): Respuesta => {
    const r = procesar(deps, telefono, sesiones.get(telefono) ?? nuevaSesion(), entrada, sims);
    sesiones.set(telefono, r.sesion);
    return r.respuesta;
  };

  router.post('/sim/whatsapp/mensaje', (req, res) => {
    const cuerpo = cuerpoDe(req.body);
    const telefono = resolverTelefono(deps, cuerpo);
    res.json(json(atender(telefono, entradaDe(cuerpo))));
  });

  router.post('/sim/whatsapp/recordatorio', (req, res) => {
    const telefono = resolverTelefono(deps, cuerpoDe(req.body));
    res.json(json(atender(telefono, { tipo: 'recordatorio' })));
  });

  router.get('/sim/whatsapp/contactos', (_req, res) => {
    const contactos = deps.pacientes.listar().map(contactoPublico);

    res.json({
      simulado: true,
      total: contactos.length,
      contactos,
    });
  });

  router.get('/sim/whatsapp/avisos', (req, res) => {
    const telefono = resolverTelefono(deps, req.query);

    res.json({
      simulado: true,
      aviso: AVISO_SIMULACION,
      avisos: consultarAvisosCancelacion(deps, telefono),
    });
  });

  return router;
}
