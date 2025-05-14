import { AuthProvider } from '@/providers/AuthProvider';
import { createClient } from '@/supabase/server';
import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { Geist, Geist_Mono, Roboto, Roboto_Slab } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const roboto = Roboto({
  variable: '--font-roboto',
  weight: ['400', '500', '700'],
  subsets: ['latin'],
});

const robotoSlab = Roboto_Slab({
  variable: '--font-roboto-slab',
  weight: ['400', '500', '700'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Research Agent',
  description:
    'AI-powered research assistant that helps you explore and understand complex topics',
  keywords: ['research', 'AI', 'assistant', 'knowledge', 'learning'],
  icons: {
    icon: '/favicon.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${roboto.variable} ${robotoSlab.variable} antialiased dark`}
      >
        <Analytics />
        <Toaster
          theme="dark"
          className="toaster group"
          toastOptions={{
            style: {
              background: 'black',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
          }}
        />
        <AuthProvider user={user}>{children}</AuthProvider>
      </body>
    </html>
  );
}
