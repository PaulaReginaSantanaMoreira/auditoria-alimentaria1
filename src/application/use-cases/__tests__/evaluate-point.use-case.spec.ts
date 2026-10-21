import { describe, it, expect, beforeEach } from "vitest";
import { CreateAuditUseCase } from "../create-audit.use-case";
import { EvaluatePointUseCase } from "../evaluate-point.use-case";
import { InMemoryAuditRepository } from "./in-memory-audit.repository";
import { InMemoryCompanyRepository } from "./in-memory-company.repository";

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

  it("deve atualizar a pontuação, observação e foto de um ponto de controle", async () => {
    const created = await createAuditUseCase.execute({
      auditorId: "aud-001",
      companyName: "Quesos Manchegos S.A.",
      companyCif: "A-02938475",
      companyAddress: "Polígono Industrial Nave 12",
    });

    const result = await evaluatePointUseCase.execute({
      auditId: created.auditId,
      code: "q1_1",
      score: 2,
      observations: "Diseño higiénico impecable, zonificación clara.",
      evidencePhotoUrl: "https://storage.supabase.co/bioaudit/evidence-1.jpg",
    });

    expect(result.code).toBe("q1_1");
    expect(result.score).toBe(2);
    expect(result.hasPhoto).toBe(true);
    expect(result.currentGlobalScore).toBeGreaterThan(0);

    const audit = await auditRepo.findById(created.auditId);
    const point = audit?.getEvaluationByCode("q1_1");
    expect(point?.score).toBe(2);
    expect(point?.observations).toBe("Diseño higiénico impecable, zonificación clara.");
    expect(point?.evidencePhoto?.url).toBe("https://storage.supabase.co/bioaudit/evidence-1.jpg");
  });
});
