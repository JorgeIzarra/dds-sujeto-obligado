// SPEC-RN-03 — Formato de folio (RF-07, RN-03)
// Función pura: sin dependencias de BD ni red

export function formatearFolio(anio: number, secuencia: number): string {
  return `DDS-${anio}-${String(secuencia).padStart(6, '0')}`;
}
