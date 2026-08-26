"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { getInitials } from "@/lib/auth";

export interface ChatEntry {
  id: string;
  senderName: string;
  message: string;
  isPrivate: boolean;
  toName?: string;
  sentAt: Date;
  isSelf?: boolean;
}

export interface ChatParticipantOption {
  id: string;
  name: string;
}

const QUICK_EMOJI = ["👍", "👏", "❤️", "😂", "🎉"];
const EVERYONE_VALUE = "__everyone__";

export interface ChatSendResult {
  ok: boolean;
  /** Set when the server responded 429 — seconds until the cooldown clears. */
  retryAfterSeconds?: number;
}

export default function ChatPanel({
  messages,
  participants,
  onSend,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: {
  messages: ChatEntry[];
  participants: ChatParticipantOption[];
  onSend: (message: string, toUserId?: string) => Promise<ChatSendResult>;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void | Promise<void>;
}) {
  const t = useTranslations("liveClassroom.chat");
  const everyone = t("everyone");
  const [draft, setDraft] = useState("");
  const [recipientId, setRecipientId] = useState<string>(EVERYONE_VALUE);
  const [isSending, setIsSending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  const canSend = draft.trim().length > 0 && !isSending && cooldownSeconds <= 0;

  async function handleSend(overrideMessage?: string) {
    const text = (overrideMessage ?? draft).trim();
    if (!text || isSending || cooldownSeconds > 0) return;

    setIsSending(true);
    const toUserId = recipientId === EVERYONE_VALUE ? undefined : recipientId;
    try {
      const result = await onSend(text, toUserId);
      if (result.ok) {
        if (!overrideMessage) setDraft("");
      } else if (result.retryAfterSeconds) {
        setCooldownSeconds(result.retryAfterSeconds);
      }
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-3">
        {hasMore && (
          <button
            type="button"
            onClick={() => void onLoadMore?.()}
            disabled={loadingMore}
            className="mx-auto block text-xs text-primary hover:underline disabled:opacity-50"
          >
            {loadingMore ? t("loadingMore") : t("loadEarlier")}
          </button>
        )}
        {messages.map((entry) => (
          <div key={entry.id} className="flex items-start gap-2">
            <span className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
              {getInitials(entry.senderName)}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-card-foreground">
                {entry.senderName}
                {entry.isPrivate && (
                  <span className="ml-1.5 text-[10px] font-normal text-amber-600">
                    {entry.toName
                      ? t("privateTo", { name: entry.toName })
                      : t("privateTag")}
                  </span>
                )}
                <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                  {entry.sentAt.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
              <p className="text-sm text-card-foreground wrap-break-word">{entry.message}</p>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("noMessages")}
          </p>
        )}
      </div>

      <div className="border-t border-border p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {QUICK_EMOJI.map((emoji) => (
            <button
              key={emoji}
              onClick={() => void handleSend(emoji)}
              disabled={isSending || cooldownSeconds > 0}
              className="text-lg hover:scale-110 transition-transform disabled:opacity-40 disabled:hover:scale-100"
              aria-label={t("sendEmoji", { emoji })}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            className="text-xs rounded-md border border-border bg-background text-foreground px-2 py-1.5"
          >
            <option value={EVERYONE_VALUE}>{everyone}</option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name} {t("privateTag")}
              </option>
            ))}
          </select>
          {cooldownSeconds > 0 && (
            <span className="text-[11px] text-amber-600">
              {t("rateLimited", { seconds: cooldownSeconds })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSend()}
            placeholder={t("typePlaceholder")}
            disabled={isSending || cooldownSeconds > 0}
            className="flex-1 rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
          />
          <button
            onClick={() => void handleSend()}
            disabled={!canSend}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:hover:bg-primary"
            aria-label={t("send")}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
