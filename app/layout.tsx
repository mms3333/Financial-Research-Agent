import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResearchBot",
  description: "ResearchBot: autonomous financial research workflow powered by OpenAI and Tavily"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-slate-100">{children}</body>
    </html>
  );
}
