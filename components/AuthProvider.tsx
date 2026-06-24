"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";

interface AuthProviderProps {
  children: React.ReactNode;
  session: any; // NextAuth Session type can pass through here safely
}

export function AuthProvider({ children, session }: AuthProviderProps) {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
}