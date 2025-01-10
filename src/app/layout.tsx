import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Navigation } from '@/components/navigation';
import '@/styles/globals.css';
import { getDbLastModified } from '@/lib/db';

const inter = Inter({ subsets: ['latin'] });

export const revalidate = 60; // Revalidate layout every minute

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function generateMetadata() {
  return {
    metadataBase: new URL(baseUrl),
    title: 'Game Stats',
    description: 'Track and analyze game download statistics',
    icons: {
      icon: [
        { url: '/favicon.png', type: 'image/png' }
      ],
      shortcut: [
        { url: '/favicon.png', type: 'image/png' }
      ],
      apple: [
        { url: '/favicon.png', type: 'image/png' }
      ]
    },
    openGraph: {
      type: 'website',
      title: 'Game Stats',
      description: 'Track and analyze game download statistics',
      images: ['/favicon.png'],
    },
    twitter: {
      card: 'summary',
      title: 'Game Stats',
      description: 'Track and analyze game download statistics',
      images: ['/favicon.png'],
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${inter.className} min-h-screen antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-950 dark:to-slate-900/50">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(217,119,6,0.05),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(217,119,6,0.15),rgba(255,255,255,0))]" />
            
            <Navigation />
            <main className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}