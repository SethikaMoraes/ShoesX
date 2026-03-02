import { useEffect, useMemo, useState } from 'react';
import { MessageCircleMore, MessageSquareText, RefreshCw } from 'lucide-react';
import ChatPanel from '../../components/ChatPanel';
import { useAuth } from '../../context/AuthContext';
import {
  closeChat,
  markRead,
  reopenChat,
  sendMessage,
  subscribeChats,
  subscribeMessages,
} from '../../lib/chatService';

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

export default function AdminChat() {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [chatFilter, setChatFilter] = useState('all');
  const [activeChatId, setActiveChatId] = useState('');
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  const sortedChats = useMemo(
    () =>
      [...chats].sort((left, right) => {
        return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
      }),
    [chats],
  );

  const filteredChats = useMemo(
    () =>
      chatFilter === 'all'
        ? sortedChats
        : sortedChats.filter((chat) => String(chat.status || '').toLowerCase() === chatFilter),
    [sortedChats, chatFilter],
  );

  const activeChat = useMemo(
    () => filteredChats.find((chat) => String(chat.chatId) === String(activeChatId)) || null,
    [filteredChats, activeChatId],
  );

  useEffect(() => {
    setLoadingChats(true);
    setError('');

    const unsubscribe = subscribeChats(
      (nextChats) => {
        setChats(nextChats);
        setLoadingChats(false);
      },
      (subscribeError) => {
        const message = String(subscribeError?.message || '').trim();
        setError(message || 'Unable to load live chats.');
        setLoadingChats(false);
      },
    );

    return () => unsubscribe();
  }, [refreshToken]);

  useEffect(() => {
    if (filteredChats.length === 0) {
      setActiveChatId('');
      return;
    }

    const hasSelected = filteredChats.some((chat) => String(chat.chatId) === String(activeChatId));
    // Keep chat panel empty until admin explicitly selects a chat.
    if (!hasSelected && activeChatId) {
      setActiveChatId('');
    }
  }, [filteredChats, activeChatId]);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return undefined;
    }

    setLoadingMessages(true);
    setError('');

    const unsubscribe = subscribeMessages(
      activeChatId,
      (nextMessages) => {
        setMessages(nextMessages);
        setLoadingMessages(false);
        markRead(activeChatId, 'admin').catch(() => {});
      },
      (subscribeError) => {
        const message = String(subscribeError?.message || '').trim();
        setError(message || 'Realtime chat updates are unavailable.');
        setLoadingMessages(false);
      },
    );

    markRead(activeChatId, 'admin').catch(() => {});
    return () => unsubscribe();
  }, [activeChatId, refreshToken]);

  const handleRefresh = () => {
    setError('');
    setLoadingChats(true);
    if (activeChatId) setLoadingMessages(true);
    setRefreshToken((current) => current + 1);
  };

  const handleSend = async (text) => {
    if (!activeChatId) return;

    const value = String(text || '').trim();
    if (!value) return;

    setError('');
    setSending(true);
    const optimisticId = `admin-temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage = {
      id: optimisticId,
      text: value,
      sender: 'admin',
      senderId: String(user?.uid || 'admin'),
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimisticMessage]);

    try {
      await sendMessage({
        chatId: activeChatId,
        text: value,
        sender: 'admin',
        senderId: String(user?.uid || 'admin'),
      });
      await markRead(activeChatId, 'admin');
    } catch (sendError) {
      setMessages((current) => current.filter((message) => message.id !== optimisticId));
      const message = String(sendError?.message || '').trim();
      setError(message || 'Unable to send admin reply.');
    } finally {
      setSending(false);
    }
  };

  const toggleChatStatus = async () => {
    if (!activeChat) return;

    setError('');
    try {
      if (activeChat.status === 'open') {
        await closeChat(activeChat.chatId);
      } else {
        await reopenChat(activeChat.chatId);
      }
    } catch (statusError) {
      const message = String(statusError?.message || '').trim();
      setError(message || 'Unable to update chat status.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel">
        <h1 className="text-3xl font-bold">Live Chat</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Monitor open conversations and keep response times short.
        </p>
      </section>

      {error ? (
        <section className="panel">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      ) : null}

      <section className="panel">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageCircleMore size={20} className="text-cyan-700 dark:text-cyan-300" />
            <h2 className="text-xl font-semibold">Live Chat Queue</h2>
          </div>
          <button type="button" className="btn-secondary px-3 py-1.5" onClick={handleRefresh}>
            <RefreshCw size={14} aria-hidden="true" />
            Refresh
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-xl border text-sm font-semibold transition ${
              chatFilter === 'all'
                ? 'border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-500'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
            onClick={() => setChatFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-xl border text-sm font-semibold transition ${
              chatFilter === 'open'
                ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500'
                : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/45'
            }`}
            onClick={() => setChatFilter('open')}
          >
            Open
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-xl border text-sm font-semibold transition ${
              chatFilter === 'closed'
                ? 'border-rose-600 bg-rose-600 text-white hover:bg-rose-500'
                : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/45'
            }`}
            onClick={() => setChatFilter('closed')}
          >
            Closed
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
            {loadingChats ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">Loading chats...</p>
            ) : filteredChats.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {chatFilter === 'all'
                  ? 'No chats available at the moment.'
                  : chatFilter === 'open'
                    ? 'No open chats at the moment.'
                    : 'No closed chats at the moment.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {filteredChats.map((chat) => {
                  const selected = String(chat.chatId) === String(activeChatId);
                  return (
                    <li key={chat.chatId}>
                      <button
                        type="button"
                        onClick={() => setActiveChatId(chat.chatId)}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          selected
                            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30'
                            : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                            {chat.userEmail || chat.userId || 'Guest'}
                          </p>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              chat.status === 'open'
                                ? 'border-cyan-500/50 text-cyan-700 dark:text-cyan-300'
                                : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {chat.status}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-600 dark:text-slate-300">
                          {chat.lastMessage || 'Waiting for the first message...'}
                        </p>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Updated {formatDate(chat.updatedAt)}
                          </p>
                          {chat.unreadForAdmin > 0 ? (
                            <span className="rounded-full bg-cyan-700 px-1.5 py-0.5 text-[10px] font-bold text-white dark:bg-cyan-600">
                              {chat.unreadForAdmin}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {activeChat ? (
            <ChatPanel
              title={activeChat.userEmail || activeChat.userId || 'Guest'}
              subtitle={`Status: ${activeChat.status} • Updated ${formatDate(activeChat.updatedAt)}`}
              messages={messages}
              onSend={handleSend}
              currentSender="admin"
              sending={sending}
              connecting={loadingMessages}
              placeholder="Reply to this customer..."
              emptyLabel="No messages yet in this conversation."
              disabled={activeChat.status !== 'open'}
              disabledMessage={
                activeChat.status !== 'open'
                  ? 'This chat is closed. Reopen it to send a reply.'
                  : ''
              }
              headerActions={
                <div className="flex items-center gap-2">
                  <button type="button" className="btn-secondary px-3 py-1.5" onClick={handleRefresh}>
                    <RefreshCw size={14} aria-hidden="true" />
                    Refresh
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-xl border text-sm font-semibold transition ${
                      activeChat.status === 'open'
                        ? 'border-rose-600 bg-rose-600 text-white hover:bg-rose-500'
                        : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500'
                    }`}
                    onClick={toggleChatStatus}
                  >
                    {activeChat.status === 'open' ? 'Close chat' : 'Reopen chat'}
                  </button>
                </div>
              }
              className="h-[620px]"
            />
          ) : (
            <div className="panel flex h-[620px] flex-col items-center justify-center gap-4 text-sm text-slate-600 dark:text-slate-300">
              <MessageSquareText size={170} className="text-cyan-600/75 dark:text-cyan-300/70" aria-hidden="true" />
              <p>Select a chat to view messages and reply.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
