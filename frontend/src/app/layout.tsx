import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "GouPay",
  description: "Gateway de pagamentos e marketplace SaaS. Venda seus produtos online com checkout profissional, split de pagamentos e saques via Pix.",
  keywords: "gateway de pagamentos, marketplace, pix, cartão de crédito, split, vendas online",
  applicationName: "GouPay",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GouPay",
  },
  openGraph: {
    title: "GouPay",
    description: "Gateway de pagamentos e marketplace SaaS. Venda seus produtos online com checkout profissional, split de pagamentos e saques via Pix.",
    siteName: "GouPay",
    images: ["/logo.png"],
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary",
    title: "GouPay",
    images: ["/logo.png"],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: 'var(--success)', secondary: 'var(--bg-card)' },
              },
              error: {
                iconTheme: { primary: 'var(--danger)', secondary: 'var(--bg-card)' },
              },
            }}
          />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
