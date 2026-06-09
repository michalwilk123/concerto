// Self-contained seed for Apple review.
// Run inside the app container: `bun /tmp/apple-review-seed.ts`
// Relies on env vars already injected via prod.docker-compose.yml (DATABASE_URL, S3_*, BETTER_AUTH_*).
// Idempotent: safe to re-run.

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { and, eq } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import { nanoid } from "nanoid";
import postgres from "postgres";

// ---- inline schema (matches db/schema.ts) ----
const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  role: text("role").default("student"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
});

const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const group = pgTable("group", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const groupMember = pgTable("group_member", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => group.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("student"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const meeting = pgTable("meeting", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  groupId: text("group_id")
    .notNull()
    .references(() => group.id, { onDelete: "cascade" }),
  rtkMeetingId: text("rtk_meeting_id"),
  isPublic: boolean("is_public").notNull().default(false),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const folder = pgTable("folder", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  groupId: text("group_id")
    .notNull()
    .references(() => group.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  meetingId: text("meeting_id").references(() => meeting.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const file = pgTable("file", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  groupId: text("group_id")
    .notNull()
    .references(() => group.id, { onDelete: "cascade" }),
  folderId: text("folder_id").references(() => folder.id, { onDelete: "set null" }),
  meetingId: text("meeting_id").references(() => meeting.id, { onDelete: "cascade" }),
  uploadedById: text("uploaded_by_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const schema = { user, session, account, verification, group, groupMember, meeting, folder, file };

// ---- db ----
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL not set");
const sql = postgres(dbUrl, { max: 1 });
const db = drizzle(sql, { schema });

// ---- better-auth (mirrors lib/auth.ts) ----
const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true, maxPasswordLength: 128 },
  plugins: [admin({ defaultRole: "student" })],
});

// ---- S3 ----
const s3 = new S3Client({
  region: process.env.S3_REGION ?? "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});
const bucket = process.env.S3_BUCKET_NAME ?? "concerto-files";

async function putS3(key: string, body: Buffer, contentType: string) {
  await s3.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
  );
}

// ---- inputs ----
const TEST_EMAIL = "test@test.com";
const TEST_PASSWORD = "test1234";
const TEST_NAME = "Test User";
const GROUP_NAME = "Apple Review Demo";
const MEETING_NAMES = ["Demo Meeting", "Welcome Meeting"];

// 1x1 transparent PNG
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQIW2P4DwQACfsD/Z8fLAAAAAABJRU5ErkJggg==",
  "base64",
);

// Minimal single-page PDF saying "Apple Review Demo"
const PDF_TEXT = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 60>>stream
BT /F1 18 Tf 30 90 Td (Apple Review Demo) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f
0000000010 00000 n
0000000053 00000 n
0000000100 00000 n
0000000196 00000 n
0000000295 00000 n
trailer<</Size 6/Root 1 0 R>>
startxref
358
%%EOF
`;
const PDF_BYTES = Buffer.from(PDF_TEXT, "utf8");

// ---- run ----
async function ensureUser(): Promise<string> {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, TEST_EMAIL))
    .limit(1);
  if (existing) {
    console.log(`User ${TEST_EMAIL} already exists (id=${existing.id})`);
    await db
      .update(user)
      .set({ role: "teacher", emailVerified: true })
      .where(eq(user.email, TEST_EMAIL));
    return existing.id;
  }
  const res = await auth.api.signUpEmail({
    body: { email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME },
  });
  if (!res.user) throw new Error("signUpEmail failed");
  await db
    .update(user)
    .set({ role: "teacher", emailVerified: true })
    .where(eq(user.email, TEST_EMAIL));
  console.log(`Created user ${TEST_EMAIL} (id=${res.user.id}) as teacher`);
  return res.user.id;
}

async function ensureGroup(): Promise<string> {
  const [existing] = await db
    .select({ id: group.id })
    .from(group)
    .where(eq(group.name, GROUP_NAME))
    .limit(1);
  if (existing) {
    console.log(`Group "${GROUP_NAME}" already exists (id=${existing.id})`);
    return existing.id;
  }
  const id = nanoid();
  await db.insert(group).values({ id, name: GROUP_NAME });
  console.log(`Created group "${GROUP_NAME}" (id=${id})`);
  return id;
}

async function ensureMembership(groupId: string, userId: string): Promise<void> {
  const [existing] = await db
    .select({ id: groupMember.id })
    .from(groupMember)
    .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)))
    .limit(1);
  if (existing) {
    await db.update(groupMember).set({ role: "teacher" }).where(eq(groupMember.id, existing.id));
    console.log(`Membership already exists (id=${existing.id}); ensured role=teacher`);
    return;
  }
  await db.insert(groupMember).values({ id: nanoid(), groupId, userId, role: "teacher" });
  console.log(`Added user as teacher to group`);
}

async function ensureFile(params: {
  filename: string;
  mimeType: string;
  body: Buffer;
  groupId: string;
  uploadedById: string;
}): Promise<void> {
  const key = `${params.groupId}/${params.filename}`;
  const [existing] = await db.select({ id: file.id }).from(file).where(eq(file.id, key)).limit(1);
  if (existing) {
    console.log(`File ${key} already in DB; skipping`);
    return;
  }
  await putS3(key, params.body, params.mimeType);
  await db.insert(file).values({
    id: key,
    name: params.filename,
    mimeType: params.mimeType,
    size: params.body.length,
    groupId: params.groupId,
    folderId: null,
    meetingId: null,
    uploadedById: params.uploadedById,
  });
  console.log(`Uploaded ${key} (${params.body.length} bytes)`);
}

async function ensureMeeting(groupId: string, name: string): Promise<void> {
  const [existing] = await db
    .select({ id: meeting.id })
    .from(meeting)
    .where(and(eq(meeting.groupId, groupId), eq(meeting.name, name)))
    .limit(1);
  if (existing) {
    console.log(`Meeting "${name}" already exists (id=${existing.id})`);
    return;
  }
  const id = nanoid();
  await db.insert(meeting).values({
    id,
    name,
    groupId,
    rtkMeetingId: null,
    isPublic: false,
    requiresApproval: false,
  });
  console.log(`Created meeting "${name}" (id=${id})`);
}

const userId = await ensureUser();
const groupId = await ensureGroup();
await ensureMembership(groupId, userId);
await ensureFile({
  filename: "welcome.pdf",
  mimeType: "application/pdf",
  body: PDF_BYTES,
  groupId,
  uploadedById: userId,
});
await ensureFile({
  filename: "demo-image.png",
  mimeType: "image/png",
  body: PNG_BYTES,
  groupId,
  uploadedById: userId,
});
for (const name of MEETING_NAMES) await ensureMeeting(groupId, name);

console.log("\n=== Apple review seed complete ===");
console.log(`  Email:    ${TEST_EMAIL}`);
console.log(`  Password: ${TEST_PASSWORD}`);
console.log(`  Group:    ${GROUP_NAME} (${groupId})`);

await sql.end();
process.exit(0);
