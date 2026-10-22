import { Cif } from "../value-objects/cif";

export class Company {
  private readonly _id: string;
  private _name: string;
  private _cif: Cif;
  private _address: string;
  private _sanitaryRegistryNumber?: string;
  private _createdAt: Date;

  constructor(params: {
    id: string;
    name: string;
    cif: Cif;
    address: string;
    sanitaryRegistryNumber?: string;
    createdAt?: Date;
  }) {
    if (!params.name || params.name.trim().length === 0) {
      throw new Error("O nome da empresa auditada é obrigatório.");
    }
    if (!params.address || params.address.trim().length === 0) {
      throw new Error("O endereço da instalação da empresa é obrigatório.");
    }

    this._id = params.id;
    this._name = params.name.trim();
    this._cif = params.cif;
    this._address = params.address.trim();
    this._sanitaryRegistryNumber = params.sanitaryRegistryNumber?.trim();
    this._createdAt = params.createdAt || new Date();
  }

  public get id(): string {
    return this._id;
  }

  public get name(): string {
    return this._name;
  }

  public get cif(): Cif {
    return this._cif;
  }

  public get address(): string {
    return this._address;
  }

  public get sanitaryRegistryNumber(): string | undefined {
    return this._sanitaryRegistryNumber;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public updateDetails(name: string, address: string, sanitaryRegistryNumber?: string): void {
    if (!name || name.trim().length === 0) throw new Error("Nome inválido");
    if (!address || address.trim().length === 0) throw new Error("Endereço inválido");
    this._name = name.trim();
    this._address = address.trim();
    if (sanitaryRegistryNumber !== undefined) {
      this._sanitaryRegistryNumber = sanitaryRegistryNumber.trim();
    }
  }

  public toJSON() {
    return {
      id: this._id,
      name: this._name,
      cif: this._cif?.value || this._cif,
      address: this._address,
      sanitaryRegistryNumber: this._sanitaryRegistryNumber,
      createdAt: this._createdAt.toISOString(),
    };
  }
}
