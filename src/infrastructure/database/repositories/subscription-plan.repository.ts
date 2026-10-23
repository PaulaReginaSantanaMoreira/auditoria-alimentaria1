import { SupabaseClient } from "@supabase/supabase-js";
import { SubscriptionPlan } from "@/domain/entities/subscription-plan";

export const DEFAULT_INITIAL_PLANS = [
  new SubscriptionPlan({
    id: "plan-trial-7d",
    name: "Plano Piloto Bonificado (Default)",
    code: "TRIAL_7D",
    description: "Acesso inicial bonificado de 7 dias com 1 inspetor habilitado para homologação sanitária",
    durationDays: 7,
    maxUserSeats: 1,
    price: 0,
    currency: "EUR",
    isDefault: true,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  }),
  new SubscriptionPlan({
    id: "plan-pro-30d",
    name: "Plano Profissional Mensal",
    code: "PRO_30D",
    description: "Assinatura mensal para até 5 inspetores ativos e suporte prioritário",
    durationDays: 30,
    maxUserSeats: 5,
    price: 29.0,
    currency: "EUR",
    isDefault: false,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  }),
  new SubscriptionPlan({
    id: "plan-corp-365d",
    name: "Plano Corporativo Anual",
    code: "CORP_365D",
    description: "Licença anual para até 15 inspetores com personalização completa de rúbricas",
    durationDays: 365,
    maxUserSeats: 15,
    price: 290.0,
    currency: "EUR",
    isDefault: false,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  }),
];

let inMemoryPlans: SubscriptionPlan[] = [...DEFAULT_INITIAL_PLANS];

export class SubscriptionPlanRepository {
  constructor(private readonly client: SupabaseClient) {}

  public async findAll(options?: { onlyActive?: boolean }): Promise<SubscriptionPlan[]> {
    try {
      let query = this.client
        .from("subscription_plans")
        .select("*")
        .order("is_default", { ascending: false })
        .order("price", { ascending: true });

      if (options?.onlyActive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        return this.getFallbackPlans(options);
      }

      return data.map((row: any) => this.mapToEntity(row));
    } catch {
      return this.getFallbackPlans(options);
    }
  }

  public async findById(id: string): Promise<SubscriptionPlan | null> {
    try {
      const { data, error } = await this.client
        .from("subscription_plans")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        const fallback = inMemoryPlans.find((p) => p.id === id);
        return fallback || null;
      }

      return this.mapToEntity(data);
    } catch {
      const fallback = inMemoryPlans.find((p) => p.id === id);
      return fallback || null;
    }
  }

  public async getDefaultPlan(): Promise<SubscriptionPlan> {
    const plans = await this.findAll({ onlyActive: true });
    const defaultPlan = plans.find((p) => p.isDefault);
    return defaultPlan || plans[0] || DEFAULT_INITIAL_PLANS[0];
  }

  public async save(plan: SubscriptionPlan): Promise<void> {
    try {
      // Se este plano for marcado como default, remove o default dos outros
      if (plan.isDefault) {
        await this.client
          .from("subscription_plans")
          .update({ is_default: false })
          .neq("id", plan.id);

        inMemoryPlans.forEach((p) => {
          if (p.id !== plan.id) p.update({ isDefault: false });
        });
      }

      const payload = {
        id: plan.id,
        name: plan.name,
        code: plan.code,
        description: plan.description,
        duration_days: plan.durationDays,
        max_user_seats: plan.maxUserSeats,
        price: plan.price,
        currency: plan.currency,
        is_default: plan.isDefault,
        is_active: plan.isActive,
        updated_at: new Date().toISOString(),
      };

      const { error } = await this.client
        .from("subscription_plans")
        .upsert(payload);

      if (error) throw error;

      // Sincroniza em memória
      const existingIdx = inMemoryPlans.findIndex((p) => p.id === plan.id);
      if (existingIdx >= 0) {
        inMemoryPlans[existingIdx] = plan;
      } else {
        inMemoryPlans.push(plan);
      }
    } catch {
      // Fallback em memória
      const existingIdx = inMemoryPlans.findIndex((p) => p.id === plan.id);
      if (existingIdx >= 0) {
        inMemoryPlans[existingIdx] = plan;
      } else {
        inMemoryPlans.push(plan);
      }
    }
  }

  public async toggleStatus(id: string): Promise<SubscriptionPlan | null> {
    const plan = await this.findById(id);
    if (!plan) return null;
    plan.update({ isActive: !plan.isActive });
    await this.save(plan);
    return plan;
  }

  private getFallbackPlans(options?: { onlyActive?: boolean }): SubscriptionPlan[] {
    if (options?.onlyActive) {
      return inMemoryPlans.filter((p) => p.isActive);
    }
    return inMemoryPlans;
  }

  private mapToEntity(row: any): SubscriptionPlan {
    return new SubscriptionPlan({
      id: row.id,
      name: row.name,
      code: row.code,
      description: row.description || undefined,
      durationDays: row.duration_days,
      maxUserSeats: row.max_user_seats,
      price: Number(row.price || 0),
      currency: row.currency || "EUR",
      isDefault: Boolean(row.is_default),
      isActive: Boolean(row.is_active),
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    });
  }
}
