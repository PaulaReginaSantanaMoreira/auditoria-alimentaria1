"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/presentation/components/Header";
import { useAuthGuard } from "@/presentation/hooks/useAuthGuard";
import { AuthLoadingScreen } from "@/presentation/components/AuthGuard";

interface TenantInfo {
  id: string;
  name: string;
  cif: string;
  address?: string;
  phone?: string;
  adminName?: string;
  adminEmail?: string;
  planTier: string;
  maxUserSeats: number;
  activeUsersCount: number;
  subscriptionStatus: string;
  expiresAt?: string;
  daysRemaining?: number;
}

interface TeamMember {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  documentNumber?: string;
  role: "TENANT_ADMIN" | "AUDITOR" | "VIEWER" | "INSPECTOR";
  canViewAllTenantAudits: boolean;
  isActive: boolean;
  createdAt: string;
}

interface TeamAudit {
  id: string;
  inspectionDate: string;
  status: string;
  normativeFramework?: string;
  complianceScore?: number | null;
  verdict?: string | null;
  companyName: string;
  companyCif: string;
  auditorName?: string;
  invalidationReason?: string;
  invalidatedBy?: string;
}

export default function GestaoEquipePage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthGuard();
  const [activeTab, setActiveTab] = useState<"team" | "audits">("team");

  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [audits, setAudits] = useState<TeamAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal 1: Editar Empresa (CIF inmutable)
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [editCompanyForm, setEditCompanyForm] = useState({
    name: "",
    address: "",
    phone: "",
    adminName: "",
    adminEmail: "",
  });
  const [isUpdatingCompany, setIsUpdatingCompany] = useState(false);

  // Modal 2: Mi Perfil (Documento inmutable)
  const [showMyProfileModal, setShowMyProfileModal] = useState(false);
  const [myProfileForm, setMyProfileForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    documentNumber: "",
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Modal 3: Nuevo Inspector
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState<{
    fullName: string;
    email: string;
    documentNumber: string;
    phone: string;
    role: "AUDITOR" | "TENANT_ADMIN" | "VIEWER";
  }>({
    fullName: "",
    email: "",
    documentNumber: "",
    phone: "",
    role: "AUDITOR",
  });
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Modal 4: Credenciales Generadas
  const [credentialsModal, setCredentialsModal] = useState<{
    title: string;
    userEmail: string;
    tempPass: string;
  } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Modal 5: Invalidar Inspección
  const [auditToInvalidate, setAuditToInvalidate] = useState<TeamAudit | null>(null);
  const [invalidationReason, setInvalidationReason] = useState("");
  const [isInvalidating, setIsInvalidating] = useState(false);

  const fetchTenantData = async () => {
    setIsLoading(true);
    try {
      // 1. Perfil da empresa
      const profileRes = await fetch("/api/tenant/profile");
      const profileJson = await profileRes.json();
      if (profileJson.success && profileJson.tenant) {
        setTenantInfo(profileJson.tenant);
        setEditCompanyForm({
          name: profileJson.tenant.name || "",
          address: profileJson.tenant.address || "",
          phone: profileJson.tenant.phone || "",
          adminName: profileJson.tenant.adminName || "",
          adminEmail: profileJson.tenant.adminEmail || "",
        });
      }

      // 2. Membros e assentos
      const usersRes = await fetch("/api/tenant/users");
      const usersJson = await usersRes.json();
      if (usersJson.success && usersJson.users) {
        setMembers(usersJson.users);
      }

      // 3. Auditorias da empresa
      const auditsRes = await fetch("/api/audits");
      const auditsJson = await auditsRes.json();
      if (Array.isArray(auditsJson)) {
        const mapped = auditsJson.map((a: any) => ({
          id: a.id,
          inspectionDate: a.inspectionDate || a.inspection_date || a.createdAt || a.created_at,
          status: a.status,
          normativeFramework: a.normativeFramework || a.normative_framework,
          complianceScore: a.score?.percentage ?? a.compliance_score ?? a.complianceScore,
          verdict: a.verdict,
          companyName: a.company?.name || a.companyName || "Establecimiento Auditado",
          companyCif: a.company?.cif || a.companyCif || "",
          auditorName: a.auditor?.fullName || a.auditorName || "Inspector",
          invalidationReason: a.invalidationReason || a.invalidation_reason,
          invalidatedBy: a.invalidatedBy || a.invalidated_by,
        }));
        setAudits(mapped);
      }
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyProfile = async () => {
    try {
      const res = await fetch("/api/tenant/me");
      const json = await res.json();
      if (json.success && json.user) {
        setMyProfileForm({
          fullName: json.user.fullName || "",
          phone: json.user.phone || "",
          email: json.user.email || "",
          documentNumber: json.user.documentNumber || "No registrado",
        });
        setShowMyProfileModal(true);
      }
    } catch {
      alert("Error al cargar perfil de usuario.");
    }
  };

  useEffect(() => {
    fetchTenantData();
  }, []);

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingCompany(true);
    try {
      const res = await fetch("/api/tenant/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editCompanyForm),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: "success", message: "Datos corporativos de la empresa actualizados con éxito." });
        setShowEditCompanyModal(false);
        fetchTenantData();
      } else {
        alert(json.error || "Error al actualizar datos de la empresa.");
      }
    } catch (err: any) {
      alert(err.message || "Error al guardar cambios de la empresa.");
    } finally {
      setIsUpdatingCompany(false);
    }
  };

  const handleUpdateMyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const res = await fetch("/api/tenant/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: myProfileForm.fullName,
          phone: myProfileForm.phone,
          email: myProfileForm.email,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: "success", message: "Su perfil personal ha sido actualizado con éxito." });
        setShowMyProfileModal(false);
      } else {
        alert(json.error || "Error al actualizar su perfil.");
      }
    } catch (err: any) {
      alert(err.message || "Error al guardar perfil.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingMember(true);
    try {
      const res = await fetch("/api/tenant/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMemberForm),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddMemberModal(false);
        setNewMemberForm({ fullName: "", email: "", documentNumber: "", phone: "", role: "AUDITOR" });
        fetchTenantData();
        setCredentialsModal({
          title: "Inspector Registrado con Éxito",
          userEmail: json.user.email,
          tempPass: json.temporaryPassword,
        });
      } else {
        alert(json.error || "Error al registrar inspector.");
      }
    } catch (err: any) {
      alert(err.message || "Error al registrar inspector.");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleToggleMemberActive = async (member: TeamMember) => {
    const nextActive = !member.isActive;
    try {
      const res = await fetch("/api/tenant/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: member.id,
          isActive: nextActive,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({
          type: "success",
          message: `Inspector "${member.fullName}" ${nextActive ? "reactivado" : "inactivado"} con éxito.`,
        });
        fetchTenantData();
      } else {
        alert(json.error || "Error al cambiar el estado del inspector.");
      }
    } catch {
      alert("Error de conexión al cambiar el estado del inspector.");
    }
  };

  const handleToggleViewAll = async (member: TeamMember) => {
    const nextVal = !member.canViewAllTenantAudits;
    try {
      const res = await fetch("/api/tenant/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: member.id,
          canViewAllTenantAudits: nextVal,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({
          type: "success",
          message: nextVal
            ? `Permiso concedido: "${member.fullName}" ahora puede visualizar todas las auditorías del equipo.`
            : `Permiso restringido: "${member.fullName}" ahora solo ve sus propias inspecciones.`,
        });
        fetchTenantData();
      } else {
        alert(json.error || "Error al actualizar permisos de visualización.");
      }
    } catch {
      alert("Error al actualizar permisos de visualización.");
    }
  };

  const handleResetPassword = async (member: TeamMember) => {
    const confirmed = window.confirm(
      `¿Desea restablecer la contraseña de "${member.fullName}" (${member.email})? Se generará una nueva contraseña temporal segura.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/tenant/users/${member.userId}/reset-password`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setCredentialsModal({
          title: "Contraseña Restablecida con Éxito",
          userEmail: member.email,
          tempPass: json.temporaryPassword,
        });
      } else {
        alert(json.error || "Error al restablecer contraseña.");
      }
    } catch {
      alert("Error al conectar para restablecer la contraseña.");
    }
  };

  const handleInvalidateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditToInvalidate) return;
    setIsInvalidating(true);
    try {
      const res = await fetch(`/api/audits/${auditToInvalidate.id}/invalidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: invalidationReason }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({
          type: "success",
          message: `Inspección sanitaria ${auditToInvalidate.id.substring(0, 8)} invalidada formalmente.`,
        });
        setAuditToInvalidate(null);
        setInvalidationReason("");
        fetchTenantData();
      } else {
        alert(json.error || "Error al anular la auditoría.");
      }
    } catch (err: any) {
      alert(err.message || "Error al invalidar la auditoría.");
    } finally {
      setIsInvalidating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2500);
  };

  if (isAuthLoading || !isAuthenticated) {
    return <AuthLoadingScreen />;
  }

  const activeSeats = members.filter((m) => m.isActive).length;
  const maxSeats = tenantInfo?.maxUserSeats || 5;
  const isQuotaFull = activeSeats >= maxSeats;

  return (
    <>
      <Header title="BioAudit Pro" subtitle="Gobernanza de Empresa" />

      <main className="flex-1 flex flex-col relative w-full pt-20 pb-24 bg-surface min-h-screen">
        <div className="w-full max-w-5xl mx-auto px-margin-mobile space-y-space-md">
          {/* Top Breadcrumb & Quick Actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Link
              href="/auditorias/nova"
              className="inline-flex items-center gap-1.5 text-label-sm font-bold text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Volver a Inspección</span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchMyProfile}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary text-on-surface inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-border"
              >
                <span className="material-symbols-outlined text-[16px]">person</span>
                <span>Mi Perfil</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEditCompanyModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary text-on-surface inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-border"
              >
                <span className="material-symbols-outlined text-[16px]">edit_document</span>
                <span>Datos Empresa</span>
              </button>
            </div>
          </div>

          {/* Hero Banner Empresa */}
          {tenantInfo && (
            <div className="bg-surface-container-lowest rounded-2xl p-space-md sm:p-space-lg border border-slate-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider mb-2">
                  <span className="material-symbols-outlined text-[16px]">corporate_fare</span>
                  <span>Panel Corporativo • Tenant</span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                  {tenantInfo.name}
                </h1>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-subtext flex-wrap">
                  <span>CIF: <strong className="font-mono text-on-surface">{tenantInfo.cif}</strong></span>
                  <span>•</span>
                  <span>Plan: <strong className="text-on-surface">{tenantInfo.planTier}</strong></span>
                  {tenantInfo.address && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-xs">{tenantInfo.address}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Card Cota de Inspectores Ativos */}
              <div className="p-space-md rounded-2xl bg-surface-container border border-slate-border text-right sm:min-w-[220px] shrink-0">
                <span className="text-label-sm font-bold uppercase tracking-wider text-slate-subtext block">
                  Cupo de Inspectores
                </span>
                <div className="text-2xl font-black text-on-surface mt-1">
                  {activeSeats} / {maxSeats}
                  <span className="text-xs font-normal text-slate-subtext ml-1.5">activos</span>
                </div>
                {tenantInfo.expiresAt && (
                  <span className="text-label-sm text-slate-subtext block mt-1 flex items-center justify-end gap-1">
                    <span className="material-symbols-outlined text-[14px]">event</span>
                    <span>Vence: {new Date(tenantInfo.expiresAt).toLocaleDateString("es-ES")}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Notificação Feedback */}
          {feedback && (
            <div
              className={`p-space-sm rounded-xl text-body-sm flex items-center justify-between animate-in fade-in duration-150 ${
                feedback.type === "success"
                  ? "bg-status-pass-bg border border-status-pass/40 text-status-pass"
                  : "bg-alert-red-bg/25 border border-alert-red/30 text-alert-red"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">
                  {feedback.type === "success" ? "check_circle" : "error"}
                </span>
                <span>{feedback.message}</span>
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

          {/* Abas */}
          <div className="flex items-center gap-2 border-b border-slate-border/80 pb-1">
            <button
              type="button"
              onClick={() => setActiveTab("team")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "team"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface-container-lowest text-slate-subtext hover:text-slate-dark dark:hover:text-white border border-slate-border"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">groups</span>
              <span>Inspectores &amp; Equipo ({members.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("audits")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "audits"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-surface-container-lowest text-slate-subtext hover:text-slate-dark dark:hover:text-white border border-slate-border"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">fact_check</span>
              <span>Inspecciones de la Empresa ({audits.length})</span>
            </button>
          </div>

          {/* ABA 1: EQUIPO E INSPECTORES */}
          {activeTab === "team" && (
            <div className="bg-surface-container-lowest rounded-2xl border border-slate-border shadow-sm overflow-hidden animate-in fade-in duration-150">
              <div className="p-space-md border-b border-slate-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm">
                <div>
                  <h2 className="font-title-md text-title-md text-on-surface font-bold">
                    Inspectores Habilitados
                  </h2>
                  <p className="text-xs text-slate-subtext mt-0.5">
                    Controle los miembros activos, configure visibilidad de actas y restablezca contraseñas oficiales.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(true)}
                  disabled={isQuotaFull}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0 ${
                    isQuotaFull
                      ? "bg-surface-container text-slate-subtext opacity-70 cursor-not-allowed"
                      : "bg-primary text-white hover:bg-primary-container"
                  }`}
                  title={isQuotaFull ? "Cupo máximo alcanzado. Desactive a un miembro primero." : "Añadir nuevo inspector"}
                >
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  <span>{isQuotaFull ? "Cupo Lleno" : "Nuevo Inspector"}</span>
                </button>
              </div>

              {isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2">
                  <span className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span className="text-xs text-slate-subtext">Cargando inspectores del equipo...</span>
                </div>
              ) : members.length === 0 ? (
                <div className="p-8 text-center text-slate-subtext text-xs">
                  No hay inspectores registrados aún. Haz clic en "Nuevo Inspector" para añadir el primer miembro.
                </div>
              ) : (
                <div className="divide-y divide-slate-border/50">
                  {members.map((u) => (
                    <div
                      key={u.id}
                      className="p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm hover:bg-surface-container-low transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-container text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                          {u.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-on-surface text-body-md">{u.fullName}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                u.role === "TENANT_ADMIN"
                                  ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                                  : u.role === "VIEWER"
                                  ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                  : "bg-status-pass-bg text-status-pass"
                              }`}
                            >
                              {u.role}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                u.isActive
                                  ? "bg-status-pass-bg text-status-pass"
                                  : "bg-alert-red-bg/25 text-alert-red"
                              }`}
                            >
                              {u.isActive ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                          <div className="text-slate-subtext font-mono text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{u.email}</span>
                            {u.documentNumber && (
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-dark dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-border dark:border-slate-700">
                                <span className="material-symbols-outlined text-[12px]">badge</span>
                                {u.documentNumber}
                              </span>
                            )}
                            {u.phone && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-subtext dark:text-slate-400">
                                <span className="material-symbols-outlined text-[12px]">call</span>
                                {u.phone}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-subtext mt-1">
                            {u.role === "TENANT_ADMIN"
                              ? "Supervisión total: acceso a la gestión de inspectores y actas sanitarias."
                              : u.canViewAllTenantAudits
                              ? "Permiso activo: puede consultar todas las auditorías del equipo."
                              : "Acceso restringido: consulta exclusivamente sus propios informes."}
                          </p>
                        </div>
                      </div>

                      {/* Botões de Ação do Inspetor */}
                      <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center shrink-0">
                        {u.role === "TENANT_ADMIN" && (
                          <button
                            type="button"
                            onClick={fetchMyProfile}
                            className="h-8 px-2.5 rounded-xl text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="Editar mis datos de perfil (documento protegido)"
                          >
                            <span className="material-symbols-outlined text-[15px]">person</span>
                            <span>Mis Datos</span>
                          </button>
                        )}

                        {u.role !== "TENANT_ADMIN" && (
                          <button
                            type="button"
                            onClick={() => handleToggleViewAll(u)}
                            className="h-8 px-2.5 rounded-xl text-xs font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary text-on-surface inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="Alternar entre ver todas las actas o solo las propias"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              {u.canViewAllTenantAudits ? "visibility" : "visibility_off"}
                            </span>
                            <span>{u.canViewAllTenantAudits ? "Todas las Actas" : "Solo Propias"}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleResetPassword(u)}
                          className="h-8 px-2.5 rounded-xl text-xs font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary text-on-surface inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="Restablecer clave con contraseña temporal segura"
                        >
                          <span className="material-symbols-outlined text-[15px]">lock_reset</span>
                          <span>Reset Clave</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleMemberActive(u)}
                          className={`h-8 px-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                            u.isActive
                              ? "bg-surface-container hover:bg-alert-red-bg/25 hover:text-alert-red text-on-surface"
                              : "bg-status-pass-bg hover:bg-status-pass/20 text-status-pass"
                          }`}
                          title={u.isActive ? "Desactivar inspector (libera cupo)" : "Reactivar inspector"}
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {u.isActive ? "block" : "check_circle"}
                          </span>
                          <span>{u.isActive ? "Inactivar" : "Reactivar"}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA 2: AUDITORIAS DA EMPRESA */}
          {activeTab === "audits" && (
            <div className="bg-surface-container-lowest rounded-2xl border border-slate-border shadow-sm overflow-hidden animate-in fade-in duration-150">
              <div className="p-space-md border-b border-slate-border flex items-center justify-between">
                <div>
                  <h2 className="font-title-md text-title-md text-on-surface font-bold">
                    Historial de Inspecciones Higiénico-Sanitarias
                  </h2>
                  <p className="text-xs text-slate-subtext mt-0.5">
                    Consulte actas de su equipo, re-genere PDFs oficiales o invalide inspecciones con justificativa técnica.
                  </p>
                </div>
              </div>

              {audits.length === 0 ? (
                <div className="p-12 text-center text-slate-subtext text-xs">
                  No se encontraron auditorías registradas para esta empresa.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container font-bold text-slate-subtext uppercase tracking-wider border-b border-slate-border">
                      <tr>
                        <th className="py-3 px-space-md">Establecimiento</th>
                        <th className="py-3 px-space-md">Fecha &amp; Inspector</th>
                        <th className="py-3 px-space-md">Puntuación / Veredicto</th>
                        <th className="py-3 px-space-md">Estado</th>
                        <th className="py-3 px-space-md text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-border/50 text-on-surface font-body-sm">
                      {audits.map((a) => (
                        <tr key={a.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-3 px-space-md">
                            <div className="font-bold text-on-surface text-sm">{a.companyName}</div>
                            <div className="text-[11px] text-slate-subtext font-mono">CIF: {a.companyCif}</div>
                          </td>

                          <td className="py-3 px-space-md">
                            <div>{new Date(a.inspectionDate).toLocaleDateString("es-ES")}</div>
                            <div className="text-[11px] text-slate-subtext">{a.auditorName}</div>
                          </td>

                          <td className="py-3 px-space-md">
                            {a.complianceScore !== null && a.complianceScore !== undefined ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold">{a.complianceScore}%</span>
                                {a.verdict && (
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      a.verdict === "FAVORABLE"
                                        ? "bg-status-pass-bg text-status-pass"
                                        : "bg-alert-red-bg/25 text-alert-red"
                                    }`}
                                  >
                                    {a.verdict}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-subtext text-xs">En curso</span>
                            )}
                          </td>

                          <td className="py-3 px-space-md">
                            {a.status === "INVALIDATED" ? (
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-alert-red-bg/25 text-alert-red inline-flex items-center gap-1"
                                title={a.invalidationReason ? `Motivo: ${a.invalidationReason}` : "Auditoría anulada"}
                              >
                                <span className="material-symbols-outlined text-[12px]">cancel</span>
                                <span>INVALIDADA</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-on-surface-variant">
                                {a.status === "FINALIZED" ? "Finalizada" : "En Curso"}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-space-md text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <Link
                                href={`/auditorias/${a.id}/relatorio?company=${encodeURIComponent(
                                  a.companyName
                                )}&cif=${encodeURIComponent(a.companyCif)}`}
                                className="h-8 px-2.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[15px]">description</span>
                                <span>Laudo</span>
                              </Link>

                              {a.status !== "INVALIDATED" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAuditToInvalidate(a);
                                    setInvalidationReason("");
                                  }}
                                  className="h-8 px-2 rounded-xl text-xs font-semibold bg-surface-container hover:bg-alert-red-bg/25 hover:text-alert-red text-slate-subtext inline-flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Anular acta de inspección con justificativa"
                                >
                                  <span className="material-symbols-outlined text-[15px]">block</span>
                                  <span>Anular</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL 1: Editar Datos de Empresa (CIF INMUTABLE) */}
        {showEditCompanyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl p-space-lg shadow-xl border border-slate-border animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-space-sm border-b border-slate-border/70 pb-3">
                <div>
                  <h2 className="font-title-md text-title-md text-on-surface font-bold">
                    Modificar Datos de la Empresa
                  </h2>
                  <p className="text-xs text-slate-subtext">
                    Por requerimiento legal, el CIF no es modificable por autoservicio.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditCompanyModal(false)}
                  className="w-8 h-8 rounded-full text-slate-subtext hover:bg-surface-container flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleUpdateCompany} className="space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-bold text-on-surface uppercase">Razón Social *</label>
                    <input
                      type="text"
                      required
                      value={editCompanyForm.name}
                      onChange={(e) => setEditCompanyForm({ ...editCompanyForm, name: e.target.value })}
                      className="h-10 px-3 rounded-xl bg-surface border border-slate-border text-xs text-on-surface font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-bold text-slate-subtext uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">lock</span>
                      <span>CIF / Documento Fiscal Oficial (Inmutable)</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={tenantInfo?.cif || ""}
                      className="h-10 px-3 rounded-xl bg-surface-container/60 border border-slate-border text-xs text-slate-subtext font-mono cursor-not-allowed select-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-bold text-on-surface uppercase">Dirección / Sede</label>
                    <input
                      type="text"
                      value={editCompanyForm.address}
                      onChange={(e) => setEditCompanyForm({ ...editCompanyForm, address: e.target.value })}
                      className="h-10 px-3 rounded-xl bg-surface border border-slate-border text-xs text-on-surface"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-label-sm font-bold text-on-surface uppercase">Teléfono de Contacto</label>
                      <input
                        type="tel"
                        value={editCompanyForm.phone}
                        onChange={(e) => setEditCompanyForm({ ...editCompanyForm, phone: e.target.value })}
                        className="h-10 px-3 rounded-xl bg-surface border border-slate-border text-xs text-on-surface"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-label-sm font-bold text-on-surface uppercase">Responsable / Titular</label>
                      <input
                        type="text"
                        value={editCompanyForm.adminName}
                        onChange={(e) => setEditCompanyForm({ ...editCompanyForm, adminName: e.target.value })}
                        className="h-10 px-3 rounded-xl bg-surface border border-slate-border text-xs text-on-surface"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-space-sm border-t border-slate-border/60">
                  <button
                    type="button"
                    onClick={() => setShowEditCompanyModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-subtext hover:bg-surface-container cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingCompany}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingCompany ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Mi Perfil (DOCUMENTO PERSONAL INMUTABLE) */}
        {showMyProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-space-lg shadow-xl border border-slate-border animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-space-sm border-b border-slate-border/70 pb-3">
                <div>
                  <h2 className="font-title-md text-title-md text-on-surface font-bold">
                    Mi Perfil de Usuario
                  </h2>
                  <p className="text-xs text-slate-subtext">
                    Modifique sus datos personales de contacto.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMyProfileModal(false)}
                  className="w-8 h-8 rounded-full text-slate-subtext hover:bg-surface-container flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleUpdateMyProfile} className="space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-bold text-on-surface uppercase">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      value={myProfileForm.fullName}
                      onChange={(e) => setMyProfileForm({ ...myProfileForm, fullName: e.target.value })}
                      className="h-10 px-3 rounded-xl bg-surface border border-slate-border text-xs text-on-surface font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-bold text-slate-subtext uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">lock</span>
                      <span>Documento Personal (DNI/NIE) — Inmutable</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={myProfileForm.documentNumber}
                      className="h-10 px-3 rounded-xl bg-surface-container/60 border border-slate-border text-xs text-slate-subtext font-mono cursor-not-allowed"
                    />
                    <span className="text-[10px] text-slate-subtext">
                      * Solo un SuperAdmin puede rectificar documentos de identidad oficial.
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-bold text-on-surface uppercase">Correo Electrónico</label>
                    <input
                      type="email"
                      value={myProfileForm.email}
                      onChange={(e) => setMyProfileForm({ ...myProfileForm, email: e.target.value })}
                      className="h-10 px-3 rounded-xl bg-surface border border-slate-border text-xs text-on-surface"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-bold text-on-surface uppercase">Teléfono</label>
                    <input
                      type="tel"
                      value={myProfileForm.phone}
                      onChange={(e) => setMyProfileForm({ ...myProfileForm, phone: e.target.value })}
                      className="h-10 px-3 rounded-xl bg-surface border border-slate-border text-xs text-on-surface"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-space-sm border-t border-slate-border/60">
                  <button
                    type="button"
                    onClick={() => setShowMyProfileModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-subtext hover:bg-surface-container cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingProfile ? "Guardando..." : "Guardar Perfil"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: Nuevo Inspector (VALIDA COTA) */}
        {showAddMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-space-lg shadow-xl border border-slate-border dark:border-slate-800 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-space-sm border-b border-slate-border/70 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary dark:text-emerald-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                  </div>
                  <div>
                    <h2 className="font-title-md text-title-md text-slate-dark dark:text-slate-100 font-bold">
                      Dar de Alta Inspector
                    </h2>
                    <p className="text-xs text-slate-subtext dark:text-slate-400">
                      Cupo disponible: <strong className="text-primary dark:text-emerald-400">{maxSeats - activeSeats}</strong> de {maxSeats} inspectores.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="w-8 h-8 rounded-full text-slate-subtext hover:bg-slate-surface dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleAddMember} className="space-y-4">
                <div className="space-y-3">
                  {/* Documento Oficial */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-dark dark:text-slate-200">
                        Documento Oficial (DNI / NIE / NIF)
                      </label>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 inline-flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[11px]">lock</span>
                        Inmutable tras el alta
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ej. 12345678Z"
                        value={newMemberForm.documentNumber}
                        onChange={(e) => setNewMemberForm({ ...newMemberForm, documentNumber: e.target.value })}
                        className="w-full h-10 px-3.5 pl-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-border dark:border-slate-700 text-xs text-slate-dark dark:text-slate-100 font-mono outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                      <span className="material-symbols-outlined text-[16px] text-slate-subtext absolute left-3 top-3">
                        badge
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-subtext dark:text-slate-400">
                      Quedará formalmente vinculado a las actas e inspecciones oficiales del auditor.
                    </p>
                  </div>

                  {/* Nombre Completo */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-dark dark:text-slate-200">
                      Nombre Completo Oficial *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Ej. Dr. Mario Santos"
                        value={newMemberForm.fullName}
                        onChange={(e) => setNewMemberForm({ ...newMemberForm, fullName: e.target.value })}
                        className="w-full h-10 px-3.5 pl-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-border dark:border-slate-700 text-xs text-slate-dark dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                      <span className="material-symbols-outlined text-[16px] text-slate-subtext absolute left-3 top-3">
                        person
                      </span>
                    </div>
                  </div>

                  {/* Correo Corporativo */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-dark dark:text-slate-200">
                      Correo Corporativo de Acceso *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="mario@empresa.com"
                        value={newMemberForm.email}
                        onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                        className="w-full h-10 px-3.5 pl-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-border dark:border-slate-700 text-xs text-slate-dark dark:text-slate-100 font-mono outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                      <span className="material-symbols-outlined text-[16px] text-slate-subtext absolute left-3 top-3">
                        mail
                      </span>
                    </div>
                  </div>

                  {/* Teléfono de Contacto */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-dark dark:text-slate-200">
                      Teléfono de Contacto Profesional
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        placeholder="Ej. +34 600 000 000"
                        value={newMemberForm.phone}
                        onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                        className="w-full h-10 px-3.5 pl-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-border dark:border-slate-700 text-xs text-slate-dark dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                      <span className="material-symbols-outlined text-[16px] text-slate-subtext absolute left-3 top-3">
                        phone
                      </span>
                    </div>
                  </div>

                  {/* Nivel de Acceso */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-dark dark:text-slate-200">
                      Nivel de Acceso *
                    </label>
                    <select
                      value={newMemberForm.role}
                      onChange={(e) =>
                        setNewMemberForm({
                          ...newMemberForm,
                          role: e.target.value as "AUDITOR" | "TENANT_ADMIN" | "VIEWER",
                        })
                      }
                      className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-border dark:border-slate-700 text-xs text-slate-dark dark:text-slate-100 font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="AUDITOR">AUDITOR (Inspector de Campo)</option>
                      <option value="TENANT_ADMIN">TENANT_ADMIN (Gestor de Empresa)</option>
                      <option value="VIEWER">VIEWER (Solo Consulta)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-space-sm border-t border-slate-border/60 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-subtext hover:bg-slate-surface dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingMember}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary-container text-white transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isAddingMember ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Registrando...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                        <span>Crear & Generar Contraseña</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: Credenciais e Senha Temporária */}
        {credentialsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-space-lg shadow-2xl border border-primary/30 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2.5 text-primary mb-2">
                <span className="material-symbols-outlined text-[28px]">key</span>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  {credentialsModal.title}
                </h3>
              </div>

              <div className="p-space-sm rounded-xl bg-surface border border-slate-border space-y-2 text-xs">
                <div>
                  <span className="text-slate-subtext font-bold uppercase text-[10px] block">Usuario / Login</span>
                  <span className="font-mono font-bold text-on-surface text-sm">{credentialsModal.userEmail}</span>
                </div>

                <div>
                  <span className="text-slate-subtext font-bold uppercase text-[10px] block">
                    Contraseña Temporal Oficial
                  </span>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container border border-slate-border mt-0.5">
                    <span className="font-mono font-black text-primary text-sm select-all">
                      {credentialsModal.tempPass}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(credentialsModal.tempPass)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-primary text-white hover:bg-primary-container transition-colors cursor-pointer"
                    >
                      {copiedText === credentialsModal.tempPass ? "¡Copiada!" : "Copiar"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-border/60">
                <button
                  type="button"
                  onClick={() => setCredentialsModal(null)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container cursor-pointer shadow-sm"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5: Invalidar Inspeção */}
        {auditToInvalidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-space-lg shadow-xl border border-alert-red/30 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2 text-alert-red mb-2">
                <span className="material-symbols-outlined text-[24px]">gpp_bad</span>
                <h2 className="font-title-md text-title-md font-bold text-on-surface">
                  Anular / Invalidar Inspección
                </h2>
              </div>
              <p className="text-xs text-slate-subtext mb-3">
                Esta acción marcará formalmente el acta de <strong>{auditToInvalidate.companyName}</strong> como INVALIDADA. Dejará de ser visible para los inspectores de campo y preservará el histórico para auditoría jurídica.
              </p>

              <form onSubmit={handleInvalidateAudit} className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-on-surface uppercase">
                    Motivo Legal / Técnico de la Anulación *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Ej. Error en la toma de muestra de temperatura o repetición por inconsistencia en el registro..."
                    value={invalidationReason}
                    onChange={(e) => setInvalidationReason(e.target.value)}
                    className="p-2.5 rounded-xl bg-surface border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-alert-red"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-border/60">
                  <button
                    type="button"
                    onClick={() => setAuditToInvalidate(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-subtext hover:bg-surface-container cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isInvalidating}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-alert-red text-white hover:bg-red-700 shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                    <span>{isInvalidating ? "Anulando..." : "Confirmar Anulación"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
