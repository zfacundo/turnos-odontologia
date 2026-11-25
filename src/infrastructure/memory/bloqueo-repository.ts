import type { BloqueoRepository } from '../../application/ports/repositorios';
import type { Bloqueo } from '../../domain/configuracion/bloqueo';
import { seSolapan, type Intervalo } from '../../domain/shared/intervalo';
import { RepositorioEnMemoria } from './repositorio-en-memoria';

export class BloqueoRepositoryEnMemoria
  extends RepositorioEnMemoria<Bloqueo>
  implements BloqueoRepository
{
  protected readonly codigoInexistente = 'BLOQUEO_INEXISTENTE';

  listarEn(rango: Intervalo): Bloqueo[] {
    return this.listar().filter((b) => seSolapan(b.intervalo, rango));
  }
}
