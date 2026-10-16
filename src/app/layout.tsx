import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "UNIPFIT | Life Routine & Growth Tracker",
  description: "Advanced life routine, habit, challenge, and growth tracking PWA by Unipfit.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UNIPFIT",
  },
};

export const viewport: Viewport = {
  themeColor: "#0C0F22",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#0C0F22] text-[#ECEEFF] antialiased selection:bg-[#959CFF] selection:text-[#0C0F22]">
        <div className="min-h-screen flex flex-col justify-between max-w-md mx-auto relative overflow-hidden glass-card border-x border-[#959CFF]/10 shadow-2xl">
          <main className="flex-1 pb-24">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
