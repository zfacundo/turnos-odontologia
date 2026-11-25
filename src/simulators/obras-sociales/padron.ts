import type { AfiliadoSimulado, RegistroAfiliado } from './afiliado';

const REGISTROS: readonly RegistroAfiliado[] = [
  {
    nroAfiliado: 'AF-0001',
    nombrePacienteFicticio: 'Paciente Ficticio Padron Uno',
    obraSocial: 'OS-01',
    plan: 'Plan Base',
    cobertura: 80,
    copagoPct: 20,
    planes: ['Plan Base', 'Plan Plus'],
    estado: 'activo',
    simulado: true,
  },
  {
    nroAfiliado: 'AF-0002',
    nombrePacienteFicticio: 'Paciente Ficticio Padron Dos',
    obraSocial: 'OS-02',
    plan: 'Plan Copago',
    cobertura: 60,
    copagoPct: 40,
    planes: ['Plan Copago', 'Plan Premium'],
    estado: 'con_copago',
    simulado: true,
  },
  {
    nroAfiliado: 'AF-0003',
    nombrePacienteFicticio: 'Paciente Ficticio Padron Tres',
    obraSocial: 'OS-03',
    plan: 'Plan Sin Cobertura',
    cobertura: 0,
    copagoPct: 100,
    planes: ['Plan Sin Cobertura'],
    estado: 'sin_cobertura',
    simulado: true,
  },
  {
    nroAfiliado: 'AF-0004',
    nombrePacienteFicticio: 'Paciente Ficticio Padron Cuatro',
    obraSocial: 'OS-04',
    plan: 'Plan Error Simulado',
    cobertura: 0,
    copagoPct: 100,
    planes: ['Plan Error Simulado'],
    estado: 'error_simulado',
    simulado: true,
  },
];

function sinNombre(registro: RegistroAfiliado): AfiliadoSimulado {
  const { nombrePacienteFicticio: _omitido, ...publico } = registro;
  void _omitido;
  return structuredClone(publico);
}

export function afiliadosDelPadron(): AfiliadoSimulado[] {
  return REGISTROS.map(sinNombre);
}

export function buscarEnPadron(nroAfiliado: string): AfiliadoSimulado | undefined {
  const registro = REGISTROS.find((r) => r.nroAfiliado === nroAfiliado);
  return registro === undefined ? undefined : sinNombre(registro);
}
