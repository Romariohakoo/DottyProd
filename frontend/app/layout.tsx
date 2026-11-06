import type { Metadata } from "next";

import { QueryProvider } from "@app/index";
import { AuthLinks, UserBadge } from "@entities/user";
import { LogoutButton } from "@features/user/logout";

import "./globals.css";

export const metadata: Metadata = {
  title: "NextJS template",
  description: "Template for NextJS projects",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full">
        <QueryProvider>
          <header className="border-b border-muted/50 bg-muted/10 backdrop-blur-sm">
            <div className="mx-auto flex min-h-16 w-full max-w-5xl items-center justify-end gap-3 px-4 md:px-8">
              <UserBadge />
              <LogoutButton />
              <AuthLinks />
            </div>
          </header>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
