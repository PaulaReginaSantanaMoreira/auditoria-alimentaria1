import { createAdminClient } from "../supabase-admin";
import { Tenant, TenantStatus } from "@/domain/entities/tenant";
import { TenantSubscription } from "@/domain/entities/subscription";
import {
  ITenantRepository,
  TenantWithSubscription,
  CreateTenantDTO,
} from "@/domain/repositories/tenant-repository.interface";

export class SupabaseTenantRepository implements ITenantRepository {
  private get client() {
    return createAdminClient();
  }

  public async findAll(): Promise<TenantWithSubscription[]> {
    const { data: tenants, error: tenantsError } = await this.client
      .from("tenants")
      .select(`
        id,
        name,
        cif,
        slug,
        status,
        created_at,
        updated_at,
        tenant_subscriptions (
          id,
          plan_tier,
          max_user_seats,
          status,
          valid_from,
          expires_at,
          feature_flags,
          created_at,
          updated_at
        ),
        tenant_users (
          id,
          is_active
        )
      `)
      .order("created_at", { ascending: false });

    if (tenantsError) {
      throw new Error(`Erro ao buscar tenants: ${tenantsError.message}`);
    }

    return (tenants || []).map((t: any) => {
      const sub = t.tenant_subscriptions?.[0] || {
        id: "mock-sub",
        plan_tier: "PRO",
        max_user_seats: 5,
        status: "ACTIVE",
        valid_from: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        feature_flags: { customRubric: true, offlineSync: true, exportPdf: true, analytics: true },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const activeUsersCount = (t.tenant_users || []).filter((u: any) => u.is_active).length;

      return {
        tenant: new Tenant({
          id: t.id,
          name: t.name,
          cif: t.cif,
          slug: t.slug,
          status: t.status as TenantStatus,
          createdAt: new Date(t.created_at),
          updatedAt: new Date(t.updated_at),
        }),
        subscription: new TenantSubscription({
          id: sub.id,
          tenantId: t.id,
          planTier: sub.plan_tier,
          maxUserSeats: sub.max_user_seats,
          status: sub.status,
          validFrom: new Date(sub.valid_from),
          expiresAt: new Date(sub.expires_at),
          featureFlags: sub.feature_flags,
          createdAt: new Date(sub.created_at),
          updatedAt: new Date(sub.updated_at),
        }),
        activeUsersCount,
      };
    });
  }

  public async findById(id: string): Promise<TenantWithSubscription | null> {
    const { data: t, error } = await this.client
      .from("tenants")
      .select(`
        id,
        name,
        cif,
        slug,
        status,
        created_at,
        updated_at,
        tenant_subscriptions (
          id,
          plan_tier,
          max_user_seats,
          status,
          valid_from,
          expires_at,
          feature_flags,
          created_at,
          updated_at
        ),
        tenant_users (
          id,
          is_active
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error || !t) return null;

    const sub = (t as any).tenant_subscriptions?.[0];
    const activeUsersCount = ((t as any).tenant_users || []).filter((u: any) => u.is_active).length;

    return {
      tenant: new Tenant({
        id: (t as any).id,
        name: (t as any).name,
        cif: (t as any).cif,
        slug: (t as any).slug,
        status: (t as any).status as TenantStatus,
        createdAt: new Date((t as any).created_at),
        updatedAt: new Date((t as any).updated_at),
      }),
      subscription: new TenantSubscription({
        id: sub.id,
        tenantId: (t as any).id,
        planTier: sub.plan_tier,
        maxUserSeats: sub.max_user_seats,
        status: sub.status,
        validFrom: new Date(sub.valid_from),
        expiresAt: new Date(sub.expires_at),
        featureFlags: sub.feature_flags,
        createdAt: new Date(sub.created_at),
        updatedAt: new Date(sub.updated_at),
      }),
      activeUsersCount,
    };
  }

  public async findByCif(cif: string): Promise<TenantWithSubscription | null> {
    const { data: t, error } = await this.client
      .from("tenants")
      .select("id")
      .eq("cif", cif.trim().toUpperCase())
      .maybeSingle();

    if (error || !t) return null;
    return this.findById(t.id);
  }

  public async create(dto: CreateTenantDTO): Promise<TenantWithSubscription> {
    const { data: tenant, error: tenantError } = await this.client
      .from("tenants")
      .insert({
        name: dto.name.trim(),
        cif: dto.cif.trim().toUpperCase(),
        slug: dto.slug.trim().toLowerCase(),
        status: "ACTIVE",
      })
      .select()
      .single();

    if (tenantError) {
      throw new Error(`Falha ao cadastrar empresa/tenant: ${tenantError.message}`);
    }

    const maxSeats = dto.maxUserSeats ?? 5;
    const days = dto.subscriptionDays ?? 365;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const { data: sub, error: subError } = await this.client
      .from("tenant_subscriptions")
      .insert({
        tenant_id: tenant.id,
        plan_tier: dto.planTier ?? "PRO",
        max_user_seats: maxSeats,
        status: "ACTIVE",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (subError) {
      throw new Error(`Falha ao gerar subscrição para o tenant: ${subError.message}`);
    }

    return {
      tenant: new Tenant({
        id: tenant.id,
        name: tenant.name,
        cif: tenant.cif,
        slug: tenant.slug,
        status: tenant.status,
        createdAt: new Date(tenant.created_at),
        updatedAt: new Date(tenant.updated_at),
      }),
      subscription: new TenantSubscription({
        id: sub.id,
        tenantId: tenant.id,
        planTier: sub.plan_tier,
        maxUserSeats: sub.max_user_seats,
        status: sub.status,
        validFrom: new Date(sub.valid_from),
        expiresAt: new Date(sub.expires_at),
        featureFlags: sub.feature_flags,
        createdAt: new Date(sub.created_at),
        updatedAt: new Date(sub.updated_at),
      }),
      activeUsersCount: 0,
    };
  }

  public async updateStatus(id: string, status: TenantStatus): Promise<void> {
    const { error } = await this.client
      .from("tenants")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw new Error(`Falha ao atualizar status do tenant: ${error.message}`);
  }

  public async updateSubscriptionSeats(tenantId: string, maxSeats: number): Promise<void> {
    if (maxSeats < 1) throw new Error("A cota de assentos deve ser no mínimo 1.");

    const { error } = await this.client
      .from("tenant_subscriptions")
      .update({
        max_user_seats: maxSeats,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId);

    if (error) throw new Error(`Falha ao alterar assentos da subscrição: ${error.message}`);
  }

  public async updateSubscriptionExpiration(tenantId: string, expiresAt: Date): Promise<void> {
    const { error } = await this.client
      .from("tenant_subscriptions")
      .update({
        expires_at: expiresAt.toISOString(),
        status: expiresAt > new Date() ? "ACTIVE" : "EXPIRED",
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId);

    if (error) throw new Error(`Falha ao alterar validade da subscrição: ${error.message}`);
  }
}
