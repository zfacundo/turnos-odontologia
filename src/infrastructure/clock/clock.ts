import type { Clock } from '../../application/ports/clock';

/** Unico lugar con new Date() sin argumentos. */
export class RelojDeSistema implements Clock {
  ahora(): Date {
    return new Date();
  }
}

export class RelojFijo implements Clock {
  constructor(private readonly instante: Date) {}

  ahora(): Date {
    return new Date(this.instante.getTime());
  }
}

/** Si SIM_NOW esta definida devuelve un reloj fijo; si es invalida falla (arranque rapido). */
export function relojDesdeEnv(simNow?: string): Clock {
  if (simNow === undefined || simNow === '') return new RelojDeSistema();
  const instante = new Date(simNow);
  if (Number.isNaN(instante.getTime())) {
    throw new Error(`SIM_NOW invalida: "${simNow}" no es una fecha ISO valida.`);
  }
  return new RelojFijo(instante);
}
