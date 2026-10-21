export type SigneeRole = "Auditor" | "Auditado";

export class Signature {
  private readonly _signeeName: string;
  private readonly _signeeRole: SigneeRole;
  private readonly _signatureDataUrl: string;
  private readonly _signedAt: Date;

  constructor(params: {
    signeeName: string;
    signeeRole: SigneeRole;
    signatureDataUrl: string;
    signedAt?: Date;
  }) {
    if (!params.signeeName || params.signeeName.trim().length === 0) {
      throw new Error(`O nome do signatário (${params.signeeRole}) é obrigatório.`);
    }

    if (
      !params.signatureDataUrl ||
      (!params.signatureDataUrl.startsWith("data:image/") && !params.signatureDataUrl.startsWith("http"))
    ) {
      throw new Error("A assinatura deve ser um DataURL de imagem válido ou URL de armazenamento.");
    }

    this._signeeName = params.signeeName.trim();
    this._signeeRole = params.signeeRole;
    this._signatureDataUrl = params.signatureDataUrl;
    this._signedAt = params.signedAt || new Date();
  }

  public get signeeName(): string {
    return this._signeeName;
  }

  public get signeeRole(): SigneeRole {
    return this._signeeRole;
  }

  public get signatureDataUrl(): string {
    return this._signatureDataUrl;
  }

  public get signedAt(): Date {
    return this._signedAt;
  }
}
