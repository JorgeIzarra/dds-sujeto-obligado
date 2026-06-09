export interface OficialProps {
  id?: string;
  nombre: string;
  cargo: string;
  email: string;
  hashPassword: string;
}

export class Oficial {
  public readonly id: string;
  public nombre: string;
  public cargo: string;
  public email: string;
  public hashPassword: string;

  constructor(props: OficialProps) {
    this.id = props.id ?? crypto.randomUUID();
    this.nombre = props.nombre;
    this.cargo = props.cargo;
    this.email = props.email;
    this.hashPassword = props.hashPassword;
  }

  public esSupervisor(): boolean {
    return this.cargo === 'SUPERVISOR';
  }

  public esOficial(): boolean {
    return this.cargo === 'OFICIAL';
  }
}
