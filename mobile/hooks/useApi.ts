import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ApiError } from '../services/api';

/** Fetch-with-states hook used by every data screen: loading, error, refresh, focus refetch. */
export function useApi<T>(fetcher: () => Promise<T>, options: { refetchOnFocus?: boolean } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      try {
        setData(await fetcher());
        setError(null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetcher],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (options.refetchOnFocus) load('refresh');
    }, [load, options.refetchOnFocus]),
  );

  return { data, loading, refreshing, error, reload: () => load('initial'), refresh: () => load('refresh') };
}
