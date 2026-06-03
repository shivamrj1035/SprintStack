import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import {
  customTimesheetForms,
  organizationMemberships,
  organizations,
  personalTodos,
  profiles,
  projects,
  tasks,
  timesheets,
  formTemplates,
} from "@/db/schema";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import {
  ensurePersonalWorkspace,
  getAccessibleOrganizationIds,
  getCurrentActor,
  requireWorkspaceRole,
} from "./workspace";

const DEFAULT_MODULES = ["projects", "tasks", "timesheets", "dashboard"];
const workspaceRoleSchema = z.enum(["admin", "manager", "member"]);

export const getWorkspaceContext = createServerFn({ method: "GET" }).handler(async () => {
  const actor = await getCurrentActor();
  const ids = await getAccessibleOrganizationIds(actor);

  const orgs =
    ids.length === 0
      ? []
      : await db
          .select()
          .from(organizations)
          .where(inArray(organizations.id, ids))
          .orderBy(desc(organizations.created_at));

  const memberships =
    ids.length === 0
      ? []
      : await db
          .select()
          .from(organizationMemberships)
          .where(inArray(organizationMemberships.organization_id, ids));

  const organizationsWithRole = orgs.map((org) => {
    const membership = memberships.find(
      (item) => item.organization_id === org.id && item.user_id === actor.userId,
    );
    return {
      ...org,
      current_user_role: actor.isSuperAdmin
        ? ("super_admin" as const)
        : (membership?.role ?? ("member" as const)),
      can_manage:
        actor.isSuperAdmin || membership?.role === "admin" || membership?.role === "super_admin",
    };
  });

  return { actor, organizations: organizationsWithRole };
});

const createOrganizationSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  adminEmail: z.string().email().optional().nullable(),
  logo_url: z.string().url().optional().nullable().or(z.literal("")),
  theme_color: z.string().default("#3B82F6"),
  modules: z.array(z.string()).default(DEFAULT_MODULES),
});

export const createOrganization = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof createOrganizationSchema>) =>
    createOrganizationSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    if (!actor.isSuperAdmin)
      throw new Error("Only the platform super admin can create organizations");

    const [org] = await db
      .insert(organizations)
      .values({
        name: data.name,
        slug: data.slug,
        kind: "organization",
        logo_url: data.logo_url || null,
        theme_color: data.theme_color,
        modules: data.modules,
        created_by: actor.userId,
      })
      .returning();

    await db.insert(organizationMemberships).values({
      organization_id: org.id,
      user_id: actor.userId,
      email: actor.email,
      role: "super_admin",
    });

    if (data.adminEmail) {
      await db.insert(organizationMemberships).values({
        organization_id: org.id,
        user_id: `pending:${data.adminEmail.toLowerCase()}`,
        email: data.adminEmail.toLowerCase(),
        role: "admin",
      });
    }
  });

const organizationIdSchema = z.object({
  organization_id: z.string().uuid(),
});

export const getOrganizationMembers = createServerFn({ method: "GET" })
  .inputValidator((data: z.infer<typeof organizationIdSchema>) => organizationIdSchema.parse(data))
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    await requireWorkspaceRole(actor, data.organization_id, ["super_admin", "admin"]);

    return await db
      .select({
        id: organizationMemberships.id,
        organization_id: organizationMemberships.organization_id,
        user_id: organizationMemberships.user_id,
        email: organizationMemberships.email,
        role: organizationMemberships.role,
        created_at: organizationMemberships.created_at,
        profile_name: profiles.name,
        profile_email: profiles.email,
        profile_avatar_url: profiles.avatar_url,
      })
      .from(organizationMemberships)
      .leftJoin(profiles, eq(organizationMemberships.user_id, profiles.id))
      .where(eq(organizationMemberships.organization_id, data.organization_id))
      .orderBy(desc(organizationMemberships.created_at));
  });

const addOrganizationMemberSchema = z.object({
  organization_id: z.string().uuid(),
  email: z.string().email(),
  role: workspaceRoleSchema.default("member"),
});

