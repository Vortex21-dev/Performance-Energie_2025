import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';

interface EnergyType {
  name: string;
  sector_name: string;
  created_at: string;
}

export function useEnergyTypes(sectorName: string | null) {
  const [energyTypes, setEnergyTypes] = useState<EnergyType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnergyTypes = useCallback(async () => {
    if (!sectorName) {
      setEnergyTypes([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('energy_types')
        .select('*')
        .eq('sector_name', sectorName)
        .order('name');

      if (error) throw error;

      setEnergyTypes(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [sectorName]);

  useEffect(() => {
    fetchEnergyTypes();

    // Subscribe to changes
    const channel = supabase
      .channel('energy_types_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'energy_types',
          filter: `sector_name=eq.${sectorName}`
        },
        () => {
          fetchEnergyTypes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sectorName, fetchEnergyTypes]);

  return { energyTypes, isLoading, error, refetch: fetchEnergyTypes };
}