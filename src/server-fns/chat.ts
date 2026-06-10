import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { organizationMemberships, profiles } from "@/db/schema";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { getCurrentActor } from "./workspace";
import { getAdminFirestore, getAdminMessaging } from "@/lib/firebase-admin";

// ─── Search users ────────────────────────────────────────────────────────────

const searchChatUsersSchema = z.object({
  query: z.string().min(1).max(100),
  organizationId: z.string().uuid().optional().nullable(),
});

export const searchChatUsers = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof searchChatUsersSchema>) =>
    searchChatUsersSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    const { query, organizationId } = data;
    const pattern = `%${query}%`;

    // Deduplicate rows by email — if the same email has multiple profile rows (e.g. from a
    // Clerk-to-Google-OAuth migration), only the most recently updated row is kept.
    function dedup(
      rows: { id: string; name: string | null; email: string | null; avatarUrl: string | null }[],
    ) {
      const seen = new Set<string>();
      return rows.filter((u) => {
        const key = (u.email ?? u.id).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    if (organizationId) {
      // Org workspace: only members of that org
      const rows = await db
        .select({
          id: profiles.id,
          name: profiles.name,
          email: profiles.email,
          avatarUrl: profiles.avatar_url,
        })
        .from(organizationMemberships)
        .innerJoin(profiles, eq(organizationMemberships.user_id, profiles.id))
        .where(
          and(
            eq(organizationMemberships.organization_id, organizationId),
            or(ilike(profiles.name, pattern), ilike(profiles.email, pattern)),
          ),
        )
        .orderBy(desc(profiles.updated_at))
        .limit(20);

      return {
        users: dedup(rows).filter((u) => u.id !== actor.userId),
        isOrgScoped: true,
      };
    }

    // Personal workspace: search all platform users
    const rows = await db
      .select({
        id: profiles.id,
        name: profiles.name,
        email: profiles.email,
        avatarUrl: profiles.avatar_url,
      })
      .from(profiles)
      .where(or(ilike(profiles.name, pattern), ilike(profiles.email, pattern)))
      .orderBy(desc(profiles.updated_at))
      .limit(20);

    return {
      users: dedup(rows).filter((u) => u.id !== actor.userId),
      isOrgScoped: false,
    };
  });

// ─── Invite link ─────────────────────────────────────────────────────────────

const generateInviteLinkSchema = z.object({
  email: z.string().email(),
});

export const generateInviteLink = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof generateInviteLinkSchema>) =>
    generateInviteLinkSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    const adminDb = getAdminFirestore();

    const token = crypto.randomUUID();
    await adminDb.collection("platformInvites").doc(token).set({
      email: data.email.toLowerCase(),
      invitedBy: actor.userId,
      conversationId: null,
      createdAt: new Date(),
      used: false,
    });

    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : (process.env.VITE_APP_URL ?? "https://sprint-stack.workers.dev");

    return { inviteUrl: `${baseUrl}/join?token=${token}` };
  });

// ─── FCM token management ─────────────────────────────────────────────────────

const saveFcmTokenSchema = z.object({
  token: z.string().min(1),
});

export const saveFcmToken = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof saveFcmTokenSchema>) => saveFcmTokenSchema.parse(data))
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    const adminDb = getAdminFirestore();

    const ref = adminDb.collection("userFcmTokens").doc(actor.userId);
    const snap = await ref.get();

    if (snap.exists) {
      const existing: string[] = snap.data()?.tokens ?? [];
      if (!existing.includes(data.token)) {
        await ref.update({
          tokens: [...existing, data.token],
          updatedAt: new Date(),
        });
      }
    } else {
      await ref.set({
        tokens: [data.token],
        updatedAt: new Date(),
      });
    }

    return { ok: true };
  });

// ─── Send push notification ───────────────────────────────────────────────────

const sendChatNotificationSchema = z.object({
  toUserIds: z.array(z.string()).min(1),
  senderName: z.string(),
  messageText: z.string(),
  conversationId: z.string(),
});

