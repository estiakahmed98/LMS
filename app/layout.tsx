import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import {
  Geist,
  Geist_Mono,
  Inter,
  Hind_Siliguri,
  IBM_Plex_Sans_Arabic,
  Noto_Sans_JP,
} from "next/font/google";
import { ThemeProvider } from "next-themes";
import IntlProvider from "@/components/providers/IntlProvider";
import {
  DEFAULT_LOCALE,
  isRtlLocale,
  LOCALE_COOKIE_KEY,
  type Locale,
} from "@/lib/locale";
import "./globals.css";

function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "bn" || value === "ar" || value === "ja";
}

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-en",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});
const hindSiliguri = Hind_Siliguri({
  variable: "--font-bn",
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});
const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ar",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});
const notoSansJP = Noto_Sans_JP({
  variable: "--font-ja",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PSTC LMS",
  description: "Professional Skills Training Center Learning Management System",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1A2E" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_KEY)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return (
    <html
      lang={locale}
      dir={isRtlLocale(locale) ? "rtl" : "ltr"}
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${hindSiliguri.variable} ${ibmPlexSansArabic.variable} ${notoSansJP.variable} bg-background`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <IntlProvider>
            {children}
            {process.env.NODE_ENV === "production" && <Analytics />}
          </IntlProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
