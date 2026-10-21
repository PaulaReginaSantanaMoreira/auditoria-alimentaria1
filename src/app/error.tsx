"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
        <span className="text-2xl font-bold text-rose-400">!</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
        Algo ha salido mal
      </h1>
      <p className="text-sm text-slate-400 max-w-md mb-8">
        Se ha producido un error inesperado al procesar la solicitud.
      </p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => reset()}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/20 transition-all"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 transition-all"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
