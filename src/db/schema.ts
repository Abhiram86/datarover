import { date, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";

export const usersTable = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  password: varchar("password").notNull(),
  created_at: date("createdAt").defaultNow(),
  updated_at: date("updatedAt").defaultNow(),
  last_login: date("lastLogin").defaultNow(),
});

export const workspacesTable = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  file_type: varchar("fileType"),
  name: varchar("name"),
  user_id: uuid("userId"),
  created_at: date("createdAt").defaultNow(),
  updated_at: date("updatedAt").defaultNow(),
});

export const usersRelations = relations(usersTable, ({ many }) => ({
  workspaces: many(workspacesTable),
}));

export const workspacesRelations = relations(workspacesTable, ({ one }) => ({
  users: one(usersTable, {
    fields: [workspacesTable.user_id],
    references: [usersTable.id],
  }),
}));
