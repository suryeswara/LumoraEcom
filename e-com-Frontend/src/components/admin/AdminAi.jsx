import { useState } from "react";
import { PaperPlaneRight, Sparkle, Warning } from "@phosphor-icons/react";
import axios from "../../axios";
import Alert from "../../ui/Alert";
import Button from "../../ui/Button";
import { Textarea } from "../../ui/Field";
import { apiError } from "../../lib/format";

const SUGGESTIONS = [
  "Give me a briefing for today",
  "Which products should I restock first?",
  "Which orders have waited the longest?",
  "How much payment is still pending?",
  "Which category sells best?",
];

export default function AdminAi() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [asked, setAsked] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");

  const ask = async (text) => {
    const q = text.trim();
    if (!q || waiting) return;
    setWaiting(true);
    setError("");
    setAsked(q);
    try {
      const { data } = await axios.post("/admin/ai/ask", { question: q });
      setResult(data);
    } catch (err) {
      setError(apiError(err, "The assistant could not be reached. Please try again."));
    } finally {
      setWaiting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <p className="body-6 text-muted">
        Ask about products, orders, stock and payments. Answers come from your live store data. The assistant reads
        only: it cannot change orders, stock or payments. Customer names, emails, phones and addresses are never sent
        to it.
      </p>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((text) => (
          <Button
            key={text}
            variant="secondary"
            size="sm"
            disabled={waiting}
            onClick={() => {
              setQuestion(text);
              ask(text);
            }}
          >
            {text}
          </Button>
        ))}
      </div>

      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          ask(question);
        }}
      >
        <div className="flex-1">
          <label htmlFor="admin-ai-question" className="sr-only">
            Your question
          </label>
          <Textarea
            id="admin-ai-question"
            rows={2}
            maxLength={500}
            placeholder="Ask about stock, orders or payments"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                ask(question);
              }
            }}
          />
        </div>
        <Button type="submit" icon aria-label="Send question" disabled={waiting || !question.trim()}>
          <PaperPlaneRight size={20} aria-hidden="true" />
        </Button>
      </form>

      {waiting && (
        <p role="status" className="body-6 flex items-center gap-2 text-muted">
          <Sparkle size={20} className="animate-pulse" aria-hidden="true" />
          Reading your store data
        </p>
      )}

      {error && (
        <Alert kind="error" title="No answer">
          {error}
        </Alert>
      )}

      {result && !waiting && (
        <section aria-live="polite" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
          <p className="caption-1 text-subtle">You asked: {asked}</p>
          <p className="body-3 whitespace-pre-wrap">{result.answer}</p>
          {!result.aiAvailable && (
            <Alert kind="warning" title="The AI assistant is offline">
              Check that the AI key is set on the server. The alerts below do not need it.
            </Alert>
          )}
          {result.alerts.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-line pt-4">
              <h3 className="title-4">Alerts from your data</h3>
              <ul className="flex flex-col gap-2">
                {result.alerts.map((text) => (
                  <li key={text} className="body-6 flex items-start gap-2">
                    <Warning size={20} weight="fill" className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
