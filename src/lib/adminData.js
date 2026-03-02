import { requireSupabase } from './supabase';

export const ADMIN_ORDER_STATUS_OPTIONS = [
  'Order Placed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

export const ADMIN_CUSTOM_ORDER_STATUS_OPTIONS = ['pending', 'in_review', 'approved', 'rejected'];

const toMillis = (value) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asDateString = (value) => {
  const ms = toMillis(value);
  if (!ms) return new Date().toISOString();
  return new Date(ms).toISOString();
};

const normalizeOrderStatus = (value) => {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'placed') return 'Order Placed';
  if (text.includes('delivered')) return 'Delivered';
  if (text.includes('out') && text.includes('delivery')) return 'Out for Delivery';
  if (text.includes('shipped')) return 'Shipped';
  if (text.includes('process')) return 'Processing';
  return 'Order Placed';
};

const normalizeOrder = (raw = {}, idOverride = '') => {
  const id = String(idOverride || raw.id || raw.orderId || raw.order_id || '').trim();
  const orderId = String(raw.orderId || raw.order_id || id).trim();
  const items = Array.isArray(raw.items) ? raw.items : [];
  const total = Number(raw.total || 0);

  return {
    id: id || orderId,
    orderId: orderId || id,
    userId: String(raw.userId || raw.user_id || ''),
    userEmail: String(raw.userEmail || raw.user_email || ''),
    items,
    itemCount: items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0),
    total,
    status: normalizeOrderStatus(raw.status),
    createdAt: asDateString(raw.createdAt || raw.created_at),
    updatedAt: asDateString(raw.updatedAt || raw.updated_at || raw.createdAt || raw.created_at),
  };
};

const normalizeChat = (raw = {}, idOverride = '') => ({
  id: String(idOverride || raw.id || raw.chatId || raw.chat_id || '').trim(),
  chatId: String(raw.chatId || raw.chat_id || idOverride || raw.id || '').trim(),
  userId: String(raw.userId || raw.user_id || ''),
  userEmail: String(raw.userEmail || raw.user_email || ''),
  guestId: String(raw.guestId || raw.guest_id || ''),
  status: String(raw.status || '').toLowerCase() === 'closed' ? 'closed' : 'open',
  lastMessage: String(raw.lastMessage || raw.last_message || ''),
  updatedAt: asDateString(raw.updatedAt || raw.updated_at || raw.createdAt || raw.created_at),
});

const normalizeError = (error, fallback) => {
  const message = String(error?.message || '').trim();
  return message || fallback;
};

const isSchemaError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('column') ||
    message.includes('relation') ||
    message.includes('schema cache') ||
    message.includes('does not exist')
  );
};

const normalizeSupabaseCount = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const normalizeInquiry = (raw = {}, inquiryType = 'contact') => {
  const id = String(raw.id || '').trim();
  const normalizedType = String(inquiryType || '').trim().toLowerCase();
  const userId = String(raw.user_id || raw.userId || '').trim();
  const userEmail = String(raw.user_email || raw.userEmail || '').trim();
  const name = String(raw.name || '').trim();
  const email = String(raw.email || userEmail || '').trim();
  const createdAt = asDateString(raw.created_at || raw.createdAt);
  const updatedAt = asDateString(raw.updated_at || raw.updatedAt || raw.created_at || raw.createdAt);
  const repliedAtRaw = raw.replied_at || raw.repliedAt || '';
  const repliedAt = repliedAtRaw ? asDateString(repliedAtRaw) : '';
  const adminReply = String(raw.admin_reply || raw.adminReply || '').trim();

  if (normalizedType === 'custom_order') {
    const status = String(raw.status || 'pending').trim().toLowerCase() || 'pending';
    return {
      id,
      inquiryType: 'custom_order',
      subject: `Custom Order: ${String(raw.shoe_type || raw.shoeType || 'Request').trim()}`,
      message: String(raw.design_notes || raw.designNotes || raw.message || '').trim(),
      name,
      email,
      userId,
      userEmail,
      status,
      orderId: '',
      adminReply,
      repliedAt,
      repliedBy: String(raw.replied_by || raw.repliedBy || '').trim(),
      createdAt,
      updatedAt,
      meta: {
        shoeType: String(raw.shoe_type || raw.shoeType || '').trim(),
        size: String(raw.size || '').trim(),
        material: String(raw.material || '').trim(),
        budgetRange: String(raw.budget_range || raw.budgetRange || '').trim(),
        deliveryTimeline: String(raw.delivery_timeline || raw.deliveryTimeline || '').trim(),
      },
    };
  }

  if (normalizedType === 'feedback') {
    return {
      id,
      inquiryType: 'feedback',
      subject: String(raw.subject || 'General Feedback').trim(),
      message: String(raw.message || '').trim(),
      name: name || 'Customer',
      email,
      userId,
      userEmail,
      status: repliedAt ? 'replied' : 'new',
      orderId: String(raw.order_id || raw.orderId || '').trim(),
      adminReply,
      repliedAt,
      repliedBy: String(raw.replied_by || raw.repliedBy || '').trim(),
      createdAt,
      updatedAt,
      meta: {
        rating: Number(raw.rating || 0),
      },
    };
  }

  return {
    id,
    inquiryType: 'contact',
    subject: String(raw.topic || 'General Inquiry').trim(),
    message: String(raw.message || '').trim(),
    name,
    email,
    userId,
    userEmail,
    status: repliedAt ? 'replied' : 'new',
    orderId: '',
    adminReply,
    repliedAt,
    repliedBy: String(raw.replied_by || raw.repliedBy || '').trim(),
    createdAt,
    updatedAt,
    meta: null,
  };
};

