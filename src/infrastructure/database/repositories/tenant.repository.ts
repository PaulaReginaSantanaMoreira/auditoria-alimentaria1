import { createAdminClient } from "@/infrastructure/database/supabase/supabase-admin";
import { Tenant, TenantStatus } from "@/domain/entities/tenant";
import { TenantSubscription, SubscriptionPaymentStatus, PlanTier } from "@/domain/entities/subscription";
import { SubscriptionContract } from "@/domain/entities/subscription-contract";
import {
  ITenantRepository,
  TenantWithSubscription,
  CreateTenantDTO,
  RenewContractDTO,
} from "@/domain/repositories/tenant-repository.interface";
import { SubscriptionPlanRepository } from "./subscription-plan.repository";

export interface TenantUserDetail {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  phone?: string;
  documentNumber?: string;
  role: "TENANT_ADMIN" | "AUDITOR" | "INSPECTOR" | "VIEWER";
  canViewAllTenantAudits: boolean;
  isActive: boolean;
  createdAt: string;
}

export function generateSecureTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
  let pass = "BioAudit#";
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

/**
 * Repositório relacional de empresas (Tenants) e contratos de subscrição.
 * Implementa ITenantRepository seguindo ADR-003.
 */
export class TenantRepository implements ITenantRepository {
  private get client() {
    return createAdminClient();
  }

