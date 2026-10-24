"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { OfflineSyncService } from "@/infrastructure/offline/offline-sync.service";

export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  triggerSync: () => Promise<void>;
}

export function useOfflineSyncManager(): OfflineSyncState {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const isSyncingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const count = await OfflineSyncService.getPendingCount();
    setPendingCount(count);
    return count;
  }, []);

  const triggerSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await refreshPendingCount();
      return;
    }

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);
      await OfflineSyncService.syncPendingAudits();
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      await refreshPendingCount();
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    // 1. Conexão restabelecida: primeira oportunidade imediata de sincronização
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // 2. Foco na janela / aba: oportunidade ao retomar a aplicação
    const handleFocus = () => {
      triggerSync();
    };

    const handleSyncStart = () => {
      setIsSyncing(true);
    };

    const handleSyncCompleted = (e: any) => {
      setIsSyncing(false);
      if (typeof e?.detail?.remainingPending === "number") {
        setPendingCount(e.detail.remainingPending);
      } else {
        refreshPendingCount();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("bioaudit:sync-start", handleSyncStart);
    window.addEventListener("bioaudit:sync-completed", handleSyncCompleted);

    // 3. Execução imediata no carregamento inicial
    triggerSync();

    // 4. Temporizador de segurança contínuo (a cada 30 segundos)
    const interval = setInterval(() => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        triggerSync();
      } else {
        refreshPendingCount();
      }
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("bioaudit:sync-start", handleSyncStart);
      window.removeEventListener("bioaudit:sync-completed", handleSyncCompleted);
      clearInterval(interval);
    };
  }, [triggerSync, refreshPendingCount]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    triggerSync,
  };
}
