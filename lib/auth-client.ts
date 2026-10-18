"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { useSession, signIn, signOut } = authClient;

export async function entrarComGoogle() {
  await signIn.social({
    provider: "google",
    callbackURL: typeof window === "undefined" ? "/" : window.location.pathname,
  });
}
