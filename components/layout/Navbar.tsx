"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ShoppingCart, Zap, Menu, X, LayoutDashboard, LogOut, Package, ChevronDown, User } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useHydratedCart } from "@/hooks/useHydratedCart";

// ─── Nav links ────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "All Products", href: "/products" },
  { label: "Laptops", href: "/products?category=laptops" },
  { label: "Phones", href: "/products?category=phones" },
  { label: "Audio", href: "/products?category=audio" },
  { label: "Smart Home", href: "/products?category=smart-home" },
] as const;

// ─── Subcomponents ────────────────────────────────────────────────────────────

function BrandLogo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-1.5 shrink-0 group"
      aria-label="Voltex — return to homepage"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md group-hover:shadow-blue-500/40 transition-shadow">
        <Zap className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-foreground">
        Volt<span className="text-blue-500">ex</span>
      </span>
    </Link>
  );
}

function CartButton() {
  // Fix: Call the function inside the selector () => s.totalItems() 
  // and use ?? 0 to safely handle the initial server-side render where it might return undefined.
  const itemCount = useHydratedCart((s) => s.totalItems()) ?? 0;
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9 shrink-0"
      aria-label={`Shopping cart — ${itemCount} item${itemCount !== 1 ? "s" : ""}`}
      onClick={() => router.push("/cart")}
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <Badge
          className={cn(
            "absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center",
            "rounded-full px-1 text-[10px] font-bold leading-none",
            "bg-orange-500 text-white border-0 shadow-sm pointer-events-none",
            "animate-in zoom-in-75 duration-150"
          )}
        >
          {itemCount > 99 ? "99+" : itemCount}
        </Badge>
      )}
    </Button>
  );
}

function AuthBlock() {
  const { data: session, status } = useSession();
  const user = session?.user as
    | { name?: string; email?: string; image?: string; role?: string }
    | undefined;

  if (status === "loading") {
    return (
      <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">Sign In</Link>
        </Button>
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          asChild
        >
          <Link href="/register">Get Started</Link>
        </Button>
      </div>
    );
  }

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-2 py-1.5 h-auto hover:bg-muted/60 rounded-lg"
          aria-label="Account menu"
        >
          <Avatar className="h-7 w-7 ring-2 ring-blue-500/20">
            <AvatarImage src={user?.image ?? ""} alt={user?.name ?? "User"} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden lg:block text-sm font-medium text-foreground max-w-[120px] truncate">
            {user?.name ?? user?.email}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 mt-1">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold leading-none truncate">
              {user?.name ?? "My Account"}
            </p>
            <p className="text-xs leading-none text-muted-foreground truncate mt-0.5">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/account" className="flex items-center gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            <span>My Account</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/orders" className="flex items-center gap-2 cursor-pointer">
            <Package className="h-4 w-4" />
            <span>My Orders</span>
          </Link>
        </DropdownMenuItem>

        {user?.role === "ADMIN" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/admin"
                className="flex items-center gap-2 cursor-pointer text-blue-600 dark:text-blue-400 font-medium"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Admin Panel</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* ── Left: Logo + Desktop nav ── */}
        <div className="flex items-center gap-6">
          <BrandLogo />

          <nav
            className="hidden md:flex items-center gap-1"
            aria-label="Primary navigation"
          >
            {NAV_LINKS.map(({ label, href }) => {
              const isActive = pathname === href || pathname.startsWith(href + "&");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── Right: Cart + Auth + Mobile toggle ── */}
        <div className="flex items-center gap-1">
          <CartButton />
          <div className="hidden sm:block">
            <AuthBlock />
          </div>

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-md px-4 py-4 space-y-1 animate-in slide-in-from-top-2 duration-200">
          {NAV_LINKS.map(({ label, href }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "block px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "text-foreground hover:bg-muted/60"
                )}
              >
                {label}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-border/60">
            <AuthBlock />
          </div>
        </div>
      )}
    </header>
  );
}
