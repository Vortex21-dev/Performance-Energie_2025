import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';

interface SectorStandard {
  sector_name: string;
  energy_type_name: string;
  standard_codes: string[];
  created_at: string;
}

export function useSectorStandards(sectorName: string | null, energyTypes: string[]) {
  const [standards, setStandards] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStandards = useCallback(async () => {
    if (!sectorName || !energyTypes.length) {
      setStandards([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: standardsError } = await supabase
        .from('sector_standards')
        .select('standard_codes')
        .eq('sector_name', sectorName)
        .eq('energy_type_name', energyTypes[0]);

      if (standardsError) throw standardsError;

      // Extract standard codes from all results and flatten them into a single array
      const standardCodes = data?.flatMap(item => item.standard_codes || []) || [];
      setStandards(standardCodes);
    } catch (err: any) {
      console.error('Error fetching standards:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [sectorName, energyTypes]);

  useEffect(() => {
    fetchStandards();
  }, [fetchStandards]);

  return { standards, isLoading, error, refetch: fetchStandards };
}