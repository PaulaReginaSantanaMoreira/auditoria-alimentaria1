"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/presentation/components/Header";
import { useAuthGuard } from "@/presentation/hooks/useAuthGuard";
import { AuthLoadingScreen } from "@/presentation/components/AuthGuard";

interface TenantUserItem {
  id: string;
  user_id: string;
  role: string;
  can_view_all_tenant_audits: boolean;
  is_active: boolean;
  created_at: string;
}

export default function GestaoEquipePage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthGuard();
  const [tenantInfo, setTenantInfo] = useState<{
    name: string;
    cif: string;
    maxSeats: number;
    activeCount: number;
    availableSeats: number;
    subscriptionStatus: string;
    expiresAt?: string;
  }>({
    name: "Empresa Auditora Registrada",
    cif: "",
    maxSeats: 5,
    activeCount: 1,
    availableSeats: 4,
    subscriptionStatus: "ACTIVE",
  });

  const [users, setUsers] = useState<TenantUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/superadmin/tenants")
      .then((res) => res.json())
      .then((data) => {
        if (data.tenants && data.tenants.length > 0) {
          const firstTenant = data.tenants[0];
          setTenantInfo({
            name: firstTenant.name,
            cif: firstTenant.cif,
            maxSeats: firstTenant.maxUserSeats,
            activeCount: firstTenant.activeUsersCount,
            availableSeats: Math.max(0, firstTenant.maxUserSeats - firstTenant.activeUsersCount),
            subscriptionStatus: firstTenant.subscriptionStatus,
            expiresAt: firstTenant.expiresAt,
          });

          fetch(`/api/tenant/users?tenantId=${firstTenant.id}`)
            .then((r) => r.json())
            .then((uData) => {
              if (uData.users) {
                setUsers(uData.users);
              }
            });
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleTogglePermission = async (user: TenantUserItem) => {
    const nextVal = !user.can_view_all_tenant_audits;
    try {
      const res = await fetch("/api/tenant/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          canViewAllTenantAudits: nextVal,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setUsers(
          users.map((u) => (u.id === user.id ? { ...u, can_view_all_tenant_audits: nextVal } : u))
        );
        setFeedback(
          nextVal
            ? "Permiso concedido: El inspector ahora puede visualizar todas las auditorías de la empresa."
            : "Permiso restringido: El inspector ahora visualiza estrictamente sus propios informes."
        );
      }
    } catch {
      setFeedback("Error al actualizar permisos de visualización.");
    }
  };

  if (isAuthLoading || !isAuthenticated) {
    return <AuthLoadingScreen />;
  }

  return (
    <>
      <Header title="BioAudit Pro" subtitle="Equipo de Inspectores" />

      <main className="flex-1 flex flex-col relative w-full pt-20 pb-24 bg-surface min-h-screen">
        <div className="w-full max-w-5xl mx-auto px-margin-mobile space-y-space-md">
          {/* Top Breadcrumb */}
          <div>
            <Link
              href="/auditorias/nova"
              className="inline-flex items-center gap-1.5 text-label-sm font-bold text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Volver a Inspección</span>
            </Link>
          </div>

          {/* Card Header Empresa */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-md sm:p-space-lg border border-slate-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-[16px]">groups</span>
                <span>Equipo de Inspección Higiénico-Sanitaria</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                {tenantInfo.name}
              </h1>
              <p className="mt-1 text-body-sm text-slate-subtext max-w-xl">
                Gestiona los inspectores habilitados bajo la suscripción de tu empresa y define el nivel de visibilidad de los informes técnicos.
              </p>
            </div>

            {/* Card Cota de Licenças */}
            <div className="p-space-md rounded-2xl bg-surface-container border border-slate-border text-right sm:min-w-[220px] shrink-0">
              <span className="text-label-sm font-bold uppercase tracking-wider text-slate-subtext block">
                Inspectores Autorizados
              </span>
              <div className="text-2xl font-black text-on-surface mt-1">
                {tenantInfo.activeCount} / {tenantInfo.maxSeats}
                <span className="text-xs font-normal text-slate-subtext ml-1.5">activos</span>
              </div>
              {tenantInfo.expiresAt && (
                <span className="text-label-sm text-slate-subtext block mt-1 flex items-center justify-end gap-1">
                  <span className="material-symbols-outlined text-[14px]">event</span>
                  <span>Vence el {new Date(tenantInfo.expiresAt).toLocaleDateString("es-ES")}</span>
                </span>
              )}
            </div>
          </div>

          {feedback && (
            <div className="p-space-sm bg-status-pass-bg border border-status-pass/40 text-status-pass rounded-xl text-body-sm flex items-center justify-between animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                <span>{feedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-xs font-bold underline cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Lista de Inspectores */}
          <div className="bg-surface-container-lowest rounded-2xl border border-slate-border shadow-sm overflow-hidden">
            <div className="p-space-md border-b border-slate-border flex items-center justify-between">
              <h2 className="font-title-sm text-title-sm text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">badge</span>
                <span>Inspectores Registrados</span>
              </h2>
              <span className="text-label-sm text-slate-subtext">
                Límite establecido por el SuperAdministrador de la plataforma
              </span>
            </div>

            <div className="p-space-md space-y-space-sm">
              {/* Card Titular */}
              <div className="p-space-md rounded-xl border border-slate-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-container text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    AD
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-on-surface text-body-md">
                        Auditor Titular de Empresa
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        ADMINISTRADOR
                      </span>
                    </div>
                    <p className="text-body-sm text-slate-subtext mt-0.5">
                      Acceso completo irrestricto para inspeccionar y supervisar todos los informes sanitarios.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-status-pass">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Visualiza todas las actas</span>
                </div>
              </div>

              {/* Demais Inspectores */}
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-space-md rounded-xl border border-slate-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-container text-slate-dark flex items-center justify-center font-bold text-xs shrink-0">
                      IN
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-on-surface text-body-md">
                          Inspector #{u.id.substring(0, 8)}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-slate-subtext">
                          {u.role}
                        </span>
                      </div>
                      <p className="text-body-sm text-slate-subtext mt-0.5">
                        {u.can_view_all_tenant_audits
                          ? "Permiso activo: puede consultar todas las auditorías del establecimiento."
                          : "Acceso restringido: consulta exclusivamente sus propias auditorías."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTogglePermission(u)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      u.can_view_all_tenant_audits
                        ? "bg-status-pass-bg text-status-pass border border-status-pass/40"
                        : "bg-surface-container text-on-surface border border-slate-border"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {u.can_view_all_tenant_audits ? "visibility" : "visibility_off"}
                    </span>
                    <span>
                      {u.can_view_all_tenant_audits
                        ? "Ve Todas las Actas"
                        : "Solo Actas Propias"}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
