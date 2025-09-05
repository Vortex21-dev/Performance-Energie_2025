import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';

interface Sector {
  name: string;
  created_at: string;
}

export function useSectors() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSectors = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('sectors')
        .select('name, created_at')
        .order('name');

      if (error) {
        throw error;
      }

      setSectors(data || []);
    } catch (err: any) {
      console.error('Error fetching sectors:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSectors();
  }, [fetchSectors]);

  return { sectors, isLoading, error, refetch: fetchSectors };
}