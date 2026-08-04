import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexGen DashCam — Dashboard",
  description: "Cloud dashboard for NexGen DashCam recordings, plates, and trips.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="min-h-screen bg-background text-text-primary">
            <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur">
              <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold">🚗 NexGen DashCam</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-text-secondary">
                  <a href="/" className="hover:text-text-primary transition-colors">Dashboard</a>
                  <a href="/trips" className="hover:text-text-primary transition-colors">Trips</a>
                  <a href="/plates" className="hover:text-text-primary transition-colors">Plates</a>
                  <a href="/settings" className="hover:text-text-primary transition-colors">Settings</a>
                </div>
              </nav>
            </header>
            <main className="mx-auto max-w-7xl px-6 py-8">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
