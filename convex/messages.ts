import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

// Build a stable thread ID from two user IDs (sorted so A↔B === B↔A)
function makeThreadId(a: string, b: string): string {
  return [a, b].sort().join("_");
}

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

// Get all messages in a thread between me and another user
export const getThread = query({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const threadId = makeThreadId(me._id, args.otherUserId);

    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .order("asc")
      .collect();

    return msgs;
  },
});

// Mark all messages in a thread as read (called client-side after loading thread)
export const markThreadRead = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const threadId = makeThreadId(me._id, args.otherUserId);

    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .collect();

    const unread = msgs.filter((m) => m.recipientId === me._id && !m.isRead);
    for (const m of unread) {
      await ctx.db.patch(m._id, { isRead: true });
    }
  },
});

// List all conversations (threads) for the current user
export const listInbox = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);

    // Get all messages where I'm sender or recipient
    const allSent = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("senderId"), me._id))
      .collect();

    const allReceived = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("recipientId"), me._id))
      .collect();

    const allMessages = [...allSent, ...allReceived];

    // Group by threadId, keep latest message per thread
    const threadMap = new Map<string, typeof allMessages[0]>();
    for (const msg of allMessages) {
      const existing = threadMap.get(msg.threadId);
      if (!existing || msg.createdAt > existing.createdAt) {
        threadMap.set(msg.threadId, msg);
      }
    }

    // Enrich with other user's profile
    const threads = [];
    for (const [, msg] of threadMap) {
      const otherId = msg.senderId === me._id ? msg.recipientId : msg.senderId;
      const other = await ctx.db.get(otherId);
      if (!other) continue;

      // Count unread from this thread
      const unreadCount = allMessages.filter(
        (m) => m.threadId === msg.threadId && m.recipientId === me._id && !m.isRead
      ).length;

      threads.push({
        threadId: msg.threadId,
        otherUser: {
          _id: other._id,
          fullName: other.fullName,
          school: other.school,
          schoolRole: other.schoolRole,
          phone: other.phone,
        },
        lastMessage: msg.body,
        lastAt: msg.createdAt,
        unreadCount,
        isMine: msg.senderId === me._id,
      });
    }

    // Sort newest first
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
    const users = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("_id"), me._id))
      .collect();

    return users
      .filter((u) => u.status === "active")
      .map((u) => ({
        _id: u._id,
        fullName: u.fullName,
        school: u.school,
        schoolRole: u.schoolRole,
        phone: u.phone,
        role: u.role,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  },
});
