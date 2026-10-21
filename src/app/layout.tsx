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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-surface text-on-surface antialiased flex flex-col min-h-screen">
        {children}
      </body>
    </html>
  );
}
