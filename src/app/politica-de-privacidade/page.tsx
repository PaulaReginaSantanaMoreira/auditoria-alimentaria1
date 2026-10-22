import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Mail, UserCheck, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Política de Privacidad y Protección de Datos — BioAudit Pro",
  description: "Tratamiento de datos personales en BioAudit Pro en estricta conformidad con el RGPD / GDPR (UE) y la LGPD (Brasil).",
};

export default function PoliticaDePrivacidadePage() {
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
            <ShieldCheck className="w-8 h-8" />
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              Conformidad RGPD (UE 2016/679) &amp; LGPD (Ley 13.709/2018)
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-stone-900 dark:text-white tracking-tight">
            Política de Privacidad y Protección de Datos
          </h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            Última actualización: 21 de octubre de 2026 • Versión 1.0
          </p>
        </div>

        {/* Legal Sections */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-10 shadow-sm border border-stone-200 dark:border-stone-800 space-y-8 text-sm sm:text-base leading-relaxed text-stone-700 dark:text-stone-300">
          
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 inline-flex items-center justify-center text-sm font-bold">1</span>
              Responsable y Encargado del Tratamiento
            </h2>
            <p>
              A efectos del <strong>Reglamento General de Protección de Datos (RGPD UE 2016/679)</strong> y de la <strong>Ley General de Protección de Datos Personales de Brasil (LGPD Ley 13.709/2018)</strong>:
            </p>
            <ul className="mt-2 space-y-2 list-disc list-inside">
              <li>
                <strong>Responsable del Tratamiento (Controlador):</strong> La entidad o empresa auditora titular de la suscripción (Tenant), quien determina los fines y medios de las inspecciones en los establecimientos alimentarios.
              </li>
              <li>
                <strong>Encargado del Tratamiento (Operador):</strong> <strong>BioAudit Pro</strong>, que suministra la infraestructura tecnológica en la nube, bases de datos PostgreSQL cifradas y algoritmos para el procesamiento y generación de informes técnicos.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 inline-flex items-center justify-center text-sm font-bold">2</span>
              Datos Personales Objeto de Tratamiento
            </h2>
            <p>BioAudit Pro recopila estrictamente los datos necesarios para la emisión de actas oficiales de inspección higiénico-sanitaria:</p>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60">
                <span className="font-semibold text-stone-900 dark:text-white block mb-1">Del Inspector / Auditor:</span>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  Nombre completo, correo corporativo, NIF/NIE/Registro Oficial de Inspector, firma manuscrita digitalizada y credenciales de acceso seguras con cifrado bcrypt/argon2.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60">
                <span className="font-semibold text-stone-900 dark:text-white block mb-1">Del Establecimiento Auditado:</span>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  Razón social, CIF/NIF, número de registro sanitario (RGSEAA), dirección del local, nombre y firma del interlocutor o responsable de calidad en planta, y fotografías de evidencia técnica.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 inline-flex items-center justify-center text-sm font-bold">3</span>
              Bases Legales del Tratamiento
            </h2>
            <p>El tratamiento se fundamenta en:</p>
            <ul className="mt-2 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Ejecución Contractual (Art. 6.1.b RGPD / Art. 7.V LGPD):</strong> Para la prestación de los servicios contratados de inspección y generación de dictámenes.
              </li>
              <li>
                <strong>Cumplimiento de Obligación Legal Sanitaria (Art. 6.1.c RGPD / Art. 7.II LGPD):</strong> Para la observancia de la normativa oficial de control oficial de alimentos (Reglamento CE 852/2004 y RD 1021/2022).
              </li>
              <li>
                <strong>Consentimiento Explícito (Art. 6.1.a RGPD / Art. 7.I LGPD):</strong> En relación con las preferencias de cookies analíticas y funcionales, revocable en cualquier momento.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 inline-flex items-center justify-center text-sm font-bold">4</span>
              Seguridad, Cifrado y Retención
            </h2>
            <p>
              Todos los datos almacenados en Supabase PostgreSQL cuentan con <strong>Row Level Security (RLS)</strong> para impedir cualquier acceso cruzado entre diferentes empresas (Tenants). Las conexiones se realizan mediante HTTPS/TLS 1.3 con cifrado en reposo (AES-256). Las firmas y evidencias se preservan durante el plazo legal de prescripción de responsabilidades en materia de seguridad alimentaria (habitualmente 5 años).
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 inline-flex items-center justify-center text-sm font-bold">5</span>
              Derechos de los Titulares (ARCO-POL)
            </h2>
            <p>
              Usted puede ejercer en cualquier momento sus derechos de <strong>Acceso, Rectificación, Supresión (Derecho al Olvido), Limitación, Portabilidad y Oposición</strong> enviando una comunicación al Delegado de Protección de Datos (DPO).
            </p>
            <div className="mt-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
              <Mail className="w-6 h-6 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs uppercase font-bold text-emerald-800 dark:text-emerald-300 block">Canal Directo del DPO / Encarregado:</span>
                <a href="mailto:dpo@bioauditpro.com" className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 hover:underline">
                  dpo@bioauditpro.com
                </a>
              </div>
            </div>
          </section>

          <div className="pt-6 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/termos-de-uso"
              className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
            >
              Consultar Términos del Servicio
            </Link>
            <Link
              href="/auditoria/nova"
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold transition-all"
            >
              Comprendido y Volver
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
