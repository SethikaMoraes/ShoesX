import { useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatTime = (value) => {
  const millis = toMillis(value);
  if (!millis) return '';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(millis));
};

export default function ChatPanel({
  title = 'Live Chat',
  subtitle = '',
  messages = [],
  quickOptions = [],
  onQuickOption,
  onSend,
  currentSender = 'user',
  sending = false,
  connecting = false,
  disabled = false,
  placeholder = 'Type your message...',
  emptyLabel = 'Start the conversation.',
  disabledMessage = '',
  onClose,
  headerActions = null,
  className = '',
}) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef(null);

  const canSend = useMemo(() => {
    return Boolean(draft.trim()) && !sending && !disabled && !connecting;
  }, [draft, sending, disabled, connecting]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, connecting]);

  const submit = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !onSend || !canSend) return;

    setDraft('');
    await onSend(text);
  };

  return (
    <section className={`panel flex h-full flex-col p-4 sm:p-5 ${className}`}>
      <header className="-mx-4 -mt-4 mb-4 flex items-start justify-between gap-3 border-b border-slate-200 px-4 pb-3 pt-4 dark:border-slate-800 sm:-mx-5 sm:-mt-5 sm:px-5 sm:pt-5">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
          {onClose ? (
            <button type="button" className="btn-secondary px-3 py-1.5" onClick={onClose}>
              Close
            </button>
          ) : null}
        </div>
      </header>

      {quickOptions.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {quickOptions.map((option) => (
            <button
              key={option}
              type="button"
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
              onClick={() => onQuickOption?.(option)}
              disabled={disabled || connecting || sending}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-100/80 p-3 dark:border-slate-800 dark:bg-slate-950/70">
        {connecting ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Connecting...</p>
        ) : null}

        {!connecting && messages.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">{emptyLabel}</p>
        ) : null}

        <div className="space-y-2">
          {messages.map((message) => {
            const ownMessage = message.sender === currentSender;
            return (
              <article key={message.id} className={`flex ${ownMessage ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    ownMessage
                      ? 'bg-cyan-700 text-white dark:bg-cyan-600'
                      : 'border border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      ownMessage ? 'text-cyan-100' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </article>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {disabledMessage ? (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">{disabledMessage}</p>
      ) : null}

      <form className="mt-3 flex items-center gap-2" onSubmit={submit}>
        <input
          className="input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          disabled={disabled || connecting}
        />
        <button type="submit" className="btn-primary px-3 py-2.5" disabled={!canSend}>
          <Send size={16} aria-hidden="true" />
          <span className="sr-only">Send message</span>
        </button>
      </form>
    </section>
  );
}
