"use client";

import React from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
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

  // Track whether we're at a "mobile" viewport. The mobile layout is a
  // full-screen sheet with a backdrop; the desktop layout is the original
  // anchored popover. We watch the breakpoint at runtime so toggling
  // landscape / split-view stays responsive without a reload.
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  // Click-outside only applies on desktop. The mobile sheet uses an
  // explicit backdrop element with its own onClick.
  React.useEffect(() => {
    if (!open || isMobile) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, isMobile]);

  // Lock body scroll while the mobile sheet is open so scrolling the
  // notification list doesn't bleed through to the page underneath.
  // Restore the previous overflow value on close to play nice with any
  // other component that might set it.
  React.useEffect(() => {
    if (!open || !isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobile]);

  // Close on Escape — useful on desktop too, but especially on mobile
  // where the sheet may otherwise feel sticky.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
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
          <>
            {/* Mobile backdrop. Tap anywhere outside the sheet to close.
                Plain div so onClick types cleanly; the fade-in is purely
                cosmetic and CSS-driven via the animate-fade class. */}
            {isMobile && (
              <div
                onClick={() => setOpen(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99] sm:hidden animate-in fade-in duration-150"
              />
            )}

            {/* Framer types choke on role/aria-modal on motion.div in v11+;
                cast the props bag once so we don't have to fight types
                across the whole tree. */}
            <motion.div
              {...({
                role: "dialog",
                "aria-label": "Notifications",
                "aria-modal": isMobile,
              } as any)}
              // Animation differs by viewport — mobile slides up from the
              // bottom (sheet pattern), desktop fades down from the bell.
              initial={
                isMobile
                  ? { opacity: 0, y: "100%" }
                  : { opacity: 0, y: -8, scale: 0.98 }
              }
              animate={
                isMobile
                  ? { opacity: 1, y: 0 }
                  : { opacity: 1, y: 0, scale: 1 }
              }
              exit={
                isMobile
                  ? { opacity: 0, y: "100%" }
                  : { opacity: 0, y: -8, scale: 0.98 }
              }
              transition={{
                type: isMobile ? "spring" : "tween",
                damping: 28,
                stiffness: 280,
                duration: 0.18,
              }}
              className={
                isMobile
                  ? // Mobile: full-width bottom sheet, ~85vh, rounded top.
                    // `inset-x-0 bottom-0` pins it to the bottom of the
                    // viewport. flex column so the body scrolls inside
                    // while header + footer stay fixed.
                    "fixed inset-x-0 bottom-0 z-[100] flex max-h-[88vh] flex-col rounded-t-3xl border-t border-border/60 bg-background text-foreground shadow-2xl"
                  : // Desktop: original anchored popover.
                    "absolute right-0 mt-2 w-[360px] max-w-[92vw] rounded-2xl border border-border/60 bg-background text-foreground shadow-2xl z-[100] overflow-hidden"
              }
            >
              {/* Grab handle — purely visual cue that the sheet is
                  draggable. Tapping it also closes, as a fallback for
                  users who don't realise the backdrop is tappable. */}
              {isMobile && (
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="mx-auto mt-3 mb-1 h-1.5 w-12 rounded-full bg-foreground/15 hover:bg-foreground/25 transition-colors"
                />
              )}

              {/* Header */}
              <div className={`flex items-center justify-between border-b border-border/60 ${isMobile ? "px-5 py-4" : "px-4 py-3"}`}>
                <div>
                  <div className={isMobile ? "text-base font-semibold" : "text-sm font-semibold"}>
                    Notifications
                  </div>
                  {count > 0 && (
                    <div className="text-[11px] text-muted">{count} unread</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {items.some((n) => !n.is_read) && (
                    <button
                      onClick={handleMarkAll}
                      className={`font-medium text-primary hover:underline flex items-center gap-1 ${
                        isMobile ? "text-xs px-2 py-1.5" : "text-[11px]"
                      }`}
                    >
                      <CheckCheck size={isMobile ? 14 : 12} /> Mark all read
                    </button>
                  )}
                  {isMobile && (
                    <button
                      type="button"
                      aria-label="Close notifications"
                      onClick={() => setOpen(false)}
                      className="rounded-full p-2 hover:bg-surface text-muted hover:text-foreground"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Body — list. On mobile this flex-grows; on desktop it
                  caps at a fixed pixel height so the popover stays
                  predictable. */}
              <div
                className={
                  isMobile
                    ? "flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]"
                    : "max-h-[400px] overflow-y-auto"
                }
              >
                {loading && items.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted">
                    Loading…
                  </div>
                ) : items.length === 0 ? (
                  <div className="px-4 py-14 text-center text-sm text-muted">
                    You&apos;re all caught up.
                  </div>
                ) : (
                  <motion.div
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: { opacity: 0 },
                      show: { opacity: 1, transition: { staggerChildren: 0.04 } },
                    }}
                  >
                    {items.map((n) => {
                      const body = (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div className={`${isMobile ? "text-[15px]" : "text-sm"} font-medium leading-snug`}>
                              {n.title}
                            </div>
                            {!n.is_read && (
                              <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          <div className={`${isMobile ? "text-sm" : "text-xs"} text-muted mt-1 leading-snug`}>
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
                            show: { opacity: 1, x: 0 },
                          }}
                          key={n.id}
                          // Touch devices don't have hover, so on mobile we
                          // keep action buttons always visible; on desktop
                          // we keep the original hover-reveal behaviour.
                          className={`group ${isMobile ? "px-5 py-4" : "px-4 py-3"} border-b border-border/30 last:border-0 hover:bg-surface/60 transition-all ${
                            n.is_read ? "" : "bg-primary/5"
                          }`}
                        >
                          <div className="flex gap-3 items-start">
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
                            <div
                              className={`flex flex-col gap-1 transition ${
                                isMobile
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100"
                              }`}
                            >
                              {!n.is_read && (
                                <button
                                  aria-label="Mark read"
                                  onClick={() => handleMarkRead(n)}
                                  className={`rounded-lg hover:bg-surface text-muted hover:text-foreground ${
                                    isMobile ? "p-2.5" : "p-1.5"
                                  }`}
                                >
                                  <Check size={isMobile ? 16 : 14} />
                                </button>
                              )}
                              <button
                                aria-label="Delete"
                                onClick={() => handleDelete(n)}
                                className={`rounded-lg hover:bg-surface text-muted hover:text-red-500 ${
                                  isMobile ? "p-2.5" : "p-1.5"
                                }`}
                              >
                                <Trash2 size={isMobile ? 16 : 14} />
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
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
