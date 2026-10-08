import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";
import { Doc, Id } from "./_generated/dataModel";

// Build a stable thread ID from two user IDs (sorted so A↔B === B↔A)
function makeThreadId(a: string, b: string): string {
  return [a, b].sort().join("_");
}

const MAX_BODY = 2000;
const THREAD_PAGE = 300;
const INBOX_SCAN = 300;

// Send a message from current user to recipientId
export const send = mutation({
  args: {
    recipientId: v.id("users"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    if (me._id === args.recipientId) throw new Error("Cannot message yourself");
    const body = args.body.trim();
    if (!body) throw new Error("Message cannot be empty");
    if (body.length > MAX_BODY) throw new Error(`Message is too long (max ${MAX_BODY} characters)`);

    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient || recipient.status !== "active") {
      throw new Error("That person can't receive messages right now");
    }
    const threadId = makeThreadId(me._id, args.recipientId);

    const now = Date.now();
    await ctx.db.insert("messages", {
      threadId,
      senderId: me._id,
      recipientId: args.recipientId,
      body,
      isRead: false,
      createdAt: now,
    });

    await ctx.db.insert("notifications", {
      userId: recipient._id,
      type: "message",
      title: `New message from ${me.fullName}`,
      body: body.length > 140 ? `${body.slice(0, 140)}…` : body,
      link: "/messages",
      isRead: false,
      createdAt: now,
    });

    // A member writing to a branch official carbon-copies every admin: the
    // admin receives the same message in their own inbox (and can reply to the
    // member), plus an alert, so nothing is raised with an official unseen.
    if (me.role === "member" && recipient.role === "official") {
      const admins = [
        ...(await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).collect()),
        ...(await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "superadmin")).collect()),
      ].filter((a) => a.status === "active" && a._id !== me._id);

      const preview = body.length > 140 ? `${body.slice(0, 140)}…` : body;
      for (const admin of admins) {
        await ctx.db.insert("messages", {
          threadId: makeThreadId(me._id, admin._id),
          senderId: me._id,
          recipientId: admin._id,
          body: `[CC — sent to ${recipient.fullName}]\n${body}`,
          isRead: false,
          createdAt: now,
        });
        await ctx.db.insert("notifications", {
          userId: admin._id,
          type: "member_issue",
          title: `${me.fullName} wrote to ${recipient.fullName}`,
          body: preview,
          link: "/admin/messages",
          isRead: false,
          createdAt: now,
        });
      }
    }
  },
});

// Get the most recent messages in a thread between me and another user
export const getThread = query({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const threadId = makeThreadId(me._id, args.otherUserId);

    const latest = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .order("desc")
      .take(THREAD_PAGE);

    return latest.reverse();
  },
});

// Mark all messages in a thread as read (called client-side after loading thread)
export const markThreadRead = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const threadId = makeThreadId(me._id, args.otherUserId);

    const unread = await ctx.db
      .query("messages")
      .withIndex("by_recipient_unread", (q) =>
        q.eq("recipientId", me._id).eq("isRead", false)
      )
      .take(500);

    for (const m of unread.filter((m) => m.threadId === threadId)) {
      await ctx.db.patch(m._id, { isRead: true });
    }
  },
});

