"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuthGuard } from "@/presentation/hooks/useAuthGuard";
import { AuthLoadingScreen } from "@/presentation/components/AuthGuard";
import { PlanItem } from "@/presentation/components/superadmin/types";
import { PlansTable } from "@/presentation/components/superadmin/plans/PlansTable";
import { PlanModal } from "@/presentation/components/superadmin/plans/PlanModal";

export default function SuperAdminPlanosPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthGuard({
    requiredRole: "PLATFORM_SUPERADMIN",
  });

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<PlanItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/superadmin/plans");
      const json = await res.json();
      if (json.success && json.plans) {
        setPlans(json.plans);
      }
    } catch {
      setNotification({ type: "error", message: "Error al cargar el catálogo de planes." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadPlans();
    }
  }, [isAuthenticated, loadPlans]);

  const handleSavePlan = async (planData: Partial<PlanItem>) => {
    setIsSaving(true);
    try {
      if (planToEdit) {
        const res = await fetch(`/api/superadmin/plans/${planToEdit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(planData),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Error al actualizar plan");
        }
        setNotification({ type: "success", message: `Plan "${planData.name}" actualizado con éxito.` });
      } else {
        const res = await fetch("/api/superadmin/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(planData),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Error al crear plan");
        }
        setNotification({ type: "success", message: `Plan "${planData.name}" creado con éxito.` });
      }
      await loadPlans();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (plan: PlanItem) => {
    try {
      const res = await fetch(`/api/superadmin/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setNotification({
          type: "success",
          message: `Plan "${plan.name}" ${!plan.isActive ? "activado" : "inactivado"}.`,
        });
        await loadPlans();
      }
    } catch {
      setNotification({ type: "error", message: "Error al cambiar estado del plan." });
    }
  };

  const handleSetDefault = async (plan: PlanItem) => {
    try {
      const res = await fetch(`/api/superadmin/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setNotification({
          type: "success",
          message: `"${plan.name}" establecido como Plan Default de la plataforma.`,
        });
        await loadPlans();
      }
    } catch {
      setNotification({ type: "error", message: "Error al establecer plan default." });
    }
  };

  if (isAuthLoading || !isAuthenticated) {
    return <AuthLoadingScreen message="Verificando permisos de Administrador..." />;
  }

  const defaultPlan = plans.find((p) => p.isDefault);
  const activePlansCount = plans.filter((p) => p.isActive).length;

  return (
    <div className="min-h-screen bg-surface-container-low text-on-surface">
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-16 space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-subtext">
          <Link href="/superadmin" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
            <span>Gobernanza de la Plataforma</span>
          </Link>
          <span>/</span>
          <span className="font-bold text-on-surface">Gestión de Planes</span>
        </div>

        {/* Hero Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-2xl border border-slate-border shadow-sm">
          <div className="flex-1 min-w-0 pr-0 sm:pr-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary mb-2 whitespace-nowrap">
              <span className="material-symbols-outlined text-[14px]">loyalty</span>
              <span>Oferta Comercial y Licenciamiento</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight leading-snug">
              Planes de Suscripción
            </h1>
            <p className="text-xs text-slate-subtext mt-1 max-w-xl leading-relaxed">
              Administre planes, vigencias y cupos de usuarios. Las empresas registradas pueden
              iniciar en el plan default bonificado o contratar planes adicionales acumulativos.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => {
                setPlanToEdit(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_box</span>
              <span>Nuevo Plan</span>
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

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-slate-border shadow-sm">
            <div className="text-xs text-slate-subtext font-medium">Total de Planes</div>
            <div className="text-2xl font-black text-on-surface mt-1">{plans.length}</div>
            <div className="text-[11px] text-slate-subtext mt-1">Configurados en catálogo</div>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-slate-border shadow-sm">
            <div className="text-xs text-slate-subtext font-medium">Plan Default Actual</div>
            <div className="text-sm font-black text-primary mt-2 truncate" title={defaultPlan?.name}>
              {defaultPlan?.name || "No definido"}
            </div>
            <div className="text-[11px] text-slate-subtext mt-1">
              {defaultPlan ? `${defaultPlan.durationDays}d • ${defaultPlan.maxUserSeats} usuario • 0,00 €` : "—"}
            </div>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-slate-border shadow-sm">
            <div className="text-xs text-slate-subtext font-medium">Planes Activos</div>
            <div className="text-2xl font-black text-status-pass mt-1">{activePlansCount}</div>
            <div className="text-[11px] text-slate-subtext mt-1">Disponibles para venta</div>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-slate-border shadow-sm">
            <div className="text-xs text-slate-subtext font-medium">Regla de Subscripción</div>
            <div className="text-xs font-bold text-on-surface mt-2 text-purple-700 dark:text-purple-300">
              Cumulativas
            </div>
            <div className="text-[11px] text-slate-subtext mt-1">Días y cupos se acumulan</div>
          </div>
        </div>

        {/* Tabela de Planos */}
        <PlansTable
          plans={plans}
          isLoading={isLoading}
          onRefresh={loadPlans}
          onOpenCreate={() => {
            setPlanToEdit(null);
            setIsModalOpen(true);
          }}
          onOpenEdit={(plan) => {
            setPlanToEdit(plan);
            setIsModalOpen(true);
          }}
          onToggleStatus={handleToggleStatus}
          onSetDefault={handleSetDefault}
        />
      </main>

      {/* Modal de Criação / Edição de Plano */}
      <PlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        planToEdit={planToEdit}
        onSave={handleSavePlan}
        isSaving={isSaving}
      />
    </div>
  );
}
