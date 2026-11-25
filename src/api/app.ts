import express, { type Express } from 'express';
import path from 'node:path';
import type { Deps } from './deps';
import { manejadorDeErrores } from './middleware/errores';
import { rolSimulado } from './middleware/rol-simulado';
import { catalogoRouter } from './routes/catalogo';
import { pacientesRouter } from './routes/pacientes';
import { disponibilidadRouter } from './routes/disponibilidad';
import { turnosRouter } from './routes/turnos';
import { odontogramaRouter } from './routes/odontograma';
import { mercadoPagoRouter } from '../simulators/mercadopago/router';
import { obrasSocialesRouter } from '../simulators/obras-sociales/router';

export function createApp(deps: Deps): Express {
  const app = express();
  app.use(express.json());
  app.use(rolSimulado);
  app.use(express.static(path.join(__dirname, '..', '..', 'public')));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', catalogoRouter(deps));
  app.use('/api', pacientesRouter(deps, deps.pacientes));
  app.use('/api', turnosRouter(deps));
  app.use('/api', disponibilidadRouter(deps));
  app.use('/api', mercadoPagoRouter(deps));
  app.use('/api', obrasSocialesRouter(deps));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { tipo: 'no-encontrado', mensaje: 'Ruta inexistente' } });
  });

  app.use(manejadorDeErrores);
  return app;
}
