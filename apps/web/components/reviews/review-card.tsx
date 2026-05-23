'use client';

import { useState } from 'react';
import { BadgeCheck, MoreHorizontal, Flag, Trash2, Pencil, MessageSquare } from 'lucide-react';
import { RatingStars } from './rating-stars';
import type { Review, ReviewFlagReason } from '@/lib/api/review';

export type ReviewCardActor = 'guest' | 'buyer' | 'seller';

function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }): string {
  const diffMs = Date.now() - date.getTime();
  const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffMonths / 12);

  let result = '';
  if (diffSecs < 60) {
    result = 'just now';
  } else if (diffMins < 60) {
    result = `${diffMins}m`;
  } else if (diffHours < 24) {
    result = `${diffHours}h`;
  } else if (diffDays < 30) {
    result = `${diffDays}d`;
  } else if (diffMonths < 12) {
    result = `${diffMonths}mo`;
  } else {
    result = `${diffYears}y`;
  }

  if (options?.addSuffix && result !== 'just now') {
    return `${result} ago`;
  }
  return result;
}

export function ReviewCard({
  review,
  actor,
  onEdit,
  onDelete,
  onReply,
  onRemoveReply,
  onFlag,
}: {
  review: Review;
  /** Tells the card which actions to show. */
  actor: ReviewCardActor;
  onEdit?: (r: Review) => void;
  onDelete?: (r: Review) => void;
  onReply?: (r: Review, reply: string) => Promise<void> | void;
  onRemoveReply?: (r: Review) => void;
  onFlag?: (r: Review, reason: ReviewFlagReason, notes?: string) => Promise<void> | void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState(review.seller_reply ?? '');
  const [replying, setReplying] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);

  const author = review.buyer?.full_name ?? 'Anonymous';
  const ago = formatDistanceToNow(new Date(review.created_at), { addSuffix: true });

  async function submitReply() {
    if (!onReply || !replyText.trim()) return;
    setReplying(true);
    try {
      await onReply(review, replyText.trim());
      setReplyOpen(false);
    } finally {
      setReplying(false);
    }
  }

  return (
    <article className="bg-foreground/[0.025] rounded-2xl p-4 sm:p-5">
      <header className="flex items-start gap-3">
        <div className="bg-foreground/10 text-foreground/70 grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12.5px] font-semibold">
          {author.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-foreground truncate text-[14px] font-medium">{author}</span>
            {review.verified_purchase && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400">
                <BadgeCheck size={11} strokeWidth={2.25} />
                Verified purchase
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <RatingStars value={review.rating} size={12} />
            <span className="text-foreground/60 text-[11.5px]">
              {ago}
              {review.edited_at ? ' · edited' : ''}
            </span>
          </div>
        </div>

        {actor !== 'guest' && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((s) => !s)}
              aria-haspopup="menu"
              aria-expanded={showMenu}
              className="text-foreground/50 hover:bg-foreground/5 hover:text-foreground/80 grid h-7 w-7 place-items-center rounded-md transition-colors"
              aria-label="Review actions"
            >
              <MoreHorizontal size={15} strokeWidth={2} />
            </button>
            {showMenu && (
              <>
                <button
                  type="button"
                  aria-hidden="true"
                  onClick={() => setShowMenu(false)}
                  className="fixed inset-0 z-30"
                />
                <div
                  role="menu"
                  className="bg-background ring-foreground/10 absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-lg p-1 shadow-[0_8px_24px_-12px_rgba(0,0,0,.45)] ring-1"
                >
                  {actor === 'buyer' && (
                    <>
                      <MenuButton
                        icon={<Pencil size={13} />}
                        onClick={() => {
                          setShowMenu(false);
                          onEdit?.(review);
                        }}
                      >
                        Edit
                      </MenuButton>
                      <MenuButton
                        icon={<Trash2 size={13} />}
                        onClick={() => {
                          setShowMenu(false);
                          onDelete?.(review);
                        }}
                        danger
                      >
                        Delete
                      </MenuButton>
                    </>
                  )}
                  {actor === 'seller' && (
                    <>
                      <MenuButton
                        icon={<MessageSquare size={13} />}
                        onClick={() => {
                          setShowMenu(false);
                          setReplyOpen(true);
                        }}
                      >
                        {review.seller_reply ? 'Edit reply' : 'Reply'}
                      </MenuButton>
                      {review.seller_reply && (
                        <MenuButton
                          icon={<Trash2 size={13} />}
                          onClick={() => {
                            setShowMenu(false);
                            onRemoveReply?.(review);
                          }}
                          danger
                        >
                          Remove reply
                        </MenuButton>
                      )}
                    </>
                  )}
                  {actor !== 'seller' && (
                    <MenuButton
                      icon={<Flag size={13} />}
                      onClick={() => {
                        setShowMenu(false);
                        setFlagOpen(true);
                      }}
                    >
                      Report
                    </MenuButton>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {(review.title || review.body) && (
        <div className="mt-3 space-y-1.5">
          {review.title && (
            <h4 className="text-foreground text-[14.5px] font-semibold">{review.title}</h4>
          )}
          {review.body && (
            <p className="text-foreground/80 whitespace-pre-wrap text-[13.5px] leading-relaxed">
              {review.body}
            </p>
          )}
        </div>
      )}

      {/* Seller reply */}
      {(review.seller_reply || replyOpen) && (
        <div className="bg-foreground/[0.05] ring-foreground/5 mt-4 rounded-xl p-3 pl-4 ring-1">
          <div className="text-foreground/60 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
            <MessageSquare size={11} strokeWidth={2.25} />
            Seller response
          </div>
          {replyOpen ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                maxLength={1500}
                placeholder="Reply on behalf of your store. Stay kind and concrete."
                className="bg-background text-foreground ring-foreground/10 block w-full resize-y rounded-lg p-2.5 text-[13px] leading-relaxed outline-none ring-1 focus:ring-2 focus:ring-amber-300/60"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReplyOpen(false);
                    setReplyText(review.seller_reply ?? '');
                  }}
                  className="text-foreground/70 hover:bg-foreground/5 hover:text-foreground inline-flex h-8 items-center rounded-md px-3 text-[12.5px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitReply}
                  disabled={!replyText.trim() || replying}
                  className="bg-foreground text-background inline-flex h-8 items-center rounded-md px-3 text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {replying ? 'Saving…' : 'Post reply'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-foreground/85 mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed">
                {review.seller_reply}
              </p>
              {review.seller_replied_at && (
                <div className="text-foreground/55 mt-1 text-[11px]">
                  {formatDistanceToNow(new Date(review.seller_replied_at), { addSuffix: true })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Flag panel */}
      {flagOpen && onFlag && (
        <FlagPanel
          onCancel={() => setFlagOpen(false)}
          onSubmit={async (reason, notes) => {
            await onFlag(review, reason, notes);
            setFlagOpen(false);
          }}
        />
      )}
    </article>
  );
}

function MenuButton({
  icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`hover:bg-foreground/5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] ${danger ? 'text-red-500 hover:bg-red-500/10' : 'text-foreground/80'}`}
    >
      {icon}
      {children}
    </button>
  );
}

function FlagPanel({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (reason: ReviewFlagReason, notes?: string) => Promise<void> | void;
}) {
  const [reason, setReason] = useState<ReviewFlagReason>('SPAM');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="bg-foreground/5 ring-foreground/10 mt-3 rounded-xl p-3 ring-1">
      <div className="text-foreground/60 text-[11px] font-semibold uppercase tracking-wider">
        Report this review
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(['SPAM', 'OFFENSIVE', 'IRRELEVANT', 'FAKE', 'OTHER'] as ReviewFlagReason[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            aria-pressed={reason === r}
            className={`h-7 rounded-full px-2.5 text-[11.5px] font-medium transition-colors ${
              reason === r
                ? 'bg-foreground text-background'
                : 'bg-foreground/10 text-foreground/70 hover:bg-foreground/20'
            }`}
          >
            {r[0] + r.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Optional context (max 500 chars)…"
        maxLength={500}
        className="bg-background ring-foreground/10 mt-2 block w-full resize-y rounded-lg p-2 text-[12.5px] outline-none ring-1 focus:ring-2 focus:ring-amber-300/60"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-foreground/70 hover:bg-foreground/5 hover:text-foreground inline-flex h-7 items-center rounded-md px-2.5 text-[12px]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onSubmit(reason, notes.trim() || undefined);
            } finally {
              setBusy(false);
            }
          }}
          className="inline-flex h-7 items-center rounded-md bg-red-500 px-2.5 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Submit report'}
        </button>
      </div>
    </div>
  );
}
