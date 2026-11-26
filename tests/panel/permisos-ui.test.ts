import { describe, expect, it } from 'vitest';
import {
  parsearRuta,
  puedeCrearHistorial,
  puedeCrearTurnos,
  puedeEmitirFactura,
  puedeVerOdontograma,
  puedeVerRegistro,
  puedeEditarClientes,
  puedeLeerHistorial,
  puedeVer,
  seccionesPara,
} from '../../public/admin/js/permisos-ui.js';

const ids = (rol: string | undefined) => seccionesPara(rol).map((s) => s.id);

describe('seccionesPara (matriz D8)', () => {
  it('dado el rol recepcion cuando se arma la navegacion entonces no incluye Historial clinico', () => {
    expect(ids('recepcion')).toEqual(['dashboard', 'agenda', 'clientes']);
    expect(seccionesPara('recepcion').map((s) => s.titulo)).not.toContain('Historial clínico');
  });

  it('dado el rol odontologo cuando se arma la navegacion entonces ve las cuatro secciones', () => {
    expect(ids('odontologo')).toEqual(['dashboard', 'agenda', 'clientes', 'historial']);
  });

  it('dado el rol admin cuando se arma la navegacion entonces ve las cuatro secciones', () => {
    expect(ids('admin')).toEqual(['dashboard', 'agenda', 'clientes', 'historial']);
  });

  it('dado el rol paciente o sin rol cuando se arma la navegacion entonces no ve ninguna seccion', () => {
    expect(ids('paciente')).toEqual([]);
    expect(ids(undefined)).toEqual([]);
    expect(ids('superusuario')).toEqual([]);
  });

  it('dado cada seccion cuando se la lista entonces trae titulo, ruta hash y grupo', () => {
    for (const s of seccionesPara('admin')) {
      expect(s.ruta).toBe(`#/${s.id}`);
      expect(s.titulo.length).toBeGreaterThan(0);
      expect(['Consultorio', 'Clínica']).toContain(s.grupo);
    }
  });
});

describe('puedeVer(rol, ruta)', () => {
  it('dado recepcion cuando abre #/historial/pac-01 entonces no puede verla', () => {
    expect(puedeVer('recepcion', '#/historial/pac-01')).toBe(false);
  });

  it('dado odontologo y admin cuando abren #/historial/pac-01 entonces pueden verla', () => {
    expect(puedeVer('odontologo', '#/historial/pac-01')).toBe(true);
    expect(puedeVer('admin', '#/historial/pac-01')).toBe(true);
  });

  it('dado cualquier rol de panel cuando abre agenda, dashboard o clientes entonces puede verlas', () => {
    for (const rol of ['admin', 'recepcion', 'odontologo']) {
      for (const ruta of ['#/dashboard', '#/agenda', '#/clientes', '#/clientes/pac-01']) {
        expect(puedeVer(rol, ruta)).toBe(true);
      }
    }
  });

  it('dado una ruta desconocida o un rol sin acceso cuando se consulta entonces no puede verla', () => {
    expect(puedeVer('admin', '#/inexistente')).toBe(false);
    expect(puedeVer('paciente', '#/agenda')).toBe(false);
    expect(puedeVer(undefined, '#/agenda')).toBe(false);
  });
});

describe('parsearRuta', () => {
  it('dado #/historial/pac-01 cuando se parsea entonces devuelve seccion historial e id pac-01', () => {
    expect(parsearRuta('#/historial/pac-01')).toEqual({ seccion: 'historial', id: 'pac-01' });
  });

  it('dado #/agenda cuando se parsea entonces devuelve seccion agenda sin id', () => {
    expect(parsearRuta('#/agenda')).toEqual({ seccion: 'agenda', id: undefined });
  });

  it('dado un hash vacio o sin barra cuando se parsea entonces la seccion es vacia', () => {
    expect(parsearRuta('')).toEqual({ seccion: '', id: undefined });
    expect(parsearRuta('#')).toEqual({ seccion: '', id: undefined });
    expect(parsearRuta('#/')).toEqual({ seccion: '', id: undefined });
  });

  it('dado un id con caracteres codificados cuando se parsea entonces lo decodifica', () => {
    expect(parsearRuta('#/clientes/pac%2001').id).toBe('pac 01');
  });
});

