import {
  boolean,
  integer,
  pgEnum,
  // jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";

export const usersTable = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(),
  created_at: timestamp("createdAt", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updatedAt", { withTimezone: true }).defaultNow(),
  last_login: timestamp("lastLogin", { withTimezone: true }),
});

export const workspacesTable = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  file_type: varchar("fileType"),
  name: varchar("name"),
  user_id: uuid("userId")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "cascade",
    }),
  created_at: timestamp("createdAt", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updatedAt", { withTimezone: true }).defaultNow(),
  // total_rows: integer("totalRows").default(0),
  // schema_json: jsonb("schemaJson").default({}), // For storing col names and types
});

export const conversationsTable = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspace_id: uuid("workspaceId")
    .notNull()
    .references(() => workspacesTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  created_at: timestamp("createdAt", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updatedAt", { withTimezone: true }).defaultNow(),
  // For resuming sessions
  // context_summary: text("contextSummary"), // LLM-generated summary of what was done
});

export const roleEnum = pgEnum("role", ["user", "assistant", "system", "tool"]);

export const messagesTable = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspace_id: uuid("workspaceId")
    .notNull()
    .references(() => workspacesTable.id, { onDelete: "cascade" }),
  conversation_id: uuid("conversationId")
    .notNull()
    .references(() => conversationsTable.id, { onDelete: "cascade" }),
  // 'user', 'assistant', 'system', 'tool' (tool = result message)
  role: roleEnum("role").default("user").notNull(),
  // Text content (user query or LLM explanation)
  reasoning: text("reasoning"),
  content: text("content").notNull(),
  // For streaming: track if message is complete
  is_complete: boolean("isComplete").default(false),
  // Token counts for cost tracking
  prompt_tokens: integer("promptTokens"),
  completion_tokens: integer("completionTokens"),
  created_at: timestamp("createdAt", { withTimezone: true }).defaultNow(),
});

export const usersRelations = relations(usersTable, ({ many }) => ({
  workspaces: many(workspacesTable),
}));

export const workspacesRelations = relations(
  workspacesTable,
  ({ one, many }) => ({
    users: one(usersTable, {
      fields: [workspacesTable.user_id],
      references: [usersTable.id],
    }),
    conversations: many(conversationsTable),
    messages: many(messagesTable),
  }),
);

export const conversationsRelations = relations(
  conversationsTable,
  ({ one, many }) => ({
    workspace: one(workspacesTable, {
      fields: [conversationsTable.workspace_id],
      references: [workspacesTable.id],
    }),
    messages: many(messagesTable),
  }),
);

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  workspace: one(workspacesTable, {
    fields: [messagesTable.workspace_id],
    references: [workspacesTable.id],
  }),
  conversation: one(conversationsTable, {
    fields: [messagesTable.conversation_id],
    references: [conversationsTable.id],
  }),
}));
