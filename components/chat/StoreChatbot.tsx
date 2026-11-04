"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

const suggestions = [
  "Tư vấn sản phẩm phù hợp",
  "Phí giao hàng thế nào?",
  "Chính sách đổi trả",
  "Tra cứu đơn hàng",
];

export function StoreChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: "assistant",
      content:
        "Xin chào! Mình là trợ lý Nova. Mình có thể tư vấn sản phẩm, voucher, giao hàng, đổi trả hoặc giúp bạn tra cứu đơn hàng.",
    },
  ]);

  const sendMessage = async (value: string) => {
    const content = value.trim();
    if (!content || loading || content.length > 1000) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content,
    };
    const previousMessages = messages
      .filter((message) => message.id !== 0)
      .slice(-7)
      .map(({ role, content: messageContent }) => ({
        role,
        content: messageContent,
      }));
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: [...previousMessages, { role: "user", content }],
        }),
      });
      const result: { reply?: string } = await response.json();
      if (typeof result.reply !== "string") {
        throw new Error(result.reply || "Chatbot hiện chưa thể trả lời.");
      }
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: "assistant", content: result.reply! },
      ]);
    } catch (error) {
      console.error("Không thể gửi tin nhắn đến trợ lý Nova.", error);
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content:
            error instanceof Error && error.message !== "Failed to fetch"
              ? error.message
              : "Mình chưa kết nối được lúc này. Bạn vui lòng thử lại hoặc liên hệ Nova qua trang Liên hệ nhé.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[70] sm:bottom-6 sm:right-6">
      {open && (
        <section
          aria-label="Chat với trợ lý Nova"
          className="mb-3 flex h-[min(640px,calc(100dvh-110px))] w-[min(400px,calc(100vw-40px))] flex-col overflow-hidden rounded-[26px] border border-line bg-white shadow-[0_24px_80px_rgba(17,24,39,.24)]"
        >
          <header className="flex items-center justify-between bg-navy px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-lime text-navy">
                <Icon name="chat" className="size-5" />
              </span>
              <div>
                <h2 className="text-sm font-extrabold">Trợ lý Nova</h2>
                <p className="mt-0.5 text-[11px] text-white/65">
                  Tư vấn mua sắm · Hỗ trợ đơn hàng
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-9 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"
              aria-label="Đóng chatbot"
            >
              <Icon name="close" className="size-4" />
            </button>
          </header>

          <div
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto bg-[#fafbff] p-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                    message.role === "user"
                      ? "rounded-br-md bg-cobalt text-white"
                      : "rounded-bl-md border border-line bg-white text-navy shadow-sm"
                  }`}
                >
                  {message.content}
                </p>
              </div>
            ))}
            {loading && (
              <p
                role="status"
                className="w-fit rounded-2xl rounded-bl-md border border-line bg-white px-3.5 py-2.5 text-sm text-muted"
              >
                Nova đang soạn câu trả lời...
              </p>
            )}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void sendMessage(suggestion)}
                    className="rounded-full border border-cobalt/20 bg-white px-3 py-1.5 text-xs font-semibold text-cobalt transition hover:bg-cobalt/[.06]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={submit} className="border-t border-line bg-white p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-line bg-[#fafbff] p-2 focus-within:border-cobalt">
              <label htmlFor="nova-chat-input" className="sr-only">
                Tin nhắn cho trợ lý Nova
              </label>
              <textarea
                id="nova-chat-input"
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, 1000))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage(input);
                  }
                }}
                maxLength={1000}
                rows={1}
                placeholder="Nhập câu hỏi..."
                className="max-h-28 min-h-10 flex-1 resize-y bg-transparent px-2 py-2 text-sm text-navy outline-none placeholder:text-muted"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-cobalt text-white transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Gửi tin nhắn"
              >
                <Icon name="arrow" className="size-4 -rotate-45" />
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted">
              Khi AI bật, tin nhắn được xử lý qua OpenAI. Không gửi mật khẩu,
              OTP hoặc thông tin thanh toán.
            </p>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? "Đóng trợ lý Nova" : "Mở trợ lý Nova"}
        className="ml-auto flex h-14 items-center gap-2.5 rounded-full bg-cobalt px-4 text-sm font-bold text-white shadow-[0_12px_34px_rgba(49,92,255,.35)] transition hover:-translate-y-0.5 hover:bg-navy"
      >
        <Icon name={open ? "close" : "chat"} className="size-5" />
        <span>{open ? "Đóng chat" : "Chat với Nova"}</span>
      </button>
    </div>
  );
}
