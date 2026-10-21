import { Tenant, TenantStatus } from "../entities/tenant";
import { TenantSubscription, PlanTier } from "../entities/subscription";

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
}

export interface ITenantRepository {
  findAll(): Promise<TenantWithSubscription[]>;
  findById(id: string): Promise<TenantWithSubscription | null>;
  findByCif(cif: string): Promise<TenantWithSubscription | null>;
  create(dto: CreateTenantDTO): Promise<TenantWithSubscription>;
  updateStatus(id: string, status: TenantStatus): Promise<void>;
  updateSubscriptionSeats(tenantId: string, maxSeats: number): Promise<void>;
  updateSubscriptionExpiration(tenantId: string, expiresAt: Date): Promise<void>;
}
