import { hasSupabaseConfig, requireSupabase } from './supabase';

const CHATS_TABLE = 'chats';
const MESSAGES_TABLE = 'chat_messages';

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeChat = (row = {}) => {
  const updatedAt = row.updated_at || row.updatedAt || row.created_at || row.createdAt || null;
  return {
    chatId: String(row.id || row.chat_id || row.chatId || '').trim(),
    userId: String(row.user_id || row.userId || '').trim(),
    userEmail: String(row.user_email || row.userEmail || '').trim(),
    guestId: String(row.guest_id || row.guestId || '').trim(),
    createdAt: row.created_at || row.createdAt || null,
    updatedAt,
    status: String(row.status || '').toLowerCase() === 'closed' ? 'closed' : 'open',
    lastMessage: String(row.last_message || row.lastMessage || '').trim(),
    lastSender: String(row.last_sender || row.lastSender || '').toLowerCase() === 'admin' ? 'admin' : 'user',
    unreadForAdmin: Number(row.unread_for_admin ?? row.unreadForAdmin ?? 0),
    unreadForUser: Number(row.unread_for_user ?? row.unreadForUser ?? 0),
    _updatedAtMs: toMillis(updatedAt),
  };
};

const normalizeMessage = (row = {}) => {
  const createdAt = row.created_at || row.createdAt || null;
  return {
    id: row.id,
    text: String(row.text || row.message || '').trim(),
    sender: String(row.sender || '').toLowerCase() === 'admin' ? 'admin' : 'user',
    senderId: String(row.sender_id || row.senderId || '').trim(),
    createdAt,
    _createdAtMs: toMillis(createdAt),
  };
};

const ensureChatConfig = () => {
  if (!hasSupabaseConfig) {
    throw new Error('Live chat is currently unavailable.');
  }
  return requireSupabase();
};

const resolveParticipant = (user) => {
  if (!user?.uid) {
    throw new Error('Please sign in to use live chat.');
  }

  return {
    userId: String(user.uid),
    userEmail: String(user.email || ''),
    guestId: '',
    senderId: String(user.uid),
    isGuest: false,
  };
};

