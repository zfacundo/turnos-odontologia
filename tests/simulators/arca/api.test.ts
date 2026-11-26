import { describe, it, expect } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../../src/api/app';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import type { EstadoTurno, Turno } from '../../../src/domain/agenda/turno';
import { IMPORTE_FACTURA_SIMULADA } from '../../../src/simulators/arca/facturaC';

const AHORA = new Date('2026-12-01T12:00:00-03:00');
const RECEPCION = { 'X-Usuario': 'u-recepcion', 'X-Rol': 'recepcion' };
const ADMIN = { 'X-Usuario': 'u-admin', 'X-Rol': 'admin' };
const ODONTO = { 'X-Usuario': 'u-odonto-1', 'X-Rol': 'odontologo' };
const PACIENTE = { 'X-Usuario': 'pac-usuario', 'X-Rol': 'paciente' };
const AVISO = 'SIMULACIÓN — sin validez fiscal';
const RUTA = '/api/sim/arca/facturas';

/** Turno de referencia del spec (datos ficticios), guardado directo en el repo en memoria. */
const turno = (id: string, estado: EstadoTurno = 'atendido'): Turno => ({
  id,
  pacienteId: 'pac-01',
  prestacionId: 'prest-control',
  profesionalId: 'prof-1',
  sillonId: 'sillon-1',
  inicio: new Date('2026-12-01T10:00:00-03:00'),
  fin: new Date('2026-12-01T10:30:00-03:00'),
  estado,
  senado: false,
  esSobreturno: false,
  origen: 'recepcion',
  creadoPor: 'u-recepcion',
  creadoEn: new Date('2026-11-29T12:00:00-03:00'),
});

const nuevaApp = (...turnos: Turno[]): Express => {
  const deps = cargarSeed(new RelojFijo(AHORA));
  for (const t of turnos) deps.turnos.guardar(t);
  return createApp(deps);
};

const facturar = (app: Express, cuerpo: unknown, headers: Record<string, string> = RECEPCION) =>
  request(app).post(RUTA).set(headers).send(cuerpo as object);

describe('POST /api/sim/arca/facturas: exito', () => {
  it('dado T atendido cuando recepcion factura T entonces responde 201 rotulado con la factura completa', async () => {
    const app = nuevaApp(turno('turno-T'));
    const res = await facturar(app, { turnoId: 'turno-T' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      simulado: true,
      aviso: AVISO,
      factura: {
        id: expect.any(String),
        turnoId: 'turno-T',
        tipo: 'C',
        numero: '00001-00000001',
        cae: '26120101000001',
        fechaEmision: '2026-12-01',
        vencimientoCae: '2026-12-11',
        emitidaEn: AHORA.toISOString(),
        importe: IMPORTE_FACTURA_SIMULADA,
        concepto: 'Control y limpieza',
        emisor: { razonSocial: 'Consultorio Ficticio', cuit: '20-99999999-0', condicionIva: 'Monotributo' },
        receptor: { condicion: 'Consumidor Final', nombre: 'Paciente Ficticio Uno', dni: '99****01' },
        simulado: true,
      },
    });
    expect(JSON.stringify(res.body)).not.toContain('99000001');
  });

  it('dado T atendido cuando admin factura T entonces responde 201', async () => {
    const res = await facturar(nuevaApp(turno('turno-T')), { turnoId: 'turno-T' }, ADMIN);
    expect(res.status).toBe(201);
    expect(res.body.factura.turnoId).toBe('turno-T');
  });

  it('dado T y U atendidos cuando recepcion factura los dos entonces los numeros son correlativos', async () => {
    const app = nuevaApp(turno('turno-T'), turno('turno-U'));
    const t = await facturar(app, { turnoId: 'turno-T' });
    const u = await facturar(app, { turnoId: 'turno-U' });
    expect(t.body.factura.numero).toBe('00001-00000001');
    expect(u.body.factura.numero).toBe('00001-00000002');
  });

  it('dado T atendido cuando recepcion envia un importe propio entonces se ignora', async () => {
    const res = await facturar(nuevaApp(turno('turno-T')), { turnoId: 'turno-T', importe: 1 });
    expect(res.status).toBe(201);
    expect(res.body.factura.importe).toBe(IMPORTE_FACTURA_SIMULADA);
  });
});

