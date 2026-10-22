"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/presentation/components/Header";
import { offlineDb } from "@/infrastructure/offline/offline-audit.db";
import { useAuthGuard } from "@/presentation/hooks/useAuthGuard";
import { AuthLoadingScreen } from "@/presentation/components/AuthGuard";
import { ControlPointTemplate } from "@/domain/constants/default-control-points";

const CATEGORY_OPTIONS = [
  { category: "INFRAESTRUCTURA", label: "Infraestructura y Equipos" },
  { category: "HIGIENE_PERSONAL", label: "Higiene y Prácticas del Personal" },
  { category: "OPERACIONES_TEMPERATURAS", label: "Operaciones y Cadena de Frío" },
  { category: "TRAZABILIDAD_DOCUMENTACION", label: "Trazabilidad y APPCC" },
  { category: "LIMPIEZA_GESTION_RESIDUOS", label: "Limpieza, Desinfección y Plagas" },
];

interface TenantItem {
  id: string;
  name: string;
  cif: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  address?: string;
  phone?: string;
  adminEmail?: string;
  adminName?: string;
  planTier: string;
  maxUserSeats: number;
  activeUsersCount: number;
  subscriptionStatus: string;
  paymentStatus?: "PAID" | "COURTESY" | "PENDING_PAYMENT";
  invoiceRef?: string;
  notes?: string;
  validFrom: string;
  expiresAt: string;
  daysRemaining: number;
  isExpired: boolean;
  createdAt: string;
}

