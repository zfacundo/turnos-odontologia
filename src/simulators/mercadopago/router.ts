import { Router } from 'express';
import type { Deps } from '../../api/deps';
import { ErrorDeEntrada, ErrorDePermiso, FalloDeRegla } from '../../api/middleware/errores';
import type { Usuario } from '../../domain/shared/rol';
import { pagarSena } from './pagarSena';
import { AVISO_SIMULACION } from './pagoSena';
import { PagoSenaRepositoryEnMemoria, type PagoSenaRepository } from './pagoSenaRepository';

/**
 * Router del simulador de Mercado Pago (design D7, D8). El repositorio de pagos es propio
 * del modulo: no se agrega a Deps (fuera de la Zona de C-11).
 */
export function mercadoPagoRouter(
  deps: Deps,
  pagos: PagoSenaRepository = new PagoSenaRepositoryEnMemoria(),
): Router {
  const router = Router();
  const depsPago = { turnos: deps.turnos, pagos, clock: deps.clock, auditoria: deps.auditoria };

  router.post('/sim/mercadopago/pagos', (req, res, next) => {
    const usuario = res.locals.usuario as Usuario | undefined;
    const resultado = pagarSena(depsPago, usuario, req.body as unknown);
    if (!resultado.ok) {
      const error = resultado.error;
      switch (error.tipo) {
        case 'permiso':
          next(new ErrorDePermiso(error.mensaje));
          return;
        case 'entrada':
          next(new ErrorDeEntrada(error.mensaje));
          return;
        case 'regla':
          next(new FalloDeRegla(error.error));
          return;
        case 'no-encontrado':
          res.status(404).json({ error: { tipo: 'no-encontrado', mensaje: error.mensaje } });
          return;
      }
    }
    const { pago, turno } = resultado.valor;
    res.status(201).json({
      simulado: true,
      aviso: AVISO_SIMULACION,
      pago,
      turno: { id: turno.id, estado: turno.estado, senado: turno.senado },
    });
  });

  return router;
}
