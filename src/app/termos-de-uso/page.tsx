import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Scale, FileText, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Términos del Servicio — BioAudit Pro",
  description: "Términos y condiciones legales de uso de la plataforma SaaS BioAudit Pro para inspecciones higiénico-sanitarias.",
};

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-800 dark:text-stone-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Top */}
        <div className="mb-6">
          <Link
            href="/auditorias/nova"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a la aplicación
          </Link>
        </div>

        {/* Card Header */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-10 shadow-sm border border-stone-200 dark:border-stone-800 mb-8">
          <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400 mb-3">
            <Scale className="w-8 h-8" />
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              Marco Legal B2B
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-stone-900 dark:text-white tracking-tight">
            Términos y Condiciones del Servicio
          </h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            Última actualización: 21 de octubre de 2026 • Versión 1.0 (Conforme a la normativa de la UE y de España)
          </p>
        </div>

        {/* Legal Sections */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-10 shadow-sm border border-stone-200 dark:border-stone-800 space-y-8 text-sm sm:text-base leading-relaxed text-stone-700 dark:text-stone-300">
          
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 inline-flex items-center justify-center text-sm font-bold">1</span>
              Objeto del Servicio y Licencia SaaS
            </h2>
            <p>
              <strong>BioAudit Pro</strong> es una plataforma tecnológica como servicio (SaaS) diseñada para la planificación, ejecución, dictamen y generación de actas técnicas de auditorías higiénico-sanitarias bajo el marco regulatorio del <strong>Reglamento (CE) nº 852/2004</strong>, la norma <strong>ISO 22000</strong> y el <strong>Real Decreto 1021/2022</strong>.
            </p>
            <p className="mt-2">
              El acceso se otorga bajo una licencia multi-tenant limitada, no exclusiva, intransferible y sujeta al número de asientos/inspectores contratados y vigencia de la suscripción dictada por la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 inline-flex items-center justify-center text-sm font-bold">2</span>
              Responsabilidad Técnica y Criterio del Auditor
            </h2>
            <p>
              El usuario inspector y la entidad titular de la suscripción (Tenant) son los <strong>únicos y exclusivos responsables</strong> de la veracidad, rigor técnico, exactitud de las evidencias fotográficas y calificación otorgada en cada punto de control sanitario.
            </p>
            <p className="mt-2">
              BioAudit Pro actúa como herramienta de registro estructurado y cálculo asistido de índices de conformidad, no emitiendo dictámenes periciales por sí misma ni sustituyendo el criterio profesional legalmente habilitado del auditor de inocuidad alimentaria.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 inline-flex items-center justify-center text-sm font-bold">3</span>
              Validez Jurídica de las Firmas Electrónicas en Pantalla
            </h2>
            <p>
              Las firmas del inspector y del responsable del establecimiento auditado capturadas a través de la interfaz digital constituyen una <strong>firma electrónica simple/avanzada</strong> conforme al <strong>Reglamento (UE) nº 910/2014 (eIDAS)</strong> y a la legislación española y brasileña aplicable. Las partes aceptan expresamente su plena fuerza probatoria como constancia de conformidad de la auditoría efectuada.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 inline-flex items-center justify-center text-sm font-bold">4</span>
              Disponibilidad, Modo Offline y Sincronización
            </h2>
            <p>
              La plataforma incluye capacidades de funcionamiento offline (Progressive Web App - PWA e IndexedDB local) para operar en cámaras frigoríficas o plantas industriales sin cobertura de telecomunicaciones. El usuario se compromete a sincronizar el dispositivo con la red en cuanto disponga de conexión estable para asegurar la inmutabilidad y consolidación de los informes.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 inline-flex items-center justify-center text-sm font-bold">5</span>
              Propiedad Intelectual y Custodia de Datos
            </h2>
            <p>
              La arquitectura de software, algoritmos de cálculo, diseño de interfaz y catálogos de buenas prácticas son propiedad intelectual exclusiva de BioAudit Pro. Por el contrario, los datos específicos de los establecimientos auditados, actas e imágenes son propiedad de la empresa auditora titular del Tenant.
            </p>
          </section>

          <div className="pt-6 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/politica-de-privacidade"
              className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline inline-flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Consultar Política de Privacidad y Protección de Datos
            </Link>
            <Link
              href="/auditoria/nova"
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold transition-all"
            >
              Entendido y Volver
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
