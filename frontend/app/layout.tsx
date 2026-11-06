import type { Metadata } from 'next';

import { QueryProvider } from '@app/index';

import './globals.css';

export const metadata: Metadata = {
  title: 'NextJS template',
  description: 'Template for NextJS projects',
};

export default function RootLayout({
  children,
}: LayoutProps<'/'>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
