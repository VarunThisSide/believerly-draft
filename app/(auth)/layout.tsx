import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Sign In · Believerly",
    template: "%s · Believerly",
  },
  robots: {
    index: false, // Don't index auth pages
    follow: false,
  },
};

/**
 * Layout for (auth) route group.
 * Intentionally minimal — no Navbar, no footer.
 * The full RootLayout (with font variables, providers, Toaster) still wraps this.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