export const addOrganizationMember = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof addOrganizationMemberSchema>) =>
    addOrganizationMemberSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    await requireWorkspaceRole(actor, data.organization_id, ["super_admin", "admin"]);

    const email = data.email.toLowerCase();
    const existing = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.organization_id, data.organization_id),
        eq(organizationMemberships.email, email),
      ),
    });

    if (existing) {
      await db
        .update(organizationMemberships)
        .set({ role: data.role })
        .where(eq(organizationMemberships.id, existing.id));
      return;
    }

    const existingProfile = await db.query.profiles.findFirst({
      where: eq(profiles.email, email),
    });

    await db.insert(organizationMemberships).values({
      organization_id: data.organization_id,
      user_id: existingProfile?.id ?? `pending:${email}`,
      email,
      role: data.role,
    });
  });

const updateOrganizationMemberRoleSchema = z.object({
  membership_id: z.string().uuid(),
  role: workspaceRoleSchema,
});

export const updateOrganizationMemberRole = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof updateOrganizationMemberRoleSchema>) =>
    updateOrganizationMemberRoleSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    const membership = await db.query.organizationMemberships.findFirst({
      where: eq(organizationMemberships.id, data.membership_id),
    });
    if (!membership) throw new Error("Membership not found");

    await requireWorkspaceRole(actor, membership.organization_id, ["super_admin", "admin"]);
    await db
      .update(organizationMemberships)
      .set({ role: data.role })
      .where(eq(organizationMemberships.id, data.membership_id));
  });

const updateOrganizationSettingsSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  logo_url: z.string().url().optional().nullable().or(z.literal("")),
  theme_color: z.string(),
  modules: z.array(z.string()),
});

export const updateOrganizationSettings = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof updateOrganizationSettingsSchema>) =>
    updateOrganizationSettingsSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    await requireWorkspaceRole(actor, data.organization_id, ["super_admin", "admin"]);

    await db
      .update(organizations)
      .set({
        name: data.name,
        slug: data.slug,
        logo_url: data.logo_url || null,
        theme_color: data.theme_color,
        modules: data.modules,
        updated_at: new Date(),
      })
      .where(eq(organizations.id, data.organization_id));
  });

export const getTasks = createServerFn({ method: "GET" }).handler(async () => {
  const actor = await getCurrentActor();
  const ids = await getAccessibleOrganizationIds(actor);
  if (ids.length === 0) return [];

  return await db
    .select()
    .from(tasks)
    .where(inArray(tasks.organization_id, ids))
    .orderBy(desc(tasks.created_at));
});

export const getProjects = createServerFn({ method: "GET" }).handler(async () => {
  const actor = await getCurrentActor();
  const ids = await getAccessibleOrganizationIds(actor);
  if (ids.length === 0) return [];

  return await db
    .select()
    .from(projects)
    .where(inArray(projects.organization_id, ids))
    .orderBy(desc(projects.created_at));
});

const createProjectSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  color: z.string(),
  organization_id: z.string().uuid().nullable().optional(),
});

export const createProject = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof createProjectSchema>) => createProjectSchema.parse(data))
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    const personal = await ensurePersonalWorkspace(actor);
    const organizationId = data.organization_id ?? personal.id;

    await requireWorkspaceRole(actor, organizationId, ["super_admin", "admin", "manager"]);

    await db.insert(projects).values({
      name: data.name,
      description: data.description,
      color: data.color,
      organization_id: organizationId,
      created_by: actor.userId,
    });
  });

const getTimesheetsSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export const getTimesheets = createServerFn({ method: "GET" })
  .inputValidator((data: z.infer<typeof getTimesheetsSchema>) => getTimesheetsSchema.parse(data))
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    const ids = await getAccessibleOrganizationIds(actor);
    if (ids.length === 0) return [];

    const rows = await db
      .select({
        id: timesheets.id,
        user_id: timesheets.user_id,
        organization_id: timesheets.organization_id,
        project_id: timesheets.project_id,
        task_id: timesheets.task_id,
        date: timesheets.date,
        hours: timesheets.hours,
        billable: timesheets.billable,
        notes: timesheets.notes,
        custom_values: timesheets.custom_values,
        created_at: timesheets.created_at,
        tasks: {
          title: tasks.title,
          code: tasks.code,
        },
      })
      .from(timesheets)
      .leftJoin(tasks, eq(timesheets.task_id, tasks.id))
      .where(
        and(
          eq(timesheets.user_id, actor.userId),
          inArray(timesheets.organization_id, ids),
          gte(timesheets.date, data.from),
          lte(timesheets.date, data.to),
        ),
      )
      .orderBy(timesheets.date);

    return rows as {
      id: string;
      user_id: string;
      organization_id: string | null;
      project_id: string | null;
      task_id: string | null;
      date: string;
      hours: string;
      billable: boolean;
      notes: string | null;
      custom_values: Record<string, string | number | boolean | null | undefined>;
      created_at: Date;
      tasks: {
        title: string;
        code: string;
      } | null;
    }[];
  });

