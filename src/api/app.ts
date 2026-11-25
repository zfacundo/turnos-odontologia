import express, { type Express } from 'express';
import path from 'node:path';
import type { Deps } from './deps';
import { manejadorDeErrores } from './middleware/errores';
import { identidad } from './middleware/identidad';
import { catalogoRouter } from './routes/catalogo';
import { pacientesRouter } from './routes/pacientes';
import { disponibilidadRouter } from './routes/disponibilidad';
import { turnosRouter } from './routes/turnos';
import { configuracionRouter } from './routes/configuracion';
import { odontogramaRouter } from './routes/odontograma';
import { mercadoPagoRouter } from '../simulators/mercadopago/router';
import { obrasSocialesRouter } from '../simulators/obras-sociales/router';
import { whatsappRouter } from '../simulators/whatsapp/router';
import { arcaRouter } from '../simulators/arca/router';
import { auditoriaRouter } from './routes/auditoria';
import { authRouter } from './routes/auth';
import { historiaRouter } from './routes/historia';
import { panelRouter } from './routes/panel';

export function createApp(deps: Deps): Express {
  const app = express();
  app.use(express.json());
  app.use(identidad(deps));
  // Panel: BRAND_NAME y logo tienen una sola fuente (design-system/), sin copiarlos a public/admin/.
  app.get('/admin/brand.js', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'design-system', 'brand.js'));
  });
  app.get('/admin/logo.svg', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'design-system', 'assets', 'logo.svg'));
  });
  // panel-reemplaza-agenda-vieja (D1): la agenda vieja y su odontograma suelto redirigen al panel.
  app.get(['/', '/index.html'], (_req, res) => {
    res.redirect(302, '/admin/');
  });
  app.get('/odontograma.html', (_req, res) => {
    res.redirect(302, '/admin/#/agenda');
  });
  app.use(express.static(path.join(__dirname, '..', '..', 'public')));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', catalogoRouter(deps));
  app.use('/api', pacientesRouter(deps, deps.pacientes));
  app.use('/api', turnosRouter(deps));
  app.use('/api', disponibilidadRouter(deps));
  app.use('/api', configuracionRouter(deps));
  app.use('/api', mercadoPagoRouter(deps));
  app.use('/api', obrasSocialesRouter(deps));
  app.use('/api', whatsappRouter(deps));
  app.use('/api', arcaRouter(deps));
  app.use('/api', auditoriaRouter(deps));
app.use('/api', odontogramaRouter(deps));
  app.use('/api', authRouter(deps));
  app.use('/api', historiaRouter(deps));
  app.use('/api', panelRouter(deps));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { tipo: 'no-encontrado', mensaje: 'Ruta inexistente' } });
  });

  app.use(manejadorDeErrores);
  return app;
}
