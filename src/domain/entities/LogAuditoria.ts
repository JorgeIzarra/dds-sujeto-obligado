export interface LogAuditoriaProps {
  id?: string;
  timestamp?: Date;
  usuarioId?: string | null;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  detalle?: Record<string, unknown> | null;
}

export class LogAuditoria {
  public readonly id: string;
  public readonly timestamp: Date;
  public usuarioId: string | null;
  public accion: string;
  public entidad: string;
  public entidadId: string | null;
  public detalle: Record<string, unknown> | null;

  constructor(props: LogAuditoriaProps) {
    this.id = props.id ?? crypto.randomUUID();
    this.timestamp = props.timestamp ?? new Date();
    this.usuarioId = props.usuarioId ?? null;
    this.accion = props.accion;
    this.entidad = props.entidad;
    this.entidadId = props.entidadId ?? null;
    this.detalle = props.detalle ?? null;
  }
}
