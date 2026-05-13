import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/provider";
import { cn } from "@/lib/utils";

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

export default function RootLayout({ children }) {
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
      </body>
    </html>
  );
}
