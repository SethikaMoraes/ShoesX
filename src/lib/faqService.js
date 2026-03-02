import { requireSupabase } from './supabase';

const FAQ_COLUMNS = 'id,question,answer,is_published,sort_order,created_at,updated_at';

const normalizeFaq = (row) => ({
  id: row.id,
  question: row.question || '',
  answer: row.answer || '',
  isPublished: Boolean(row.is_published),
  sortOrder: Number(row.sort_order || 0),
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null,
});

const cleanSearch = (value) => String(value || '').trim().replaceAll(',', ' ');

export async function getAdminFaqs(searchTerm = '') {
  const client = requireSupabase();
  const search = cleanSearch(searchTerm);

  let query = client
    .from('faqs')
    .select(FAQ_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (search) {
    query = query.or(`question.ilike.%${search}%,answer.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Unable to load FAQs.');
  }

  return (data || []).map(normalizeFaq);
}

export async function createFaq(payload) {
  const client = requireSupabase();

  const question = String(payload?.question || '').trim();
  const answer = String(payload?.answer || '').trim();

  if (!question || !answer) {
    throw new Error('Question and answer are required.');
  }

  const { data, error } = await client
    .from('faqs')
    .insert({
      question,
      answer,
      is_published: Boolean(payload?.isPublished ?? true),
      sort_order: Number(payload?.sortOrder || 0),
    })
    .select(FAQ_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to create FAQ.');
  }

  return normalizeFaq(data);
}

export async function updateFaq(id, payload) {
  const client = requireSupabase();

  if (!id) {
    throw new Error('FAQ id is required.');
  }

  const question = String(payload?.question || '').trim();
  const answer = String(payload?.answer || '').trim();

  if (!question || !answer) {
    throw new Error('Question and answer are required.');
  }

  const { data, error } = await client
    .from('faqs')
    .update({
      question,
      answer,
      is_published: Boolean(payload?.isPublished ?? true),
      sort_order: Number(payload?.sortOrder || 0),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(FAQ_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to update FAQ.');
  }

  return normalizeFaq(data);
}

export async function deleteFaq(id) {
  const client = requireSupabase();

  if (!id) {
    throw new Error('FAQ id is required.');
  }

  const { error } = await client.from('faqs').delete().eq('id', id);
  if (error) {
    throw new Error(error.message || 'Unable to delete FAQ.');
  }
}

export async function getPublishedFaqs() {
  const client = requireSupabase();

  const { data, error } = await client
    .from('faqs')
    .select('id,question,answer,sort_order,created_at')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Unable to load FAQ content.');
  }

  return (data || []).map((row) => ({
    id: row.id,
    question: row.question || '',
    answer: row.answer || '',
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at || null,
  }));
}
