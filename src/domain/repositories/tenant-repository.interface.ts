import { Tenant, TenantStatus } from "../entities/tenant";
import { TenantSubscription, PlanTier, SubscriptionPaymentStatus } from "../entities/subscription";
import { SubscriptionContract, ContractActionType } from "../entities/subscription-contract";

export interface TenantWithSubscription {
  tenant: Tenant;
  subscription: TenantSubscription | null;
  activeUsersCount: number;
}

export interface CreateTenantDTO {
  name: string;
  cif: string;
  slug: string;
  planId?: string;
  planName?: string;
  planCode?: string;
  planTier?: string;
  maxUserSeats?: number;
  subscriptionDays?: number;
  address?: string;
  phone?: string;
  adminEmail?: string;
  adminName?: string;
  adminPhone?: string;
  adminDocumentNumber?: string;
  temporaryPassword?: string;
  paymentStatus?: SubscriptionPaymentStatus;
  invoiceRef?: string;
  notes?: string;
}

export interface RenewContractDTO {
  tenantId: string;
  planId?: string;
  planName?: string;
  planCode?: string;
  actionType?: ContractActionType;
  daysToAdd?: number;
  newExpiresAt?: Date;
  newSeats?: number;
  paymentStatus: SubscriptionPaymentStatus;
  paymentDueDate?: Date;
  amount?: number;
  invoiceRef?: string;
  notes?: string;
  createdBy?: string;
}

export interface ITenantRepository {
  findAll(): Promise<TenantWithSubscription[]>;
  findById(id: string): Promise<TenantWithSubscription | null>;
  findByCif(cif: string): Promise<TenantWithSubscription | null>;
  create(dto: CreateTenantDTO): Promise<TenantWithSubscription>;
  updateStatus(id: string, status: TenantStatus): Promise<void>;
  updateSubscriptionSeats(tenantId: string, maxSeats: number): Promise<void>;
  updateSubscriptionExpiration(tenantId: string, expiresAt: Date): Promise<void>;
  updatePlan(tenantId: string, plan: { planId?: string | null; planName?: string; planCode?: string; maxUserSeats?: number }): Promise<void>;
  updatePlanTier(tenantId: string, planTier: string): Promise<void>;
  updateContactInfo(tenantId: string, info: { address?: string; phone?: string; adminEmail?: string; adminName?: string }): Promise<void>;
  updateTenantDetails(tenantId: string, details: { name?: string; address?: string; phone?: string; adminEmail?: string; adminName?: string }): Promise<void>;
  getSubscriptionContracts(tenantId: string): Promise<SubscriptionContract[]>;
  renewContract(dto: RenewContractDTO): Promise<{ subscription: TenantSubscription; contract: SubscriptionContract }>;
  confirmContractPayment(tenantId: string, contractId: string): Promise<{ subscription: TenantSubscription; contract: SubscriptionContract }>;
  cancelContractOffer(tenantId: string, contractId: string): Promise<void>;
  cancelContract(params: {
    tenantId: string;
    contractId: string;
    reason?: string;
  }): Promise<{ subscription: TenantSubscription; contract: SubscriptionContract }>;
  refundContract(params: {
    tenantId: string;
    contractId: string;
    refundType: "TOTAL" | "PARTIAL";
    refundAmount: number;
    refundReason: string;
    revokeAccess?: boolean;
  }): Promise<{ subscription: TenantSubscription; contract: SubscriptionContract }>;
  updateTenantUser(params: {
    tenantId: string;
    userId: string;
    fullName?: string;
    role?: "TENANT_ADMIN" | "AUDITOR" | "INSPECTOR" | "VIEWER";
    isActive?: boolean;
    isSuperAdmin?: boolean;
  }): Promise<any>;
  enforceSeatLimitDeactivation(
    tenantId: string,
    allowedSeats: number
  ): Promise<{ deactivatedCount: number }>;
}
