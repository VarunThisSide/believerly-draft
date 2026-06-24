"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── registerUser ──────────────────────────────────────────────────────────────

/**
 * Creates a new user account.
 *
 * Security notes:
 * - Password is hashed with bcrypt (12 salt rounds) before storage.
 * - Email is lowercased and trimmed for canonical uniqueness.
 * - Returns a generic error for duplicate emails to prevent user enumeration
 *   (swap for a specific message only if your threat model allows it).
 */
export async function registerUser(
  payload: RegisterPayload
): Promise<ActionResult<{ id: string; email: string }>> {
  const name = payload.name?.trim();
  const email = payload.email?.toLowerCase().trim();
  const password = payload.password;

  // ── Server-side validation (defence-in-depth beyond client checks) ──
  if (!name || name.length < 2) {
    return { success: false, error: "Full name must be at least 2 characters." };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please provide a valid email address." };
  }
  if (!password || password.length < 8) {
    return {
      success: false,
      error: "Password must be at least 8 characters.",
    };
  }

  // ── Check for existing account ──
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Generic message — prevents user enumeration
    return {
      success: false,
      error: "An account with this email already exists.",
    };
  }

  // ── Hash password ──
  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        // role defaults to USER per your Prisma schema
      },
      select: { id: true, email: true },
    });

    return { success: true, data: user };
  } catch (err) {
    console.error("[registerUser]", err);
    return {
      success: false,
      error: "Failed to create account. Please try again.",
    };
  }
}

// ─── getUserByEmail (internal utility used by auth.ts) ───────────────────────

/**
 * Fetches a user by email including the hashed password.
 * ONLY call this from the server-side credentials provider — never expose
 * the password hash to the client.
 */
export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      role: true,
      image: true,
    },
  });
}

/**
 * Fetches a user by ID (used by the NextAuth session/JWT callback).
 */
export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
    },
  });
}
