import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BioAudit Pro — Control e Inocuidad Alimentaria Certificada",
  description:
    "Dispositivo de Inspección de Campo para Auditorías Higiénico-Sanitarias y Control del Sistema APPCC en la Industria Alimentaria (RD 852/2004, ISO 22000).",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#006948",
};

import { CookieConsentBanner } from "@/presentation/components/CookieConsentBanner";
import { LegalFooter } from "@/presentation/components/LegalFooter";
import { Header } from "@/presentation/components/Header";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // 1. Prioridade para parâmetro de URL (ex: links compartilhados em modo claro)
                  var searchParams = new URLSearchParams(window.location.search);
                  var urlTheme = searchParams.get('theme') || searchParams.get('mode');
                  if (urlTheme === 'light') {
                    document.documentElement.classList.remove('dark');
                    return;
                  }
                  if (urlTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                    return;
                  }

                  // 2. Leitura do tema armazenado no localStorage (o padrão oficial é sempre Claro/Light)
                  var stored = localStorage.getItem('bioaudit_theme');
                  if (stored === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}

                // 3. Listener global para garantir que impressão/PDF sempre renderize 100% em Modo Claro
                if (typeof window !== 'undefined') {
                  window.addEventListener('beforeprint', function() {
                    if (document.documentElement.classList.contains('dark')) {
                      document.documentElement.classList.remove('dark');
                      document.documentElement.setAttribute('data-was-dark', 'true');
                    }
                  });
                  window.addEventListener('afterprint', function() {
                    if (document.documentElement.getAttribute('data-was-dark') === 'true') {
                      document.documentElement.classList.add('dark');
                      document.documentElement.removeAttribute('data-was-dark');
                    }
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body className="bg-surface dark:bg-slate-950 text-on-surface dark:text-slate-100 antialiased flex flex-col min-h-screen transition-colors duration-150">
        <Header />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <LegalFooter />
        <CookieConsentBanner />
      </body>
    </html>
  );
}
