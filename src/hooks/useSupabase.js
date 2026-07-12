import { useState, useEffect, useCallback } from 'react';
import { fetchFromSupabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Custom hook for fetching data from Supabase with local fallback
 * @param {string} table - Supabase table name
 * @param {object} options - Query options
 * @param {Array} fallbackData - Local data fallback
 */
export function useSupabaseData(table, options = {}, fallbackData = []) {
  const [data, setData] = useState(fallbackData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLocal, setIsLocal] = useState(!isSupabaseConfigured);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await fetchFromSupabase(table, options, fallbackData);

    setData(result.data || fallbackData);
    setError(result.error);
    setIsLocal(result.isLocal);
    setLoading(false);
  }, [table, JSON.stringify(options)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, isLocal, refetch: fetchData };
}

/**
 * Hook to check Supabase connection status
 */
export function useSupabaseStatus() {
  return {
    isConfigured: isSupabaseConfigured,
    statusText: isSupabaseConfigured ? 'متصل بـ Supabase' : 'وضع البيانات المحلية',
    statusColor: isSupabaseConfigured ? 'text-emerald-500' : 'text-amber-500',
  };
}
