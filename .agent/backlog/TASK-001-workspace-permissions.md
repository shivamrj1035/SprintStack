# TASK-001: Workspace & Permissions Infrastructure Specification

## Objective

Establish the primary, robust multi-tenant workspace architecture and Role-Based Access Control (RBAC) governance for Sprint Stack. The system must support data isolation across workspaces, assign roles (Super Admin, Admin, Manager, Member) to users within workspaces, track billable/non-billable time logs, and govern interface visibility and data mutation capabilities via fine-grained permission tables.

---

## Functional Requirements

All state data configurations will rely on six primary JSON schemas mapping user identity, authorities, workspace isolation bounds, timesheets, and projects.

### 1. `users.json`

Represents user profiles synced via authentication providers (e.g., Clerk) and global metadata.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User",
  "type": "object",
  "properties": {
    "id": { "type": "string", "description": "Unique Clerk identity string" },
    "email": { "type": "string", "format": "email" },
    "name": { "type": "string" },
    "avatar_url": { "type": ["string", "null"] },
    "global_role": {
      "type": "string",
      "enum": ["super_admin", "user"]
    },
    "created_at": { "type": "string", "format": "date-time" },
    "updated_at": { "type": "string", "format": "date-time" }
  },
  "required": ["id", "email", "name", "global_role", "created_at", "updated_at"]
}
```

### 2. `permissions.json`

Defines the mapping of workspace roles to specific allowed actions.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PermissionsMap",
  "type": "object",
  "properties": {
    "role": {
      "type": "string",
      "enum": ["super_admin", "admin", "manager", "member"]
    },
    "allowed_actions": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "workspace:create",
          "workspace:delete",
          "workspace:edit_settings",
          "project:create",
          "project:edit",
          "project:delete",
          "task:create",
          "task:edit",
          "task:delete",
          "timesheet:log_own",
          "timesheet:log_others",
          "timesheet:approve",
          "member:invite",
          "member:remove",
          "member:change_role"
        ]
      }
    }
  },
  "required": ["role", "allowed_actions"]
}
```

### 3. `workspaces.json`

Defines isolated workspaces, supporting both Team Organizations and Personal spaces.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Workspace",
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "name": { "type": "string" },
    "slug": { "type": "string" },
    "kind": {
      "type": "string",
      "enum": ["organization", "personal"]
    },
    "theme_color": { "type": "string" },
    "logo_url": { "type": ["string", "null"] },
    "modules_enabled": {
      "type": "array",
      "items": { "type": "string" }
    },
    "created_by": { "type": "string" },
    "created_at": { "type": "string", "format": "date-time" }
  },
  "required": [
    "id",
    "name",
    "slug",
    "kind",
    "theme_color",
    "modules_enabled",
    "created_by",
    "created_at"
  ]
}
```

### 4. `authorities.json`

Defines membership relations and workspace-specific roles for users.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Authority",
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "workspace_id": { "type": "string", "format": "uuid" },
    "user_id": { "type": "string" },
    "role": {
      "type": "string",
      "enum": ["super_admin", "admin", "manager", "member"]
    },
    "status": {
      "type": "string",
      "enum": ["active", "pending_invite", "suspended"]
    },
    "joined_at": { "type": "string", "format": "date-time" }
  },
  "required": ["id", "workspace_id", "user_id", "role", "status", "joined_at"]
}
```

### 5. `timesheet_ledger.json`

Tracks the ledger of logged development hours, scoped directly to a task, project, and workspace.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "TimesheetEntry",
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "workspace_id": { "type": "string", "format": "uuid" },
    "project_id": { "type": ["string", "null"], "format": "uuid" },
    "task_id": { "type": ["string", "null"], "format": "uuid" },
    "user_id": { "type": "string" },
    "date": { "type": "string", "description": "Format YYYY-MM-DD" },
    "hours": { "type": "number", "minimum": 0 },
    "billable": { "type": "boolean" },
    "notes": { "type": ["string", "null"] },
    "created_at": { "type": "string", "format": "date-time" }
  },
  "required": ["id", "workspace_id", "user_id", "date", "hours", "billable", "created_at"]
}
```

### 6. `project_status.json`

Detailed status mapping for projects, controlling workflows and modules.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ProjectStatus",
  "type": "object",
  "properties": {
    "project_id": { "type": "string", "format": "uuid" },
    "status": {
      "type": "string",
      "enum": ["active", "archived", "on_hold", "completed"]
    },
    "visibility": {
      "type": "string",
      "enum": ["public", "private"]
    },
    "updated_by": { "type": "string" },
    "updated_at": { "type": "string", "format": "date-time" }
  },
  "required": ["project_id", "status", "visibility", "updated_by", "updated_at"]
}
```

---

## Acceptance Criteria

The Dev Manager must pass this quality checklist during post-implementation validation:

- [ ] **Schema Migration**: Drizzle schemas compile without conflicts and apply cleanly onto the Neon Postgres instance (`npx drizzle-kit push` runs successfully).
- [ ] **Multi-Tenant Isolation**: Database queries for tasks, projects, and timesheets MUST include an explicit `eq(table.organization_id, activeWorkspaceId)` predicate. Verify that selecting Workspace A does not return tasks or timesheets belonging to Workspace B.
- [ ] **Personal Workspace Autonomy**: Verify that a user’s Personal Workspace acts as an isolated organization, automatically populating their profile as `super_admin` or `admin` of that personal organization boundary.
- [ ] **Role Enforcement (RBAC)**:
  - [ ] A user with the `member` role is physically blocked from deleting projects and tasks (returns HTTP 403 / Mutation error).
  - [ ] A user with the `manager` role can edit projects and tasks, but is blocked from creating/editing organization setting models.
  - [ ] An `admin` or `super_admin` can manage roles, invite new users, and toggle module settings.
- [ ] **Audit Trail Integration**: The `created_by` field for projects and `user_id` for timesheets/tasks map strictly to active Clerk Session IDs, blocking spoofed identities.
- [ ] **Compile & Lint**: The application compiles cleanly with zero compilation errors (`npm run build` succeeds) and adheres to ESLint rules (`npm run lint` yields zero errors).
