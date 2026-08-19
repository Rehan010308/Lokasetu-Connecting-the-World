import type { Metadata, Viewport } from 'next';
import './globals.css';
import { StoreProvider } from '@/components/store';
import { ThemeProvider } from '@/components/theme';

export const metadata: Metadata = {
  title: 'KaamSetu — hyperlocal work, in your language',
  description:
    'KaamSetu connects electricians, plumbers, cooks, house help, barbers, painters, carpenters and scrap collectors with residents in their own neighbourhood — by voice, in six languages.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F7FA' },
    { media: '(prefers-color-scheme: dark)', color: '#060A11' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

/* Sets the theme before first paint so there is no white flash on a dark phone. */
const NO_FLASH = `(function(){try{var m=localStorage.getItem('kaamsetu:theme')||'system';
var d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Plus Jakarta Sans for Latin; Noto for the five Indic scripts we ship.
            Loaded via <link> rather than next/font so a blocked font CDN
            degrades to the system stack instead of failing the build. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;600;700&family=Noto+Sans+Telugu:wght@400;600;700&family=Noto+Sans+Malayalam:wght@400;600;700&family=Noto+Sans+Kannada:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <StoreProvider>{children}</StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
