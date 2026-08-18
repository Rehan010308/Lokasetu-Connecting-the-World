import type { Metadata, Viewport } from 'next';
import './globals.css';
import { StoreProvider } from '@/components/store';

export const metadata: Metadata = {
  title: 'KaamSetu — hyperlocal work, in your language',
  description:
    'KaamSetu connects electricians, plumbers, cooks, house help, barbers, painters, carpenters and scrap collectors with residents in their own neighbourhood — by voice, in six languages.',
};

export const viewport: Viewport = {
  themeColor: '#0f6c4a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