const createTimesheetSchema = z.object({
  hours: z.number(),
  date: z.string(),
  notes: z.string().nullable().optional(),
  billable: z.boolean(),
  task_id: z.string().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  custom_values: z.record(z.any()).default({}).optional(),
});

export const createTimesheet = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof createTimesheetSchema>) =>
    createTimesheetSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    const personal = await ensurePersonalWorkspace(actor);
    let organizationId = personal.id;
    let projectId = data.project_id || null;

    if (data.task_id) {
      const task = await db.query.tasks.findFirst({ where: eq(tasks.id, data.task_id) });
      if (!task?.organization_id) throw new Error("Task not found");
      await requireWorkspaceRole(actor, task.organization_id, [
        "super_admin",
        "admin",
        "manager",
        "member",
      ]);
      organizationId = task.organization_id;
      if (!projectId) {
        projectId = task.project_id;
      }
    } else if (projectId) {
      const proj = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
      if (!proj?.organization_id) throw new Error("Project not found");
      await requireWorkspaceRole(actor, proj.organization_id, [
        "super_admin",
        "admin",
        "manager",
        "member",
      ]);
      organizationId = proj.organization_id;
    }

    await db.insert(timesheets).values({
      organization_id: organizationId,
      user_id: actor.userId,
      hours: data.hours.toString(),
      date: data.date,
      notes: data.notes,
      billable: data.billable,
      task_id: data.task_id || null,
      project_id: projectId,
      custom_values: data.custom_values || {},
    });
  });

export const deleteTimesheet = createServerFn({ method: "POST" })
  .inputValidator((data: string) => z.string().parse(data))
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    await db
      .delete(timesheets)
      .where(and(eq(timesheets.id, data), eq(timesheets.user_id, actor.userId)));
  });

export const getPeople = createServerFn({ method: "GET" }).handler(async () => {
  const actor = await getCurrentActor();
  const ids = await getAccessibleOrganizationIds(actor);
  if (ids.length === 0) return [];

  const members = await db
    .select({ user_id: organizationMemberships.user_id })
    .from(organizationMemberships)
    .where(inArray(organizationMemberships.organization_id, ids));
  const memberIds = members
    .map((member) => member.user_id)
    .filter((id) => !id.startsWith("pending:"));

  if (memberIds.length === 0) return [];
  return await db.select().from(profiles).where(inArray(profiles.id, memberIds));
});

const updateTaskSchema = z.object({
  id: z.string(),
  patch: z.record(z.unknown()),
});

export const updateTask = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof updateTaskSchema>) => updateTaskSchema.parse(data))
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    const existing = await db.query.tasks.findFirst({ where: eq(tasks.id, data.id) });
    if (!existing?.organization_id) throw new Error("Task not found");
    await requireWorkspaceRole(actor, existing.organization_id, [
      "super_admin",
      "admin",
      "manager",
      "member",
    ]);

    const patch: Record<string, unknown> = { ...data.patch, updated_at: new Date() };
    if (patch.estimated_hours !== undefined && patch.estimated_hours !== null) {
      patch.estimated_hours = String(patch.estimated_hours);
    }
    if (patch.due_date !== undefined) {
      patch.due_date = patch.due_date ? new Date(String(patch.due_date)) : null;
    }

    await db.update(tasks).set(patch).where(eq(tasks.id, data.id));
  });

const createTaskSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  status: z.string(),
  priority: z.string(),
  assignee_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  organization_id: z.string().uuid().nullable().optional(),
  progress: z.number().default(0),
  estimated_hours: z.number().default(0),
  due_date: z.string().nullable().optional(),
  sprint: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
});

