import type { Metadata } from "next";
import { Source_Serif_4, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { Toaster } from "sonner";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-source-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s — KUPPET Busia Branch",
    default: "KUPPET Busia Branch — Members & Administration Portal",
  },
  description:
    "Official Members and Administration portal for Kenya Union of Post Primary Education Teachers (KUPPET) Busia County Branch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${inter.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-screen bg-[var(--canvas)] text-[var(--ink-body)] antialiased">
        <ConvexClientProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className:
                "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-panel)] rounded-[var(--r-md)]",
            }}
          />
        </ConvexClientProvider>
      </body>
    </html>
  );
}

