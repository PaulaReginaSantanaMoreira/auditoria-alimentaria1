import { describe, it, expect } from "vitest";
import { ComplianceCalculatorService } from "../compliance-calculator.service";
import { Audit } from "../../entities/audit";
import { Company } from "../../entities/company";
import { Auditor } from "../../entities/auditor";
import { ControlPointEvaluation } from "../../entities/control-point";
import { Cif } from "../../value-objects/cif";
import { AuditVerdict } from "../../value-objects/score";
import { DEFAULT_CONTROL_POINTS } from "../../constants/default-control-points";

describe("ComplianceCalculatorService", () => {
  it("should calculate complete report with 30 points and assign FAVORABLE verdict", () => {
    // Arrange
    const audit = new Audit({
      id: "audit-test-1",
      company: new Company({
        id: "c1",
        name: "Lácteos del Sur S.A.",
        cif: new Cif("A-28000000"),
        address: "Carretera Madrid Km 14",
      }),
      auditor: new Auditor({
        id: "a1",
        authUserId: "auth-1",
        fullName: "Dr. Alberto Santos",
        officialId: "09876543M",
        email: "alberto@sanidad.gob.es",
      }),
      inspectionDate: new Date(),
    });

    for (const p of DEFAULT_CONTROL_POINTS) {
      audit.addOrUpdateEvaluation(
        new ControlPointEvaluation({
          code: p.code,
          title: p.title,
          category: p.category,
          isCriticalCcp: p.isCriticalCcp,
          score: 2,
        })
      );
    }

    // Act
    const report = ComplianceCalculatorService.calculateReport(audit);

    // Assert
    expect(report.totalPoints).toBe(30);
    expect(report.conformeCount).toBe(30);
    expect(report.parcialCount).toBe(0);
    expect(report.noCumpleCount).toBe(0);
    expect(report.criticalCcpFailuresCount).toBe(0);
    expect(report.globalPercentage).toBe(100);
    expect(report.verdict).toBe(AuditVerdict.FAVORABLE);
    expect(report.deficiencies).toHaveLength(0);
  });

  it("should downgrade verdict to UNFAVORABLE when any critical CCP fails with score 0", () => {
    // Arrange
    const audit = new Audit({
      id: "audit-test-2",
      company: new Company({
        id: "c1",
        name: "Embutidos Sierra S.L.",
        cif: new Cif("B-12345678"),
        address: "Av. Central 22",
      }),
      auditor: new Auditor({
        id: "a1",
        authUserId: "auth-1",
        fullName: "Dr. Alberto Santos",
        officialId: "09876543M",
        email: "alberto@sanidad.gob.es",
      }),
      inspectionDate: new Date(),
    });

    for (const p of DEFAULT_CONTROL_POINTS) {
      // Deliberate critical cold-chain failure on q3_1
      const score = p.code === "q3_1" ? 0 : 2;
      audit.addOrUpdateEvaluation(
        new ControlPointEvaluation({
          code: p.code,
          title: p.title,
          category: p.category,
          isCriticalCcp: p.isCriticalCcp,
          score,
        })
      );
    }

    // Act
    const report = ComplianceCalculatorService.calculateReport(audit);

    // Assert
    expect(report.criticalCcpFailuresCount).toBe(1);
    expect(report.verdict).toBe(AuditVerdict.UNFAVORABLE);
    expect(report.deficiencies).toHaveLength(1);
    expect(report.deficiencies[0].code).toBe("q3_1");
  });
});
