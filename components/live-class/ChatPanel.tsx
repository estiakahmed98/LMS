"use client";

import { useState } from "react";
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

const QUICK_EMOJI = ["👍", "👏", "❤️", "😂", "🎉"];

export default function ChatPanel({
  messages,
  participantNames,
  onSend,
}: {
  messages: ChatEntry[];
  participantNames: string[];
  onSend: (message: string, toName?: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [recipient, setRecipient] = useState<string>("Everyone");

  function handleSend() {
    if (!draft.trim()) return;
    onSend(draft.trim(), recipient === "Everyone" ? undefined : recipient);
    setDraft("");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-3">
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
                    {entry.toName ? `→ ${entry.toName} (private)` : "(private)"}
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
            No messages yet.
          </p>
        )}
      </div>

      <div className="border-t border-border p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {QUICK_EMOJI.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSend(emoji, recipient === "Everyone" ? undefined : recipient)}
              className="text-lg hover:scale-110 transition-transform"
              aria-label={`Send ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="text-xs rounded-md border border-border bg-background px-2 py-1.5"
          >
            <option value="Everyone">Everyone</option>
            {participantNames.map((name) => (
              <option key={name} value={name}>
                {name} (private)
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            onClick={handleSend}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
