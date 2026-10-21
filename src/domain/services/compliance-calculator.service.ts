import { Audit } from "../entities/audit";
import { ControlPointEvaluation, ControlPointCategory } from "../entities/control-point";
import { AuditVerdict } from "../value-objects/score";

export interface CategorySummary {
  category: ControlPointCategory;
  categoryLabel: string;
  totalPoints: number;
  evaluatedCount: number;
  obtainedScore: number;
  maxScore: number;
  percentage: number;
}

export interface AuditComplianceReport {
  totalPoints: number;
  evaluatedCount: number;
  conformeCount: number; // score 2
  parcialCount: number;  // score 1
  noCumpleCount: number; // score 0
  naCount: number;       // score "na"
  criticalCcpCount: number;
  criticalCcpFailuresCount: number;
  globalPercentage: number;
  verdict: AuditVerdict;
  verdictDescription: string;
  categoryBreakdown: Record<ControlPointCategory, CategorySummary>;
  deficiencies: ControlPointEvaluation[];
}

export class ComplianceCalculatorService {
  public static calculateReport(audit: Audit): AuditComplianceReport {
    const evaluations = audit.evaluations;
    const totalPoints = evaluations.length;

    let conformeCount = 0;
    let parcialCount = 0;
    let noCumpleCount = 0;
    let naCount = 0;
    let criticalCcpCount = 0;
    let criticalCcpFailuresCount = 0;
    const deficiencies: ControlPointEvaluation[] = [];

    const categoryStats: Record<
      ControlPointCategory,
      { total: number; evaluated: number; obtained: number; max: number; label: string }
    > = {
      INFRAESTRUCTURA: { total: 0, evaluated: 0, obtained: 0, max: 0, label: "Infraestructura y Equipos" },
      HIGIENE_PERSONAL: { total: 0, evaluated: 0, obtained: 0, max: 0, label: "Higiene y Manipulación" },
      APPCC_FRIO_PROCESOS: { total: 0, evaluated: 0, obtained: 0, max: 0, label: "APPCC, Frío y Procesos" },
    };

    for (const ev of evaluations) {
      const cat = categoryStats[ev.category] || categoryStats.INFRAESTRUCTURA;
      cat.total++;
      cat.evaluated++;

      if (ev.isCriticalCcp) {
        criticalCcpCount++;
        if (ev.score === 0) {
          criticalCcpFailuresCount++;
        }
      }

      if (ev.score === "na") {
        naCount++;
        // Não soma no max nem no obtained
      } else if (ev.score === 2) {
        conformeCount++;
        cat.obtained += 2;
        cat.max += 2;
      } else if (ev.score === 1) {
        parcialCount++;
        cat.obtained += 1;
        cat.max += 2;
        deficiencies.push(ev);
      } else {
        noCumpleCount++;
        cat.obtained += 0;
        cat.max += 2;
        deficiencies.push(ev);
      }
    }

    const score = audit.recalculateScore();
    const verdict = score.calculateVerdict(criticalCcpFailuresCount > 0);

    let verdictDescription = "";
    switch (verdict) {
      case AuditVerdict.FAVORABLE:
        verdictDescription = "Excelente cumplimiento. Sistema robusto y conforme.";
        break;
      case AuditVerdict.FAVORABLE_CONDITIONAL:
        verdictDescription = "Cumplimiento Aceptable. Se requiere subsanación de desviaciones.";
        break;
      case AuditVerdict.UNFAVORABLE:
        verdictDescription = "Auditoría Desfavorable. Riesgo sanitario o fallo crítico detectado.";
        break;
    }

    const categoryBreakdown = {} as Record<ControlPointCategory, CategorySummary>;
    for (const [key, val] of Object.entries(categoryStats)) {
      const catKey = key as ControlPointCategory;
      const pct = val.max > 0 ? Math.round((val.obtained / val.max) * 100) : 100;
      categoryBreakdown[catKey] = {
        category: catKey,
        categoryLabel: val.label,
        totalPoints: val.total,
        evaluatedCount: val.evaluated,
        obtainedScore: val.obtained,
        maxScore: val.max,
        percentage: pct,
      };
    }

    return {
      totalPoints,
      evaluatedCount: totalPoints,
      conformeCount,
      parcialCount,
      noCumpleCount,
      naCount,
      criticalCcpCount,
      criticalCcpFailuresCount,
      globalPercentage: score.percentage,
      verdict,
      verdictDescription,
      categoryBreakdown,
      deficiencies,
    };
  }
}
