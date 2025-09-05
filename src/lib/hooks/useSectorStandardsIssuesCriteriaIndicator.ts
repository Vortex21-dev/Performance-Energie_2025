import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';

interface SectorStandardIssueCriteriaIndicator {
  indicator_name: string;
  criteria_name: string;
  unit: string;
  created_at: string;
}

interface Indicator {
  code: string;
  name: string;
  description: string | null;
  unit: string | null;
  frequence?: string;
  formule: string | null;
  frequency: string | null;
}

export function useSectorStandardsIssuesCriteriaIndicator(
  sectorName: string | null, 
  energyTypes: string[],
  standardNames: string[],
  issueNames: string[],
  criteriaNames: string[],
  refreshTrigger?: string | null
) {
  const [indicators, setIndicators] = useState<SectorStandardIssueCriteriaIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIndicators = useCallback(async () => {
      if (!sectorName || 
          !energyTypes.length || 
          !standardNames.length || 
          !issueNames.length || 
          !criteriaNames.length) {
        setIndicators([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Get the indicator codes from sector_standards_issues_criteria_indicator (singular)
        const { data: standardsData, error: standardsError } = await supabase
          .from('sector_standards_issues_criteria_indicators')
          .select('criteria_name, indicator_codes, created_at, unit')
          .eq('sector_name', sectorName)
          .eq('energy_type_name', energyTypes[0])
          .eq('standard_name', standardNames[0]);

        if (standardsError) throw standardsError;
        if (!standardsData?.length) {
          setIndicators([]);
          return;
        }

        // Get all unique indicator codes
        const allIndicatorCodes = Array.from(new Set(
          standardsData.flatMap(item => item.indicator_codes || [])
        ));

        if (!allIndicatorCodes.length) {
          setIndicators([]);
          return;
        }

        // Get the indicator details from the indicators table
        const { data: indicatorDetails, error: detailsError } = await supabase
          .from('indicators')
          .select('code, name')
          .in('code', allIndicatorCodes);

        if (detailsError) throw detailsError;
        if (!indicatorDetails) {
          setIndicators([]);
          return;
        }

        // Map the indicator codes to their details and criteria names
        const formattedIndicators = standardsData.flatMap(item => {
          return (item.indicator_codes || []).map(indicatorCode => {
            const indicatorDetail = indicatorDetails.find(detail => detail.code === indicatorCode);
            if (!indicatorDetail) return null;

            return {
              indicator_name: indicatorDetail.name,
              criteria_name: item.criteria_name,
              unit: item.unit || '',
              created_at: item.created_at
            };
          }).filter((indicator): indicator is SectorStandardIssueCriteriaIndicator => indicator !== null);
        });

        setIndicators(formattedIndicators);
      } catch (err: any) {
        console.error('Error fetching indicators:', err.message);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
  }, [sectorName, energyTypes, standardNames, issueNames, criteriaNames]);

  useEffect(() => {
    fetchIndicators();
  }, [fetchIndicators, refreshTrigger]);

  return { indicators, isLoading, error, refetch: fetchIndicators };
}