// List conversations (threads) for the current user, newest first. Reads only
// the most recent messages via indexes — never the whole table.
export const listInbox = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);

    const sent = await ctx.db
      .query("messages")
      .withIndex("by_sender", (q) => q.eq("senderId", me._id))
      .order("desc")
      .take(INBOX_SCAN);
    const received = await ctx.db
      .query("messages")
      .withIndex("by_recipient", (q) => q.eq("recipientId", me._id))
      .order("desc")
      .take(INBOX_SCAN);
    const unreadRows = await ctx.db
      .query("messages")
      .withIndex("by_recipient_unread", (q) =>
        q.eq("recipientId", me._id).eq("isRead", false)
      )
      .take(500);

    const unreadByThread = new Map<string, number>();
    for (const m of unreadRows) {
      unreadByThread.set(m.threadId, (unreadByThread.get(m.threadId) ?? 0) + 1);
    }

    // Group by threadId, keep latest message per thread
    const threadMap = new Map<string, (typeof sent)[0]>();
    for (const msg of [...sent, ...received]) {
      const existing = threadMap.get(msg.threadId);
      if (!existing || msg.createdAt > existing.createdAt) {
        threadMap.set(msg.threadId, msg);
      }
    }

    const meIsStaff = ["official", "admin", "superadmin"].includes(me.role);
    const threads = [];
    for (const [, msg] of threadMap) {
      const otherId = msg.senderId === me._id ? msg.recipientId : msg.senderId;
      const other = await ctx.db.get(otherId);
      if (!other) continue;

      threads.push({
        threadId: msg.threadId,
        otherUser: {
          _id: other._id,
          fullName: other.fullName,
          school: other.school,
          schoolRole: other.schoolRole,
          phone: meIsStaff ? other.phone : "",
        },
        lastMessage: msg.body,
        lastAt: msg.createdAt,
        unreadCount: unreadByThread.get(msg.threadId) ?? 0,
        isMine: msg.senderId === me._id,
      });
    }

    return threads.sort((a, b) => b.lastAt - a.lastAt);
  },
});

// Get unread count for the current user (for nav badge)
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const unread = await ctx.db
      .query("messages")
      .withIndex("by_recipient_unread", (q) =>
        q.eq("recipientId", me._id).eq("isRead", false)
      )
      .take(1000);
    return unread.length;
  },
});

type Recipient = {
  _id: Id<"users">;
  fullName: string;
  school: string;
  schoolRole?: string;
  phone: string;
  role: string;
};

const STAFF_ROLES = ["official", "admin", "superadmin"] as const;
const COLLEAGUE_RESULTS = 25;

function toRecipient(u: Doc<"users">, showPhone: boolean): Recipient {
  return {
    _id: u._id,
    fullName: u.fullName,
    school: u.school,
    schoolRole: u.schoolRole,
    // Phone numbers are only shown to staff, so the picker isn't a directory
    // of teachers' contact details.
    phone: showPhone ? u.phone : "",
    role: u.role,
  };
}

/**
 * Recipient picker. Staff are a short list, shown in full. Colleagues are found
 * by typing a name (search index), so this never loads the whole membership.
 */
export const searchRecipients = query({
  args: { group: v.union(v.literal("staff"), v.literal("colleagues")), term: v.string() },
  handler: async (ctx, args): Promise<Recipient[]> => {
    const me = await requireUser(ctx);
    const showPhone = (STAFF_ROLES as readonly string[]).includes(me.role);

    if (args.group === "staff") {
      const lists = await Promise.all(
        STAFF_ROLES.map((role) =>
          ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", role)).take(100)
        )
      );
      const needle = args.term.trim().toLowerCase();
      return lists
        .flat()
        .filter((u) => u.status === "active" && u._id !== me._id)
        .filter((u) => !needle || u.fullName.toLowerCase().includes(needle))
        .map((u) => toRecipient(u, showPhone))
        .sort((a, b) => a.fullName.localeCompare(b.fullName));
    }

    const term = args.term.trim();
    if (term.length < 2) return [];
    const hits = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q) => q.search("fullName", term).eq("status", "active"))
      .take(COLLEAGUE_RESULTS + 5);
    return hits
      .filter((u) => u._id !== me._id && u.role === "member")
      .slice(0, COLLEAGUE_RESULTS)
      .map((u) => toRecipient(u, showPhone));
  },
});

/** One person, for an open conversation or a deep link (/messages?to=...). */
export const recipientById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args): Promise<Recipient | null> => {
    const me = await requireUser(ctx);
    const u = await ctx.db.get(args.id);
    if (!u || u.status !== "active" || u._id === me._id) return null;
    return toRecipient(u, (STAFF_ROLES as readonly string[]).includes(me.role));
  },
});
