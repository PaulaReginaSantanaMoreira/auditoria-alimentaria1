export class Auditor {
  private readonly _id: string;
  private readonly _authUserId: string;
  private _fullName: string;
  private _officialId: string; // NIF / NIE
  private _email: string;
  private _isActiveSubscription: boolean;

  constructor(params: {
    id: string;
    authUserId: string;
    fullName: string;
    officialId: string;
    email: string;
    isActiveSubscription?: boolean;
  }) {
    if (!params.fullName || params.fullName.trim().length === 0) {
      throw new Error("O nome completo do auditor é obrigatório.");
    }
    if (!params.officialId || params.officialId.trim().length === 0) {
      throw new Error("O identificador oficial (NIF/NIE) do auditor é obrigatório.");
    }

    this._id = params.id;
    this._authUserId = params.authUserId;
    this._fullName = params.fullName.trim();
    this._officialId = params.officialId.trim().toUpperCase();
    this._email = params.email.trim().toLowerCase();
    this._isActiveSubscription = params.isActiveSubscription ?? true;
  }

  public get id(): string {
    return this._id;
  }

  public get authUserId(): string {
    return this._authUserId;
  }

  public get fullName(): string {
    return this._fullName;
  }

  public get officialId(): string {
    return this._officialId;
  }

  public get email(): string {
    return this._email;
  }

  public get isActiveSubscription(): boolean {
    return this._isActiveSubscription;
  }

  public updateSubscriptionStatus(isActive: boolean): void {
    this._isActiveSubscription = isActive;
  }

  public toJSON() {
    return {
      id: this._id,
      authUserId: this._authUserId,
      fullName: this._fullName,
      officialId: this._officialId,
      email: this._email,
      isActiveSubscription: this._isActiveSubscription,
    };
  }
}
