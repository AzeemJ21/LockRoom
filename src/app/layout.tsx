import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'cipher — secure ephemeral chat',
  description: 'End-to-end encrypted, zero-persistence chatrooms powered by Next.js and Socket.IO.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable} h-full`}>
      <body
        className="min-h-full bg-background-primary text-text-primary antialiased"
        style={{ backgroundColor: '#0a0a0f', minHeight: '100%' }}
      >
        <ThemeProvider attribute="class" forcedTheme="dark" enableSystem={false} defaultTheme="dark">
          <noscript>
            <div className="p-6 text-center text-sm text-white" style={{ background: '#0a0a0f' }}>
              JavaScript is required for cipher (encryption & live chat).
            </div>
          </noscript>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