describe('POST /api/sim/arca/facturas: cuerpo inválido (400)', () => {
  const invalidos: [string, unknown][] = [
    ['un cuerpo sin turnoId', {}],
    ['un turnoId numerico', { turnoId: 123 }],
    ['un cuerpo que es un array', ['turno-T']],
  ];
  for (const [nombre, cuerpo] of invalidos) {
    it(`dado ${nombre} cuando recepcion pide emitir entonces responde 400`, async () => {
      const res = await facturar(nuevaApp(turno('turno-T')), cuerpo);
      expect(res.status).toBe(400);
      expect(res.body.error.tipo).toBe('entrada');
    });
  }
});

describe('POST /api/sim/arca/facturas: permisos (403)', () => {
  for (const [rol, headers] of [['odontologo', ODONTO], ['paciente', PACIENTE]] as const) {
    it(`dado T atendido cuando un ${rol} factura T entonces responde 403`, async () => {
      const res = await facturar(nuevaApp(turno('turno-T')), { turnoId: 'turno-T' }, headers);
      expect(res.status).toBe(403);
      expect(res.body.error.tipo).toBe('permiso');
    });
  }

  it('dado un pedido sin rol sobre un turno inexistente cuando pide emitir entonces responde 403 y no 404', async () => {
    const res = await request(nuevaApp()).post(RUTA).send({ turnoId: 'turno-inexistente' });
    expect(res.status).toBe(403);
  });

  it('dado un 403 previo cuando despues recepcion factura T entonces el numero sigue siendo 1', async () => {
    const app = nuevaApp(turno('turno-T'));
    await facturar(app, { turnoId: 'turno-T' }, ODONTO);
    const res = await facturar(app, { turnoId: 'turno-T' });
    expect(res.body.factura.numero).toBe('00001-00000001');
  });
});

describe('POST /api/sim/arca/facturas: turno inexistente (404)', () => {
  it('dado ningun turno con ese id cuando recepcion factura turno-inexistente entonces responde 404 nombrandolo', async () => {
    const res = await facturar(nuevaApp(), { turnoId: 'turno-inexistente' });
    expect(res.status).toBe(404);
    expect(res.body.error.tipo).toBe('no-encontrado');
    expect(res.body.error.mensaje).toContain('turno-inexistente');
  });
});

describe('POST /api/sim/arca/facturas: reglas (409)', () => {
  it('dado T reservado cuando recepcion factura T entonces responde 409 RN-SM-03 citando SU-07', async () => {
    const res = await facturar(nuevaApp(turno('turno-T', 'reservado')), { turnoId: 'turno-T' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      tipo: 'regla',
      regla: 'RN-SM-03',
      conflicto: { turnoId: 'turno-T' },
    });
    expect(res.body.error.mensaje).toContain('SU-07');
  });

  it('dado T ya facturado cuando recepcion factura T otra vez entonces responde 409 con el cuerpo exacto y el facturaId', async () => {
    const app = nuevaApp(turno('turno-T'), turno('turno-U'));
    const primera = await facturar(app, { turnoId: 'turno-T' });
    const res = await facturar(app, { turnoId: 'turno-T' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: {
        tipo: 'regla',
        regla: 'RN-SM-03',
        mensaje: 'No se puede emitir: turno ya facturado.',
        conflicto: { turnoId: 'turno-T', facturaId: primera.body.factura.id },
      },
    });
    const otra = await facturar(app, { turnoId: 'turno-U' });
    expect(otra.body.factura.numero).toBe('00001-00000002');
  });
});

// spec: arca-ver-factura-y-confirmar-emision
const consultar = (app: Express, turnoId: string, headers: Record<string, string> = RECEPCION) =>
  request(app).get(`${RUTA}/${turnoId}`).set(headers);

