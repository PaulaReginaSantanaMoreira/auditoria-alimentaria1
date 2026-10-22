import { InvalidCifError } from "../errors/domain-error";

export class Cif {
  private readonly _value: string;

  constructor(value: string) {
    const sanitized = (value || "").trim().toUpperCase().replace(/[\s-]/g, "");
    if (!Cif.isValid(sanitized)) {
      throw new InvalidCifError(value);
    }
    this._value = sanitized;
  }

  public static isValid(cifOrNif: string): boolean {
    if (!cifOrNif || cifOrNif.length !== 9) return false;

    // Formato NIF: 8 números + 1 letra
    const nifRegex = /^[0-9]{8}[A-Z]$/;
    // Formato NIE: X, Y o Z + 7 números + 1 letra
    const nieRegex = /^[XYZ][0-9]{7}[A-Z]$/;
    // Formato CIF: Letra inicial (A-W) + 7 números + dígito de control (número o letra)
    const cifRegex = /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/;

    return nifRegex.test(cifOrNif) || nieRegex.test(cifOrNif) || cifRegex.test(cifOrNif);
  }

  public static createSafe(value?: string | null, fallback = "B84920194"): Cif {
    if (!value) return new Cif(fallback);
    const sanitized = value.trim().toUpperCase().replace(/[\s-]/g, "");
    if (Cif.isValid(sanitized)) {
      return new Cif(sanitized);
    }
    try {
      if (sanitized.length >= 9 && Cif.isValid(sanitized.slice(0, 9))) {
        return new Cif(sanitized.slice(0, 9));
      }
    } catch {}
    return new Cif(fallback);
  }

  public get value(): string {
    return this._value;
  }

  public toString(): string {
    return this._value;
  }

  public toJSON(): string {
    return this._value;
  }

  public equals(other: Cif): boolean {
    return this._value === other._value;
  }
}
