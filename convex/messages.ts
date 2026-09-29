import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

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
    // Members can only write to branch staff, matching the compose picker.
    const meIsStaff = ["official", "admin", "superadmin"].includes(me.role);
    if (!meIsStaff && recipient.role === "member") {
      throw new Error("You can only message branch officials");
    }

    const threadId = makeThreadId(me._id, args.recipientId);

    await ctx.db.insert("messages", {
      threadId,
      senderId: me._id,
      recipientId: args.recipientId,
      body,
      isRead: false,
      createdAt: Date.now(),
    });
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
      .collect();
    return unread.length;
  },
});

// Admin: list all users for composing a new message
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);

    // Members may only message branch staff, and never see anyone's phone
    // number; staff see everyone. This stops the compose picker doubling as a
    // directory of every teacher's contact details.
    const isStaff = ["official", "admin", "superadmin"].includes(me.role);

    // Staff accounts are few, so members' picker reads just those by role;
    // staff get the (bounded) active roster via the status index.
    const users = isStaff
      ? await ctx.db
          .query("users")
          .withIndex("by_status", (q) => q.eq("status", "active"))
          .take(3000)
      : (
          await Promise.all(
            (["official", "admin", "superadmin"] as const).map((role) =>
              ctx.db
                .query("users")
                .withIndex("by_role", (q) => q.eq("role", role))
                .take(200)
            )
          )
        ).flat();

    return users
      .filter((u) => u._id !== me._id && u.status === "active")
      .map((u) => ({
        _id: u._id,
        fullName: u.fullName,
        school: u.school,
        schoolRole: u.schoolRole,
        phone: isStaff ? u.phone : "",
        role: u.role,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  },
});
