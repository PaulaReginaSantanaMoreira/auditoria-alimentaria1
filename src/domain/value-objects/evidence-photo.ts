export class EvidencePhoto {
  private readonly _url: string;
  private readonly _timestamp: Date;
  private readonly _fileName?: string;
  private readonly _latitude?: number;
  private readonly _longitude?: number;

  constructor(params: {
    url: string;
    timestamp?: Date;
    fileName?: string;
    latitude?: number;
    longitude?: number;
  }) {
    if (!params.url || params.url.trim().length === 0) {
      throw new Error("A URL ou data da foto de evidência não pode estar vazia.");
    }
    this._url = params.url;
    this._timestamp = params.timestamp || new Date();
    this._fileName = params.fileName;
    this._latitude = params.latitude;
    this._longitude = params.longitude;
  }

  public get url(): string {
    return this._url;
  }

  public get timestamp(): Date {
    return this._timestamp;
  }

  public get fileName(): string | undefined {
    return this._fileName;
  }

  public get latitude(): number | undefined {
    return this._latitude;
  }

  public get longitude(): number | undefined {
    return this._longitude;
  }
}
