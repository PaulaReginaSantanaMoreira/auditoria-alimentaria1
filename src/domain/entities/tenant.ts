export type TenantStatus = "ACTIVE" | "SUSPENDED" | "PENDING";

export interface TenantProps {
  id: string;
  name: string;
  cif: string;
  slug: string;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Tenant {
  private readonly _id: string;
  private _name: string;
  private readonly _cif: string;
  private readonly _slug: string;
  private _status: TenantStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: TenantProps) {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error("El nombre de la empresa/tenant es obligatorio");
    }
    if (!props.cif || props.cif.trim().length === 0) {
      throw new Error("El CIF/NIF de la empresa/tenant es obligatorio");
    }

    this._id = props.id;
    this._name = props.name.trim();
    this._cif = props.cif.trim().toUpperCase();
    this._slug = props.slug.trim().toLowerCase();
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get cif(): string { return this._cif; }
  get slug(): string { return this._slug; }
  get status(): TenantStatus { return this._status; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  public isActive(): boolean {
    return this._status === "ACTIVE";
  }

  public suspend(): void {
    this._status = "SUSPENDED";
    this._updatedAt = new Date();
  }

  public activate(): void {
    this._status = "ACTIVE";
    this._updatedAt = new Date();
  }
}
