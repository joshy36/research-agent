import { AuthProvider } from '@/providers/AuthProvider';
import { createClient } from '@/supabase/server';
import type { Metadata } from 'next';
import { Geist, Geist_Mono, Roboto, Roboto_Slab } from 'next/font/google';
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
  authors: [{ name: 'Research Agent Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#000000',
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
        <AuthProvider user={user}>{children}</AuthProvider>
      </body>
    </html>
  );
}
