export type ConsentType = "COOKIE_POLICY" | "TERMS_OF_SERVICE" | "PRIVACY_POLICY";

export interface CookiePreferences {
  essential: boolean; // Always true
  analytics: boolean;
  functional: boolean;
}

export interface UserConsentProps {
  id: string;
  userId?: string | null;
  ipPseudonymized?: string | null;
  consentType: ConsentType;
  documentVersion: string;
  acceptedCategories: CookiePreferences;
  userAgent?: string | null;
  consentedAt: Date;
}

export class UserConsent {
  private readonly _id: string;
  private readonly _userId?: string | null;
  private readonly _ipPseudonymized?: string | null;
  private readonly _consentType: ConsentType;
  private readonly _documentVersion: string;
  private readonly _acceptedCategories: CookiePreferences;
  private readonly _userAgent?: string | null;
  private readonly _consentedAt: Date;

  constructor(props: UserConsentProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._ipPseudonymized = props.ipPseudonymized;
    this._consentType = props.consentType;
    this._documentVersion = props.documentVersion;
    this._acceptedCategories = props.acceptedCategories;
    this._userAgent = props.userAgent;
    this._consentedAt = props.consentedAt;
  }

  get id(): string { return this._id; }
  get userId(): string | null | undefined { return this._userId; }
  get ipPseudonymized(): string | null | undefined { return this._ipPseudonymized; }
  get consentType(): ConsentType { return this._consentType; }
  get documentVersion(): string { return this._documentVersion; }
  get acceptedCategories(): CookiePreferences { return this._acceptedCategories; }
  get userAgent(): string | null | undefined { return this._userAgent; }
  get consentedAt(): Date { return this._consentedAt; }
}
