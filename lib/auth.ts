import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";
import { db } from "@/db";

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg" }),
	emailAndPassword: { enabled: true },
	user: {
		additionalFields: {
			isActive: { type: "boolean", defaultValue: true, input: false },
		},
	},
	plugins: [admin({ defaultRole: "user" }), nextCookies()],
});
