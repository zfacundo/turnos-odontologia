import { describe, expect, it } from 'vitest';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import {
  consultarMensajesSimulados,
  registrarMensajeSimulado,
} from '../../../src/simulators/whatsapp/bandejaSimulada';

const TELEFONO = '+54 9 11 0000-0001';
const OTRO_TELEFONO = '+54 9 11 0000-0002';

function nuevasDeps() {
  return cargarSeed(new RelojFijo(new Date('2026-11-30T09:00:00-03:00')));
}

describe('Bandeja neutral de mensajes simulados', () => {
  it('dado un mensaje registrado para un telefono, cuando se consulta ese telefono, entonces se devuelve con su id', () => {
    const deps = nuevasDeps();

    registrarMensajeSimulado(deps, TELEFONO, 'Hola simulado');

    const mensajes = consultarMensajesSimulados(deps, TELEFONO);
    expect(mensajes).toHaveLength(1);
    expect(mensajes[0]?.texto).toBe('Hola simulado');
    expect(typeof mensajes[0]?.id).toBe('number');
  });

  it('dado un mensaje para un telefono, cuando se consulta otro telefono, entonces la lista esta vacia', () => {
    const deps = nuevasDeps();

    registrarMensajeSimulado(deps, TELEFONO, 'Privado');

    expect(consultarMensajesSimulados(deps, OTRO_TELEFONO)).toEqual([]);
  });

  it('dado un mensaje en una instancia de Deps, cuando se consulta otra instancia, entonces la lista esta vacia', () => {
    const deps = nuevasDeps();
    const otras = nuevasDeps();

    registrarMensajeSimulado(deps, TELEFONO, 'Solo en la primera');

    expect(consultarMensajesSimulados(otras, TELEFONO)).toEqual([]);
  });

  it('dado dos mensajes para el mismo telefono, cuando se consultan, entonces conservan el orden y tienen ids distintos', () => {
    const deps = nuevasDeps();

    registrarMensajeSimulado(deps, TELEFONO, 'Primero');
    registrarMensajeSimulado(deps, TELEFONO, 'Segundo');

    const mensajes = consultarMensajesSimulados(deps, TELEFONO);
    expect(mensajes.map((m) => m.texto)).toEqual(['Primero', 'Segundo']);
    expect(mensajes[0]?.id).not.toBe(mensajes[1]?.id);
  });
});
