export interface ClienteProps {
  id?: string;
  formularioId: string;
  nombre: string;
  tipoDocumento: string;
  numDocumento: string;
  fechaNacimiento?: Date | null;
  nacionalidad: string;
  tipoCliente: string;
  esPEP?: boolean;
}

export class Cliente {
  public readonly id: string;
  public formularioId: string;
  public nombre: string;
  public tipoDocumento: string;
  public numDocumento: string;
  public fechaNacimiento: Date | null;
  public nacionalidad: string;
  public tipoCliente: string;
  public esPEP: boolean;

  constructor(props: ClienteProps) {
    this.id = props.id ?? crypto.randomUUID();
    this.formularioId = props.formularioId;
    this.nombre = props.nombre;
    this.tipoDocumento = props.tipoDocumento;
    this.numDocumento = props.numDocumento;
    this.fechaNacimiento = props.fechaNacimiento ?? null;
    this.nacionalidad = props.nacionalidad;
    this.tipoCliente = props.tipoCliente;
    this.esPEP = props.esPEP ?? false;
  }
}