const fetchOrdersFromSupabase = async (max = 0) => {
  const client = requireSupabase();
  let request = client
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (Number(max) > 0) {
    request = request.limit(Number(max));
  }

  const { data, error } = await request;
  if (error) {
    throw new Error(normalizeError(error, 'Unable to load orders from database.'));
  }

  return (data || []).map((row) => normalizeOrder(row));
};

const fetchChatsFromSupabase = async (max = 10) => {
  const client = requireSupabase();
  let request = client
    .from('chats')
    .select('*')
    .order('updated_at', { ascending: false });

  const expandedLimit = Number(max) > 0 ? Number(max) * 4 : 100;
  request = request.limit(expandedLimit);

  const { data, error } = await request;
  if (error) {
    throw new Error(normalizeError(error, 'Unable to load chats from database.'));
  }

  const openChats = (data || [])
    .map((row) => normalizeChat(row))
    .filter((chat) => chat.status === 'open')
    .sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));

  const chatsMissingPreview = openChats.filter((chat) => !chat.lastMessage).map((chat) => chat.chatId).filter(Boolean);
  if (chatsMissingPreview.length > 0) {
    const messagesResponse = await client
      .from('chat_messages')
      .select('*')
      .in('chat_id', chatsMissingPreview)
      .order('created_at', { ascending: false });

    if (!messagesResponse.error) {
      const previewByChatId = new Map();
      for (const row of messagesResponse.data || []) {
        const chatId = String(row.chat_id || row.chatId || '').trim();
        if (!chatId || previewByChatId.has(chatId)) continue;
        previewByChatId.set(chatId, String(row.text || row.message || '').trim());
      }

      for (const chat of openChats) {
        if (!chat.lastMessage && previewByChatId.has(chat.chatId)) {
          chat.lastMessage = previewByChatId.get(chat.chatId);
        }
      }
    }
  }

  if (Number(max) > 0) {
    return openChats.slice(0, Number(max));
  }
  return openChats;
};

const fetchInquiriesFromSupabase = async (max = 100) => {
  const client = requireSupabase();

  const [contactResponse, customOrderResponse, feedbackResponse] = await Promise.all([
    client.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(Number(max) > 0 ? Number(max) : 100),
    client.from('custom_orders').select('*').order('created_at', { ascending: false }).limit(Number(max) > 0 ? Number(max) : 100),
    client.from('feedback').select('*').order('created_at', { ascending: false }).limit(Number(max) > 0 ? Number(max) : 100),
  ]);

  if (contactResponse.error) {
    throw new Error(normalizeError(contactResponse.error, 'Unable to load contact inquiries.'));
  }
  if (customOrderResponse.error) {
    throw new Error(normalizeError(customOrderResponse.error, 'Unable to load custom order inquiries.'));
  }
  if (feedbackResponse.error) {
    throw new Error(normalizeError(feedbackResponse.error, 'Unable to load feedback inquiries.'));
  }

  const merged = [
    ...(contactResponse.data || []).map((row) => normalizeInquiry(row, 'contact')),
    ...(customOrderResponse.data || []).map((row) => normalizeInquiry(row, 'custom_order')),
    ...(feedbackResponse.data || []).map((row) => normalizeInquiry(row, 'feedback')),
  ].sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));

  if (Number(max) > 0) {
    return merged.slice(0, Number(max));
  }
  return merged;
};

const fetchProductsCount = async () => {
  const client = requireSupabase();
  const { count, error } = await client.from('products').select('id', { count: 'exact', head: true });
  if (error) {
    throw new Error(normalizeError(error, 'Unable to load products count.'));
  }
  return normalizeSupabaseCount(count);
};

