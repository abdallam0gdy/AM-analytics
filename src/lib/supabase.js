import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Create client only if configured
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Fetch data from Supabase table with fallback to local data
 * @param {string} table - Table name
 * @param {object} options - Query options { select, filters, orderBy, limit }
 * @param {Array} fallbackData - Local data to use when Supabase is not connected
 */
export async function fetchFromSupabase(table, options = {}, fallbackData = []) {
  if (!isSupabaseConfigured || !supabase) {
    console.info(`[AM Analytics] Supabase غير متصل - استخدام البيانات المحلية لـ ${table}`);
    return { data: fallbackData, error: null, isLocal: true };
  }

  try {
    let query = supabase.from(table).select(options.select || '*');

    if (options.filters) {
      for (const [column, value] of Object.entries(options.filters)) {
        query = query.eq(column, value);
      }
    }

    if (options.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? false,
      });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.warn(`[AM Analytics] خطأ في جلب ${table}:`, error.message);
      return { data: fallbackData, error, isLocal: true };
    }

    return { data, error: null, isLocal: false };
  } catch (err) {
    console.warn(`[AM Analytics] استثناء في الاتصال بـ Supabase:`, err.message);
    return { data: fallbackData, error: err, isLocal: true };
  }
}

/**
 * Insert data into Supabase table
 */
export async function insertToSupabase(table, data) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase غير متصل') };
  }

  return await supabase.from(table).insert(data).select();
}

/**
 * Update data in Supabase table
 */
export async function updateInSupabase(table, id, data) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase غير متصل') };
  }

  return await supabase.from(table).update(data).eq('id', id).select();
}
