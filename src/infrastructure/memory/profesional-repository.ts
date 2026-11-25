import type { ProfesionalRepository } from '../../application/ports/repositorios';
import type { Profesional } from '../../domain/configuracion/profesional';
import { RepositorioEnMemoria } from './repositorio-en-memoria';

export class ProfesionalRepositoryEnMemoria
  extends RepositorioEnMemoria<Profesional>
  implements ProfesionalRepository
{
  protected readonly codigoInexistente = 'PROFESIONAL_INEXISTENTE';
}
