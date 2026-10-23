import { describe, it, expect } from "vitest";
import { PhoneNumber } from "../phone-number";
import { InvalidPhoneNumberError } from "../../errors/domain-error";

describe("PhoneNumber Value Object (ITU-T E.164, DDI and DDD)", () => {
  it("should validate and parse international phone numbers with DDI (+34, +55, +1)", () => {
    // Espanha Internacional
    const spPhone = new PhoneNumber("+34 912 345 678");
    expect(spPhone.isInternational).toBe(true);
    expect(spPhone.ddi).toBe("+34");
    expect(spPhone.ddd).toBe("91");
    expect(PhoneNumber.isValid("+34 912 345 678")).toBe(true);

    // Brasil Internacional com DDD 11
    const brPhone = new PhoneNumber("+55 (11) 98888-7777");
    expect(brPhone.isInternational).toBe(true);
    expect(brPhone.ddi).toBe("+55");
    expect(brPhone.ddd).toBe("11");
    expect(PhoneNumber.isValid("+55 (11) 98888-7777")).toBe(true);

    // EUA Internacional
    const usPhone = new PhoneNumber("+1 (212) 555-1234");
    expect(usPhone.isInternational).toBe(true);
    expect(usPhone.ddi).toBe("+1");
    expect(usPhone.ddd).toBe("212");
  });

  it("should validate national phone numbers with area codes (DDD)", () => {
    // Espanha Nacional Fixo (Madrid 91)
    const spLandline = new PhoneNumber("912 345 678");
    expect(spLandline.isInternational).toBe(false);
    expect(spLandline.ddd).toBe("91");

    // Espanha Nacional Móvel (61)
    const spMobile = new PhoneNumber("612 345 678");
    expect(spMobile.isInternational).toBe(false);
    expect(spMobile.ddd).toBe("61");

    // Brasil Nacional (DDD 11)
    const brNational = new PhoneNumber("(11) 98888-7777");
    expect(brNational.isInternational).toBe(false);
    expect(brNational.ddd).toBe("11");
  });

  it("should reject invalid numbers, letters, and out-of-range digits", () => {
    const invalidPhones = [
      "",
      "123", // curto demais
      "abcd1234567", // letras
      "+34 612 abc 789", // letras no meio
      "00000000", // dígito repetido
      "+34 123", // DDI espanhol com apenas 3 dígitos em vez de 9
      "123456789012345678", // mais de 15 dígitos
    ];

    invalidPhones.forEach((p) => {
      expect(PhoneNumber.isValid(p)).toBe(false);
      expect(() => new PhoneNumber(p)).toThrow(InvalidPhoneNumberError);
    });
  });

  it("should compare phones by digit identity", () => {
    const p1 = new PhoneNumber("+34 912 345 678");
    const p2 = new PhoneNumber("+34-912-345-678");
    const p3 = new PhoneNumber("+34 612 345 678");

    expect(p1.equals(p2)).toBe(true);
    expect(p1.equals(p3)).toBe(false);
  });
});
