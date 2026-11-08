import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import Link from "next/link";
import Script from "next/script";

import { QueryProvider } from "@app/index";
import { AuthLinks, UserBadge } from "@entities/user";
import { LogoutButton } from "@features/user/logout";
import { YANDEX_MAPS_API_KEY } from "@shared/config";

import "./globals.css";
import "./screens.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

const accentSerif = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: "500",
  style: "italic",
  variable: "--font-accent-serif",
});

export const metadata: Metadata = {
  title: "Dotty — ваши путешествия",
  description: "Поездки, места и события вашего путешествия в одном месте.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${accentSerif.variable} h-full antialiased`}
    >
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
                  viewBox="0 0 512 512"
                  aria-hidden="true"
                >
                  <path
                    fill="#f2f1ff"
                    d="M256 0C450 0 512 62 512 256S450 512 256 512 0 450 0 256 62 0 256 0Z"
                  />
                  <path
                    fill="currentColor"
                    d="M300 96C376 96 432 152 432 226 432 318 300 420 300 420S168 318 168 226C168 152 224 96 300 96Z"
                  />
                  <circle cx="300" cy="226" r="48" fill="#d9f35b" />
                  <circle
                    cx="92"
                    cy="388"
                    r="18"
                    fill="currentColor"
                    opacity=".35"
                  />
                  <circle
                    cx="148"
                    cy="404"
                    r="18"
                    fill="currentColor"
                    opacity=".6"
                  />
                  <circle
                    cx="208"
                    cy="412"
                    r="18"
                    fill="currentColor"
                    opacity=".85"
                  />
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
