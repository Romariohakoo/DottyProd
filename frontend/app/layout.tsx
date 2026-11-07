import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";

import { QueryProvider } from "@app/index";
import { AuthLinks, UserBadge } from "@entities/user";
import { LogoutButton } from "@features/user/logout";
import { YANDEX_MAPS_API_KEY } from "@shared/config";

import "./globals.css";

export const metadata: Metadata = {
  title: "TravelHub — ваши путешествия",
  description: "Поездки, места и события вашего путешествия в одном месте.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className="h-full antialiased">
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
              <Link
                href="/"
                className="m3-brand"
                aria-label="TravelHub — главная"
              >
                <span className="m3-brand-mark" aria-hidden="true">
                  ↗
                </span>
                TravelHub
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
