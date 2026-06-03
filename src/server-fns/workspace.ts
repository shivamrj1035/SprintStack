import { getAuth, clerkClient } from "@clerk/tanstack-start/server";
import { getRequest } from "@tanstack/react-start/server";
import { db } from "@/db";
import { organizationMemberships, organizations, profiles } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export const SUPER_ADMIN_EMAIL = "srjtheinfinity1035@gmail.com";

export type WorkspaceRole = "super_admin" | "admin" | "manager" | "member";

export interface CurrentActor {
  userId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
}

export async function getCurrentActor(): Promise<CurrentActor> {
  const request = getRequest();
  const authRequest = new Request(request.url, {
    method: "GET",
    headers: request.headers,
  });
  const auth = await getAuth(authRequest);
  if (!auth?.userId) throw new Error("Unauthorized");

  const claims = "sessionClaims" in auth ? auth.sessionClaims : null;
  const claimEmail =
    typeof claims === "object" && claims
      ? ((claims as { email?: string; primary_email_address?: string }).email ??
        (claims as { email?: string; primary_email_address?: string }).primary_email_address ??
        null)
      : null;

  let email = claimEmail;
  let name: string | null = null;
  let avatarUrl: string | null = null;

  if (!email) {
    const client = clerkClient();
    const user = await client.users.getUser(auth.userId);
    email = user.primaryEmailAddress?.emailAddress ?? null;
    name = user.fullName;
    avatarUrl = user.imageUrl;
  }

  await db
    .insert(profiles)
    .values({
      id: auth.userId,
      email,
      name,
      avatar_url: avatarUrl,
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { email, name, avatar_url: avatarUrl, updated_at: new Date() },
    });

  if (email) {
    await db
      .update(organizationMemberships)
      .set({ user_id: auth.userId })
      .where(
        and(
          eq(organizationMemberships.email, email.toLowerCase()),
          eq(organizationMemberships.user_id, `pending:${email.toLowerCase()}`),
        ),
      );
  }

  return {
    userId: auth.userId,
    email,
    name,
    avatarUrl,
    isSuperAdmin: email?.toLowerCase() === SUPER_ADMIN_EMAIL,
  };
}

function personalSlug(actor: CurrentActor) {
  return `personal-${actor.userId.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
}

export async function ensurePersonalWorkspace(actor: CurrentActor) {
  const slug = personalSlug(actor);
  const existing = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  if (existing) return existing;

  const [workspace] = await db
    .insert(organizations)
    .values({
      name: "Personal Workspace",
      slug,
      kind: "personal",
      created_by: actor.userId,
    })
    .returning();

  await db.insert(organizationMemberships).values({
    organization_id: workspace.id,
    user_id: actor.userId,
    email: actor.email,
    role: "admin",
  });

  return workspace;
}

export async function getAccessibleOrganizationIds(actor: CurrentActor) {
  if (actor.isSuperAdmin) {
    const all = await db.select({ id: organizations.id }).from(organizations);
    return all.map((org) => org.id);
  }

  const personal = await ensurePersonalWorkspace(actor);
  const memberships = await db
    .select({ organization_id: organizationMemberships.organization_id })
    .from(organizationMemberships)
    .where(eq(organizationMemberships.user_id, actor.userId));

  return Array.from(new Set([personal.id, ...memberships.map((m) => m.organization_id)]));
}

export async function requireWorkspaceRole(
  actor: CurrentActor,
  organizationId: string,
  allowed: WorkspaceRole[],
) {
  if (actor.isSuperAdmin) return;

  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organization_id, organizationId),
      eq(organizationMemberships.user_id, actor.userId),
    ),
  });

  if (!membership || !allowed.includes(membership.role)) {
    throw new Error("Permission denied");
  }
}

export function scopedOrganizationFilter(ids: string[]) {
  if (ids.length === 0) return undefined;
  return inArray(organizations.id, ids);
}
