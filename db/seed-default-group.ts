import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./index";
import { group, groupMember, user } from "./schema";

// Seeds the single default ("Welcome") onboarding group and backfills every
// existing user into it as a read-only member. Idempotent: safe to re-run.
//
// New users are auto-joined via the better-auth create hook in lib/auth.ts;
// this script bootstraps the group and catches up users created before it
// existed (or before the hook was added).

const DEFAULT_GROUP_NAME = "Welcome";

// 1. Ensure the default group exists.
let [defaultGroup] = await db
  .select({ id: group.id, name: group.name })
  .from(group)
  .where(eq(group.isDefault, true))
  .limit(1);

if (!defaultGroup) {
  const id = nanoid();
  [defaultGroup] = await db
    .insert(group)
    .values({ id, name: DEFAULT_GROUP_NAME, isDefault: true })
    .returning({ id: group.id, name: group.name });
  console.log(`Created default group "${defaultGroup.name}" (id=${defaultGroup.id})`);
} else {
  console.log(`Default group already exists: "${defaultGroup.name}" (id=${defaultGroup.id})`);
}

// 2. Backfill every user who isn't already a member.
const existingMembers = await db
  .select({ userId: groupMember.userId })
  .from(groupMember)
  .where(eq(groupMember.groupId, defaultGroup.id));
const memberSet = new Set(existingMembers.map((m) => m.userId));

const allUsers = await db.select({ id: user.id }).from(user);
const toAdd = allUsers.filter((u) => !memberSet.has(u.id));

if (toAdd.length > 0) {
  await db.insert(groupMember).values(
    toAdd.map((u) => ({
      id: nanoid(),
      groupId: defaultGroup.id,
      userId: u.id,
      role: "student",
    })),
  );
}

console.log(
  `Backfilled ${toAdd.length} user(s) into the default group (${allUsers.length} user(s) total).`,
);
process.exit(0);
