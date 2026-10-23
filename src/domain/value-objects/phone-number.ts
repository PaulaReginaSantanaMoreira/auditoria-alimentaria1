import { InvalidPhoneNumberError } from "../errors/domain-error";

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  isInternational?: boolean;
  ddi?: string | null;
  ddd?: string | null;
  digits?: string;
  formatted?: string;
}

export class PhoneNumber {
  private readonly _value: string;
  private readonly _digitsOnly: string;
  private readonly _isInternational: boolean;
  private readonly _ddi: string | null;
  private readonly _ddd: string | null;

  constructor(value: string) {
    const result = PhoneNumber.validate(value);
    if (!result.isValid) {
      throw new InvalidPhoneNumberError(value, result.error);
    }
    this._value = result.formatted || value.trim();
    this._digitsOnly = result.digits || "";
    this._isInternational = result.isInternational || false;
    this._ddi = result.ddi || null;
    this._ddd = result.ddd || null;
  }

  /**
   * Valida rigorosamente o formato de telefone para padrões nacionais e internacionais (E.164).
   * Suporta formatos como:
   * - Espanha Internacional: +34 912 345 678, +34 612 345 678
   * - Espanha Nacional: 912 345 678, 612 345 678 (9 dígitos com DDD provincial/móvel)
   * - Brasil Internacional: +55 (11) 98888-7777, +55 11 3234-5678
   * - Brasil Nacional: (11) 98888-7777, 11988887777 (10 ou 11 dígitos com DDD)
   * - Outros Internacionais: +1 (555) 234-5678, +351 912 345 678, etc.
   */
  public static validate(value?: string | null): PhoneValidationResult {
    if (!value || typeof value !== "string") {
      return { isValid: false, error: "El teléfono no puede estar vacío." };
    }

    const raw = value.trim();

    // 1. Não permite letras ou caracteres proibidos
    if (/[a-zA-Z]/.test(raw)) {
      return { isValid: false, error: "El teléfono no puede contener letras ni caracteres alfabéticos." };
    }

    const allowedSymbolsRegex = /^[\+]?[0-9\s\-\(\)\.]{7,25}$/;
    if (!allowedSymbolsRegex.test(raw)) {
      return { isValid: false, error: "El teléfono contiene símbolos o caracteres no válidos." };
    }

    const openCount = (raw.match(/\(/g) || []).length;
    const closeCount = (raw.match(/\)/g) || []).length;
    if (openCount !== closeCount || openCount > 1) {
      return { isValid: false, error: "El teléfono contiene paréntesis desbalanceados." };
    }

    // 2. Extrai somente os dígitos
    const digitsOnly = raw.replace(/\D/g, "");
    if (digitsOnly.length < 8) {
      return { isValid: false, error: "El teléfono es demasiado corto (mínimo 8 dígitos numéricos)." };
    }
    if (digitsOnly.length > 15) {
      return { isValid: false, error: "El teléfono excede el límite internacional E.164 (máximo 15 dígitos)." };
    }

    // Não permite repetições de um único dígito (ex: 00000000, 99999999)
    if (/^(\d)\1{7,}$/.test(digitsOnly)) {
      return { isValid: false, error: "El número no puede componerse de un único dígito repetido." };
    }

    const isIntl = raw.startsWith("+") || raw.startsWith("00");

    let ddi: string | null = null;
    let ddd: string | null = null;

    if (isIntl) {
      // Normaliza 00 para +
      const normalizedDigits = raw.startsWith("00") ? digitsOnly.slice(2) : digitsOnly;
      
      // Identificação comum de DDI:
      // 1 dígito: +1 (EUA/Canadá)
      // 2 dígitos: +34 (Espanha), +55 (Brasil), +33 (França), +49 (Alemanha), +44 (UK), etc.
      // 3 dígitos: +351 (Portugal), +598 (Uruguai), etc.
      if (normalizedDigits.startsWith("34")) {
        ddi = "+34";
        const nationalPart = normalizedDigits.slice(2);
        if (nationalPart.length !== 9) {
          return { isValid: false, error: "Para teléfonos de España (+34), el número nacional debe tener 9 dígitos." };
        }
        ddd = nationalPart.slice(0, 2); // Ex: 91, 93, 61
      } else if (normalizedDigits.startsWith("55")) {
        ddi = "+55";
        const nationalPart = normalizedDigits.slice(2);
        if (nationalPart.length < 10 || nationalPart.length > 11) {
          return { isValid: false, error: "Para teléfonos de Brasil (+55), debe incluir DDD (2 dígitos) y número (8 ou 9 dígitos)." };
        }
        ddd = nationalPart.slice(0, 2); // Ex: 11, 21
      } else if (normalizedDigits.startsWith("1")) {
        ddi = "+1";
        const nationalPart = normalizedDigits.slice(1);
        if (nationalPart.length !== 10) {
          return { isValid: false, error: "Para números de EE.UU./Canadá (+1), debe tener código de área (3 dígitos) y número (7 dígitos)." };
        }
        ddd = nationalPart.slice(0, 3);
      } else {
        // DDI genérico internacional
        ddi = "+" + normalizedDigits.slice(0, normalizedDigits.length >= 11 ? 3 : 2);
        ddd = normalizedDigits.slice(ddi.length - 1, (ddi.length - 1) + 2);
      }
    } else {
      // Formato Nacional (Sem DDI explícito)
      if (digitsOnly.length === 9) {
        // Padrão Espanhol Nacional: 9 dígitos (91..., 93..., 6..., 7...)
        const firstDigit = digitsOnly[0];
        if (!["6", "7", "8", "9"].includes(firstDigit)) {
          return { isValid: false, error: "El teléfono nacional de España debe iniciar por 6, 7, 8 o 9." };
        }
        ddd = digitsOnly.slice(0, 2);
      } else if (digitsOnly.length === 10 || digitsOnly.length === 11) {
        // Padrão Nacional com DDD (ex: Brasil 11 98888-7777 ou outros)
        ddd = digitsOnly.slice(0, 2);
      } else if (digitsOnly.length === 8) {
        // Padrão fixo sem DDD ou com DDD de 1 dígito
        ddd = digitsOnly.slice(0, 1);
      } else {
        return { isValid: false, error: "Formato telefónico no reconocido. Ingrese el prefijo internacional (DDI) o código de área (DDD)." };
      }
    }

    return {
      isValid: true,
      isInternational: isIntl,
      ddi,
      ddd,
      digits: digitsOnly,
      formatted: raw,
    };
  }

  public static isValid(value?: string | null): boolean {
    return PhoneNumber.validate(value).isValid;
  }

  public static create(value: string): PhoneNumber {
    return new PhoneNumber(value);
  }

  public static createSafe(value?: string | null, fallback = "+34 912 345 678"): PhoneNumber {
    if (value && PhoneNumber.isValid(value)) {
      return new PhoneNumber(value);
    }
    return new PhoneNumber(fallback);
  }

  public get value(): string {
    return this._value;
  }

  public get digitsOnly(): string {
    return this._digitsOnly;
  }

  public get isInternational(): boolean {
    return this._isInternational;
  }

  public get ddi(): string | null {
    return this._ddi;
  }

  public get ddd(): string | null {
    return this._ddd;
  }

  public equals(other: PhoneNumber): boolean {
    return this._digitsOnly === other._digitsOnly;
  }

  public toString(): string {
    return this._value;
  }

  public toJSON(): string {
    return this._value;
  }
}
