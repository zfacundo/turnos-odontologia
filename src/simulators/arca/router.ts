import { Router } from 'express';
import type { Deps } from '../../api/deps';
import { ErrorDeEntrada, ErrorDePermiso, FalloDeRegla } from '../../api/middleware/errores';
import type { Usuario } from '../../domain/shared/rol';
import { emitirFacturaC } from './emitirFacturaC';
import { AVISO_SIMULACION } from './facturaC';
import { verFacturaC } from './verFacturaC';
import { FacturaCRepositoryEnMemoria, type FacturaCRepository } from './facturaCRepository';

/**
 * Router del simulador de ARCA (design D7, D9). El repositorio de facturas es propio
 * del modulo: no se agrega a Deps (fuera de la Zona de C-12).
 */
export function arcaRouter(
  deps: Deps,
  facturas: FacturaCRepository = new FacturaCRepositoryEnMemoria(),
): Router {
  const router = Router();
  const depsFactura = {
    turnos: deps.turnos,
    pacientes: deps.pacientes,
    prestaciones: deps.prestaciones,
    facturas,
    clock: deps.clock,
    auditoria: deps.auditoria,
  };

  router.post('/sim/arca/facturas', (req, res, next) => {
    const usuario = res.locals.usuario as Usuario | undefined;
    const resultado = emitirFacturaC(depsFactura, usuario, req.body as unknown);
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
        case 'ya-facturado':
          // Mismo formato que manejadorDeErrores, con facturaId en conflicto (design D7).
          res.status(409).json({
            error: {
              tipo: 'regla',
              regla: 'RN-SM-03',
              mensaje: error.mensaje,
              conflicto: { turnoId: error.turnoId, facturaId: error.facturaId },
            },
          });
          return;
      }
    }
    res.status(201).json({ simulado: true, aviso: AVISO_SIMULACION, factura: resultado.valor });
  });

  router.get('/sim/arca/facturas/:turnoId', (req, res, next) => {
    const usuario = res.locals.usuario as Usuario | undefined;
    const resultado = verFacturaC(depsFactura, usuario, req.params.turnoId ?? '');
    if (!resultado.ok) {
      const error = resultado.error;
      if (error.tipo === 'permiso') {
        next(new ErrorDePermiso(error.mensaje));
        return;
      }
      res.status(404).json({ error: { tipo: 'no-encontrado', mensaje: error.mensaje } });
      return;
    }
    res.status(200).json({ simulado: true, aviso: AVISO_SIMULACION, ...resultado.valor });
  });

  return router;
}
