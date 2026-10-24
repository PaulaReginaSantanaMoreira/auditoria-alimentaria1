"use client";

import React, { useState, useEffect } from "react";
import { TenantItem, ContractHistoryItem, PlanItem } from "../types";
import { useConfirm } from "@/presentation/components/ui/ConfirmDialog";

interface ContractModalProps {
  tenant: TenantItem | null;
  onClose: () => void;
  contracts: ContractHistoryItem[];
  isLoadingContracts: boolean;
  onRenewContract: (form: {
    planId?: string;
    planName?: string;
    planCode?: string;
    daysToAdd?: number;
    newExpiresAt?: string;
    newSeats: number;
    paymentStatus: "PAID" | "COURTESY" | "PENDING_PAYMENT";
    paymentDueDate?: string;
    amount: number;
    invoiceRef: string;
    notes: string;
  }) => Promise<void>;
  isRenewing: boolean;
  onConfirmPayment?: (contractId: string) => Promise<void>;
  onCancelOffer?: (contractId: string) => Promise<void>;
  onCancelContract?: (contractId: string, reason?: string) => Promise<void>;
  onRefundContract?: (params: {
    contractId: string;
    refundType: "TOTAL" | "PARTIAL";
    refundAmount: number;
    refundReason: string;
    revokeAccess?: boolean;
  }) => Promise<void>;
}

