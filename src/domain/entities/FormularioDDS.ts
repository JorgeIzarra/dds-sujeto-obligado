export interface FormularioDDSProps {
  id?: string;
  folio?: string | null;
  proposito: string;
  clasificacionRiesgo?: string | null;
  estado?: string;
  fechaCierre?: Date | null;
  fechaExpiracion?: Date | null;
  oficialId: string;
  creadoEn?: Date;
  actualizadoEn?: Date;
}

export class FormularioDDS {
  public readonly id: string;
  public readonly folio: string | null;
  public readonly fecha: Date;
  public readonly proposito: string;
  public clasificacionRiesgo: string | null;
  public estado: string;
  public fechaCierre: Date | null;
  public fechaExpiracion: Date | null;
  public oficialId: string;
  public readonly creadoEn: Date;
  public actualizadoEn: Date;

  constructor(props: FormularioDDSProps) {
    this.id = props.id ?? crypto.randomUUID();
    this.folio = props.folio ?? null;
    this.fecha = new Date();
    this.proposito = props.proposito;
    this.clasificacionRiesgo = props.clasificacionRiesgo ?? null;
    this.estado = props.estado ?? 'BORRADOR';
    this.fechaCierre = props.fechaCierre ?? null;
    this.fechaExpiracion = props.fechaExpiracion ?? null;
    this.oficialId = props.oficialId;
    this.creadoEn = props.creadoEn ?? new Date();
    this.actualizadoEn = props.actualizadoEn ?? new Date();
  }

  public esBorrador(): boolean {
    return this.estado === 'BORRADOR';
  }

  public estaGuardado(): boolean {
    return this.estado === 'GUARDADO';
  }

  public estaAprobado(): boolean {
    return this.estado === 'APROBADO';
  }

  public puedeEditarse(): boolean {
    return this.estado === 'BORRADOR';
  }
}
