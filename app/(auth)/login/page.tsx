"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Zap, Mail, Lock, AlertCircle, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

// ─── Error message mapping ────────────────────────────────────────────────────

const AUTH_ERROR_MAP: Record<string, string> = {
  CredentialsSignin:
    "Incorrect email or password. Please check your credentials and try again.",
  OAuthSignin: "An error occurred during sign-in. Please try again.",
  OAuthCallback: "Authentication callback failed. Please try again.",
  OAuthCreateAccount:
    "Could not create your account using this sign-in method.",
  EmailCreateAccount: "Could not create an account with this email.",
  Callback: "Authentication failed. Please try again.",
  Default: "An unexpected error occurred. Please try again.",
};

function getErrorMessage(error: string | null): string | null {
  if (!error) return null;
  return AUTH_ERROR_MAP[error] ?? AUTH_ERROR_MAP.Default;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(getErrorMessage(urlError));
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side pre-validation
    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    startTransition(async () => {
      const result = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError(
          getErrorMessage(result.error) ?? "Sign-in failed. Please try again."
        );
        return;
      }

      if (result?.ok) {
        router.push(
          // Prevent open redirect — only allow relative paths
          callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
            ? callbackUrl
            : "/"
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#07070f]">
      {/* ── Ambient glow ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute top-1/3 -left-20 h-[300px] w-[300px] rounded-full bg-orange-500/8 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-blue-800/8 blur-[120px]" />

        {/* Grid lines */}
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="grid"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 60 0 L 0 0 0 60"
                fill="none"
                stroke="white"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* ── Card ── */}
      <div className="relative w-full max-w-md mx-auto px-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl">
          {/* Logo + heading */}
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-700 text-white shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
                <Zap className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="font-display text-xl font-bold text-white tracking-tight">
                Believerly
              </span>
            </Link>
            <h1 className="text-2xl font-display font-bold text-white mb-1.5">
              Welcome back
            </h1>
            <p className="text-sm text-zinc-400">
              Sign in to your Believerly account
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <Alert
              variant="destructive"
              className="mb-6 border-red-500/30 bg-red-500/10 text-red-300"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-300 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-zinc-300 text-sm font-medium">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e : React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  disabled={isPending}
                  required
                  className={cn(
                    "pl-10 bg-white/5 border-white/10 text-white placeholder:text-zinc-600",
                    "focus-visible:ring-blue-500/50 focus-visible:border-blue-500/60",
                    "h-11 rounded-lg transition-colors"
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-300 text-sm font-medium">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  tabIndex={-1}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e : React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  disabled={isPending}
                  required
                  className={cn(
                    "pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-zinc-600",
                    "focus-visible:ring-blue-500/50 focus-visible:border-blue-500/60",
                    "h-11 rounded-lg transition-colors"
                  )}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isPending}
              className={cn(
                "w-full h-11 rounded-lg font-semibold text-sm mt-2",
                "bg-gradient-to-r from-blue-600 to-blue-500",
                "hover:from-blue-500 hover:to-blue-400",
                "shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40",
                "transition-all duration-200"
              )}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-zinc-600">or continue with</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* OAuth placeholder (add providers as needed) */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 rounded-lg border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
            onClick={() => signIn("google", { callbackUrl })}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="h-4 w-4 mr-2"
            />
            Continue with Google
          </Button>

          {/* Register link */}
          <p className="mt-6 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
