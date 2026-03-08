import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";
import { db } from "@/db";

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getTrustedOrigins(): string[] {
  const configuredOrigins =
    process.env.TRUSTED_ORIGINS?.split(",")
      .map((origin) => normalizeOrigin(origin.trim()))
      .filter((origin): origin is string => Boolean(origin)) ?? [];

  const authUrlOrigin = normalizeOrigin(process.env.BETTER_AUTH_URL || "");

  const localDevOrigins =
    process.env.NODE_ENV !== "production" ? ["http://localhost:3000", "http://127.0.0.1:3000"] : [];

  return [...new Set([authUrlOrigin, ...configuredOrigins, ...localDevOrigins].filter((v): v is string => Boolean(v)))];
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true, maxPasswordLength: 128 },
  rateLimit: { window: 5, max: 20 },
  trustedOrigins: getTrustedOrigins(),
  user: {
    additionalFields: {
      isActive: { type: "boolean", defaultValue: false, input: false },
    },
  },
  plugins: [admin({ defaultRole: "student" }), nextCookies()],
});
