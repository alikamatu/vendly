"use client";

import React from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  notificationApi,
  type NotificationItem,
} from "../../lib/api/notification";

const POLL_MS = 30_000;

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  const refreshCount = React.useCallback(async () => {
    try {
      const c = await notificationApi.unreadCount();
      setCount(c);
    } catch {
      // silent — user might be logged out
    }
  }, []);

  const refreshList = React.useCallback(async () => {
    setLoading(true);
    try {
      const page = await notificationApi.list({ take: 15 });
      setItems(page.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(id);
  }, [refreshCount]);

  React.useEffect(() => {
    if (open) refreshList();
  }, [open, refreshList]);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const handleMarkRead = async (n: NotificationItem) => {
    if (n.is_read) return;
    setItems((cur) =>
      cur.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)),
    );
    setCount((c) => Math.max(0, c - 1));
    try {
      await notificationApi.markRead(n.id);
    } catch {
      refreshCount();
      refreshList();
    }
  };

  const handleMarkAll = async () => {
    setItems((cur) => cur.map((x) => ({ ...x, is_read: true })));
    setCount(0);
    try {
      await notificationApi.markAllRead();
    } catch {
      refreshCount();
      refreshList();
    }
  };

  const handleDelete = async (n: NotificationItem) => {
    setItems((cur) => cur.filter((x) => x.id !== n.id));
    if (!n.is_read) setCount((c) => Math.max(0, c - 1));
    try {
      await notificationApi.remove(n.id);
    } catch {
      refreshList();
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2.5 rounded-xl hover:bg-surface border border-transparent hover:border-border/50 transition-all active:scale-90 group"
      >
        <motion.div
          animate={count > 0 ? { rotate: [0, -15, 15, -15, 15, 0] } : {}}
          transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 5 }}
        >
          <Bell
            size={18}
            className="text-muted group-hover:text-foreground transition-colors"
          />
        </motion.div>
        <AnimatePresence>
          {count > 0 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-background text-[10px] font-semibold flex items-center justify-center px-1 shadow-md"
            >
              {count > 99 ? "99+" : count}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[360px] max-w-[92vw] rounded-2xl border border-border/60 bg-background text-foreground shadow-2xl z-[100] overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <div>
                <div className="text-sm font-semibold">Notifications</div>
                {count > 0 && (
                  <div className="text-[11px] text-muted">{count} unread</div>
                )}
              </div>
              {items.some((n) => !n.is_read) && (
                <button
                  onClick={handleMarkAll}
                  className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {loading && items.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted">
                  Loading…
                </div>
              ) : items.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted">
                  You&apos;re all caught up.
                </div>
              ) : (
                <motion.div 
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: { staggerChildren: 0.05 }
                    }
                  }}
                >
                {items.map((n) => {
                  const body = (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium leading-snug">
                          {n.title}
                        </div>
                        {!n.is_read && (
                          <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-muted mt-1 leading-snug">
                        {n.body}
                      </div>
                      <div className="text-[10px] text-muted mt-2 uppercase tracking-wider font-medium">
                        {formatRelative(n.created_at)}
                      </div>
                    </>
                  );
                  return (
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: 10 },
                        show: { opacity: 1, x: 0 }
                      }}
                      key={n.id}
                      className={`group px-4 py-3 border-b border-border/30 last:border-0 hover:bg-surface/60 transition-all ${
                        n.is_read ? "" : "bg-primary/5"
                      }`}
                    >
                      <div className="flex gap-2 items-start">
                        <div className="flex-1 min-w-0">
                          {n.link ? (
                            <Link
                              href={n.link}
                              onClick={() => {
                                handleMarkRead(n);
                                setOpen(false);
                              }}
                              className="block"
                            >
                              {body}
                            </Link>
                          ) : (
                            <button
                              onClick={() => handleMarkRead(n)}
                              className="block text-left w-full"
                            >
                              {body}
                            </button>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                          {!n.is_read && (
                            <button
                              aria-label="Mark read"
                              onClick={() => handleMarkRead(n)}
                              className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-foreground"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            aria-label="Delete"
                            onClick={() => handleDelete(n)}
                            className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
