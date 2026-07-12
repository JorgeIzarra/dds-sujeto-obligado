// SPEC-RN-03 — Formato de folio (RF-07, RN-03)
import { describe, it, expect } from 'vitest';
import { formatearFolio } from '../../src/domain/folio';

describe('formatearFolio (SPEC-RN-03, RF-07, RN-03)', () => {
  it('formatea con padding a 6 dígitos', () => {
    expect(formatearFolio(2026, 42)).toBe('DDS-2026-000042');
  });

  it('formatea la secuencia 1 con padding completo', () => {
    expect(formatearFolio(2026, 1)).toBe('DDS-2026-000001');
  });

  it('no trunca una secuencia de 6 dígitos exactos', () => {
    expect(formatearFolio(2026, 999999)).toBe('DDS-2026-999999');
  });

  it('cumple el patrón ^DDS-\\d{4}-\\d{6}$', () => {
    expect(formatearFolio(2027, 7)).toMatch(/^DDS-\d{4}-\d{6}$/);
  });
});
