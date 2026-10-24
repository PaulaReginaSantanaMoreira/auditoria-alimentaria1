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
    // Filtrar e ordenar contratos válidos que computam vigência ativa:
    // Apenas contratos pagos, bonificados ou com reembolso parcial ativo computam vigência!
    const validContracts = contracts.filter((c) =>
      ["COURTESY", "PAID", "PARTIALLY_REFUNDED"].includes(c.payment_status)
    );
    const pendingContracts = contracts.filter((c) => c.payment_status === "PENDING_PAYMENT");

    const targetContracts = validContracts.length > 0 ? validContracts : pendingContracts;

    targetContracts.sort((a, b) => {
      const expA = new Date(a.expires_at || 0).getTime();
      const expB = new Date(b.expires_at || 0).getTime();
      if (expB !== expA) return expB - expA;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    const latestSub = subs[0];
    const latestContract = targetContracts.length > 0 ? targetContracts[0] : null;

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
      // Nenhum contrato válido ou pendente: a vigência é determinada por latestSub.
      // Se latestSub não tem contratos válidos ou está no passado, marcar como expirado.
      const isExpired = !latestSub.expires_at || new Date(latestSub.expires_at) <= new Date();
      return {
        ...latestSub,
        status: isExpired ? "EXPIRED" : latestSub.status,
      };
    }

    // Ambos existem e latestContract é um contrato válido ou pendente
    const subDate = new Date(latestSub.updated_at || latestSub.created_at || 0).getTime();
    const contractDate = new Date(latestContract.created_at || 0).getTime();

    // Se latestSub foi recalculado recentemente e possui data válida, respeitá-la
    const planName = resolvePlanName(latestContract, latestSub);
    const chosenExpiresAt =
      subDate > contractDate && latestSub.expires_at
        ? latestSub.expires_at
        : latestContract.expires_at;

    const isExpired = !chosenExpiresAt || new Date(chosenExpiresAt) <= new Date();

    return {
      id: latestSub.id || latestContract.subscription_id || latestContract.id,
      tenant_id: tenantId,
      plan_id: latestContract.plan_id || latestSub.plan_id || null,
      plan_name: planName,
      plan_code: latestContract.plan_code || latestSub.plan_code,
      max_user_seats: latestContract.seats ?? latestSub.max_user_seats,
      status: isExpired ? "EXPIRED" : "ACTIVE",
      payment_status: latestContract.payment_status || latestSub.payment_status,
      invoice_ref: latestContract.invoice_ref || latestSub.invoice_ref,
      notes: latestContract.notes || latestSub.notes,
      valid_from: latestContract.valid_from || latestSub.valid_from,
      expires_at: chosenExpiresAt,
      feature_flags: latestSub.feature_flags || { customRubric: true, offlineSync: true, exportPdf: true, analytics: true },
      created_at: latestSub.created_at || latestContract.created_at,
      updated_at: latestSub.updated_at || latestContract.created_at,
    };
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
          planId: r.plan_id,
          planName: r.plan_name,
          planCode: r.plan_code,
          actionType: r.action_type,
          validFrom: new Date(r.valid_from),
          expiresAt: new Date(r.expires_at),
          paymentDueDate: r.payment_due_date ? new Date(r.payment_due_date) : undefined,
          daysAdded: r.days_added,
          seats: r.seats,
          paymentStatus: r.payment_status as SubscriptionPaymentStatus,
          amount: r.amount ? Number(r.amount) : undefined,
          refundAmount: r.refund_amount ? Number(r.refund_amount) : undefined,
          refundType: r.refund_type,
          refundReason: r.refund_reason,
          refundedAt: r.refunded_at ? new Date(r.refunded_at) : undefined,
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
    const isPending = dto.paymentStatus === "PENDING_PAYMENT";
    const paymentDueDate = dto.paymentDueDate || (isPending ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) : undefined);

    // 1. Atualizar a tabela de subscrições ativas
    // REGRA DE GOVERNANÇA: Se a subscrição atual já estiver vencida e a renovação for PENDING_PAYMENT,
    // o usuário NÃO tem acesso liberado (permanece EXPIRED) até que o pagamento seja efetivado!
    const isCurrentlyExpired = currentSub.isExpired();
    let subStatus: "ACTIVE" | "EXPIRED" = "ACTIVE";
    let subExpiresAt = targetExpiration;

    if (isPending) {
      if (isCurrentlyExpired) {
        subStatus = "EXPIRED";
        subExpiresAt = currentSub.expiresAt;
      } else {
        subStatus = "ACTIVE";
        subExpiresAt = currentSub.expiresAt; // Mantém vigência já paga até o pagamento ser confirmado
      }
    } else {
      subStatus = targetExpiration > new Date() ? "ACTIVE" : "EXPIRED";
    }

    const subUpdatePayload: any = {
      expires_at: subExpiresAt.toISOString(),
      max_user_seats: isPending && isCurrentlyExpired ? currentSub.maxUserSeats : seatsToSet,
      status: subStatus,
      payment_status: dto.paymentStatus,
      payment_due_date: paymentDueDate ? paymentDueDate.toISOString() : null,
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
          payment_due_date: paymentDueDate ? paymentDueDate.toISOString() : null,
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
      paymentDueDate,
      daysAdded: daysCalculated,
      seats: seatsToSet,
      paymentStatus: dto.paymentStatus,
      amount: dto.amount,
      invoiceRef: dto.invoiceRef,
      notes: dto.notes,
      createdBy: dto.createdBy || "Administrador de la Plataforma",
      createdAt: new Date(),
    });

    if (!isPending || !isCurrentlyExpired) {
      currentSub.extendValidity(subExpiresAt, dto.paymentStatus);
    }
    if (dto.planId) {
      currentSub.updatePlan({
        id: dto.planId,
        name: dto.planName || currentSub.planName,
        code: dto.planCode || currentSub.planCode,
        maxUserSeats: seatsToSet,
      });
    }
    currentSub.updateSeats(seatsToSet);
    currentSub.updateBilling({
      paymentStatus: dto.paymentStatus,
      invoiceRef: dto.invoiceRef,
      notes: dto.notes,
    });

    await this.recalculateTenantTimeline(dto.tenantId);

    return {
      subscription: currentSub,
      contract: contractEntity,
    };
  }

  public async confirmContractPayment(
    tenantId: string,
    contractId: string
  ): Promise<{ subscription: TenantSubscription; contract: SubscriptionContract }> {
    const { data: contractRecord, error: contractErr } = await this.client
      .from("tenant_subscription_contracts")
      .select("*")
      .eq("id", contractId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (contractErr || !contractRecord) {
      throw new Error("Contrato não encontrado para confirmação de pagamento.");
    }

    // 1. Atualizar o contrato para PAID
    const { error: updateContractErr } = await this.client
      .from("tenant_subscription_contracts")
      .update({
        payment_status: "PAID",
        payment_due_date: null,
      })
      .eq("id", contractId);

    if (updateContractErr) {
      throw new Error(`Erro ao atualizar contrato: ${updateContractErr.message}`);
    }

    // 2. Recalcular toda a cadeia sequencial da timeline
    await this.recalculateTenantTimeline(tenantId);

    const updatedTenant = await this.findById(tenantId);
    if (!updatedTenant || !updatedTenant.subscription) {
      throw new Error("Erro ao carregar dados pós-confirmação.");
    }

    const updatedContract = new SubscriptionContract({
      id: contractRecord.id,
      tenantId: contractRecord.tenant_id,
      subscriptionId: contractRecord.subscription_id,
      planId: contractRecord.plan_id,
      planName: contractRecord.plan_name,
      planCode: contractRecord.plan_code,
      actionType: contractRecord.action_type,
      validFrom: new Date(contractRecord.valid_from),
      expiresAt: updatedTenant.subscription.expiresAt,
      daysAdded: contractRecord.days_added,
      seats: contractRecord.seats,
      paymentStatus: "PAID",
      amount: contractRecord.amount ? Number(contractRecord.amount) : undefined,
      invoiceRef: contractRecord.invoice_ref,
      notes: contractRecord.notes,
      createdBy: contractRecord.created_by,
      createdAt: new Date(contractRecord.created_at),
    });

    return {
      subscription: updatedTenant.subscription,
      contract: updatedContract,
    };
  }

  public async recalculateTenantTimeline(tenantId: string): Promise<void> {
    const now = new Date();

    // 1. Buscar todos os contratos do tenant ordenados cronologicamente
    const { data: rawContracts, error: fetchErr } = await this.client
      .from("tenant_subscription_contracts")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (fetchErr) {
      console.error(`[recalculateTenantTimeline] Error fetching contracts for ${tenantId}:`, fetchErr);
      return;
    }

    const contracts = rawContracts || [];
    if (contracts.length === 0) {
      await this.client
        .from("tenant_subscriptions")
        .upsert(
          {
            tenant_id: tenantId,
            status: "EXPIRED",
            payment_status: "CANCELLED",
            notes: "Sin contratos registrados.",
            updated_at: now.toISOString(),
          },
          { onConflict: "tenant_id" }
        );
      return;
    }

    // 2. A data base inicial do encadeamento começa no primeiro contrato
    let timelineCursor = new Date(contracts[0].valid_from || contracts[0].created_at || now);
    let latestValidContract: any = null;

    // 3. Iterar sequencialmente "do ponto que modificamos para frente"
    for (const c of contracts) {
      const status = c.payment_status;

      if (status === "CANCELLED" || status === "REFUNDED") {
        // Se cancelado ou totalmente reembolsado:
        // Mantém apenas os dias utilizados (já transcorridos) registrados em days_added
        const daysUsed = Math.max(0, Number(c.days_added || 0));
        const newValidFrom = new Date(timelineCursor.getTime());
        const newExpiresAt = new Date(timelineCursor.getTime() + daysUsed * 24 * 60 * 60 * 1000);

        if (
          new Date(c.valid_from).toISOString() !== newValidFrom.toISOString() ||
          new Date(c.expires_at).toISOString() !== newExpiresAt.toISOString()
        ) {
          await this.client
            .from("tenant_subscription_contracts")
            .update({
              valid_from: newValidFrom.toISOString(),
              expires_at: newExpiresAt.toISOString(),
            })
            .eq("id", c.id);
        }

        if (daysUsed > 0) {
          timelineCursor = newExpiresAt;
        }
      } else if (status === "PAID" || status === "COURTESY" || status === "PARTIALLY_REFUNDED") {
        const daysToAdd = Math.max(0, Number(c.days_added || 0));
        const newValidFrom = new Date(timelineCursor.getTime());
        const newExpiresAt = new Date(timelineCursor.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

        if (
          new Date(c.valid_from).toISOString() !== newValidFrom.toISOString() ||
          new Date(c.expires_at).toISOString() !== newExpiresAt.toISOString()
        ) {
          await this.client
            .from("tenant_subscription_contracts")
            .update({
              valid_from: newValidFrom.toISOString(),
              expires_at: newExpiresAt.toISOString(),
            })
            .eq("id", c.id);
        }

        timelineCursor = newExpiresAt;
        latestValidContract = {
          ...c,
          valid_from: newValidFrom.toISOString(),
          expires_at: newExpiresAt.toISOString(),
        };
      } else if (status === "PENDING_PAYMENT") {
        // Oferta pendente não avança a vigência ativa do timelineCursor,
        // mas suas datas projetadas se alinham ao cursor atual
        const daysToAdd = Math.max(0, Number(c.days_added || 0));
        const newValidFrom = new Date(timelineCursor.getTime());
        const newExpiresAt = new Date(timelineCursor.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

        if (
          new Date(c.valid_from).toISOString() !== newValidFrom.toISOString() ||
          new Date(c.expires_at).toISOString() !== newExpiresAt.toISOString()
        ) {
          await this.client
            .from("tenant_subscription_contracts")
            .update({
              valid_from: newValidFrom.toISOString(),
              expires_at: newExpiresAt.toISOString(),
            })
            .eq("id", c.id);
        }
      }
    }

    // 4. Atualizar a tabela tenant_subscriptions com a data final resultante do encadeamento
    if (latestValidContract) {
      const isExpired = timelineCursor.getTime() <= now.getTime();
      const { error: upsertErr } = await this.client
        .from("tenant_subscriptions")
        .upsert(
          {
            tenant_id: tenantId,
            plan_id: latestValidContract.plan_id || null,
            plan_name: latestValidContract.plan_name || "Plano Contratado",
            plan_code: latestValidContract.plan_code || "PAID",
            max_user_seats: latestValidContract.seats || 1,
            status: isExpired ? "EXPIRED" : "ACTIVE",
            payment_status: latestValidContract.payment_status,
            expires_at: timelineCursor.toISOString(),
            notes: `Vigencia recalculada automáticamente según contratos válidos activos.`,
            updated_at: now.toISOString(),
          },
          { onConflict: "tenant_id" }
        );

      if (upsertErr) {
        console.error(`[recalculateTenantTimeline] Error updating tenant_subscriptions:`, upsertErr);
      }
    } else {
      // Sem contratos válidos ativos
      const { error: upsertErr } = await this.client
        .from("tenant_subscriptions")
        .upsert(
          {
            tenant_id: tenantId,
            status: "EXPIRED",
            payment_status: "CANCELLED",
            expires_at: timelineCursor.toISOString(),
            notes: "Sin contratos pagados o bonificados vigentes.",
            updated_at: now.toISOString(),
          },
          { onConflict: "tenant_id" }
        );

      if (upsertErr) {
        console.error(`[recalculateTenantTimeline] Error updating expired tenant_subscriptions:`, upsertErr);
      }
    }

    // 5. Gobernanza de Cupo: Si el plan activo permite menos inspectores (ej: el plan anterior permitía 4 y el nuevo permite 1, o venció),
    // inactivar automáticamente a todos los inspectores que NO sean el Administrador Principal
    const allowedSeats = latestValidContract && timelineCursor.getTime() > now.getTime()
      ? Math.max(1, latestValidContract.seats || 1)
      : 1;

    await this.enforceSeatLimitDeactivation(tenantId, allowedSeats);
  }

  public async enforceSeatLimitDeactivation(
    tenantId: string,
    allowedSeats: number
  ): Promise<{ deactivatedCount: number }> {
    const safeLimit = Math.max(1, allowedSeats);

    // Buscar usuarios activos del tenant
    const { data: users, error: fetchErr } = await this.client
      .from("tenant_users")
      .select("id, role, is_active")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (fetchErr || !users || users.length <= safeLimit) {
      return { deactivatedCount: 0 };
    }

    // Identificar a todos los usuarios activos que NO son TENANT_ADMIN
    const nonAdminUserIds = users
      .filter((u) => u.role !== "TENANT_ADMIN")
      .map((u) => u.id);

    if (nonAdminUserIds.length === 0) {
      return { deactivatedCount: 0 };
    }

    const { data: deactivated, error: updateErr } = await this.client
      .from("tenant_users")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .in("id", nonAdminUserIds)
      .select("id");

    if (updateErr) {
      console.error(`[enforceSeatLimitDeactivation] Error updating tenant_users for ${tenantId}:`, updateErr);
      return { deactivatedCount: 0 };
    }

    return { deactivatedCount: deactivated ? deactivated.length : nonAdminUserIds.length };
  }

  // Alias para manter compatibilidade interna
  private async recalculateTenantSubscription(tenantId: string): Promise<void> {
    await this.recalculateTenantTimeline(tenantId);
  }

  public async cancelContractOffer(tenantId: string, contractId: string): Promise<void> {
    await this.cancelContract({
      tenantId,
      contractId,
      reason: "Oferta comercial caducada anulada",
    });
  }

  public async cancelContract(params: {
    tenantId: string;
    contractId: string;
    reason?: string;
  }): Promise<{ subscription: TenantSubscription; contract: SubscriptionContract }> {
    const { data: contractRecord, error: contractErr } = await this.client
      .from("tenant_subscription_contracts")
      .select("*")
      .eq("id", params.contractId)
      .eq("tenant_id", params.tenantId)
      .maybeSingle();

    if (contractErr || !contractRecord) {
      throw new Error("Contrato no encontrado para anulación.");
    }

    if (contractRecord.payment_status === "PAID" && Number(contractRecord.amount || 0) > 0) {
      throw new Error(
        "Los contratos pagados deben gestionarse mediante reembolso (total o parcial), no mediante anulación directa."
      );
    }

    const now = new Date();
    const expiresAt = new Date(contractRecord.expires_at);
    const validFrom = new Date(contractRecord.valid_from);

    // REGRA DE NEGÓCIO: Não podemos cancelar o que já passou por completo
    if (expiresAt.getTime() <= now.getTime()) {
      throw new Error("No es posible anular un contrato o bonificación cuyo período de vigencia ya ha finalizado.");
    }

    let daysUsed = 0;
    let daysRemaining = contractRecord.days_added;

    if (now.getTime() > validFrom.getTime()) {
      // Fração de jornada conta como dia completo utilizado (Math.ceil)
      const elapsedMs = now.getTime() - validFrom.getTime();
      daysUsed = Math.min(contractRecord.days_added, Math.ceil(elapsedMs / (24 * 60 * 60 * 1000)));
      daysRemaining = Math.max(0, contractRecord.days_added - daysUsed);

      if (daysRemaining <= 0) {
        throw new Error(
          "No es posible anular la bonificación: todos los días contratados ya han transcurrido y han sido consumidos."
        );
      }
    } else {
      daysUsed = 0;
      daysRemaining = contractRecord.days_added;
    }

    const dateStr = now.toLocaleDateString("es-ES");
    const cancelReason = params.reason?.trim() || "Anulado por el Administrador";
    const cancelNote = `[ANULACIÓN DE CONTRATO / BONIFICACIÓN el ${dateStr}. Motivo: ${cancelReason}. Días consumidos mantenidos: ${daysUsed}d, Días cancelados: ${daysRemaining}d]`;
    const updatedNotes = contractRecord.notes ? `${contractRecord.notes}\n${cancelNote}` : cancelNote;

    // 1. Marcar contrato como CANCELLED e ajustar days_added para dias efetivamente consumidos
    const { error: cancelErr } = await this.client
      .from("tenant_subscription_contracts")
      .update({
        payment_status: "CANCELLED",
        days_added: daysUsed,
        notes: updatedNotes,
      })
      .eq("id", params.contractId)
      .eq("tenant_id", params.tenantId);

    if (cancelErr) {
      throw new Error(`Error al cancelar contrato: ${cancelErr.message}`);
    }

    // 2. Recalcular a vigência em cascata do ponto modificado para frente
    await this.recalculateTenantTimeline(params.tenantId);

    const updatedTenant = await this.findById(params.tenantId);
    if (!updatedTenant || !updatedTenant.subscription) {
      throw new Error("Error al cargar los datos de la empresa tras anular el contrato.");
    }

    const updatedContract = new SubscriptionContract({
      id: contractRecord.id,
      tenantId: contractRecord.tenant_id,
      subscriptionId: contractRecord.subscription_id,
      planId: contractRecord.plan_id,
      planName: contractRecord.plan_name,
      planCode: contractRecord.plan_code,
      actionType: contractRecord.action_type,
      validFrom: new Date(contractRecord.valid_from),
      expiresAt: new Date(validFrom.getTime() + daysUsed * 24 * 60 * 60 * 1000),
      daysAdded: daysUsed,
      seats: contractRecord.seats,
      paymentStatus: "CANCELLED",
      paymentDueDate: contractRecord.payment_due_date ? new Date(contractRecord.payment_due_date) : undefined,
      amount: contractRecord.amount ? Number(contractRecord.amount) : undefined,
      invoiceRef: contractRecord.invoice_ref,
      notes: updatedNotes,
      createdBy: contractRecord.created_by,
      createdAt: new Date(contractRecord.created_at),
    });

    return {
      subscription: updatedTenant.subscription,
      contract: updatedContract,
    };
  }

  public async refundContract(params: {
    tenantId: string;
    contractId: string;
    refundType: "TOTAL" | "PARTIAL";
    refundAmount: number;
    refundReason: string;
    revokeAccess?: boolean;
  }): Promise<{ subscription: TenantSubscription; contract: SubscriptionContract }> {
    const { data: contractRecord, error: contractErr } = await this.client
      .from("tenant_subscription_contracts")
      .select("*")
      .eq("id", params.contractId)
      .eq("tenant_id", params.tenantId)
      .maybeSingle();

    if (contractErr || !contractRecord) {
      throw new Error("Contrato no encontrado para procesar el reembolso.");
    }

    const originalAmount = Number(contractRecord.amount || 0);
    if (originalAmount <= 0) {
      throw new Error("No es posible reembolsar un contrato bonificado o sin valor financiero registrado.");
    }

    const previousRefund = Number(contractRecord.refund_amount || 0);
    const now = new Date();
    const expiresAt = new Date(contractRecord.expires_at);

    // REGRA DE NEGÓCIO: Não podemos reembolsar o que já passou
    if (expiresAt.getTime() <= now.getTime()) {
      throw new Error("No es posible reembolsar un contrato cuya vigencia ya ha transcurrido por completo.");
    }

    // Crear entidad para cálculo proporcional estricto (fracción de jornada cuenta como día completo)
    const entityForCalc = new SubscriptionContract({
      id: contractRecord.id,
      tenantId: contractRecord.tenant_id,
      actionType: contractRecord.action_type,
      validFrom: new Date(contractRecord.valid_from),
      expiresAt: new Date(contractRecord.expires_at),
      daysAdded: contractRecord.days_added,
      seats: contractRecord.seats,
      paymentStatus: contractRecord.payment_status,
      amount: originalAmount,
      refundAmount: previousRefund,
      createdAt: new Date(contractRecord.created_at),
    });

    const prop = entityForCalc.calculateProportionalRefund(now);

    if (params.refundAmount <= 0) {
      throw new Error("El importe a reembolsar debe ser mayor a cero.");
    }

    if (params.refundAmount > prop.maxProportionalRefund) {
      throw new Error(
        `El importe solicitado (${params.refundAmount} €) supera el máximo proporcional reembolsable (${prop.maxProportionalRefund} €) correspondiente a los ${prop.daysRemaining} días restantes (de ${prop.daysTotal} días contratados, habiendo utilizado ${prop.daysUsed} días).`
      );
    }

    const newTotalRefunded = Number((previousRefund + params.refundAmount).toFixed(2));
    const isTotal = params.refundType === "TOTAL" || newTotalRefunded >= originalAmount || prop.daysRemaining === 0;
    const newStatus: SubscriptionPaymentStatus = isTotal ? "REFUNDED" : "PARTIALLY_REFUNDED";

    // Calcular cuántos días de vigencia se reducen
    const daysToDeduct = Math.min(
      prop.daysRemaining,
      Math.round((params.refundAmount / originalAmount) * prop.daysTotal)
    );
    const oldExpiresAt = new Date(contractRecord.expires_at);
    const newContractExpiresAt = isTotal
      ? new Date(new Date(contractRecord.valid_from).getTime() + prop.daysUsed * 24 * 60 * 60 * 1000)
      : new Date(oldExpiresAt.getTime() - daysToDeduct * 24 * 60 * 60 * 1000);

    const dateStr = now.toLocaleDateString("es-ES");
    const noteEntry = `[REEMBOLSO ${isTotal ? "TOTAL" : "PARCIAL"}: -${params.refundAmount} € el ${dateStr}. Días devueltos: ${daysToDeduct}. Motivo: ${params.refundReason.trim()}]`;
    const updatedNotes = contractRecord.notes
      ? `${contractRecord.notes}\n${noteEntry}`
      : noteEntry;

    // 1. Actualizar registro del contrato con los nuevos días y vigencia reducida
    const { error: updateContractErr } = await this.client
      .from("tenant_subscription_contracts")
      .update({
        payment_status: newStatus,
        refund_amount: newTotalRefunded,
        refund_type: isTotal ? "TOTAL" : "PARTIAL",
        refund_reason: params.refundReason.trim(),
        refunded_at: now.toISOString(),
        expires_at: newContractExpiresAt.toISOString(),
        days_added: Math.max(0, contractRecord.days_added - daysToDeduct),
        notes: updatedNotes,
      })
      .eq("id", params.contractId)
      .eq("tenant_id", params.tenantId);

    if (updateContractErr) {
      throw new Error(`Error al actualizar el contrato con los datos de reembolso: ${updateContractErr.message}`);
    }

    // 2. Si es reembolso TOTAL y se solicitó revocación inmediata de acceso
    if (isTotal && params.revokeAccess) {
      const { error: subErr } = await this.client
        .from("tenant_subscriptions")
        .update({
          status: "EXPIRED",
          payment_status: "REFUNDED",
          notes: `Reembolso total efectuado el ${dateStr}. Acceso a la plataforma revocado/bloqueado.`,
          updated_at: now.toISOString(),
        })
        .eq("tenant_id", params.tenantId);

      if (subErr) {
        console.warn("Aviso al revocar suscripción en reembolso total:", subErr.message);
      }
    } else {
      // 3. Recalcular la vigencia activa de la suscripción según contratos válidos
      await this.recalculateTenantSubscription(params.tenantId);
    }

    const updatedTenant = await this.findById(params.tenantId);
    if (!updatedTenant || !updatedTenant.subscription) {
      throw new Error("Error al cargar los datos de la empresa tras el reembolso.");
    }

    const updatedContract = new SubscriptionContract({
      id: contractRecord.id,
      tenantId: contractRecord.tenant_id,
      subscriptionId: contractRecord.subscription_id,
      planId: contractRecord.plan_id,
      planName: contractRecord.plan_name,
      planCode: contractRecord.plan_code,
      actionType: contractRecord.action_type,
      validFrom: new Date(contractRecord.valid_from),
      expiresAt: new Date(contractRecord.expires_at),
      daysAdded: contractRecord.days_added,
      seats: contractRecord.seats,
      paymentStatus: newStatus,
      amount: originalAmount,
      refundAmount: newTotalRefunded,
      refundType: isTotal ? "TOTAL" : "PARTIAL",
      refundReason: params.refundReason.trim(),
      refundedAt: now,
      invoiceRef: contractRecord.invoice_ref,
      notes: updatedNotes,
      createdBy: contractRecord.created_by,
      createdAt: new Date(contractRecord.created_at),
    });

    return {
      subscription: updatedTenant.subscription,
      contract: updatedContract,
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
    isSuperAdmin?: boolean;
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

    // REGRA DE SEGURANÇA MANDATÓRIA:
    // Apenas o SuperAdmin da plataforma pode desativar o Administrador Principal
    if (params.isActive === false && member.role === "TENANT_ADMIN" && !params.isSuperAdmin) {
      throw new Error(
        "RESTRICCIÓN DE SEGURIDAD: Solo un SuperAdministrador de la plataforma puede desactivar la cuenta del Administrador Principal."
      );
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

    const existingDoc = (authUserMeta.document_number || "").trim();
    const isDocAlreadyRegistered = Boolean(
      existingDoc &&
      existingDoc !== "No registrado" &&
      existingDoc !== "No asignado"
    );

    // REGRA DE INTEGRIDADE JURÍDICA:
    // Documento não pode ser editado após ter sido cadastrado. Caso não tenha sido informado, tudo bem.
    let finalDocumentNumber = existingDoc;
    if (isDocAlreadyRegistered) {
      if (
        params.documentNumber !== undefined &&
        params.documentNumber.trim() &&
        params.documentNumber.trim().toUpperCase() !== existingDoc.toUpperCase()
      ) {
        throw new Error(
          "RESTRICCIÓN DE SEGURIDAD: El documento oficial (DNI/NIE/NIF) ya está registrado y no puede modificarse por motivos de trazabilidad jurídica sanitaria."
        );
      }
      finalDocumentNumber = existingDoc;
    } else if (params.documentNumber !== undefined && params.documentNumber.trim()) {
      finalDocumentNumber = params.documentNumber.trim().toUpperCase();
    }

    const authUpdatePayload: any = {
      user_metadata: {
        ...authUserMeta,
        full_name: params.fullName !== undefined ? params.fullName.trim() : (authUserMeta.full_name || ""),
        phone: params.phone !== undefined ? params.phone.trim() : (authUserMeta.phone || ""),
        document_number: finalDocumentNumber,
        role: params.role || authUserMeta.role || member.role,
        tenant_id: params.tenantId,
      },
    };

    let fullName = params.fullName || authUserMeta.full_name || "Inspector";
    let phone = params.phone !== undefined ? params.phone.trim() : authUserMeta.phone;
    let documentNumber = finalDocumentNumber;

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
