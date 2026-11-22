import { createApp } from './api/app';
import { relojDesdeEnv } from './infrastructure/clock/clock';
import { cargarSeed } from './infrastructure/seed/cargar-seed';
import { crearDepsVacias } from './infrastructure/seed/deps-vacias';

const puerto = Number(process.env.PORT ?? 3000);
const clock = relojDesdeEnv(process.env.SIM_NOW);
const deps = process.env.SEED === 'false' ? crearDepsVacias(clock) : cargarSeed(clock);

createApp(deps).listen(puerto, () => {
  console.log(`Turnos odontologia escuchando en http://localhost:${puerto}`);
});
