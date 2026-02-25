import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./index";
import { group, groupMember, user } from "./schema";

const email = process.argv[2];
if (!email) {
	console.error("Usage: bun run db:seed <email>");
	process.exit(1);
}

// Promote user to admin
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

// Create a sample group
const groupId = nanoid();
await db.insert(group).values({ id: groupId, name: "Music Theory 101" }).onConflictDoNothing();

// Add user as teacher in the group
await db
	.insert(groupMember)
	.values({ id: nanoid(), groupId, userId: updated.id, role: "teacher" })
	.onConflictDoNothing();

console.log(`Created sample group "Music Theory 101" with ${updated.email} as teacher`);
process.exit(0);
