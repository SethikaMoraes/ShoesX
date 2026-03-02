import { requireSupabase } from './supabase';

const BASE_COLUMNS = 'id,email,username,role,created_at';
const EXTENDED_COLUMNS = `${BASE_COLUMNS},disabled`;

const normalizeRole = (value) => (value === 'admin' ? 'admin' : 'user');

const normalizeUser = (row) => ({
  id: row.id,
  email: row.email || '',
  username: row.username || (row.email ? row.email.split('@')[0] : 'Unknown'),
  role: normalizeRole(row.role),
  createdAt: row.created_at || null,
  disabled: Boolean(row.disabled),
});

const isMissingDisabledColumnError = (error) =>
  /column/i.test(String(error?.message || '')) && /disabled/i.test(String(error?.message || ''));

const cleanSearch = (value) => String(value || '').trim().replaceAll(',', ' ');

const buildUsersQuery = (client, columns, search) => {
  let query = client.from('users_profile').select(columns).order('created_at', { ascending: false });

  if (search) {
    query = query.or(`email.ilike.%${search}%,username.ilike.%${search}%`);
  }

  return query;
};

export async function getAdminUsers(searchTerm = '') {
  const client = requireSupabase();
  const search = cleanSearch(searchTerm);
  let totalCount = 0;

  const totalResponse = await client
    .from('users_profile')
    .select('id', { count: 'exact', head: true });

  if (!totalResponse.error) {
    totalCount = Number(totalResponse.count || 0);
  }

  let supportsDisable = true;
  let response = await buildUsersQuery(client, EXTENDED_COLUMNS, search);

  if (response.error && isMissingDisabledColumnError(response.error)) {
    supportsDisable = false;
    response = await buildUsersQuery(client, BASE_COLUMNS, search);
  }

  if (response.error) {
    throw new Error(response.error.message || 'Unable to load users.');
  }

  return {
    users: (response.data || []).map(normalizeUser),
    supportsDisable,
    totalCount: Number.isFinite(totalCount) && totalCount > 0 ? totalCount : (response.data || []).length,
  };
}

export async function updateUserRole(userId, nextRole) {
  const client = requireSupabase();
  const role = normalizeRole(nextRole);

  if (!userId) {
    throw new Error('User id is required.');
  }

  const { data, error } = await client
    .from('users_profile')
    .update({ role })
    .eq('id', userId)
    .select(BASE_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to update user role.');
  }

  return normalizeUser(data);
}

export async function setUserDisabled(userId, disabled) {
  const client = requireSupabase();

  if (!userId) {
    throw new Error('User id is required.');
  }

  const { data, error } = await client
    .from('users_profile')
    .update({ disabled: Boolean(disabled) })
    .eq('id', userId)
    .select(EXTENDED_COLUMNS)
    .single();

  if (error) {
    if (isMissingDisabledColumnError(error)) {
      throw new Error('The "disabled" column is missing in users_profile. Run the SQL migration first.');
    }

    throw new Error(error.message || 'Unable to update user status.');
  }

  return normalizeUser(data);
}
