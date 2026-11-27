import { useEffect, useRef, useState } from "react";
import { PaperPlaneRight, Robot } from "@phosphor-icons/react";
import { getToken } from "../auth/jwt";
import Alert from "../ui/Alert";
import Button from "../ui/Button";
import { Textarea } from "../ui/Field";
import useDocumentTitle from "../hooks/useDocumentTitle";

const SUGGESTIONS = ["Which products are in stock right now?", "Where is my latest order?", "Which of my orders can I still cancel?"];

const WELCOME = {
  id: "welcome",
  role: "assistant",
  text: "Hi, I can answer questions about the products in the store and about your own orders. What would you like to know?",
};

const AskAi = () => {
  useDocumentTitle("Ask AI");
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, waiting]);

  const send = async (text) => {
    const question = text.trim();
    if (!question || waiting) return;
    setError("");
    setInput("");
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: question }]);
    setWaiting(true);

    try {
      // fetch bypasses the axios interceptor, so the JWT is attached here
      const response = await fetch(`${baseUrl}/api/chat/ask?message=${encodeURIComponent(question)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `The assistant could not answer (status ${response.status}).`);
      }
      const answer = await response.text();
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", text: answer }]);
    } catch (err) {
      setError(err.message || "The assistant could not be reached. Please try again.");
    } finally {
      setWaiting(false);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(input);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="heading-3">Ask AI</h1>
        <p className="body-6 text-muted">Answers come from the product catalog and your own orders.</p>
      </header>

      <div className="flex h-128 flex-col rounded-2xl border border-line bg-surface p-2">
        <div
          className="flex flex-1 flex-col gap-4 overflow-y-auto p-4"
          role="log"
          aria-live="polite"
          aria-label="Conversation"
        >
          {messages.map((message) =>
            message.role === "assistant" ? (
              <div key={message.id} className="flex items-start gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-raised">
                  <Robot size={20} aria-hidden="true" />
                </span>
                <p className="body-3 max-w-md whitespace-pre-wrap rounded-xl bg-raised px-4 py-3">{message.text}</p>
              </div>
            ) : (
              <div key={message.id} className="flex justify-end">
                <p className="body-3 max-w-md whitespace-pre-wrap rounded-xl bg-fg px-4 py-3 text-page">{message.text}</p>
              </div>
            )
          )}

          {waiting && (
            <div className="flex items-start gap-2" aria-label="The assistant is typing">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-raised">
                <Robot size={20} aria-hidden="true" />
              </span>
              <div className="flex gap-1 rounded-xl bg-raised px-4 py-4" aria-hidden="true">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    style={{ animationDelay: `${delay}ms` }}
                    className="size-2 animate-pulse rounded-full bg-subtle"
                  />
                ))}
              </div>
            </div>
          )}

          {messages.length === 1 && !waiting && (
            <div className="flex flex-wrap gap-2 pl-10">
              {SUGGESTIONS.map((suggestion) => (
                <Button key={suggestion} variant="secondary" size="sm" onClick={() => send(suggestion)}>
                  {suggestion}
                </Button>
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>

        {error && (
          <Alert kind="error" title="No answer this time" className="mx-2 mb-2">
            {error}
          </Alert>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 p-2"
        >
          <Textarea
            id="chat-input"
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about a product or an order"
            aria-label="Your question"
            maxLength={500}
            className="max-h-32 resize-none"
          />
          <Button type="submit" icon disabled={waiting || !input.trim()} aria-label="Send question">
            <PaperPlaneRight size={20} />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AskAi;
