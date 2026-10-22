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
  tenantId?: string;
  createdByRole?: string;
  createdByEmail?: string;
  isSynced: boolean;
  updatedAt: string;
}

export interface OutboxMutation {
  id: string; // UUID único da mutação
  auditId: string;
  tenantId?: string;
  action: "EVALUATE_POINT" | "FINALIZE_AUDIT" | "CREATE_AUDIT";
  payload: Record<string, any>;
  clientTimestamp: number;
  synced: boolean;
}

export class BioAuditOfflineDatabase extends Dexie {
  public audits!: Table<OfflineAuditRecord, string>;
  public outbox!: Table<OutboxMutation, string>;

  constructor() {
    super("BioAuditPro_OfflineDB");

    this.version(3).stores({
      audits: "id, companyCif, status, accessScope, isSynced, updatedAt",
    });

    // Versão 4: Introdução do Outbox Pattern para proteção contra perda de dados em migrations
    this.version(4).stores({
      audits: "id, companyCif, status, accessScope, tenantId, isSynced, updatedAt",
      outbox: "id, auditId, tenantId, action, synced, clientTimestamp",
    });
  }

  /**
   * Enfileira uma mutação offline de forma atômica para sincronização posterior.
   */
  public async queueMutation(mutation: Omit<OutboxMutation, "id" | "clientTimestamp" | "synced">): Promise<string> {
    const id = crypto.randomUUID();
    await this.outbox.add({
      ...mutation,
      id,
      clientTimestamp: Date.now(),
      synced: false,
    });
    return id;
  }
}

export const offlineDb = new BioAuditOfflineDatabase();
