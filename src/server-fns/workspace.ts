import { getRequest } from "@tanstack/react-start/server";
import { db } from "@/db";
import { organizationMemberships, organizations, profiles } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { parseCookies, verifySessionToken } from "@/lib/auth-server";
import { getAdminFirestore } from "@/lib/firebase-admin";

// Super admins are managed via the `is_super_admin` column on the profiles table.
// Bootstrap the first super admin by setting SUPER_ADMIN_EMAILS in your environment variables.

export type WorkspaceRole = "super_admin" | "admin" | "member";

export interface CurrentActor {
  userId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
}

export async function getCurrentActor(): Promise<CurrentActor> {
  const request = getRequest();
  const cookies = parseCookies(request.headers.get("cookie"));
  const sessionToken = cookies.session;

  if (!sessionToken) throw new Error("Unauthorized");
  const session = await verifySessionToken(sessionToken);
  if (!session) throw new Error("Unauthorized");

  const userId = session.userId;
  const email = session.email;
  const name = session.name;
  const avatarUrl = session.avatarUrl;

  await db
    .insert(profiles)
    .values({
      id: userId,
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
      .set({ user_id: userId })
      .where(
        and(
          eq(organizationMemberships.email, email.toLowerCase()),
          eq(organizationMemberships.user_id, `pending:${email.toLowerCase()}`),
        ),
      );

    // Claim any pending chat invites (fire-and-forget — don't block auth)
    claimFirestoreInvites(userId, email).catch(() => {});
  }

  const dbProfile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  });

  if (dbProfile?.blocked) {
    throw new Error("Your account has been blocked by the administrator.");
  }

  return {
    userId,
    email,
    name,
    avatarUrl,
    isSuperAdmin: dbProfile?.is_super_admin ?? false,
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
  // Always ensure the actor has exactly one personal workspace
  const personal = await ensurePersonalWorkspace(actor);

  if (actor.isSuperAdmin) {
    // Super admins see their own personal workspace + all org-type workspaces.
    // Other users' personal workspaces are excluded — they are private to each user.
    const orgWorkspaces = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.kind, "organization"));
    return Array.from(new Set([personal.id, ...orgWorkspaces.map((o) => o.id)]));
  }

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

  // Normalize legacy "manager" DB value to "admin" — manager role is deprecated
  const effectiveRole =
    membership?.role === "manager" ? "admin" : (membership?.role as WorkspaceRole | undefined);

  if (!effectiveRole || !allowed.includes(effectiveRole)) {
    throw new Error("Permission denied");
  }
}

export function scopedOrganizationFilter(ids: string[]) {
  if (ids.length === 0) return undefined;
  return inArray(organizations.id, ids);
}

async function claimFirestoreInvites(userId: string, email: string) {
  const { FieldValue } = await import("firebase-admin/firestore");
  const adminDb = getAdminFirestore();

  const snap = await adminDb
    .collection("platformInvites")
    .where("email", "==", email.toLowerCase())
    .where("used", "==", false)
    .get();

  for (const doc of snap.docs) {
    const invite = doc.data();
    await doc.ref.update({ used: true });

    if (invite.conversationId) {
      await adminDb
        .collection("conversations")
        .doc(invite.conversationId as string)
        .update({
          participants: FieldValue.arrayUnion(userId),
          [`unreadCounts.${userId}`]: 0,
        });
    }
  }
}
