import { hasSupabaseConfig, requireSupabase } from '../lib/supabase';

// Compatibility module name: previously Firestore profile helpers.
// This service now uses Supabase only (no localStorage fallback).

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

const normalizeMeasurements = (value) => ({
  gender: String(value?.gender || ''),
  length: Number(value?.length) || 0,
  width: Number(value?.width) || 0,
  preferredFit: String(value?.preferredFit || value?.preferred_fit || 'regular'),
  updatedAt: value?.updatedAt || value?.updated_at || new Date().toISOString(),
});

const getClient = () => {
  if (!hasSupabaseConfig) {
    throw new Error('Supabase is not configured.');
  }
  return requireSupabase();
};

export async function getUserProfile(uid) {
  if (!uid) throw new Error('A valid user id is required.');
  const client = getClient();

  const { data, error } = await client
    .from('users_profile')
    .select('id,email,username,role,created_at,updated_at')
    .eq('id', uid)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Unable to load user profile.');
  }

  if (!data) return null;

  return {
    id: data.id,
    email: data.email || '',
    username: data.username || '',
    role: data.role || 'user',
    createdAt: data.created_at || null,
    updatedAt: data.updated_at || null,
  };
}

export async function saveUserProfile(uid, profile) {
  if (!uid) throw new Error('A valid user id is required.');
  const client = getClient();

  const payload = {
    ...(profile || {}),
    updatedAt: new Date().toISOString(),
  };

  const username =
    String(payload.username || payload.displayName || '').trim() ||
    String(payload.email || '').split('@')[0] ||
    'User';

  const { error } = await client.from('users_profile').upsert(
    {
      id: uid,
      email: String(payload.email || '').trim() || null,
      username,
      role: String(payload.role || '').trim() === 'admin' ? 'admin' : 'user',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw new Error(error.message || 'Unable to save user profile.');
  }
}

export async function getUserMeasurements(uid) {
  if (!uid) throw new Error('A valid user id is required.');
  const client = getClient();

  // Primary: users_profile.measurements JSON field.
  const profileQuery = await client
    .from('users_profile')
    .select('measurements')
    .eq('id', uid)
    .maybeSingle();

  if (!profileQuery.error && profileQuery.data?.measurements) {
    return normalizeMeasurements(profileQuery.data.measurements);
  }

  // Secondary: user_measurements table fallback.
  const measurementsQuery = await client
    .from('user_measurements')
    .select('user_id,gender,length,width,preferred_fit,updated_at')
    .eq('user_id', uid)
    .maybeSingle();

  if (!measurementsQuery.error && measurementsQuery.data) {
    return normalizeMeasurements(measurementsQuery.data);
  }

  if (profileQuery.error && !isSchemaError(profileQuery.error)) {
    throw new Error(profileQuery.error.message || 'Unable to load measurements.');
  }

  if (measurementsQuery.error && !isSchemaError(measurementsQuery.error)) {
    throw new Error(measurementsQuery.error.message || 'Unable to load measurements.');
  }

  return null;
}

export async function saveUserMeasurements(uid, measurements) {
  if (!uid) throw new Error('A valid user id is required.');
  const client = getClient();
  const normalized = normalizeMeasurements(measurements);
  const now = new Date().toISOString();

  const profileUpdate = await client
    .from('users_profile')
    .update({
      measurements: {
        ...normalized,
        updatedAt: now,
      },
      updated_at: now,
    })
    .eq('id', uid);

  if (!profileUpdate.error) return;

  if (!isSchemaError(profileUpdate.error)) {
    throw new Error(profileUpdate.error.message || 'Unable to save measurements.');
  }

  const tableFallback = await client.from('user_measurements').upsert(
    {
      user_id: uid,
      gender: normalized.gender,
      length: normalized.length,
      width: normalized.width,
      preferred_fit: normalized.preferredFit,
      updated_at: now,
    },
    { onConflict: 'user_id' },
  );

  if (tableFallback.error) {
    throw new Error(tableFallback.error.message || 'Unable to save measurements.');
  }
}
