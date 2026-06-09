import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { group, groupMember } from "@/db/schema";

// Auto-enroll every newly created user into the single default ("Welcome") group
// as a read-only member. Covers both web and mobile sign-up since it runs in the
// better-auth user-create lifecycle. Never throws — a missing default group must
// not break account creation.
async function joinDefaultGroup(userId: string) {
  try {
    const [defaultGroup] = await db
      .select({ id: group.id })
      .from(group)
      .where(eq(group.isDefault, true))
      .limit(1);
    if (!defaultGroup) {
      console.warn("joinDefaultGroup: no default group found; skipping auto-join for", userId);
      return;
    }
    await db.insert(groupMember).values({
      id: nanoid(),
      groupId: defaultGroup.id,
      userId,
      role: "student",
    });
  } catch (e) {
    console.error("joinDefaultGroup error:", e);
  }
}

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

  return [
    ...new Set(
      [authUrlOrigin, ...configuredOrigins, ...localDevOrigins].filter((v): v is string =>
        Boolean(v),
      ),
    ),
  ];
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true, maxPasswordLength: 128 },
  rateLimit: { window: 5, max: 20 },
  trustedOrigins: getTrustedOrigins(),
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          await joinDefaultGroup(createdUser.id);
        },
      },
    },
  },
  plugins: [admin({ defaultRole: "student" }), bearer(), nextCookies()],
});
