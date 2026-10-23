"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { offlineDb } from "@/infrastructure/offline/offline-audit.db";
import { useAuthGuard } from "@/presentation/hooks/useAuthGuard";
import { AuthLoadingScreen } from "@/presentation/components/AuthGuard";
import { ControlPointTemplate } from "@/domain/constants/default-control-points";

import {
  TenantItem,
  ContractHistoryItem,
  TenantUserItem,
  AdminAuditItem,
  NewTenantFormState,
  EditTenantFormState,
  NewUserFormState,
  EditTenantUserFormState,
  GeneratedCredentialsState,
} from "@/presentation/components/superadmin/types";

import { CreateTenantModal } from "@/presentation/components/superadmin/modals/CreateTenantModal";
import { EditTenantModal } from "@/presentation/components/superadmin/modals/EditTenantModal";
import { QuickSeatsModal } from "@/presentation/components/superadmin/modals/QuickSeatsModal";
import { TenantUsersModal } from "@/presentation/components/superadmin/modals/TenantUsersModal";
import { CredentialsModal } from "@/presentation/components/superadmin/modals/CredentialsModal";
import { ContractModal } from "@/presentation/components/superadmin/modals/ContractModal";
import { GlobalRubricModal } from "@/presentation/components/superadmin/modals/GlobalRubricModal";
import { TenantRubricModal } from "@/presentation/components/superadmin/modals/TenantRubricModal";

import { SuperAdminStatsCards } from "@/presentation/components/superadmin/tabs/SuperAdminStatsCards";
import { TenantsTable } from "@/presentation/components/superadmin/tabs/TenantsTable";

