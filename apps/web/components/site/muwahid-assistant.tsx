"use client";

import { Bot, Send, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { apiUrl } from "@/lib/config";

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

const starterMessages: ChatMessage[] = [
  {
    role: "assistant",
    text: "Assalamu'alaikum, saya MUWAHID. Tanyakan soal persiapan umroh, visa, hotel, transportasi, atau panduan ibadah.",
  },
];

export function MuwahidAssistant({
  mode = "floating",
  module = "general",
  promptKey = "general",
  context,
}: {
  mode?: "floating" | "embedded";
  module?: string;
  promptKey?: string;
  context?: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    const message = input.trim();
    if (!message || loading) return;

    setInput("");
    setMessages((current) => [...current, { role: "user", text: message }]);
    setLoading(true);

    try {
      const response = await fetch(mode === "embedded" ? apiUrl("/assistant/ask") : "/api/muwahid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "embedded"
            ? { message, module, prompt_key: promptKey, context }
            : { message }
        ),
      });
      const payload = (await response.json()) as { answer?: string };
      setMessages((current) => [
        ...current,
        { role: "assistant", text: payload.answer || "Maaf, saya belum bisa menjawab." },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: "Koneksi ke MUWAHID belum berhasil. Coba lagi sebentar." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (mode === "embedded") {
    return (
      <section className="rounded-[24px] border border-white/70 bg-[rgba(255,252,246,0.98)] p-5 shadow-[0_18px_42px_rgba(112,88,39,0.12)] sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(23,104,95,0.08)] text-[var(--primary)]">
            <Bot className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-[1.9rem] text-[var(--foreground)]">
              Tanya ke Asisten Virtual (MUWAHID)
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-strong)]">Respon MUWAHID akan muncul di sini.</p>
          </div>
        </div>

        <div className="mt-5 min-h-[130px] space-y-3 rounded-[22px] border border-[color:var(--line)] bg-white/82 px-4 py-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-[18px] px-4 py-3 text-sm leading-6 ${
                message.role === "user"
                  ? "ml-auto max-w-[86%] bg-[var(--primary)] text-white"
                  : "mr-auto max-w-[92%] bg-[rgba(23,104,95,0.08)] text-[var(--foreground)]"
              }`}
            >
              {message.text}
            </div>
          ))}
          {loading ? (
            <div className="mr-auto max-w-[92%] rounded-[18px] bg-[rgba(23,104,95,0.08)] px-4 py-3 text-sm text-[var(--muted)]">
              MUWAHID sedang menulis...
            </div>
          ) : null}
        </div>

        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Contoh: Tolong evaluasi hotel yang saya pilih, bagaimana lokasi, akses bus, sarapan, dan kekurangannya?"
            className="min-h-[112px] w-full rounded-[22px] border border-[color:var(--line)] bg-white/82 px-4 py-4 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="post-auth-action-button min-h-12 w-auto min-w-[120px] px-6"
            >
              <Send className="h-4 w-4" />
              <span>{loading ? "Mengirim..." : "Kirim"}</span>
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <section className="w-[calc(100vw-2rem)] max-w-[380px] overflow-hidden rounded-[24px] border border-white/70 bg-[rgba(255,252,246,0.98)] shadow-[0_24px_70px_rgba(43,32,13,0.24)] backdrop-blur">
          <header className="flex items-center justify-between bg-[linear-gradient(135deg,#0f4f49,#17685f_52%,#dfa03a)] px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/18">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black tracking-[0.14em]">MUWAHID</p>
                <p className="text-xs text-white/80">Asisten Gemini</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Tutup MUWAHID"
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/14 text-white hover:bg-white/22"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="max-h-[360px] space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-[18px] px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-8 bg-[var(--primary)] text-white"
                    : "mr-8 bg-[rgba(23,104,95,0.08)] text-[var(--foreground)]"
                }`}
              >
                {message.text}
              </div>
            ))}
            {loading ? (
              <div className="mr-8 rounded-[18px] bg-[rgba(23,104,95,0.08)] px-4 py-3 text-sm text-[var(--muted)]">
                MUWAHID sedang menulis...
              </div>
            ) : null}
          </div>

          <form
            className="flex gap-2 border-t border-[rgba(34,74,66,0.12)] p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Tanya MUWAHID..."
              className="min-w-0 flex-1 rounded-full border border-[rgba(34,74,66,0.18)] bg-white px-4 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
            />
            <button
              type="submit"
              aria-label="Kirim pertanyaan"
              disabled={loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-[0_10px_18px_rgba(23,104,95,0.22)] hover:bg-[var(--primary-strong)] disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="group flex items-center gap-3 rounded-full bg-[linear-gradient(135deg,#0f4f49,#17685f_50%,#dfa03a)] px-4 py-3 text-white shadow-[0_18px_36px_rgba(48,35,12,0.28)] transition hover:translate-y-[-1px]"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/16">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="pr-1 text-left">
          <span className="block text-sm font-black tracking-[0.14em]">MUWAHID</span>
          <span className="block text-xs text-white/78">Tanya asisten</span>
        </span>
      </button>
    </div>
  );
}
