import { createAdminClient } from "@/infrastructure/database/supabase/supabase-admin";
import {
  ControlPointTemplate,
  DEFAULT_CONTROL_POINTS,
} from "@/domain/constants/default-control-points";
import {
  IRubricTemplateRepository,
  TenantRubricInfo,
} from "@/domain/repositories/rubric-template-repository.interface";
import { ControlPointSorterService } from "@/domain/services/control-point-sorter.service";

/**
 * Repositório relacional de catálogo e modelos de rúbricas sanitárias.
 * Implementa IRubricTemplateRepository desacoplado de dependências nominais.
 */
export class RubricRepository implements IRubricTemplateRepository {
  private get client() {
    return createAdminClient();
  }

  public async getRubricForTenant(
    tenantId?: string | null,
    includeInactive: boolean = true
  ): Promise<TenantRubricInfo> {
    if (tenantId) {
      // 1. Verificar se o tenant possui rubrica customizada
      let query = this.client
        .from("control_point_templates")
        .select("*")
        .eq("tenant_id", tenantId);

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data: customPoints, error: customError } = await query.order("order_index", {
        ascending: true,
      });

      if (!customError && customPoints && customPoints.length > 0) {
        const templates: ControlPointTemplate[] = customPoints.map((p: any) => ({
          code: p.code,
          category: p.category,
          categoryLabel: p.category_label,
          number: p.number,
          title: p.title,
          isCriticalCcp: Boolean(p.is_critical_ccp),
          legalReference: p.legal_reference,
          isActive: p.is_active !== false,
        }));

        const sortedTemplates = ControlPointSorterService.sortNaturally(templates);

        return {
          tenantId,
          isCustomized: true,
          totalPoints: sortedTemplates.length,
          criticalCcpCount: sortedTemplates.filter((p) => p.isCriticalCcp).length,
          templates: sortedTemplates,
        };
      }
    }

    // 2. Fallback: Buscar rubrica global padrão (tenant_id IS NULL)
    let defaultQuery = this.client
      .from("control_point_templates")
      .select("*")
      .is("tenant_id", null);

    if (!includeInactive) {
      defaultQuery = defaultQuery.eq("is_active", true);
    }

    const { data: defaultPoints } = await defaultQuery.order("order_index", { ascending: true });

    if (defaultPoints && defaultPoints.length > 0) {
      const templates: ControlPointTemplate[] = defaultPoints.map((p: any) => ({
        code: p.code,
        category: p.category,
        categoryLabel: p.category_label,
        number: p.number,
        title: p.title,
        isCriticalCcp: Boolean(p.is_critical_ccp),
        legalReference: p.legal_reference,
        isActive: p.is_active !== false,
      }));

      const sortedTemplates = ControlPointSorterService.sortNaturally(templates);

      return {
        tenantId: null,
        isCustomized: false,
        totalPoints: sortedTemplates.length,
        criticalCcpCount: sortedTemplates.filter((p) => p.isCriticalCcp).length,
        templates: sortedTemplates,
      };
    }

    // 3. Fallback estático em memória caso o banco esteja inacessível
    return {
      tenantId: null,
      isCustomized: false,
      totalPoints: DEFAULT_CONTROL_POINTS.length,
      criticalCcpCount: DEFAULT_CONTROL_POINTS.filter((p) => p.isCriticalCcp).length,
      templates: DEFAULT_CONTROL_POINTS.map((p) => ({ ...p, isActive: true })),
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
      code: p.code || `cp_${idx + 1}`,
      number: p.number || `${idx + 1}`,
      category: p.category,
      category_label: p.categoryLabel,
      title: p.title,
      is_critical_ccp: Boolean(p.isCriticalCcp),
      legal_reference: p.legalReference,
      order_index: idx + 1,
      is_active: p.isActive !== false,
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

  public async updateGlobalBaseRubric(templates: ControlPointTemplate[]): Promise<void> {
    if (!templates || templates.length === 0) {
      throw new Error("A rubrica base deve conter ao menos um ponto de controle.");
    }

    await this.client
      .from("control_point_templates")
      .delete()
      .is("tenant_id", null);

    const rows = templates.map((p, idx) => ({
      tenant_id: null,
      code: p.code || `base_${idx + 1}`,
      number: p.number || `${idx + 1}`,
      category: p.category,
      category_label: p.categoryLabel,
      title: p.title,
      is_critical_ccp: Boolean(p.isCriticalCcp),
      legal_reference: p.legalReference,
      order_index: idx + 1,
      is_active: p.isActive !== false,
    }));

    const { error } = await this.client.from("control_point_templates").insert(rows);

    if (error) {
      throw new Error(`Falha ao salvar rubrica base global: ${error.message}`);
    }
  }

  public async resetGlobalBaseRubric(): Promise<void> {
    await this.client
      .from("control_point_templates")
      .delete()
      .is("tenant_id", null);

    const rows = DEFAULT_CONTROL_POINTS.map((p, idx) => ({
      tenant_id: null,
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
      throw new Error(`Falha ao restaurar rubrica base global: ${error.message}`);
    }
  }
}

// Alias de compatibilidade retroativa
export const SupabaseRubricRepository = RubricRepository;
