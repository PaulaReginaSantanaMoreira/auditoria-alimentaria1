import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
        <span className="text-2xl font-bold text-emerald-400">404</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
        Página no encontrada
      </h1>
      <p className="text-sm text-slate-400 max-w-md mb-8">
        El recurso que busca no existe o ha sido movido. Verifique la dirección o regrese a la página principal.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/20 transition-all"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
