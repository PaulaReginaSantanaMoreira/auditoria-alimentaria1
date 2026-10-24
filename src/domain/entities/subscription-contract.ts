export type ContractActionType = "CREATION" | "RENEWAL" | "EXTENSION" | "SEATS_ADJUSTMENT";
export type SubscriptionPaymentStatus = "PAID" | "COURTESY" | "PENDING_PAYMENT" | "CANCELLED" | "REFUNDED" | "PARTIALLY_REFUNDED";

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
  paymentDueDate?: Date;
  amount?: number;
  refundAmount?: number;
  refundType?: "TOTAL" | "PARTIAL";
  refundReason?: string;
  refundedAt?: Date;
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
  private readonly _paymentDueDate?: Date;
  private readonly _amount?: number;
  private readonly _refundAmount?: number;
  private readonly _refundType?: "TOTAL" | "PARTIAL";
  private readonly _refundReason?: string;
  private readonly _refundedAt?: Date;
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
    this._paymentDueDate = props.paymentDueDate;
    this._amount = props.amount;
    this._refundAmount = props.refundAmount;
    this._refundType = props.refundType;
    this._refundReason = props.refundReason;
    this._refundedAt = props.refundedAt;
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
  get paymentDueDate(): Date | undefined { return this._paymentDueDate; }
  get amount(): number | undefined { return this._amount; }
  get refundAmount(): number | undefined { return this._refundAmount; }
  get refundType(): "TOTAL" | "PARTIAL" | undefined { return this._refundType; }
  get refundReason(): string | undefined { return this._refundReason; }
  get refundedAt(): Date | undefined { return this._refundedAt; }
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

  public isCancelled(): boolean {
    return this._paymentStatus === "CANCELLED";
  }

  public isRefunded(): boolean {
    return this._paymentStatus === "REFUNDED" || this._paymentStatus === "PARTIALLY_REFUNDED" || (this._refundAmount !== undefined && this._refundAmount > 0);
  }

  public isFullyRefunded(): boolean {
    return this._paymentStatus === "REFUNDED";
  }

  public isPartiallyRefunded(): boolean {
    return this._paymentStatus === "PARTIALLY_REFUNDED";
  }

  public isOfferExpired(): boolean {
    if (this._paymentStatus !== "PENDING_PAYMENT" || !this._paymentDueDate) return false;
    return new Date() > this._paymentDueDate;
  }

  /**
   * Calcula el reembolso proporcional según los días restantes de vigencia.
   * Regla de negocio: Cualquier fracción de día utilizada computa como jornada completa (día entero).
   */
  public calculateProportionalRefund(asOfDate: Date = new Date()): {
    daysTotal: number;
    daysUsed: number;
    daysRemaining: number;
    dailyRate: number;
    maxProportionalRefund: number;
    alreadyRefunded: number;
  } {
    const originalAmount = Number(this._amount || 0);
    const alreadyRefunded = Number(this._refundAmount || 0);
    const daysTotal = Math.max(1, this._daysAdded || 1);

    if (originalAmount <= 0) {
      return {
        daysTotal,
        daysUsed: daysTotal,
        daysRemaining: 0,
        dailyRate: 0,
        maxProportionalRefund: 0,
        alreadyRefunded,
      };
    }

    const startMs = this._validFrom.getTime();
    const asOfMs = asOfDate.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    let daysUsed = 0;
    if (asOfMs > startMs) {
      // Fracción de jornada cuenta como día completo (Math.ceil)
      daysUsed = Math.ceil((asOfMs - startMs) / oneDayMs);
      daysUsed = Math.min(daysTotal, Math.max(0, daysUsed));
    }

    const daysRemaining = Math.max(0, daysTotal - daysUsed);
    const dailyRate = Number((originalAmount / daysTotal).toFixed(4));
    
    // El reembolso proporcional no puede superar el saldo pendiente tras reembolsos previos
    const rawProportional = Number(((daysRemaining / daysTotal) * originalAmount).toFixed(2));
    const availableBalance = Math.max(0, Number((originalAmount - alreadyRefunded).toFixed(2)));
    const maxProportionalRefund = Math.min(rawProportional, availableBalance);

    return {
      daysTotal,
      daysUsed,
      daysRemaining,
      dailyRate,
      maxProportionalRefund,
      alreadyRefunded,
    };
  }
}
