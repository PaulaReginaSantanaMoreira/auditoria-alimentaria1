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

  it("should initialize an audit with DRAFT status and zero evaluations", () => {
    // Arrange & Act
    const audit = new Audit({
      id: "audit-001",
      company,
      auditor,
      inspectionDate: new Date(),
    });

    // Assert
    expect(audit.status).toBe("DRAFT");
    expect(audit.evaluations).toHaveLength(0);
  });

  it("should transition status to IN_PROGRESS when adding an evaluation", () => {
    // Arrange
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

    // Act
    audit.addOrUpdateEvaluation(point);

    // Assert
    expect(audit.status).toBe("IN_PROGRESS");
    expect(audit.evaluations).toHaveLength(1);
    expect(audit.score?.percentage).toBe(100);
  });

  it("should throw IncompleteAuditError if finalized with fewer than 30 control points", () => {
    // Arrange
    const audit = new Audit({
      id: "audit-001",
      company,
      auditor,
      inspectionDate: new Date(),
    });

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

    // Act & Assert
    expect(() => audit.finalize(30)).toThrow(IncompleteAuditError);
  });

  it("should finalize with FAVORABLE verdict when all 30 points and signatures are registered", () => {
    // Arrange
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

    // Act
    audit.sign(sigAuditor, sigAuditado);
    audit.finalize(30);

    // Assert
    expect(audit.status).toBe("FINALIZED");
    expect(audit.score?.percentage).toBe(100);
    expect(audit.verdict).toBe("FAVORABLE");
  });

  it("should correctly invalidate an audit with reason and author", () => {
    // Arrange
    const audit = new Audit({
      id: "audit-002",
      company,
      auditor,
      inspectionDate: new Date(),
    });

    // Act
    audit.invalidate({
      reason: "Muestras de laboratorio contaminadas externamente por rotura de embalaje",
      invalidatedBy: "user-admin-123",
    });

    // Assert
    expect(audit.status).toBe("INVALIDATED");
    expect(audit.invalidatedBy).toBe("user-admin-123");
    expect(audit.invalidationReason).toBe("Muestras de laboratorio contaminadas externamente por rotura de embalaje");
    expect(audit.invalidatedAt).toBeInstanceOf(Date);
  });

  it("should throw error if attempting to invalidate an already invalidated audit", () => {
    // Arrange
    const audit = new Audit({
      id: "audit-003",
      company,
      auditor,
      inspectionDate: new Date(),
    });
    audit.invalidate({
      reason: "Primera invalidación",
      invalidatedBy: "admin-1",
    });

    // Act & Assert
    expect(() => {
      audit.invalidate({
        reason: "Segunda invalidación",
        invalidatedBy: "admin-2",
      });
    }).toThrow("La auditoría ya se encuentra invalidada");
  });
});
