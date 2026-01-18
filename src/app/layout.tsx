import type { Metadata } from "next";
import { Newsreader, Sora } from "next/font/google";
import "./globals.css";
import Providers from "@/app/providers";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Matchlog",
  description: "Log the football matches you watch and track weekly stats.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${newsreader.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
