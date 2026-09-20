"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format";
import {
  MessageSquare,
  Send,
  Search,
  Phone,
  User,
  ChevronLeft,
  Plus,
} from "lucide-react";

export default function MessagesPage() {
  const inbox = useQuery(api.messages.listInbox);
  const allUsers = useQuery(api.messages.listUsers);
  const sendMessage = useMutation(api.messages.send);
  const markRead = useMutation(api.messages.markThreadRead);
  const profile = useQuery(api.users.getMyProfile);

  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [composing, setComposing] = useState(false);
  const [draftBody, setDraftBody] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [userSearchQ, setUserSearchQ] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const thread = useQuery(
    api.messages.getThread,
    selectedUserId ? { otherUserId: selectedUserId } : "skip"
  );

  const selectedUser = allUsers?.find((u) => u._id === selectedUserId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  useEffect(() => {
    if (selectedUserId) {
      markRead({ otherUserId: selectedUserId });
    }
  }, [selectedUserId, thread?.length]);

  const filteredInbox = inbox?.filter((t) =>
    t.otherUser.fullName.toLowerCase().includes(searchQ.toLowerCase()) ||
    t.otherUser.school.toLowerCase().includes(searchQ.toLowerCase())
  );

  const filteredUsers = allUsers?.filter((u) =>
    u.fullName.toLowerCase().includes(userSearchQ.toLowerCase()) ||
    u.school.toLowerCase().includes(userSearchQ.toLowerCase())
  );

  async function handleSend() {
    if (!selectedUserId || !draftBody.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage({ recipientId: selectedUserId, body: draftBody.trim() });
      setDraftBody("");
    } finally {
      setSending(false);
    }
  }

  function openThread(userId: Id<"users">) {
    setSelectedUserId(userId);
    setComposing(false);
    setUserSearchQ("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Portal"
        title="Messages"
        lead="Communicate with your colleagues and branch admin within the system."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Messages" },
        ]}
        action={
          <Button
            onClick={() => { setComposing(true); setSelectedUserId(null); }}
            variant="primary"
            className="flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Message
          </Button>
        }
      />

      <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* LEFT PANEL — Inbox */}
        <div className={`w-full md:w-[300px] lg:w-[320px] flex flex-col gap-2 shrink-0 ${selectedUserId || composing ? "hidden md:flex" : "flex"}`}>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-muted)]" />
            <input
              type="text"
              placeholder="Search conversations…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="w-full pl-9 pr-3 h-[38px] text-[13px] rounded-[var(--r-md)] border border-[var(--line-strong)] bg-[var(--surface)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--union)]"
            />
          </div>

          {/* Thread list */}
          <Card className="flex-1 overflow-y-auto">
            <CardContent className="p-0">
              {!inbox ? (
                <div className="p-6 text-center text-[var(--ink-muted)] text-sm">Loading…</div>
              ) : filteredInbox?.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageSquare className="h-10 w-10 text-[var(--ink-muted)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--ink-muted)]">No conversations yet</p>
                  <p className="text-xs text-[var(--ink-muted)] mt-1">Click <strong>New Message</strong> to start one</p>
                </div>
              ) : (
                filteredInbox?.map((t) => (
                  <button
                    key={t.threadId}
                    onClick={() => openThread(t.otherUser._id)}
                    className={`w-full text-left px-4 py-3 border-b border-[var(--line)] hover:bg-[var(--canvas)] transition-colors ${selectedUserId === t.otherUser._id ? "bg-[var(--union-soft)]" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm font-medium truncate ${t.unreadCount > 0 ? "text-[var(--ink)] font-semibold" : "text-[var(--ink-body)]"}`}>
                        {t.otherUser.fullName}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {t.unreadCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-[var(--union)] text-white text-[10px] font-bold flex items-center justify-center">
                            {t.unreadCount}
                          </span>
                        )}
                        <span className="text-[11px] text-[var(--ink-muted)]">
                          {formatRelativeTime(new Date(t.lastAt))}
                        </span>
                      </div>
                    </div>
                    <p className="text-[12px] text-[var(--ink-muted)] truncate">
                      {t.isMine ? "You: " : ""}{t.lastMessage}
                    </p>
                    <p className="text-[11px] text-[var(--ink-muted)] mt-0.5 truncate">{t.otherUser.school}</p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL — Thread or Compose */}
        <div className={`flex-1 flex flex-col min-w-0 ${!selectedUserId && !composing ? "hidden md:flex" : "flex"}`}>
          {/* NEW MESSAGE — user picker */}
          {composing && !selectedUserId && (
            <Card className="flex-1 flex flex-col">
              <div className="p-4 border-b border-[var(--line)] flex items-center gap-3">
                <button onClick={() => setComposing(false)} className="md:hidden p-1 text-[var(--ink-muted)] hover:text-[var(--ink)]">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="font-semibold text-[var(--ink)]">New Message — Select recipient</span>
              </div>
              <div className="p-3 border-b border-[var(--line)]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-muted)]" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search by name or school…"
                    value={userSearchQ}
                    onChange={(e) => setUserSearchQ(e.target.value)}
                    className="w-full pl-9 pr-3 h-[38px] text-[13px] rounded-[var(--r-md)] border border-[var(--line-strong)] bg-[var(--surface)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--union)]"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredUsers?.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => openThread(u._id)}
                    className="w-full text-left px-4 py-3 border-b border-[var(--line)] hover:bg-[var(--canvas)] transition-colors flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-full bg-[var(--union-soft)] text-[var(--union)] font-semibold text-sm flex items-center justify-center shrink-0">
                      {u.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--ink)] truncate">{u.fullName}</p>
                      <p className="text-[12px] text-[var(--ink-muted)] truncate">{u.schoolRole || u.role} · {u.school}</p>
                      <p className="text-[11px] text-[var(--ink-muted)] flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />{u.phone}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* THREAD VIEW */}
          {selectedUserId && selectedUser && (
            <Card className="flex-1 flex flex-col min-h-0">
              {/* Thread header */}
              <div className="px-4 py-3 border-b border-[var(--line)] flex items-center gap-3 shrink-0">
                <button onClick={() => setSelectedUserId(null)} className="md:hidden p-1 text-[var(--ink-muted)] hover:text-[var(--ink)]">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="w-9 h-9 rounded-full bg-[var(--union-soft)] text-[var(--union)] font-semibold text-sm flex items-center justify-center shrink-0">
                  {selectedUser.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--ink)] truncate">{selectedUser.fullName}</p>
                  <p className="text-[12px] text-[var(--ink-muted)] truncate">{selectedUser.schoolRole || selectedUser.role} · {selectedUser.school}</p>
                </div>
                <a href={`tel:${selectedUser.phone}`} className="p-2 rounded-[var(--r-md)] text-[var(--union)] hover:bg-[var(--union-soft)] transition-colors" title={`Call ${selectedUser.phone}`}>
                  <Phone className="h-4 w-4" />
                </a>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {!thread ? (
                  <div className="text-center text-sm text-[var(--ink-muted)] pt-8">Loading…</div>
                ) : thread.length === 0 ? (
                  <div className="text-center pt-12">
                    <MessageSquare className="h-10 w-10 text-[var(--ink-muted)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--ink-muted)]">No messages yet — say hello!</p>
                  </div>
                ) : (
                  thread.map((msg) => {
                    const isMe = msg.senderId === profile?._id;
                    return (
                      <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        {!isMe && (
                          <div className="w-7 h-7 rounded-full bg-[var(--canvas)] border border-[var(--line)] flex items-center justify-center mr-2 shrink-0 self-end">
                            <User className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                          </div>
                        )}
                        <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? "bg-[var(--navy)] text-white rounded-br-sm"
                            : "bg-[var(--canvas)] border border-[var(--line)] text-[var(--ink)] rounded-bl-sm"
                        }`}>
                          {msg.body}
                          <div className={`text-[10px] mt-1 ${isMe ? "text-white/60" : "text-[var(--ink-muted)]"}`}>
                            {formatRelativeTime(new Date(msg.createdAt))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-[var(--line)] flex gap-2 shrink-0">
                <textarea
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                  rows={2}
                  className="flex-1 resize-none px-3 py-2 text-[13px] rounded-[var(--r-md)] border border-[var(--line-strong)] bg-[var(--surface)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--union)]"
                />
                <Button
                  onClick={handleSend}
                  disabled={!draftBody.trim() || sending}
                  variant="primary"
                  className="self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* Empty state */}
          {!selectedUserId && !composing && (
            <Card className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-14 w-14 text-[var(--ink-muted)] mx-auto mb-3" />
                <p className="font-semibold text-[var(--ink)]">Select a conversation</p>
                <p className="text-sm text-[var(--ink-muted)] mt-1">or start a new one with <strong>New Message</strong></p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
