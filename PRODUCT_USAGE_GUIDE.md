# Product Usage Guide

## Overview

OrbitOS is a Jira-style developer work management platform with two workspace modes:

- **Organization workspace** for teams, companies, and managed projects.
- **Personal workspace** for individual developers managing their own tasks and projects.

The platform uses Clerk for authentication and Neon PostgreSQL for data storage.

## User Roles

### Super Admin

The platform super admin is:

`srjtheinfinity1035@gmail.com`

The super admin can:

- Create organizations.
- Assign the first organization admin by email.
- Configure company slug, logo URL, theme color, and enabled modules.
- View organization and personal workspace records available to the platform.

After signing in with the super admin email, open **Organizations** from the sidebar.

### Organization Admin

An organization admin is assigned by the super admin during organization creation.

Organization admins can:

- Work inside their assigned organization.
- Create organization projects.
- Create and manage tasks.
- Assign tasks to users where membership exists.
- Track progress, due dates, priorities, and time logs.

Organization admins cannot manage unrelated organizations.

### Organization User

Organization users work inside organizations where they have membership.

Users can:

- View accessible organization projects and tasks.
- Create or update tasks when permissions allow.
- Track personal time through timesheets.
- Use their personal workspace separately.

### Personal User

Every signed-in user gets a personal workspace automatically.

Personal users can:

- Create personal projects.
- Create self-assigned tasks.
- Track status, priority, progress, due dates, estimates, and tags.
- Log time against tasks.

Unfinished tasks remain visible until they are marked done, archived, deleted, or rescheduled.

## Creating an Organization

1. Sign in as `srjtheinfinity1035@gmail.com`.
2. Open **Organizations** from the sidebar.
3. Click **New organization**.
4. Enter:
   - Organization name
   - Company slug
   - Organization admin email
   - Logo URL, optional
   - Theme color
   - Enabled modules
5. Click **Create**.

If the admin email belongs to a user who has not logged in yet, the membership is stored as pending. When that user logs in with the same email, the pending admin membership is attached automatically.

## Creating Projects

1. Open **Projects**.
2. Click **New project**.
3. Choose a workspace:
   - **Personal workspace** for self-managed work.
   - An organization workspace for team work.
4. Enter name, description, and color.
5. Click **Create**.

Projects are scoped to the selected workspace.

## Creating Tasks

1. Open **Tasks**.
2. Click **New task**.
3. Choose the workspace.
4. Optionally select a project.
5. Fill in title, description, status, priority, assignee, due date, estimate, sprint, progress, and tags.
6. Click **Create**.

Tasks belong to either a personal workspace or an organization workspace.

## Tracking Progress

Use the task table to update:

- Status
- Priority
- Progress percentage
- Due date
- Estimate
- Sprint
- Tags

The dashboard summarizes assigned tasks, overdue work, in-progress tasks, completed work, weekly hours, and project progress.

## Logging Time

1. Open **Timesheets**.
2. Click **Log time**.
3. Select date, hours, task, notes, and billable status.
4. Click **Log**.

Timesheet entries are scoped to the task workspace or the user’s personal workspace.

## Data Access Rules

- Super admin can create and configure organizations.
- Organization admins can access only their assigned organizations.
- Organization users can access only their memberships.
- Personal workspace data belongs to the owning user.
- Organization data and personal workspace data are kept separate.

## Database Management

Use Neon through `DATABASE_URL`.

Common commands:

```bash
npx drizzle-kit generate
npx drizzle-kit push
npx drizzle-kit studio
```

Use `npx drizzle-kit push` to apply schema changes to Neon during development.
