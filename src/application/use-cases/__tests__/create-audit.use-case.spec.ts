import { describe, it, expect, beforeEach } from "vitest";
import { CreateAuditUseCase } from "../create-audit.use-case";
import { InMemoryAuditRepository } from "@/test/doubles/in-memory-audit.repository";
import { InMemoryCompanyRepository } from "@/test/doubles/in-memory-company.repository";

describe("CreateAuditUseCase", () => {
  let auditRepo: InMemoryAuditRepository;
  let companyRepo: InMemoryCompanyRepository;
  let useCase: CreateAuditUseCase;

  beforeEach(() => {
    auditRepo = new InMemoryAuditRepository();
    companyRepo = new InMemoryCompanyRepository();
    useCase = new CreateAuditUseCase(auditRepo, companyRepo);
  });

  it("should successfully create an audit and initialize all 30 standard control points", async () => {
    // Arrange
    const input = {
      auditorId: "aud-001",
      companyName: "Bodegas Rioja S.L.",
      companyCif: "B-26019283",
      companyAddress: "Ctra. Logroño s/n",
      sanitaryRegistryNumber: "RGSEAA 30.01234/LO",
    };

    // Act
    const output = await useCase.execute(input);
    const savedAudit = await auditRepo.findById(output.auditId);

    // Assert
    expect(output.auditId).toBeDefined();
    expect(output.totalControlPoints).toBe(30);
    expect(output.status).toBe("IN_PROGRESS");
    expect(savedAudit).not.toBeNull();
    expect(savedAudit?.company.name).toBe("Bodegas Rioja S.L.");
    expect(savedAudit?.evaluations).toHaveLength(30);
    expect(savedAudit?.accessScope).toBe("TENANT");
    expect(savedAudit?.isConfidential()).toBe(false);
  });

  it("should create an audit with CONFIDENTIAL scope when requested by an administrator", async () => {
    // Arrange
    const input = {
      auditorId: "admin-master",
      companyName: "Bodegas Rioja S.L.",
      companyCif: "B-26019283",
      companyAddress: "Ctra. Logroño s/n",
      sanitaryRegistryNumber: "RGSEAA 30.01234/LO",
      accessScope: "CONFIDENTIAL" as const,
    };

    // Act
    const output = await useCase.execute(input);
    const savedAudit = await auditRepo.findById(output.auditId);

    // Assert
    expect(savedAudit).not.toBeNull();
    expect(savedAudit?.accessScope).toBe("CONFIDENTIAL");
    expect(savedAudit?.isConfidential()).toBe(true);
  });

  it("should reject creation when the company CIF is invalid", async () => {
    // Arrange
    const invalidInput = {
      auditorId: "aud-001",
      companyName: "Fake Company",
      companyCif: "INVALID_CIF_123",
      companyAddress: "Main Street 1",
    };

    // Act & Assert
    await expect(useCase.execute(invalidInput)).rejects.toThrow();
  });
});