describe('permisos finos de la UI', () => {
  it('dado cada rol cuando se pregunta por alta y edicion de clientes entonces solo admin y recepcion pueden', () => {
    expect(puedeEditarClientes('admin')).toBe(true);
    expect(puedeEditarClientes('recepcion')).toBe(true);
    expect(puedeEditarClientes('odontologo')).toBe(false);
    expect(puedeEditarClientes(undefined)).toBe(false);
  });

  it('dado cada rol cuando se pregunta por leer el historial entonces solo admin y odontologo pueden', () => {
    expect(puedeLeerHistorial('admin')).toBe(true);
    expect(puedeLeerHistorial('odontologo')).toBe(true);
    expect(puedeLeerHistorial('recepcion')).toBe(false);
  });

  it('dado cada rol cuando se pregunta por el formulario de alta de historial entonces solo odontologo puede', () => {
    expect(puedeCrearHistorial('odontologo')).toBe(true);
    expect(puedeCrearHistorial('admin')).toBe(false);
    expect(puedeCrearHistorial('recepcion')).toBe(false);
  });
});

// spec: panel-reemplaza-agenda-vieja
describe('permisos del odontograma, alta de turnos y registro', () => {
  it('dado cada rol cuando se pregunta puedeVerOdontograma entonces solo odontologo', () => {
    expect(puedeVerOdontograma('odontologo')).toBe(true);
    expect(puedeVerOdontograma('recepcion')).toBe(false);
    expect(puedeVerOdontograma('admin')).toBe(false);
    expect(puedeVerOdontograma('paciente')).toBe(false);
    expect(puedeVerOdontograma(undefined)).toBe(false);
  });

  it('dado cada rol cuando se pregunta puedeCrearTurnos entonces admin y recepcion', () => {
    expect(puedeCrearTurnos('admin')).toBe(true);
    expect(puedeCrearTurnos('recepcion')).toBe(true);
    expect(puedeCrearTurnos('odontologo')).toBe(false);
    expect(puedeCrearTurnos(undefined)).toBe(false);
  });

  it('dado cada rol cuando se pregunta puedeVerRegistro entonces admin y recepcion', () => {
    expect(puedeVerRegistro('admin')).toBe(true);
    expect(puedeVerRegistro('recepcion')).toBe(true);
    expect(puedeVerRegistro('odontologo')).toBe(false);
    expect(puedeVerRegistro('paciente')).toBe(false);
  });

  it('dado la ruta del odontograma cuando se llama puedeVer entonces solo el odontologo entra', () => {
    expect(puedeVer('odontologo', '#/odontograma/t-1')).toBe(true);
    expect(puedeVer('recepcion', '#/odontograma/t-1')).toBe(false);
    expect(puedeVer('admin', '#/odontograma/t-1')).toBe(false);
    expect(puedeVer('paciente', '#/odontograma/t-1')).toBe(false);
  });

  it('dado cualquier rol cuando se arma la barra lateral entonces no hay seccion odontograma', () => {
    for (const rol of ['admin', 'recepcion', 'odontologo', 'paciente', undefined]) {
      expect(ids(rol)).not.toContain('odontograma');
    }
  });
});

// spec: panel-boton-emitir-factura
describe('permiso de emitir factura', () => {
  it('dado el rol recepcion o admin cuando se pregunta puedeEmitirFactura entonces es true', () => {
    expect(puedeEmitirFactura('recepcion')).toBe(true);
    expect(puedeEmitirFactura('admin')).toBe(true);
  });

  it('dado odontologo, paciente o sin rol cuando se pregunta puedeEmitirFactura entonces es false', () => {
    expect(puedeEmitirFactura('odontologo')).toBe(false);
    expect(puedeEmitirFactura('paciente')).toBe(false);
    expect(puedeEmitirFactura(undefined)).toBe(false);
  });
});
