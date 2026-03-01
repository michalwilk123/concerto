import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "./index";
import { user } from "./schema";

const TEST_EMAIL = "test@test.com";
const TEST_PASSWORD = "test1234";
const TEST_NAME = "Test User";

const res = await auth.api.signUpEmail({
  body: {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    name: TEST_NAME,
  },
});

if (!res.user) {
  console.error("Failed to create test user");
  process.exit(1);
}

// Promote to teacher
await db.update(user).set({ role: "teacher", isActive: true }).where(eq(user.email, TEST_EMAIL));

console.log(`Created test teacher user:`);
console.log(`  Email:    ${TEST_EMAIL}`);
console.log(`  Password: ${TEST_PASSWORD}`);
console.log(`  Name:     ${TEST_NAME}`);
console.log(`  Role:     teacher`);
process.exit(0);