  private resolveLatestSubscription(
    subsRaw: any,
    contractsRaw: any,
    tenantId: string,
    availablePlans: any[] = []
  ): any {
    const subs = Array.isArray(subsRaw) ? subsRaw : subsRaw ? [subsRaw] : [];
    const contracts = Array.isArray(contractsRaw) ? contractsRaw : contractsRaw ? [contractsRaw] : [];

    subs.sort(
      (a, b) =>
        new Date(b.created_at || b.expires_at || 0).getTime() -
        new Date(a.created_at || a.expires_at || 0).getTime()
    );
    // Filtrar e ordenar contratos exatamente como a regra LATERAL da governança:
    // WHERE t.id = tsc.tenant_id AND tsc.payment_status IN ('COURTESY', 'PAID')
    // ORDER BY tsc.expires_at DESC LIMIT 1
    const validContracts = contracts.filter((c) =>
      ["COURTESY", "PAID"].includes(c.payment_status)
    );
    const targetContracts =
      validContracts.length > 0
        ? validContracts
        : contracts.filter((c) => c.payment_status === "PENDING_PAYMENT").length > 0
        ? contracts.filter((c) => c.payment_status === "PENDING_PAYMENT")
        : contracts;

    targetContracts.sort((a, b) => {
      const expA = new Date(a.expires_at || 0).getTime();
      const expB = new Date(b.expires_at || 0).getTime();
      if (expB !== expA) return expB - expA;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    const latestSub = subs[0];
    const latestContract = targetContracts[0];

    if (!latestSub && !latestContract) {
      return null;
    }

    const resolvePlanName = (contract?: any, sub?: any): string => {
      // COALESCE(tsc.plan_name, sp.name)
      if (contract?.plan_name && !contract.plan_name.includes("Alta oficial de tenant e contrato inicial")) {
        return contract.plan_name;
      }
      if (contract?.subscription_plans?.name) {
        return contract.subscription_plans.name;
      }
      const planId = contract?.plan_id || sub?.plan_id;
      if (planId) {
        const found = availablePlans.find((p) => p.id === planId);
        if (found) return found.name;
      }
      const planCode = contract?.plan_code || sub?.plan_code;
      if (planCode) {
        const found = availablePlans.find((p) => p.code === planCode);
        if (found) return found.name;
      }
      if (sub?.plan_name && !sub.plan_name.includes("Alta oficial de tenant e contrato inicial")) {
        return sub.plan_name;
      }
      if (contract?.seats !== undefined && contract?.days_added !== undefined) {
        const found = availablePlans.find(
          (p) => p.maxUserSeats === contract.seats && p.durationDays === contract.days_added
        );
        if (found) return found.name;
      }
      return contract?.plan_name || sub?.plan_name || "Plano Contratado";
    };

    if (!latestSub && latestContract) {
      const planName = resolvePlanName(latestContract, null);

      const subFromContract = {
        id: latestContract.subscription_id || latestContract.id,
        tenant_id: tenantId,
        plan_id: latestContract.plan_id || null,
        plan_name: planName,
        plan_code: latestContract.plan_code || "TRIAL",
        max_user_seats: latestContract.seats || 1,
        status: new Date(latestContract.expires_at) > new Date() ? "ACTIVE" : "EXPIRED",
        payment_status: latestContract.payment_status || "PAID",
        invoice_ref: latestContract.invoice_ref || null,
        notes: latestContract.notes || null,
        valid_from: latestContract.valid_from,
        expires_at: latestContract.expires_at,
        feature_flags: { customRubric: true, offlineSync: true, exportPdf: true, analytics: true },
        created_at: latestContract.created_at,
        updated_at: latestContract.created_at,
      };

      // Auto-cura assíncrona do registro em tenant_subscriptions
      Promise.resolve(
        this.client
          .from("tenant_subscriptions")
          .upsert(
            {
              tenant_id: tenantId,
              plan_id: subFromContract.plan_id,
              plan_name: subFromContract.plan_name,
              plan_code: subFromContract.plan_code,
              max_user_seats: subFromContract.max_user_seats,
              status: subFromContract.status,
              payment_status: subFromContract.payment_status,
              invoice_ref: subFromContract.invoice_ref,
              notes: subFromContract.notes,
              valid_from: subFromContract.valid_from,
              expires_at: subFromContract.expires_at,
            },
            { onConflict: "tenant_id" }
          )
      ).catch(() => {});

      return subFromContract;
    }

    if (latestSub && !latestContract) {
      return latestSub;
    }

    // Ambos existem: a regra de negócio da governança é exibir a última contratada vigente
    const subDate = new Date(latestSub.updated_at || latestSub.created_at || 0).getTime();
    const contractDate = new Date(latestContract.created_at || 0).getTime();

    if (
      contractDate >= subDate ||
      !latestSub.expires_at ||
      new Date(latestContract.expires_at).getTime() > new Date(latestSub.expires_at || 0).getTime()
    ) {
      const planName = resolvePlanName(latestContract, latestSub);

      return {
        id: latestSub.id || latestContract.subscription_id || latestContract.id,
        tenant_id: tenantId,
        plan_id: latestContract.plan_id || latestSub.plan_id || null,
        plan_name: planName,
        plan_code: latestContract.plan_code || latestSub.plan_code,
        max_user_seats: latestContract.seats ?? latestSub.max_user_seats,
        status: new Date(latestContract.expires_at) > new Date() ? "ACTIVE" : "EXPIRED",
        payment_status: latestContract.payment_status || latestSub.payment_status,
        invoice_ref: latestContract.invoice_ref || latestSub.invoice_ref,
        notes: latestContract.notes || latestSub.notes,
        valid_from: latestContract.valid_from || latestSub.valid_from,
        expires_at: latestContract.expires_at || latestSub.expires_at,
        feature_flags: latestSub.feature_flags || { customRubric: true, offlineSync: true, exportPdf: true, analytics: true },
        created_at: latestSub.created_at || latestContract.created_at,
        updated_at: latestContract.created_at || latestSub.updated_at,
      };
    }

    return latestSub;
  }

  public async findAll(): Promise<TenantWithSubscription[]> {
    let tenants: any[] = [];
    const { data: tenantsData, error: tenantsError } = await this.client
      .from("tenants")
      .select(`
        *,
        tenant_subscriptions (*),
        tenant_subscription_contracts (
          *,
          subscription_plans (*)
        ),
        tenant_users (
          id,
          is_active
        )
      `)
      .order("created_at", { ascending: false });

    if (tenantsError) {
      const { data: fbTenants, error: fbError } = await this.client
        .from("tenants")
        .select(`
          *,
          tenant_subscriptions (*),
          tenant_subscription_contracts (*),
          tenant_users (
            id,
            is_active
          )
        `)
        .order("created_at", { ascending: false });

      if (fbError) {
        throw new Error(`Erro ao buscar tenants: ${fbError.message}`);
      }

      tenants = fbTenants || [];

      const tenantIds = tenants.map((t: any) => t.id);
      if (tenantIds.length > 0) {
        const { data: contractsData } = await this.client
          .from("tenant_subscription_contracts")
          .select("*, subscription_plans (*)")
          .in("tenant_id", tenantIds)
          .order("expires_at", { ascending: false });

        if (contractsData) {
          tenants.forEach((t: any) => {
            t.tenant_subscription_contracts = contractsData.filter((c: any) => c.tenant_id === t.id);
          });
        }
      }
    } else {
      tenants = tenantsData || [];
    }

    if (tenantsError) {
      const { data: fbTenants, error: fbError } = await this.client
        .from("tenants")
        .select(`
          *,
          tenant_subscriptions (*),
          tenant_users (
            id,
            is_active
          )
        `)
        .order("created_at", { ascending: false });

      if (fbError) {
        throw new Error(`Erro ao buscar tenants: ${fbError.message}`);
      }

      tenants = fbTenants || [];

      const tenantIds = tenants.map((t: any) => t.id);
      if (tenantIds.length > 0) {
        const { data: contractsData } = await this.client
          .from("tenant_subscription_contracts")
          .select("*")
          .in("tenant_id", tenantIds)
          .order("created_at", { ascending: false });

        if (contractsData) {
          tenants.forEach((t: any) => {
            t.tenant_subscription_contracts = contractsData.filter((c: any) => c.tenant_id === t.id);
          });
        }
      }
    } else {
      tenants = tenantsData || [];
    }

    let allPlans: any[] = [];
    try {
      const planRepo = new SubscriptionPlanRepository(this.client);
      allPlans = await planRepo.findAll();
    } catch {}

    return (tenants || []).map((t: any) => {
      const rawSub = this.resolveLatestSubscription(
        t.tenant_subscriptions,
        t.tenant_subscription_contracts,
        t.id,
        allPlans
      );

      const subEntity = rawSub
        ? new TenantSubscription({
            id: rawSub.id,
            tenantId: t.id,
            planId: rawSub.plan_id,
            planName: rawSub.plan_name || rawSub.plan_code || "Plano Contratado",
            planCode: rawSub.plan_code || "TRIAL",
            maxUserSeats: rawSub.max_user_seats,
            status: rawSub.status,
            paymentStatus: (rawSub.payment_status as SubscriptionPaymentStatus) || "PAID",
            invoiceRef: rawSub.invoice_ref,
            notes: rawSub.notes,
            validFrom: new Date(rawSub.valid_from),
            expiresAt: new Date(rawSub.expires_at),
            featureFlags: rawSub.feature_flags,
            createdAt: new Date(rawSub.created_at),
            updatedAt: new Date(rawSub.updated_at),
          })
        : null;

      const activeUsersCount = (t.tenant_users || []).filter((u: any) => u.is_active).length;

      return {
        tenant: new Tenant({
          id: t.id,
          name: t.name,
          cif: t.cif,
          slug: t.slug,
          status: t.status as TenantStatus,
          address: t.address,
          phone: t.phone,
          adminEmail: t.admin_email,
          adminName: t.admin_name,
          createdAt: new Date(t.created_at),
          updatedAt: new Date(t.updated_at),
        }),
        subscription: subEntity,
        activeUsersCount,
      };
    });
  }

  public async findById(id: string): Promise<TenantWithSubscription | null> {
    let t: any = null;
    const { data, error } = await this.client
      .from("tenants")
      .select(`
        *,
        tenant_subscriptions (*),
        tenant_subscription_contracts (
          *,
          subscription_plans (*)
        ),
        tenant_users (
          id,
          is_active
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      const { data: fbData, error: fbError } = await this.client
        .from("tenants")
        .select(`
          *,
          tenant_subscriptions (*),
          tenant_subscription_contracts (*),
          tenant_users (
            id,
            is_active
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (fbError || !fbData) return null;
      t = fbData;

      const { data: contractsData } = await this.client
        .from("tenant_subscription_contracts")
        .select("*, subscription_plans (*)")
        .eq("tenant_id", id)
        .order("expires_at", { ascending: false });

      t.tenant_subscription_contracts = contractsData || [];
    } else {
      t = data;
    }

    if (!t) return null;

    let allPlans: any[] = [];
    try {
      const planRepo = new SubscriptionPlanRepository(this.client);
      allPlans = await planRepo.findAll();
    } catch {}

    const rawSub = this.resolveLatestSubscription(
      t.tenant_subscriptions,
      t.tenant_subscription_contracts,
      t.id,
      allPlans
    );

    const subEntity = rawSub
      ? new TenantSubscription({
          id: rawSub.id,
          tenantId: (t as any).id,
          planId: rawSub.plan_id,
          planName: rawSub.plan_name || rawSub.plan_code || "Plano Contratado",
          planCode: rawSub.plan_code || "TRIAL",
          maxUserSeats: rawSub.max_user_seats,
          status: rawSub.status,
          paymentStatus: (rawSub.payment_status as SubscriptionPaymentStatus) || "PAID",
          invoiceRef: rawSub.invoice_ref,
          notes: rawSub.notes,
          validFrom: new Date(rawSub.valid_from),
          expiresAt: new Date(rawSub.expires_at),
          featureFlags: rawSub.feature_flags,
          createdAt: new Date(rawSub.created_at),
          updatedAt: new Date(rawSub.updated_at),
        })
      : null;

    const activeUsersCount = ((t as any).tenant_users || []).filter((u: any) => u.is_active).length;

    return {
      tenant: new Tenant({
        id: (t as any).id,
        name: (t as any).name,
        cif: (t as any).cif,
        slug: (t as any).slug,
        status: (t as any).status as TenantStatus,
        address: (t as any).address,
        phone: (t as any).phone,
        adminEmail: (t as any).admin_email,
        adminName: (t as any).admin_name,
        createdAt: new Date((t as any).created_at),
        updatedAt: new Date((t as any).updated_at),
      }),
      subscription: subEntity,
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

  public async create(dto: CreateTenantDTO): Promise<TenantWithSubscription & { adminTempPassword?: string }> {
    const insertPayload: any = {
      name: dto.name.trim(),
      cif: dto.cif.trim().toUpperCase(),
      slug: dto.slug.trim().toLowerCase(),
      status: "ACTIVE",
    };

    if (dto.address) insertPayload.address = dto.address.trim();
    if (dto.phone) insertPayload.phone = dto.phone.trim();
    if (dto.adminEmail) insertPayload.admin_email = dto.adminEmail.trim().toLowerCase();
    if (dto.adminName) insertPayload.admin_name = dto.adminName.trim();

    let tenant: any;
    try {
      const { data, error } = await this.client
        .from("tenants")
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      tenant = data;
    } catch (err: any) {
      if (err.message?.includes("column") || err.message?.includes("schema")) {
        const { data: fallbackData, error: fallbackError } = await this.client
          .from("tenants")
          .insert({
            name: dto.name.trim(),
            cif: dto.cif.trim().toUpperCase(),
            slug: dto.slug.trim().toLowerCase(),
            status: "ACTIVE",
          })
          .select()
          .single();

        if (fallbackError) {
          throw new Error(`Falha ao cadastrar empresa/tenant: ${fallbackError.message}`);
        }
        tenant = fallbackData;
      } else {
        throw new Error(`Falha ao cadastrar empresa/tenant: ${err.message}`);
      }
    }

    let maxSeats = dto.maxUserSeats ?? 1;
    let days = dto.subscriptionDays ?? 7;
    let planId: string | null = dto.planId || null;
    let planName = dto.planName || "Plano Piloto";
    let planCode = dto.planCode || "TRIAL_7D";
    let initialPaymentStatus: SubscriptionPaymentStatus = dto.paymentStatus || "COURTESY";

    if (dto.planId) {
      try {
        const planRepo = new SubscriptionPlanRepository(this.client);
        const plan = await planRepo.findById(dto.planId);
        if (plan) {
          planId = plan.id;
          planName = plan.name;
          planCode = plan.code;
          maxSeats = plan.maxUserSeats;
          days = plan.durationDays;
          if (plan.price === 0) {
            initialPaymentStatus = "COURTESY";
          }
        }
      } catch {
        // Fallback
      }
    } else if (!dto.subscriptionDays && !dto.maxUserSeats) {
      try {
        const planRepo = new SubscriptionPlanRepository(this.client);
        const defaultPlan = await planRepo.findDefaultPlan();
        if (defaultPlan) {
          planId = defaultPlan.id;
          planName = defaultPlan.name;
          planCode = defaultPlan.code;
          maxSeats = defaultPlan.maxUserSeats;
          days = defaultPlan.durationDays;
          if (defaultPlan.price === 0) {
            initialPaymentStatus = "COURTESY";
          }
        }
      } catch {
        // Fallback
      }
    }

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    let sub: any;
    const { data: subData, error: subError } = await this.client
      .from("tenant_subscriptions")
      .insert({
        tenant_id: tenant.id,
        plan_id: planId,
        plan_name: planName,
        plan_code: planCode,
        max_user_seats: maxSeats,
        status: "ACTIVE",
        payment_status: initialPaymentStatus,
        invoice_ref: dto.invoiceRef || null,
        notes: dto.notes || `Plan contratado: ${planName}`,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (subError) {
      // Fallback sem plan_id se colunas foram omitidas em runtime
      const { data: fbSub, error: fbErr } = await this.client
        .from("tenant_subscriptions")
        .insert({
          tenant_id: tenant.id,
          max_user_seats: maxSeats,
          status: "ACTIVE",
          payment_status: initialPaymentStatus,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();
      sub = fbSub;
    } else {
      sub = subData;
    }

    // Registra entrada de criação no histórico de contratos
    try {
      await this.client.from("tenant_subscription_contracts").insert({
        tenant_id: tenant.id,
        subscription_id: sub?.id,
        plan_id: planId,
        plan_name: planName,
        plan_code: planCode,
        action_type: "CREATION",
        valid_from: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        days_added: days,
        seats: maxSeats,
        payment_status: initialPaymentStatus,
        invoice_ref: dto.invoiceRef || null,
        notes: dto.notes || `Alta oficial de empresa com plano: ${planName}`,
        created_by: "Administrador de la Plataforma",
      });
    } catch {
      // Tabela de contratos pode não estar criada em mock
    }

    let adminTempPassword: string | undefined = undefined;

    if (dto.adminEmail) {
      try {
        const result = await this.createTenantUser({
          tenantId: tenant.id,
          email: dto.adminEmail,
          fullName: dto.adminName || dto.name,
          phone: dto.adminPhone || dto.phone,
          documentNumber: dto.adminDocumentNumber,
          role: "TENANT_ADMIN",
          canViewAllTenantAudits: true,
          temporaryPassword: dto.temporaryPassword,
        });
        adminTempPassword = result.temporaryPassword;
      } catch (authErr: any) {
        console.warn("Aviso ao criar usuário administrador do tenant:", authErr.message);
      }
    }

    const subEntity = sub
      ? new TenantSubscription({
          id: sub.id,
          tenantId: tenant.id,
          planId: sub.plan_id || planId,
          planName: sub.plan_name || planName,
          planCode: sub.plan_code || planCode,
          maxUserSeats: sub.max_user_seats ?? maxSeats,
          status: sub.status || "ACTIVE",
          paymentStatus: (sub.payment_status as SubscriptionPaymentStatus) || initialPaymentStatus,
          invoiceRef: sub.invoice_ref || dto.invoiceRef,
          notes: sub.notes || dto.notes,
          validFrom: sub.valid_from ? new Date(sub.valid_from) : new Date(),
          expiresAt: sub.expires_at ? new Date(sub.expires_at) : expiresAt,
          featureFlags: sub.feature_flags || { customRubric: true, offlineSync: true, exportPdf: true, analytics: true },
          createdAt: new Date(sub.created_at || Date.now()),
          updatedAt: new Date(sub.updated_at || Date.now()),
        })
      : null;

    return {
      tenant: new Tenant({
        id: tenant.id,
        name: tenant.name,
        cif: tenant.cif,
        slug: tenant.slug,
        status: tenant.status,
        address: tenant.address || dto.address,
        phone: tenant.phone || dto.phone,
        adminEmail: tenant.admin_email || dto.adminEmail,
        adminName: tenant.admin_name || dto.adminName,
        createdAt: new Date(tenant.created_at || Date.now()),
        updatedAt: new Date(tenant.updated_at || Date.now()),
      }),
      subscription: subEntity,
      activeUsersCount: dto.adminEmail ? 1 : 0,
      adminTempPassword,
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

  public async updatePlanTier(tenantId: string, planTier: string): Promise<void> {
    return this.updatePlan(tenantId, { planCode: planTier, planName: planTier });
  }

  public async updatePlan(
    tenantId: string,
    plan: { planId?: string | null; planName?: string; planCode?: string; maxUserSeats?: number }
  ): Promise<void> {
    const payload: any = { updated_at: new Date().toISOString() };
    if (plan.planId !== undefined) payload.plan_id = plan.planId;
    if (plan.planName !== undefined) payload.plan_name = plan.planName;
    if (plan.planCode !== undefined) payload.plan_code = plan.planCode;
    if (plan.maxUserSeats !== undefined) payload.max_user_seats = plan.maxUserSeats;

    const { error } = await this.client
      .from("tenant_subscriptions")
      .update(payload)
      .eq("tenant_id", tenantId);

    if (error) {
      throw new Error(`Falha ao atualizar plano da subscrição: ${error.message}`);
    }
  }

  public async updateTenantDetails(
    tenantId: string,
    details: { name?: string; address?: string; phone?: string; adminEmail?: string; adminName?: string }
  ): Promise<void> {
    const payload: any = { updated_at: new Date().toISOString() };
    if (details.name !== undefined) {
      if (!details.name.trim()) throw new Error("El nombre de la empresa no puede estar vacío");
      payload.name = details.name.trim();
    }
    if (details.address !== undefined) payload.address = details.address.trim();
    if (details.phone !== undefined) payload.phone = details.phone.trim();
    if (details.adminEmail !== undefined) payload.admin_email = details.adminEmail.trim().toLowerCase();
    if (details.adminName !== undefined) payload.admin_name = details.adminName.trim();

    const { error } = await this.client
      .from("tenants")
      .update(payload)
      .eq("id", tenantId);

    if (error) {
      throw new Error(`Falha ao atualizar dados da empresa: ${error.message}`);
    }
  }

  public async updateContactInfo(
    tenantId: string,
    info: { address?: string; phone?: string; adminEmail?: string; adminName?: string }
  ): Promise<void> {
    return this.updateTenantDetails(tenantId, info);
  }

  public async delete(id: string): Promise<void> {
    const { error } = await this.client.from("tenants").delete().eq("id", id);
    if (error) {
      throw new Error(`Falha ao remover empresa/tenant: ${error.message}`);
    }
  }

  public async getSubscriptionContracts(tenantId: string): Promise<SubscriptionContract[]> {
    const { data: records, error } = await this.client
      .from("tenant_subscription_contracts")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Aviso ao buscar histórico de contratos:", error.message);
      return [];
    }

    return (records || []).map(
      (r: any) =>
        new SubscriptionContract({
          id: r.id,
          tenantId: r.tenant_id,
          subscriptionId: r.subscription_id,
          actionType: r.action_type,
          validFrom: new Date(r.valid_from),
          expiresAt: new Date(r.expires_at),
          daysAdded: r.days_added,
          seats: r.seats,
          paymentStatus: r.payment_status as SubscriptionPaymentStatus,
          amount: r.amount ? Number(r.amount) : undefined,
          invoiceRef: r.invoice_ref,
          notes: r.notes,
          createdBy: r.created_by,
          createdAt: new Date(r.created_at),
        })
    );
  }

  public async renewContract(dto: RenewContractDTO): Promise<{
    subscription: TenantSubscription;
    contract: SubscriptionContract;
  }> {
    const existing = await this.findById(dto.tenantId);
    if (!existing) {
      throw new Error("Tenant não encontrado para renovação.");
    }

    const currentSub = existing.subscription || new TenantSubscription({
      id: crypto.randomUUID(),
      tenantId: dto.tenantId,
      planName: dto.planName || "Plano Contratado",
      planCode: dto.planCode || "DEFAULT",
      maxUserSeats: dto.newSeats || 1,
      status: "ACTIVE",
      paymentStatus: dto.paymentStatus,
      validFrom: new Date(),
      expiresAt: new Date(),
      featureFlags: { customRubric: true, offlineSync: true, exportPdf: true, analytics: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const baseDate = currentSub.isExpired() ? new Date() : currentSub.expiresAt;

    let targetExpiration: Date;
    let daysCalculated = 0;

    if (dto.newExpiresAt) {
      targetExpiration = dto.newExpiresAt;
      const diffMs = targetExpiration.getTime() - baseDate.getTime();
      daysCalculated = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    } else {
      daysCalculated = dto.daysToAdd || 365;
      targetExpiration = new Date(baseDate.getTime() + daysCalculated * 24 * 60 * 60 * 1000);
    }

    const seatsToSet = dto.newSeats || currentSub.maxUserSeats;

    // 1. Atualizar a tabela de subscrições ativas
    const subUpdatePayload: any = {
      expires_at: targetExpiration.toISOString(),
      max_user_seats: seatsToSet,
      status: targetExpiration > new Date() ? "ACTIVE" : "EXPIRED",
      payment_status: dto.paymentStatus,
      updated_at: new Date().toISOString(),
    };
    if (dto.planId !== undefined) subUpdatePayload.plan_id = dto.planId;
    if (dto.planName !== undefined) subUpdatePayload.plan_name = dto.planName;
    if (dto.planCode !== undefined) subUpdatePayload.plan_code = dto.planCode;
    if (dto.invoiceRef !== undefined) subUpdatePayload.invoice_ref = dto.invoiceRef.trim();
    if (dto.notes !== undefined) subUpdatePayload.notes = dto.notes.trim();

    const { error: subUpdateError } = await this.client
      .from("tenant_subscriptions")
      .upsert(
        {
          tenant_id: dto.tenantId,
          ...subUpdatePayload,
        },
        { onConflict: "tenant_id" }
      );

    if (subUpdateError) {
      throw new Error(`Falha ao atualizar subscrição ativa: ${subUpdateError.message}`);
    }

    // 2. Inserir registro no histórico imutável de contratos
    let contractId = crypto.randomUUID();
    try {
      const { data: contractRecord } = await this.client
        .from("tenant_subscription_contracts")
        .insert({
          tenant_id: dto.tenantId,
          subscription_id: currentSub.id,
          plan_id: dto.planId || currentSub.planId || null,
          plan_name: dto.planName || currentSub.planName || null,
          plan_code: dto.planCode || currentSub.planCode || null,
          action_type: dto.actionType || "RENEWAL",
          valid_from: baseDate.toISOString(),
          expires_at: targetExpiration.toISOString(),
          days_added: daysCalculated,
          seats: seatsToSet,
          payment_status: dto.paymentStatus,
          amount: dto.amount || null,
          invoice_ref: dto.invoiceRef || null,
          notes: dto.notes || null,
          created_by: dto.createdBy || "Administrador de la Plataforma",
        })
        .select()
        .single();

      if (contractRecord?.id) {
        contractId = contractRecord.id;
      }
    } catch (contractErr: any) {
      console.warn("Aviso ao registrar histórico de contrato:", contractErr.message);
    }

    const contractEntity = new SubscriptionContract({
      id: contractId,
      tenantId: dto.tenantId,
      subscriptionId: currentSub.id,
      planId: dto.planId || currentSub.planId,
      planName: dto.planName || currentSub.planName,
      planCode: dto.planCode || currentSub.planCode,
      actionType: dto.actionType || "RENEWAL",
      validFrom: baseDate,
      expiresAt: targetExpiration,
      daysAdded: daysCalculated,
      seats: seatsToSet,
      paymentStatus: dto.paymentStatus,
      amount: dto.amount,
      invoiceRef: dto.invoiceRef,
      notes: dto.notes,
      createdBy: dto.createdBy || "Administrador de la Plataforma",
      createdAt: new Date(),
    });

    currentSub.extendValidity(targetExpiration, dto.paymentStatus);
    currentSub.updateSeats(seatsToSet);
    currentSub.updateBilling({
      paymentStatus: dto.paymentStatus,
      invoiceRef: dto.invoiceRef,
      notes: dto.notes,
    });

    return {
      subscription: currentSub,
      contract: contractEntity,
    };
  }

  public async getTenantUsers(tenantId: string): Promise<TenantUserDetail[]> {
    const { data: records, error } = await this.client
      .from("tenant_users")
      .select(`
        id,
        user_id,
        role,
        can_view_all_tenant_audits,
        is_active,
        created_at
      `)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar usuários do tenant: ${error.message}`);
    }

    if (!records || records.length === 0) return [];

    const userIds = records.map((r: any) => r.user_id);
    const authUsersMap: Record<string, { email: string; fullName: string; phone?: string; documentNumber?: string }> = {};

    try {
      const { data: authData } = await this.client.auth.admin.listUsers({ perPage: 1000 });
      if (authData?.users) {
        for (const u of authData.users) {
          if (userIds.includes(u.id)) {
            authUsersMap[u.id] = {
              email: u.email || "",
              fullName: u.user_metadata?.full_name || u.email?.split("@")[0] || "Inspector Oficial",
              phone: u.user_metadata?.phone || u.phone || "",
              documentNumber:
                u.user_metadata?.document_number ||
                u.user_metadata?.cif ||
                u.user_metadata?.nif ||
                "",
            };
          }
        }
      }
    } catch {
      // ignore
    }

    return records.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      email: authUsersMap[r.user_id]?.email || `usuario-${r.id.substring(0, 6)}@tenant.com`,
      fullName: authUsersMap[r.user_id]?.fullName || "Inspector Oficial",
      phone: authUsersMap[r.user_id]?.phone,
      documentNumber: authUsersMap[r.user_id]?.documentNumber,
      role: r.role,
      canViewAllTenantAudits: r.can_view_all_tenant_audits,
      isActive: r.is_active,
      createdAt: r.created_at,
    }));
  }

  public async createTenantUser(params: {
    tenantId: string;
    email: string;
    fullName: string;
    phone?: string;
    documentNumber?: string;
    role: "TENANT_ADMIN" | "AUDITOR" | "INSPECTOR" | "VIEWER";
    temporaryPassword?: string;
    canViewAllTenantAudits?: boolean;
  }): Promise<{ user: TenantUserDetail; temporaryPassword: string }> {
    if (String(params.role).toUpperCase().includes("SUPERADMIN")) {
      throw new Error("VIOLAÇÃO DE SEGURANÇA: Nenhum usuário vinculado a tenant pode possuir perfil de SuperAdmin.");
    }

    const tempPassword = params.temporaryPassword || generateSecureTempPassword();

    let authUserId: string;
    try {
      const { data: createdAuth, error: createError } = await this.client.auth.admin.createUser({
        email: params.email.trim().toLowerCase(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: params.fullName.trim(),
          phone: params.phone?.trim() || "",
          document_number: params.documentNumber?.trim() || "",
          role: params.role,
          tenant_id: params.tenantId,
        },
      });

      if (createError) {
        if (createError.message.includes("already registered") || createError.message.includes("unique")) {
          const { data: existingList } = await this.client.auth.admin.listUsers();
          const found = existingList?.users.find(
            (u) => u.email?.toLowerCase() === params.email.trim().toLowerCase()
          );
          if (found) {
            authUserId = found.id;
            // Atualizar metadados do usuário existente com telefone e documento fornecidos
            await this.client.auth.admin.updateUserById(authUserId, {
              user_metadata: {
                ...(found.user_metadata || {}),
                full_name: params.fullName.trim(),
                phone: params.phone?.trim() || found.user_metadata?.phone || "",
                document_number:
                  params.documentNumber?.trim() || found.user_metadata?.document_number || "",
              },
            });
          } else {
            throw createError;
          }
        } else {
          throw createError;
        }
      } else {
        authUserId = createdAuth.user.id;
      }
    } catch (err: any) {
      throw new Error(`Falha ao registrar credencial de autenticação: ${err.message}`);
    }

    const effectiveCanViewAll =
      params.canViewAllTenantAudits !== undefined
        ? Boolean(params.canViewAllTenantAudits)
        : params.role === "TENANT_ADMIN";

    const { data: tenantUserRecord, error: linkError } = await this.client
      .from("tenant_users")
      .insert({
        tenant_id: params.tenantId,
        user_id: authUserId,
        role: params.role,
        can_view_all_tenant_audits: effectiveCanViewAll,
        is_active: true,
      })
      .select()
      .single();

    if (linkError) {
      throw new Error(`Falha ao vincular usuário ao tenant: ${linkError.message}`);
    }

    return {
      user: {
        id: tenantUserRecord.id,
        userId: authUserId,
        email: params.email.trim().toLowerCase(),
        fullName: params.fullName.trim(),
        phone: params.phone?.trim() || undefined,
        documentNumber: params.documentNumber?.trim() || undefined,
        role: params.role,
        canViewAllTenantAudits: tenantUserRecord.can_view_all_tenant_audits,
        isActive: tenantUserRecord.is_active,
        createdAt: tenantUserRecord.created_at,
      },
      temporaryPassword: tempPassword,
    };
  }

  public async resetUserPassword(
    tenantId: string,
    userId: string,
    newPassword?: string
  ): Promise<{ temporaryPassword: string }> {
    const { data: member, error: memberError } = await this.client
      .from("tenant_users")
      .select("id, role")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError || !member) {
      throw new Error("Usuário não encontrado ou não pertence a este tenant.");
    }

    const tempPassword = newPassword || generateSecureTempPassword();

    const { error: updateError } = await this.client.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });

    if (updateError) {
      throw new Error(`Falha ao resetar senha no servidor de autenticação: ${updateError.message}`);
    }

    return { temporaryPassword: tempPassword };
  }

  public async updateTenantUser(params: {
    tenantId: string;
    userId: string;
    fullName?: string;
    phone?: string;
    documentNumber?: string;
    role?: "TENANT_ADMIN" | "AUDITOR" | "INSPECTOR" | "VIEWER";
    isActive?: boolean;
    canViewAllTenantAudits?: boolean;
  }): Promise<TenantUserDetail> {
    if (params.role && String(params.role).toUpperCase().includes("SUPERADMIN")) {
      throw new Error("VIOLAÇÃO DE SEGURANÇA: Nenhum usuário vinculado a tenant pode possuir perfil de SuperAdmin.");
    }

    const { data: member, error: memberError } = await this.client
      .from("tenant_users")
      .select("id, role, is_active, can_view_all_tenant_audits, created_at")
      .eq("tenant_id", params.tenantId)
      .eq("user_id", params.userId)
      .maybeSingle();

    if (memberError || !member) {
      throw new Error("Usuário não encontrado no tenant.");
    }

    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (params.role !== undefined) {
      updatePayload.role = params.role;
    }
    if (params.canViewAllTenantAudits !== undefined) {
      updatePayload.can_view_all_tenant_audits = Boolean(params.canViewAllTenantAudits);
    } else if (params.role === "TENANT_ADMIN") {
      updatePayload.can_view_all_tenant_audits = true;
    }
    if (params.isActive !== undefined) {
      updatePayload.is_active = params.isActive;
    }

    const { data: updatedMember, error: updateMemberError } = await this.client
      .from("tenant_users")
      .update(updatePayload)
      .eq("id", member.id)
      .select()
      .single();

    if (updateMemberError) {
      throw new Error(`Falha ao atualizar dados do membro: ${updateMemberError.message}`);
    }

    // Obter metadados auth atuais para mesclagem sem perda de dados
    let authUserMeta: any = {};
    let email = "";
    try {
      const { data: authUser } = await this.client.auth.admin.getUserById(params.userId);
      if (authUser?.user) {
        authUserMeta = authUser.user.user_metadata || {};
        email = authUser.user.email || "";
      }
    } catch {
      // ignore
    }

    const authUpdatePayload: any = {
      user_metadata: {
        ...authUserMeta,
        full_name: params.fullName !== undefined ? params.fullName.trim() : (authUserMeta.full_name || ""),
        phone: params.phone !== undefined ? params.phone.trim() : (authUserMeta.phone || ""),
        document_number:
          params.documentNumber !== undefined ? params.documentNumber.trim() : (authUserMeta.document_number || ""),
        role: params.role || authUserMeta.role || member.role,
        tenant_id: params.tenantId,
      },
    };

    let fullName = params.fullName || authUserMeta.full_name || "Inspector";
    let phone = params.phone !== undefined ? params.phone.trim() : authUserMeta.phone;
    let documentNumber = params.documentNumber !== undefined ? params.documentNumber.trim() : authUserMeta.document_number;

    try {
      const { data: authUser, error: authError } = await this.client.auth.admin.updateUserById(
        params.userId,
        authUpdatePayload
      );
      if (!authError && authUser?.user) {
        email = authUser.user.email || email;
        fullName = authUser.user.user_metadata?.full_name || fullName;
        phone = authUser.user.user_metadata?.phone || phone;
        documentNumber = authUser.user.user_metadata?.document_number || documentNumber;
      }
    } catch (authErr: any) {
      console.warn("Aviso ao atualizar metadados de autenticação:", authErr.message);
    }

    return {
      id: updatedMember.id,
      userId: params.userId,
      email,
      fullName,
      phone,
      documentNumber,
      role: updatedMember.role,
      canViewAllTenantAudits: updatedMember.can_view_all_tenant_audits,
      isActive: updatedMember.is_active,
      createdAt: updatedMember.created_at,
    };
  }
}

// Alias de compatibilidade retroativa
export const SupabaseTenantRepository = TenantRepository;
