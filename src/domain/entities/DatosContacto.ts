export interface DatosContactoProps {
  id?: string;
  formularioId: string;
  direccion: string;
  telefono: string;
  correo: string;
  fechaVerif?: Date | null;
}

export class DatosContacto {
  public readonly id: string;
  public formularioId: string;
  public direccion: string;
  public telefono: string;
  public correo: string;
  public fechaVerif: Date | null;

  constructor(props: DatosContactoProps) {
    this.id = props.id ?? crypto.randomUUID();
    this.formularioId = props.formularioId;
    this.direccion = props.direccion;
    this.telefono = props.telefono;
    this.correo = props.correo;
    this.fechaVerif = props.fechaVerif ?? null;
  }
}
