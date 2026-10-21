import { describe, it, expect, beforeEach } from "vitest";
import { CreateAuditUseCase } from "../create-audit.use-case";
import { InMemoryAuditRepository } from "./in-memory-audit.repository";
import { InMemoryCompanyRepository } from "./in-memory-company.repository";

describe("CreateAuditUseCase", () => {
  let auditRepo: InMemoryAuditRepository;
  let companyRepo: InMemoryCompanyRepository;
  let useCase: CreateAuditUseCase;

  beforeEach(() => {
    auditRepo = new InMemoryAuditRepository();
    companyRepo = new InMemoryCompanyRepository();
    useCase = new CreateAuditUseCase(auditRepo, companyRepo);
  });

  it("deve criar uma auditoria com sucesso e instanciar os 30 pontos de controle padrão", async () => {
    const output = await useCase.execute({
      auditorId: "aud-001",
      companyName: "Bodegas Rioja S.L.",
      companyCif: "B-26019283",
      companyAddress: "Ctra. Logroño s/n",
      sanitaryRegistryNumber: "RGSEAA 30.01234/LO",
    });

    expect(output.auditId).toBeDefined();
    expect(output.totalControlPoints).toBe(30);
    expect(output.status).toBe("IN_PROGRESS");

    const savedAudit = await auditRepo.findById(output.auditId);
    expect(savedAudit).not.toBeNull();
    expect(savedAudit?.company.name).toBe("Bodegas Rioja S.L.");
    expect(savedAudit?.evaluations).toHaveLength(30);
    expect(savedAudit?.accessScope).toBe("TENANT");
    expect(savedAudit?.isConfidential()).toBe(false);
  });

  it("deve criar auditoria com escopo CONFIDENTIAL quando solicitado pelo perfil de administrador", async () => {
    const output = await useCase.execute({
      auditorId: "admin-master",
      companyName: "Bodegas Rioja S.L.",
      companyCif: "B-26019283",
      companyAddress: "Ctra. Logroño s/n",
      sanitaryRegistryNumber: "RGSEAA 30.01234/LO",
      accessScope: "CONFIDENTIAL",
    });

    const savedAudit = await auditRepo.findById(output.auditId);
    expect(savedAudit).not.toBeNull();
    expect(savedAudit?.accessScope).toBe("CONFIDENTIAL");
    expect(savedAudit?.isConfidential()).toBe(true);
  });

  it("deve falhar se o CIF da empresa for inválido", async () => {
    await expect(
      useCase.execute({
        auditorId: "aud-001",
        companyName: "Empresa Falsa",
        companyCif: "INVALIDO",
        companyAddress: "Rua Sem Saída",
      })
    ).rejects.toThrow();
  });
});
