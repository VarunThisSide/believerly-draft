import NextAuth, { type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@yourdomain.com";

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt", // Required when utilizing CredentialsProvider
  },

  providers: [
    // ── Google OAuth ──────────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),

    // ── Email + Password ──────────────────────────────────────────
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        // Force string conversion for safety
        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          throw new Error("No account found with this email.");
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
          throw new Error("Incorrect password.");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    // ── Inject role into JWT on sign-in ───────────────────────────
    async jwt({ token, user }) {
      if (user) {
        // First sign-in: attach role from DB (or override for admin email)
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
          select: { id: true, role: true },
        });

        token.id = dbUser?.id ?? user.id;
        token.role = token.email === ADMIN_EMAIL ? "ADMIN" : (dbUser?.role ?? "USER");

        // Auto-promote admin email in DB if not already set
        if (token.email === ADMIN_EMAIL && dbUser?.role !== "ADMIN") {
          await prisma.user.update({
            where: { email: ADMIN_EMAIL },
            data: { role: "ADMIN" },
          });
        }
      }
      return token;
    },

    // ── Expose role on the session object ─────────────────────────
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any; // Type augmentation will handle details
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
  
  secret: process.env.NEXTAUTH_SECRET,
};

// NextAuth v5 returns the structural handlers directly!
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);