describe('GET /api/sim/arca/facturas/:turnoId: factura emitida', () => {
  it('dado T facturado cuando recepcion consulta T entonces responde 200 rotulado con estado emitida y la misma factura que devolvio el POST', async () => {
    const app = nuevaApp(turno('turno-T'));
    const emitida = await facturar(app, { turnoId: 'turno-T' });
    const res = await consultar(app, 'turno-T');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ simulado: true, aviso: AVISO, estado: 'emitida', factura: emitida.body.factura });
    expect(res.body.factura.numero).toBe('00001-00000001');
    expect(res.body.factura.cae).toBe('26120101000001');
  });

  it('dado T facturado cuando admin consulta T entonces responde 200 con estado emitida', async () => {
    const app = nuevaApp(turno('turno-T'));
    const emitida = await facturar(app, { turnoId: 'turno-T' });
    const res = await consultar(app, 'turno-T', ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('emitida');
    expect(res.body.factura.id).toBe(emitida.body.factura.id);
  });

  it('dado T facturado cuando se consulta dos veces y se factura otro turno U entonces U es 00001-00000002', async () => {
    const app = nuevaApp(turno('turno-T'), turno('turno-U'));
    await facturar(app, { turnoId: 'turno-T' });
    await consultar(app, 'turno-T');
    await consultar(app, 'turno-T');
    const otra = await facturar(app, { turnoId: 'turno-U' });
    expect(otra.body.factura.numero).toBe('00001-00000002');
  });
});

describe('GET /api/sim/arca/facturas/:turnoId: vista previa', () => {
  it('dado T atendido sin factura cuando recepcion consulta T entonces responde 200 con vista-previa emitible, sin numero ni cae y sin el DNI completo', async () => {
    const app = nuevaApp(turno('turno-T'));
    const res = await consultar(app, 'turno-T');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      simulado: true,
      aviso: AVISO,
      estado: 'vista-previa',
      emitible: true,
      factura: {
        turnoId: 'turno-T',
        tipo: 'C',
        fechaEmision: '2026-12-01',
        importe: IMPORTE_FACTURA_SIMULADA,
        concepto: 'Control y limpieza',
        emisor: { razonSocial: 'Consultorio Ficticio', cuit: '20-99999999-0', condicionIva: 'Monotributo' },
        receptor: { condicion: 'Consumidor Final', nombre: 'Paciente Ficticio Uno', dni: '99****01' },
        numero: null,
        cae: null,
        vencimientoCae: null,
        simulado: true,
      },
    });
    expect(res.text).not.toContain('99000001');
  });

  it('dado T atendido sin factura cuando se consulta dos veces y despues se factura entonces el numero es 00001-00000001', async () => {
    const app = nuevaApp(turno('turno-T'));
    await consultar(app, 'turno-T');
    const segunda = await consultar(app, 'turno-T');
    expect(segunda.body.estado).toBe('vista-previa');
    const emitida = await facturar(app, { turnoId: 'turno-T' });
    expect(emitida.body.factura.numero).toBe('00001-00000001');
  });

  it('dado T reservado sin factura cuando recepcion consulta T entonces responde 200 no emitible con RN-SM-03 citando SU-07', async () => {
    const app = nuevaApp(turno('turno-T', 'reservado'));
    const res = await consultar(app, 'turno-T');
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('vista-previa');
    expect(res.body.emitible).toBe(false);
    expect(res.body.motivo.regla).toBe('RN-SM-03');
    expect(res.body.motivo.mensaje).toContain('SU-07');
  });
});

describe('GET /api/sim/arca/facturas/:turnoId: errores', () => {
  it('dado un turno inexistente cuando recepcion consulta entonces responde 404 nombrandolo', async () => {
    const res = await consultar(nuevaApp(), 'turno-inexistente');
    expect(res.status).toBe(404);
    expect(res.body.error.tipo).toBe('no-encontrado');
    expect(res.body.error.mensaje).toContain('turno-inexistente');
  });

  it('dado T facturado cuando el odontologo consulta entonces responde 403 sin la factura', async () => {
    const app = nuevaApp(turno('turno-T'));
    await facturar(app, { turnoId: 'turno-T' });
    const res = await consultar(app, 'turno-T', ODONTO);
    expect(res.status).toBe(403);
    expect(res.text).not.toContain('00001-00000001');
  });

  it('dado T atendido cuando el paciente consulta entonces responde 403', async () => {
    const res = await consultar(nuevaApp(turno('turno-T')), 'turno-T', PACIENTE);
    expect(res.status).toBe(403);
  });

  it('dado un pedido sin rol cuando consulta un turno inexistente entonces responde 403 y no 404', async () => {
    const res = await request(nuevaApp()).get(`${RUTA}/turno-inexistente`);
    expect(res.status).toBe(403);
  });
});
