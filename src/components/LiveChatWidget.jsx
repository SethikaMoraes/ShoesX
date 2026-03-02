import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, RefreshCw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChatPanel from './ChatPanel';
import { findOrCreateChat, markRead, sendMessage, subscribeMessages } from '../lib/chatService';

const QUICK_OPTIONS = ['Where is my order?', 'Help me choose my size', 'Return / exchange policy'];

const normalizeError = (error, fallback) => {
  const text = String(error?.message || '').trim();
  return text || fallback;
};

export default function LiveChatWidget() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState('');
  const [senderId, setSenderId] = useState('');
  const [messages, setMessages] = useState([]);
  const [connecting, setConnecting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  const subtitle = useMemo(() => {
    if (error) return error;
    return loading || connecting ? 'Connecting...' : 'We usually reply within a few minutes.';
  }, [error, loading, connecting]);

  useEffect(() => {
    if (user?.uid) return;
    setOpen(false);
    setChatId('');
    setSenderId('');
    setMessages([]);
  }, [user?.uid]);

  useEffect(() => {
    if (!open) return undefined;
    if (!user?.uid) {
      setConnecting(false);
      setError('Please sign in to use live chat.');
      return undefined;
    }

    if (loading) {
      setConnecting(true);
      return undefined;
    }

    let disposed = false;
    let unsubscribeMessages = () => {};

    const setup = async () => {
      setConnecting(true);
      setError('');

      try {
        const chat = await findOrCreateChat({ user });
        if (disposed) return;

        setChatId(chat.chatId);
        setSenderId(chat.senderId || (user?.uid ? user.uid : 'guest'));
        await markRead(chat.chatId, 'user');

        unsubscribeMessages = subscribeMessages(
          chat.chatId,
          (nextMessages) => {
            if (disposed) return;
            setMessages(nextMessages);
            setConnecting(false);
            markRead(chat.chatId, 'user').catch(() => {});
          },
          (subscribeError) => {
            if (disposed) return;
            setConnecting(false);
            setError(normalizeError(subscribeError, 'Unable to receive messages right now.'));
          },
        );
      } catch (setupError) {
        if (disposed) return;
        setConnecting(false);
        setError(normalizeError(setupError, 'Unable to connect to live chat.'));
      }
    };

    setup();

    return () => {
      disposed = true;
      unsubscribeMessages();
    };
  }, [open, user?.uid, loading, refreshToken]);

  const handleRefresh = () => {
    setError('');
    setConnecting(true);
    setRefreshToken((current) => current + 1);
  };

  const handleSend = async (text) => {
    if (!user?.uid) {
      navigate('/signin', {
        state: { from: `${location.pathname}${location.search}` },
      });
      return;
    }

    const value = String(text || '').trim();
    if (!value) return;

    setError('');
    setSending(true);
    const optimisticId = `user-temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage = {
      id: optimisticId,
      text: value,
      sender: 'user',
      senderId: senderId || user.uid,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimisticMessage]);

    try {
      let activeChatId = chatId;
      let activeSenderId = senderId;

      if (!activeChatId) {
        const chat = await findOrCreateChat({ user });
        activeChatId = chat.chatId;
        activeSenderId = chat.senderId || activeSenderId;
        setChatId(activeChatId);
        setSenderId(activeSenderId);
      }

      await sendMessage({
        chatId: activeChatId,
        text: value,
        sender: 'user',
        senderId: activeSenderId || user.uid,
      });
    } catch (sendError) {
      setMessages((current) => current.filter((message) => message.id !== optimisticId));
      setError(normalizeError(sendError, 'Unable to send message.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open ? (
        <div className="fixed bottom-24 right-4 z-[56] h-[70vh] w-[calc(100%-2rem)] max-w-sm sm:right-6">
          <ChatPanel
            title="Live Chat"
            subtitle={subtitle}
            messages={messages}
            quickOptions={QUICK_OPTIONS}
            onQuickOption={handleSend}
            onSend={handleSend}
            currentSender="user"
            sending={sending}
            connecting={loading || connecting}
            emptyLabel="Ask us anything about your order, sizing, or returns."
            headerActions={
              <button type="button" className="btn-secondary px-3 py-1.5" onClick={handleRefresh}>
                <RefreshCw size={14} aria-hidden="true" />
                Refresh
              </button>
            }
            onClose={() => setOpen(false)}
          />
        </div>
      ) : null}

      <button
        type="button"
        className="fixed bottom-6 right-4 z-[55] inline-flex h-14 w-14 items-center justify-center rounded-full bg-cyan-700 text-white shadow-xl transition hover:bg-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:bg-cyan-600 dark:hover:bg-cyan-500 dark:ring-offset-slate-950 sm:right-6"
        onClick={() => {
          if (!user?.uid) {
            navigate('/signin', {
              state: { from: `${location.pathname}${location.search}` },
            });
            return;
          }
          setOpen((current) => !current);
        }}
        aria-label={open ? 'Close live chat' : 'Open live chat'}
      >
        <MessageCircle size={22} aria-hidden="true" />
      </button>
    </>
  );
}
