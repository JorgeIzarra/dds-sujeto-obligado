// SPEC-RN-02 (DEF001): validación de formato de cédula panameña X-XXXX-XXXXXX
// VOL-S3-01: catálogo tipoDocumento = CEDULA | PASAPORTE | RUC
const CEDULA_REGEX = /^\d{1,2}-\d{1,4}-\d{1,6}$/;
// {1,40} acota el backtracking máximo — seguro sin guard adicional
const DOCUMENTO_GENERICO_REGEX = /^[A-Za-z0-9-]{1,40}$/;
// Excluye "." de las clases del dominio para evitar ambigüedad con \. (S5852)
const CORREO_REGEX = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
// {7,20} acota el backtracking máximo — seguro sin guard adicional
const TELEFONO_REGEX = /^\+?[\d\s()-]{7,20}$/;
// RFC 5321: longitud máxima de una dirección de correo electrónico
const MAX_EMAIL_LENGTH = 254;

export function esCedulaValida(valor: string): boolean {
  return CEDULA_REGEX.test(valor);
}

export function validarDocumentoGenerico(valor: string): boolean {
  return DOCUMENTO_GENERICO_REGEX.test(valor);
}

export function validarCorreo(valor: string): boolean {
  if (valor.length > MAX_EMAIL_LENGTH) return false;
  return CORREO_REGEX.test(valor);
}

export function validarTelefono(valor: string): boolean {
  return TELEFONO_REGEX.test(valor);
}
