import type { SillonRepository } from '../../application/ports/repositorios';
import type { Sillon } from '../../domain/configuracion/sillon';
import { RepositorioEnMemoria } from './repositorio-en-memoria';

export class SillonRepositoryEnMemoria
  extends RepositorioEnMemoria<Sillon>
  implements SillonRepository
{
  protected readonly codigoInexistente = 'SILLON_INEXISTENTE';
}
