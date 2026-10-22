"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/presentation/components/Header";
import { offlineDb } from "@/infrastructure/offline/offline-audit.db";

interface TenantItem {
  id: string;
  name: string;
  cif: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  planTier: string;
  maxUserSeats: number;
  activeUsersCount: number;
  subscriptionStatus: string;
  validFrom: string;
  expiresAt: string;
  daysRemaining: number;
  isExpired: boolean;
  createdAt: string;
}

interface AdminAuditItem {
  id: string;
  companyName: string;
  companyCif: string;
  companyAddress?: string;
  inspectionDate: string;
  status: string;
  complianceScore?: number | null;
  verdict?: string | null;
  normativeFramework?: string;
  updatedAt?: string;
}

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [adminAudits, setAdminAudits] = useState<AdminAuditItem[]>([]);
  const [activeTab, setActiveTab] = useState<"tenants" | "inspections">("tenants");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAudits, setIsLoadingAudits] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTenantForSeats, setSelectedTenantForSeats] = useState<TenantItem | null>(null);
  const [newSeatsValue, setNewSeatsValue] = useState<number>(5);

  // Formulário de nova empresa
  const [newTenant, setNewTenant] = useState({
    name: "",
    cif: "",
    planTier: "PRO",
    maxUserSeats: 5,
    subscriptionDays: 365,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/superadmin/tenants");
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login?error=unauthorized";
        return;
      }
      const json = await res.json();
      if (json.success) {
        setTenants(json.tenants || []);
      }
    } catch {
      // Falha de rede ou offline
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdminAudits = async () => {
    setIsLoadingAudits(true);
    try {
      // 1. Tentar carregar da API oficial filtrando pelo escopo CONFIDENTIAL
      const res = await fetch("/api/audits?scope=CONFIDENTIAL");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: AdminAuditItem[] = data.map((item: any) => ({
            id: item.id,
            companyName: item.company?.name || "Empresa Inspeccionada",
            companyCif: item.company?.cif || "CIF-S/N",
            inspectionDate: item.inspection_date || item.created_at,
            status: item.status || "IN_PROGRESS",
            complianceScore: item.compliance_score,
            verdict: item.verdict,
            normativeFramework: item.normative_framework,
            updatedAt: item.created_at,
          }));
          setAdminAudits(mapped);
          return;
        }
      }

      // 2. Fallback do IndexedDB local (inspeções feitas no dispositivo pelo perfil PLATFORM_SUPERADMIN)
      const allOff = await offlineDb.audits.toArray();
      const filtered = allOff.filter(
        (a) =>
          a.accessScope === "CONFIDENTIAL" ||
          a.createdByRole === "PLATFORM_SUPERADMIN" ||
          a.createdByRole === "superadmin"
      );
      const mappedOff: AdminAuditItem[] = filtered.map((a) => ({
        id: a.id,
        companyName: a.companyName,
        companyCif: a.companyCif,
        companyAddress: a.companyAddress,
        inspectionDate: a.inspectionDate,
        status: a.status,
        updatedAt: a.updatedAt,
      }));
      setAdminAudits(mappedOff);
    } catch {
      // fallback
    } finally {
      setIsLoadingAudits(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchAdminAudits();
  }, []);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setNotification(null);

    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTenant),
      });
      const json = await res.json();

      if (json.success) {
        setNotification({ type: "success", message: `Empresa "${newTenant.name}" registrada con éxito.` });
        setShowCreateModal(false);
        setNewTenant({ name: "", cif: "", planTier: "PRO", maxUserSeats: 5, subscriptionDays: 365 });
        fetchTenants();
      } else {
        setNotification({ type: "error", message: json.error || "Error al registrar la empresa." });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Error de conexión." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (tenant: TenantItem) => {
    const nextStatus = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setNotification({
          type: "success",
          message: `Estado de "${tenant.name}" cambiado a ${nextStatus === "ACTIVE" ? "Activa" : "Suspendida"}.`,
        });
        fetchTenants();
      }
    } catch {
      setNotification({ type: "error", message: "Error al actualizar el estado de la empresa." });
    }
  };

  const handleSaveSeats = async () => {
    if (!selectedTenantForSeats) return;
    try {
      const res = await fetch(`/api/superadmin/tenants/${selectedTenantForSeats.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxUserSeats: newSeatsValue }),
      });
      const json = await res.json();
      if (json.success) {
        setNotification({
          type: "success",
          message: `Límite de inspectores de "${selectedTenantForSeats.name}" actualizado a ${newSeatsValue}.`,
        });
        setSelectedTenantForSeats(null);
        fetchTenants();
      }
    } catch {
      setNotification({ type: "error", message: "Error al guardar el límite de inspectores." });
    }
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.cif.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSeats = tenants.reduce((acc, t) => acc + t.maxUserSeats, 0);
  const totalActiveUsers = tenants.reduce((acc, t) => acc + t.activeUsersCount, 0);

  return (
    <>
      <Header title="BioAudit Pro" subtitle="Gobernanza Master • SuperAdmin" planActive={false} />

      <main className="flex-1 flex flex-col relative w-full pt-20 pb-24 bg-surface min-h-screen">
        <div className="w-full max-w-5xl mx-auto px-margin-mobile space-y-space-md">
          {/* Hero Banner SuperAdmin */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-md sm:p-space-lg border border-slate-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                <span>Panel Master Multi-Tenant</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                Gobernanza &amp; Inspecciones Sanitarias
              </h1>
              <p className="mt-1 text-body-sm text-slate-subtext max-w-2xl">
                Administre empresas clientes (Tenants), asigne cupos de inspectores y realice inspecciones sanitarias oficiales con visibilidad privada exclusiva.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <Link
                href="/auditorias/nova"
                className="inline-flex items-center gap-2 px-space-md py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Nueva Inspección</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-space-md py-3 rounded-xl bg-primary hover:bg-primary-container text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_business</span>
                <span>Nueva Empresa</span>
              </button>
            </div>
          </div>

          {/* Notificaciones */}
          {notification && (
            <div
              className={`p-space-sm rounded-xl flex items-center justify-between gap-3 text-sm animate-in fade-in duration-150 ${
                notification.type === "success"
                  ? "bg-status-pass-bg text-status-pass border border-status-pass/40"
                  : "bg-alert-red-bg/25 text-alert-red border border-alert-red/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">
                  {notification.type === "success" ? "check_circle" : "error"}
                </span>
                <span className="font-semibold text-body-sm">{notification.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotification(null)}
                className="text-xs font-bold underline cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm">
            <div className="p-space-md rounded-2xl bg-surface-container-lowest border border-slate-border shadow-sm">
              <div className="flex items-center justify-between text-slate-subtext text-label-sm font-bold uppercase tracking-wider">
                <span>Empresas</span>
                <span className="material-symbols-outlined text-primary text-[20px]">corporate_fare</span>
              </div>
              <div className="mt-2 text-2xl font-black text-on-surface">
                {tenants.filter((t) => t.status === "ACTIVE").length}
                <span className="text-xs font-normal text-slate-subtext ml-1.5">/ {tenants.length} total</span>
              </div>
            </div>

            <div className="p-space-md rounded-2xl bg-surface-container-lowest border border-slate-border shadow-sm">
              <div className="flex items-center justify-between text-slate-subtext text-label-sm font-bold uppercase tracking-wider">
                <span>Inspectores</span>
                <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
              </div>
              <div className="mt-2 text-2xl font-black text-on-surface">
                {totalActiveUsers}
                <span className="text-xs font-normal text-slate-subtext ml-1.5">/ {totalSeats} cupos</span>
              </div>
            </div>

            <div className="p-space-md rounded-2xl bg-surface-container-lowest border border-slate-border shadow-sm">
              <div className="flex items-center justify-between text-slate-subtext text-label-sm font-bold uppercase tracking-wider">
                <span>Mis Inspecciones</span>
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">verified_user</span>
              </div>
              <div className="mt-2 text-2xl font-black text-on-surface flex items-baseline gap-1">
                {adminAudits.length}
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 ml-1">Privadas</span>
              </div>
            </div>

            <div className="p-space-md rounded-2xl bg-surface-container-lowest border border-slate-border shadow-sm">
              <div className="flex items-center justify-between text-slate-subtext text-label-sm font-bold uppercase tracking-wider">
                <span>Rúbrica Base</span>
                <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
              </div>
              <div className="mt-2 text-2xl font-black text-on-surface">
                30 Puntos
                <span className="text-xs font-normal text-slate-subtext ml-1.5">APPCC</span>
              </div>
            </div>
          </div>

          {/* Abas de Navegação SuperAdmin */}
          <div className="flex items-center gap-2 border-b border-slate-border/80 pb-1">
            <button
              type="button"
              onClick={() => setActiveTab("tenants")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "tenants"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface-container-lowest text-slate-subtext hover:text-slate-dark dark:hover:text-white border border-slate-border"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">domain</span>
              <span>Empresas &amp; Licenciamiento ({tenants.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("inspections");
                fetchAdminAudits();
              }}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "inspections"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-surface-container-lowest text-slate-subtext hover:text-slate-dark dark:hover:text-white border border-slate-border"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">lock</span>
              <span>Mis Inspecciones Privadas ({adminAudits.length})</span>
            </button>
          </div>

          {/* ABA 1: TABELA DE TENANTS */}
          {activeTab === "tenants" && (
            <div className="bg-surface-container-lowest rounded-2xl border border-slate-border shadow-sm overflow-hidden animate-in fade-in duration-150">
              <div className="p-space-md border-b border-slate-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-sm">
                <div className="relative flex-1 max-w-md">
                  <span className="material-symbols-outlined text-slate-subtext text-[20px] absolute left-3 top-1/2 -translate-y-1/2">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o CIF de empresa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-space-sm py-2 rounded-xl text-body-sm bg-surface border border-slate-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface"
                  />
                </div>

                <button
                  type="button"
                  onClick={fetchTenants}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-dark dark:text-slate-200 hover:bg-surface-container dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <span className={`material-symbols-outlined text-[18px] ${isLoading ? "animate-spin" : ""}`}>
                    sync
                  </span>
                  <span>Actualizar</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                {filteredTenants.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mx-auto mb-3 text-slate-subtext">
                      <span className="material-symbols-outlined text-[36px]">domain_disabled</span>
                    </div>
                    <h3 className="font-title-md text-title-md text-on-surface font-bold">
                      No hay empresas registradas
                    </h3>
                    <p className="text-body-sm text-slate-subtext mt-1 max-w-sm mx-auto">
                      Haz clic en "Nueva Empresa" para dar de alta el primer cliente con su cuota de inspectores.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-container text-xs font-bold text-slate-subtext uppercase tracking-wider border-b border-slate-border">
                      <tr>
                        <th className="py-3 px-space-md">Empresa / CIF</th>
                        <th className="py-3 px-space-md">Plan &amp; Estado</th>
                        <th className="py-3 px-space-md">Inspectores Habilitados</th>
                        <th className="py-3 px-space-md">Vigencia Subscripción</th>
                        <th className="py-3 px-space-md text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-border/60 text-on-surface font-body-sm">
                      {filteredTenants.map((t) => (
                        <tr key={t.id} className="hover:bg-surface-container-low dark:hover:bg-slate-800/60 transition-colors">
                          <td className="py-space-md px-space-md">
                            <div className="font-bold text-on-surface">{t.name}</div>
                            <div className="text-label-sm text-slate-subtext font-mono mt-0.5">CIF: {t.cif}</div>
                          </td>

                          <td className="py-space-md px-space-md">
                            <div className="flex items-center gap-2">
                              <span className="text-label-sm font-bold px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">
                                {t.planTier}
                              </span>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  t.status === "ACTIVE"
                                    ? "bg-status-pass-bg text-status-pass"
                                    : "bg-alert-red-bg/25 text-alert-red"
                                }`}
                              >
                                {t.status === "ACTIVE" ? "Activa" : "Suspendida"}
                              </span>
                            </div>
                          </td>

                          <td className="py-space-md px-space-md">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-on-surface">
                                {t.activeUsersCount} / {t.maxUserSeats}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTenantForSeats(t);
                                  setNewSeatsValue(t.maxUserSeats);
                                }}
                                className="text-xs text-primary dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[14px]">tune</span>
                                <span>Cupo</span>
                              </button>
                            </div>
                          </td>

                          <td className="py-space-md px-space-md">
                            <div className="flex items-center gap-1.5 text-body-sm">
                              <span className="material-symbols-outlined text-[16px] text-slate-subtext">calendar_today</span>
                              <span>{new Date(t.expiresAt).toLocaleDateString("es-ES")}</span>
                              <span className="text-label-sm text-slate-subtext">({t.daysRemaining} días)</span>
                            </div>
                          </td>

                          <td className="py-space-md px-space-md text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(t)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                t.status === "ACTIVE"
                                  ? "bg-surface-container hover:bg-slate-border text-on-surface"
                                  : "bg-status-pass-bg hover:bg-status-pass/20 text-status-pass"
                              }`}
                            >
                              {t.status === "ACTIVE" ? "Suspender" : "Reactivar"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ABA 2: MIS INSPECCIONES PRIVADAS (EXCLUSIVAS DEL ADMINISTRADOR) */}
          {activeTab === "inspections" && (
            <div className="space-y-space-sm animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 flex items-start gap-3 text-xs leading-relaxed">
                <span className="material-symbols-outlined text-emerald-600 text-[22px] shrink-0 mt-0.5">lock</span>
                <div>
                  <h4 className="font-bold text-sm">Visibilidad Confidencial de Administrador Master</h4>
                  <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300">
                    Las inspecciones y auditorías sanitarias listadas en este panel fueron realizadas directamente por usted. 
                    Por política estricta de seguridad y gobernanza, ningún usuario, inspector ni cliente de ninguna empresa tiene acceso ni visibilidad a estos registros.
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-2xl border border-slate-border shadow-sm overflow-hidden">
                <div className="p-space-md border-b border-slate-border flex items-center justify-between">
                  <h3 className="font-title-md text-title-md font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">assignment</span>
                    <span>Inspecciones Sanitarias Realizadas por el Administrador</span>
                  </h3>
                  <button
                    type="button"
                    onClick={fetchAdminAudits}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-dark hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isLoadingAudits ? "animate-spin" : ""}`}>
                      sync
                    </span>
                    <span>Actualizar</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  {adminAudits.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                        <span className="material-symbols-outlined text-[36px]">verified_user</span>
                      </div>
                      <h4 className="font-title-md text-title-md text-on-surface font-bold">
                        Aún no ha realizado ninguna inspección como Administrador
                      </h4>
                      <p className="text-body-sm text-slate-subtext mt-1 max-w-sm mx-auto mb-4">
                        Puede iniciar una auditoría en cualquier momento. Los resultados se guardarán de forma estrictamente privada.
                      </p>
                      <Link
                        href="/auditorias/nova"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow hover:bg-primary-container transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        <span>Iniciar Nueva Inspección Privada</span>
                      </Link>
                    </div>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface-container text-xs font-bold text-slate-subtext uppercase tracking-wider border-b border-slate-border">
                        <tr>
                          <th className="py-3 px-space-md">Empresa Auditada / CIF</th>
                          <th className="py-3 px-space-md">Fecha Inspección</th>
                          <th className="py-3 px-space-md">Estado</th>
                          <th className="py-3 px-space-md">Resultado APPCC</th>
                          <th className="py-3 px-space-md text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-border/60 text-on-surface font-body-sm">
                        {adminAudits.map((a) => (
                          <tr key={a.id} className="hover:bg-surface-container-low dark:hover:bg-slate-800/60 transition-colors">
                            <td className="py-space-md px-space-md">
                              <div className="font-bold text-on-surface flex items-center gap-1.5">
                                <span>{a.companyName}</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Privada
                                </span>
                              </div>
                              <div className="text-label-sm text-slate-subtext font-mono mt-0.5">CIF: {a.companyCif}</div>
                            </td>

                            <td className="py-space-md px-space-md font-mono text-xs text-slate-subtext">
                              {a.inspectionDate ? new Date(a.inspectionDate).toLocaleDateString("es-ES") : "—"}
                            </td>

                            <td className="py-space-md px-space-md">
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  a.status === "FINALIZED" || a.status === "SIGNED"
                                    ? "bg-status-pass-bg text-status-pass"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {a.status === "FINALIZED"
                                  ? "Finalizada"
                                  : a.status === "SIGNED"
                                  ? "Firmada"
                                  : "En Curso"}
                              </span>
                            </td>

                            <td className="py-space-md px-space-md">
                              {a.complianceScore !== undefined && a.complianceScore !== null ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-primary font-mono">{a.complianceScore}%</span>
                                  {a.verdict && (
                                    <span className="text-[11px] text-slate-subtext">({a.verdict})</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-subtext italic">Evaluando rúbrica...</span>
                              )}
                            </td>

                            <td className="py-space-md px-space-md text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/auditorias/${a.id}/rubrica?company=${encodeURIComponent(
                                    a.companyName
                                  )}&cif=${encodeURIComponent(a.companyCif)}`}
                                  className="px-3 py-1.5 rounded-xl border border-slate-border text-xs font-semibold text-slate-dark hover:bg-surface-container transition-colors inline-flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[16px]">edit_note</span>
                                  <span>Rúbrica</span>
                                </Link>

                                <Link
                                  href={`/auditorias/${a.id}/relatorio?company=${encodeURIComponent(
                                    a.companyName
                                  )}&cif=${encodeURIComponent(a.companyCif)}`}
                                  className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-colors inline-flex items-center gap-1 shadow-sm"
                                >
                                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                                  <span>Informe</span>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal de Cadastro de Nova Empresa */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-space-lg shadow-xl border border-slate-border animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-space-sm">
                <h2 className="font-title-md text-title-md text-on-surface font-bold">
                  Dar de Alta Nueva Empresa (Tenant)
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full text-slate-subtext hover:bg-surface-container flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateTenant} className="space-y-space-sm">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-bold text-on-surface uppercase">
                    Razón Social de la Empresa
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Calidad Alimentaria Ibérica S.L."
                    value={newTenant.name}
                    onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                    className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-bold text-on-surface uppercase">
                    CIF / NIF Oficial
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. B84920194"
                    value={newTenant.cif}
                    onChange={(e) => setNewTenant({ ...newTenant, cif: e.target.value })}
                    className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-space-sm">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-bold text-on-surface uppercase">
                      Inspectores Máximos
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      required
                      value={newTenant.maxUserSeats}
                      onChange={(e) => setNewTenant({ ...newTenant, maxUserSeats: Number(e.target.value) })}
                      className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-bold text-on-surface uppercase">
                      Duración (Días)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      required
                      value={newTenant.subscriptionDays}
                      onChange={(e) => setNewTenant({ ...newTenant, subscriptionDays: Number(e.target.value) })}
                      className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-space-sm border-t border-slate-border/60">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-subtext hover:bg-surface-container cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? "Registrando..." : "Registrar Empresa"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Ajuste de Assentos */}
        {selectedTenantForSeats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-space-lg shadow-xl border border-slate-border animate-in zoom-in-95 duration-150">
              <h2 className="font-title-md text-title-md text-on-surface font-bold mb-1">
                Ajustar Cupo de Inspectores
              </h2>
              <p className="text-body-sm text-slate-subtext mb-space-sm">
                Empresa: <strong>{selectedTenantForSeats.name}</strong>
              </p>

              <div className="space-y-space-sm">
                <div>
                  <label className="text-label-sm font-bold text-on-surface uppercase block mb-1">
                    Número Máximo de Inspectores Activos
                  </label>
                  <input
                    type="number"
                    min={Math.max(1, selectedTenantForSeats.activeUsersCount)}
                    max={500}
                    value={newSeatsValue}
                    onChange={(e) => setNewSeatsValue(Number(e.target.value))}
                    className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <span className="text-label-sm text-slate-subtext mt-1 block">
                    Actualmente {selectedTenantForSeats.activeUsersCount} inspectores activos registrados.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-space-sm border-t border-slate-border/60">
                  <button
                    type="button"
                    onClick={() => setSelectedTenantForSeats(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-subtext hover:bg-surface-container cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSeats}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container shadow-sm cursor-pointer"
                  >
                    Guardar Cupo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
