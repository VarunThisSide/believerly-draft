"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  Mail,
  Lock,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { registerUser } from "@/actions/authActions";

// ─── Password strength indicator ─────────────────────────────────────────────

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function passwordStrength(password: string): StrengthLevel {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4) as StrengthLevel;
}

const STRENGTH_CONFIG: Record<
  StrengthLevel,
  { label: string; color: string; bars: number }
> = {
  0: { label: "", color: "bg-zinc-700", bars: 0 },
  1: { label: "Weak", color: "bg-red-500", bars: 1 },
  2: { label: "Fair", color: "bg-orange-400", bars: 2 },
  3: { label: "Good", color: "bg-yellow-400", bars: 3 },
  4: { label: "Strong", color: "bg-emerald-500", bars: 4 },
};

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const strength = passwordStrength(password);
  const { label, color, bars } = STRENGTH_CONFIG[strength];

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i <= bars ? color : "bg-zinc-700"
            )}
          />
        ))}
      </div>
      {label && (
        <p className={cn("text-xs", strength >= 3 ? "text-emerald-400" : "text-zinc-500")}>
          Password strength: {label}
        </p>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function validate(): string | null {
    if (!name.trim() || name.trim().length < 2)
      return "Full name must be at least 2 characters.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "Please enter a valid email address.";
    if (password.length < 8)
      return "Password must be at least 8 characters.";
    if (passwordStrength(password) < 2)
      return "Password is too weak — add uppercase letters, numbers, or symbols.";
    if (password !== confirmPassword)
      return "Passwords do not match.";
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      const result = await registerUser({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
      });

      if (!result.success) {
        setError(result.error ?? "Registration failed. Please try again.");
        return;
      }

      setSuccessMessage("Account created! Signing you in…");

      // Auto-sign-in after successful registration
      const signInResult = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
        callbackUrl: "/",
      });

      if (signInResult?.error) {
        // Registration succeeded but auto-sign-in failed — redirect to login
        router.push("/login?registered=true");
        return;
      }

      router.push("/");
      router.refresh();
    });
  }

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#07070f] py-12">
      {/* ── Ambient glow ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-1/4 h-[500px] w-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-[400px] w-[500px] rounded-full bg-orange-500/8 blur-[120px]" />

        <svg
          className="absolute inset-0 h-full w-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid2" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid2)" />
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
                Volt<span className="text-blue-400">ex</span>
              </span>
            </Link>
            <h1 className="text-2xl font-display font-bold text-white mb-1.5">
              Create your account
            </h1>
            <p className="text-sm text-zinc-400">
              Join Voltex and start shopping today
            </p>
          </div>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {[
              "Free shipping on orders $50+",
              "Secure checkout",
              "30-day returns",
            ].map((text) => (
              <span key={text} className="flex items-center gap-1 text-[10px] text-zinc-600">
                <ShieldCheck className="h-3 w-3 text-blue-500/70 shrink-0" />
                {text}
              </span>
            ))}
          </div>

          {/* Alerts */}
          {error && (
            <Alert
              variant="destructive"
              className="mb-5 border-red-500/30 bg-red-500/10 text-red-300"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-300 text-sm">{error}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert className="mb-5 border-emerald-500/30 bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <AlertDescription className="text-emerald-400 text-sm">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-zinc-300 text-sm font-medium">
                Full name
              </Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  onChange={(e) => setEmail(e.target.value)}
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
              <Label htmlFor="password" className="text-zinc-300 text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              <PasswordStrengthBar password={password} />
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-zinc-300 text-sm font-medium">
                Confirm password
              </Label>
              <div className="relative">
                <Lock
                  className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors",
                    passwordsMatch
                      ? "text-emerald-500"
                      : passwordsMismatch
                      ? "text-red-500"
                      : "text-zinc-500"
                  )}
                />
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isPending}
                  required
                  className={cn(
                    "pl-10 pr-10 bg-white/5 text-white placeholder:text-zinc-600",
                    "h-11 rounded-lg transition-colors",
                    passwordsMatch
                      ? "border-emerald-500/50 focus-visible:ring-emerald-500/50"
                      : passwordsMismatch
                      ? "border-red-500/50 focus-visible:ring-red-500/50"
                      : "border-white/10 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/60"
                  )}
                />
                <button
                  type="button"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordsMismatch && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match.</p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Passwords match
                </p>
              )}
            </div>

            {/* Terms */}
            <p className="text-xs text-zinc-600 leading-relaxed pt-1">
              By creating an account you agree to our{" "}
              <Link href="/terms" className="text-blue-500 hover:text-blue-400 transition-colors">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-blue-500 hover:text-blue-400 transition-colors">
                Privacy Policy
              </Link>
              .
            </p>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isPending}
              className={cn(
                "w-full h-11 rounded-lg font-semibold text-sm",
                "bg-gradient-to-r from-blue-600 to-blue-500",
                "hover:from-blue-500 hover:to-blue-400",
                "shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40",
                "transition-all duration-200"
              )}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