interface ContractHistoryItem {
  id: string;
  tenantId: string;
  subscriptionId?: string;
  actionType: "CREATION" | "RENEWAL" | "SEATS_CHANGE" | "EXPIRATION_EXTENDED" | "MANUAL_ADJUSTMENT";
  validFrom: string;
  expiresAt: string;
  daysAdded: number;
  seats: number;
  paymentStatus: "PAID" | "COURTESY" | "PENDING_PAYMENT";
  amount?: number;
  invoiceRef?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

interface TenantUserItem {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: "TENANT_ADMIN" | "AUDITOR" | "INSPECTOR" | "VIEWER";
  canViewAllTenantAudits: boolean;
  isActive: boolean;
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
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthGuard({ requiredRole: "PLATFORM_SUPERADMIN" });
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [adminAudits, setAdminAudits] = useState<AdminAuditItem[]>([]);
  const [activeTab, setActiveTab] = useState<"tenants" | "inspections">("tenants");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAudits, setIsLoadingAudits] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTenantForSeats, setSelectedTenantForSeats] = useState<TenantItem | null>(null);
  const [newSeatsValue, setNewSeatsValue] = useState<number>(5);

  // Gestão de Usuários do Tenant
  const [selectedTenantForUsers, setSelectedTenantForUsers] = useState<TenantItem | null>(null);
  const [tenantUsers, setTenantUsers] = useState<TenantUserItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState<{
    email: string;
    fullName: string;
    role: "TENANT_ADMIN" | "AUDITOR" | "VIEWER";
  }>({
    email: "",
    fullName: "",
    role: "AUDITOR",
  });

  // Edição de Inspetor existente
  const [editingUser, setEditingUser] = useState<TenantUserItem | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [editUserForm, setEditUserForm] = useState<{
    fullName: string;
    role: "TENANT_ADMIN" | "AUDITOR" | "VIEWER";
    isActive: boolean;
  }>({
    fullName: "",
    role: "AUDITOR",
    isActive: true,
  });

  // Modais de Senha Temporária / Credenciais
  const [credentialsModal, setCredentialsModal] = useState<{
    title: string;
    tenantName?: string;
    userEmail: string;
    tempPass: string;
    subtitle?: string;
  } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Gestão e Renovação de Contrato & Histórico
  const [selectedTenantForContract, setSelectedTenantForContract] = useState<TenantItem | null>(null);
  const [contractHistory, setContractHistory] = useState<ContractHistoryItem[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [renewalForm, setRenewalForm] = useState<{
    durationOption: "30" | "90" | "180" | "365" | "custom";
    customDate: string;
    newSeats: number;
    paymentStatus: "PAID" | "COURTESY" | "PENDING_PAYMENT";
    amount: string;
    invoiceRef: string;
    notes: string;
  }>({
    durationOption: "365",
    customDate: "",
    newSeats: 5,
    paymentStatus: "PAID",
    amount: "",
    invoiceRef: "",
    notes: "",
  });

  // Edição Geral de Empresa (Tenant) - Todos os campos editáveis EXCETO o documento (CIF)
  const [selectedTenantForEdit, setSelectedTenantForEdit] = useState<TenantItem | null>(null);
  const [isUpdatingTenant, setIsUpdatingTenant] = useState(false);
  const [editTenantForm, setEditTenantForm] = useState<{
    name: string;
    cif: string; // Apenas leitura
    address: string;
    phone: string;
    adminName: string;
    adminEmail: string;
    planTier: string;
    maxUserSeats: number;
  }>({
    name: "",
    cif: "",
    address: "",
    phone: "",
    adminName: "",
    adminEmail: "",
    planTier: "PRO",
    maxUserSeats: 5,
  });

  // Formulário de nova empresa (Tenant)
  const [newTenant, setNewTenant] = useState({
    name: "",
    cif: "",
    address: "",
    phone: "",
    adminName: "",
    adminEmail: "",
    planTier: "PRO",
    maxUserSeats: 5,
    subscriptionDays: 365,
    paymentStatus: "PAID" as "PAID" | "COURTESY" | "PENDING_PAYMENT",
    invoiceRef: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Gestão de Rúbrica Base Global
  const [globalRubricPointsCount, setGlobalRubricPointsCount] = useState<number>(30);
  const [showGlobalRubricModal, setShowGlobalRubricModal] = useState(false);
  const [globalRubricPoints, setGlobalRubricPoints] = useState<ControlPointTemplate[]>([]);
  const [isLoadingGlobalRubric, setIsLoadingGlobalRubric] = useState(false);
  const [isSavingGlobalRubric, setIsSavingGlobalRubric] = useState(false);
  const [editingGlobalPointIndex, setEditingGlobalPointIndex] = useState<number | null>(null);
  const [showAddGlobalPointForm, setShowAddGlobalPointForm] = useState(false);
  const [globalRubricFilter, setGlobalRubricFilter] = useState("");
  const [newGlobalPoint, setNewGlobalPoint] = useState<ControlPointTemplate>({
    code: "",
    category: "INFRAESTRUCTURA" as any,
    categoryLabel: "Infraestructura y Equipos",
    number: "",
    title: "",
    isCriticalCcp: false,
    legalReference: "RD 852/2004",
    isActive: true,
  });

  // Gestão de Rúbrica Personalizada por Tenant
  const [selectedTenantForRubric, setSelectedTenantForRubric] = useState<TenantItem | null>(null);
  const [tenantRubricPoints, setTenantRubricPoints] = useState<ControlPointTemplate[]>([]);
  const [isTenantRubricCustomized, setIsTenantRubricCustomized] = useState(false);
  const [isLoadingTenantRubric, setIsLoadingTenantRubric] = useState(false);
  const [isSavingTenantRubric, setIsSavingTenantRubric] = useState(false);
  const [editingTenantPointIndex, setEditingTenantPointIndex] = useState<number | null>(null);
  const [showAddTenantPointForm, setShowAddTenantPointForm] = useState(false);
  const [tenantRubricFilter, setTenantRubricFilter] = useState("");
  const [newTenantPoint, setNewTenantPoint] = useState<ControlPointTemplate>({
    code: "",
    category: "INFRAESTRUCTURA" as any,
    categoryLabel: "Infraestructura y Equipos",
    number: "",
    title: "",
    isCriticalCcp: false,
    legalReference: "RD 852/2004",
    isActive: true,
  });

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
      // fallback
    } finally {
      setIsLoadingAudits(false);
    }
  };

  const fetchTenantUsers = async (tenant: TenantItem) => {
    setSelectedTenantForUsers(tenant);
    setIsLoadingUsers(true);
    setShowAddUserForm(false);
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}/users`);
      const json = await res.json();
      if (json.success) {
        setTenantUsers(json.users || []);
      }
    } catch {
      // fallback
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchContractHistory = async (tenant: TenantItem) => {
    setSelectedTenantForContract(tenant);
    setRenewalForm({
      durationOption: "365",
      customDate: "",
      newSeats: tenant.maxUserSeats,
      paymentStatus: tenant.paymentStatus || "PAID",
      amount: "",
      invoiceRef: tenant.invoiceRef || "",
      notes: "",
    });
    setIsLoadingContracts(true);
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}/contracts`);
      const json = await res.json();
      if (json.success) {
        setContractHistory(json.contracts || []);
      }
    } catch {
      // fallback
    } finally {
      setIsLoadingContracts(false);
    }
  };

  const handleRenewContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForContract) return;
    setIsRenewing(true);

    let daysToAdd: number | undefined;
    let newExpiresAt: string | undefined;

    if (renewalForm.durationOption === "custom") {
      if (!renewalForm.customDate) {
        alert("Por favor seleccione una fecha de vencimiento personalizada.");
        setIsRenewing(false);
        return;
      }
      newExpiresAt = new Date(renewalForm.customDate).toISOString();
    } else {
      daysToAdd = Number(renewalForm.durationOption);
    }

    try {
      const res = await fetch(`/api/superadmin/tenants/${selectedTenantForContract.id}/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daysToAdd,
          newExpiresAt,
          newSeats: Number(renewalForm.newSeats),
          paymentStatus: renewalForm.paymentStatus,
          amount: renewalForm.amount ? Number(renewalForm.amount) : undefined,
          invoiceRef: renewalForm.invoiceRef,
          notes: renewalForm.notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNotification({
          type: "success",
          message: `Contrato de "${selectedTenantForContract.name}" actualizado con éxito (${
            renewalForm.paymentStatus === "PAID"
              ? "Pagado"
              : renewalForm.paymentStatus === "COURTESY"
              ? "Bonificado"
              : "Boleto Pendiente"
          }).`,
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

  useEffect(() => {
    fetchTenants();
    fetchAdminAudits();
    fetchGlobalRubricCount();
  }, []);

  const fetchGlobalRubricCount = async () => {
    try {
      const res = await fetch("/api/superadmin/rubrica");
      const json = await res.json();
      if (json.success && json.rubric?.templates) {
        setGlobalRubricPointsCount(json.rubric.templates.length);
      }
    } catch {
      // fallback
    }
  };

  const handleOpenGlobalRubric = async () => {
    setShowGlobalRubricModal(true);
    setIsLoadingGlobalRubric(true);
    setEditingGlobalPointIndex(null);
    setShowAddGlobalPointForm(false);
    setGlobalRubricFilter("");
    try {
      const res = await fetch("/api/superadmin/rubrica");
      const json = await res.json();
      if (json.success && json.rubric?.templates) {
        setGlobalRubricPoints(json.rubric.templates);
        setGlobalRubricPointsCount(json.rubric.templates.length);
      }
    } catch {
      // fallback
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
        setEditingGlobalPointIndex(null);
        setShowAddGlobalPointForm(false);
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
        setEditingGlobalPointIndex(null);
        setShowAddGlobalPointForm(false);
      } else {
        alert(json.error || "Error al restaurar.");
      }
    } catch (err: any) {
      alert(err.message || "Error al restaurar.");
    } finally {
      setIsSavingGlobalRubric(false);
    }
  };

  const handleToggleGlobalPointActive = (idx: number) => {
    const updated = [...globalRubricPoints];
    updated[idx] = {
      ...updated[idx],
      isActive: updated[idx].isActive === false ? true : false,
    };
    setGlobalRubricPoints(updated);
  };

  const handleDeleteGlobalPoint = (idx: number) => {
    const point = globalRubricPoints[idx];
    const confirmed = window.confirm(`¿Desea eliminar el punto "${point.number} - ${point.title}" de la base?`);
    if (!confirmed) return;
    const updated = globalRubricPoints.filter((_, i) => i !== idx);
    setGlobalRubricPoints(updated);
  };

  const handleAddGlobalPoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGlobalPoint.number || !newGlobalPoint.title) {
      alert("Por favor complete el número y título del punto.");
      return;
    }
    const catObj = CATEGORY_OPTIONS.find((c) => c.category === newGlobalPoint.category) || CATEGORY_OPTIONS[0];
    const pointToAdd: ControlPointTemplate = {
      ...newGlobalPoint,
      code: newGlobalPoint.code || `cp_custom_${Date.now()}`,
      categoryLabel: catObj.label,
      isActive: true,
    };
    const updated = [...globalRubricPoints, pointToAdd];
    setGlobalRubricPoints(updated);
    setShowAddGlobalPointForm(false);
    setNewGlobalPoint({
      code: "",
      category: "INFRAESTRUCTURA" as any,
      categoryLabel: "Infraestructura y Equipos",
      number: "",
      title: "",
      isCriticalCcp: false,
      legalReference: "RD 852/2004",
      isActive: true,
    });
  };

  // Funções do Tenant Rubric
  const handleOpenTenantRubric = async (tenant: TenantItem) => {
    setSelectedTenantForRubric(tenant);
    setIsLoadingTenantRubric(true);
    setEditingTenantPointIndex(null);
    setShowAddTenantPointForm(false);
    setTenantRubricFilter("");
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}/rubrica`);
      const json = await res.json();
      if (json.success && json.rubric) {
        setTenantRubricPoints(json.rubric.templates || []);
        setIsTenantRubricCustomized(Boolean(json.rubric.isCustomized));
      }
    } catch {
      // fallback
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

  const handleToggleTenantPointActive = (idx: number) => {
    const updated = [...tenantRubricPoints];
    updated[idx] = {
      ...updated[idx],
      isActive: updated[idx].isActive === false ? true : false,
    };
    setTenantRubricPoints(updated);
  };

  const handleDeleteTenantPoint = (idx: number) => {
    const point = tenantRubricPoints[idx];
    const confirmed = window.confirm(`¿Desea eliminar el punto "${point.number}" de la rúbrica de esta empresa?`);
    if (!confirmed) return;
    const updated = tenantRubricPoints.filter((_, i) => i !== idx);
    setTenantRubricPoints(updated);
  };

  const handleAddTenantPoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantPoint.number || !newTenantPoint.title) {
      alert("Por favor complete el número y título del punto.");
      return;
    }
    const catObj = CATEGORY_OPTIONS.find((c) => c.category === newTenantPoint.category) || CATEGORY_OPTIONS[0];
    const pointToAdd: ControlPointTemplate = {
      ...newTenantPoint,
      code: newTenantPoint.code || `cp_tenant_${Date.now()}`,
      categoryLabel: catObj.label,
      isActive: true,
    };
    const updated = [...tenantRubricPoints, pointToAdd];
    setTenantRubricPoints(updated);
    setShowAddTenantPointForm(false);
    setNewTenantPoint({
      code: "",
      category: "INFRAESTRUCTURA" as any,
      categoryLabel: "Infraestructura y Equipos",
      number: "",
      title: "",
      isCriticalCcp: false,
      legalReference: "RD 852/2004",
      isActive: true,
    });
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

  const handleResetTenantRubric = async () => {
    if (!selectedTenantForRubric) return;
    const confirmed = window.confirm(
      `¿Desea restaurar la empresa "${selectedTenantForRubric.name}" a la Rúbrica Base Oficial? Se eliminarán todas las personalizaciones exclusivas de este cliente.`
    );
    if (!confirmed) return;
    setIsSavingTenantRubric(true);
    try {
      const res = await fetch(`/api/superadmin/tenants/${selectedTenantForRubric.id}/rubrica`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setNotification({
          type: "success",
          message: `Rúbrica de "${selectedTenantForRubric.name}" restaurada a la Rúbrica Base Oficial.`,
        });
        setIsTenantRubricCustomized(false);
        setTenantRubricPoints(json.rubric?.templates || []);
      } else {
        alert(json.error || "Error al restaurar rúbrica.");
      }
    } catch (err: any) {
      alert(err.message || "Error al restaurar.");
    } finally {
      setIsSavingTenantRubric(false);
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
            tenantName: json.tenant.name,
            userEmail: json.tenant.adminEmail,
            tempPass: json.adminTempPassword,
            subtitle: "Se ha generado una cuenta de Administrador de Tenant con contraseña temporal oficial.",
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

  const handleAddTenantUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForUsers) return;
    setIsAddingUser(true);

    try {
      const res = await fetch(`/api/superadmin/tenants/${selectedTenantForUsers.id}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserForm),
      });
      const json = await res.json();

      if (json.success) {
        setShowAddUserForm(false);
        setNewUserForm({ email: "", fullName: "", role: "AUDITOR" });
        fetchTenantUsers(selectedTenantForUsers);
        fetchTenants();

        setCredentialsModal({
          title: "Nuevo Inspector / Usuario Registrado",
          tenantName: selectedTenantForUsers.name,
          userEmail: json.user.email,
          tempPass: json.temporaryPassword,
          subtitle: `Credencial creada con perfil ${json.user.role}.`,
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
          tenantName: selectedTenantForUsers.name,
          userEmail: user.email,
          tempPass: json.temporaryPassword,
          subtitle: "La contraseña anterior ha sido invalidada. Proporcione esta nueva credencial temporal al usuario.",
        });
      } else {
        alert(json.error || "Error al restablecer contraseña.");
      }
    } catch (err: any) {
      alert(err.message || "Error al restablecer contraseña.");
    }
  };

  const handleStartEditUser = (user: TenantUserItem) => {
    setEditingUser(user);
    setEditUserForm({
      fullName: user.fullName,
      role: user.role === "TENANT_ADMIN" ? "TENANT_ADMIN" : user.role === "VIEWER" ? "VIEWER" : "AUDITOR",
      isActive: user.isActive,
    });
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForUsers || !editingUser) return;
    setIsSavingUser(true);

    try {
      const res = await fetch(
        `/api/superadmin/tenants/${selectedTenantForUsers.id}/users/${editingUser.userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editUserForm),
        }
      );
      const json = await res.json();

      if (json.success) {
        setNotification({
          type: "success",
          message: `Inspector "${editUserForm.fullName}" actualizado con éxito.`,
        });
        setEditingUser(null);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.cif.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.adminEmail && t.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalSeats = tenants.reduce((acc, t) => acc + t.maxUserSeats, 0);
  const totalActiveUsers = tenants.reduce((acc, t) => acc + t.activeUsersCount, 0);

  if (isAuthLoading || !isAuthenticated) {
    return <AuthLoadingScreen />;
  }

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
                Administre empresas clientes (Tenants), gestione inspectores, restablezca contraseñas y asigne cupos oficiales con visibilidad exclusiva.
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
                {tenants.length}
              </div>
            </div>

            <div className="p-space-md rounded-2xl bg-surface-container-lowest border border-slate-border shadow-sm">
              <div className="flex items-center justify-between text-slate-subtext text-label-sm font-bold uppercase tracking-wider">
                <span>Inspectores</span>
                <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
              </div>
              <div className="mt-2 text-2xl font-black text-on-surface">
                {totalActiveUsers}
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

            <div
              onClick={handleOpenGlobalRubric}
              className="p-space-md rounded-2xl bg-surface-container-lowest border border-slate-border shadow-sm cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
              title="Haga clic para ver, editar, añadir o gestionar puntos de la Rúbrica Base Oficial"
            >
              <div className="flex items-center justify-between text-slate-subtext text-label-sm font-bold uppercase tracking-wider">
                <span className="group-hover:text-primary transition-colors">Rúbrica Base</span>
                <span className="material-symbols-outlined text-primary text-[20px] group-hover:scale-110 transition-transform">
                  fact_check
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-on-surface flex items-baseline justify-between">
                <span>{globalRubricPointsCount} Puntos</span>
                <span className="text-[11px] font-bold text-primary flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  <span>Gestionar</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
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
                    placeholder="Buscar por nombre, CIF o email de administrador..."
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
                      Haz clic en "Nueva Empresa" para dar de alta el primer cliente con su cuota de inspectores y administrador.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-container text-xs font-bold text-slate-subtext uppercase tracking-wider border-b border-slate-border">
                      <tr>
                        <th className="py-3 px-space-md">Empresa / Contacto</th>
                        <th className="py-3 px-space-md">Plan &amp; Estado</th>
                        <th className="py-3 px-space-md">Estado Contrato</th>
                        <th className="py-3 px-space-md">Inspectores Habilitados</th>
                        <th className="py-3 px-space-md">Vigencia Subscripción</th>
                        <th className="py-3 px-space-md text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-border/60 text-on-surface font-body-sm">
                      {filteredTenants.map((t) => (
                        <tr key={t.id} className="hover:bg-surface-container-low dark:hover:bg-slate-800/60 transition-colors">
                          <td className="py-space-md px-space-md">
                            <div className="font-bold text-on-surface text-sm">{t.name}</div>
                            <div className="text-label-sm text-slate-subtext font-mono mt-0.5">CIF: {t.cif}</div>
                            {t.address && (
                              <div className="text-xs text-slate-subtext flex items-center gap-1 mt-1">
                                <span className="material-symbols-outlined text-[14px]">location_on</span>
                                <span className="truncate max-w-xs">{t.address}</span>
                              </div>
                            )}
                            {(t.adminEmail || t.phone) && (
                              <div className="text-[11px] text-slate-subtext flex items-center gap-2 mt-1">
                                {t.adminEmail && (
                                  <span className="flex items-center gap-0.5" title="Administrador de Empresa">
                                    <span className="material-symbols-outlined text-[13px] text-primary">mail</span>
                                    <span>{t.adminEmail}</span>
                                  </span>
                                )}
                                {t.phone && (
                                  <span className="flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[13px]">phone</span>
                                    <span>{t.phone}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Coluna 2: Plan & Estado */}
                          <td className="py-space-md px-space-md">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-label-sm font-bold px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">
                                {t.planTier}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  t.status === "ACTIVE"
                                    ? "bg-status-pass-bg text-status-pass"
                                    : "bg-alert-red-bg/25 text-alert-red"
                                }`}
                              >
                                {t.status === "ACTIVE" ? "Activa" : "Suspendida"}
                              </span>
                            </div>
                          </td>

                          {/* Coluna 3: Estado Contrato (Saúde Financeira) */}
                          <td className="py-space-md px-space-md">
                            {t.isExpired ? (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-alert-red-bg/25 text-alert-red inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-alert-red" />
                                Vencido
                              </span>
                            ) : t.paymentStatus === "PENDING_PAYMENT" ? (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Boleto Pendiente
                              </span>
                            ) : t.paymentStatus === "COURTESY" ? (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                Bonificado
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Pagado / Al Día
                              </span>
                            )}
                          </td>

                          {/* Coluna 4: Inspectores Habilitados */}
                          <td className="py-space-md px-space-md">
                            <div className="font-bold text-on-surface text-sm">
                              {t.activeUsersCount} <span className="text-slate-subtext font-normal text-xs">/ {t.maxUserSeats}</span>
                            </div>
                            <div className="text-[11px] text-slate-subtext">inspectores activos</div>
                          </td>

                          {/* Coluna 5: Vigencia Subscripción */}
                          <td className="py-space-md px-space-md">
                            <div className="flex items-center gap-1.5 text-body-sm font-semibold">
                              <span className="material-symbols-outlined text-[16px] text-slate-subtext">calendar_today</span>
                              <span>{new Date(t.expiresAt).toLocaleDateString("es-ES")}</span>
                              <span className="text-label-sm text-slate-subtext font-normal">({t.daysRemaining}d)</span>
                            </div>
                          </td>

                          {/* Coluna 6: Acciones (Editar, Contrato, Rúbrica, Inspectores, Suspender/Reactivar) */}
                          <td className="py-space-md px-space-md text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(t)}
                                className="h-8 px-2.5 rounded-xl text-xs font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary text-on-surface inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-sm"
                                title="Editar datos de la empresa (documento fiscal inmutable)"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => fetchContractHistory(t)}
                                className="h-8 px-2.5 rounded-xl text-xs font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary text-on-surface inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-sm"
                                title="Ver contratos, renovar y salud del cliente"
                              >
                                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                                <span>Contrato</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenTenantRubric(t)}
                                className="h-8 px-2.5 rounded-xl text-xs font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary text-on-surface inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-sm"
                                title="Personalizar rúbrica para esta empresa"
                              >
                                <span className="material-symbols-outlined text-[16px]">fact_check</span>
                                <span>Rúbrica</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => fetchTenantUsers(t)}
                                className="h-8 px-2.5 rounded-xl text-xs font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary text-on-surface inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-sm"
                                title="Ver y gestionar inspectores del tenant"
                              >
                                <span className="material-symbols-outlined text-[16px]">group</span>
                                <span>Inspectores</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStatus(t)}
                                className={`h-8 px-2.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-sm ${
                                  t.status === "ACTIVE"
                                    ? "bg-surface-container hover:bg-alert-red-bg/25 hover:text-alert-red text-on-surface"
                                    : "bg-status-pass-bg hover:bg-status-pass/20 text-status-pass"
                                }`}
                                title={t.status === "ACTIVE" ? "Suspender acceso a la empresa" : "Reactivar acceso a la empresa"}
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  {t.status === "ACTIVE" ? "block" : "check_circle"}
                                </span>
                                <span>{t.status === "ACTIVE" ? "Suspender" : "Reactivar"}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ABA 2: TABELA DE AUDITORIAS PRIVADAS */}
          {activeTab === "inspections" && (
            <div className="bg-surface-container-lowest rounded-2xl border border-slate-border shadow-sm overflow-hidden animate-in fade-in duration-150">
              <div className="p-space-md border-b border-slate-border flex items-center justify-between">
                <div>
                  <h3 className="font-title-md text-title-md text-on-surface font-bold">
                    Mis Inspecciones Sanitarias Oficiales
                  </h3>
                  <p className="text-xs text-slate-subtext mt-0.5">
                    Visibilidad confidencial protegida exclusivamente para su perfil de SuperAdministrador.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchAdminAudits}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-dark dark:text-slate-200 hover:bg-surface-container dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                    <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mx-auto mb-3 text-slate-subtext">
                      <span className="material-symbols-outlined text-[36px]">assignment_turned_in</span>
                    </div>
                    <h3 className="font-title-md text-title-md text-on-surface font-bold">
                      No hay inspecciones privadas registradas
                    </h3>
                    <p className="text-body-sm text-slate-subtext mt-1 max-w-sm mx-auto">
                      Las auditorías realizadas desde su perfil oficial se guardan con escopo confidencial y aparecerán listadas aquí.
                    </p>
                    <Link
                      href="/auditorias/nova"
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs uppercase"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      <span>Iniciar Nueva Inspección</span>
                    </Link>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-container text-xs font-bold text-slate-subtext uppercase tracking-wider border-b border-slate-border">
                      <tr>
                        <th className="py-3 px-space-md">Empresa Inspeccionada</th>
                        <th className="py-3 px-space-md">Fecha de Inspección</th>
                        <th className="py-3 px-space-md">Puntuación / Veredicto</th>
                        <th className="py-3 px-space-md">Estado</th>
                        <th className="py-3 px-space-md text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-border/60 text-on-surface font-body-sm">
                      {adminAudits.map((a) => (
                        <tr key={a.id} className="hover:bg-surface-container-low dark:hover:bg-slate-800/60 transition-colors">
                          <td className="py-space-md px-space-md">
                            <div className="font-bold text-on-surface">{a.companyName}</div>
                            <div className="text-label-sm text-slate-subtext font-mono">CIF: {a.companyCif}</div>
                          </td>

                          <td className="py-space-md px-space-md">
                            <div className="text-body-sm">
                              {new Date(a.inspectionDate).toLocaleDateString("es-ES")}
                            </div>
                          </td>

                          <td className="py-space-md px-space-md">
                            {a.complianceScore !== undefined && a.complianceScore !== null ? (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-on-surface">{a.complianceScore}%</span>
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
                              <span className="text-slate-subtext text-xs">En evaluación</span>
                            )}
                          </td>

                          <td className="py-space-md px-space-md">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
                              {a.status === "FINALIZED" ? "Finalizada" : "En Curso"}
                            </span>
                          </td>

                          <td className="py-space-md px-space-md text-right">
                            <div className="flex items-center justify-end gap-2">
                              {a.status === "FINALIZED" ? (
                                <Link
                                  href={`/auditorias/${a.id}/relatorio?company=${encodeURIComponent(
                                    a.companyName
                                  )}&cif=${encodeURIComponent(a.companyCif)}`}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                >
                                  Ver Laudo
                                </Link>
                              ) : (
                                <Link
                                  href={`/auditorias/${a.id}/rubrica?company=${encodeURIComponent(
                                    a.companyName
                                  )}&cif=${encodeURIComponent(a.companyCif)}`}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                                >
                                  Continuar Rúbrica
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL 1: Dar de Alta Nueva Empresa (Tenant Completo) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl p-space-lg shadow-xl border border-slate-border animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-space-sm border-b border-slate-border/70 pb-3">
                <div>
                  <h2 className="font-title-md text-title-md text-on-surface font-bold">
                    Dar de Alta Nueva Empresa (Tenant)
                  </h2>
                  <p className="text-xs text-slate-subtext">
                    Registre la empresa cliente y configure su administrador oficial con contraseña temporal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full text-slate-subtext hover:bg-surface-container flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateTenant} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-label-sm font-bold text-on-surface uppercase">
                      Razón Social de la Empresa *
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
                      CIF / NIF Oficial *
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

                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-bold text-on-surface uppercase">
                      Teléfono de Contacto
                    </label>
                    <input
                      type="tel"
                      placeholder="Ej. +34 912 345 678"
                      value={newTenant.phone}
                      onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })}
                      className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-label-sm font-bold text-on-surface uppercase">
                      Dirección de las Instalaciones / Sede
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Polígono Industrial Las Nieves, Nave 4, Madrid"
                      value={newTenant.address}
                      onChange={(e) => setNewTenant({ ...newTenant, address: e.target.value })}
                      className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Bloco Administrador Inicial */}
                <div className="p-3.5 rounded-xl bg-surface border border-slate-border/80 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary dark:text-emerald-400 uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[16px]">person_add</span>
                    <span>Administrador Principal de la Empresa (Tenant Admin)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                    <div className="flex flex-col gap-1">
                      <label className="text-label-sm font-bold text-on-surface uppercase">
                        Nombre del Administrador
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Dra. Carmen Rodríguez"
                        value={newTenant.adminName}
                        onChange={(e) => setNewTenant({ ...newTenant, adminName: e.target.value })}
                        className="w-full h-10 px-space-sm rounded-xl bg-surface-container-lowest border border-slate-border text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-label-sm font-bold text-on-surface uppercase">
                        Correo Corporativo (Login)
                      </label>
                      <input
                        type="email"
                        placeholder="admin@empresa.com"
                        value={newTenant.adminEmail}
                        onChange={(e) => setNewTenant({ ...newTenant, adminEmail: e.target.value })}
                        className="w-full h-10 px-space-sm rounded-xl bg-surface-container-lowest border border-slate-border text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-subtext">
                    * Se creará una cuenta de acceso segura con perfil <strong className="text-on-surface">TENANT_ADMIN</strong> y contraseña temporal autogenerada.
                  </p>
                </div>

                {/* Cotas e Subscrição */}
                <div className="grid grid-cols-2 gap-space-sm">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-bold text-on-surface uppercase">
                      Inspectores Máximos (Cupo) *
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
                      Vigencia Inicial (Días) *
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

                {/* Condição Comercial Inicial */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm p-3 rounded-xl bg-surface border border-slate-border/80">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-bold text-on-surface uppercase">
                      Estado Financiero Inicial *
                    </label>
                    <select
                      value={newTenant.paymentStatus}
                      onChange={(e) =>
                        setNewTenant({
                          ...newTenant,
                          paymentStatus: e.target.value as "PAID" | "COURTESY" | "PENDING_PAYMENT",
                        })
                      }
                      className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                    >
                      <option value="PAID">🟢 Pagado / Factura Liquidada</option>
                      <option value="COURTESY">🎁 Bonificado (Cortesía / Piloto)</option>
                      <option value="PENDING_PAYMENT">🟡 Boleto / Factura Pendiente</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-bold text-on-surface uppercase">
                      Ref. Boleto o Factura
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. BOL-2026-0912 o FAC-984"
                      value={newTenant.invoiceRef}
                      onChange={(e) => setNewTenant({ ...newTenant, invoiceRef: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-label-sm font-bold text-on-surface uppercase">
                      Notas Comerciales / Observaciones
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Contrato anual renovable con bonificación especial primer trimestre."
                      value={newTenant.notes}
                      onChange={(e) => setNewTenant({ ...newTenant, notes: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
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

        {/* MODAL 2: Ajuste Rápido de Cupo de Inspectores */}
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
                    Actualmente {selectedTenantForSeats.activeUsersCount} inspectores registrados.
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

        {/* MODAL 3: Gestão de Usuários do Tenant (Ver Membros, Permissões e Reset de Senha) */}
        {selectedTenantForUsers && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl p-space-lg shadow-xl border border-slate-border animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
              <div className="flex items-start justify-between border-b border-slate-border/70 pb-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-primary font-bold uppercase tracking-wider mb-1">
                    <span className="material-symbols-outlined text-[16px]">groups</span>
                    <span>Usuarios e Inspectores del Tenant</span>
                  </div>
                  <h2 className="font-title-md text-title-md text-on-surface font-bold">
                    {selectedTenantForUsers.name}
                  </h2>
                  <p className="text-xs text-slate-subtext mt-0.5">
                    CIF: <span className="font-mono">{selectedTenantForUsers.cif}</span> • Cupo Ocupado:{" "}
                    <strong>
                      {tenantUsers.filter((u) => u.isActive).length} / {selectedTenantForUsers.maxUserSeats}
                    </strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTenantForUsers(null)}
                  className="w-8 h-8 rounded-full text-slate-subtext hover:bg-surface-container flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Botão de Adicionar Usuário */}
              <div className="py-3 flex items-center justify-between border-b border-slate-border/50">
                <span className="text-xs text-slate-subtext">
                  Lista de inspectores y administradores habilitados para operar rúbricas oficiales.
                </span>

                <button
                  type="button"
                  onClick={() => setShowAddUserForm((prev) => !prev)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showAddUserForm ? "remove" : "person_add"}
                  </span>
                  <span>{showAddUserForm ? "Ocultar Formulario" : "Nuevo Inspector"}</span>
                </button>
              </div>

              {/* Formulário de Adicionar Usuário */}
              {showAddUserForm && (
                <form
                  onSubmit={handleAddTenantUser}
                  className="p-3.5 my-2 rounded-xl bg-surface border border-primary/20 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface uppercase">
                      Registrar Nuevo Miembro en el Tenant
                    </span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">shield</span>
                      Prohibido perfil SuperAdmin
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Nombre Completo"
                      value={newUserForm.fullName}
                      onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                      className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />

                    <input
                      type="email"
                      required
                      placeholder="Correo Corporativo"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />

                    <select
                      value={newUserForm.role}
                      onChange={(e) =>
                        setNewUserForm({
                          ...newUserForm,
                          role: e.target.value as "TENANT_ADMIN" | "AUDITOR" | "VIEWER",
                        })
                      }
                      className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                    >
                      <option value="AUDITOR">AUDITOR (Inspector de Campo)</option>
                      <option value="TENANT_ADMIN">TENANT_ADMIN (Gestor de Empresa)</option>
                      <option value="VIEWER">VIEWER (Solo Consulta)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddUserForm(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-subtext hover:bg-surface-container"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingUser}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-container disabled:opacity-50"
                    >
                      {isAddingUser ? "Guardando..." : "Guardar & Generar Contraseña"}
                    </button>
                  </div>
                </form>
              )}

              {/* Formulário de Edição de Inspetor Existente */}
              {editingUser && (
                <form
                  onSubmit={handleSaveUserEdit}
                  className="p-3.5 my-2 rounded-xl bg-surface border border-primary/40 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface uppercase flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[16px]">edit</span>
                      <span>Modificar Inspector: {editingUser.email}</span>
                    </span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">shield</span>
                      Perfil SuperAdmin prohibido
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-subtext uppercase">Nombre Completo</label>
                      <input
                        type="text"
                        required
                        value={editUserForm.fullName}
                        onChange={(e) => setEditUserForm({ ...editUserForm, fullName: e.target.value })}
                        className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-subtext uppercase">Nivel de Permiso</label>
                      <select
                        value={editUserForm.role}
                        onChange={(e) =>
                          setEditUserForm({
                            ...editUserForm,
                            role: e.target.value as "TENANT_ADMIN" | "AUDITOR" | "VIEWER",
                          })
                        }
                        className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                      >
                        <option value="AUDITOR">AUDITOR (Inspector de Campo)</option>
                        <option value="TENANT_ADMIN">TENANT_ADMIN (Gestor de Empresa)</option>
                        <option value="VIEWER">VIEWER (Solo Consulta)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-subtext uppercase">Estado de Cuenta</label>
                      <select
                        value={editUserForm.isActive ? "active" : "inactive"}
                        onChange={(e) =>
                          setEditUserForm({
                            ...editUserForm,
                            isActive: e.target.value === "active",
                          })
                        }
                        className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                      >
                        <option value="active">Activo (Habilitado)</option>
                        <option value="inactive">Inactivo (Deshabilitado)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-subtext hover:bg-surface-container cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingUser}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-container disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {isSavingUser ? "Guardando..." : "Guardar Cambios"}
                    </button>
                  </div>
                </form>
              )}

              {/* Tabela de Usuários */}
              <div className="flex-1 overflow-y-auto mt-2">
                {isLoadingUsers ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2">
                    <span className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span className="text-xs text-slate-subtext">Cargando inspectores del tenant...</span>
                  </div>
                ) : tenantUsers.length === 0 ? (
                  <div className="text-center py-10 text-slate-subtext text-xs">
                    No hay inspectores vinculados a este tenant todavía.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container font-bold text-slate-subtext uppercase tracking-wider border-b border-slate-border">
                      <tr>
                        <th className="py-2.5 px-3">Inspector / Correo</th>
                        <th className="py-2.5 px-3">Nivel de Permiso</th>
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-border/50 text-on-surface">
                      {tenantUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-on-surface">{u.fullName}</div>
                            <div className="text-slate-subtext font-mono text-[11px]">{u.email}</div>
                          </td>

                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                u.role === "TENANT_ADMIN"
                                  ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                                  : u.role === "VIEWER"
                                  ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                  : "bg-status-pass-bg text-status-pass"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                u.isActive
                                  ? "bg-status-pass-bg text-status-pass"
                                  : "bg-alert-red-bg/25 text-alert-red"
                              }`}
                            >
                              {u.isActive ? "Activo" : "Inactivo"}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStartEditUser(u)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Modificar nombre, perfil de acceso o estado del inspector"
                              >
                                <span className="material-symbols-outlined text-[14px]">edit</span>
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleResetUserPassword(u)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Generar nueva contraseña temporal oficial"
                              >
                                <span className="material-symbols-outlined text-[14px]">lock_reset</span>
                                <span>Reset Clave</span>
                              </button>
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

        {/* MODAL 4: Credenciais e Senha Temporária Geradas */}
        {credentialsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-space-lg shadow-2xl border border-primary/30 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2.5 text-primary mb-2">
                <span className="material-symbols-outlined text-[28px]">key</span>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  {credentialsModal.title}
                </h3>
              </div>

              {credentialsModal.subtitle && (
                <p className="text-xs text-slate-subtext mb-space-sm">{credentialsModal.subtitle}</p>
              )}

              <div className="p-space-sm rounded-xl bg-surface border border-slate-border space-y-2 text-xs">
                {credentialsModal.tenantName && (
                  <div>
                    <span className="text-slate-subtext font-bold uppercase text-[10px] block">Empresa</span>
                    <span className="font-semibold text-on-surface">{credentialsModal.tenantName}</span>
                  </div>
                )}

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

              <p className="text-[11px] text-slate-subtext mt-3">
                * Por política de seguridad, el usuario deberá actualizar su contraseña al iniciar sesión.
              </p>

              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-border/60">
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `Credenciales BioAudit Pro:\nUsuario: ${credentialsModal.userEmail}\nContraseña Temporal: ${credentialsModal.tempPass}\nAcceso: ${window.location.origin}/login`
                    )
                  }
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-subtext hover:bg-surface-container cursor-pointer"
                >
                  {copiedText?.includes("Credenciales") ? "¡Ficha Copiada!" : "Copiar Todo"}
                </button>

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
        {/* MODAL 5: Renovación de Contrato & Historial Financiero */}
        {selectedTenantForContract && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-3xl bg-surface-container-lowest rounded-2xl p-space-lg shadow-2xl border border-slate-border animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
              {/* Header do Modal */}
              <div className="flex items-start justify-between border-b border-slate-border/70 pb-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-primary font-bold uppercase tracking-wider mb-1">
                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                    <span>Salud Financiera &amp; Gestión de Contrato</span>
                  </div>
                  <h2 className="font-title-md text-title-md text-on-surface font-bold">
                    {selectedTenantForContract.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-subtext flex-wrap">
                    <span>CIF: <strong className="font-mono text-on-surface">{selectedTenantForContract.cif}</strong></span>
                    <span>•</span>
                    <span>Vencimiento Actual: <strong className="text-on-surface">{new Date(selectedTenantForContract.expiresAt).toLocaleDateString("es-ES")}</strong> ({selectedTenantForContract.daysRemaining} días)</span>
                    <span>•</span>
                    <span>Estado: </span>
                    {selectedTenantForContract.isExpired ? (
                      <span className="font-bold text-alert-red bg-alert-red-bg/25 px-2 py-0.5 rounded-full">Vencido</span>
                    ) : selectedTenantForContract.paymentStatus === "PENDING_PAYMENT" ? (
                      <span className="font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-2 py-0.5 rounded-full">Boleto Pendiente</span>
                    ) : selectedTenantForContract.paymentStatus === "COURTESY" ? (
                      <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/70 px-2 py-0.5 rounded-full">Bonificado</span>
                    ) : (
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full">Pagado / Al Día</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTenantForContract(null)}
                  className="w-8 h-8 rounded-full text-slate-subtext hover:bg-surface-container flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-5 pt-3 pr-1">
                {/* Formulário de Renovação / Alteração de Vigência */}
                <form onSubmit={handleRenewContract} className="p-4 rounded-xl bg-surface border border-slate-border space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-border/50 pb-2">
                    <span className="text-xs font-bold text-on-surface uppercase flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[18px]">update</span>
                      <span>Renovar Contrato / Alterar Vigencia</span>
                    </span>
                    <span className="text-[11px] text-slate-subtext">
                      Extiende la fecha a partir del vencimiento actual o reactiva el plan si ya está vencido.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[11px] font-bold text-on-surface uppercase">
                        Periodo de Extensión *
                      </label>
                      <select
                        value={renewalForm.durationOption}
                        onChange={(e) =>
                          setRenewalForm({
                            ...renewalForm,
                            durationOption: e.target.value as any,
                          })
                        }
                        className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                      >
                        <option value="365">Renovación Anual (+365 días / 1 año)</option>
                        <option value="180">Renovación Semestral (+180 días / 6 meses)</option>
                        <option value="90">Renovación Trimestral (+90 días / 3 meses)</option>
                        <option value="30">Extensión Mensual (+30 días / 1 mes)</option>
                        <option value="custom">Fecha Específica Personalizada...</option>
                      </select>
                    </div>

                    {renewalForm.durationOption === "custom" ? (
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-on-surface uppercase">
                          Nueva Fecha de Vencimiento *
                        </label>
                        <input
                          type="date"
                          required
                          value={renewalForm.customDate}
                          onChange={(e) => setRenewalForm({ ...renewalForm, customDate: e.target.value })}
                          className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-on-surface uppercase">
                          Cupo de Inspectores *
                        </label>
                        <input
                          type="number"
                          min={Math.max(1, selectedTenantForContract.activeUsersCount)}
                          max={500}
                          required
                          value={renewalForm.newSeats}
                          onChange={(e) => setRenewalForm({ ...renewalForm, newSeats: Number(e.target.value) })}
                          className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-on-surface uppercase">
                        Estado Financiero *
                      </label>
                      <select
                        value={renewalForm.paymentStatus}
                        onChange={(e) =>
                          setRenewalForm({
                            ...renewalForm,
                            paymentStatus: e.target.value as "PAID" | "COURTESY" | "PENDING_PAYMENT",
                          })
                        }
                        className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                      >
                        <option value="PAID">🟢 Pagado / Factura Liquidada</option>
                        <option value="COURTESY">🎁 Bonificado (Cortesía)</option>
                        <option value="PENDING_PAYMENT">🟡 Boleto / Factura Pendiente</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-on-surface uppercase">
                        Ref. Boleto o Factura
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. BOL-2026-1049"
                        value={renewalForm.invoiceRef}
                        onChange={(e) => setRenewalForm({ ...renewalForm, invoiceRef: e.target.value })}
                        className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-on-surface uppercase">
                        Importe / Valor (€ o R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={renewalForm.amount}
                        onChange={(e) => setRenewalForm({ ...renewalForm, amount: e.target.value })}
                        className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface uppercase">
                      Notas Comerciales / Justificativa
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Renovación anual acordada con descuento comercial y pago vía boleto 30 días."
                      value={renewalForm.notes}
                      onChange={(e) => setRenewalForm({ ...renewalForm, notes: e.target.value })}
                      className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isRenewing}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      <span>{isRenewing ? "Registrando Renovación..." : "Confirmar Renovación de Contrato"}</span>
                    </button>
                  </div>
                </form>

                {/* Histórico de Contratos e Saúde do Cliente */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface uppercase">
                      <span className="material-symbols-outlined text-[18px] text-primary">history</span>
                      <span>Historial de Contratos &amp; Eventos Financieros</span>
                    </div>
                    <span className="text-[11px] text-slate-subtext">
                      Auditoría permanente de cambios de vigencia y pagos
                    </span>
                  </div>

                  {isLoadingContracts ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2">
                      <span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <span className="text-xs text-slate-subtext">Cargando contratos históricos...</span>
                    </div>
                  ) : contractHistory.length === 0 ? (
                    <div className="p-6 rounded-xl bg-surface border border-slate-border text-center text-xs text-slate-subtext">
                      No hay registros históricos de contratos aún. Los eventos de renovación quedarán registrados aquí para auditoría comercial.
                    </div>
                  ) : (
                    <div className="border border-slate-border rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-surface-container font-bold text-slate-subtext uppercase tracking-wider border-b border-slate-border">
                          <tr>
                            <th className="py-2 px-3">Fecha &amp; Acción</th>
                            <th className="py-2 px-3">Vigencia / Días</th>
                            <th className="py-2 px-3">Cupo</th>
                            <th className="py-2 px-3">Estado Financiero</th>
                            <th className="py-2 px-3">Factura / Ref</th>
                            <th className="py-2 px-3">Observaciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-border/50 text-on-surface">
                          {contractHistory.map((c) => (
                            <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-on-surface">
                                  {new Date(c.createdAt).toLocaleDateString("es-ES")}
                                </div>
                                <div className="text-[10px] text-slate-subtext font-semibold">
                                  {c.actionType === "CREATION"
                                    ? "Alta Inicial"
                                    : c.actionType === "RENEWAL"
                                    ? "Renovación"
                                    : c.actionType === "SEATS_CHANGE"
                                    ? "Ajuste Cupo"
                                    : "Extensión"}
                                </div>
                              </td>

                              <td className="py-2.5 px-3">
                                <div>Hasta {new Date(c.expiresAt).toLocaleDateString("es-ES")}</div>
                                <div className="text-[10px] text-slate-subtext font-mono">+{c.daysAdded} días</div>
                              </td>

                              <td className="py-2.5 px-3 font-bold">
                                {c.seats} inspectores
                              </td>

                              <td className="py-2.5 px-3">
                                {c.paymentStatus === "PENDING_PAYMENT" ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                                    Boleto Pendiente
                                  </span>
                                ) : c.paymentStatus === "COURTESY" ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300">
                                    Bonificado
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                                    Pagado
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 font-mono text-[11px]">
                                {c.invoiceRef || "—"}
                                {c.amount ? <div className="text-slate-subtext text-[10px]">{c.amount} €</div> : null}
                              </td>

                              <td className="py-2.5 px-3 text-[11px] text-slate-subtext max-w-xs truncate" title={c.notes || ""}>
                                {c.notes || "—"}
                                {c.createdBy && (
                                  <div className="text-[9px] text-slate-400">Por: {c.createdBy}</div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-border/60 mt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTenantForContract(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-subtext hover:bg-surface-container cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 6: Editar Empresa (Tenant) - Todos los campos editables EXCEPTO el Documento */}
        {selectedTenantForEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl p-space-lg shadow-xl border border-slate-border animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-space-sm border-b border-slate-border/70 pb-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-primary font-bold uppercase tracking-wider mb-1">
                    <span className="material-symbols-outlined text-[16px]">edit_note</span>
                    <span>Modificar Datos de la Empresa</span>
                  </div>
                  <h2 className="font-title-md text-title-md text-on-surface font-bold">
                    Editar: {selectedTenantForEdit.name}
                  </h2>
                  <p className="text-xs text-slate-subtext">
                    Actualice la información corporativa. Por normativa legal, el documento fiscal es inmutable.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTenantForEdit(null)}
                  className="w-8 h-8 rounded-full text-slate-subtext hover:bg-surface-container flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveTenantEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                  {/* Razón Social */}
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-label-sm font-bold text-on-surface uppercase">
                      Razón Social de la Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      value={editTenantForm.name}
                      onChange={(e) => setEditTenantForm({ ...editTenantForm, name: e.target.value })}
                      className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
                    />
                  </div>

                  {/* Documento / CIF (INMUTABLE / READONLY) */}
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-label-sm font-bold text-slate-subtext uppercase flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-amber-500">lock</span>
                        <span>Documento Oficial (CIF / NIF) — Inmutable</span>
                      </label>
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        Solo Lectura
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        disabled
                        value={editTenantForm.cif}
                        className="w-full h-11 px-space-sm rounded-xl bg-surface-container/60 border border-slate-border text-slate-subtext text-body-md font-mono cursor-not-allowed select-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">
                        lock
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-subtext mt-0.5">
                      * El documento fiscal no es modificable para salvaguardar la validez jurídica de las actas de inspección oficial emitidas.
                    </p>
                  </div>

                  {/* Teléfono */}
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-bold text-on-surface uppercase">
                      Teléfono de Contacto
                    </label>
                    <input
                      type="tel"
                      value={editTenantForm.phone}
                      onChange={(e) => setEditTenantForm({ ...editTenantForm, phone: e.target.value })}
                      className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  {/* Plan Tier */}
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-bold text-on-surface uppercase">
                      Plan de Subscripción
                    </label>
                    <select
                      value={editTenantForm.planTier}
                      onChange={(e) => setEditTenantForm({ ...editTenantForm, planTier: e.target.value })}
                      className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="STARTER">STARTER</option>
                      <option value="PRO">PRO</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </div>

                  {/* Dirección */}
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-label-sm font-bold text-on-surface uppercase">
                      Dirección de las Instalaciones / Sede
                    </label>
                    <input
                      type="text"
                      value={editTenantForm.address}
                      onChange={(e) => setEditTenantForm({ ...editTenantForm, address: e.target.value })}
                      className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Administrador */}
                <div className="p-3.5 rounded-xl bg-surface border border-slate-border/80 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary dark:text-emerald-400 uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[16px]">badge</span>
                    <span>Contacto del Administrador Principal</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                    <div className="flex flex-col gap-1">
                      <label className="text-label-sm font-bold text-on-surface uppercase">
                        Nombre del Administrador
                      </label>
                      <input
                        type="text"
                        value={editTenantForm.adminName}
                        onChange={(e) => setEditTenantForm({ ...editTenantForm, adminName: e.target.value })}
                        className="w-full h-10 px-space-sm rounded-xl bg-surface-container-lowest border border-slate-border text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-label-sm font-bold text-on-surface uppercase">
                        Correo del Administrador
                      </label>
                      <input
                        type="email"
                        value={editTenantForm.adminEmail}
                        onChange={(e) => setEditTenantForm({ ...editTenantForm, adminEmail: e.target.value })}
                        className="w-full h-10 px-space-sm rounded-xl bg-surface-container-lowest border border-slate-border text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Cupo de Inspectores */}
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-bold text-on-surface uppercase">
                    Inspectores Máximos Habilitados (Cupo) *
                  </label>
                  <input
                    type="number"
                    min={Math.max(1, selectedTenantForEdit.activeUsersCount)}
                    max={500}
                    required
                    value={editTenantForm.maxUserSeats}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, maxUserSeats: Number(e.target.value) })}
                    className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
                  />
                  <span className="text-[11px] text-slate-subtext mt-0.5">
                    Actualmente {selectedTenantForEdit.activeUsersCount} inspectores activos registrados.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-space-sm border-t border-slate-border/60">
                  <button
                    type="button"
                    onClick={() => setSelectedTenantForEdit(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-subtext hover:bg-surface-container cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingTenant}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingTenant ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 7: Gestión de Rúbrica Base Oficial (Global) */}
        {showGlobalRubricModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-4xl bg-surface-container-lowest rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-border animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-border/70 pb-3 gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-primary font-bold uppercase tracking-wider mb-1">
                    <span className="material-symbols-outlined text-[16px]">fact_check</span>
                    <span>Rúbrica Base Oficial • Plataforma Global</span>
                  </div>
                  <h2 className="font-title-md text-title-md text-on-surface font-bold">
                    Catálogo Normativo Base ({globalRubricPoints.length} Puntos)
                  </h2>
                  <p className="text-xs text-slate-subtext mt-0.5">
                    Configure los puntos de control higiénico-sanitarios predeterminados para toda la plataforma (RD 852/2004, Codex, ISO 22000).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGlobalRubricModal(false)}
                  className="w-8 h-8 rounded-full text-slate-subtext hover:bg-surface-container flex items-center justify-center cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Toolbar / Filtro / Adicionar Ponto */}
              <div className="py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-b border-slate-border/50">
                <div className="relative flex-1 max-w-sm">
                  <span className="material-symbols-outlined text-slate-subtext text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por número, título o categoría..."
                    value={globalRubricFilter}
                    onChange={(e) => setGlobalRubricFilter(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-surface border border-slate-border text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddGlobalPointForm((prev) => !prev)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {showAddGlobalPointForm ? "remove" : "add_circle"}
                    </span>
                    <span>{showAddGlobalPointForm ? "Ocultar Formulario" : "Añadir Punto"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetGlobalRubric}
                    disabled={isSavingGlobalRubric}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-subtext hover:text-alert-red hover:bg-alert-red-bg/25 border border-slate-border inline-flex items-center gap-1 cursor-pointer transition-colors"
                    title="Restaurar a los 30 puntos normativos por defecto"
                  >
                    <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                    <span>Restaurar 30 Originales</span>
                  </button>
                </div>
              </div>

              {/* Formulário de Adicionar Ponto Global */}
              {showAddGlobalPointForm && (
                <form
                  onSubmit={handleAddGlobalPoint}
                  className="p-3.5 my-2 rounded-xl bg-surface border border-primary/30 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-primary text-[16px]">add_task</span>
                      <span>Añadir Nuevo Punto de Control a la Rúbrica Base</span>
                    </span>
                    <span className="text-[11px] text-slate-subtext">Se añadirá a la lista de puntos de inspección</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-subtext uppercase">Número *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. 1.8 o 6.1"
                        value={newGlobalPoint.number}
                        onChange={(e) => setNewGlobalPoint({ ...newGlobalPoint, number: e.target.value })}
                        className="h-9 px-2.5 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-subtext uppercase">Categoría Normativa *</label>
                      <select
                        value={newGlobalPoint.category}
                        onChange={(e) => setNewGlobalPoint({ ...newGlobalPoint, category: e.target.value as any })}
                        className="h-9 px-2.5 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c.category} value={c.category}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-subtext uppercase">Referencia Legal</label>
                      <input
                        type="text"
                        placeholder="Ej. RD 852/2004 Cap. V"
                        value={newGlobalPoint.legalReference}
                        onChange={(e) => setNewGlobalPoint({ ...newGlobalPoint, legalReference: e.target.value })}
                        className="h-9 px-2.5 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-subtext uppercase">Título / Pregunta de Inspección *</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Descripción detallada del requisito sanitario a auditar en la rúbrica..."
                      value={newGlobalPoint.title}
                      onChange={(e) => setNewGlobalPoint({ ...newGlobalPoint, title: e.target.value })}
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newGlobalPoint.isCriticalCcp}
                        onChange={(e) => setNewGlobalPoint({ ...newGlobalPoint, isCriticalCcp: e.target.checked })}
                        className="w-4 h-4 rounded text-primary focus:ring-primary"
                      />
                      <span className="text-xs font-bold text-alert-red">
                        Es Punto de Control Crítico (Veto Sanitario Inmediato si no cumple)
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddGlobalPointForm(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-subtext hover:bg-surface-container"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-container"
                      >
                        Insertar a la Rúbrica
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Lista de Pontos da Rúbrica */}
              <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1">
                {isLoadingGlobalRubric ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-2">
                    <span className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span className="text-xs text-slate-subtext">Cargando puntos de la rúbrica base...</span>
                  </div>
                ) : (
                  globalRubricPoints
                    .map((point, originalIdx) => ({ point, originalIdx }))
                    .filter(({ point }) => {
                      if (!globalRubricFilter) return true;
                      const q = globalRubricFilter.toLowerCase();
                      return (
                        point.number.toLowerCase().includes(q) ||
                        point.title.toLowerCase().includes(q) ||
                        point.categoryLabel.toLowerCase().includes(q) ||
                        point.legalReference.toLowerCase().includes(q)
                      );
                    })
                    .map(({ point, originalIdx }) => (
                      <div
                        key={point.code || originalIdx}
                        className={`p-3 rounded-xl border transition-all ${
                          point.isActive === false
                            ? "bg-surface-container/40 border-slate-border/50 opacity-60"
                            : "bg-surface border-slate-border hover:border-slate-border/80 shadow-sm"
                        }`}
                      >
                        {editingGlobalPointIndex === originalIdx ? (
                          /* Modo de Edição Inline */
                          <div className="space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                              <div className="flex flex-col gap-0.5">
                                <label className="text-[10px] font-bold text-slate-subtext uppercase">Número</label>
                                <input
                                  type="text"
                                  value={point.number}
                                  onChange={(e) => {
                                    const updated = [...globalRubricPoints];
                                    updated[originalIdx] = { ...updated[originalIdx], number: e.target.value };
                                    setGlobalRubricPoints(updated);
                                  }}
                                  className="h-8 px-2 rounded-lg bg-surface-container-lowest border border-slate-border text-xs font-bold"
                                />
                              </div>
                              <div className="flex flex-col gap-0.5 sm:col-span-2">
                                <label className="text-[10px] font-bold text-slate-subtext uppercase">Categoría</label>
                                <select
                                  value={point.category}
                                  onChange={(e) => {
                                    const catObj = CATEGORY_OPTIONS.find((c) => c.category === e.target.value) || CATEGORY_OPTIONS[0];
                                    const updated = [...globalRubricPoints];
                                    updated[originalIdx] = {
                                      ...updated[originalIdx],
                                      category: e.target.value as any,
                                      categoryLabel: catObj.label,
                                    };
                                    setGlobalRubricPoints(updated);
                                  }}
                                  className="h-8 px-2 rounded-lg bg-surface-container-lowest border border-slate-border text-xs font-semibold"
                                >
                                  {CATEGORY_OPTIONS.map((c) => (
                                    <option key={c.category} value={c.category}>
                                      {c.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <label className="text-[10px] font-bold text-slate-subtext uppercase">Ref. Legal</label>
                                <input
                                  type="text"
                                  value={point.legalReference}
                                  onChange={(e) => {
                                    const updated = [...globalRubricPoints];
                                    updated[originalIdx] = { ...updated[originalIdx], legalReference: e.target.value };
                                    setGlobalRubricPoints(updated);
                                  }}
                                  className="h-8 px-2 rounded-lg bg-surface-container-lowest border border-slate-border text-xs"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-0.5">
                              <label className="text-[10px] font-bold text-slate-subtext uppercase">Título / Requisito</label>
                              <textarea
                                rows={2}
                                value={point.title}
                                onChange={(e) => {
                                  const updated = [...globalRubricPoints];
                                  updated[originalIdx] = { ...updated[originalIdx], title: e.target.value };
                                  setGlobalRubricPoints(updated);
                                }}
                                className="p-2 rounded-lg bg-surface-container-lowest border border-slate-border text-xs"
                              />
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={point.isCriticalCcp}
                                  onChange={(e) => {
                                    const updated = [...globalRubricPoints];
                                    updated[originalIdx] = { ...updated[originalIdx], isCriticalCcp: e.target.checked };
                                    setGlobalRubricPoints(updated);
                                  }}
                                  className="w-4 h-4 rounded text-primary"
                                />
                                <span className="text-[11px] font-bold text-alert-red">
                                  Veto Crítico APPCC
                                </span>
                              </label>

                              <button
                                type="button"
                                onClick={() => setEditingGlobalPointIndex(null)}
                                className="px-3 py-1 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-container"
                              >
                                Listo
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Modo de Visualização */
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex items-start gap-2.5 flex-1">
                              <span className="font-mono font-black text-xs px-2 py-1 rounded-md bg-surface-container text-on-surface shrink-0 mt-0.5">
                                {point.number}
                              </span>
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-on-surface leading-snug">{point.title}</p>
                                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                  <span className="text-slate-subtext font-medium">{point.categoryLabel}</span>
                                  <span className="text-slate-300 dark:text-slate-700">•</span>
                                  <span className="text-slate-subtext font-mono">{point.legalReference}</span>
                                  {point.isCriticalCcp && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-alert-red-bg/25 text-alert-red">
                                      Veto APPCC
                                    </span>
                                  )}
                                  {point.isActive === false ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                      Oculto
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-status-pass-bg text-status-pass">
                                      Activo
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleGlobalPointActive(originalIdx)}
                                className={`h-7 px-2 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                                  point.isActive === false
                                    ? "bg-status-pass-bg text-status-pass hover:bg-status-pass/20"
                                    : "bg-surface-container text-slate-subtext hover:text-on-surface"
                                }`}
                                title={point.isActive === false ? "Activar punto en las rúbricas" : "Ocultar punto sin borrar"}
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  {point.isActive === false ? "visibility" : "visibility_off"}
                                </span>
                                <span>{point.isActive === false ? "Activar" : "Ocultar"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setEditingGlobalPointIndex(originalIdx)}
                                className="h-7 px-2 rounded-lg text-[11px] font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary text-on-surface inline-flex items-center gap-1 cursor-pointer transition-colors"
                                title="Modificar texto o clasificación del punto"
                              >
                                <span className="material-symbols-outlined text-[14px]">edit</span>
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteGlobalPoint(originalIdx)}
                                className="h-7 w-7 rounded-lg text-slate-subtext hover:bg-alert-red-bg/25 hover:text-alert-red flex items-center justify-center cursor-pointer transition-colors"
                                title="Eliminar este punto de la rúbrica"
                              >
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-border/60 mt-2">
                <span className="text-[11px] text-slate-subtext">
                  * Guardar actualizará la Rúbrica Base para todas las empresas que no tengan una rúbrica personalizada.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGlobalRubricModal(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-subtext hover:bg-surface-container cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    disabled={isSavingGlobalRubric}
                    onClick={() => handleSaveGlobalRubric()}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>{isSavingGlobalRubric ? "Guardando..." : "Guardar Cambios Rúbrica Base"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 8: Gestión de Rúbrica Personalizada por Empresa (Tenant) */}
        {selectedTenantForRubric && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-4xl bg-surface-container-lowest rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-border animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-border/70 pb-3 gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-primary font-bold uppercase tracking-wider mb-1">
                    <span className="material-symbols-outlined text-[16px]">tune</span>
                    <span>Personalización de Rúbrica • Empresa Específica</span>
                  </div>
                  <h2 className="font-title-md text-title-md text-on-surface font-bold flex items-center gap-2 flex-wrap">
                    <span>{selectedTenantForRubric.name}</span>
                    {isTenantRubricCustomized ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300">
                        Rúbrica Exclusiva Customizada ({tenantRubricPoints.length} Puntos)
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Usa Rúbrica Base Oficial ({tenantRubricPoints.length} Puntos)
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-subtext mt-0.5">
                    CIF: <span className="font-mono font-semibold text-on-surface">{selectedTenantForRubric.cif}</span> •
                    Personalice los puntos de control de este cliente sin alterar la rúbrica base global ni a otras empresas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTenantForRubric(null)}
                  className="w-8 h-8 rounded-full text-slate-subtext hover:bg-surface-container flex items-center justify-center cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Banner se o tenant ainda NÃO possui rúbrica customizada */}
              {!isTenantRubricCustomized ? (
                <div className="p-4 my-3 rounded-xl bg-surface border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                      <span className="material-symbols-outlined text-primary text-[18px]">info</span>
                      <span>Esta empresa está sincronizada con la Rúbrica Base Oficial</span>
                    </div>
                    <p className="text-xs text-slate-subtext mt-1 max-w-xl">
                      Para agregar puntos específicos de la operativa de este cliente, editar textos o quitar puntos que no apliquen, clone la base oficial o inicie una desde cero.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCloneBaseRubricForTenant}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container inline-flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      <span>Clonar Base para Personalizar</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCreateBlankRubricForTenant}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">note_add</span>
                      <span>Desde Cero</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Toolbar / Filtro / Adicionar Ponto para o Tenant */}
              <div className="py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-b border-slate-border/50">
                <div className="relative flex-1 max-w-sm">
                  <span className="material-symbols-outlined text-slate-subtext text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar puntos en la rúbrica de la empresa..."
                    value={tenantRubricFilter}
                    onChange={(e) => setTenantRubricFilter(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-surface border border-slate-border text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTenantPointForm((prev) => !prev)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {showAddTenantPointForm ? "remove" : "add_circle"}
                    </span>
                    <span>{showAddTenantPointForm ? "Ocultar Formulario" : "Añadir Punto Empresa"}</span>
                  </button>

                  {isTenantRubricCustomized && (
                    <button
                      type="button"
                      onClick={handleResetTenantRubric}
                      disabled={isSavingTenantRubric}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-subtext hover:text-alert-red hover:bg-alert-red-bg/25 border border-slate-border inline-flex items-center gap-1 cursor-pointer transition-colors"
                      title="Eliminar personalizaciones y volver a la Rúbrica Base Oficial"
                    >
                      <span className="material-symbols-outlined text-[16px]">restore</span>
                      <span>Volver a Base Oficial</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Formulário de Adicionar Ponto Tenant */}
              {showAddTenantPointForm && (
                <form
                  onSubmit={handleAddTenantPoint}
                  className="p-3.5 my-2 rounded-xl bg-surface border border-primary/30 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-primary text-[16px]">add_task</span>
                      <span>Añadir Punto Específico para {selectedTenantForRubric.name}</span>
                    </span>
                    <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                      Exclusivo de este cliente
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-subtext uppercase">Número *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. 1.8 o P-01"
                        value={newTenantPoint.number}
                        onChange={(e) => setNewTenantPoint({ ...newTenantPoint, number: e.target.value })}
                        className="h-9 px-2.5 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-subtext uppercase">Categoría Normativa *</label>
                      <select
                        value={newTenantPoint.category}
                        onChange={(e) => setNewTenantPoint({ ...newTenantPoint, category: e.target.value as any })}
                        className="h-9 px-2.5 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c.category} value={c.category}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-subtext uppercase">Referencia Legal / Interna</label>
                      <input
                        type="text"
                        placeholder="Ej. Procedimiento Interno POE-03"
                        value={newTenantPoint.legalReference}
                        onChange={(e) => setNewTenantPoint({ ...newTenantPoint, legalReference: e.target.value })}
                        className="h-9 px-2.5 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-subtext uppercase">Título / Requisito *</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Descripción del punto de control específico de la operativa del cliente..."
                      value={newTenantPoint.title}
                      onChange={(e) => setNewTenantPoint({ ...newTenantPoint, title: e.target.value })}
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newTenantPoint.isCriticalCcp}
                        onChange={(e) => setNewTenantPoint({ ...newTenantPoint, isCriticalCcp: e.target.checked })}
                        className="w-4 h-4 rounded text-primary focus:ring-primary"
                      />
                      <span className="text-xs font-bold text-alert-red">
                        Es Punto de Control Crítico (Veto Inmediato)
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddTenantPointForm(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-subtext hover:bg-surface-container"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-container"
                      >
                        Añadir a la Empresa
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Lista de Pontos do Tenant */}
              <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1">
                {isLoadingTenantRubric ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-2">
                    <span className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span className="text-xs text-slate-subtext">Cargando rúbrica de la empresa...</span>
                  </div>
                ) : tenantRubricPoints.length === 0 ? (
                  <div className="text-center py-12 text-slate-subtext text-xs">
                    Esta empresa no tiene puntos en su rúbrica. Haga clic en "Clonar Base" o "Añadir Punto Empresa".
                  </div>
                ) : (
                  tenantRubricPoints
                    .map((point, originalIdx) => ({ point, originalIdx }))
                    .filter(({ point }) => {
                      if (!tenantRubricFilter) return true;
                      const q = tenantRubricFilter.toLowerCase();
                      return (
                        point.number.toLowerCase().includes(q) ||
                        point.title.toLowerCase().includes(q) ||
                        point.categoryLabel.toLowerCase().includes(q) ||
                        point.legalReference.toLowerCase().includes(q)
                      );
                    })
                    .map(({ point, originalIdx }) => (
                      <div
                        key={point.code || originalIdx}
                        className={`p-3 rounded-xl border transition-all ${
                          point.isActive === false
                            ? "bg-surface-container/40 border-slate-border/50 opacity-60"
                            : "bg-surface border-slate-border hover:border-slate-border/80 shadow-sm"
                        }`}
                      >
                        {editingTenantPointIndex === originalIdx ? (
                          /* Modo Edição Inline Tenant */
                          <div className="space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                              <div className="flex flex-col gap-0.5">
                                <label className="text-[10px] font-bold text-slate-subtext uppercase">Número</label>
                                <input
                                  type="text"
                                  value={point.number}
                                  onChange={(e) => {
                                    const updated = [...tenantRubricPoints];
                                    updated[originalIdx] = { ...updated[originalIdx], number: e.target.value };
                                    setTenantRubricPoints(updated);
                                  }}
                                  className="h-8 px-2 rounded-lg bg-surface-container-lowest border border-slate-border text-xs font-bold"
                                />
                              </div>
                              <div className="flex flex-col gap-0.5 sm:col-span-2">
                                <label className="text-[10px] font-bold text-slate-subtext uppercase">Categoría</label>
                                <select
                                  value={point.category}
                                  onChange={(e) => {
                                    const catObj = CATEGORY_OPTIONS.find((c) => c.category === e.target.value) || CATEGORY_OPTIONS[0];
                                    const updated = [...tenantRubricPoints];
                                    updated[originalIdx] = {
                                      ...updated[originalIdx],
                                      category: e.target.value as any,
                                      categoryLabel: catObj.label,
                                    };
                                    setTenantRubricPoints(updated);
                                  }}
                                  className="h-8 px-2 rounded-lg bg-surface-container-lowest border border-slate-border text-xs font-semibold"
                                >
                                  {CATEGORY_OPTIONS.map((c) => (
                                    <option key={c.category} value={c.category}>
                                      {c.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <label className="text-[10px] font-bold text-slate-subtext uppercase">Ref. Legal</label>
                                <input
                                  type="text"
                                  value={point.legalReference}
                                  onChange={(e) => {
                                    const updated = [...tenantRubricPoints];
                                    updated[originalIdx] = { ...updated[originalIdx], legalReference: e.target.value };
                                    setTenantRubricPoints(updated);
                                  }}
                                  className="h-8 px-2 rounded-lg bg-surface-container-lowest border border-slate-border text-xs"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-0.5">
                              <label className="text-[10px] font-bold text-slate-subtext uppercase">Título / Requisito</label>
                              <textarea
                                rows={2}
                                value={point.title}
                                onChange={(e) => {
                                  const updated = [...tenantRubricPoints];
                                  updated[originalIdx] = { ...updated[originalIdx], title: e.target.value };
                                  setTenantRubricPoints(updated);
                                }}
                                className="p-2 rounded-lg bg-surface-container-lowest border border-slate-border text-xs"
                              />
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={point.isCriticalCcp}
                                  onChange={(e) => {
                                    const updated = [...tenantRubricPoints];
                                    updated[originalIdx] = { ...updated[originalIdx], isCriticalCcp: e.target.checked };
                                    setTenantRubricPoints(updated);
                                  }}
                                  className="w-4 h-4 rounded text-primary"
                                />
                                <span className="text-[11px] font-bold text-alert-red">
                                  Veto Crítico APPCC
                                </span>
                              </label>

                              <button
                                type="button"
                                onClick={() => setEditingTenantPointIndex(null)}
                                className="px-3 py-1 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-container"
                              >
                                Listo
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Modo Visualização Tenant */
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex items-start gap-2.5 flex-1">
                              <span className="font-mono font-black text-xs px-2 py-1 rounded-md bg-surface-container text-on-surface shrink-0 mt-0.5">
                                {point.number}
                              </span>
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-on-surface leading-snug">{point.title}</p>
                                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                  <span className="text-slate-subtext font-medium">{point.categoryLabel}</span>
                                  <span className="text-slate-300 dark:text-slate-700">•</span>
                                  <span className="text-slate-subtext font-mono">{point.legalReference}</span>
                                  {point.isCriticalCcp && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-alert-red-bg/25 text-alert-red">
                                      Veto APPCC
                                    </span>
                                  )}
                                  {point.isActive === false ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                      Oculto
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-status-pass-bg text-status-pass">
                                      Activo
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleTenantPointActive(originalIdx)}
                                className={`h-7 px-2 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                                  point.isActive === false
                                    ? "bg-status-pass-bg text-status-pass hover:bg-status-pass/20"
                                    : "bg-surface-container text-slate-subtext hover:text-on-surface"
                                }`}
                                title={point.isActive === false ? "Activar punto para esta empresa" : "Ocultar punto"}
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  {point.isActive === false ? "visibility" : "visibility_off"}
                                </span>
                                <span>{point.isActive === false ? "Activar" : "Ocultar"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setEditingTenantPointIndex(originalIdx)}
                                className="h-7 px-2 rounded-lg text-[11px] font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary text-on-surface inline-flex items-center gap-1 cursor-pointer transition-colors"
                                title="Modificar texto o clasificación del punto"
                              >
                                <span className="material-symbols-outlined text-[14px]">edit</span>
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteTenantPoint(originalIdx)}
                                className="h-7 w-7 rounded-lg text-slate-subtext hover:bg-alert-red-bg/25 hover:text-alert-red flex items-center justify-center cursor-pointer transition-colors"
                                title="Eliminar este punto de la rúbrica de esta empresa"
                              >
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-border/60 mt-2">
                <span className="text-[11px] text-slate-subtext">
                  * Guardar registrará la rúbrica personalizada exclusivamente para <strong>{selectedTenantForRubric.name}</strong>.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTenantForRubric(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-subtext hover:bg-surface-container cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    disabled={isSavingTenantRubric}
                    onClick={handleSaveTenantRubric}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>{isSavingTenantRubric ? "Guardando..." : "Guardar Rúbrica de la Empresa"}</span>
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