export default function SuperAdminPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthGuard({ requiredRole: "PLATFORM_SUPERADMIN" });

  // Main Data States
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [adminAudits, setAdminAudits] = useState<AdminAuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals Visibility & Selection States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTenantForSeats, setSelectedTenantForSeats] = useState<TenantItem | null>(null);
  const [newSeatsValue, setNewSeatsValue] = useState<number>(5);

  const [selectedTenantForUsers, setSelectedTenantForUsers] = useState<TenantItem | null>(null);
  const [tenantUsers, setTenantUsers] = useState<TenantUserItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);

  const [credentialsModal, setCredentialsModal] = useState<GeneratedCredentialsState | null>(null);

  const [selectedTenantForContract, setSelectedTenantForContract] = useState<TenantItem | null>(null);
  const [contractHistory, setContractHistory] = useState<ContractHistoryItem[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);

  const [selectedTenantForEdit, setSelectedTenantForEdit] = useState<TenantItem | null>(null);
  const [isUpdatingTenant, setIsUpdatingTenant] = useState(false);
  const [editTenantForm, setEditTenantForm] = useState<EditTenantFormState>({
    name: "",
    cif: "",
    address: "",
    phone: "",
    planTier: "PRO",
    adminName: "",
    adminEmail: "",
    maxUserSeats: 5,
  });

  const [newTenant, setNewTenant] = useState<NewTenantFormState>({
    name: "",
    cif: "",
    address: "",
    phone: "",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    adminDocumentNumber: "",
    planId: "",
    paymentStatus: "COURTESY",
    invoiceRef: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Global Rubric States
  const [globalRubricPointsCount, setGlobalRubricPointsCount] = useState<number>(30);
  const [showGlobalRubricModal, setShowGlobalRubricModal] = useState(false);
  const [globalRubricPoints, setGlobalRubricPoints] = useState<ControlPointTemplate[]>([]);
  const [isLoadingGlobalRubric, setIsLoadingGlobalRubric] = useState(false);
  const [isSavingGlobalRubric, setIsSavingGlobalRubric] = useState(false);

  // Tenant Rubric States
  const [selectedTenantForRubric, setSelectedTenantForRubric] = useState<TenantItem | null>(null);
  const [tenantRubricPoints, setTenantRubricPoints] = useState<ControlPointTemplate[]>([]);
  const [isTenantRubricCustomized, setIsTenantRubricCustomized] = useState(false);
  const [isLoadingTenantRubric, setIsLoadingTenantRubric] = useState(false);
  const [isSavingTenantRubric, setIsSavingTenantRubric] = useState(false);

  // Load Initial Data
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
      // Fallback offline / rede
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdminAudits = async () => {
    try {
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
      // Fallback
    }
  };

  const fetchGlobalRubricCount = async () => {
    try {
      const res = await fetch("/api/superadmin/rubrica");
      const json = await res.json();
      if (json.success && json.rubric?.templates) {
        setGlobalRubricPointsCount(json.rubric.templates.length);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchAdminAudits();
    fetchGlobalRubricCount();
  }, []);

  // Tenant Actions
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
        setShowCreateModal(false);
        setNewTenant({
          name: "",
          cif: "",
          address: "",
          phone: "",
          adminName: "",
          adminEmail: "",
          planTier: "PRO",
          maxUserSeats: 5,
          subscriptionDays: 365,
          paymentStatus: "PAID",
          invoiceRef: "",
          notes: "",
        });
        fetchTenants();

        if (json.adminTempPassword) {
          setCredentialsModal({
            title: "Empresa Registrada con Administrador",
            subtitle: "Se ha generado una cuenta de Administrador de Tenant con contraseña temporal oficial.",
            email: json.tenant.adminEmail,
            password: json.adminTempPassword,
            role: "TENANT_ADMIN",
            fullName: json.tenant.adminName || json.tenant.name,
          });
        } else {
          setNotification({ type: "success", message: `Empresa "${json.tenant.name}" registrada con éxito.` });
        }
      } else {
        setNotification({ type: "error", message: json.error || "Error al registrar la empresa." });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Error de conexión." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (tenant: TenantItem) => {
    setSelectedTenantForEdit(tenant);
    setEditTenantForm({
      name: tenant.name,
      cif: tenant.cif,
      address: tenant.address || "",
      phone: tenant.phone || "",
      adminName: tenant.adminName || "",
      adminEmail: tenant.adminEmail || "",
      planTier: tenant.planTier || "PRO",
      maxUserSeats: tenant.maxUserSeats || 5,
    });
  };

  const handleSaveTenantEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForEdit) return;
    setIsUpdatingTenant(true);

    try {
      const res = await fetch(`/api/superadmin/tenants/${selectedTenantForEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editTenantForm.name,
          address: editTenantForm.address,
          phone: editTenantForm.phone,
          adminName: editTenantForm.adminName,
          adminEmail: editTenantForm.adminEmail,
          planTier: editTenantForm.planTier,
          maxUserSeats: Number(editTenantForm.maxUserSeats),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success !== false) {
        setNotification({
          type: "success",
          message: `Datos de "${editTenantForm.name}" actualizados con éxito.`,
        });
        setSelectedTenantForEdit(null);
        fetchTenants();
      } else {
        alert(json.error || "Error al actualizar la empresa.");
      }
    } catch (err: any) {
      alert(err.message || "Error de conexión al actualizar la empresa.");
    } finally {
      setIsUpdatingTenant(false);
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
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setNotification({
          type: "success",
          message: `Estado de "${tenant.name}" cambiado a ${nextStatus === "ACTIVE" ? "Activa" : "Suspendida"}.`,
        });
        fetchTenants();
      } else {
        setNotification({ type: "error", message: json.error || "Error al cambiar estado." });
      }
    } catch {
      setNotification({ type: "error", message: "Error al actualizar el estado de la empresa." });
    }
  };

  const handleDeleteTenant = async (tenant: TenantItem) => {
    const confirmed = window.confirm(
      `¿Está absolutamente seguro de eliminar la empresa "${tenant.name}" (${tenant.cif})?\n\nEsta acción es irreversible y eliminará todos sus accesos e inspectores vinculados.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setNotification({
          type: "success",
          message: json.message || `Empresa "${tenant.name}" eliminada con éxito.`,
        });
        fetchTenants();
      } else {
        alert(json.error || "Error al eliminar la empresa.");
      }
    } catch {
      alert("Error de conexión al eliminar la empresa.");
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
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setNotification({
          type: "success",
          message: `Límite de inspectores de "${selectedTenantForSeats.name}" actualizado a ${newSeatsValue}.`,
        });
        setSelectedTenantForSeats(null);
        fetchTenants();
      } else {
        alert(json.error || "Error al guardar el cupo de inspectores.");
      }
    } catch {
      setNotification({ type: "error", message: "Error al guardar el límite de inspectores." });
    }
  };

  // User Management Handlers
  const fetchTenantUsers = async (tenant: TenantItem) => {
    setSelectedTenantForUsers(tenant);
    setIsLoadingUsers(true);
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}/users`);
      const json = await res.json();
      if (json.success) {
        setTenantUsers(json.users || []);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleAddTenantUser = async (form: NewUserFormState) => {
    if (!selectedTenantForUsers) return;
    setIsAddingUser(true);
    try {
      const res = await fetch(`/api/superadmin/tenants/${selectedTenantForUsers.id}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();

      if (json.success) {
        fetchTenantUsers(selectedTenantForUsers);
        fetchTenants();

        setCredentialsModal({
          title: "Nuevo Inspector / Usuario Registrado",
          subtitle: `Credencial creada con perfil ${json.user.role}.`,
          email: json.user.email,
          password: json.temporaryPassword,
          role: json.user.role,
          fullName: json.user.fullName,
        });
      } else {
        alert(json.error || "Error al vincular usuario.");
      }
    } catch (err: any) {
      alert(err.message || "Error al registrar usuario.");
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleResetUserPassword = async (user: TenantUserItem) => {
    if (!selectedTenantForUsers) return;
    const confirmed = window.confirm(
      `¿Deseas restablecer la contraseña de "${user.fullName}" (${user.email})? Se generará una nueva contraseña temporal segura.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/superadmin/tenants/${selectedTenantForUsers.id}/users/${user.userId}/reset-password`,
        { method: "POST" }
      );
      const json = await res.json();

      if (json.success) {
        setCredentialsModal({
          title: "Contraseña Restablecida con Éxito",
          subtitle: "La contraseña anterior ha sido invalidada. Proporcione esta nueva credencial temporal al usuario.",
          email: user.email,
          password: json.temporaryPassword,
          role: user.role,
          fullName: user.fullName,
        });
      } else {
        alert(json.error || "Error al restablecer contraseña.");
      }
    } catch (err: any) {
      alert(err.message || "Error al restablecer contraseña.");
    }
  };

  const handleSaveUserEdit = async (
    user: TenantUserItem,
    updated: EditTenantUserFormState
  ) => {
    if (!selectedTenantForUsers) return;
    setIsSavingUser(true);

    try {
      const res = await fetch(
        `/api/superadmin/tenants/${selectedTenantForUsers.id}/users/${user.userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        }
      );
      const json = await res.json();

      if (json.success) {
        setNotification({
          type: "success",
          message: `Inspector "${updated.fullName}" actualizado con éxito.`,
        });
        fetchTenantUsers(selectedTenantForUsers);
        fetchTenants();
      } else {
        alert(json.error || "Error al actualizar inspector.");
      }
    } catch (err: any) {
      alert(err.message || "Error al guardar los cambios del inspector.");
    } finally {
      setIsSavingUser(false);
    }
  };

  // Contract Handlers
  const fetchContractHistory = async (tenant: TenantItem) => {
    setSelectedTenantForContract(tenant);
    setIsLoadingContracts(true);
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}/contracts`);
      const json = await res.json();
      if (json.success) {
        setContractHistory(json.contracts || []);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingContracts(false);
    }
  };

  const handleRenewContract = async (form: {
    durationOption: "365" | "180" | "90" | "30" | "custom";
    customDate: string;
    newSeats: number;
    paymentStatus: "PAID" | "COURTESY" | "PENDING_PAYMENT";
    amount: number;
    invoiceRef: string;
    notes: string;
  }) => {
    if (!selectedTenantForContract) return;
    setIsRenewing(true);

    let daysToAdd: number | undefined;
    let newExpiresAt: string | undefined;

    if (form.durationOption === "custom") {
      if (!form.customDate) {
        alert("Por favor seleccione una fecha de vencimiento personalizada.");
        setIsRenewing(false);
        return;
      }
      newExpiresAt = new Date(form.customDate).toISOString();
    } else {
      daysToAdd = Number(form.durationOption);
    }

    try {
      const res = await fetch(`/api/superadmin/tenants/${selectedTenantForContract.id}/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daysToAdd,
          newExpiresAt,
          newSeats: Number(form.newSeats),
          paymentStatus: form.paymentStatus,
          amount: form.amount ? Number(form.amount) : undefined,
          invoiceRef: form.invoiceRef,
          notes: form.notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNotification({
          type: "success",
          message: `Contrato de "${selectedTenantForContract.name}" actualizado con éxito.`,
        });
        fetchTenants();
        fetchContractHistory(selectedTenantForContract);
      } else {
        alert(json.error || "Error al actualizar contrato.");
      }
    } catch (err: any) {
      alert(err.message || "Error al procesar la renovación de contrato.");
    } finally {
      setIsRenewing(false);
    }
  };

  // Global Rubric Handlers
  const handleOpenGlobalRubric = async () => {
    setShowGlobalRubricModal(true);
    setIsLoadingGlobalRubric(true);
    try {
      const res = await fetch("/api/superadmin/rubrica");
      const json = await res.json();
      if (json.success && json.rubric?.templates) {
        setGlobalRubricPoints(json.rubric.templates);
        setGlobalRubricPointsCount(json.rubric.templates.length);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingGlobalRubric(false);
    }
  };

  const handleSaveGlobalRubric = async (pointsToSave?: ControlPointTemplate[]) => {
    const list = pointsToSave || globalRubricPoints;
    if (list.length === 0) {
      alert("La rúbrica debe contener al menos 1 punto de control.");
      return;
    }
    setIsSavingGlobalRubric(true);
    try {
      const res = await fetch("/api/superadmin/rubrica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates: list }),
      });
      const json = await res.json();
      if (json.success) {
        setNotification({
          type: "success",
          message: "Rúbrica Base Oficial actualizada con éxito.",
        });
        setGlobalRubricPoints(json.rubric?.templates || list);
        setGlobalRubricPointsCount(json.rubric?.templates?.length || list.length);
      } else {
        alert(json.error || "Error al actualizar rúbrica base.");
      }
    } catch (err: any) {
      alert(err.message || "Error al guardar la rúbrica base.");
    } finally {
      setIsSavingGlobalRubric(false);
    }
  };

  const handleResetGlobalRubric = async () => {
    const confirmed = window.confirm(
      "¿Desea restaurar la Rúbrica Base Oficial a los 30 puntos normativos originales de la plataforma? Todos los cambios manuales en la base se reajustarán."
    );
    if (!confirmed) return;
    setIsSavingGlobalRubric(true);
    try {
      const res = await fetch("/api/superadmin/rubrica", { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setNotification({
          type: "success",
          message: "Rúbrica Base restablecida a los 30 puntos oficiales por defecto.",
        });
        setGlobalRubricPoints(json.rubric?.templates || []);
        setGlobalRubricPointsCount(json.rubric?.templates?.length || 30);
      } else {
        alert(json.error || "Error al restaurar.");
      }
    } catch (err: any) {
      alert(err.message || "Error al restaurar.");
    } finally {
      setIsSavingGlobalRubric(false);
    }
  };

  // Tenant Rubric Handlers
  const handleOpenTenantRubric = async (tenant: TenantItem) => {
    setSelectedTenantForRubric(tenant);
    setIsLoadingTenantRubric(true);
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}/rubrica`);
      const json = await res.json();
      if (json.success && json.rubric) {
        setTenantRubricPoints(json.rubric.templates || []);
        setIsTenantRubricCustomized(Boolean(json.rubric.isCustomized));
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingTenantRubric(false);
    }
  };

  const handleCloneBaseRubricForTenant = async () => {
    try {
      const res = await fetch("/api/superadmin/rubrica");
      const json = await res.json();
      if (json.success && json.rubric?.templates) {
        const cloned = json.rubric.templates.map((p: ControlPointTemplate) => ({ ...p }));
        setTenantRubricPoints(cloned);
        setIsTenantRubricCustomized(true);
      }
    } catch {
      alert("Error al cargar la rúbrica base para clonación.");
    }
  };

  const handleCreateBlankRubricForTenant = () => {
    setTenantRubricPoints([]);
    setIsTenantRubricCustomized(true);
  };

  const handleSaveTenantRubric = async () => {
    if (!selectedTenantForRubric) return;
    if (tenantRubricPoints.length === 0) {
      alert("La rúbrica debe contener al menos 1 punto de control.");
      return;
    }
    setIsSavingTenantRubric(true);
    try {
      const res = await fetch(`/api/superadmin/tenants/${selectedTenantForRubric.id}/rubrica`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates: tenantRubricPoints }),
      });
      const json = await res.json();
      if (json.success) {
        setNotification({
          type: "success",
          message: `Rúbrica personalizada para "${selectedTenantForRubric.name}" guardada con éxito (${tenantRubricPoints.length} puntos).`,
        });
        setIsTenantRubricCustomized(true);
        setSelectedTenantForRubric(null);
      } else {
        alert(json.error || "Error al guardar la rúbrica de la empresa.");
      }
    } catch (err: any) {
      alert(err.message || "Error al guardar.");
    } finally {
      setIsSavingTenantRubric(false);
    }
  };

  const totalActiveUsers = tenants.reduce((acc, t) => acc + t.activeUsersCount, 0);

  if (isAuthLoading || !isAuthenticated) {
    return <AuthLoadingScreen />;
  }

  return (
    <>
      
      <main className="flex-1 flex flex-col relative w-full pt-20 pb-24 bg-surface dark:bg-slate-950 min-h-screen">
        <div className="w-full max-w-5xl mx-auto px-margin-mobile space-y-space-md">
          {/* Hero Banner Gobernanza */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-md sm:p-space-lg border border-slate-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
            <div className="flex-1 min-w-0 pr-0 md:pr-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider mb-2 whitespace-nowrap">
                <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                <span>Gobernanza de la Plataforma</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight leading-snug">
                Gobernanza de Empresas &amp; Clientes
              </h1>
              <p className="mt-1 text-body-sm text-slate-subtext max-w-xl leading-relaxed">
                Administre empresas clientes (Tenants), gestione contratos, inspectores oficiales y vigencia de licencias.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <Link
                href="/superadmin/planos"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-border text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">loyalty</span>
                <span>Planes de Suscripción</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_business</span>
                <span>Nueva Empresa</span>
              </button>
            </div>
          </div>

          {/* Notificações */}
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

          {/* Top KPI Cards Component */}
          <SuperAdminStatsCards
            tenantsCount={tenants.length}
            totalActiveUsers={totalActiveUsers}
            adminAuditsCount={adminAudits.length}
            globalRubricPointsCount={globalRubricPointsCount}
            onOpenGlobalRubric={handleOpenGlobalRubric}
          />

          {/* Tabela de Empresas Clientes (Tenants) */}
          <TenantsTable
            tenants={tenants}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            isLoading={isLoading}
            onRefresh={fetchTenants}
            onOpenEdit={handleOpenEditModal}
            onOpenContract={fetchContractHistory}
            onOpenRubric={handleOpenTenantRubric}
            onOpenUsers={fetchTenantUsers}
            onToggleStatus={handleToggleStatus}
            onDeleteTenant={handleDeleteTenant}
          />
        </div>

        {/* MODAIS MODULARES */}
        <CreateTenantModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          form={newTenant}
          setForm={setNewTenant}
          onSubmit={handleCreateTenant}
          isSubmitting={isSubmitting}
        />

        <QuickSeatsModal
          tenant={selectedTenantForSeats}
          onClose={() => setSelectedTenantForSeats(null)}
          seatsValue={newSeatsValue}
          setSeatsValue={setNewSeatsValue}
          onSave={handleSaveSeats}
        />

        <EditTenantModal
          tenant={selectedTenantForEdit}
          onClose={() => setSelectedTenantForEdit(null)}
          form={editTenantForm}
          setForm={setEditTenantForm}
          onSubmit={handleSaveTenantEdit}
          isSubmitting={isUpdatingTenant}
        />

        <TenantUsersModal
          tenant={selectedTenantForUsers}
          onClose={() => setSelectedTenantForUsers(null)}
          users={tenantUsers}
          isLoading={isLoadingUsers}
          onAddUser={handleAddTenantUser}
          isAddingUser={isAddingUser}
          onEditUser={handleSaveUserEdit}
          isSavingUser={isSavingUser}
          onResetPassword={handleResetUserPassword}
        />

        <CredentialsModal
          credentials={credentialsModal}
          onClose={() => setCredentialsModal(null)}
        />

        <ContractModal
          tenant={selectedTenantForContract}
          onClose={() => setSelectedTenantForContract(null)}
          contracts={contractHistory}
          isLoadingContracts={isLoadingContracts}
          onRenewContract={handleRenewContract}
          isRenewing={isRenewing}
        />

        <GlobalRubricModal
          isOpen={showGlobalRubricModal}
          onClose={() => setShowGlobalRubricModal(false)}
          points={globalRubricPoints}
          setPoints={setGlobalRubricPoints}
          isLoading={isLoadingGlobalRubric}
          onSave={handleSaveGlobalRubric}
          isSaving={isSavingGlobalRubric}
          onReset={handleResetGlobalRubric}
        />

        <TenantRubricModal
          tenant={selectedTenantForRubric}
          onClose={() => setSelectedTenantForRubric(null)}
          points={tenantRubricPoints}
          setPoints={setTenantRubricPoints}
          isCustomized={isTenantRubricCustomized}
          isLoading={isLoadingTenantRubric}
          onCloneBase={handleCloneBaseRubricForTenant}
          onCreateBlank={handleCreateBlankRubricForTenant}
          onSave={handleSaveTenantRubric}
          isSaving={isSavingTenantRubric}
        />
      </main>
    </>
  );
}
