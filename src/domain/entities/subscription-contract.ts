export type ContractActionType = "CREATION" | "RENEWAL" | "EXTENSION" | "SEATS_ADJUSTMENT";
export type SubscriptionPaymentStatus = "PAID" | "COURTESY" | "PENDING_PAYMENT";

export interface SubscriptionContractProps {
  id: string;
  tenantId: string;
  subscriptionId?: string;
  planId?: string | null;
  planName?: string;
  planCode?: string;
  actionType: ContractActionType;
  validFrom: Date;
  expiresAt: Date;
  daysAdded: number;
  seats: number;
  paymentStatus: SubscriptionPaymentStatus;
  amount?: number;
  invoiceRef?: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
}

export class SubscriptionContract {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _subscriptionId?: string;
  private readonly _planId?: string | null;
  private readonly _planName?: string;
  private readonly _planCode?: string;
  private readonly _actionType: ContractActionType;
  private readonly _validFrom: Date;
  private readonly _expiresAt: Date;
  private readonly _daysAdded: number;
  private readonly _seats: number;
  private readonly _paymentStatus: SubscriptionPaymentStatus;
  private readonly _amount?: number;
  private readonly _invoiceRef?: string;
  private readonly _notes?: string;
  private readonly _createdBy?: string;
  private readonly _createdAt: Date;

  constructor(props: SubscriptionContractProps) {
    this._id = props.id;
    this._tenantId = props.tenantId;
    this._subscriptionId = props.subscriptionId;
    this._planId = props.planId ?? null;
    this._planName = props.planName;
    this._planCode = props.planCode;
    this._actionType = props.actionType;
    this._validFrom = props.validFrom;
    this._expiresAt = props.expiresAt;
    this._daysAdded = props.daysAdded;
    this._seats = props.seats;
    this._paymentStatus = props.paymentStatus;
    this._amount = props.amount;
    this._invoiceRef = props.invoiceRef?.trim();
    this._notes = props.notes?.trim();
    this._createdBy = props.createdBy?.trim();
    this._createdAt = props.createdAt;
  }

  get id(): string { return this._id; }
  get tenantId(): string { return this._tenantId; }
  get subscriptionId(): string | undefined { return this._subscriptionId; }
  get planId(): string | null | undefined { return this._planId; }
  get planName(): string | undefined { return this._planName; }
  get planCode(): string | undefined { return this._planCode; }
  get actionType(): ContractActionType { return this._actionType; }
  get validFrom(): Date { return this._validFrom; }
  get expiresAt(): Date { return this._expiresAt; }
  get daysAdded(): number { return this._daysAdded; }
  get seats(): number { return this._seats; }
  get paymentStatus(): SubscriptionPaymentStatus { return this._paymentStatus; }
  get amount(): number | undefined { return this._amount; }
  get invoiceRef(): string | undefined { return this._invoiceRef; }
  get notes(): string | undefined { return this._notes; }
  get createdBy(): string | undefined { return this._createdBy; }
  get createdAt(): Date { return this._createdAt; }

  public isCourtesy(): boolean {
    return this._paymentStatus === "COURTESY";
  }

  public isPendingPayment(): boolean {
    return this._paymentStatus === "PENDING_PAYMENT";
  }

  public isPaid(): boolean {
    return this._paymentStatus === "PAID";
  }
}
