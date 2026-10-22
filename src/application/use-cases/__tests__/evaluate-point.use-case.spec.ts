import { describe, it, expect, beforeEach } from "vitest";
import { CreateAuditUseCase } from "../create-audit.use-case";
import { EvaluatePointUseCase } from "../evaluate-point.use-case";
import { InMemoryAuditRepository } from "@/test/doubles/in-memory-audit.repository";
import { InMemoryCompanyRepository } from "@/test/doubles/in-memory-company.repository";

describe("EvaluatePointUseCase", () => {
  let auditRepo: InMemoryAuditRepository;
  let companyRepo: InMemoryCompanyRepository;
  let createAuditUseCase: CreateAuditUseCase;
  let evaluatePointUseCase: EvaluatePointUseCase;

  beforeEach(() => {
    auditRepo = new InMemoryAuditRepository();
    companyRepo = new InMemoryCompanyRepository();
    createAuditUseCase = new CreateAuditUseCase(auditRepo, companyRepo);
    evaluatePointUseCase = new EvaluatePointUseCase(auditRepo);
  });

  it("should update score, observations and evidence photo for a specified control point", async () => {
    // Arrange
    const created = await createAuditUseCase.execute({
      auditorId: "aud-001",
      companyName: "Quesos Manchegos S.A.",
      companyCif: "A-02938475",
      companyAddress: "Polígono Industrial Nave 12",
    });

    const evaluationPayload = {
      auditId: created.auditId,
      code: "q1_1",
      score: 2 as const,
      observations: "Diseño higiénico impecable, zonificación clara.",
      evidencePhotoUrl: "https://storage.supabase.co/bioaudit/evidence-1.jpg",
    };

    // Act
    const result = await evaluatePointUseCase.execute(evaluationPayload);
    const audit = await auditRepo.findById(created.auditId);
    const point = audit?.getEvaluationByCode("q1_1");

    // Assert
    expect(result.code).toBe("q1_1");
    expect(result.score).toBe(2);
    expect(result.hasPhoto).toBe(true);
    expect(result.currentGlobalScore).toBeGreaterThan(0);
    expect(point?.score).toBe(2);
    expect(point?.observations).toBe("Diseño higiénico impecable, zonificación clara.");
    expect(point?.evidencePhoto?.url).toBe("https://storage.supabase.co/bioaudit/evidence-1.jpg");
  });
});
