import { randomBytes } from 'node:crypto';
import type { GeneradorToken } from '../../application/auth/puertos';

/** Token opaco de 256 bits (S-2); no contiene datos del usuario. */
export class GeneradorTokenAleatorio implements GeneradorToken {
  generar(): string {
    return randomBytes(32).toString('base64url');
  }
}
