import { describe, it, expect } from "vitest";
import { FormValidatorService } from "../form-validator.service";

describe("FormValidatorService (Domain Form Validation Engine)", () => {
  it("should validate CIF / NIF / NIE documents", () => {
    // Válidos
    expect(FormValidatorService.validateCif("B84920194").isValid).toBe(true);
    expect(FormValidatorService.validateCif("12345678Z").isValid).toBe(true);
    expect(FormValidatorService.validateCif("X1234567L").isValid).toBe(true);

    // Inválidos
    expect(FormValidatorService.validateCif("123").isValid).toBe(false);
    expect(FormValidatorService.validateCif("INVALID_CIF").isValid).toBe(false);
    expect(FormValidatorService.validateCif("").isValid).toBe(false);
    expect(FormValidatorService.validateCif("", false).isValid).toBe(true); // Opcional
  });

  it("should validate Email addresses", () => {
    // Válidos
    expect(FormValidatorService.validateEmail("auditor@bioauditpro.com").isValid).toBe(true);
    expect(FormValidatorService.validateEmail("contato@empresa.es").isValid).toBe(true);

    // Inválidos
    expect(FormValidatorService.validateEmail("auditor").isValid).toBe(false);
    expect(FormValidatorService.validateEmail("auditor@domain").isValid).toBe(false);
    expect(FormValidatorService.validateEmail("").isValid).toBe(false);
    expect(FormValidatorService.validateEmail("", false).isValid).toBe(true); // Opcional
  });

  it("should validate Phone Numbers with DDI and DDD", () => {
    // Válidos
    expect(FormValidatorService.validatePhone("+34 912 345 678").isValid).toBe(true);
    expect(FormValidatorService.validatePhone("+55 (11) 98888-7777").isValid).toBe(true);
    expect(FormValidatorService.validatePhone("912345678").isValid).toBe(true);

    // Inválidos
    expect(FormValidatorService.validatePhone("+34 612 abc").isValid).toBe(false);
    expect(FormValidatorService.validatePhone("00000000").isValid).toBe(false);
    expect(FormValidatorService.validatePhone("", false).isValid).toBe(true); // Opcional
    expect(FormValidatorService.validatePhone("", true).isValid).toBe(false); // Obrigatório
  });

  it("should validate required text fields with minimum length", () => {
    expect(FormValidatorService.validateRequiredText("BioAudit", "Razón Social", 3).isValid).toBe(true);
    expect(FormValidatorService.validateRequiredText("Bi", "Razón Social", 3).isValid).toBe(false);
    expect(FormValidatorService.validateRequiredText("", "Razón Social").isValid).toBe(false);
  });
});
