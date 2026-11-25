import type { PrestacionRepository } from '../../application/ports/repositorios';
import type { Prestacion } from '../../domain/configuracion/prestacion';
import { RepositorioEnMemoria } from './repositorio-en-memoria';

export class PrestacionRepositoryEnMemoria
  extends RepositorioEnMemoria<Prestacion>
  implements PrestacionRepository
{
  protected readonly codigoInexistente = 'PRESTACION_INEXISTENTE';
}
