"use server";

import { auth } from "@/auth";
import { answerQuestion } from "@/lib/rag";

export async function askChatbot(question: string) {
  const q = (question ?? "").trim();
  if (!q) return { answer: "Bạn nhập câu hỏi nhé.", sources: [] };
  if (q.length > 500) return { answer: "Câu hỏi hơi dài, bạn rút gọn giúp mình nhé.", sources: [] };
  // userId lấy từ session phía server (KHÔNG nhận từ client) → chỉ lộ dữ liệu của chính user.
  const session = await auth();
  return answerQuestion(q, { userId: session?.user?.id });
}