export const sendChatNotification = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof sendChatNotificationSchema>) =>
    sendChatNotificationSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    const adminDb = getAdminFirestore();
    const adminMsg = getAdminMessaging();

    const tokenDocs = await Promise.all(
      data.toUserIds
        .filter((id) => id !== actor.userId)
        .map((id) => adminDb.collection("userFcmTokens").doc(id).get()),
    );

    const tokens = tokenDocs.flatMap((snap) => (snap.exists ? (snap.data()?.tokens ?? []) : []));

    if (tokens.length === 0) return { sent: 0 };

    await adminMsg.sendEachForMulticast({
      tokens,
      notification: {
        title: data.senderName,
        body:
          data.messageText.length > 100 ? data.messageText.slice(0, 97) + "..." : data.messageText,
      },
      data: {
        conversationId: data.conversationId,
        url: `/chat/${data.conversationId}`,
      },
      webpush: {
        fcmOptions: { link: `/chat/${data.conversationId}` },
      },
    });

    return { sent: tokens.length };
  });

// ─── Get or create direct conversation ───────────────────────────────────────

const getOrCreateDirectConversationSchema = z.object({
  otherUserId: z.string().min(1),
});

export const getOrCreateDirectConversation = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof getOrCreateDirectConversationSchema>) =>
    getOrCreateDirectConversationSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    const adminDb = getAdminFirestore();

    // Find existing DM between both users
    const snap = await adminDb
      .collection("conversations")
      .where("type", "==", "direct")
      .where("participants", "array-contains", actor.userId)
      .get();

    const existing = snap.docs.find((doc) => {
      const participants: string[] = doc.data().participants ?? [];
      return participants.includes(data.otherUserId);
    });

    if (existing) return { conversationId: existing.id };

    // Create new DM conversation
    const ref = adminDb.collection("conversations").doc();
    const now = new Date();
    await ref.set({
      type: "direct",
      organizationId: null,
      participants: [actor.userId, data.otherUserId],
      name: null,
      lastMessage: null,
      unreadCounts: { [actor.userId]: 0, [data.otherUserId]: 0 },
      createdAt: now,
      updatedAt: now,
      createdBy: actor.userId,
    });

    return { conversationId: ref.id };
  });

// ─── Create group conversation ────────────────────────────────────────────────

const createGroupConversationSchema = z.object({
  name: z.string().min(1).max(80),
  memberIds: z.array(z.string()).min(1),
  organizationId: z.string().uuid().optional().nullable(),
});

export const createGroupConversation = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof createGroupConversationSchema>) =>
    createGroupConversationSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    const adminDb = getAdminFirestore();

    const participants = Array.from(new Set([actor.userId, ...data.memberIds]));
    const ref = adminDb.collection("conversations").doc();
    const now = new Date();

    const unreadCounts = Object.fromEntries(participants.map((id) => [id, 0]));

    await ref.set({
      type: "group",
      organizationId: data.organizationId ?? null,
      participants,
      name: data.name,
      lastMessage: null,
      unreadCounts,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.userId,
    });

    return { conversationId: ref.id };
  });

// ─── Delete conversation ──────────────────────────────────────────────────────

const deleteConversationSchema = z.object({
  conversationId: z.string().min(1),
});

export const deleteConversation = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof deleteConversationSchema>) =>
    deleteConversationSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const actor = await getCurrentActor();
    const adminDb = getAdminFirestore();

    const convRef = adminDb.collection("conversations").doc(data.conversationId);
    const convSnap = await convRef.get();

    if (!convSnap.exists) throw new Error("Conversation not found");

    const participants: string[] = convSnap.data()?.participants ?? [];
    if (!participants.includes(actor.userId)) {
      throw new Error("You are not a participant of this conversation");
    }

    // Delete messages subcollection in batches (recursiveDelete uses BulkWriter / Node streams
    // which are not available in the Cloudflare Workers edge runtime).
    const messagesRef = convRef.collection("messages");
    let hasMore = true;
    while (hasMore) {
      const snap = await messagesRef.limit(100).get();
      if (snap.empty) break;
      const batch = adminDb.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      if (snap.size < 100) hasMore = false;
    }

    await convRef.delete();

    return { ok: true };
  });

// ─── Get profiles by IDs (for participant display) ────────────────────────────

const getProfilesByIdsSchema = z.object({
  userIds: z.array(z.string()).min(1).max(50),
});

export const getProfilesByIds = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof getProfilesByIdsSchema>) =>
    getProfilesByIdsSchema.parse(data),
  )
  .handler(async ({ data }) => {
    await getCurrentActor(); // auth check

    const rows = await db
      .select({
        id: profiles.id,
        name: profiles.name,
        avatarUrl: profiles.avatar_url,
      })
      .from(profiles)
      .where(inArray(profiles.id, data.userIds));

    return rows;
  });
