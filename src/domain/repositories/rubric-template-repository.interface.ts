import { ControlPointTemplate } from "../constants/default-control-points";

export interface TenantRubricInfo {
  tenantId: string | null;
  isCustomized: boolean;
  totalPoints: number;
  criticalCcpCount: number;
  templates: ControlPointTemplate[];
}

export interface IRubricTemplateRepository {
  /**
   * Obtém a rubrica vigente para um Tenant.
   * Se o tenant possuir pontos personalizados, retorna eles.
   * Caso contrário, retorna o modelo sanitário padrão (30 pontos).
   */
  getRubricForTenant(tenantId?: string | null): Promise<TenantRubricInfo>;

  /**
   * Personaliza a rubrica para um tenant específico (Ação exclusiva do Superusuário).
   */
  customizeRubricForTenant(tenantId: string, templates: ControlPointTemplate[]): Promise<void>;

  /**
   * Restaura o formulário para os 30 pontos sanitários padrão da plataforma.
   */
  resetRubricToDefault(tenantId: string): Promise<void>;
}
