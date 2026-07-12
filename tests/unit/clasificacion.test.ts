// SPEC-RN-01 — Tabla de verdad de clasificarRiesgo (RF-06, RN-01, Art. 26)
// SPEC-BHV-01: Given perfil bajo → When clasifica → Then BAJO
import { describe, it, expect } from 'vitest';
import { clasificarRiesgo } from '../../src/domain/clasificacion';

describe('clasificarRiesgo (SPEC-RN-01, RF-06, Art. 26)', () => {
  it('BAJO cuando ingreso 4900, volumen 8000, esPEP=false (SPEC-BHV-01)', () => {
    expect(clasificarRiesgo({ ingresoMensual: 4900, volumenMensual: 8000, esPEP: false })).toBe('BAJO');
  });

  it('BAJO cuando ingreso exactamente 5000, volumen exactamente 10000, esPEP=false (límite exacto)', () => {
    expect(clasificarRiesgo({ ingresoMensual: 5000, volumenMensual: 10000, esPEP: false })).toBe('BAJO');
  });

  it('NO_ELEGIBLE cuando ingreso 5000.01, volumen 10000, esPEP=false (límite > 5000)', () => {
    expect(clasificarRiesgo({ ingresoMensual: 5000.01, volumenMensual: 10000, esPEP: false })).toBe('NO_ELEGIBLE');
  });

  it('NO_ELEGIBLE cuando ingreso 5000, volumen 10000.01, esPEP=false (límite > 10000)', () => {
    expect(clasificarRiesgo({ ingresoMensual: 5000, volumenMensual: 10000.01, esPEP: false })).toBe('NO_ELEGIBLE');
  });

  it('NO_ELEGIBLE cuando ingresoMensual > 5000 (independiente de volumen y PEP)', () => {
    expect(clasificarRiesgo({ ingresoMensual: 6000, volumenMensual: 8000, esPEP: false })).toBe('NO_ELEGIBLE');
  });

  it('NO_ELEGIBLE cuando volumenMensual > 10000 (independiente de ingreso y PEP)', () => {
    expect(clasificarRiesgo({ ingresoMensual: 4000, volumenMensual: 15000, esPEP: false })).toBe('NO_ELEGIBLE');
  });

  it('NO_ELEGIBLE cuando esPEP=true, aunque ingreso y volumen bajos (RN-02, Art. 26)', () => {
    expect(clasificarRiesgo({ ingresoMensual: 1000, volumenMensual: 2000, esPEP: true })).toBe('NO_ELEGIBLE');
  });

  it('NO_ELEGIBLE cuando esPEP=true con ingreso en límite exacto (PEP domina)', () => {
    expect(clasificarRiesgo({ ingresoMensual: 5000, volumenMensual: 10000, esPEP: true })).toBe('NO_ELEGIBLE');
  });

  it('NO_ELEGIBLE cuando todos los factores son elevados (todos los factores)', () => {
    expect(clasificarRiesgo({ ingresoMensual: 8000, volumenMensual: 20000, esPEP: true })).toBe('NO_ELEGIBLE');
  });

  it('BAJO cuando ingreso 0, volumen 0, esPEP=false (valores cero)', () => {
    expect(clasificarRiesgo({ ingresoMensual: 0, volumenMensual: 0, esPEP: false })).toBe('BAJO');
  });
});
