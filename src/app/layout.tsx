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
                  var stored = localStorage.getItem('bioaudit_theme');
                  // O tema normal (claro) é o padrão oficial. O modo escuro é opcional por escolha ativa.
                  if (stored === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-surface dark:bg-slate-950 text-on-surface dark:text-slate-100 antialiased flex flex-col min-h-screen transition-colors duration-150">
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <LegalFooter />
        <CookieConsentBanner />
      </body>
    </html>
  );
}
