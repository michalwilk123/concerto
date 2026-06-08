"use client";

import { signOut } from "@/lib/auth-client";

export async function logoutAndRedirect() {
  const result = await signOut();

  if (result?.error) {
    throw new Error(result.error.message || "Failed to sign out");
  }

  window.location.replace("/login");
}
