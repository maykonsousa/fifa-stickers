"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { postMessageAction } from "../lib/post-message-action";
import type { ProposalMessageRow } from "../lib/types";

interface Props {
  proposalId: string;
  currentUserId: string;
  otherName: string;
  messages: ProposalMessageRow[];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function ProposalChat({ proposalId, currentUserId, otherName, messages }: Props) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;
    startTransition(async () => {
      try {
        await postMessageAction(proposalId, trimmed);
        setText("");
      } catch (e) {
        console.error(e);
      }
    });
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
      <h3 className="text-sm font-medium text-white">Conversa</h3>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">
            Nenhuma mensagem ainda. Mande a primeira pra {otherName}.
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_user_id === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  isMine ? "bg-brand-grass/20 text-white" : "bg-white/10 text-white"
                }`}>
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{formatTime(msg.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Escreva uma mensagem..."
          rows={1}
          maxLength={2000}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none"
        />
        <button
          type="button"
          onClick={send}
          disabled={!text.trim() || isPending}
          className="flex items-center justify-center rounded-lg bg-brand-grass px-3 py-2 text-white hover:brightness-110 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          aria-label="Enviar"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      {text.length > 1800 && (
        <p className="text-xs text-amber-300">{text.length}/2000</p>
      )}
    </div>
  );
}
