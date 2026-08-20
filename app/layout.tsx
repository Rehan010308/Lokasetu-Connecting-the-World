import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: {
    default: 'LokaSetu — connecting the world of work',
    template: '%s · LokaSetu',
  },
  description:
    'A hyperlocal work network for India. Employers and workers agree on a price together, in the open, before the job starts.',
  applicationName: 'LokaSetu',
  keywords: ['work', 'hiring', 'India', 'hyperlocal', 'electrician', 'plumber', 'negotiation'],
  authors: [{ name: 'LokaSetu' }],
  openGraph: {
    title: 'LokaSetu — connecting the world of work',
    description:
      'Find work. Name your price. A hyperlocal work network where both sides agree on the number before anything starts.',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f6fb' },
    { media: '(prefers-color-scheme: dark)', color: '#070a14' },
  ],
};

/**
 * Applied before the first paint, so a person who chose dark mode never sees a
 * white flash on the way in. It is small, synchronous and deliberately
 * defensive: if storage is unavailable, it falls back to the system setting and
 * carries on.
 */
const NO_FLASH = `
(function () {
  try {
    var stored = localStorage.getItem('lokasetu:theme');
    var dark = stored ? stored === 'dark'
                      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    var lang = localStorage.getItem('lokasetu:lang');
    if (lang) document.documentElement.lang = lang;
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
