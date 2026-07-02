import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { ConditionalLayout } from "@/components/ConditionalLayout";
import { RouteChangeProvider } from "./providers";
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from "next/font/google";
import "../globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  return {
    title: locale === 'zh' ? 'Hoshipu - 个人网站' : 'Hoshipu - Personal Website',
    description: locale === 'zh' ? '个人作品集和博客' : 'Personal portfolio and blog',
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client side is the easiest way to get started
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} suppressHydrationWarning className={`${cormorant.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased font-sans">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ConditionalLayout>
            <RouteChangeProvider>
              {children}
            </RouteChangeProvider>
          </ConditionalLayout>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
