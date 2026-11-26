import { describe, expect, it } from 'vitest';
import {
  afiliadosDelPadron,
  buscarEnPadron,
} from '../../../src/simulators/obras-sociales/padron';
import { PadronObraSocialEnMemoria } from '../../../src/simulators/obras-sociales/padronRepository';

describe('padron de obra social simulado', () => {
  it('dado AF-0001 cuando se busca entonces devuelve afiliado activo con cobertura 80 y copago 20', () => {
    expect(buscarEnPadron('AF-0001')).toMatchObject({
      nroAfiliado: 'AF-0001',
      cobertura: 80,
      copagoPct: 20,
      estado: 'activo',
      simulado: true,
    });
  });

  it('dado AF-0002 cuando se busca entonces devuelve con_copago con cobertura 60 y copago 40', () => {
    expect(buscarEnPadron('AF-0002')).toMatchObject({
      cobertura: 60,
      copagoPct: 40,
      estado: 'con_copago',
    });
  });

  it('dado AF-0003 cuando se busca entonces devuelve sin_cobertura con cobertura 0 y copago 100', () => {
    expect(buscarEnPadron('AF-0003')).toMatchObject({
      cobertura: 0,
      copagoPct: 100,
      estado: 'sin_cobertura',
    });
  });

  it('dado AF-0004 cuando se busca entonces devuelve el caso de error simulado', () => {
    expect(buscarEnPadron('AF-0004')).toMatchObject({
      nroAfiliado: 'AF-0004',
      estado: 'error_simulado',
    });
  });

  it('dado AF-9999 cuando se busca entonces no devuelve ningun afiliado', () => {
    expect(buscarEnPadron('AF-9999')).toBeUndefined();
  });

  it('dado AF-0001 cuando se consulta dos veces entonces los resultados son equivalentes y no incluyen hora', () => {
    const primero = buscarEnPadron('AF-0001');
    const segundo = buscarEnPadron('AF-0001');
    expect(primero).toEqual(segundo);
    expect(JSON.stringify(primero)).not.toMatch(/fecha|hora|timestamp/i);
  });

  it('dado cualquier afiliado cuando se devuelve desde el padrón entonces no se expone el nombre del paciente', () => {
    const afiliado = buscarEnPadron('AF-0001');
    expect(afiliado).toBeDefined();
    expect(afiliado).not.toHaveProperty('nombre');
    expect(afiliado).not.toHaveProperty('nombrePacienteFicticio');
    expect(JSON.stringify(afiliado)).not.toContain('Paciente Ficticio');
  });

  it('dado el padrón inicial cuando se crea un repositorio entonces lista veinticuatro afiliados sin nombres', () => {
    const repo = new PadronObraSocialEnMemoria();
    expect(afiliadosDelPadron()).toHaveLength(24);
    expect(repo.listar()).toHaveLength(24);
    expect(repo.buscarPorNumero('AF-0024')).toMatchObject({ obraSocial: 'OS-07', plan: 'Clásico', estado: 'con_copago' });
    expect(repo.buscarPorNumero('AF-0002')).toMatchObject({ estado: 'con_copago' });
    expect(repo.buscarPorNumero('AF-9999')).toBeUndefined();
  });
});
