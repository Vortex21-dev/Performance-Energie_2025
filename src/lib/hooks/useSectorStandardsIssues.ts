import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';

interface SectorStandardIssue {
  issue_name: string;
  created_at: string;
}

export function useSectorStandardsIssues(
  sectorName: string | null, 
  energyTypes: string[],
  standardNames: string[]
) {
  const [issues, setIssues] = useState<SectorStandardIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    if (!sectorName || !energyTypes.length || !standardNames.length) {
      setIssues([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get the issue_codes from sector_standards_issues
      const { data: issuesData, error: issuesError } = await supabase
        .from('sector_standards_issues')
        .select('issue_codes')
        .eq('sector_name', sectorName)
        .eq('energy_type_name', energyTypes[0])
        .in('standard_name', standardNames);

      if (issuesError) throw issuesError;

      // If no data is returned, set empty issues array and return
      if (!issuesData || issuesData.length === 0) {
        setIssues([]);
        setIsLoading(false);
        return;
      }

      // Combine and deduplicate issue codes from all returned rows
      const uniqueIssueCodes = Array.from(
        new Set(
          issuesData.flatMap(row => row.issue_codes || [])
        )
      );

      if (uniqueIssueCodes.length === 0) {
        setIssues([]);
        setIsLoading(false);
        return;
      }

      // Then fetch the actual issue details from the issues table
      const { data: issueDetails, error: detailsError } = await supabase
        .from('issues')
        .select('name, created_at')
        .in('code', uniqueIssueCodes);

      if (detailsError) throw detailsError;

      // Transform the data to match the expected interface
      const formattedIssues = issueDetails?.map(issue => ({
        issue_name: issue.name,
        created_at: issue.created_at
      })) || [];

      setIssues(formattedIssues);
    } catch (err: any) {
      console.error('Error fetching issues:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [sectorName, energyTypes, standardNames]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  return { issues, isLoading, error, refetch: fetchIssues };
}