import type {
  AfiliadoSimulado,
  EstadoAfiliado,
  ErrorRegistroPadron,
  ObraSocialSimulada,
  ResultadoRegistroPadron,
} from './afiliado';
import { afiliadosDelPadron, obrasSocialesDelPadron } from './padron';

export interface PadronObraSocialRepository {
  buscarPorNumero(nroAfiliado: string): AfiliadoSimulado | undefined;
  listar(): AfiliadoSimulado[];
  listarObrasSociales(): ObraSocialSimulada[];
  buscarObraSocial(codigo: string): ObraSocialSimulada | undefined;
  registrarObraSocial(datos: {
    codigo: unknown;
    nombre: unknown;
    planes: unknown;
  }): ResultadoRegistroPadron<ObraSocialSimulada>;
  registrarAfiliado(datos: {
    nroAfiliado: unknown;
    obraSocial: unknown;
    plan: unknown;
    cobertura: unknown;
    copagoPct: unknown;
    estado: unknown;
  }): ResultadoRegistroPadron<AfiliadoSimulado>;
}

const CODIGO_OBRA_SOCIAL = /^OS-\d{2}$/;
const NRO_AFILIADO = /^AF-\d{4}$/;
const ESTADOS: readonly EstadoAfiliado[] = ['activo', 'con_copago', 'sin_cobertura', 'error_simulado'];

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function texto(valor: unknown, campo: string, patron?: RegExp): ResultadoRegistroPadron<string> {
  if (typeof valor !== 'string' || valor.trim() === '') {
    return { ok: false, error: { tipo: 'entrada', mensaje: `${campo} debe ser un texto no vacío.` } };
  }
  const limpio = valor.trim();
  if (patron !== undefined && !patron.test(limpio)) {
    return { ok: false, error: { tipo: 'entrada', mensaje: `${campo} debe tener el formato ${patron.source}.` } };
  }
  return { ok: true, valor: limpio };
}

function planesValidos(valor: unknown): valor is readonly string[] {
  return Array.isArray(valor) && valor.length > 0 && valor.every((p) => typeof p === 'string' && p.trim() !== '');
}

function porcentaje(valor: unknown, campo: string): ResultadoRegistroPadron<number> {
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 0 || valor > 100) {
    return { ok: false, error: { tipo: 'entrada', mensaje: `${campo} debe ser un entero entre 0 y 100.` } };
  }
  return { ok: true, valor };
}

function duplicado(campo: string, valor: string): ResultadoRegistroPadron<never> {
  return { ok: false, error: { tipo: 'duplicado', mensaje: `Ya existe ${campo} con ${campo === 'obra social' ? 'código' : 'número'} ${valor}.` } };
}

export class PadronObraSocialEnMemoria implements PadronObraSocialRepository {
  private readonly afiliados: AfiliadoSimulado[];
  private readonly obrasSociales: ObraSocialSimulada[];

  constructor(
    iniciales: readonly AfiliadoSimulado[] = afiliadosDelPadron(),
    obras: readonly ObraSocialSimulada[] = obrasSocialesDelPadron(),
  ) {
    this.afiliados = iniciales.map((a) => structuredClone(a));
    this.obrasSociales = obras.map((o) => structuredClone(o));
  }

  buscarPorNumero(nroAfiliado: string): AfiliadoSimulado | undefined {
    const afiliado = this.afiliados.find((a) => a.nroAfiliado === nroAfiliado);
    return afiliado === undefined ? undefined : structuredClone(afiliado);
  }

  listar(): AfiliadoSimulado[] {
    return this.afiliados.map((a) => structuredClone(a));
  }

  listarObrasSociales(): ObraSocialSimulada[] {
    return this.obrasSociales.map((o) => structuredClone(o));
  }

  buscarObraSocial(codigo: string): ObraSocialSimulada | undefined {
    const obra = this.obrasSociales.find((o) => o.codigo === codigo);
    return obra === undefined ? undefined : structuredClone(obra);
  }

