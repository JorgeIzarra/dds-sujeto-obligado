export interface PerfilEconomicoProps {
  id?: string;
  formularioId: string;
  actividad: string;
  fuenteIngresos: string;
  ingresoMensual: number;
  volumenTransacciones: number;
}

export class PerfilEconomico {
  public readonly id: string;
  public formularioId: string;
  public actividad: string;
  public fuenteIngresos: string;
  public ingresoMensual: number;
  public volumenTransacciones: number;

  constructor(props: PerfilEconomicoProps) {
    this.id = props.id ?? crypto.randomUUID();
    this.formularioId = props.formularioId;
    this.actividad = props.actividad;
    this.fuenteIngresos = props.fuenteIngresos;
    this.ingresoMensual = props.ingresoMensual;
    this.volumenTransacciones = props.volumenTransacciones;
  }

  public esClienteBajoRiesgo(): boolean {
    return (
      this.ingresoMensual <= 5000 &&
      this.volumenTransacciones <= 10000
    );
  }
}