export function ContractModal({
  tenant,
  onClose,
  contracts,
  isLoadingContracts,
  onRenewContract,
  isRenewing,
  onConfirmPayment,
  onCancelOffer,
  onCancelContract,
  onRefundContract,
}: ContractModalProps) {
  const [availablePlans, setAvailablePlans] = useState<PlanItem[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [selectedPlanOption, setSelectedPlanOption] = useState<string>("");
  const [processingContractId, setProcessingContractId] = useState<string | null>(null);
  const { confirm, ConfirmDialogComponent } = useConfirm();

  // Estado do Submodal de Reembolso
  const [refundTargetContract, setRefundTargetContract] = useState<ContractHistoryItem | null>(null);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [renewalError, setRenewalError] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundForm, setRefundForm] = useState<{
    refundType: "TOTAL" | "PARTIAL";
    refundAmount: number;
    refundReason: string;
    revokeAccess: boolean;
  }>({
    refundType: "TOTAL",
    refundAmount: 0,
    refundReason: "",
    revokeAccess: true,
  });

  // Form State
  const [renewalForm, setRenewalForm] = useState<{
    planId?: string;
    planName?: string;
    planCode?: string;
    customPlanName: string;
    customDays: number;
    daysToAdd: number;
    newSeats: number;
    paymentStatus: "PAID" | "COURTESY" | "PENDING_PAYMENT";
    paymentDueDate: string;
    amount: number;
    invoiceRef: string;
    notes: string;
  }>({
    planId: undefined,
    planName: "",
    planCode: "",
    customPlanName: "",
    customDays: 30,
    daysToAdd: 30,
    newSeats: tenant?.maxUserSeats || 1,
    paymentStatus: "PAID",
    paymentDueDate: "",
    amount: 0,
    invoiceRef: "",
    notes: "",
  });

  const applyPlanToForm = (plan: PlanItem) => {
    setRenewalForm((prev) => ({
      ...prev,
      planId: plan.id,
      planName: plan.name,
      planCode: plan.code,
      customPlanName: plan.name,
      customDays: plan.durationDays,
      daysToAdd: plan.durationDays,
      newSeats: plan.maxUserSeats,
      amount: plan.price,
      paymentStatus: plan.price === 0 ? "COURTESY" : "PAID",
    }));
  };

  // Carregar Planos Ativos do Catálogo
  useEffect(() => {
    if (!tenant) return;

    // Default paymentDueDate = 5 dias à frente
    const defaultDueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    setRenewalForm((prev) => ({
      ...prev,
      newSeats: tenant.maxUserSeats || 1,
      paymentDueDate: defaultDueDate,
    }));

    setIsLoadingPlans(true);
    fetch("/api/superadmin/plans?onlyActive=true")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.plans && json.plans.length > 0) {
          setAvailablePlans(json.plans);
          // Tentar casar com o plano atual ou o padrão
          const current = json.plans.find((p: PlanItem) => p.id === tenant.planId || p.code === tenant.planCode);
          const defaultPlan = json.plans.find((p: PlanItem) => p.isDefault) || json.plans[0];
          const target = current || defaultPlan;
          setSelectedPlanOption(target.id);
          applyPlanToForm(target);
        } else {
          setSelectedPlanOption("CUSTOM");
        }
      })
      .catch(() => setSelectedPlanOption("CUSTOM"))
      .finally(() => setIsLoadingPlans(false));
  }, [tenant]);

  if (!tenant) return null;

  const handlePlanOptionChange = (option: string) => {
    setSelectedPlanOption(option);
    if (option === "CUSTOM") {
      setRenewalForm((prev) => ({
        ...prev,
        planId: undefined,
        planName: "",
        planCode: "CUSTOM",
        customPlanName: "",
        customDays: 30,
        daysToAdd: 30,
        newSeats: Math.max(1, tenant.maxUserSeats || 1),
        amount: 0,
        paymentStatus: "PAID",
      }));
    } else {
      const found = availablePlans.find((p) => p.id === option);
      if (found) {
        applyPlanToForm(found);
      }
    }
  };

  const calculateResultingDate = (days: number): string => {
    const baseDate = tenant.isExpired || !tenant.expiresAt ? new Date() : new Date(tenant.expiresAt);
    const resDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    return resDate.toLocaleDateString("es-ES");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRenewalError(null);

    // Validação estrita se for Plano Customizado
    if (selectedPlanOption === "CUSTOM") {
      if (!renewalForm.customPlanName.trim() || renewalForm.customPlanName.trim().length < 3) {
        setRenewalError("En el Plan Personalizado, el nombre del plan es obligatorio y debe tener al menos 3 caracteres.");
        return;
      }
      if (!renewalForm.customDays || renewalForm.customDays < 1) {
        setRenewalError("En el Plan Personalizado, la duración en días es obligatoria y debe ser de al menos 1 día.");
        return;
      }
      if (!renewalForm.newSeats || renewalForm.newSeats < 1) {
        setRenewalError("En el Plan Personalizado, el cupo de inspectores es obligatorio y debe ser de al menos 1.");
        return;
      }
      if (renewalForm.newSeats < tenant.activeUsersCount) {
        setRenewalError(`El cupo no puede ser menor a los ${tenant.activeUsersCount} inspectores actualmente activos.`);
        return;
      }
      if (renewalForm.amount === undefined || renewalForm.amount === null || isNaN(renewalForm.amount) || renewalForm.amount < 0) {
        setRenewalError("En el Plan Personalizado, el importe en € es obligatorio (puede ser 0.00 para bonificación).");
        return;
      }
    }

    // Si está con pago pendiente, plazo del pago es obligatorio
    if (renewalForm.paymentStatus === "PENDING_PAYMENT") {
      if (!renewalForm.paymentDueDate) {
        setRenewalError("Para pagos pendientes (Factura/Recibo), es obligatorio indicar la fecha límite/plazo de pago.");
        return;
      }
    }

    const planNameToSend = selectedPlanOption === "CUSTOM"
      ? renewalForm.customPlanName.trim()
      : renewalForm.planName;

    const daysToSend = selectedPlanOption === "CUSTOM"
      ? Number(renewalForm.customDays)
      : Number(renewalForm.daysToAdd);

    const isCourtesy = renewalForm.paymentStatus === "COURTESY";
    const isPending = renewalForm.paymentStatus === "PENDING_PAYMENT";
    const resultingDateStr = calculateResultingDate(daysToSend || 30);

    const confirmed = await confirm({
      title: "¿Confirmar Renovación de Contrato?",
      message: (
        <div className="space-y-2.5 text-left text-xs">
          <p>
            Estás a punto de registrar una renovación para la empresa <strong>{tenant?.name}</strong>:
          </p>
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5 font-mono text-[11px]">
            <div>• Plan: <strong className="text-primary">{planNameToSend || "Plan Personalizado"}</strong></div>
            <div>• Vigencia Resultante: <strong>{resultingDateStr}</strong> (+{daysToSend} días)</div>
            <div>• Cupo de Inspectores: <strong>{renewalForm.newSeats}</strong></div>
            <div>• Importe: <strong>{renewalForm.amount ? `${Number(renewalForm.amount).toFixed(2)} €` : "0,00 €"}</strong></div>
            <div>
              • Estado Financiero:{" "}
              {isCourtesy ? (
                <span className="text-purple-600 dark:text-purple-400 font-bold">🎁 Bonificado (Cortesía sin coste)</span>
              ) : isPending ? (
                <span className="text-amber-600 dark:text-amber-400 font-bold">🟡 Pago Pendiente (plazo hasta {renewalForm.paymentDueDate || "—"})</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">🟢 Pagado / Factura Liquidada</span>
              )}
            </div>
          </div>
          {isCourtesy && (
            <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-[11px] font-semibold">
              ⚠️ Has seleccionado <strong>Bonificado (Cortesía)</strong>. Esta extensión de vigencia se concederá de inmediato sin coste monetario. ¿Deseas proceder?
            </div>
          )}
          {isPending && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px]">
              ℹ️ <strong>Pago Pendiente:</strong> La vigencia activa NO se extenderá en la plataforma hasta que el pago sea efectivamente confirmado.
            </div>
          )}
        </div>
      ),
      confirmLabel: isCourtesy ? "Confirmar Bonificación" : "Confirmar Renovación",
      cancelLabel: "Volver y Revisar",
      variant: isCourtesy ? "warning" : "primary",
      icon: isCourtesy ? "featured_seasonal_and_gifts" : "verified",
    });

    if (!confirmed) return;

    await onRenewContract({
      planId: selectedPlanOption === "CUSTOM" ? undefined : renewalForm.planId,
      planName: planNameToSend,
      planCode: selectedPlanOption === "CUSTOM" ? "CUSTOM" : renewalForm.planCode,
      daysToAdd: daysToSend,
      newSeats: Number(renewalForm.newSeats),
      paymentStatus: renewalForm.paymentStatus,
      paymentDueDate: renewalForm.paymentStatus === "PENDING_PAYMENT" ? renewalForm.paymentDueDate : undefined,
      amount: Number(renewalForm.amount),
      invoiceRef: renewalForm.invoiceRef,
      notes: renewalForm.notes,
    });
  };

  const handleConfirmPayment = async (contractId: string) => {
    if (!onConfirmPayment) return;
    const confirmed = await confirm({
      title: "¿Confirmar Efectivación de Pago?",
      message: (
        <span>
          ¿Confirmar que el pago de este contrato ha sido recibido y efectivado? La suscripción de la empresa se activará inmediatamente.
        </span>
      ),
      confirmLabel: "Sí, Confirmar Pago",
      cancelLabel: "Volver",
      variant: "success",
      icon: "verified",
    });
    if (!confirmed) return;

    setProcessingContractId(contractId);
    try {
      await onConfirmPayment(contractId);
    } finally {
      setProcessingContractId(null);
    }
  };

  const handleCancelOffer = async (contractId: string) => {
    const cancelFn = onCancelContract || onCancelOffer;
    if (!cancelFn) return;
    const confirmed = await confirm({
      title: "¿Cancelar Oferta de Contrato?",
      message: "Esta propuesta comercial caducada será anulada formalmente en el histórico de contratos.",
      confirmLabel: "Sí, Cancelar Oferta",
      cancelLabel: "Volver",
      variant: "danger",
      icon: "cancel",
    });
    if (!confirmed) return;

    setProcessingContractId(contractId);
    try {
      await cancelFn(contractId);
    } finally {
      setProcessingContractId(null);
    }
  };

  const handleCancelCourtesy = async (contract: ContractHistoryItem) => {
    const cancelFn = onCancelContract || onCancelOffer;
    if (!cancelFn) return;

    const now = Date.now();
    const expiresMs = new Date(contract.expiresAt).getTime();
    const validFromMs = new Date(contract.validFrom).getTime();

    // Regla: No podemos cancelar lo que ya ha pasado
    if (expiresMs <= now) {
      setRenewalError("No es posible anular una bonificación cuya vigencia ya ha finalizado.");
      return;
    }

    let daysUsed = 0;
    let daysRemaining = contract.daysAdded;
    if (now > validFromMs) {
      daysUsed = Math.min(contract.daysAdded, Math.ceil((now - validFromMs) / (24 * 60 * 60 * 1000)));
      daysRemaining = Math.max(0, contract.daysAdded - daysUsed);
      if (daysRemaining <= 0) {
        setRenewalError("No es posible anular la bonificación: todos los días ya han transcurrido y han sido consumidos.");
        return;
      }
    }

    const confirmed = await confirm({
      title: "¿Anular Bonificación de Contrato?",
      message: (
        <div className="space-y-2 text-left text-xs">
          <p>
            ¿Estás seguro de que deseas anular la bonificación de la empresa <strong>{tenant?.name}</strong>?
          </p>
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1">
            <div>• Días Bonificados Totales: <strong>+{contract.daysAdded}d</strong></div>
            {daysUsed > 0 && (
              <div>• Días Ya Transcurridos (se conservan): <strong>{daysUsed}d</strong></div>
            )}
            <div>• Días Remanentes a Cancelar: <strong className="text-alert-red">-{daysRemaining}d</strong></div>
          </div>
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-alert-red text-[11px] font-semibold">
            ⚠️ La vigencia de la suscripción se recalculará automáticamente descontando estos días y se ajustarán las fechas en cascada.
          </div>
        </div>
      ),
      confirmLabel: "Sí, Anular Bonificación",
      cancelLabel: "Volver",
      variant: "danger",
      icon: "cancel",
    });
    if (!confirmed) return;

    setProcessingContractId(contract.id);
    try {
      await cancelFn(contract.id, "Bonificación anulada por el SuperAdmin");
    } finally {
      setProcessingContractId(null);
    }
  };

  const getProportionalStats = (contract: ContractHistoryItem) => {
    const originalAmount = Number(contract.amount || 0);
    const alreadyRefunded = Number(contract.refundAmount || 0);
    const daysTotal = Math.max(1, contract.daysAdded || 1);

    const validFromMs = new Date(contract.validFrom).getTime();
    const nowMs = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    let daysUsed = 0;
    if (nowMs > validFromMs) {
      // Fracción de jornada cuenta como día completo (Math.ceil)
      daysUsed = Math.ceil((nowMs - validFromMs) / oneDayMs);
      daysUsed = Math.min(daysTotal, Math.max(0, daysUsed));
    }

    const daysRemaining = Math.max(0, daysTotal - daysUsed);
    const rawProportional = Number(((daysRemaining / daysTotal) * originalAmount).toFixed(2));
    const availableBalance = Math.max(0, Number((originalAmount - alreadyRefunded).toFixed(2)));
    const maxRefundable = Math.min(rawProportional, availableBalance);

    return {
      originalAmount,
      alreadyRefunded,
      daysTotal,
      daysUsed,
      daysRemaining,
      dailyRate: Number((originalAmount / daysTotal).toFixed(2)),
      maxRefundable,
    };
  };

  const openRefundDialog = (contract: ContractHistoryItem) => {
    const stats = getProportionalStats(contract);

    setRefundTargetContract(contract);
    setRefundError(null);
    setRefundForm({
      refundType: "TOTAL",
      refundAmount: stats.maxRefundable,
      refundReason: "",
      revokeAccess: stats.daysRemaining === 0,
    });
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setRefundError(null);
    if (!refundTargetContract || !onRefundContract) return;

    const stats = getProportionalStats(refundTargetContract);

    if (refundForm.refundAmount <= 0) {
      setRefundError("El importe a reembolsar debe ser superior a 0,00 €.");
      return;
    }

    if (refundForm.refundAmount > stats.maxRefundable) {
      setRefundError(
        `El importe solicitado (${refundForm.refundAmount.toFixed(2)} €) supera el máximo proporcional reembolsable (${stats.maxRefundable.toFixed(2)} €) correspondiente a los ${stats.daysRemaining} días restantes (de ${stats.daysTotal} contratados, habiendo utilizado ${stats.daysUsed} días).`
      );
      return;
    }

    if (!refundForm.refundReason.trim()) {
      setRefundError("Por favor, especifica el motivo del reembolso.");
      return;
    }

    const isTotal = refundForm.refundType === "TOTAL" || refundForm.refundAmount >= stats.maxRefundable;

    const confirmed = await confirm({
      title: "¿Confirmar Reembolso Proporcional?",
      message: (
        <div className="space-y-2 text-left text-xs">
          <p>
            Se procesará un <strong>reembolso {isTotal ? "total de días restantes" : "parcial"}</strong> de{" "}
            <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">
              {Number(refundForm.refundAmount).toFixed(2)} €
            </strong>{" "}
            para la empresa <strong>{tenant?.name}</strong>.
          </p>
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1">
            <div>• Días Contratados: <strong>{stats.daysTotal}d</strong></div>
            <div>• Días Utilizados: <strong>{stats.daysUsed}d</strong> (jornada computada completa)</div>
            <div>• Días Restantes Reembolsados: <strong>{stats.daysRemaining}d</strong></div>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px]">
            ℹ️ Los días de vencimiento de la empresa se recalcularán automáticamente descontando este período.
          </div>
          {isTotal && refundForm.revokeAccess && (
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-alert-red font-semibold text-[11px]">
              ⚠️ El acceso a la plataforma será suspendido inmediatamente.
            </div>
          )}
        </div>
      ),
      confirmLabel: "Sí, Emitir Reembolso",
      cancelLabel: "Volver",
      variant: "danger",
      icon: "currency_exchange",
    });

    if (!confirmed) return;

    setIsProcessingRefund(true);
    try {
      await onRefundContract({
        contractId: refundTargetContract.id,
        refundType: isTotal ? "TOTAL" : "PARTIAL",
        refundAmount: Number(refundForm.refundAmount),
        refundReason: refundForm.refundReason.trim(),
        revokeAccess: isTotal && refundForm.revokeAccess,
      });
      setRefundTargetContract(null);
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const isCustom = selectedPlanOption === "CUSTOM";
  const currentDays = isCustom ? renewalForm.customDays : renewalForm.daysToAdd;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 cursor-default"
      onClick={(e) => {
        // Clicar fora do modal não deve fechá-lo
        e.stopPropagation();
      }}
    >
      <div
        className="w-full max-w-3xl bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-space-lg shadow-2xl border border-slate-border dark:border-slate-800 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="flex items-start justify-between border-b border-slate-border/70 dark:border-slate-800 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-primary dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              <span>Salud Financiera &amp; Gestión de Contrato</span>
            </div>
            <h2 className="font-title-md text-title-md text-slate-900 dark:text-slate-100 font-bold">
              {tenant.name}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-subtext dark:text-slate-400 flex-wrap">
              <span>CIF: <strong className="font-mono text-slate-800 dark:text-slate-200">{tenant.cif}</strong></span>
              <span>•</span>
              <span>
                Vencimiento Actual:{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  {tenant.expiresAt ? new Date(tenant.expiresAt).toLocaleDateString("es-ES") : "—"}
                </strong>{" "}
                {tenant.daysRemaining != null ? `(${tenant.daysRemaining} días)` : ""}
              </span>
              <span>•</span>
              <span>Estado: </span>
              {!tenant.paymentStatus && !tenant.expiresAt ? (
                <span className="font-semibold text-slate-subtext dark:text-slate-400">—</span>
              ) : tenant.isExpired ? (
                <span className="font-bold text-alert-red bg-alert-red-bg/25 text-[10px] px-2 py-0.5 rounded-full">Vencido</span>
              ) : tenant.paymentStatus === "PENDING_PAYMENT" ? (
                <span className="font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 text-[10px] px-2 py-0.5 rounded-full">Factura Pendiente</span>
              ) : tenant.paymentStatus === "COURTESY" ? (
                <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/70 text-[10px] px-2 py-0.5 rounded-full">Bonificado</span>
              ) : tenant.paymentStatus === "REFUNDED" ? (
                <span className="font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/70 text-[10px] px-2 py-0.5 rounded-full">Reembolsado</span>
              ) : tenant.paymentStatus === "PARTIALLY_REFUNDED" ? (
                <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 text-[10px] px-2 py-0.5 rounded-full">Reembolso Parcial</span>
              ) : (
                <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 text-[10px] px-2 py-0.5 rounded-full">Pagado / Al Día</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Cerrar modal"
            className="w-8 h-8 rounded-xl bg-surface-container/60 dark:bg-slate-800 border border-slate-border dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-surface-container-high dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pt-3 pr-1">
          {/* Formulario de Renovación / Modificación de Vigencia */}
          <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-surface border border-slate-border space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-border/50 pb-2">
              <span className="text-xs font-bold text-on-surface uppercase flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">update</span>
                <span>Renovar Contrato / Modificar Vigencia</span>
              </span>
              <span className="text-[11px] text-slate-subtext">
                {tenant.isExpired
                  ? "⚠️ Plan vencido. Si el pago es pendiente, el acceso permanecerá restringido hasta su confirmación."
                  : "Extiende la vigencia a partir de la fecha de vencimiento actual."}
              </span>
            </div>

            {renewalError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-alert-red text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{renewalError}</span>
              </div>
            )}

            {/* SELECCIÓN DEL PLAN: Planes Activos del Catálogo o Plan Personalizado */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[11px] font-bold text-on-surface uppercase flex items-center justify-between">
                  <span>Seleccionar Plan de Renovación *</span>
                  {isLoadingPlans && <span className="text-[10px] text-primary lowercase animate-pulse">cargando planes...</span>}
                </label>
                <select
                  value={selectedPlanOption}
                  onChange={(e) => handlePlanOptionChange(e.target.value)}
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                >
                  <optgroup label="Planes Activos del Catálogo">
                    {availablePlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.durationDays}d | {p.maxUserSeats} inspectores | {p.price > 0 ? `${p.price} €` : "Bonificado"}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Personalización">
                    <option value="CUSTOM">⚙️ Plan Personalizado (Todos los campos obligatorios)</option>
                  </optgroup>
                </select>
              </div>

              {/* Informação da Vigência Resultante */}
              <div className="flex flex-col gap-1 justify-center bg-surface-container/70 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-border/80 dark:border-slate-700/80 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Nueva Fecha Estimada
                </span>
                <div className="flex items-center gap-1.5 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  <span className="material-symbols-outlined text-[17px]">calendar_month</span>
                  <span>{calculateResultingDate(currentDays || 30)}</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  (+{currentDays || 0} días {tenant.isExpired ? "desde hoy" : "desde vencimiento"})
                </span>
              </div>
            </div>

            {/* SE FOR PLANO PERSONALIZADO: Exibe os campos obrigatórios */}
            {isCustom && (
              <div className="p-3 bg-amber-500/5 dark:bg-amber-950/20 rounded-xl border border-amber-500/30 space-y-3 animate-in fade-in">
                <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">tune</span>
                  <span>Parámetros del Plan Personalizado (Todos Obligatorios)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-on-surface uppercase">
                      Nombre del Plan Personalizado *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Plan Acuerdo Especial Anual 2026"
                      value={renewalForm.customPlanName}
                      onChange={(e) => setRenewalForm({ ...renewalForm, customPlanName: e.target.value })}
                      className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface uppercase">
                      Duración en Días *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={3650}
                      value={renewalForm.customDays}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setRenewalForm({ ...renewalForm, customDays: val, daysToAdd: val });
                      }}
                      className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CUPO DE INSPECTORES E VALOR */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-on-surface uppercase">
                  Cupo de Inspectores {isCustom && "*"}
                </label>
                <input
                  type="number"
                  min={Math.max(1, tenant.activeUsersCount)}
                  max={500}
                  required
                  value={renewalForm.newSeats}
                  onChange={(e) => setRenewalForm({ ...renewalForm, newSeats: Number(e.target.value) })}
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                />
                <span className="text-[10px] text-slate-subtext">Mínimo: {tenant.activeUsersCount} activos</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-on-surface uppercase">
                  Importe / Valor (€) {isCustom && "*"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  placeholder="0.00"
                  value={renewalForm.amount}
                  onChange={(e) => setRenewalForm({ ...renewalForm, amount: Number(e.target.value) })}
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-mono font-bold"
                />
              </div>

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
                  <option value="PENDING_PAYMENT">🟡 Factura / Pago Pendiente</option>
                </select>
              </div>
            </div>

            {/* SI ES PAGO PENDIENTE: CAMPO DE PLAZO LÍMITE DE PAGO */}
            {renewalForm.paymentStatus === "PENDING_PAYMENT" && (
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/40 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  <span>Plazo Límite de Pago / Caducidad de la Oferta *</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface uppercase">
                      Fecha Límite para el Pago *
                    </label>
                    <input
                      type="date"
                      required
                      value={renewalForm.paymentDueDate}
                      onChange={(e) => setRenewalForm({ ...renewalForm, paymentDueDate: e.target.value })}
                      className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface uppercase">
                      Ref. Factura o Recibo
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. FAC-2026-1049"
                      value={renewalForm.invoiceRef}
                      onChange={(e) => setRenewalForm({ ...renewalForm, invoiceRef: e.target.value })}
                      className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-200">
                  ℹ️ Si no se liquida dentro del plazo, la oferta caduca. Mientras el pago no sea confirmado, si la empresa estaba vencida no tendrá acceso a la plataforma.
                </p>
              </div>
            )}

            {renewalForm.paymentStatus !== "PENDING_PAYMENT" && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-on-surface uppercase">
                  Ref. Factura o Recibo
                </label>
                <input
                  type="text"
                  placeholder="Ej. FAC-2026-1049"
                  value={renewalForm.invoiceRef}
                  onChange={(e) => setRenewalForm({ ...renewalForm, invoiceRef: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-on-surface uppercase">
                Notas Comerciales / Justificativa
              </label>
              <input
                type="text"
                placeholder="Ej. Renovación acordada con descuento comercial y confirmación telefónica."
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
            ) : contracts.length === 0 ? (
              <div className="p-6 rounded-xl bg-surface border border-slate-border text-center text-xs text-slate-subtext">
                No hay registros históricos de contratos aún. Los eventos de renovación quedarán registrados aquí para auditoría comercial.
              </div>
            ) : (
              <div className="border border-slate-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container font-bold text-slate-subtext uppercase tracking-wider border-b border-slate-border">
                    <tr>
                      <th className="py-2 px-3">Fecha &amp; Acción</th>
                      <th className="py-2 px-3">Plan &amp; Vigencia</th>
                      <th className="py-2 px-3">Cupo</th>
                      <th className="py-2 px-3">Estado Financiero</th>
                      <th className="py-2 px-3">Factura / Ref</th>
                      <th className="py-2 px-3 text-right">Acción Comercial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-border/50 text-on-surface">
                    {contracts.map((c) => {
                      const isPending = c.paymentStatus === "PENDING_PAYMENT";
                      const isExpiredOffer = c.isOfferExpired || (isPending && c.paymentDueDate && new Date() > new Date(c.paymentDueDate));

                      return (
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
                            {c.planName && (
                              <div className="font-bold text-primary text-[11px] truncate max-w-[140px]" title={c.planName}>
                                {c.planName}
                              </div>
                            )}
                            <div>Hasta {new Date(c.expiresAt).toLocaleDateString("es-ES")}</div>
                            <div className="text-[10px] text-slate-subtext font-mono">+{c.daysAdded} días</div>
                          </td>

                          <td className="py-2.5 px-3 font-bold">
                            {c.seats} inspectores
                          </td>

                          <td className="py-2.5 px-3">
                            {c.paymentStatus === "CANCELLED" ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                Cancelado / Caducado
                              </span>
                            ) : c.paymentStatus === "REFUNDED" ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Reembolsado Total
                                </span>
                                {c.refundAmount ? (
                                  <span className="text-[9px] text-rose-600 dark:text-rose-400 font-mono">
                                    -{Number(c.refundAmount).toFixed(2)} €
                                  </span>
                                ) : null}
                              </div>
                            ) : c.paymentStatus === "PARTIALLY_REFUNDED" ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  Reembolso Parcial
                                </span>
                                {c.refundAmount ? (
                                  <span className="text-[9px] text-amber-700 dark:text-amber-400 font-mono">
                                    Reemb: -{Number(c.refundAmount).toFixed(2)} € (Saldo: {(Number(c.amount || 0) - Number(c.refundAmount || 0)).toFixed(2)} €)
                                  </span>
                                ) : null}
                              </div>
                            ) : isPending ? (
                              <div className="flex flex-col gap-0.5">
                                {isExpiredOffer ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-alert-red-bg/25 text-alert-red inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-alert-red" />
                                    Oferta Caducada
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    Factura Pendiente
                                  </span>
                                )}
                                {c.paymentDueDate && (
                                  <span className="text-[9px] text-slate-subtext">
                                    Plazo: {new Date(c.paymentDueDate).toLocaleDateString("es-ES")}
                                  </span>
                                )}
                              </div>
                            ) : c.paymentStatus === "COURTESY" ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300">
                                Bonificado
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                                Pagado / Al Día
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-mono text-[11px]">
                            {c.invoiceRef || "—"}
                            {c.amount ? <div className="text-slate-subtext text-[10px]">{c.amount} €</div> : null}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            {isPending && (
                              <div className="flex items-center justify-end gap-1.5">
                                {onConfirmPayment && (
                                  <button
                                    type="button"
                                    disabled={processingContractId === c.id}
                                    onClick={() => handleConfirmPayment(c.id)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-status-pass text-white hover:bg-emerald-600 disabled:opacity-50 inline-flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                                    title="Marcar pago como recibido y efectivado"
                                  >
                                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                    <span>{processingContractId === c.id ? "Efectivando..." : "Confirmar Pago"}</span>
                                  </button>
                                )}
                                {isExpiredOffer && onCancelOffer && (
                                  <button
                                    type="button"
                                    disabled={processingContractId === c.id}
                                    onClick={() => handleCancelOffer(c.id)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-alert-red hover:text-white disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Cancelar esta oferta de contrato caducada"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">cancel</span>
                                    <span>Cancelar</span>
                                  </button>
                                )}
                              </div>
                            )}
                            {!isPending && (() => {
                              const nowMs = Date.now();
                              const validFromMs = new Date(c.validFrom).getTime();
                              const expiresMs = new Date(c.expiresAt).getTime();
                              const isPast = expiresMs <= nowMs;

                              const isPaidOrPartial = c.paymentStatus === "PAID" || c.paymentStatus === "PARTIALLY_REFUNDED";
                              const isCourtesy = c.paymentStatus === "COURTESY";
                              const origAmt = Number(c.amount || 0);
                              const refAmt = Number(c.refundAmount || 0);
                              const remainingAmt = Math.max(0, origAmt - refAmt);

                              // Calcular consumo real de días para bonificaciones
                              let courtesyDaysRemaining = c.daysAdded;
                              if (nowMs > validFromMs) {
                                const daysUsed = Math.min(c.daysAdded, Math.ceil((nowMs - validFromMs) / (24 * 60 * 60 * 1000)));
                                courtesyDaysRemaining = Math.max(0, c.daysAdded - daysUsed);
                              }

                              // Calcular consumo para reembolsos
                              const stats = getProportionalStats(c);

                              // Regla: No podemos cancelar o reembolsar lo que ya ha pasado o consumido
                              const canCancelCourtesy = isCourtesy && !isPast && courtesyDaysRemaining > 0 && Boolean(onCancelContract || onCancelOffer);
                              const canRefund = isPaidOrPartial && !isPast && origAmt > 0 && remainingAmt > 0 && stats.daysRemaining > 0 && Boolean(onRefundContract);

                              if (!canCancelCourtesy && !canRefund && !c.notes) {
                                return <span className="text-slate-subtext text-[11px]">—</span>;
                              }

                              return (
                                <div className="flex items-center justify-end gap-2 flex-wrap">
                                  {c.notes && (
                                    <span className="text-[10px] text-slate-subtext max-w-[120px] truncate inline-block" title={c.notes}>
                                      {c.notes}
                                    </span>
                                  )}
                                  {canCancelCourtesy && (
                                    <button
                                      type="button"
                                      disabled={processingContractId === c.id}
                                      onClick={() => handleCancelCourtesy(c)}
                                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900/60 hover:bg-alert-red hover:text-white dark:hover:bg-alert-red dark:hover:text-white disabled:opacity-50 inline-flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                                      title="Anular esta bonificación y recalcular la vigencia de la empresa"
                                    >
                                      <span className="material-symbols-outlined text-[13px]">block</span>
                                      <span>{processingContractId === c.id ? "Anulando..." : "Anular Bonificación"}</span>
                                    </button>
                                  )}
                                  {canRefund && (
                                    <button
                                      type="button"
                                      disabled={processingContractId === c.id}
                                      onClick={() => openRefundDialog(c)}
                                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 disabled:opacity-50 inline-flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                                      title={`Emitir reembolso total o proporcional (Saldo disponible: ${remainingAmt.toFixed(2)} €)`}
                                    >
                                      <span className="material-symbols-outlined text-[13px]">currency_exchange</span>
                                      <span>Reembolsar</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submodal de Gestión de Reembolso Total / Parcial */}
      {refundTargetContract && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-full max-w-lg bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-border dark:border-slate-800 animate-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Submodal */}
            <div className="flex items-start justify-between border-b border-slate-border/70 dark:border-slate-800 pb-3">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider mb-0.5">
                  <span className="material-symbols-outlined text-[16px]">currency_exchange</span>
                  <span>Gestión de Reembolso Financiero</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Reembolsar Contrato — {tenant?.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRefundTargetContract(null)}
                title="Cerrar ventana de reembolso"
                className="w-7 h-7 rounded-xl bg-surface-container/60 dark:bg-slate-800 border border-slate-border dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Panel con Datos y Regla Proporcional */}
            {(() => {
              const stats = getProportionalStats(refundTargetContract);

              return (
                <form onSubmit={handleProcessRefund} className="space-y-4">
                  <div className="p-3 bg-surface-container-low dark:bg-slate-800/60 rounded-xl border border-slate-border/80 dark:border-slate-700/80 space-y-2">
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-subtext block uppercase font-bold">Contratados</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {stats.daysTotal}d
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-subtext block uppercase font-bold">Utilizados</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                          {stats.daysUsed}d
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-subtext block uppercase font-bold">Restantes</span>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                          {stats.daysRemaining}d
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-subtext block uppercase font-bold">Máx. Proporcional</span>
                        <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                          {stats.maxRefundable.toFixed(2)} €
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center border-t border-slate-border/50 dark:border-slate-700/50 pt-1.5 leading-tight">
                      ⚖️ <strong>Cálculo Proporcional:</strong> {stats.originalAmount.toFixed(2)} € ÷ {stats.daysTotal}d = {stats.dailyRate.toFixed(2)} €/día. Cualquier fracción de jornada computa como día completo.
                    </div>
                  </div>

                  {refundError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                      <span className="material-symbols-outlined text-[18px]">error</span>
                      <span>{refundError}</span>
                    </div>
                  )}

                  {/* Selector: Total Restante o Parcial */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-on-surface uppercase block">
                      Tipo de Reembolso *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRefundForm((prev) => ({
                            ...prev,
                            refundType: "TOTAL",
                            refundAmount: stats.maxRefundable,
                            revokeAccess: stats.daysRemaining === 0,
                          }));
                        }}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          refundForm.refundType === "TOTAL"
                            ? "border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 ring-1 ring-rose-500 font-bold"
                            : "border-slate-border bg-surface-container-lowest dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-surface-container-low"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                          <span>Reembolso Total Días Restantes</span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          Devolver saldo restante ({stats.maxRefundable.toFixed(2)} €)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRefundForm((prev) => ({
                            ...prev,
                            refundType: "PARTIAL",
                            refundAmount: Number((stats.maxRefundable / 2).toFixed(2)),
                            revokeAccess: false,
                          }));
                        }}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          refundForm.refundType === "PARTIAL"
                            ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 ring-1 ring-amber-500 font-bold"
                            : "border-slate-border bg-surface-container-lowest dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-surface-container-low"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="material-symbols-outlined text-[16px]">pie_chart</span>
                          <span>Reembolso Parcial</span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          Ajuste proporcional menor
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Importe a devolver */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface uppercase flex items-center justify-between">
                      <span>Importe a Reembolsar (€) *</span>
                      <span className="text-[10px] text-slate-subtext">Máximo Proporcional: {stats.maxRefundable.toFixed(2)} €</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={stats.maxRefundable}
                        required
                        value={refundForm.refundAmount}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setRefundForm((prev) => ({
                            ...prev,
                            refundAmount: val,
                            refundType: val >= stats.maxRefundable ? "TOTAL" : "PARTIAL",
                          }));
                        }}
                        className="w-full h-10 px-3 pr-8 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface font-mono font-bold focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                        €
                      </span>
                    </div>
                  </div>

                  {/* Motivo */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface uppercase">
                      Motivo / Justificación del Reembolso *
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Ej. Solicitud de desistimiento dentro de los 14 días reglamentarios o ajuste acordado..."
                      value={refundForm.refundReason}
                      onChange={(e) => setRefundForm({ ...refundForm, refundReason: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
                    />
                  </div>

                  {/* Opción de revocación de acceso */}
                  {refundForm.refundType === "TOTAL" && (
                    <label className="flex items-start gap-2 p-2.5 rounded-xl bg-red-500/5 dark:bg-red-950/30 border border-red-500/20 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={refundForm.revokeAccess}
                        onChange={(e) => setRefundForm({ ...refundForm, revokeAccess: e.target.checked })}
                        className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                      />
                      <div className="text-[11px]">
                        <span className="font-bold text-red-900 dark:text-red-200 block">
                          Revocar y suspender acceso a la plataforma
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 block text-[10px]">
                          La suscripción de la empresa pasará a estado expirado y sus inspectores no podrán iniciar sesión.
                        </span>
                      </div>
                    </label>
                  )}

                  {/* Botones de Acción */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-border/50">
                    <button
                      type="button"
                      onClick={() => setRefundTargetContract(null)}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-surface-container/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-surface-container-high cursor-pointer transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessingRefund}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">currency_exchange</span>
                      <span>{isProcessingRefund ? "Procesando Reembolso..." : "Efectuar Reembolso"}</span>
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {ConfirmDialogComponent}
    </div>
  );
}
