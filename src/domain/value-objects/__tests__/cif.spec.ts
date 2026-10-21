import { describe, it, expect } from "vitest";
import { Cif } from "../cif";
import { InvalidCifError } from "../../errors/domain-error";

describe("Cif Value Object", () => {
  it("deve aceitar um CIF de empresa válido (ex: B-84920194)", () => {
    const cif = new Cif("B-84920194");
    expect(cif.value).toBe("B84920194");
  });

  it("deve aceitar um NIF de pessoa física válido (8 dígitos + letra)", () => {
    const nif = new Cif("12345678Z");
    expect(nif.value).toBe("12345678Z");
  });

  it("deve aceitar um NIE válido (X, Y, Z + 7 dígitos + letra)", () => {
    const nie = new Cif("X1234567L");
    expect(nie.value).toBe("X1234567L");
  });

  it("deve lançar InvalidCifError para um formato inválido", () => {
    expect(() => new Cif("1234")).toThrow(InvalidCifError);
    expect(() => new Cif("INVALID_CIF")).toThrow(InvalidCifError);
    expect(() => new Cif("")).toThrow(InvalidCifError);
  });

  it("deve comparar dois CIFs corretamente através do método equals", () => {
    const cif1 = new Cif("B-84920194");
    const cif2 = new Cif("b 84920194");
    expect(cif1.equals(cif2)).toBe(true);
  });
});
