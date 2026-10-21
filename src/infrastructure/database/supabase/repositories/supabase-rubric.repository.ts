import { createAdminClient } from "../supabase-admin";
import {
  ControlPointTemplate,
  DEFAULT_CONTROL_POINTS,
} from "@/domain/constants/default-control-points";
import {
  IRubricTemplateRepository,
  TenantRubricInfo,
} from "@/domain/repositories/rubric-template-repository.interface";

export class SupabaseRubricRepository implements IRubricTemplateRepository {
  private get client() {
    return createAdminClient();
  }

  public async getRubricForTenant(tenantId?: string | null): Promise<TenantRubricInfo> {
    if (tenantId) {
      // 1. Verificar se o tenant possui rubrica customizada
      const { data: customPoints, error: customError } = await this.client
        .from("control_point_templates")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (!customError && customPoints && customPoints.length > 0) {
        const templates: ControlPointTemplate[] = customPoints.map((p: any) => ({
          code: p.code,
          category: p.category,
          categoryLabel: p.category_label,
          number: p.number,
          title: p.title,
          isCriticalCcp: Boolean(p.is_critical_ccp),
          legalReference: p.legal_reference,
        }));

        return {
          tenantId,
          isCustomized: true,
          totalPoints: templates.length,
          criticalCcpCount: templates.filter((p) => p.isCriticalCcp).length,
          templates,
        };
      }
    }

    // 2. Fallback: Buscar rubrica global padrão (tenant_id IS NULL)
    const { data: defaultPoints } = await this.client
      .from("control_point_templates")
      .select("*")
      .is("tenant_id", null)
      .eq("is_active", true)
      .order("order_index", { ascending: true });

    if (defaultPoints && defaultPoints.length > 0) {
      const templates: ControlPointTemplate[] = defaultPoints.map((p: any) => ({
        code: p.code,
        category: p.category,
        categoryLabel: p.category_label,
        number: p.number,
        title: p.title,
        isCriticalCcp: Boolean(p.is_critical_ccp),
        legalReference: p.legal_reference,
      }));

      return {
        tenantId: null,
        isCustomized: false,
        totalPoints: templates.length,
        criticalCcpCount: templates.filter((p) => p.isCriticalCcp).length,
        templates,
      };
    }

    // 3. Fallback estático em memória caso o banco esteja inacessível
    return {
      tenantId: null,
      isCustomized: false,
      totalPoints: DEFAULT_CONTROL_POINTS.length,
      criticalCcpCount: DEFAULT_CONTROL_POINTS.filter((p) => p.isCriticalCcp).length,
      templates: DEFAULT_CONTROL_POINTS,
    };
  }

  public async customizeRubricForTenant(
    tenantId: string,
    templates: ControlPointTemplate[]
  ): Promise<void> {
    if (!tenantId) throw new Error("ID do tenant é obrigatório.");
    if (!templates || templates.length === 0) {
      throw new Error("A rubrica deve conter ao menos um ponto de controle.");
    }

    // Remover pontos customizados existentes para o tenant
    await this.client
      .from("control_point_templates")
      .delete()
      .eq("tenant_id", tenantId);

    // Inserir os novos pontos personalizados
    const rows = templates.map((p, idx) => ({
      tenant_id: tenantId,
      code: p.code,
      number: p.number,
      category: p.category,
      category_label: p.categoryLabel,
      title: p.title,
      is_critical_ccp: p.isCriticalCcp,
      legal_reference: p.legalReference,
      order_index: idx + 1,
      is_active: true,
    }));

    const { error } = await this.client.from("control_point_templates").insert(rows);

    if (error) {
      throw new Error(`Falha ao salvar rubrica customizada: ${error.message}`);
    }
  }

  public async resetRubricToDefault(tenantId: string): Promise<void> {
    if (!tenantId) return;

    const { error } = await this.client
      .from("control_point_templates")
      .delete()
      .eq("tenant_id", tenantId);

    if (error) {
      throw new Error(`Falha ao restaurar rubrica padrão: ${error.message}`);
    }
  }
}
