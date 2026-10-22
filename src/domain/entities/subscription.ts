export type PlanTier = "STARTER" | "PRO" | "ENTERPRISE";
export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "SUSPENDED";
export type SubscriptionPaymentStatus = "PAID" | "COURTESY" | "PENDING_PAYMENT";

export interface SubscriptionFeatureFlags {
  customRubric: boolean;
  offlineSync: boolean;
  exportPdf: boolean;
  analytics: boolean;
}

export interface TenantSubscriptionProps {
  id: string;
  tenantId: string;
  planTier: PlanTier;
  maxUserSeats: number;
  status: SubscriptionStatus;
  validFrom: Date;
  expiresAt: Date;
  featureFlags: SubscriptionFeatureFlags;
  paymentStatus?: SubscriptionPaymentStatus;
  invoiceRef?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TenantSubscription {
  private readonly _id: string;
  private readonly _tenantId: string;
  private _planTier: PlanTier;
  private _maxUserSeats: number;
  private _status: SubscriptionStatus;
  private _validFrom: Date;
  private _expiresAt: Date;
  private _featureFlags: SubscriptionFeatureFlags;
  private _paymentStatus: SubscriptionPaymentStatus;
  private _invoiceRef?: string;
  private _notes?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: TenantSubscriptionProps) {
    if (props.maxUserSeats < 1) {
      throw new Error("El límite de usuarios/asientos debe ser al menos 1");
    }

    this._id = props.id;
    this._tenantId = props.tenantId;
    this._planTier = props.planTier;
    this._maxUserSeats = props.maxUserSeats;
    this._status = props.status;
    this._validFrom = props.validFrom;
    this._expiresAt = props.expiresAt;
    this._featureFlags = props.featureFlags;
    this._paymentStatus = props.paymentStatus || "PAID";
    this._invoiceRef = props.invoiceRef;
    this._notes = props.notes;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get id(): string { return this._id; }
  get tenantId(): string { return this._tenantId; }
  get planTier(): PlanTier { return this._planTier; }
  get maxUserSeats(): number { return this._maxUserSeats; }
  get status(): SubscriptionStatus { return this._status; }
  get validFrom(): Date { return this._validFrom; }
  get expiresAt(): Date { return this._expiresAt; }
  get featureFlags(): SubscriptionFeatureFlags { return this._featureFlags; }
  get paymentStatus(): SubscriptionPaymentStatus { return this._paymentStatus; }
  get invoiceRef(): string | undefined { return this._invoiceRef; }
  get notes(): string | undefined { return this._notes; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  public isExpired(): boolean {
    return new Date() > this._expiresAt || this._status === "EXPIRED";
  }

  public isActive(): boolean {
    return this._status === "ACTIVE" && !this.isExpired();
  }

  public getDaysRemaining(): number {
    const diffMs = this._expiresAt.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  public updateSeats(newSeats: number): void {
    if (newSeats < 1) throw new Error("Los asientos no pueden ser inferiores a 1");
    this._maxUserSeats = newSeats;
    this._updatedAt = new Date();
  }

  public extendValidity(newExpiresAt: Date, paymentStatus?: SubscriptionPaymentStatus): void {
    if (newExpiresAt <= this._validFrom) {
      throw new Error("La nueva fecha de vencimiento debe ser posterior a la fecha inicial");
    }
    this._expiresAt = newExpiresAt;
    if (paymentStatus) {
      this._paymentStatus = paymentStatus;
    }
    if (this._status === "EXPIRED" && newExpiresAt > new Date()) {
      this._status = "ACTIVE";
    }
    this._updatedAt = new Date();
  }

  public updateBilling(params: { paymentStatus?: SubscriptionPaymentStatus; invoiceRef?: string; notes?: string }): void {
    if (params.paymentStatus) this._paymentStatus = params.paymentStatus;
    if (params.invoiceRef !== undefined) this._invoiceRef = params.invoiceRef;
    if (params.notes !== undefined) this._notes = params.notes;
    this._updatedAt = new Date();
  }
}
