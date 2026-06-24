import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { auth } from "@/lib/auth";
import { AuthProvider } from "@/components/AuthProvider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// ─── Fonts ────────────────────────────────────────────────────────────────────

/**
 * Inter — body / UI text. Clean, highly legible at small sizes.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Space Grotesk — headings / brand wordmark. Geometric with distinctive
 * personality that pairs well with Inter without competing.
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: "Believerly — Premium Electronics",
    template: "%s · Believerly",
  },
  description:
    "Discover curated electronics: laptops, phones, audio, and smart home devices with fast delivery and expert support.",
  keywords: ["electronics", "laptops", "smartphones", "audio", "gadgets"],
  authors: [{ name: "Believerly" }],
  creator: "Believerly",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Believerly Electronics",
    title: "Believerly — Premium Electronics",
    description: "Curated electronics for every lifestyle.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Believerly — Premium Electronics",
    description: "Curated electronics for every lifestyle.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
  width: "device-width",
  initialScale: 1,
};

// ─── Layout ───────────────────────────────────────────────────────────────────

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pre-fetch the session server-side so the client SessionProvider
  // hydrates immediately without an extra round-trip.
  const session = await auth();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable}`}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider session={session}>
          {children}
          {/*
           * Sonner toast portal — place after children so toasts
           * render on top of all page content.
           */}
          <Toaster
            position="top-right"
            toastOptions={{
              classNames: {
                toast:
                  "font-sans text-sm border border-border bg-background text-foreground shadow-lg",
                title: "font-semibold",
                description: "text-muted-foreground",
                actionButton:
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                cancelButton:
                  "bg-muted text-muted-foreground hover:bg-muted/80",
                error: "border-destructive/40 bg-destructive/5",
                success: "border-emerald-500/40 bg-emerald-500/5",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
