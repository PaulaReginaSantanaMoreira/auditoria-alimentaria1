"use client";

import React from "react";
import Link from "next/link";

interface SuperAdminStatsCardsProps {
  tenantsCount: number;
  totalActiveUsers: number;
  adminAuditsCount: number;
  globalRubricPointsCount: number;
  onOpenGlobalRubric: () => void;
}

export function SuperAdminStatsCards({
  tenantsCount,
  totalActiveUsers,
  adminAuditsCount,
  globalRubricPointsCount,
  onOpenGlobalRubric,
}: SuperAdminStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm">
      <div className="p-space-md rounded-2xl bg-surface-container-lowest border border-slate-border shadow-sm">
        <div className="flex items-center justify-between text-slate-subtext text-label-sm font-bold uppercase tracking-wider">
          <span>Empresas</span>
          <span className="material-symbols-outlined text-primary text-[20px]">corporate_fare</span>
        </div>
        <div className="mt-2 text-2xl font-black text-on-surface">
          {tenantsCount}
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

      <Link
        href="/auditorias"
        className="p-space-md rounded-2xl bg-surface-container-lowest border border-slate-border shadow-sm cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group block"
        title="Ver todas las inspecciones sanitarias en el Centro de Inspecciones"
      >
        <div className="flex items-center justify-between text-slate-subtext text-label-sm font-bold uppercase tracking-wider">
          <span className="group-hover:text-primary transition-colors">Inspecciones</span>
          <span className="material-symbols-outlined text-primary text-[20px] group-hover:scale-110 transition-transform">
            verified_user
          </span>
        </div>
        <div className="mt-2 text-2xl font-black text-on-surface flex items-baseline justify-between">
          <span>{adminAuditsCount}</span>
          <span className="text-[11px] font-bold text-primary flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
            <span>Ver todas</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </span>
        </div>
      </Link>

      <div
        onClick={onOpenGlobalRubric}
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
  );
}
