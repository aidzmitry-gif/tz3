import type { Metadata } from "next";
import { Lora, Manrope } from "next/font/google";
import "./globals.css";

const display = Lora({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Онлайн-запись",
  description: "Запись на услуги онлайн — выберите время, остальное мы напомним.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-8 sm:py-14">
          <header className="mb-10 flex items-center justify-between">
            <a href="/" className="group flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-paper transition-transform group-hover:-rotate-12">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M8 2v4M16 2v4M3 9h18M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
                </svg>
              </span>
              <span className="font-display text-lg font-medium tracking-tight">
                Запись
              </span>
            </a>
            <a
              href="/admin"
              className="text-sm text-muted underline-offset-4 transition hover:text-ink hover:underline"
            >
              Админка
            </a>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="mt-16 border-t border-ink/10 pt-6 text-xs text-muted">
            Время хранится в UTC, отображается в вашем часовом поясе.
          </footer>
        </div>
      </body>
    </html>
  );
}
