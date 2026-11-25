import { fallo, ok, type ErrorDeRegla, type Result } from '../../domain/shared/result';
import type { AfiliadoSimulado } from './afiliado';
import type { PadronObraSocialRepository } from './padronRepository';

export type ErrorConsultarAfiliado =
  | { readonly tipo: 'entrada'; readonly mensaje: string }
  | { readonly tipo: 'no-encontrado'; readonly mensaje: 'afiliado no encontrado' }
  | { readonly tipo: 'regla'; readonly error: ErrorDeRegla };

export function consultarAfiliado(
  afiliados: PadronObraSocialRepository,
  nro: string | undefined,
): Result<AfiliadoSimulado, ErrorConsultarAfiliado> {
  if (typeof nro !== 'string' || nro.trim() === '') {
    return fallo({ tipo: 'entrada', mensaje: 'Falta el número de afiliado.' });
  }
  const afiliado = afiliados.buscarPorNumero(nro);
  if (afiliado === undefined) {
    return fallo({ tipo: 'no-encontrado', mensaje: 'afiliado no encontrado' });
  }
  if (afiliado.estado === 'error_simulado') {
    return fallo({
      tipo: 'regla',
      error: {
        regla: 'RN-SM-02',
        mensaje: 'SIMULACIÓN: falla simulada del padrón de obra social.',
      },
    });
  }
  return ok(afiliado);
}