const fetchOpenChatsCount = async () => {
  const client = requireSupabase();
  const { count, error } = await client
    .from('chats')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open');
  if (error) {
    throw new Error(normalizeError(error, 'Unable to load open chats count.'));
  }
  return normalizeSupabaseCount(count);
};

export async function getRecentOrders(max = 10) {
  const take = Number(max) > 0 ? Number(max) : 10;
  return fetchOrdersFromSupabase(take);
}

export async function getOpenChats(max = 10) {
  return fetchChatsFromSupabase(max);
}

export async function getAdminInquiries(max = 100) {
  const take = Number(max) > 0 ? Number(max) : 100;
  return fetchInquiriesFromSupabase(take);
}

export async function replyToInquiry({ inquiryType, inquiryId, reply, status } = {}) {
  const client = requireSupabase();
  const type = String(inquiryType || '').trim().toLowerCase();
  const id = String(inquiryId || '').trim();
  const adminReply = String(reply || '').trim();

  if (!id) {
    throw new Error('Inquiry ID is required.');
  }
  if (!adminReply) {
    throw new Error('Reply message is required.');
  }

  const { data: authData } = await client.auth.getUser();
  const adminUserId = String(authData?.user?.id || '').trim() || null;
  const now = new Date().toISOString();

  let tableName = '';
  let updatePayload = {
    admin_reply: adminReply,
    replied_at: now,
    replied_by: adminUserId,
  };

  if (type === 'custom_order') {
    tableName = 'custom_orders';
    if (ADMIN_CUSTOM_ORDER_STATUS_OPTIONS.includes(String(status || '').toLowerCase())) {
      updatePayload.status = String(status).toLowerCase();
    }
    updatePayload.updated_at = now;
  } else if (type === 'feedback') {
    tableName = 'feedback';
  } else if (type === 'contact') {
    tableName = 'contact_messages';
  } else {
    throw new Error('Unsupported inquiry type.');
  }

  const response = await client.from(tableName).update(updatePayload).eq('id', id).select('*').limit(1);
  if (response.error) {
    if (isSchemaError(response.error)) {
      throw new Error(
        'Admin reply columns are missing. Run sql/supabase_full_setup.sql to add admin_reply, replied_at, and replied_by columns.',
      );
    }
    throw new Error(normalizeError(response.error, 'Unable to send inquiry reply.'));
  }

  const row = response.data?.[0];
  if (!row) {
    throw new Error('Inquiry not found.');
  }

  return normalizeInquiry(row, type);
}

export async function getAdminStats() {
  const [orders, openChatsCount, productsCount] = await Promise.all([
    fetchOrdersFromSupabase(0),
    fetchOpenChatsCount(),
    fetchProductsCount(),
  ]);

  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const pendingOrders = orders.filter((order) => {
    const status = String(order.status || '').toLowerCase();
    return status === 'order placed' || status === 'processing';
  }).length;

  return {
    totalOrders: orders.length,
    openChats: openChatsCount,
    revenue,
    productsCount,
    pendingOrders,
  };
}

export async function updateOrderStatus(orderId, status) {
  const nextStatus = ADMIN_ORDER_STATUS_OPTIONS.includes(status) ? status : 'Order Placed';
  const targetOrderId = String(orderId || '').trim();
  if (!targetOrderId) {
    throw new Error('Order ID is required.');
  }

  const client = requireSupabase();
  const payload = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  const byId = await client
    .from('orders')
    .update(payload)
    .eq('id', targetOrderId)
    .select('id')
    .limit(1);

  if (byId.error) {
    throw new Error(normalizeError(byId.error, 'Unable to update order status.'));
  }

  if (Array.isArray(byId.data) && byId.data.length > 0) {
    return;
  }

  const orderIdColumns = ['order_id', 'orderId'];
  for (const columnName of orderIdColumns) {
    const response = await client
      .from('orders')
      .update(payload)
      .eq(columnName, targetOrderId)
      .select('id')
      .limit(1);

    if (!response.error && Array.isArray(response.data) && response.data.length > 0) {
      return;
    }
  }

  throw new Error('Order not found.');
}

export function subscribeAdminRealtime(onChange, onError) {
  let client;
  try {
    client = requireSupabase();
  } catch (error) {
    onError?.(error);
    return () => {};
  }

  const channel = client
    .channel(`admin-dashboard-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => onChange?.())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => onChange?.())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => onChange?.())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, () => onChange?.())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_orders' }, () => onChange?.())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => onChange?.())
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError?.(new Error('Realtime dashboard updates are unavailable.'));
      }
    });

  return () => {
    client.removeChannel(channel);
  };
}
