import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Layers, 
  Search, 
  Filter, 
  FileText, 
  Loader, 
  AlertTriangle,
  BarChart3,
  Calendar,
  Target,
  Book,
  CheckCircle,
  Zap,
  TrendingUp,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Indicator {
  code: string;
  name: string;
  description: string | null;
  unit: string | null;
  type: string | null;
  formule: string | null;
  frequence?: string;
  processus_code: string;
}

interface IndicatorValue {
  id: string;
  indicator_code: string;
  processus_code: string;
  period_id: string;
  value: number | null;
  organization_name: string;
  site_name: string | null;
  status: 'draft' | 'submitted' | 'validated' | 'rejected';
  comment: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
  collection_period: {
    year: number;
    period_number: number | null;
  } | null;
}

interface Processus {
  code: string;
  name: string;
  description: string | null;
}

interface EnergySector {
  name: string;
}

interface EnergyType {
  name: string;
  sector_name: string;
}

interface Standard {
  code: string;
  name: string;
}

interface Issue {
  code: string;
  name: string;
}

interface Criterion {
  code: string;
  name: string;
}

interface OrganizationSelection {
  sector_name: string;
  energy_type_name: string;
  standard_names: string[];
  issue_names: string[];
  criteria_names: string[];
}

const ProcessIndicatorsPage: React.FC = () => {
  const navigate = useNavigate();
  const { siteName, processCode } = useParams<{ siteName: string; processCode: string }>();
  const { user } = useAuth();
  
  const [processus, setProcessus] = useState<Processus | null>(null);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [indicatorValues, setIndicatorValues] = useState<Record<string, IndicatorValue[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [monthFilter, setMonthFilter] = useState<number | 'all'>(new Date().getMonth() + 1);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  
  // Energy context data
  const [energySector, setEnergySector] = useState<EnergySector | null>(null);
  const [energyType, setEnergyType] = useState<EnergyType | null>(null);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  
  // Indicator values from indicator_values table
  const [indicatorValuesData, setIndicatorValuesData] = useState<IndicatorValue[]>([]);
  
  // Years for filtering
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  
  // Months for display
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  
  useEffect(() => {
    if (user) {
      fetchUserOrganization();
    }
  }, [user]);
  
  useEffect(() => {
    if (processCode && siteName) {
      fetchProcessus();
      fetchIndicators();
    }
  }, [processCode, siteName]);
  
  useEffect(() => {
    if (indicators.length > 0) {
      fetchIndicatorValues();
    }
  }, [indicators, yearFilter]);
  
  useEffect(() => {
    if (organizationName) {
      fetchEnergyContext();
    }
  }, [organizationName]);
  
  const fetchUserOrganization = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('organization_name')
        .eq('email', user.email)
        .single();
      
      if (error) throw error;
      
      if (data?.organization_name) {
        setOrganizationName(data.organization_name);
      }
    } catch (err: any) {
      console.error('Error fetching user organization:', err);
      setError('Erreur lors du chargement des données de l\'organisation');
    }
  };
  
  const fetchProcessus = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('processus')
        .select('*')
        .eq('code', processCode)
        .single();
      
      if (error) throw error;
      
      setProcessus(data);
    } catch (err: any) {
      console.error('Error fetching processus:', err);
      setError('Erreur lors du chargement du processus');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchIndicators = async () => {
    try {
      setIsLoading(true);
      
      // First get the organization's selected indicators
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('organization_name')
        .eq('email', user?.email)
        .single();
      
      if (profileError) throw profileError;
      
      if (!profileData?.organization_name) {
        setIndicators([]);
        return;
      }
      
      const { data: orgSelectionData, error: orgSelectionError } = await supabase
        .from('organization_selections')
        .select('indicator_names')
        .eq('organization_name', profileData.organization_name)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (orgSelectionError && orgSelectionError.code !== 'PGRST116') throw orgSelectionError;
      
      const organizationIndicators = orgSelectionData?.indicator_names || [];
      
      // First get the processus with its indicators array
      const { data: processusData, error: processusError } = await supabase
        .from('processus')
        .select('indicateurs')
        .eq('code', processCode)
        .single();
      
      if (processusError) throw processusError;
      
      // If no indicators array or empty array, set empty indicators
      if (!processusData?.indicateurs || processusData.indicateurs.length === 0) {
        setIndicators([]);
        return;
      }
      
      // Fetch the actual indicator details using the codes from the array
      const { data: indicatorsData, error: indicatorsError } = await supabase
        .from('indicators')
        .select('*')
        .in('code', processusData.indicateurs);
      
      if (indicatorsError) throw indicatorsError;
      
      // Filter indicators to only show those selected by the organization
      const filteredIndicators = (indicatorsData || []).filter(indicator => 
        organizationIndicators.includes(indicator.name)
      );
      
      // Add processus_code to each indicator for compatibility
      const indicatorsWithProcessusCode = filteredIndicators.map(indicator => ({
        ...indicator,
        processus_code: processCode
      }));
      
      setIndicators(indicatorsWithProcessusCode);
    } catch (err: any) {
      console.error('Error fetching indicators:', err);
      setError('Erreur lors du chargement des indicateurs');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchIndicatorValues = async () => {
    try {
      setIsLoading(true);

      const indicatorCodes = indicators.map(ind => ind.code);
      
      if (indicatorCodes.length === 0) {
        setIndicatorValues({});
        setIndicatorValuesData([]);
        return;
      }
      
      // Fetch indicator values from indicator_values table
      const { data: indicatorValuesResult, error: indicatorValuesError } = await supabase
        .from('indicator_values')
        .select(`
          *,
          collection_period:period_id (
            year,
            period_number
          )
        `)
        .in('indicator_code', indicatorCodes)
        .eq('site_name', siteName)
        .order('created_at', { ascending: false });
      
      if (indicatorValuesError) throw indicatorValuesError;
      
      console.log('Indicator values fetched:', indicatorValuesResult);
      setIndicatorValuesData(indicatorValuesResult || []);
      
      // Group values by indicator code
      const valuesByIndicator: Record<string, IndicatorValue[]> = {};
      
      (indicatorValuesResult || []).forEach((value: any) => {
        if (!valuesByIndicator[value.indicator_code]) {
          valuesByIndicator[value.indicator_code] = [];
        }
        valuesByIndicator[value.indicator_code].push(value);
      });
      
      setIndicatorValues(valuesByIndicator);
    } catch (err: any) {
      console.error('Error fetching indicator values:', err);
      setError('Erreur lors du chargement des valeurs d\'indicateurs');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add monthKeys array for mapping
  const monthKeys = [
    'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'
  ];
  
  const fetchEnergyContext = async () => {
    try {
      const { data: selectionData, error: selectionError } = await supabase
        .from('organization_selections')
        .select('*')
        .eq('organization_name', organizationName)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (selectionError && selectionError.code !== 'PGRST116') throw selectionError;
      
      if (selectionData) {
        const { data: sectorData } = await supabase.from('sectors').select('name').eq('name', selectionData.sector_name).single();
        setEnergySector(sectorData || null);
        
        const { data: energyTypeData } = await supabase.from('energy_types').select('name, sector_name').eq('name', selectionData.energy_type_name).eq('sector_name', selectionData.sector_name).single();
        setEnergyType(energyTypeData || null);
        
        if (selectionData.standard_names?.length > 0) {
          const { data: standardsData } = await supabase.from('standards').select('code, name').in('name', selectionData.standard_names);
          setStandards(standardsData || []);
        }
        
        if (selectionData.issue_names?.length > 0) {
          const { data: issuesData } = await supabase.from('issues').select('code, name').in('name', selectionData.issue_names);
          setIssues(issuesData || []);
        }
        
        if (selectionData.criteria_names?.length > 0) {
          const { data: criteriaData } = await supabase.from('criteria').select('code, name').in('name', selectionData.criteria_names);
          setCriteria(criteriaData || []);
        }
      }
    } catch (err: any) {
      console.error('Error fetching energy context:', err);
    }
  };
  
  const toggleRowExpansion = (indicatorCode: string) => {
    setExpandedRows(prev => 
      prev.includes(indicatorCode)
        ? prev.filter(code => code !== indicatorCode)
        : [...prev, indicatorCode]
    );
  };

  const getFilteredIndicatorValue = (indicatorCode: string): IndicatorValue | undefined => {
    const values = indicatorValues[indicatorCode] || [];
    
    // Filter by year first
    const yearValues = values.filter(v => v.collection_period?.year === yearFilter);
    
    if (monthFilter === 'all') {
      // Return the most recent value for the year
      return yearValues.find(v => v.collection_period?.period_number === null) || yearValues[0];
    } else {
      // Return value for specific month
      return yearValues.find(v => v.collection_period?.period_number === monthFilter);
    }
  };
  
  const getIndicatorValuesByYear = (indicatorCode: string, year: number): IndicatorValue[] => {
    const values = indicatorValues[indicatorCode] || [];
    return values.filter(v => v.collection_period?.year === year);
  };
  
  const getIndicatorValueForMonth = (indicatorCode: string, year: number, month: number): number | null => {
    const values = indicatorValues[indicatorCode] || [];
    const monthValue = values.find(v => v.collection_period?.year === year && v.collection_period?.period_number === month);
    return monthValue?.value ?? null;
  };
  
  const calculateVariation = (current: number | null, previous: number | null): string => {
    if (current === null || previous === null || previous === 0) return '-';
    const variation = ((current - previous) / previous) * 100;
    return variation.toFixed(2) + '%';
  };
  
  const filteredIndicators = indicators.filter(indicator => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      indicator.name.toLowerCase().includes(searchLower) ||
      indicator.code.toLowerCase().includes(searchLower) ||
      (indicator.description && indicator.description.toLowerCase().includes(searchLower))
    );
  });

  const getStatusBadge = (status: string | undefined) => {
    const baseClasses = "px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full";
    switch (status) {
      case 'draft': return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Brouillon</span>;
      case 'submitted': return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Soumis</span>;
      case 'validated': return <span className={`${baseClasses} bg-green-100 text-green-800`}>Validé</span>;
      case 'rejected': return <span className={`${baseClasses} bg-red-100 text-red-800`}>Rejeté</span>;
      default: return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>-</span>;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate(`/site/${siteName}`)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <Layers className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{processus?.name || 'Processus'}</h1>
                  <p className="text-gray-600 text-sm">Site: {siteName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-white rounded-2xl shadow-lg border border-gray-200/80 p-6 mb-8">
          <div className="flex items-center mb-4">
            <Info className="w-6 h-6 text-indigo-500 mr-3" />
            <h2 className="text-xl font-semibold text-gray-800">Contexte Énergétique</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {energySector && <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">{energySector.name}</span>}
            {energyType && <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">{energyType.name}</span>}
            {standards.map(s => <span key={s.code} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">{s.name}</span>)}
            {issues.map(i => <span key={i.code} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">{i.name}</span>)}
            {criteria.map(c => <span key={c.code} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">{c.name}</span>)}
          </div>
        </motion.div>
        
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/80 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <select value={yearFilter} onChange={(e) => setYearFilter(parseInt(e.target.value))} className="appearance-none w-full bg-gray-50 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                  {years.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              <div className="relative">
                <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))} className="appearance-none w-full bg-gray-50 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                  <option value="all">Toute l'année</option>
                  {months.map((month, index) => <option key={index} value={index + 1}>{month}</option>)}
                </select>
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>
            <div className="relative">
              <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full md:w-64 bg-gray-50 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/80 overflow-hidden">
          <div className="p-6">
            {isLoading ? <div className="flex justify-center py-8"><Loader className="w-8 h-8 animate-spin text-indigo-500" /></div>
            : error ? <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg"><div className="flex"><div className="flex-shrink-0"><AlertTriangle className="h-5 w-5 text-red-400" /></div><div className="ml-3"><p className="text-sm text-red-700">{error}</p></div></div></div>
            : filteredIndicators.length === 0 ? <div className="text-center py-12"><FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-800 mb-2">Aucun indicateur trouvé</h3><p className="text-gray-500 max-w-md mx-auto">{searchQuery ? "Aucun indicateur ne correspond à votre recherche." : "Aucun indicateur n'est associé à ce processus."}</p></div>
            : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="w-12"></th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Indicateur</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Valeur</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Unité</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Période</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Soumis par</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Validé par</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date de soumission</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredIndicators.map((indicator) => {
                      const isExpanded = expandedRows.includes(indicator.code);
                      const indicatorValue = getFilteredIndicatorValue(indicator.code);
                      const yearValues = getIndicatorValuesByYear(indicator.code, yearFilter);
                      
                      return (
                        <React.Fragment key={indicator.code}>
                          <tr className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="pl-4 py-4">
                              <button onClick={() => toggleRowExpansion(indicator.code)} className="p-2 rounded-full hover:bg-gray-200">
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                              </button>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              <div className="font-bold">{indicator.name}</div>
                              <div className="text-xs text-gray-500">{indicator.code}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">
                              <div className="font-semibold text-lg">
                                {indicatorValue?.value !== null && indicatorValue?.value !== undefined 
                                  ? indicatorValue.value 
                                  : '-'}
                              </div>
                              {indicatorValue?.value !== null && indicatorValue?.value !== undefined && (
                                <div className="text-xs text-blue-600">
                                  {yearValues.length > 1 && `${yearValues.length} valeurs cette année`}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                              <div className="text-sm text-gray-500">
                                {indicator.unit || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              {getStatusBadge(indicatorValue?.status)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                              {indicatorValue?.collection_period ? (
                                <div>
                                  <div className="font-medium">
                                    {indicatorValue.collection_period.year}
                                  </div>
                                  {indicatorValue.collection_period.period_number && (
                                    <div className="text-xs text-gray-500">
                                      Période {indicatorValue.collection_period.period_number}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{indicatorValue?.submitted_by || '-'}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{indicatorValue?.validated_by || '-'}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{indicatorValue?.submitted_at ? new Date(indicatorValue.submitted_at).toLocaleDateString() : '-'}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-gray-50">
                              <td colSpan={7} className="p-4">
                                <div className="space-y-6">
                                  {/* Informations détaillées */}
                                  <div className="bg-white p-4 rounded-lg border">
                                    <h4 className="font-semibold mb-3 text-gray-800">Informations de l'indicateur</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div className="bg-blue-50 p-3 rounded-lg">
                                        <div className="text-sm font-medium text-blue-800">Code</div>
                                        <div className="text-blue-900">{indicator.code}</div>
                                      </div>
                                      <div className="bg-green-50 p-3 rounded-lg">
                                        <div className="text-sm font-medium text-green-800">Nom</div>
                                        <div className="text-green-900">{indicator.name}</div>
                                      </div>
                                      <div className="bg-purple-50 p-3 rounded-lg">
                                        <div className="text-sm font-medium text-purple-800">Unité</div>
                                        <div className="text-purple-900">{indicator.unit || 'Non définie'}</div>
                                      </div>
                                    </div>
                                    {indicator.description && (
                                      <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                                        <div className="text-sm font-medium text-gray-800">Description</div>
                                        <div className="text-gray-900">{indicator.description}</div>
                                      </div>
                                    )}
                                    {indicator.formule && (
                                      <div className="mt-4 bg-amber-50 p-3 rounded-lg">
                                        <div className="text-sm font-medium text-amber-800">Formule de calcul</div>
                                        <div className="text-amber-900 font-mono text-sm">{indicator.formule}</div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Historique des valeurs */}
                                  <div className="bg-white p-4 rounded-lg border">
                                    <h4 className="font-semibold mb-3 text-gray-800">Historique des valeurs</h4>
                                    {yearValues.length > 0 ? (
                                      <div className="overflow-x-auto">
                                        <table className="min-w-full">
                                          <thead className="bg-gray-50">
                                            <tr>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Valeur</th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Période</th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Soumis par</th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Commentaire</th>
                                            </tr>
                                          </thead>
                                          <tbody className="bg-white divide-y divide-gray-200">
                                            {yearValues.map((value, index) => (
                                              <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                                  {value.value !== null ? value.value : '-'}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-600">
                                                  {value.collection_period?.year || '-'}
                                                  {value.collection_period?.period_number && ` - P${value.collection_period.period_number}`}
                                                </td>
                                                <td className="px-4 py-2">
                                                  {getStatusBadge(value.status)}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-600">
                                                  {value.submitted_by || '-'}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-600">
                                                  {value.submitted_at ? new Date(value.submitted_at).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-600">
                                                  {value.comment || '-'}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <div className="text-center py-4">
                                        <p className="text-gray-500">Aucune valeur enregistrée pour cet indicateur</p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Évolution des valeurs */}
                                  {yearValues.length > 1 && (
                                    <div className="bg-white p-4 rounded-lg border">
                                      <h4 className="font-semibold mb-3 text-gray-800">Évolution des valeurs</h4>
                                      <div className="h-32 flex items-end justify-between space-x-1">
                                        {yearValues
                                          .sort((a, b) => {
                                            const aDate = new Date(a.created_at);
                                            const bDate = new Date(b.created_at);
                                            return aDate.getTime() - bDate.getTime();
                                          })
                                          .map((value, index) => {
                                            const maxValue = Math.max(...yearValues.map(v => v.value || 0));
                                            const height = value.value && maxValue > 0 ? (value.value / maxValue) * 100 : 0;
                                            
                                            return (
                                              <div key={index} className="flex-1 flex flex-col items-center">
                                                <div 
                                                  className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                                                  style={{ height: `${height}%`, minHeight: value.value !== null ? '4px' : '0px' }}
                                                  title={`Valeur: ${value.value !== null ? value.value : 'N/A'} - ${new Date(value.created_at).toLocaleDateString()}`}
                                                />
                                                <div className="text-xs text-gray-600 mt-2 text-center">
                                                  {new Date(value.created_at).toLocaleDateString('fr-FR', { 
                                                    day: '2-digit', 
                                                    month: '2-digit' 
                                                  })}
                                                </div>
                                              </div>
                                            );
                                          })}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Statistiques */}
                                  {yearValues.length > 0 && (
                                    <div className="bg-white p-4 rounded-lg border">
                                      <h4 className="font-semibold mb-3 text-gray-800">Statistiques</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="bg-blue-50 p-3 rounded-lg">
                                          <div className="text-sm font-medium text-blue-800">Total des valeurs</div>
                                          <div className="text-blue-900 text-lg font-bold">{yearValues.length}</div>
                                        </div>
                                        <div className="bg-green-50 p-3 rounded-lg">
                                          <div className="text-sm font-medium text-green-800">Valeurs validées</div>
                                          <div className="text-green-900 text-lg font-bold">
                                            {yearValues.filter(v => v.status === 'validated').length}
                                          </div>
                                        </div>
                                        <div className="bg-yellow-50 p-3 rounded-lg">
                                          <div className="text-sm font-medium text-yellow-800">En attente</div>
                                          <div className="text-yellow-900 text-lg font-bold">
                                            {yearValues.filter(v => v.status === 'submitted').length}
                                          </div>
                                        </div>
                                        <div className="bg-purple-50 p-3 rounded-lg">
                                          <div className="text-sm font-medium text-purple-800">Dernière valeur</div>
                                          <div className="text-purple-900 text-lg font-bold">
                                            {yearValues[0]?.value !== null ? yearValues[0]?.value : '-'}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0"><HelpCircle className="h-5 w-5 text-blue-400" /></div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Suivi des indicateurs</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Ce tableau présente les indicateurs de performance énergétique (IPE) avec leurs valeurs de la table indicator_values. Cliquez sur la flèche pour voir l'historique complet des valeurs.</p>
                <p className="mt-1">Les données proviennent directement de la table indicator_values qui contient les valeurs soumises et validées par les contributeurs.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProcessIndicatorsPage;
