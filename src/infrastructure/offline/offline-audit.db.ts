import Dexie, { type Table } from "dexie";
import { AuditAccessScope } from "@/domain/security/roles-and-permissions";

export interface OfflineEvaluationRecord {
  code: string;
  score: number;
  observations: string;
  evidencePhotoBase64?: string;
  updatedAt: string;
}

export interface OfflineAuditRecord {
  id: string;
  companyName: string;
  companyCif: string;
  companyAddress: string;
  inspectionDate: string;
  status: string;
  evaluations: Record<string, OfflineEvaluationRecord>;
  auditorSignatureBase64?: string;
  auditorSignatureName?: string;
  auditedSignatureBase64?: string;
  auditedSignatureName?: string;
  accessScope?: AuditAccessScope;
  createdByRole?: string;
  createdByEmail?: string;
  isSynced: boolean;
  updatedAt: string;
}

export class BioAuditOfflineDatabase extends Dexie {
  public audits!: Table<OfflineAuditRecord, string>;

  constructor() {
    super("BioAuditPro_OfflineDB");
    this.version(3).stores({
      audits: "id, companyCif, status, accessScope, isSynced, updatedAt",
    });
  }
}

export const offlineDb = new BioAuditOfflineDatabase();
