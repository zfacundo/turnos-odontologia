import type { Paciente } from '../../domain/pacientes/paciente';
import { fallo, ok, type Result } from '../../domain/shared/result';

export type DatosPaciente = Omit<Paciente, 'id'>;

export type ErrorValidacionPaciente = {
  readonly tipo: 'entrada';
  readonly mensaje: string;
};

export type ResultadoValidacionPaciente = Result<DatosPaciente, ErrorValidacionPaciente>;

const DNI = /^99\d{6}$/;
const TELEFONO = /^\+54 9 11 0000-00\d{2}$/;
const EMAIL = /^[^\s@]+@ejemplo\.invalid$/;
const OBRA_SOCIAL = /^OS-\d{2}$/;
const NRO_AFILIADO = /^AF-\d{4}$/;

function error(mensaje: string): ResultadoValidacionPaciente {
  return fallo({ tipo: 'entrada', mensaje });
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function texto(cuerpo: Record<string, unknown>, campo: string): Result<string, ErrorValidacionPaciente> {
  const valor = cuerpo[campo];
  if (typeof valor !== 'string' || valor.trim() === '') {
    return fallo({ tipo: 'entrada', mensaje: `Falta ${campo} o no es un texto no vacio.` });
  }
  return ok(valor);
}

function textoOpcional(
  cuerpo: Record<string, unknown>,
  campo: string,
): Result<string | undefined, ErrorValidacionPaciente> {
  const valor = cuerpo[campo];
  if (valor === undefined) return ok(undefined);
  if (typeof valor !== 'string' || valor.trim() === '') {
    return fallo({ tipo: 'entrada', mensaje: `${campo} debe ser un texto no vacio.` });
  }
  return ok(valor);
}

export function validarPaciente(cuerpo: unknown): ResultadoValidacionPaciente {
  if (!esObjeto(cuerpo)) return error('El cuerpo debe ser un objeto JSON.');

  const nombre = texto(cuerpo, 'nombre');
  if (!nombre.ok) return nombre;
  const dni = texto(cuerpo, 'dni');
  if (!dni.ok) return dni;
  const telefono = texto(cuerpo, 'telefono');
  if (!telefono.ok) return telefono;

  if (!DNI.test(dni.valor)) return error('dni debe tener el formato ficticio 99NNNNNN.');
  if (!TELEFONO.test(telefono.valor)) {
    return error('telefono debe tener el formato ficticio +54 9 11 0000-00NN.');
  }

  const email = textoOpcional(cuerpo, 'email');
  if (!email.ok) return email;
  if (email.valor !== undefined && !EMAIL.test(email.valor)) {
    return error('email debe ser ficticio y terminar en @ejemplo.invalid.');
  }

  const obraSocialId = textoOpcional(cuerpo, 'obraSocialId');
  if (!obraSocialId.ok) return obraSocialId;
  if (obraSocialId.valor !== undefined && !OBRA_SOCIAL.test(obraSocialId.valor)) {
    return error('obraSocialId debe tener el formato OS-NN.');
  }

  const nroAfiliado = textoOpcional(cuerpo, 'nroAfiliado');
  if (!nroAfiliado.ok) return nroAfiliado;
  if (nroAfiliado.valor !== undefined && !NRO_AFILIADO.test(nroAfiliado.valor)) {
    return error('nroAfiliado debe tener el formato AF-NNNN.');
  }

  return ok({
    nombre: nombre.valor,
    dni: dni.valor,
    telefono: telefono.valor,
    ...(email.valor !== undefined && { email: email.valor }),
    ...(obraSocialId.valor !== undefined && { obraSocialId: obraSocialId.valor }),
    ...(nroAfiliado.valor !== undefined && { nroAfiliado: nroAfiliado.valor }),
  });
}
