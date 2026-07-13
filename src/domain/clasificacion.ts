// SPEC-RN-01 — Clasificación de riesgo (RF-06, RN-01, Art. 26)
// Función pura: sin dependencias de BD ni red; V(G) = 4 (3 if + 1 path base)

export interface PerfilRiesgo {
  ingresoMensual: number;
  volumenMensual: number;
  esPEP: boolean;
}

export function clasificarRiesgo(p: PerfilRiesgo): 'BAJO' | 'NO_ELEGIBLE' {
  if (p.esPEP) return 'NO_ELEGIBLE';
  if (p.ingresoMensual > 5000) return 'NO_ELEGIBLE';
  if (p.volumenMensual > 10000) return 'NO_ELEGIBLE';
  return 'BAJO';
}

// SPEC-RN-05: elegibilidad PEP para DDS
export function puedeGuardarseComoDDS(p: PerfilRiesgo): boolean {
  return !p.esPEP;
}

