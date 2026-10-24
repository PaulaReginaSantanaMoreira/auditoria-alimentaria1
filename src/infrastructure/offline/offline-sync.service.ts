import { offlineDb, OfflineAuditRecord } from "./offline-audit.db";

export interface SyncResult {
  syncedCount: number;
  totalPending: number;
  failedCount: number;
  errors: string[];
}

export class OfflineSyncService {
  private static isSyncing = false;

  /**
   * Obtiene la cantidad de auditorías locales pendientes de sincronizar con la base de datos oficial.
   */
  public static async getPendingCount(): Promise<number> {
    if (typeof indexedDB === "undefined") {
      return 0;
    }
    try {
      const records = await offlineDb.audits.filter((a) => !a.isSynced).toArray();
      return records.length;
    } catch (err) {
      console.warn("[OfflineSyncService] Error al contar pendientes:", err);
      return 0;
    }
  }

  /**
   * Sincroniza todas las auditorías locales pendientes en la primera oportunidad de conexión.
   */
  public static async syncPendingAudits(): Promise<SyncResult> {
    if (typeof indexedDB === "undefined") {
      return { syncedCount: 0, totalPending: 0, failedCount: 0, errors: [] };
    }

    if (this.isSyncing) {
      return { syncedCount: 0, totalPending: 0, failedCount: 0, errors: ["Sincronización ya en curso"] };
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const pending = await this.getPendingCount();
      return { syncedCount: 0, totalPending: pending, failedCount: 0, errors: ["Dispositivo sin conexión a internet"] };
    }

    this.isSyncing = true;
    let syncedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      // 1. Obtener todos los registros locales marcados como no sincronizados
      const pendingRecords: OfflineAuditRecord[] = await offlineDb.audits
        .filter((a) => !a.isSynced)
        .toArray();

      if (pendingRecords.length === 0) {
        return { syncedCount: 0, totalPending: 0, failedCount: 0, errors: [] };
      }

      // Notifica inicio de ciclo de sincronización
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("bioaudit:sync-start", {
            detail: { totalPending: pendingRecords.length },
          })
        );
      }

      // 2. Transmite cada auditoría a través del endpoint idempotente /api/audits/sync
      for (const record of pendingRecords) {
        try {
          const res = await fetch("/api/audits/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(record),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${res.status}`);
          }

          // Marca como sincronizada en Dexie
          await offlineDb.audits.update(record.id, {
            isSynced: true,
            updatedAt: new Date().toISOString(),
          });

          syncedCount++;
        } catch (err: any) {
          failedCount++;
          errors.push(`Auditoría ${record.id}: ${err.message || "Fallo desconocido"}`);
          console.warn(`[OfflineSyncService] No se pudo sincronizar auditoría ${record.id}:`, err);
        }
      }

      // Notifica finalización del ciclo para que la interfaz se actualice reactivamente
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("bioaudit:sync-completed", {
            detail: {
              syncedCount,
              failedCount,
              remainingPending: pendingRecords.length - syncedCount,
            },
          })
        );
      }

      return {
        syncedCount,
        totalPending: pendingRecords.length,
        failedCount,
        errors,
      };
    } catch (globalErr: any) {
      console.error("[OfflineSyncService] Error general durante la sincronización:", globalErr);
      return { syncedCount, totalPending: 0, failedCount, errors: [globalErr.message] };
    } finally {
      this.isSyncing = false;
    }
  }
}
