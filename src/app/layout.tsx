import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wallpapers 10K | Rifa 4 Cifras",
  description: "Compra wallpapers digitales, recibe numeros de 4 cifras y participa con la Loteria del Quindio.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${syne.variable} ${dmSans.variable}`}>{children}</body>
    </html>
  );
}
