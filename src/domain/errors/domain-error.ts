export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidCifError extends DomainError {
  constructor(cif: string) {
    super(`O CIF/NIF/documento fornecido é inválido segundo a normativa fiscal espanhola: '${cif}'`);
  }
}

export class InvalidEmailError extends DomainError {
  constructor(email: string) {
    super(`O endereço de email '${email}' é inválido. Formato esperado: usuario@dominio.com`);
  }
}

export class InvalidPhoneNumberError extends DomainError {
  constructor(phone: string, reason?: string) {
    super(
      `O número de telefone '${phone}' é inválido. ${reason || "Deve conter DDI/DDD e cumprir os padrões nacionais ou internacionais (E.164)."}`
    );
  }
}

export class InvalidScoreError extends DomainError {
  constructor(score: number) {
    super(`Pontuação inválida: ${score}. O valor deve ser 0 (Não Cumpre), 1 (Parcial) ou 2 (Cumpre).`);
  }
}

export class IncompleteAuditError extends DomainError {
  constructor(evaluatedCount: number, totalRequired: number) {
    super(`A auditoria não pode ser finalizada. Foram avaliados ${evaluatedCount} de ${totalRequired} pontos obrigatórios.`);
  }
}

export class AuditAlreadyFinalizedError extends DomainError {
  constructor(auditId: string) {
    super(`A auditoria com ID '${auditId}' já se encontra finalizada e selada.`);
  }
}

export class MissingSignatureError extends DomainError {
  constructor(signee: "Auditor" | "Auditado") {
    super(`Assinatura obrigatória pendente: ${signee}.`);
  }
}
