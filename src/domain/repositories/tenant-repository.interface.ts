import { Tenant, TenantStatus } from "../entities/tenant";
import { TenantSubscription, PlanTier, SubscriptionPaymentStatus } from "../entities/subscription";
import { SubscriptionContract, ContractActionType } from "../entities/subscription-contract";

export interface TenantWithSubscription {
  tenant: Tenant;
  subscription: TenantSubscription;
  activeUsersCount: number;
}

export interface CreateTenantDTO {
  name: string;
  cif: string;
  slug: string;
  planTier?: PlanTier;
  maxUserSeats?: number;
  subscriptionDays?: number;
  address?: string;
  phone?: string;
  adminEmail?: string;
  adminName?: string;
  temporaryPassword?: string;
  paymentStatus?: SubscriptionPaymentStatus;
  invoiceRef?: string;
  notes?: string;
}

export interface RenewContractDTO {
  tenantId: string;
  actionType?: ContractActionType;
  daysToAdd?: number;
  newExpiresAt?: Date;
  newSeats?: number;
  paymentStatus: SubscriptionPaymentStatus;
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
  updatePlanTier(tenantId: string, planTier: PlanTier): Promise<void>;
  updateContactInfo(tenantId: string, info: { address?: string; phone?: string; adminEmail?: string; adminName?: string }): Promise<void>;
  updateTenantDetails(tenantId: string, details: { name?: string; address?: string; phone?: string; adminEmail?: string; adminName?: string }): Promise<void>;
  getSubscriptionContracts(tenantId: string): Promise<SubscriptionContract[]>;
  renewContract(dto: RenewContractDTO): Promise<{ subscription: TenantSubscription; contract: SubscriptionContract }>;
  updateTenantUser(params: {
    tenantId: string;
    userId: string;
    fullName?: string;
    role?: "TENANT_ADMIN" | "AUDITOR" | "INSPECTOR" | "VIEWER";
    isActive?: boolean;
  }): Promise<any>;
}
