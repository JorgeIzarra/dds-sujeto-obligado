export interface DocumentoProps {
  id?: string;
  formularioId: string;
  tipo: string;
  fechaRecepcion?: Date;
  verificado?: boolean;
  baseLegal?: string | null;
}

export class Documento {
  public readonly id: string;
  public formularioId: string;
  public tipo: string;
  public readonly fechaRecepcion: Date;
  public verificado: boolean;
  public baseLegal: string | null;

  constructor(props: DocumentoProps) {
    this.id = props.id ?? crypto.randomUUID();
    this.formularioId = props.formularioId;
    this.tipo = props.tipo;
    this.fechaRecepcion = props.fechaRecepcion ?? new Date();
    this.verificado = props.verificado ?? false;
    this.baseLegal = props.baseLegal ?? null;
  }

  public marcarVerificado(): void {
    this.verificado = true;
  }
}