  registrarObraSocial(datos: {
    codigo: unknown;
    nombre: unknown;
    planes: unknown;
  }): ResultadoRegistroPadron<ObraSocialSimulada> {
    if (!esObjeto(datos)) {
      return { ok: false, error: { tipo: 'entrada', mensaje: 'El cuerpo debe ser un objeto JSON.' } };
    }
    const codigo = texto(datos.codigo, 'codigo', CODIGO_OBRA_SOCIAL);
    if (!codigo.ok) return codigo;
    const nombre = texto(datos.nombre, 'nombre');
    if (!nombre.ok) return nombre;
    if (!planesValidos(datos.planes)) {
      return { ok: false, error: { tipo: 'entrada', mensaje: 'planes debe ser una lista no vacía de textos.' } };
    }
    if (this.buscarObraSocial(codigo.valor) !== undefined) return duplicado('obra social', codigo.valor);

    const creada: ObraSocialSimulada = {
      codigo: codigo.valor,
      nombre: nombre.valor,
      planes: datos.planes.map((p) => p.trim()),
      simulado: true,
    };
    this.obrasSociales.push(creada);
    return { ok: true, valor: structuredClone(creada) };
  }

  registrarAfiliado(datos: {
    nroAfiliado: unknown;
    obraSocial: unknown;
    plan: unknown;
    cobertura: unknown;
    copagoPct: unknown;
    estado: unknown;
  }): ResultadoRegistroPadron<AfiliadoSimulado> {
    if (!esObjeto(datos)) {
      return { ok: false, error: { tipo: 'entrada', mensaje: 'El cuerpo debe ser un objeto JSON.' } };
    }
    const nroAfiliado = texto(datos.nroAfiliado, 'nroAfiliado', NRO_AFILIADO);
    if (!nroAfiliado.ok) return nroAfiliado;
    const codigo = texto(datos.obraSocial, 'obraSocial', CODIGO_OBRA_SOCIAL);
    if (!codigo.ok) return codigo;
    const plan = texto(datos.plan, 'plan');
    if (!plan.ok) return plan;
    const cobertura = porcentaje(datos.cobertura, 'cobertura');
    if (!cobertura.ok) return cobertura;
    const copagoPct = porcentaje(datos.copagoPct, 'copagoPct');
    if (!copagoPct.ok) return copagoPct;
    if (cobertura.valor + copagoPct.valor !== 100) {
      return { ok: false, error: { tipo: 'entrada', mensaje: 'cobertura y copagoPct deben sumar 100.' } };
    }
    if (typeof datos.estado !== 'string' || !ESTADOS.includes(datos.estado as EstadoAfiliado)) {
      return { ok: false, error: { tipo: 'entrada', mensaje: 'estado debe ser activo, con_copago, sin_cobertura o error_simulado.' } };
    }

    const obra = this.buscarObraSocial(codigo.valor);
    if (obra === undefined) {
      return { ok: false, error: { tipo: 'entrada', mensaje: `No existe la obra social ${codigo.valor}.` } };
    }
    if (!obra.planes.includes(plan.valor)) {
      return { ok: false, error: { tipo: 'entrada', mensaje: `El plan ${plan.valor} no pertenece a ${codigo.valor}.` } };
    }
    if (this.buscarPorNumero(nroAfiliado.valor) !== undefined) return duplicado('afiliado', nroAfiliado.valor);

    const creado: AfiliadoSimulado = {
      nroAfiliado: nroAfiliado.valor,
      obraSocial: codigo.valor,
      plan: plan.valor,
      cobertura: cobertura.valor,
      copagoPct: copagoPct.valor,
      planes: obra.planes,
      estado: datos.estado as EstadoAfiliado,
      simulado: true,
    };
    this.afiliados.push(creado);
    return { ok: true, valor: structuredClone(creado) };
  }
}
