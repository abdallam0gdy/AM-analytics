import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchFromSupabase, isSupabaseConfigured } from '../lib/supabase';

// Simple helper for deep comparison of objects
function isDeepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  for (const key of keys1) {
    if (!keys2.includes(key) || !isDeepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }
  return true;
}

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
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Keep a reference-stable copy of options by only updating it on deep inequality
  const optionsRef = useRef(options);
  if (!isDeepEqual(optionsRef.current, options)) {
    optionsRef.current = options;
  }

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      
      const result = await fetchFromSupabase(table, optionsRef.current, fallbackData);

      if (active) {
        setData(result.data || fallbackData);
        setError(result.error);
        setIsLocal(result.isLocal);
        setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [table, optionsRef.current, refetchTrigger]);

  return { data, loading, error, isLocal, refetch };
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

