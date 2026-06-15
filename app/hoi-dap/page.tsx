"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { askChatbot } from "./actions";

type Source = { title: string; slug: string };
type Msg = { role: "user" | "bot"; text: string; sources?: Source[] };

const GREETING: Msg = {
  role: "bot",
  text:
    "Chào bạn! 👋 Mình có thể giúp bạn:\n\n- 📅 **Lịch & kết quả** trận đấu (giờ VN)\n- 📰 **Nhận định / soi kèo** từ các bài đã đăng\n- 👤 **Lịch sử Pickems & số dư** của riêng bạn\n\nHỏi mình nhé — mình chỉ trả lời dựa trên dữ liệu thật trong app, không suy đoán lung tung. 😄",
};

export default function ChatPage() {
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();

  function send() {
    const q = input.trim();
    if (!q || pending) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    start(async () => {
      const res = await askChatbot(q);
      setMsgs((m) => [...m, { role: "bot", text: res.answer, sources: res.sources }]);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-lg font-semibold">Hỏi đáp AI</h1>

      <div className="space-y-3 pb-4">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                : "mr-auto max-w-[90%] rounded-2xl border bg-card px-3 py-2 text-sm"
            }
          >
            {m.role === "bot" ? (
              <Markdown>{m.text}</Markdown>
            ) : (
              <p className="whitespace-pre-wrap">{m.text}</p>
            )}
            {m.sources && m.sources.length > 0 && (
              <div className="mt-2 space-y-1 border-t pt-2 text-xs">
                <p className="text-muted-foreground">Nguồn:</p>
                {m.sources.map((s) => (
                  <Link key={s.slug} href={`/tin/${s.slug}`} className="block underline">
                    • {s.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
        {pending && (
          <div className="mr-auto rounded-2xl border bg-card px-3 py-2 text-sm text-muted-foreground">
            Đang trả lời…
          </div>
        )}
      </div>

      <div className="sticky bottom-20 flex gap-2 bg-background/95 py-2 backdrop-blur">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Hỏi gì đó…"
          className="h-11 flex-1 rounded-full border bg-transparent px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <Button onClick={send} disabled={pending} className="h-11 rounded-full px-5">
          Gửi
        </Button>
      </div>
    </div>
  );
}
