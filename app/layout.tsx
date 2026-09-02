import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockPick Analyzer",
  description: "Smart stock analysis workspace for Indonesian stocks"
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="id"><body>{children}</body></html>;
}
