export interface SubscriptionPlanProps {
  id: string;
  name: string;
  code: string;
  description?: string;
  durationDays: number;
  maxUserSeats: number;
  price: number;
  currency?: string;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SubscriptionPlan {
  private readonly _id: string;
  private _name: string;
  private _code: string;
  private _description?: string;
  private _durationDays: number;
  private _maxUserSeats: number;
  private _price: number;
  private _currency: string;
  private _isDefault: boolean;
  private _isActive: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(params: SubscriptionPlanProps) {
    if (!params.name || params.name.trim().length === 0) {
      throw new Error("El nombre del plan es obligatorio.");
    }
    if (!params.code || params.code.trim().length === 0) {
      throw new Error("El código de referencia del plan es obligatorio.");
    }
    if (params.durationDays <= 0) {
      throw new Error("La duración del plan debe ser superior a 0 días.");
    }
    if (params.maxUserSeats <= 0) {
      throw new Error("El cupo de usuarios debe ser de al menos 1 inspector.");
    }
    if (params.price < 0) {
      throw new Error("El precio del plan no puede ser negativo.");
    }

    this._id = params.id;
    this._name = params.name.trim();
    this._code = params.code.trim().toUpperCase();
    this._description = params.description?.trim();
    this._durationDays = params.durationDays;
    this._maxUserSeats = params.maxUserSeats;
    this._price = params.price;
    this._currency = params.currency || "BRL";
    this._isDefault = Boolean(params.isDefault);
    this._isActive = params.isActive !== undefined ? Boolean(params.isActive) : true;
    this._createdAt = params.createdAt || new Date();
    this._updatedAt = params.updatedAt || new Date();
  }

  public get id(): string {
    return this._id;
  }

  public get name(): string {
    return this._name;
  }

  public get code(): string {
    return this._code;
  }

  public get description(): string | undefined {
    return this._description;
  }

  public get durationDays(): number {
    return this._durationDays;
  }

  public get maxUserSeats(): number {
    return this._maxUserSeats;
  }

  public get price(): number {
    return this._price;
  }

  public get currency(): string {
    return this._currency;
  }

  public get isDefault(): boolean {
    return this._isDefault;
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public update(params: {
    name?: string;
    description?: string;
    durationDays?: number;
    maxUserSeats?: number;
    price?: number;
    currency?: string;
    isDefault?: boolean;
    isActive?: boolean;
  }): void {
    if (params.name !== undefined) {
      if (!params.name.trim()) throw new Error("El nombre del plan no puede estar vacío.");
      this._name = params.name.trim();
    }
    if (params.description !== undefined) {
      this._description = params.description.trim();
    }
    if (params.durationDays !== undefined) {
      if (params.durationDays <= 0) throw new Error("La duración debe ser mayor a 0 días.");
      this._durationDays = params.durationDays;
    }
    if (params.maxUserSeats !== undefined) {
      if (params.maxUserSeats <= 0) throw new Error("El cupo debe ser de al menos 1 usuario.");
      this._maxUserSeats = params.maxUserSeats;
    }
    if (params.price !== undefined) {
      if (params.price < 0) throw new Error("El precio no puede ser negativo.");
      this._price = params.price;
    }
    if (params.currency !== undefined) {
      this._currency = params.currency;
    }
    if (params.isDefault !== undefined) {
      this._isDefault = params.isDefault;
    }
    if (params.isActive !== undefined) {
      this._isActive = params.isActive;
    }
    this._updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this._id,
      name: this._name,
      code: this._code,
      description: this._description,
      durationDays: this._durationDays,
      maxUserSeats: this._maxUserSeats,
      price: this._price,
      currency: this._currency,
      isDefault: this._isDefault,
      isActive: this._isActive,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
