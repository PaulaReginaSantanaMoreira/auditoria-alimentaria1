import { describe, it, expect } from "vitest";
import { Email } from "../email";
import { InvalidEmailError } from "../../errors/domain-error";

describe("Email Value Object (DDD & RFC 5322)", () => {
  it("should accept valid standard emails", () => {
    const validEmails = [
      "auditor@bioauditpro.com",
      "inspector.sanitario@sanidad.gob.es",
      "control_calidad+appcc@empresa.es",
      "user123@sub.domain.co.uk",
      "admin@empresa-alimentos.eu",
    ];

    validEmails.forEach((addr) => {
      expect(Email.isValid(addr)).toBe(true);
      const email = new Email(addr);
      expect(email.value).toBe(addr.toLowerCase());
      expect(email.domain).toBeDefined();
      expect(email.username).toBeDefined();
    });
  });

  it("should normalize email to lowercase and trim whitespace", () => {
    const email = new Email("  AUDITOR.OFICIAL@BioAuditPro.COM  ");
    expect(email.value).toBe("auditor.oficial@bioauditpro.com");
    expect(email.username).toBe("auditor.oficial");
    expect(email.domain).toBe("bioauditpro.com");
  });

  it("should reject invalid email formats and throw InvalidEmailError", () => {
    const invalidEmails = [
      "",
      "plainaddress",
      "@missinguser.com",
      "missingdomain@",
      "missingdot@domain",
      "spaces in@domain.com",
      "double..dots@domain.com",
      "user@domain..com",
      "user@.com",
    ];

    invalidEmails.forEach((addr) => {
      expect(Email.isValid(addr)).toBe(false);
      expect(() => new Email(addr)).toThrow(InvalidEmailError);
    });
  });

  it("should compare equality correctly", () => {
    const email1 = new Email("admin@bioauditpro.com");
    const email2 = new Email("ADMIN@BIOAUDITPRO.COM");
    const email3 = new Email("other@bioauditpro.com");

    expect(email1.equals(email2)).toBe(true);
    expect(email1.equals(email3)).toBe(false);
  });
});