export const createTask = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof createTaskSchema>) => createTaskSchema.parse(data))
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    const personal = await ensurePersonalWorkspace(actor);
    let organizationId = data.organization_id ?? personal.id;

    if (data.project_id) {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, data.project_id),
      });
      if (!project?.organization_id) throw new Error("Project not found");
      organizationId = project.organization_id;
    }

    await requireWorkspaceRole(actor, organizationId, [
      "super_admin",
      "admin",
      "manager",
      "member",
    ]);

    const orgTasks = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.organization_id, organizationId));
    const code = `TASK-${1000 + orgTasks.length + 1}`;

    await db.insert(tasks).values({
      organization_id: organizationId,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      assignee_id: data.assignee_id ?? actor.userId,
      project_id: data.project_id,
      progress: data.progress,
      estimated_hours: data.estimated_hours.toString(),
      due_date: data.due_date ? new Date(data.due_date) : null,
      sprint: data.sprint,
      tags: data.tags,
      code,
      created_by: actor.userId,
    });
  });

export const deleteTask = createServerFn({ method: "POST" })
  .inputValidator((data: string) => z.string().parse(data))
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    const existing = await db.query.tasks.findFirst({ where: eq(tasks.id, data) });
    if (!existing?.organization_id) throw new Error("Task not found");
    await requireWorkspaceRole(actor, existing.organization_id, [
      "super_admin",
      "admin",
      "manager",
    ]);
    await db.delete(tasks).where(eq(tasks.id, data));
  });

export const getPersonalTodos = createServerFn({ method: "GET" }).handler(async () => {
  const actor = await getCurrentActor();
  return await db
    .select()
    .from(personalTodos)
    .where(eq(personalTodos.user_id, actor.userId))
    .orderBy(desc(personalTodos.pinned), desc(personalTodos.updated_at));
});

const createPersonalTodoSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).nullable().optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  pinned: z.boolean().default(false),
});

export const createPersonalTodo = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof createPersonalTodoSchema>) =>
    createPersonalTodoSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    await db.insert(personalTodos).values({
      user_id: actor.userId,
      title: data.title,
      notes: data.notes,
      priority: data.priority,
      pinned: data.pinned,
    });
  });

const updatePersonalTodoSchema = z.object({
  id: z.string().uuid(),
  patch: z.object({
    title: z.string().min(1).max(200).optional(),
    notes: z.string().max(2000).nullable().optional(),
    status: z.enum(["open", "done"]).optional(),
    priority: z.enum(["low", "normal", "high"]).optional(),
    pinned: z.boolean().optional(),
  }),
});

export const updatePersonalTodo = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof updatePersonalTodoSchema>) =>
    updatePersonalTodoSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    await db
      .update(personalTodos)
      .set({ ...data.patch, updated_at: new Date() })
      .where(and(eq(personalTodos.id, data.id), eq(personalTodos.user_id, actor.userId)));
  });

export const deletePersonalTodo = createServerFn({ method: "POST" })
  .inputValidator((data: string) => z.string().uuid().parse(data))
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    await db
      .delete(personalTodos)
      .where(and(eq(personalTodos.id, data), eq(personalTodos.user_id, actor.userId)));
  });

const customFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(["text", "date", "select", "number"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

const saveCustomTimesheetFormSchema = z.object({
  organization_id: z.string().uuid(),
  project_id: z.string().uuid(),
  fields: z.array(customFieldSchema),
});

export const getCustomTimesheetForms = createServerFn({ method: "GET" })
  .inputValidator((data: { organization_id: string }) =>
    z.object({ organization_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    await requireWorkspaceRole(actor, data.organization_id, ["super_admin", "admin"]);

    return (await db
      .select()
      .from(customTimesheetForms)
      .where(eq(customTimesheetForms.organization_id, data.organization_id))
      .orderBy(desc(customTimesheetForms.created_at))) as {
      id: string;
      organization_id: string;
      project_id: string;
      fields: {
        id: string;
        label: string;
        type: "text" | "date" | "select" | "number";
        required: boolean;
        options?: string[];
      }[];
      created_at: Date;
      updated_at: Date;
    }[];
  });

export const saveCustomTimesheetForm = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof saveCustomTimesheetFormSchema>) =>
    saveCustomTimesheetFormSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    await requireWorkspaceRole(actor, data.organization_id, ["super_admin", "admin"]);

    // Check if form already exists for this project in the organization
    const existing = await db.query.customTimesheetForms.findFirst({
      where: and(
        eq(customTimesheetForms.organization_id, data.organization_id),
        eq(customTimesheetForms.project_id, data.project_id),
      ),
    });

    if (existing) {
      await db
        .update(customTimesheetForms)
        .set({
          fields: data.fields,
          updated_at: new Date(),
        })
        .where(eq(customTimesheetForms.id, existing.id));
    } else {
      await db.insert(customTimesheetForms).values({
        organization_id: data.organization_id,
        project_id: data.project_id,
        fields: data.fields,
      });
    }
  });

