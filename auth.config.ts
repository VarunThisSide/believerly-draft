import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  // We leave providers empty here because Edge doesn't support bcrypt/Prisma.
  // We will add the actual providers in auth.ts
  providers: [], 
} satisfies NextAuthConfig;