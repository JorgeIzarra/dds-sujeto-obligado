// SPEC-RN-02 (DEF001): validación de formato de cédula panameña X-XXXX-XXXXXX
// VOL-S3-01: catálogo tipoDocumento = CEDULA | PASAPORTE | RUC
const CEDULA_REGEX = /^\d{1,2}-\d{1,4}-\d{1,6}$/;
const DOCUMENTO_GENERICO_REGEX = /^[A-Za-z0-9-]{1,40}$/;
const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO_REGEX = /^\+?[\d\s()-]{7,20}$/;

export function esCedulaValida(valor: string): boolean {
  return CEDULA_REGEX.test(valor);
}

export function validarDocumentoGenerico(valor: string): boolean {
  return DOCUMENTO_GENERICO_REGEX.test(valor);
}

export function validarCorreo(valor: string): boolean {
  return CORREO_REGEX.test(valor);
}

export function validarTelefono(valor: string): boolean {
  return TELEFONO_REGEX.test(valor);
}
