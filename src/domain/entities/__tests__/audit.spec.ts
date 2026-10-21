import { describe, it, expect, beforeEach } from "vitest";
import { Audit } from "../audit";
import { Company } from "../company";
import { Auditor } from "../auditor";
import { ControlPointEvaluation } from "../control-point";
import { Cif } from "../../value-objects/cif";
import { Signature } from "../../value-objects/signature";
import { IncompleteAuditError } from "../../errors/domain-error";
import { DEFAULT_CONTROL_POINTS } from "../../constants/default-control-points";

describe("Audit Aggregate Root", () => {
  let company: Company;
  let auditor: Auditor;

  beforeEach(() => {
    company = new Company({
      id: "comp-1",
      name: "Alimentos del Valle S.L.",
      cif: new Cif("B-84920194"),
      address: "Pol. Ind. Las Nieves, Nave 4",
    });

    auditor = new Auditor({
      id: "aud-1",
      authUserId: "auth-123",
      fullName: "Dra. Carmen Rodríguez",
      officialId: "54920182A",
      email: "auditor@sanidad.es",
    });
  });

  it("deve criar uma auditoria com status inicial DRAFT", () => {
    const audit = new Audit({
      id: "audit-001",
      company,
      auditor,
      inspectionDate: new Date(),
    });

    expect(audit.status).toBe("DRAFT");
    expect(audit.evaluations).toHaveLength(0);
  });

  it("deve registrar e atualizar a avaliação de um ponto de controle", () => {
    const audit = new Audit({
      id: "audit-001",
      company,
      auditor,
      inspectionDate: new Date(),
    });

    const point = new ControlPointEvaluation({
      code: "q1_1",
      title: "Diseño higiénico de locales",
      category: "INFRAESTRUCTURA",
      score: 2,
    });

    audit.addOrUpdateEvaluation(point);

    expect(audit.status).toBe("IN_PROGRESS");
    expect(audit.evaluations).toHaveLength(1);
    expect(audit.score?.percentage).toBe(100);
  });

  it("deve rejeitar finalização se houver menos que 30 pontos de controle respondidos", () => {
    const audit = new Audit({
      id: "audit-001",
      company,
      auditor,
      inspectionDate: new Date(),
    });

    // Anexa apenas 5 pontos
    for (let i = 0; i < 5; i++) {
      const template = DEFAULT_CONTROL_POINTS[i];
      audit.addOrUpdateEvaluation(
        new ControlPointEvaluation({
          code: template.code,
          title: template.title,
          category: template.category,
          score: 2,
        })
      );
    }

    const sigAuditor = new Signature({
      signeeName: "Carmen Rodríguez",
      signeeRole: "Auditor",
      signatureDataUrl: "data:image/png;base64,sampleSig",
    });
    const sigAuditado = new Signature({
      signeeName: "Juan Pérez",
      signeeRole: "Auditado",
      signatureDataUrl: "data:image/png;base64,sampleSig2",
    });

    audit.sign(sigAuditor, sigAuditado);

    expect(() => audit.finalize(30)).toThrow(IncompleteAuditError);
  });

  it("deve finalizar com sucesso quando todos os 30 pontos e assinaturas forem preenchidos", () => {
    const audit = new Audit({
      id: "audit-001",
      company,
      auditor,
      inspectionDate: new Date(),
    });

    for (const template of DEFAULT_CONTROL_POINTS) {
      audit.addOrUpdateEvaluation(
        new ControlPointEvaluation({
          code: template.code,
          title: template.title,
          category: template.category,
          isCriticalCcp: template.isCriticalCcp,
          score: 2,
        })
      );
    }

    const sigAuditor = new Signature({
      signeeName: "Carmen Rodríguez",
      signeeRole: "Auditor",
      signatureDataUrl: "data:image/png;base64,sampleSig",
    });
    const sigAuditado = new Signature({
      signeeName: "Juan Pérez",
      signeeRole: "Auditado",
      signatureDataUrl: "data:image/png;base64,sampleSig2",
    });

    audit.sign(sigAuditor, sigAuditado);
    audit.finalize(30);

    expect(audit.status).toBe("FINALIZED");
    expect(audit.score?.percentage).toBe(100);
    expect(audit.verdict).toBe("FAVORABLE");
  });
});