export const deleteCustomTimesheetForm = createServerFn({ method: "POST" })
  .inputValidator((data: { organization_id: string; form_id: string }) =>
    z.object({ organization_id: z.string().uuid(), form_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    await requireWorkspaceRole(actor, data.organization_id, ["super_admin", "admin"]);

    await db
      .delete(customTimesheetForms)
      .where(
        and(
          eq(customTimesheetForms.id, data.form_id),
          eq(customTimesheetForms.organization_id, data.organization_id),
        ),
      );
  });

export const getCustomFormForProject = createServerFn({ method: "GET" })
  .inputValidator((data: { project_id: string }) =>
    z.object({ project_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();

    // Check if project exists and user has access to organization of this project
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, data.project_id),
    });
    if (!project?.organization_id) {
      return null;
    }

    await requireWorkspaceRole(actor, project.organization_id, [
      "super_admin",
      "admin",
      "manager",
      "member",
    ]);

    // 1. Check for published Form Template mapped to this project
    const template = await db.query.formTemplates.findFirst({
      where: and(
        eq(formTemplates.organization_id, project.organization_id),
        eq(formTemplates.project_id, data.project_id),
        eq(formTemplates.status, "published"),
      ),
    });

    if (template) {
      return {
        id: template.id,
        organization_id: template.organization_id,
        project_id: template.project_id!,
        fields: template.fields as {
          id?: string;
          type: string;
          label: string;
          category: "input" | "selection" | "content" | "layout";
          options?: string[];
          required: boolean;
          placeholder?: string;
          width?: string;
        }[],
        layout_settings: template.layout_settings as Record<string, unknown>,
        isTemplate: true as const,
        name: template.name,
      };
    }

    // 2. Fallback to customTimesheetForms
    const form = await db.query.customTimesheetForms.findFirst({
      where: and(
        eq(customTimesheetForms.organization_id, project.organization_id),
        eq(customTimesheetForms.project_id, data.project_id),
      ),
    });

    if (!form) return null;

    return {
      id: form.id,
      organization_id: form.organization_id,
      project_id: form.project_id,
      fields: form.fields as {
        id: string;
        label: string;
        type: "text" | "date" | "select" | "number";
        required: boolean;
        options?: string[];
      }[],
      created_at: form.created_at,
      updated_at: form.updated_at,
      isTemplate: false as const,
    };
  });

export const getFormTemplates = createServerFn({ method: "GET" })
  .inputValidator((data: { organization_id: string }) =>
    z.object({ organization_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    await requireWorkspaceRole(actor, data.organization_id, [
      "super_admin",
      "admin",
      "manager",
      "member",
    ]);

    const rows = await db
      .select({
        id: formTemplates.id,
        organization_id: formTemplates.organization_id,
        project_id: formTemplates.project_id,
        name: formTemplates.name,
        description: formTemplates.description,
        status: formTemplates.status,
        fields: formTemplates.fields,
        layout_settings: formTemplates.layout_settings,
        version: formTemplates.version,
        created_by: formTemplates.created_by,
        created_at: formTemplates.created_at,
        updated_at: formTemplates.updated_at,
        project_name: projects.name,
      })
      .from(formTemplates)
      .leftJoin(projects, eq(formTemplates.project_id, projects.id))
      .where(eq(formTemplates.organization_id, data.organization_id))
      .orderBy(desc(formTemplates.created_at));

    return rows as {
      id: string;
      organization_id: string;
      project_id: string | null;
      name: string;
      description: string | null;
      status: "draft" | "published" | "archived";
      fields: {
        id?: string;
        type: string;
        label: string;
        category: "input" | "selection" | "content" | "layout";
        options?: string[];
        required: boolean;
        placeholder?: string;
        width?: string;
      }[];
      layout_settings: unknown;
      version: string;
      created_by: string;
      created_at: Date;
      updated_at: Date;
      project_name: string | null;
    }[];
  });

export const getFormTemplateById = createServerFn({ method: "GET" })
  .inputValidator((data: { template_id: string }) =>
    z.object({ template_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();

    const [row] = await db
      .select({
        id: formTemplates.id,
        organization_id: formTemplates.organization_id,
        project_id: formTemplates.project_id,
        name: formTemplates.name,
        description: formTemplates.description,
        status: formTemplates.status,
        fields: formTemplates.fields,
        layout_settings: formTemplates.layout_settings,
        version: formTemplates.version,
        created_by: formTemplates.created_by,
        created_at: formTemplates.created_at,
        updated_at: formTemplates.updated_at,
        project_name: projects.name,
      })
      .from(formTemplates)
      .leftJoin(projects, eq(formTemplates.project_id, projects.id))
      .where(eq(formTemplates.id, data.template_id));

    if (!row) return null;

    await requireWorkspaceRole(actor, row.organization_id, [
      "super_admin",
      "admin",
      "manager",
      "member",
    ]);

    return row as {
      id: string;
      organization_id: string;
      project_id: string | null;
      name: string;
      description: string | null;
      status: "draft" | "published" | "archived";
      fields: {
        id?: string;
        type: string;
        label: string;
        category: "input" | "selection" | "content" | "layout";
        options?: string[];
        required: boolean;
        placeholder?: string;
        width?: string;
      }[];
      layout_settings: unknown;
      version: string;
      created_by: string;
      created_at: Date;
      updated_at: Date;
      project_name: string | null;
    };
  });

const saveFormTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  organization_id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.enum(["draft", "published", "archived"]),
  fields: z.array(
    z.object({
      id: z.string().optional(),
      type: z.string(),
      label: z.string(),
      category: z.enum(["input", "selection", "content", "layout"]),
      options: z.array(z.string()).optional(),
      required: z.boolean(),
      placeholder: z.string().optional(),
      width: z.string().optional(),
    }),
  ),
  layout_settings: z.any().optional(),
  version: z.string().default("v1"),
});

