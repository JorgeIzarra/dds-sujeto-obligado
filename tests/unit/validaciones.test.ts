import { describe, it, expect } from 'vitest';
import {
  esCedulaValida,
  validarDocumentoGenerico,
  validarCorreo,
  validarTelefono,
} from '../../src/domain/validaciones';

// --- esCedulaValida (SPEC-RN-02, DEF001) ---
describe('esCedulaValida', () => {
  it('acepta 8-123-4567', () => expect(esCedulaValida('8-123-4567')).toBe(true));
  it('acepta 1-1234-123456 (1-4-6 dígitos)', () => expect(esCedulaValida('1-1234-123456')).toBe(true));
  it('acepta 12-1234-123456 (2 dígitos en primera parte)', () => expect(esCedulaValida('12-1234-123456')).toBe(true));
  it('rechaza 12345 sin guiones (SPEC-BHV-03)', () => expect(esCedulaValida('12345')).toBe(false));
  it('rechaza cadena vacía', () => expect(esCedulaValida('')).toBe(false));
  it('rechaza letras en el número', () => expect(esCedulaValida('A-123-4567')).toBe(false));
  it('rechaza puntos como separadores', () => expect(esCedulaValida('8.123.4567')).toBe(false));
  it('rechaza un solo guión 8-1234567', () => expect(esCedulaValida('8-1234567')).toBe(false));
});

// --- validarDocumentoGenerico (VOL-S3-01: PASAPORTE, RUC) ---
describe('validarDocumentoGenerico', () => {
  it('acepta alfanumérico A1234567', () => expect(validarDocumentoGenerico('A1234567')).toBe(true));
  it('acepta con guiones RUC-12345', () => expect(validarDocumentoGenerico('RUC-12345')).toBe(true));
  it('rechaza cadena vacía', () => expect(validarDocumentoGenerico('')).toBe(false));
  it('rechaza espacios internos', () => expect(validarDocumentoGenerico('A 1234')).toBe(false));
  it('rechaza caracteres especiales !', () => expect(validarDocumentoGenerico('A!1234')).toBe(false));
});

// --- validarCorreo (RF-02) ---
describe('validarCorreo', () => {
  it('acepta user@example.com', () => expect(validarCorreo('user@example.com')).toBe(true));
  it('acepta nombre+tag@dominio.org', () => expect(validarCorreo('nombre+tag@dominio.org')).toBe(true));
  it('rechaza sin @', () => expect(validarCorreo('userexample.com')).toBe(false));
  it('rechaza cadena vacía', () => expect(validarCorreo('')).toBe(false));
  it('rechaza sin dominio tras @', () => expect(validarCorreo('user@')).toBe(false));
});

// --- validarTelefono (RF-02) ---
describe('validarTelefono', () => {
  it('acepta +507 6123-4567', () => expect(validarTelefono('+507 6123-4567')).toBe(true));
  it('acepta 6000-1234', () => expect(validarTelefono('6000-1234')).toBe(true));
  it('acepta 61234567 (solo dígitos)', () => expect(validarTelefono('61234567')).toBe(true));
  it('rechaza cadena vacía', () => expect(validarTelefono('')).toBe(false));
  it('rechaza solo letras abc', () => expect(validarTelefono('abc')).toBe(false));
  it('rechaza menos de 7 caracteres 123', () => expect(validarTelefono('123')).toBe(false));
});
