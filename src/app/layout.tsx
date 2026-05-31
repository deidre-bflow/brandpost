import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BrandFlow — AI Social Content",
  description: "AI-powered social content at scale",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${geist.className} h-full`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
