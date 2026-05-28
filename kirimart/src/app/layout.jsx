import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/provider";
import { cn } from "@/lib/utils";
import { MetaPixel } from "@/components/analytics/meta-pixel";
import { db } from "@/config/db";
import { platformSettings } from "@/config/db/schema";
import { eq } from "drizzle-orm";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "KawanBelanja - Solusi Belanja Cerdas & Aman",
  description: "Marketplace modern untuk produk unggulan dan kebutuhan harian Anda.",
  icons: {
    icon: "/kawanbelanja.ico",
  }
};

export default async function RootLayout({ children }) {
  // Fetch master pixel ID for analytics
  let masterPixelId = null;
  try {
    const setting = await db.query.platformSettings.findFirst({
      where: eq(platformSettings.key, "master_meta_pixel_id")
    });
    if (setting) masterPixelId = setting.value;
  } catch (e) {
    console.error("Failed to load master pixel ID", e);
  }

  return (
    <html
      lang='en'
      className={cn(
        'h-full',
        'antialiased',
        geistSans.variable,
        geistMono.variable,
        'font-sans',
        inter.variable,
      )}
      suppressHydrationWarning
    >
      <body className='flex min-h-full flex-col' suppressHydrationWarning>
        <Providers>{children}</Providers>
        <MetaPixel masterPixelId={masterPixelId} />
      </body>
    </html>
  );
}
