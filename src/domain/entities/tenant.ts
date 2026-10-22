export type TenantStatus = "ACTIVE" | "SUSPENDED" | "PENDING";

export interface TenantProps {
  id: string;
  name: string;
  cif: string;
  slug: string;
  status: TenantStatus;
  address?: string;
  phone?: string;
  adminEmail?: string;
  adminName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Tenant {
  private readonly _id: string;
  private _name: string;
  private readonly _cif: string;
  private readonly _slug: string;
  private _status: TenantStatus;
  private _address?: string;
  private _phone?: string;
  private _adminEmail?: string;
  private _adminName?: string;
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
    this._address = props.address?.trim();
    this._phone = props.phone?.trim();
    this._adminEmail = props.adminEmail?.trim().toLowerCase();
    this._adminName = props.adminName?.trim();
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get cif(): string { return this._cif; }
  get slug(): string { return this._slug; }
  get status(): TenantStatus { return this._status; }
  get address(): string | undefined { return this._address; }
  get phone(): string | undefined { return this._phone; }
  get adminEmail(): string | undefined { return this._adminEmail; }
  get adminName(): string | undefined { return this._adminName; }
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

  public updateContactInfo(info: { address?: string; phone?: string; adminEmail?: string; adminName?: string }): void {
    if (info.address !== undefined) this._address = info.address.trim();
    if (info.phone !== undefined) this._phone = info.phone.trim();
    if (info.adminEmail !== undefined) this._adminEmail = info.adminEmail.trim().toLowerCase();
    if (info.adminName !== undefined) this._adminName = info.adminName.trim();
    this._updatedAt = new Date();
  }

  /**
   * Actualiza los datos de la empresa.
   * NOTA DE ARQUITECTURA & SEGURIDAD:
   * El documento oficial (CIF / NIF) es estrictamente inmutable (_cif es readonly)
   * para preservar la trazabilidad jurídica y la integridad de las auditorías sanitarias.
   */
  public updateDetails(details: {
    name?: string;
    address?: string;
    phone?: string;
    adminEmail?: string;
    adminName?: string;
  }): void {
    if (details.name !== undefined) {
      if (!details.name || details.name.trim().length === 0) {
        throw new Error("El nombre de la empresa no puede estar vacío");
      }
      this._name = details.name.trim();
    }
    this.updateContactInfo(details);
  }
}
