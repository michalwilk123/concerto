import { eq } from "drizzle-orm";
import { db } from "./index";
import { user } from "./schema";

const email = process.argv[2];
if (!email) {
	console.error("Usage: bun run db:seed <email>");
	process.exit(1);
}

const [updated] = await db
	.update(user)
	.set({ role: "admin" })
	.where(eq(user.email, email))
	.returning({ id: user.id, email: user.email, role: user.role });

if (!updated) {
	console.error(`No user found with email: ${email}`);
	process.exit(1);
}

console.log(`Promoted ${updated.email} to admin`);
process.exit(0);
