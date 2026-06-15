"use server";

import { answerQuestion } from "@/lib/rag";

export async function askChatbot(question: string) {
  const q = (question ?? "").trim();
  if (!q) return { answer: "Bạn nhập câu hỏi nhé.", sources: [] };
  if (q.length > 500) return { answer: "Câu hỏi hơi dài, bạn rút gọn giúp mình nhé.", sources: [] };
  return answerQuestion(q);
}
