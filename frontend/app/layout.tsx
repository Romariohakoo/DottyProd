import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Link from "next/link";
import Script from "next/script";

import { QueryProvider } from "@app/index";
import { AuthLinks, UserBadge } from "@entities/user";
import { LogoutButton } from "@features/user/logout";
import { YANDEX_MAPS_API_KEY } from "@shared/config";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Dotty — ваши путешествия",
  description: "Поездки, места и события вашего путешествия в одном месте.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full">
        {YANDEX_MAPS_API_KEY ? (
          <Script
            id="yandex-maps-sdk"
            src={`https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(YANDEX_MAPS_API_KEY)}&lang=ru_RU`}
            strategy="beforeInteractive"
          />
        ) : null}
        <QueryProvider>
          <a href="#main-content" className="m3-skip-link">
            К содержимому
          </a>
          <header className="m3-header">
            <div className="m3-header-content">
              <Link href="/" className="m3-brand" aria-label="Dotty — главная">
                <svg
                  className="m3-brand-mark"
                  viewBox="0 0 34 34"
                  aria-hidden="true"
                >
                  <path
                    d="M8 26 C 8 14, 26 20, 26 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray="0.1 5"
                    strokeLinecap="round"
                  />
                  <circle cx="8" cy="26" r="5" fill="currentColor" />
                  <circle cx="26" cy="8" r="5" fill="currentColor" />
                  <circle cx="17" cy="17" r="3" fill="#d9f35b" />
                </svg>
                dotty
              </Link>
              <div className="m3-header-actions">
                <UserBadge />
                <LogoutButton />
                <AuthLinks />
              </div>
            </div>
          </header>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
