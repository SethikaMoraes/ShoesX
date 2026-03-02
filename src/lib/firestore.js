import { hasSupabaseConfig, requireSupabase } from './supabase';

// Compatibility module name: previously Firebase/Firestore helpers.
// This file now runs on Supabase only (no localStorage persistence).

export const ORDER_STATUSES = [
  'Order Placed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

const withId = (item) => ({
  id:
    item?.id ||
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`),
  ...item,
});

const normalizeError = (error, fallback) => {
  const message = String(error?.message || '').trim();
  return message || fallback;
};

const isSchemaError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('column') ||
    message.includes('schema cache') ||
    message.includes('could not find')
  );
};

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asDateString = (value) => {
  const ms = toMillis(value);
  if (!ms) return new Date().toISOString();
  return new Date(ms).toISOString();
};

const normalizeStatus = (value) => {
  const text = String(value || '').trim().toLowerCase();
  if (text.includes('delivered')) return 'Delivered';
  if (text.includes('out') && text.includes('delivery')) return 'Out for Delivery';
  if (text.includes('shipped')) return 'Shipped';
  if (text.includes('process')) return 'Processing';
  return 'Order Placed';
};

const normalizeOrder = (item = {}) => {
  const id = String(item.id || item.orderId || item.order_id || '').trim();
  const orderId = String(item.orderId || item.order_id || id).trim();
  const items = Array.isArray(item.items) ? item.items : [];
  const total = Number(item.total || 0);
  const createdAt = item.createdAt || item.created_at || item.datePlaced || new Date().toISOString();
  const updatedAt = item.updatedAt || item.updated_at || createdAt;

  return {
    id: id || orderId,
    orderId: orderId || id,
    userId: item.userId || item.user_id || '',
    userEmail: item.userEmail || item.user_email || '',
    items,
    total,
    status: normalizeStatus(item.status),
    createdAt,
    updatedAt,
  };
};

const requireConfiguredSupabase = () => {
  if (!hasSupabaseConfig) {
    throw new Error('Supabase is not configured.');
  }
  return requireSupabase();
};

const buildRatingStats = (ratings) => {
  const sorted = [...ratings].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  const ratingCount = sorted.length;
  const total = sorted.reduce((sum, entry) => sum + (Number(entry.rating) || 0), 0);
  const averageRating = ratingCount > 0 ? Number((total / ratingCount).toFixed(1)) : 0;
  return {
    averageRating,
    ratingCount,
    ratings: sorted,
  };
};

const queryRatingsFromSupabase = async (productId) => {
  const client = requireConfiguredSupabase();
  const candidates = [
    {
      table: 'product_ratings',
      productCol: 'product_id',
      userCol: 'user_id',
      emailCol: 'user_email',
      reviewCol: 'review_text',
      createdCol: 'created_at',
      updatedCol: 'updated_at',
    },
    {
      table: 'productRatings',
      productCol: 'productId',
      userCol: 'userId',
      emailCol: 'userEmail',
      reviewCol: 'reviewText',
      createdCol: 'createdAt',
      updatedCol: 'updatedAt',
    },
  ];

  let lastError = null;
  for (const candidate of candidates) {
    const { data, error } = await client
      .from(candidate.table)
      .select('*')
      .eq(candidate.productCol, productId);

    if (error) {
      lastError = error;
      if (isSchemaError(error)) continue;
      throw new Error(normalizeError(error, 'Unable to load product ratings.'));
    }

    return (data || []).map((row) => ({
      id: row.id,
      productId: String(row[candidate.productCol] || ''),
      userId: String(row[candidate.userCol] || ''),
      userEmail: String(row[candidate.emailCol] || ''),
      rating: Number(row.rating) || 0,
      reviewText: String(row[candidate.reviewCol] || ''),
      createdAt: asDateString(row[candidate.createdCol] || row[candidate.updatedCol]),
      updatedAt: asDateString(row[candidate.updatedCol] || row[candidate.createdCol]),
    }));
  }

  throw new Error(normalizeError(lastError, 'Unable to load product ratings.'));
};

const saveRatingToSupabase = async ({ productId, userId, userEmail, rating, reviewText }) => {
  const client = requireConfiguredSupabase();
  const now = new Date().toISOString();
  const candidates = [
    {
      table: 'product_ratings',
      productCol: 'product_id',
      userCol: 'user_id',
      emailCol: 'user_email',
      reviewCol: 'review_text',
      createdCol: 'created_at',
      updatedCol: 'updated_at',
    },
    {
      table: 'productRatings',
      productCol: 'productId',
      userCol: 'userId',
      emailCol: 'userEmail',
      reviewCol: 'reviewText',
      createdCol: 'createdAt',
      updatedCol: 'updatedAt',
    },
  ];

  let lastError = null;
  for (const candidate of candidates) {
    const existingQuery = await client
      .from(candidate.table)
      .select('id')
      .eq(candidate.productCol, productId)
      .eq(candidate.userCol, userId)
      .limit(1);

    if (existingQuery.error) {
      lastError = existingQuery.error;
      if (isSchemaError(existingQuery.error)) continue;
      throw new Error(normalizeError(existingQuery.error, 'Unable to save product rating.'));
    }

    const existingId = existingQuery.data?.[0]?.id;
    const payload = {
      [candidate.productCol]: productId,
      [candidate.userCol]: userId,
      [candidate.emailCol]: userEmail,
      rating,
      [candidate.reviewCol]: reviewText,
      [candidate.updatedCol]: now,
    };

    const response = existingId
      ? await client.from(candidate.table).update(payload).eq('id', existingId)
      : await client.from(candidate.table).insert({ ...payload, [candidate.createdCol]: now });

    if (!response.error) return;
    lastError = response.error;
    if (!isSchemaError(response.error)) {
      throw new Error(normalizeError(response.error, 'Unable to save product rating.'));
    }
  }

  throw new Error(normalizeError(lastError, 'Unable to save product rating.'));
};

const insertContactMessageToSupabase = async (entry) => {
  const client = requireConfiguredSupabase();
  const attempts = [
    {
      table: 'contact_messages',
      payload: {
        user_id: entry.userId,
        user_email: entry.userEmail,
        topic: entry.topic,
        name: entry.name,
        email: entry.email,
        message: entry.message,
        created_at: entry.createdAt,
      },
    },
    {
      table: 'contactMessages',
      payload: {
        userId: entry.userId,
        userEmail: entry.userEmail,
        topic: entry.topic,
        name: entry.name,
        email: entry.email,
        message: entry.message,
        createdAt: entry.createdAt,
      },
    },
  ];

  let lastError = null;
  for (const attempt of attempts) {
    const { error } = await client.from(attempt.table).insert(attempt.payload);
    if (!error) return;
    lastError = error;
    if (!isSchemaError(error)) {
      throw new Error(normalizeError(error, 'Unable to send message right now.'));
    }
  }

  throw new Error(normalizeError(lastError, 'Unable to send message right now.'));
};

const insertCustomOrderToSupabase = async (entry) => {
  const client = requireConfiguredSupabase();

  const customOrderPayload = {
    user_id: entry.userId || null,
    user_email: entry.userEmail || null,
    name: entry.name,
    email: entry.email,
    phone: entry.phone || null,
    shoe_type: entry.shoeType,
    size: entry.size || null,
    preferred_colors: entry.preferredColors || null,
    material: entry.material || null,
    budget_range: entry.budgetRange || null,
    delivery_timeline: entry.deliveryTimeline || null,
    inspiration_url: entry.inspirationUrl || null,
    design_notes: entry.designNotes,
    status: 'pending',
    created_at: entry.createdAt,
    updated_at: entry.createdAt,
  };

  const { error } = await client.from('custom_orders').insert(customOrderPayload);
  if (!error) return;

  if (!isSchemaError(error)) {
    throw new Error(normalizeError(error, 'Unable to submit custom order request right now.'));
  }

  // Fallback path until custom_orders table is created in Supabase.
  await insertContactMessageToSupabase({
    userId: entry.userId,
    userEmail: entry.userEmail,
    topic: 'Custom Order Request',
    name: entry.name,
    email: entry.email,
    message: [
      `Shoe Type: ${entry.shoeType || '-'}`,
      `Size: ${entry.size || '-'}`,
      `Preferred Colors: ${entry.preferredColors || '-'}`,
      `Material: ${entry.material || '-'}`,
      `Budget Range: ${entry.budgetRange || '-'}`,
      `Delivery Timeline: ${entry.deliveryTimeline || '-'}`,
      `Inspiration URL: ${entry.inspirationUrl || '-'}`,
      `Phone: ${entry.phone || '-'}`,
      `Design Notes: ${entry.designNotes || '-'}`,
    ].join('\n'),
    createdAt: entry.createdAt,
  });
};

const insertOrderToSupabase = async (entry) => {
  const client = requireConfiguredSupabase();
  const attempts = [
    {
      payload: {
        order_id: entry.orderId,
        user_id: entry.userId || null,
        user_email: entry.userEmail || null,
        items: entry.items,
        total: entry.total,
        status: entry.status,
        created_at: entry.createdAt,
        updated_at: entry.updatedAt,
      },
    },
    {
      payload: {
        orderId: entry.orderId,
        userId: entry.userId || null,
        userEmail: entry.userEmail || null,
        items: entry.items,
        total: entry.total,
        status: entry.status,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
    },
  ];

  let lastError = null;
  for (const attempt of attempts) {
    const { error } = await client.from('orders').insert(attempt.payload);
    if (!error) return;
    lastError = error;
    if (!isSchemaError(error)) {
      throw new Error(normalizeError(error, 'Unable to create order right now.'));
    }
  }

  throw new Error(normalizeError(lastError, 'Unable to create order right now.'));
};

const queryUserOrdersFromSupabase = async (userId, userEmail = '') => {
  const client = requireConfiguredSupabase();
  const entries = new Map();
  const idChecks = [
    { column: 'user_id', value: userId },
    { column: 'userId', value: userId },
  ];

  for (const check of idChecks) {
    const { data, error } = await client.from('orders').select('*').eq(check.column, check.value);
    if (error) {
      if (isSchemaError(error)) continue;
      throw new Error(normalizeError(error, 'Unable to load orders right now.'));
    }
    for (const row of data || []) {
      const normalized = normalizeOrder(row);
      entries.set(normalized.id || normalized.orderId, normalized);
    }
  }

  if (entries.size === 0 && userEmail) {
    const emailChecks = [
      { column: 'user_email', value: userEmail },
      { column: 'userEmail', value: userEmail },
    ];

    for (const check of emailChecks) {
      const { data, error } = await client.from('orders').select('*').eq(check.column, check.value);
      if (error) {
        if (isSchemaError(error)) continue;
        throw new Error(normalizeError(error, 'Unable to load orders right now.'));
      }
      for (const row of data || []) {
        const normalized = normalizeOrder(row);
        entries.set(normalized.id || normalized.orderId, normalized);
      }
    }
  }

  return Array.from(entries.values()).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
};

const queryOrderByIdFromSupabase = async (orderId) => {
  const client = requireConfiguredSupabase();
  const lookups = [
    { column: 'order_id', value: orderId },
    { column: 'orderId', value: orderId },
    { column: 'id', value: orderId },
  ];

  for (const lookup of lookups) {
    const { data, error } = await client
      .from('orders')
      .select('*')
      .eq(lookup.column, lookup.value)
      .limit(1);

    if (error) {
      if (isSchemaError(error)) continue;
      throw new Error(normalizeError(error, 'Unable to check order status.'));
    }

    if (Array.isArray(data) && data.length > 0) {
      return normalizeOrder(data[0]);
    }
  }

  return null;
};

export async function submitFeedback(payload = {}) {
  const message = String(payload.message || '').trim();
  if (message.length < 10) {
    throw new Error('Feedback message must be at least 10 characters.');
  }

  const entry = withId({
    userId: payload.userId || '',
    userEmail: payload.userEmail || '',
    subject: String(payload.subject || 'General Feedback'),
    message,
    rating: Number(payload.rating) || 0,
    orderId: String(payload.orderId || '').trim(),
    createdAt: new Date().toISOString(),
  });

  const client = requireConfiguredSupabase();
  const { error } = await client.from('feedback').insert({
    user_id: entry.userId || null,
    user_email: entry.userEmail || null,
    subject: entry.subject,
    message: entry.message,
    rating: entry.rating,
    order_id: entry.orderId || null,
    created_at: entry.createdAt,
  });

  if (error) {
    throw new Error(normalizeError(error, 'Unable to submit feedback right now.'));
  }

  return entry;
}

export async function submitContactMessage(payload = {}) {
  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim();
  const message = String(payload.message || '').trim();

  if (!name || !email || message.length < 10) {
    throw new Error('Name, email, and a detailed message are required.');
  }

  const entry = withId({
    userId: payload.userId || '',
    userEmail: payload.userEmail || '',
    topic: String(payload.topic || 'General Inquiry'),
    name,
    email,
    message,
    createdAt: new Date().toISOString(),
  });

  await insertContactMessageToSupabase(entry);
  return entry;
}

export async function submitCustomOrderRequest(payload = {}) {
  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim();
  const shoeType = String(payload.shoeType || '').trim();
  const designNotes = String(payload.designNotes || '').trim();

  if (!name || !email || !shoeType || designNotes.length < 20) {
    throw new Error('Name, email, shoe type, and design details are required.');
  }

  const entry = withId({
    userId: String(payload.userId || '').trim(),
    userEmail: String(payload.userEmail || '').trim(),
    name,
    email,
    phone: String(payload.phone || '').trim(),
    shoeType,
    size: String(payload.size || '').trim(),
    preferredColors: String(payload.preferredColors || '').trim(),
    material: String(payload.material || '').trim(),
    budgetRange: String(payload.budgetRange || '').trim(),
    deliveryTimeline: String(payload.deliveryTimeline || '').trim(),
    inspirationUrl: String(payload.inspirationUrl || '').trim(),
    designNotes,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  await insertCustomOrderToSupabase(entry);
  return entry;
}

export async function submitProductRating(payload = {}) {
  const productId = String(payload.productId || '').trim();
  const userId = String(payload.userId || '').trim();
  const userEmail = String(payload.userEmail || '').trim();
  const rating = Number(payload.rating);
  const reviewText = String(payload.reviewText || '').trim();

  if (!productId || !userId) {
    throw new Error('Product and user information are required.');
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error('Please select a rating between 1 and 5.');
  }

  await saveRatingToSupabase({ productId, userId, userEmail, rating, reviewText });
  return getProductRatingStats(productId);
}

export async function getProductRatingStats(productId) {
  const targetId = String(productId || '').trim();
  if (!targetId) {
    return { averageRating: 0, ratingCount: 0, ratings: [] };
  }

  const ratings = await queryRatingsFromSupabase(targetId);
  return buildRatingStats(ratings);
}

const generateOrderId = () => {
  const token = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `SX-${token}-${suffix}`;
};

export async function createOrder(payload = {}) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) {
    throw new Error('Order cannot be created without items.');
  }

  const total = Number(payload.total || 0);
  const orderId = String(payload.orderId || generateOrderId());
  const now = new Date().toISOString();

  const entry = normalizeOrder({
    id: orderId,
    orderId,
    userId: payload.userId || '',
    userEmail: payload.userEmail || '',
    items: items.map((item) => ({
      name: String(item.name || '').trim(),
      qty: Number(item.qty) || 1,
      price: Number(item.price) || 0,
    })),
    total,
    status: 'Order Placed',
    createdAt: now,
    updatedAt: now,
  });

  await insertOrderToSupabase(entry);
  return entry;
}

export async function getUserOrders(userId, userEmail = '') {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) return [];
  return queryUserOrdersFromSupabase(normalizedUserId, userEmail);
}

export async function getOrderById(orderId, userId = '', userEmail = '') {
  const normalizedOrderId = String(orderId || '').trim();
  const normalizedUserId = String(userId || '').trim();
  const normalizedUserEmail = String(userEmail || '').trim().toLowerCase();
  if (!normalizedOrderId) return null;

  const remoteOrder = await queryOrderByIdFromSupabase(normalizedOrderId);
  if (!remoteOrder) return null;

  const byUserId = String(remoteOrder.userId) === normalizedUserId;
  const byEmail =
    Boolean(normalizedUserEmail) &&
    String(remoteOrder.userEmail || '').trim().toLowerCase() === normalizedUserEmail;

  if (!normalizedUserId || byUserId || byEmail) {
    return remoteOrder;
  }

  return null;
}
