import { describe, it, expect } from "vitest";
import { Cif } from "../cif";
import { InvalidCifError } from "../../errors/domain-error";

describe("Cif Value Object", () => {
  it("should accept and normalize a valid corporate CIF", () => {
    // Arrange & Act
    const cif = new Cif("B-84920194");

    // Assert
    expect(cif.value).toBe("B84920194");
  });

  it("should accept a valid individual person NIF", () => {
    // Arrange & Act
    const nif = new Cif("12345678Z");

    // Assert
    expect(nif.value).toBe("12345678Z");
  });

  it("should accept a valid foreigner identification NIE", () => {
    // Arrange & Act
    const nie = new Cif("X1234567L");

    // Assert
    expect(nie.value).toBe("X1234567L");
  });

  it("should throw InvalidCifError for invalid formats", () => {
    // Act & Assert
    expect(() => new Cif("1234")).toThrow(InvalidCifError);
    expect(() => new Cif("INVALID_CIF")).toThrow(InvalidCifError);
    expect(() => new Cif("")).toThrow(InvalidCifError);
  });

  it("should correctly compare two identical CIFs regardless of spacing or dashes", () => {
    // Arrange
    const cif1 = new Cif("B-84920194");
    const cif2 = new Cif("b 84920194");

    // Act & Assert
    expect(cif1.equals(cif2)).toBe(true);
  });

  it("should safely handle non-standard or malformed CIF via Cif.createSafe without throwing", () => {
    // Valid input
    const valid = Cif.createSafe("B-84920194");
    expect(valid.value).toBe("B84920194");

    // Oversized input like B84121212121
    const oversized = Cif.createSafe("B84121212121");
    expect(oversized.value).toBe("B84121212");

    // Empty or gibberish input
    const empty = Cif.createSafe("");
    expect(empty.value).toBe("B84920194");

    const gibberish = Cif.createSafe("not-a-cif");
    expect(gibberish.value).toBe("B84920194");
  });
});
