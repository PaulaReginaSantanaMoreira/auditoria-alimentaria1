import { InvalidEmailError } from "../errors/domain-error";

export class Email {
  private readonly _value: string;

  constructor(value: string) {
    const sanitized = Email.sanitize(value);
    if (!Email.isValid(sanitized)) {
      throw new InvalidEmailError(value);
    }
    this._value = sanitized;
  }

  public static sanitize(value?: string | null): string {
    if (!value) return "";
    return value.trim().toLowerCase();
  }

  public static isValid(value?: string | null): boolean {
    if (!value) return false;
    const sanitized = Email.sanitize(value);
    if (sanitized.length < 5 || sanitized.length > 254) return false;

    // RFC 5322 format: local@domain.tld
    // Não permite pontos consecutivos nem espaços
    if (sanitized.includes("..") || sanitized.includes(" ") || sanitized.startsWith(".") || sanitized.endsWith(".")) {
      return false;
    }

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(sanitized)) {
      return false;
    }

    const parts = sanitized.split("@");
    if (parts.length !== 2) return false;
    const [local, domain] = parts;

    if (local.length > 64 || local.length === 0) return false;
    if (domain.length > 253 || domain.length === 0) return false;

    return true;
  }

  public static create(value: string): Email {
    return new Email(value);
  }

  public static createSafe(value?: string | null, fallback = "contacto@bioauditpro.com"): Email {
    if (value && Email.isValid(value)) {
      return new Email(value);
    }
    return new Email(fallback);
  }

  public get value(): string {
    return this._value;
  }

  public get username(): string {
    return this._value.split("@")[0];
  }

  public get domain(): string {
    return this._value.split("@")[1];
  }

  public equals(other: Email): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }

  public toJSON(): string {
    return this._value;
  }
}
