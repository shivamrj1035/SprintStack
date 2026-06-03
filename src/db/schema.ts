import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  pgEnum,
  decimal,
  jsonb,
} from "drizzle-orm/pg-core";

// ─── Link category type for personal_links ───
export type LinkCategory =
  | "doc"
  | "sheet"
  | "slide"
  | "folder"
  | "image"
  | "video"
  | "file"
  | "excel"
  | "link"
  | "other";

// NOTE: app_role enum still exists in the database for backward compat but is no longer used in code.
// Roles are managed exclusively via organization_memberships.role (workspace_role enum).
export const workspaceKindEnum = pgEnum("workspace_kind", ["organization", "personal"]);
export const workspaceRoleEnum = pgEnum("workspace_role", [
  "super_admin",
  "admin",
  "manager",
  "member",
]);

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email"),
  name: text("name"),
  avatar_url: text("avatar_url"),
  blocked: boolean("blocked").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  kind: workspaceKindEnum("kind").default("organization").notNull(),
  logo_url: text("logo_url"),
  theme_color: text("theme_color").default("#3B82F6").notNull(),
  modules: text("modules").array().default(["projects", "tasks", "timesheets", "dashboard"]),
  subscription_valid_until: timestamp("subscription_valid_until"),
  max_users: integer("max_users").default(100).notNull(),
  custom_features: jsonb("custom_features").default({}).notNull(),
  created_by: text("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const organizationMemberships = pgTable("organization_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  organization_id: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  user_id: text("user_id").notNull(),
  email: text("email"),
  role: workspaceRoleEnum("role").default("member").notNull(),
  custom_permissions: jsonb("custom_permissions").default({}).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  organization_id: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#000000").notNull(),
  status: text("status").default("active").notNull(),
  created_by: text("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  organization_id: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  description: text("description"),
  code: text("code").notNull(),
  status: text("status").default("todo").notNull(),
  priority: text("priority").default("medium").notNull(),
  progress: integer("progress").default(0).notNull(),
  estimated_hours: decimal("estimated_hours").default("0").notNull(),
  logged_hours: decimal("logged_hours").default("0").notNull(),
  due_date: timestamp("due_date"),
  sprint: text("sprint"),
  tags: text("tags").array(),
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  assignee_id: text("assignee_id"), // References Clerk ID
  created_by: text("created_by"), // References Clerk ID
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const timesheets = pgTable("timesheets", {
  id: uuid("id").defaultRandom().primaryKey(),
  organization_id: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  user_id: text("user_id").notNull(), // References Clerk ID
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  task_id: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  date: text("date").notNull(), // Using YYYY-MM-DD
  hours: decimal("hours").notNull(),
  billable: boolean("billable").default(true).notNull(),
  notes: text("notes"),
  custom_values: jsonb("custom_values").default({}).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const personalTodos = pgTable("personal_todos", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: text("user_id").notNull(),
  organization_id: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  status: text("status").default("open").notNull(),
  priority: text("priority").default("normal").notNull(),
  pinned: boolean("pinned").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// personal_links — user-curated links for their personal workspace (Google Docs, Folders, etc.)
export const personalLinks = pgTable("personal_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: text("user_id").notNull(),
  organization_id: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  category: text("category").notNull().$type<LinkCategory>(), // doc | sheet | folder | image | etc.
  description: text("description"),
  pinned: boolean("pinned").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const customTimesheetForms = pgTable("custom_timesheet_forms", {
  id: uuid("id").defaultRandom().primaryKey(),
  organization_id: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  project_id: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  fields: jsonb("fields").default([]).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const formTemplates = pgTable("form_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  organization_id: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("draft").notNull(),
  fields: jsonb("fields").default([]).notNull(),
  layout_settings: jsonb("layout_settings").default({}).notNull(),
  version: text("version").default("v1").notNull(),
  created_by: text("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});