export const saveFormTemplate = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof saveFormTemplateSchema>) =>
    saveFormTemplateSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    await requireWorkspaceRole(actor, data.organization_id, ["super_admin", "admin"]);

    if (data.id) {
      const [updated] = await db
        .update(formTemplates)
        .set({
          project_id: data.project_id || null,
          name: data.name,
          description: data.description || null,
          status: data.status,
          fields: data.fields,
          layout_settings: data.layout_settings || {},
          version: data.version,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(formTemplates.id, data.id),
            eq(formTemplates.organization_id, data.organization_id),
          ),
        )
        .returning();
      return {
        id: updated.id,
        organization_id: updated.organization_id,
        project_id: updated.project_id,
        name: updated.name,
        description: updated.description,
        status: updated.status as "draft" | "published" | "archived",
        fields: updated.fields as {
          id?: string;
          type: string;
          label: string;
          category: "input" | "selection" | "content" | "layout";
          options?: string[];
          required: boolean;
          placeholder?: string;
          width?: string;
        }[],
        layout_settings: updated.layout_settings as Record<string, unknown>,
        version: updated.version,
        created_by: updated.created_by,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      };
    } else {
      const [created] = await db
        .insert(formTemplates)
        .values({
          organization_id: data.organization_id,
          project_id: data.project_id || null,
          name: data.name,
          description: data.description || null,
          status: data.status,
          fields: data.fields,
          layout_settings: data.layout_settings || {},
          version: data.version,
          created_by: actor.userId,
        })
        .returning();
      return {
        id: created.id,
        organization_id: created.organization_id,
        project_id: created.project_id,
        name: created.name,
        description: created.description,
        status: created.status as "draft" | "published" | "archived",
        fields: created.fields as {
          id?: string;
          type: string;
          label: string;
          category: "input" | "selection" | "content" | "layout";
          options?: string[];
          required: boolean;
          placeholder?: string;
          width?: string;
        }[],
        layout_settings: created.layout_settings as Record<string, unknown>,
        version: created.version,
        created_by: created.created_by,
        created_at: created.created_at,
        updated_at: created.updated_at,
      };
    }
  });

export const deleteFormTemplate = createServerFn({ method: "POST" })
  .inputValidator((data: { organization_id: string; template_id: string }) =>
    z
      .object({
        organization_id: z.string().uuid(),
        template_id: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    await requireWorkspaceRole(actor, data.organization_id, ["super_admin", "admin"]);

    await db
      .delete(formTemplates)
      .where(
        and(
          eq(formTemplates.id, data.template_id),
          eq(formTemplates.organization_id, data.organization_id),
        ),
      );
  });