export async function findOrCreateChat({ user } = {}) {
  const client = ensureChatConfig();
  const participant = resolveParticipant(user);

  const existingResponse = await client
    .from(CHATS_TABLE)
    .select('*')
    .eq('status', 'open')
    .eq('user_id', participant.userId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (existingResponse.error) {
    throw new Error(existingResponse.error.message || 'Unable to initialize live chat.');
  }

  if (Array.isArray(existingResponse.data) && existingResponse.data.length > 0) {
    const openChat = normalizeChat(existingResponse.data[0]);
    return { ...openChat, senderId: participant.senderId, isGuest: participant.isGuest };
  }

  const now = new Date().toISOString();
  const insertPayload = {
    user_id: participant.userId || null,
    user_email: participant.userEmail || null,
    guest_id: participant.guestId || null,
    created_at: now,
    updated_at: now,
    status: 'open',
    last_message: '',
    last_sender: 'user',
    unread_for_admin: 0,
    unread_for_user: 0,
  };

  const { data, error } = await client.from(CHATS_TABLE).insert(insertPayload).select('*').single();
  if (error) {
    throw new Error(error.message || 'Unable to start chat.');
  }

  const chat = normalizeChat(data || {});
  return {
    ...chat,
    senderId: participant.senderId,
    isGuest: participant.isGuest,
  };
}

export async function sendMessage({ chatId, text, sender = 'user', senderId = '' } = {}) {
  const client = ensureChatConfig();
  const nextChatId = String(chatId || '').trim();
  const nextText = String(text || '').trim();
  const nextSender = sender === 'admin' ? 'admin' : 'user';
  const nextSenderId = String(senderId || (nextSender === 'admin' ? 'admin' : 'user')).trim();

  if (!nextChatId) {
    throw new Error('Chat is not ready yet.');
  }
  if (!nextText) {
    throw new Error('Message cannot be empty.');
  }

  const now = new Date().toISOString();
  const messageInsert = await client.from(MESSAGES_TABLE).insert({
    chat_id: nextChatId,
    text: nextText,
    sender: nextSender,
    sender_id: nextSenderId,
    created_at: now,
  });

  if (messageInsert.error) {
    throw new Error(messageInsert.error.message || 'Unable to send message.');
  }

  const chatSnapshot = await client
    .from(CHATS_TABLE)
    .select('id,unread_for_admin,unread_for_user')
    .eq('id', nextChatId)
    .maybeSingle();

  const currentUnreadAdmin = Number(chatSnapshot.data?.unread_for_admin || 0);
  const currentUnreadUser = Number(chatSnapshot.data?.unread_for_user || 0);

  const updatePayload = {
    last_message: nextText,
    last_sender: nextSender,
    status: 'open',
    updated_at: now,
    unread_for_admin: nextSender === 'admin' ? currentUnreadAdmin : currentUnreadAdmin + 1,
    unread_for_user: nextSender === 'admin' ? currentUnreadUser + 1 : currentUnreadUser,
  };

  const updateResult = await client.from(CHATS_TABLE).update(updatePayload).eq('id', nextChatId);
  if (updateResult.error) {
    throw new Error(updateResult.error.message || 'Unable to update chat state.');
  }
}

export function subscribeMessages(chatId, onData, onError) {
  const client = ensureChatConfig();
  const nextChatId = String(chatId || '').trim();
  if (!nextChatId) return () => {};

  let active = true;

  const loadMessages = async () => {
    const { data, error } = await client
      .from(MESSAGES_TABLE)
      .select('*')
      .eq('chat_id', nextChatId)
      .order('created_at', { ascending: true });

    if (!active) return;
    if (error) {
      onError?.(error);
      return;
    }

    const messages = (data || [])
      .map((row) => normalizeMessage(row))
      .sort((a, b) => a._createdAtMs - b._createdAtMs);
    onData?.(messages);
  };

  loadMessages().catch((error) => onError?.(error));

  const channel = client
    .channel(`chat-messages-${nextChatId}-${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: MESSAGES_TABLE, filter: `chat_id=eq.${nextChatId}` },
      () => {
        loadMessages().catch((error) => onError?.(error));
      },
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError?.(new Error('Realtime chat updates are unavailable.'));
      }
    });

  return () => {
    active = false;
    client.removeChannel(channel);
  };
}

export function subscribeChats(onData, onError) {
  const client = ensureChatConfig();
  let active = true;

  const loadChats = async () => {
    const { data, error } = await client
      .from(CHATS_TABLE)
      .select('*')
      .order('updated_at', { ascending: false });

    if (!active) return;
    if (error) {
      onError?.(error);
      return;
    }

    const chats = (data || [])
      .map((row) => normalizeChat(row))
      .sort((a, b) => b._updatedAtMs - a._updatedAtMs);
    onData?.(chats);
  };

  loadChats().catch((error) => onError?.(error));

  const channel = client
    .channel(`chat-list-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: CHATS_TABLE }, () => {
      loadChats().catch((error) => onError?.(error));
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError?.(new Error('Realtime chat updates are unavailable.'));
      }
    });

  return () => {
    active = false;
    client.removeChannel(channel);
  };
}

export async function markRead(chatId, viewer = 'user') {
  const client = ensureChatConfig();
  const nextChatId = String(chatId || '').trim();
  if (!nextChatId) return;

  const field = viewer === 'admin' ? 'unread_for_admin' : 'unread_for_user';
  const { error } = await client.from(CHATS_TABLE).update({ [field]: 0 }).eq('id', nextChatId);
  if (error) {
    throw new Error(error.message || 'Unable to update chat read state.');
  }
}

export async function closeChat(chatId, status = 'closed') {
  const client = ensureChatConfig();
  const nextChatId = String(chatId || '').trim();
  if (!nextChatId) {
    throw new Error('Chat is not ready yet.');
  }

  const nextStatus = status === 'open' ? 'open' : 'closed';
  const { error } = await client
    .from(CHATS_TABLE)
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', nextChatId);

  if (error) {
    throw new Error(error.message || 'Unable to update chat status.');
  }
}

export async function reopenChat(chatId) {
  return closeChat(chatId, 'open');
}
