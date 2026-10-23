import { Cif } from "../value-objects/cif";
import { Email } from "../value-objects/email";
import { PhoneNumber } from "../value-objects/phone-number";

export interface FieldValidation {
  isValid: boolean;
  error?: string;
}

export class FormValidatorService {
  /**
   * Valida Documentos Fiscais (CIF / NIF / NIE Oficial da Espanha).
   */
  public static validateCif(value?: string | null, required = true): FieldValidation {
    if (!value || !value.trim()) {
      if (!required) return { isValid: true };
      return { isValid: false, error: "El CIF / NIF / NIE oficial de la empresa es obligatorio." };
    }

    const sanitized = value.trim().toUpperCase().replace(/[\s-]/g, "");
    if (!Cif.isValid(sanitized)) {
      return {
        isValid: false,
        error: "El documento (CIF/NIF/NIE) no cumple el formato reglamentario oficial (ej. B84920194, 12345678Z, X1234567L).",
      };
    }

    return { isValid: true };
  }

  /**
   * Valida Endereço de Email em conformidade com RFC 5322.
   */
  public static validateEmail(value?: string | null, required = true): FieldValidation {
    if (!value || !value.trim()) {
      if (!required) return { isValid: true };
      return { isValid: false, error: "El correo electrónico es obligatorio." };
    }

    const sanitized = value.trim().toLowerCase();
    if (!Email.isValid(sanitized)) {
      return {
        isValid: false,
        error: "El formato del correo electrónico es inválido. Formato esperado: usuario@dominio.com",
      };
    }

    return { isValid: true };
  }

  /**
   * Valida Número Telefônico Nacional e Internacional (DDI, DDD e E.164).
   */
  public static validatePhone(value?: string | null, required = false): FieldValidation {
    if (!value || !value.trim()) {
      if (!required) return { isValid: true };
      return { isValid: false, error: "El número de teléfono es obligatorio." };
    }

    const result = PhoneNumber.validate(value);
    if (!result.isValid) {
      return {
        isValid: false,
        error: result.error || "El número telefónico no cumple el estándar nacional o internacional con DDI/DDD.",
      };
    }

    return { isValid: true };
  }

  /**
   * Valida Documento de Identificação Pessoal (DNI, NIE ou NIF).
   */
  public static validatePersonalDocument(value?: string | null, required = false): FieldValidation {
    if (!value || !value.trim()) {
      if (!required) return { isValid: true };
      return { isValid: false, error: "El documento de identidad oficial es obligatorio." };
    }

    const sanitized = value.trim().toUpperCase().replace(/[\s-]/g, "");
    if (!Cif.isValid(sanitized)) {
      return {
        isValid: false,
        error: "El documento personal (DNI/NIE/NIF) es inválido (ej. 12345678Z, X1234567L).",
      };
    }

    return { isValid: true };
  }

  /**
   * Valida Texto Obrigatório com Comprimento Mínimo.
   */
  public static validateRequiredText(value: string | undefined | null, fieldName: string, minLength = 2): FieldValidation {
    if (!value || !value.trim()) {
      return { isValid: false, error: `${fieldName} es un campo obligatorio.` };
    }
    if (value.trim().length < minLength) {
      return { isValid: false, error: `${fieldName} debe tener al menos ${minLength} caracteres.` };
    }
    return { isValid: true };
  }
}
