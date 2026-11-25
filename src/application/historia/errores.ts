import type { ErrorDeRegla } from '../../domain/shared/result';

export type ErrorHistoria =
  | { readonly tipo: 'permiso'; readonly mensaje: string }
  | { readonly tipo: 'no-encontrado'; readonly mensaje: string }
  | { readonly tipo: 'entrada'; readonly mensaje: string }
  | { readonly tipo: 'regla'; readonly error: ErrorDeRegla };
