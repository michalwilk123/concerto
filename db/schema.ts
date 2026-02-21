import { bigint, boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
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
	isActive: boolean("is_active").notNull().default(true),
});

export const session = pgTable("session", {
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

export const account = pgTable("account", {
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

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

export const group = pgTable("group", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupMember = pgTable(
	"group_member",
	{
		id: text("id").primaryKey(),
		groupId: text("group_id")
			.notNull()
			.references(() => group.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: text("role").notNull().default("student"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		index("group_member_group_idx").on(table.groupId),
		index("group_member_user_idx").on(table.userId),
	],
);

export const folder = pgTable(
	"folder",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		groupId: text("group_id")
			.notNull()
			.references(() => group.id, { onDelete: "cascade" }),
		parentId: text("parent_id"),
		isSystem: boolean("is_system").notNull().default(false),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [index("folder_group_parent_idx").on(table.groupId, table.parentId)],
);

export const file = pgTable(
	"file",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		mimeType: text("mime_type").notNull(),
		size: bigint("size", { mode: "number" }).notNull(),
		storagePath: text("storage_path").notNull(),
		groupId: text("group_id")
			.notNull()
			.references(() => group.id, { onDelete: "cascade" }),
		uploadedById: text("uploaded_by_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		isEditable: boolean("is_editable").notNull().default(false),
		folderId: text("folder_id").references(() => folder.id, { onDelete: "set null" }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [index("file_group_folder_idx").on(table.groupId, table.folderId)],
);

export const meeting = pgTable(
	"meeting",
	{
		id: text("id").primaryKey(), // nanoid
		name: text("name").notNull(),
		groupId: text("group_id")
			.notNull()
			.references(() => group.id, { onDelete: "cascade" }),
		rtkMeetingId: text("rtk_meeting_id"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [index("meeting_group_idx").on(table.groupId)],
);

export const meetingSession = pgTable(
	"meeting_session",
	{
		id: text("id").primaryKey(), // RTK meeting ID
		meetingId: text("meeting_id")
			.notNull()
			.references(() => meeting.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [index("meeting_session_meeting_idx").on(table.meetingId)],
);

export const chatMessage = pgTable(
	"chat_message",
	{
		id: text("id").primaryKey(),
		content: text("content").notNull(),
		senderId: text("sender_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		senderName: text("sender_name").notNull(),
		groupId: text("group_id")
			.notNull()
			.references(() => group.id, { onDelete: "cascade" }),
		meetingId: text("meeting_id").references(() => meeting.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		index("chat_message_group_created_idx").on(table.groupId, table.createdAt),
		index("chat_message_meeting_created_idx").on(table.meetingId, table.createdAt),
	],
);

export const chatReaction = pgTable(
	"chat_reaction",
	{
		id: text("id").primaryKey(),
		messageId: text("message_id")
			.notNull()
			.references(() => chatMessage.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		userName: text("user_name").notNull(),
		emoji: text("emoji").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [index("chat_reaction_message_idx").on(table.messageId)],
);
