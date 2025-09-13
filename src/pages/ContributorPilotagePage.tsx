import React, { useState, useEffect } from 'react'; 
import { useNavigate } from 'react-router-dom'; 
import { motion, AnimatePresence } from 'framer-motion'; 
import { PieChart, ArrowLeft, Database, BarChart3, Filter, Search, Edit3, Save, X, CheckCircle, Clock, AlertCircle, FileText, User, Plus, Menu, ChevronDown, ChevronRight, ChevronUp, ChevronLeft, Home, Layers, TrendingUp, Settings, LogOut, ClipboardCheck, MessageSquare, Calendar, Target, AlertTriangle, Gauge, Activity, Zap, Building2, Award, RefreshCw, Eye, Download } from 'lucide-react'; 
import { useAuth } from '../context/AuthContext'; 
import { supabase } from '../lib/supabase';
import { retryWithBackoff } from '../lib/supabase';

interface IndicatorValue { 
  id: string; 
  indicator_code: string; 
  value: number | null; 
  unit: string; 
  status: 'draft' | 'submitted' | 'validated' | 'rejected'; 
  comment: string; 
  processus_code: string; 
  submitted_by: string; 
  validated_by: string | null; 
  created_at: string; 
  updated_at: string; 
  validated_at: string | null; 
  period_id: string; 
  organization_name: string; 
  filiere_name: string; 
  filiale_name: string; 
  site_name: string; 
  processus?: { name: string; description: string; }; 
  collection_period?: { year: number; period_type: string; period_number: number; }; 
  indicator?: { name: string; description: string; unit: string; }; 
}

interface Processus {
  code: string;
  name: string;
  description: string;
  indicateurs: string[];
}

interface UserProcessus { 
  processus_code: string; 
  processus: Processus;
}

interface ProcessusIndicator { 
  processus_code: string; 
  processus_name: string; 
  processus_description: string; 
  indicator_code: string; 
  indicator_name: string; 
  indicator_description: string; 
  indicator_unit: string; 
  indicator_type: string; 
  enjeux: string | null; 
  critere: string | null; 
  existing_value?: IndicatorValue; 
}

interface CollectionPeriod { 
  id: string; 
  organization_name: string; 
  year: number; 
  period_type: string; 
  period_number: number; 
  start_date: string; 
  end_date: string; 
  status: 'open' | 'closed'; 
}

interface AddValueModalProps { 
  isOpen: boolean; 
  onClose: () => void; 
  indicator: ProcessusIndicator; 
  periods: CollectionPeriod[]; 
  onSave: (data: { periodId: string; value: string; comment: string; }) => Promise<void>;
}

// Interfaces from second component 
interface SiteIndicatorValue { 
  id: string; 
  site_name: string; 
  year: number; 
  code: string; 
  axe_energetique: string | null; 
  enjeux: string | null; 
  normes: string | null; 
  critere: string | null; 
  indicateur: string | null; 
  definition: string | null; 
  processus: string | null; 
  processus_code: string | null; 
  frequence: string | null; 
  unite: string | null; 
  type: string | null; 
  formule: string | null; 
  value: number | null; 
  valeur_precedente: number | null; 
  cible: number | null; 
  variation: string | null; 
  variations_pourcent: number | null; 
  performances_pourcent: number | null; 
  janvier: number | null; 
  fevrier: number | null; 
  mars: number | null; 
  avril: number | null; 
  mai: number | null; 
  juin: number | null; 
  juillet: number | null; 
  aout: number | null; 
  septembre: number | null; 
  octobre: number | null; 
  novembre: number | null; 
  decembre: number | null; 
  perf_janvier: number | null; 
  perf_fevrier: number | null; 
  perf_mars: number | null; 
  perf_avril: number | null; 
  perf_mai: number | null; 
  perf_juin: number | null; 
  perf_juillet: number | null; 
  perf_aout: number | null; 
  perf_septembre: number | null; 
  perf_octobre: number | null; 
  perf_novembre: number | null; 
  perf_decembre: number | null; 
  created_at: string; 
  updated_at: string; 
}

interface DashboardStats { 
  totalIndicators: number; 
  indicatorsWithValues: number; 
  averagePerformance: number; 
  topPerformingIndicator: string | null; 
}

const AddValueModal: React.FC<AddValueModalProps> = ({ 
  isOpen, 
  onClose, 
  indicator, 
  periods, 
  onSave 
}) => { 
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(''); 
  const [value, setValue] = useState<string>(''); 
  const [comment, setComment] = useState<string>(''); 
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); 
  const [error, setError] = useState<string | null>(null); 

  useEffect(() => { 
    if (isOpen && periods.length > 0) { 
      const currentDate = new Date(); 
      const currentYear = currentDate.getFullYear(); 
      const currentMonth = currentDate.getMonth() + 1;

      const currentPeriod = periods.find(p => 
        p.year === currentYear &&
        p.period_type === 'month' &&
        p.period_number === currentMonth &&
        p.status === 'open'
      );

      if (currentPeriod) {
        setSelectedPeriodId(currentPeriod.id);
      } else if (periods.length > 0) {
        setSelectedPeriodId(periods[0].id);
      }
    }
  }, [isOpen, periods]);

  const sortedPeriods = [...periods].sort((a, b) => { 
    const currentDate = new Date(); 
    const currentYear = currentDate.getFullYear(); 
    const currentMonth = currentDate.getMonth() + 1;

    const isACurrent = a.year === currentYear && a.period_type === 'month' && a.period_number === currentMonth;
    const isBCurrent = b.year === currentYear && b.period_type === 'month' && b.period_number === currentMonth;

    if (isACurrent) return -1;
    if (isBCurrent) return 1;

    if (a.year !== b.year) return b.year - a.year;
    return b.period_number - a.period_number;
  });

  const handleSubmit = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!selectedPeriodId) { 
      setError("Veuillez sélectionner une période"); 
      return; 
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        periodId: selectedPeriodId,
        value,
        comment
      });
      
      setValue('');
      setComment('');
      onClose();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to get month name from number 
  const getMonthName = (monthNumber: number): string => { 
    const monthNames = [ 
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre' 
    ]; 
    return monthNames[monthNumber - 1] || ''; 
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800">Ajouter une valeur</h2>
                <p className="text-gray-600 text-sm">Indicateur: <span className="font-medium">{indicator.indicator_name}</span></p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div> 
                      <h4 className="font-medium text-gray-900">Période de collecte</h4> 
                    </div>
                    <select
                      id="period"
                      value={selectedPeriodId}
                      onChange={(e) => setSelectedPeriodId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    >
                      <option value="">Sélectionnez une période de collecte</option>
                      {sortedPeriods.map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.period_type === 'month' ? 
                            `${getMonthName(period.period_number)} ${period.year}` : 
                            `${period.period_type} ${period.period_number} - ${period.year}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
                      Valeur {indicator.indicator_unit ? `(${indicator.indicator_unit})` : ''}
                    </label>
                    <input
                      type="number"
                      id="value"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Ex: 42.5"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                      Commentaire (optionnel)
                    </label>
                    <textarea
                      id="comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      rows={3}
                      placeholder="Ajoutez un commentaire..."
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg">
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors rounded-lg"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !selectedPeriodId || !value}
                      className={`
                        px-4 py-2 rounded-lg text-white font-medium
                        transition-all duration-200
                        ${isSubmitting || !selectedPeriodId || !value
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 shadow-md'
                        }
                      `}
                    >
                      {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  ); 
};

const ContributorPilotagePage = () => { 
  const navigate = useNavigate(); 
  const { user } = useAuth(); 
  const [activeTab, setActiveTab] = useState('collecte'); 
  const [userProcessus, setUserProcessus] = useState<UserProcessus[]>([]); 
  const [processusIndicators, setProcessusIndicators] = useState<ProcessusIndicator[]>([]); 
  const [indicatorValues, setIndicatorValues] = useState<IndicatorValue[]>([]); 
  const [userSite, setUserSite] = useState<string | null>(null); 
  const [isLoading, setIsLoading] = useState(true); 
  const [editingIndicator, setEditingIndicator] = useState<string | null>(null); 
  const [editValue, setEditValue] = useState<string>(''); 
  const [editComment, setEditComment] = useState<string>(''); 
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({}); 
  const [organizationName, setOrganizationName] = useState<string>(''); 
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]); 
  const [collectionPeriods, setCollectionPeriods] = useState<CollectionPeriod[]>([]); 
  const [selectedPeriod, setSelectedPeriod] = useState<string>(''); 
  const [selectedProcessus, setSelectedProcessus] = useState<string>(''); 
  const [selectedStatus, setSelectedStatus] = useState<string>(''); 
  const [searchTerm, setSearchTerm] = useState<string>(''); 
  const [selectedProcessusForView, setSelectedProcessusForView] = useState<string>(''); 
  const [addValueModalOpen, setAddValueModalOpen] = useState<boolean>(false); 
  const [selectedIndicatorForAdd, setSelectedIndicatorForAdd] = useState<ProcessusIndicator | null>(null); 
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false); 

  // State for Performance Mensuelle Tab 
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear()); 
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); 

  // Collecte mensuelle state 
  const [monthlyStats, setMonthlyStats] = useState<{ total: number; draft: number; submitted: number; validated: number; rejected: number; performance: number; }>({ total: 0, draft: 0, submitted: 0, validated: 0, rejected: 0, performance: 0 }); 
  const [monthlyIndicators, setMonthlyIndicators] = useState<IndicatorValue[]>([]); 

  // State for Visualisation Tab 
  const [vizIndicators, setVizIndicators] = useState<SiteIndicatorValue[]>([]); 
  const [vizFilteredIndicators, setVizFilteredIndicators] = useState<SiteIndicatorValue[]>([]); 
  const [vizDashboardStats, setVizDashboardStats] = useState<DashboardStats>({ totalIndicators: 0, indicatorsWithValues: 0, averagePerformance: 0, topPerformingIndicator: null }); 
  const [vizSelectedYear, setVizSelectedYear] = useState<number>(new Date().getFullYear()); 
  const [vizSearchQuery, setVizSearchQuery] = useState<string>(''); 
  const [axeFilter, setAxeFilter] = useState<string>('all'); 
  const [enjeuxFilter, setEnjeuxFilter] = useState<string>('all'); 
  const [vizIsLoading, setVizIsLoading] = useState<boolean>(true); 
  const [vizError, setVizError] = useState<string | null>(null); 
  const [vizRefreshing, setVizRefreshing] = useState<boolean>(false); 
  const [expandedVizIndicators, setExpandedVizIndicators] = useState<string[]>([]); 

  const vizYears = [2023, 2024, 2025]; 
  const vizMonths = [ 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre' ];

  // Functions for Visualisation Tab 
  const fetchVizIndicators = async () => { 
    try { 
      setVizIsLoading(true);
      setVizError(null);

      if (!userSite) {
        setVizIndicators([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('site_global_indicator_values_simple')
        .select('*')
        .eq('site_name', userSite)
        .eq('year', vizSelectedYear)
        .order('indicateur');
      
      if (error) throw error;
      
      const indicatorsData = data || [];
      setVizIndicators(indicatorsData);
      calculateVizDashboardStats(indicatorsData);
    } catch (err: any) {
      console.error('Error fetching site indicators for viz tab:', err);
      setVizError('Erreur lors du chargement des indicateurs du site');
    } finally {
      setVizIsLoading(false);
    }
  };

  const calculateVizDashboardStats = (data: SiteIndicatorValue[]) => { 
    const totalIndicators = data.length; 
    const indicatorsWithValues = data.filter(ind => ind.value !== null).length; 
    const performanceValues = data 
      .filter(ind => ind.performances_pourcent !== null)
      .map(ind => ind.performances_pourcent!);

    const averagePerformance = performanceValues.length > 0 
      ? performanceValues.reduce((sum, val) => sum + val, 0) / performanceValues.length
      : 0;

    const topPerforming = data
      .filter(ind => ind.performances_pourcent !== null)
      .sort((a, b) => (b.performances_pourcent || 0) - (a.performances_pourcent || 0))[0];

    setVizDashboardStats({
      totalIndicators,
      indicatorsWithValues,
      averagePerformance,
      topPerformingIndicator: topPerforming?.indicateur || null
    });
  };

  const applyVizFilters = () => { 
    let filtered = [...vizIndicators];

    if (vizSearchQuery) {
      const searchLower = vizSearchQuery.toLowerCase();
      filtered = filtered.filter(ind => 
        (ind.indicateur && ind.indicateur.toLowerCase().includes(searchLower)) ||
        (ind.processus && ind.processus.toLowerCase().includes(searchLower)) ||
        (ind.code && ind.code.toLowerCase().includes(searchLower))
      );
    }

    if (axeFilter !== 'all') {
      filtered = filtered.filter(ind => ind.axe_energetique === axeFilter);
    }

    if (enjeuxFilter !== 'all') {
      filtered = filtered.filter(ind => ind.enjeux === enjeuxFilter);
    }

    setVizFilteredIndicators(filtered);
  };

  const handleVizRefresh = async () => { 
    setVizRefreshing(true); 
    await fetchVizIndicators(); 
    setTimeout(() => setVizRefreshing(false), 1000); 
  };

  const toggleVizIndicatorExpansion = (indicatorId: string) => { 
    setExpandedVizIndicators(prev => prev.includes(indicatorId) ? prev.filter(id => id !== indicatorId) : [...prev, indicatorId] ); 
  };

  const getPerformanceColor = (performance: number | null) => { 
    if (performance === null) return 'text-gray-500'; 
    if (performance >= 90) return 'text-green-600'; 
    if (performance >= 70) return 'text-green-600'; 
    if (performance >= 50) return 'text-green-600'; 
    return 'text-red-600'; 
  };

  const getPerformanceBadge = (performance: number | null) => { 
    if (performance === null) return 'bg-gray-100 text-gray-800'; 
    if (performance >= 90) return 'bg-green-100 text-green-800'; 
    if (performance >= 70) return 'bg-blue-100 text-blue-800'; 
    if (performance >= 50) return 'bg-yellow-100 text-yellow-800'; 
    return 'bg-red-100 text-red-800'; 
  };

  const getVariationIcon = (variation: number | null) => { 
    if (variation === null) return null; 
    if (variation < 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (variation > 0) return <TrendingUp className="w-4 h-4 text-red-500 transform rotate-180" />;
    return null;
  };

  const getUniqueVizValues = (field: keyof SiteIndicatorValue) => { 
    return [...new Set(vizIndicators.map(ind => ind[field]).filter(Boolean))]; 
  };

  const currentYear = new Date().getFullYear(); 
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i); 
  const periodTypes = ['Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'Annual']; 
  const statuses = [ 
    { value: '', label: 'Tous les statuts' }, 
    { value: 'draft', label: 'Brouillon' }, 
    { value: 'submitted', label: 'Soumis' }, 
    { value: 'validated', label: 'Validé' }, 
    { value: 'rejected', label: 'Rejeté' } 
  ];

  useEffect(() => { 
    if (user?.email) { 
      fetchUserOrganization(); 
      fetchUserSite(); 
    } 
  }, [user?.email]);

  useEffect(() => { 
    if (organizationName) { 
      fetchSelectedIndicators(); 
      fetchCollectionPeriods(); 
      fetchUserProcessusAndIndicators(); 
    } 
  }, [organizationName]);

  useEffect(() => { 
    if (userProcessus.length > 0) { 
      fetchIndicatorValues();

      // Set default period if not already set
      if (!selectedPeriod && collectionPeriods.length > 0) {
        // Find current month's period or the most recent one
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
        
        const currentPeriod = collectionPeriods.find(p => 
          p.year === currentYear && 
          p.period_type === 'month' && 
          p.period_number === currentMonth &&
          p.status === 'open'
        );
        
        if (currentPeriod) {
          setSelectedPeriod(currentPeriod.id);
        } else {
          // If no current month period, find the most recent open period
          const openPeriods = collectionPeriods.filter(p => p.status === 'open');
          if (openPeriods.length > 0) {
            // Sort by year and period_number descending
            const sortedPeriods = [...openPeriods].sort((a, b) => {
              if (a.year !== b.year) return b.year - a.year;
              return b.period_number - a.period_number;
            });
            setSelectedPeriod(sortedPeriods[0].id);
          }
        }
      }
    }
  }, [userProcessus, selectedPeriod, selectedProcessus, selectedStatus]);

  useEffect(() => { 
    if (activeTab === 'performance mensuel' && organizationName && userSite) { 
      fetchMonthlyData(); 
    } 
  }, [activeTab, organizationName, userSite, selectedMonth, selectedYear]);

  // useEffects for Visualisation Tab 
  useEffect(() => { 
    if (activeTab === 'visualisation' && userSite) { 
      fetchVizIndicators(); 
    } 
  }, [activeTab, userSite, vizSelectedYear]);

  useEffect(() => { 
    if (activeTab === 'visualisation') { 
      applyVizFilters(); 
    } 
  }, [vizIndicators, vizSearchQuery, axeFilter, enjeuxFilter]);

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
    } catch (err) {
      console.error('Error fetching user organization:', err);
    }
  };

  const fetchUserSite = async () => { 
    try { 
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('site_name')
        .eq('email', user.email)
        .single();
      
      if (error) throw error;
      
      setUserSite(data?.site_name);
    } catch (err) {
      console.error('Error fetching user site:', err);
      // Don't set error state to avoid blocking the main functionality
    }
  };

  const fetchSelectedIndicators = async () => { 
    try { 
      if (!organizationName) return;

      const { data, error } = await supabase
        .from('organization_selections')
        .select('indicator_names')
        .eq('organization_name', organizationName)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('Error fetching selected indicators:', error);
        }
        setSelectedIndicators([]);
        return;
      }
      
      setSelectedIndicators(data.indicator_names || []);
    } catch (err) {
      console.error('Error fetching selected indicators:', err);
      setSelectedIndicators([]);
    }
  };

  const fetchCollectionPeriods = async () => { 
    try { 
      const { data, error } = await supabase 
        .from('collection_periods') 
        .select('*') 
        .eq('organization_name', organizationName) 
        .order('year', { ascending: false }) 
        .order('period_number', { ascending: false });

      if (error) throw error;
      setCollectionPeriods(data || []);
    } catch (err) {
      console.error('Error fetching collection periods:', err);
    }
  };

  const fetchUserProcessusAndIndicators = async () => {
    if (!user?.email || !organizationName) return;

    try {
      setIsLoading(true);

      const { data: userProcessusData, error: processusError } = await supabase
        .from('user_processus')
        .select(`
          processus_code,
          processus:processus_code (
            code,
            name,
            description,
            indicateurs
          )
        `)
        .eq('email', user.email);

      if (processusError) throw processusError;

      if (!userProcessusData || userProcessusData.length === 0) {
        setUserProcessus([]);
        setProcessusIndicators([]);
        setIsLoading(false);
        return;
      }

      const processusData = userProcessusData?.map(item => ({
        processus_code: item.processus_code,
        processus: {
          code: item.processus?.code || '',
          name: item.processus?.name || '',
          description: item.processus?.description || '',
          indicateurs: item.processus?.indicateurs || []
        }
      })) || [];

      setUserProcessus(processusData);

      // Récupérer tous les codes d'indicateurs de tous les processus
      const allIndicatorCodes = processusData.flatMap(p => p.processus.indicateurs);

      if (allIndicatorCodes.length === 0) {
        setProcessusIndicators([]);
        setIsLoading(false);
        return;
      }

      // Récupérer les indicateurs sélectionnés par l'organisation
      const { data: selectionsData, error: selectionsError } = await supabase
        .from('organization_selections')
        .select('indicator_names')
        .eq('organization_name', organizationName)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (selectionsError && selectionsError.code !== 'PGRST116') {
        console.error('Error fetching selected indicators:', selectionsError);
      }

      const selectedIndicatorNames = selectionsData?.indicator_names || [];

      // Récupérer les détails des indicateurs
      const { data: indicatorsData, error: indicatorsError } = await supabase
        .from('indicators')
        .select(`
          code,
          name,
          description,
          unit,
          type,
          enjeux,
          critere
        `)
        .in('code', allIndicatorCodes)
      {/* .eq('type', 'Primaire');*/}

      if (indicatorsError) throw indicatorsError;

      // Filtrer les indicateurs sélectionnés
      const filteredIndicators = indicatorsData?.filter(indicator => 
        selectedIndicatorNames.includes(indicator.name)
      ) || [];

      // Créer le mapping des indicateurs par code pour un accès rapide
      const indicatorsByCode = filteredIndicators.reduce((acc, indicator) => {
        acc[indicator.code] = indicator;
        return acc;
      }, {} as Record<string, any>);

      // Construire la liste des indicateurs par processus
      const formattedIndicators: ProcessusIndicator[] = [];

      processusData.forEach(processusItem => {
        processusItem.processus.indicateurs.forEach(indicatorCode => {
          const indicator = indicatorsByCode[indicatorCode];
          if (indicator) {
            formattedIndicators.push({
              processus_code: processusItem.processus_code,
              processus_name: processusItem.processus.name,
              processus_description: processusItem.processus.description,
              indicator_code: indicator.code,
              indicator_name: indicator.name,
              indicator_description: indicator.description || '',
              indicator_unit: indicator.unit || '',
              indicator_type: indicator.type || '',
              enjeux: indicator.enjeux || null,
              critere: indicator.critere || null,
            });
          }
        });
      });

      setProcessusIndicators(formattedIndicators);
    } catch (error) {
      console.error('Error fetching user processus and indicators:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIndicatorValues = async () => {
    if (!user?.email || !userSite || userProcessus.length === 0) return;

    // Récupérer tous les codes d'indicateurs de tous les processus
    const allIndicatorCodes = userProcessus.flatMap(p => p.processus.indicateurs || []);

    try {
      let query = supabase
        .from('indicator_values')
        .select(`
          *,
          processus:processus_code (
            name,
            description
          ),
          collection_period:period_id (
            year,
            period_type,
            period_number
          ),
          indicators:indicator_code!inner (
            name,
            description,
            unit,
            type
          )
        `)
        .in('indicator_code', allIndicatorCodes)
        .eq('site_name', userSite)
        .eq('submitted_by', user.email)
      {/* .eq('indicators.type', 'Primaire');*/}

      if (selectedProcessus) {
        // Pour filtrer par processus, on récupère d'abord les indicateurs de ce processus
        const processusIndicators = userProcessus
          .find(p => p.processus_code === selectedProcessus)
          ?.processus.indicateurs || [];
        
        query = query.in('indicator_code', processusIndicators);
      }

      if (selectedPeriod) {
        query = query.eq('period_id', selectedPeriod);
      }

      if (selectedStatus) {
        query = query.eq('status', selectedStatus);
        
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error with filtered query, trying without type filter:', error);
        // Fallback sans le filtre de type
        let fallbackQuery = supabase
          .from('indicator_values')
          .select(`
            *,
            processus:processus_code (
              name,
              description
            ),
            collection_period:period_id (
              year,
              period_type,
              period_number
            ),
            indicators:indicator_code (
              name,
              description,
              unit,
              type
            )
          `)
          .in('indicator_code', allIndicatorCodes)
          .eq('site_name', userSite)
          .eq('submitted_by', user.email);

        if (selectedProcessus) {
          const processusIndicators = userProcessus
            .find(p => p.processus_code === selectedProcessus)
            ?.processus.indicateurs || [];
          fallbackQuery = fallbackQuery.in('indicator_code', processusIndicators);
        }
        
        if (selectedPeriod) fallbackQuery = fallbackQuery.eq('period_id', selectedPeriod);
        if (selectedStatus) fallbackQuery = fallbackQuery.eq('status', selectedStatus);

        const { data: fallbackData, error: fallbackError } = await fallbackQuery.order('created_at', { ascending: false });
        
        if (fallbackError) throw fallbackError;
        
        // Filtrer côté client
        const filteredData = fallbackData?.filter(item => 
          item.indicators?.type === 'Primaire'
        ) || [];
        
        setIndicatorValues(filteredData);
        return;
      }

      const formattedData = data?.map(item => ({
        ...item,
        processus: item.processus,
        collection_period: item.collection_period,
        indicator: item.indicators
      })) || [];

      setIndicatorValues(formattedData);
    } catch (error) {
      console.error('Error fetching indicator values:', error);
    }
  };

  const fetchMonthlyData = async () => {
    try {
      setIsLoading(true);

      if (!organizationName || !userSite || userProcessus.length === 0) {
        setMonthlyStats({
          total: 0,
          draft: 0,
          submitted: 0,
          validated: 0,
          rejected: 0,
          performance: 0
        });
        setMonthlyIndicators([]);
        return;
      }

      // Récupérer tous les codes d'indicateurs de tous les processus
      const allIndicatorCodes = userProcessus.flatMap(p => p.processus.indicateurs || []);

      // Get the period for the selected month/year
      const { data: periodData, error: periodError } = await supabase
        .from('collection_periods')
        .select('id')
        .eq('organization_name', organizationName)
        .eq('year', selectedYear)
        .eq('period_type', 'month')
        .eq('period_number', selectedMonth)
        .maybeSingle();

      if (periodError) throw periodError;

      if (!periodData) {
        setMonthlyStats({
          total: 0,
          draft: 0,
          submitted: 0,
          validated: 0,
          rejected: 0,
          performance: 0
        });
        setMonthlyIndicators([]);
        return;
      }

      // Fetch all indicator values for this period
      const { data: valuesData, error: valuesError } = await supabase
        .from('indicator_values')
        .select(`
          *,
          indicator:indicators!inner(code, name, description, unit, type),
          processus:processus(name)
        `)
        .eq('period_id', periodData.id)
        .eq('site_name', userSite)
        .in('indicator_code', allIndicatorCodes)
        .eq('indicators.type', 'Primaire');

      if (valuesError) {
        console.error('Error fetching monthly values:', valuesError);
        // Fallback: fetch all and filter client-side
        const { data: allValuesData, error: allValuesError } = await supabase
          .from('indicator_values')
          .select(`
            *,
            indicator:indicators(code, name, description, unit, type),
            processus:processus(name)
          `)
          .eq('period_id', periodData.id)
          .eq('site_name', userSite)
          .in('indicator_code', allIndicatorCodes);

        if (allValuesError) throw allValuesError;

        const values = allValuesData?.filter(value => 
          value.indicator?.type === 'Primaire'
        ) || [];
        
        setMonthlyIndicators(values);
        
        const stats = {
          total: values.length,
          draft: values.filter(v => v.status === 'draft').length,
          submitted: values.filter(v => v.status === 'submitted').length,
          validated: values.filter(v => v.status === 'validated').length,
          rejected: values.filter(v => v.status === 'rejected').length,
          performance: values.length > 0 ? Math.round((values.filter(v => v.status === 'validated').length / values.length) * 100) : 0
        };
        
        setMonthlyStats(stats);
        return;
      }

      const values = valuesData || [];
      setMonthlyIndicators(values);

      // Calculate statistics
      const stats = {
        total: values.length,
        draft: values.filter(v => v.status === 'draft').length,
        submitted: values.filter(v => v.status === 'submitted').length,
        validated: values.filter(v => v.status === 'validated').length,
        rejected: values.filter(v => v.status === 'rejected').length,
        performance: values.length > 0 ? Math.round((values.filter(v => v.status === 'validated').length / values.length) * 100) : 0
      };

      setMonthlyStats(stats);
    } catch (err) {
      console.error('Error fetching monthly data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (indicator: IndicatorValue) => {
    setEditingIndicator(indicator.id);
    setEditValue(indicator.value?.toString() || '');
    setEditComment(indicator.comment || '');
  };

  const handleSave = async (indicatorId: string) => {
    try {
      const { error } = await supabase
        .from('indicator_values')
        .update({
          value: editValue ? parseFloat(editValue) : null,
          comment: editComment,
          status: 'submitted',
          updated_at: new Date().toISOString()
        })
        .eq('id', indicatorId);

      if (error) throw error;

      setEditingIndicator(null);
      setEditValue('');
      setEditComment('');
      fetchIndicatorValues();
    } catch (error) {
      console.error('Error saving indicator value:', error);
    }
  };

  const handleCancel = () => {
    setEditingIndicator(null);
    setEditValue('');
    setEditComment('');
  };

  const handleProcessusClick = (processusCode: string) => {
    setSelectedProcessusForView(processusCode);
    setSelectedProcessus(processusCode);
    setSelectedYear(new Date().getFullYear());
    setSelectedPeriod('');
    setSelectedStatus('');
    setSearchTerm('');
  };

  const handleBackToAll = () => {
    setSelectedProcessusForView('');
    setSelectedProcessus('');
    setSelectedYear(new Date().getFullYear());
    setSelectedPeriod('');
    setSelectedStatus('');
    setSearchTerm('');
  };

  const handleAddValue = (indicator: ProcessusIndicator) => {
    setSelectedIndicatorForAdd(indicator);
    setAddValueModalOpen(true);
  };

  const handleSaveNewValue = async (data: { periodId: string; value: string; comment: string }) => {
    if (!selectedIndicatorForAdd || !user?.email || !userSite) return;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('organization_name, filiere_name, filiale_name, site_name')
        .eq('email', user.email)
        .single();
        
      if (profileError) throw profileError;
      
      const { data: existingData, error: existingError } = await supabase
        .from('indicator_values')
        .select('id')
        .eq('period_id', data.periodId)
        .eq('indicator_code', selectedIndicatorForAdd.indicator_code)
        .eq('organization_name', profileData.organization_name)
        .eq('site_name', userSite)
        .eq('submitted_by', user.email)
        .maybeSingle();
        
      if (existingError) throw existingError;
      
      if (existingData) {
        throw new Error('Une valeur existe déjà pour cet indicateur dans cette période');
      // 3. Validation du type de données
      if (indicatorValueData.value !== null && (isNaN(indicatorValueData.value) || indicatorValueData.value === undefined)) {
        throw new Error('La valeur doit être un nombre valide');
      }
      }
      // 4. Insérer avec toutes les informations
      const { error: insertError } = await supabase
        .from('indicator_values')
        .insert([{
          period_id: data.periodId,
          indicator_code: selectedIndicatorForAdd.indicator_code,
          processus_code: selectedIndicatorForAdd.processus_code,
          value: data.value ? parseFloat(data.value) : null,
          unit: selectedIndicatorForAdd.indicator_unit,
          status: 'submitted',
          comment: data.comment,
          submitted_by: user.email,
          submitted_at: new Date().toISOString(),
          organization_name: profileData.organization_name,
          filiere_name: profileData.filiere_name,
          filiale_name: profileData.filiale_name,
          site_name: userSite
        }]);
        
      if (insertError) throw insertError;
      
      fetchIndicatorValues();
    } catch (error: any) {
      console.error('Error saving new indicator value:', error);
      throw error;
    }
  };

  const toggleCommentExpansion = (indicatorId: string) => {
    setExpandedComments(prev => ({ ...prev, [indicatorId]: !prev[indicatorId] }));
  };

  // Helper function to get month name from number 
  const getMonthName = (monthNumber: number): string => {
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return monthNames[monthNumber - 1] || '';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="w-3 h-3" />;
      case 'submitted': return <FileText className="w-3 h-3" />;
      case 'validated': return <CheckCircle className="w-3 h-3" />;
      case 'rejected': return <AlertCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'submitted': return 'Soumis';
      case 'validated': return 'Validé';
      case 'rejected': return 'Rejeté';
      default: return 'Inconnu';
    }
  };

  const getPeriodText = (period: any) => {
    if (!period) return '-';
    return period.period_type === 'month' ? `${getMonthName(period.period_number)} ${period.year}` : `${period.period_type} ${period.period_number} - ${period.year}`;
  };

  const getDisplayIndicators = () => {
    let filteredProcessusIndicators = processusIndicators;

    if (selectedProcessus) {
      filteredProcessusIndicators = processusIndicators.filter(
        pi => pi.processus_code === selectedProcessus
      );
    }

    if (searchTerm) {
      filteredProcessusIndicators = filteredProcessusIndicators.filter(
        pi => pi.indicator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              pi.indicator_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filteredProcessusIndicators.map(pi => {
      const existingValue = indicatorValues.find(
        iv => iv.indicator_code === pi.indicator_code &&
              iv.processus_code === pi.processus_code &&
              iv.period_id === selectedPeriod &&
              iv.submitted_by === user?.email
      );
      
      return {
        ...pi,
        existing_value: existingValue
      };
    });
  };

  const indicatorsByProcessus = userProcessus.map(up => {
    const processusIndicators = getDisplayIndicators().filter(
      indicator => indicator.processus_code === up.processus_code
    );
    return {
      ...up,
      indicatorCount: processusIndicators.length,
      indicators: processusIndicators
    };
  });

  const sidebarItems = [
    { id: 'collecte', name: 'Collecte des données', icon: Database, description: 'Saisir et modifier les valeurs des indicateurs' },
    { id: 'performance mensuel', name: 'Performance Mensuelle', icon: PieChart, description: 'Consulter vos performances' },
    { id: 'visualisation', name: 'Tableau de Bord', icon: BarChart3, description: 'Consulter vos tableau de bord' }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-800', icon: FileText },
      validated: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {getStatusText(status)}
      </div>
    );
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const renderMonthlyPerformanceTab = () => {
    return (
      <div className="space-y-6">
        {/* Month/Year Selection */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-xs border border-gray-100 p-5"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sélection de la période</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="month" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Mois
              </label>
              <select
                id="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="block w-full pl-3 pr-10 py-2.5 text-sm border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg shadow-xs"
              >
                {monthNames.map((month, index) => (
                  <option key={index + 1} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="year" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Année
              </label>
              <select
                id="year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="block w-full pl-3 pr-10 py-2.5 text-sm border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg shadow-xs"
              >
                {[2023, 2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-xs border border-gray-100 p-5"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total indicateurs</p>
                <p className="text-2xl font-bold text-gray-900">{monthlyStats.total}</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-xs border border-gray-100 p-5"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Validés</p>
                <p className="text-2xl font-bold text-gray-900">{monthlyStats.validated}</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-xs border border-gray-100 p-5"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">En attente</p>
                <p className="text-2xl font-bold text-gray-900">{monthlyStats.submitted}</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-xs border border-gray-100 p-5"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <X className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Refusés</p>
                <p className="text-2xl font-bold text-gray-900">{monthlyStats.rejected}</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl shadow-xs border border-gray-100 p-5"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Brouillons</p>
                <p className="text-2xl font-bold text-gray-900">{monthlyStats.draft}</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl shadow-xs border border-gray-100 p-5"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Gauge className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Taux de Validation</p>
                <p className="text-2xl font-bold text-gray-900">{monthlyStats.performance}%</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Performance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl shadow-xs border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Performance mensuel</h3>
            </div>
            <div className="text-sm text-gray-500">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Performance bar */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Taux de validation</span>
                <span className="text-sm font-bold text-gray-900">{monthlyStats.performance}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${monthlyStats.performance}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    monthlyStats.performance >= 80 ? 'bg-green-500' :
                    monthlyStats.performance >= 60 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                />
              </div>
            </div>
            
            {/* Status breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-green-600">{monthlyStats.validated}</div>
                <div className="text-xs text-green-700">Validés</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-yellow-600">{monthlyStats.submitted}</div>
                <div className="text-xs text-yellow-700">En attente</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-red-600">{monthlyStats.rejected}</div>
                <div className="text-xs text-red-700">Refusés</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-600">{monthlyStats.draft}</div>
                <div className="text-xs text-gray-700">Brouillons</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Monthly Indicators Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-teal-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Indicateurs - {monthNames[selectedMonth - 1]} {selectedYear}
              </h3>
            </div>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            ) : monthlyIndicators.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun indicateur pour cette période</h3>
                <p className="text-gray-500">
                  Aucun indicateur n'a été saisi pour {monthNames[selectedMonth - 1]} {selectedYear}.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ">
                        Indicateur
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Processus
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valeur
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date de soumission
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commentaire
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {monthlyIndicators.map((value) => (
                      <tr key={value.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-gray-900">
                              {value.indicator?.name || value.indicator_code}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {value.indicator_code}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {value.processus?.name || value.processus_code}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">
                            {value.value !== null ? value.value : '-'} 
                            <span className="text-gray-500 text-xs ml-1">
                              {value.unit || value.indicator?.unit || ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(value.status)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-500">
                            {value.submitted_at 
                              ? new Date(value.submitted_at).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })
                              : '-'
                            }
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {value.comment || '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>

        {/* Performance Insights */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white rounded-xl shadow-xs border border-gray-100 p-6"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Target className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Analyse de performance</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Répartition par statut</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Taux de validation</span>
                  <span className={`text-sm font-medium ${
                    monthlyStats.performance >= 80 ? 'text-green-600' :
                    monthlyStats.performance >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {monthlyStats.performance}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Indicateurs en attente</span>
                  <span className="text-sm font-medium text-yellow-600">
                    {monthlyStats.submitted}
                  </span>
                </div>
<div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Brouillons à compléter</span>
                  <span className="text-sm font-medium text-gray-600">
                    {monthlyStats.draft}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Recommandations</h4>
              <div className="space-y-2">
                {monthlyStats.draft > 0 && (
                  <div className="flex items-start space-x-2 p-2 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-yellow-700">
                      {monthlyStats.draft} indicateur{monthlyStats.draft > 1 ? 's' : ''} en brouillon à compléter
                    </span>
                  </div>
                )}
                {monthlyStats.rejected > 0 && (
                  <div className="flex items-start space-x-2 p-2 bg-red-50 rounded-lg">
                    <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-red-700">
                      {monthlyStats.rejected} indicateur{monthlyStats.rejected > 1 ? 's' : ''} refusé{monthlyStats.rejected > 1 ? 's' : ''} à corriger
                    </span>
                  </div>
                )}
                {monthlyStats.performance >= 80 && (
                  <div className="flex items-start space-x-2 p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-green-700">
                      Excellente performance ! Continuez sur cette lancée.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  // Stats for indicator cards 
  const totalIndicators = getDisplayIndicators().length; 
  const submittedIndicators = getDisplayIndicators().filter(i => i.existing_value?.status === 'submitted').length; 
  const validatedIndicators = getDisplayIndicators().filter(i => i.existing_value?.status === 'validated').length; 
  const rejectedIndicators = getDisplayIndicators().filter(i => i.existing_value?.status === 'rejected').length;

  const renderVisualisationTab = () => { 
    if (vizIsLoading) { 
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Chargement du tableau de bord...</span>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Error Message */}
        {vizError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg"
          >
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{vizError}</p>
            </div>
          </motion.div>
        )}

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Indicateurs</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{vizDashboardStats.totalIndicators}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avec Valeurs</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{vizDashboardStats.indicatorsWithValues}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>

     

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >

          </motion.div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <select
                  value={vizSelectedYear}
                  onChange={(e) => setVizSelectedYear(parseInt(e.target.value))}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {vizYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <div className="relative">
                <select
                  value={axeFilter}
                  onChange={(e) => setAxeFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tous les axes</option>
                  {getUniqueVizValues('axe_energetique').map((axe) => (
                    <option key={axe as string} value={axe as string}>{axe}</option>
                  ))}
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <div className="relative">
                <select
                  value={enjeuxFilter}
                  onChange={(e) => setEnjeuxFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tous les enjeux</option>
                  {getUniqueVizValues('enjeux').map((enjeu) => (
                    <option key={enjeu as string} value={enjeu as string}>{enjeu}</option>
                  ))}
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher un indicateur..."
                  value={vizSearchQuery}
                  onChange={(e) => setVizSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>
            
            <button
              onClick={handleVizRefresh}
              disabled={vizRefreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${vizRefreshing ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {/* Indicators Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Indicateurs de Performance Énergétique</h2>
              </div>
              <div className="text-sm text-gray-600">
                {vizFilteredIndicators.length} indicateur(s) affiché(s)
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {vizFilteredIndicators.length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun indicateur trouvé</h3>
                <p className="text-gray-500">
                  {vizSearchQuery || axeFilter !== 'all' || enjeuxFilter !== 'all'
                    ? "Aucun indicateur ne correspond à vos critères de recherche."
                    : "Aucun indicateur n'est configuré pour votre site."}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
             
  
                    <th scope="col" className="w-12 px-6 py-3"></th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ">
                      Indicateur
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valeur Actuelle
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cible
                    </th>



                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vizFilteredIndicators.map((indicator, index) => {
                    const isExpanded = expandedVizIndicators.includes(indicator.id);
                    
                    return (
                      <React.Fragment key={indicator.id}>
                        <motion.tr
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-gray-50 transition-colors"
                        >
                            
                         
                    
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{indicator.indicateur}</div>
                              <div className="text-xs text-gray-500">{indicator.code}</div>
                              {indicator.unite && (
                                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">
                                  {indicator.unite}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-lg font-bold text-gray-900">
                              {indicator.value !== null ? indicator.value.toLocaleString() : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {indicator.cible !== null ? indicator.cible.toLocaleString() : '-'}
                            </div>
                          </td>
            
      
                     
                        </motion.tr>
                        
                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan={10} className="px-6 py-4">
                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                                      <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                                      Valeurs Mensuelles ({vizSelectedYear})
                                    </h4>
                                    <div className="grid grid-cols-3 gap-3">
                                      {vizMonths.map((month, monthIndex) => {
                                        const monthKey = [
                                          'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
                                          'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'
                                        ][monthIndex] as keyof SiteIndicatorValue;
                                        
                                        const monthValue = indicator[monthKey] as number | null;
                                        
                                        return (
                                          <div key={month} className="bg-gray-50 p-3 rounded-lg text-center">
                                            <div className="text-xs font-medium text-gray-600">{month.substring(0, 3)}</div>
                                            <div className="text-sm font-bold text-gray-900 mt-1">
                                              {monthValue !== null ? monthValue.toLocaleString() : '-'}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                                      <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
                                      Performances Mensuelles ({vizSelectedYear})
                                    </h4>
                                    <div className="grid grid-cols-3 gap-3">
                                      {vizMonths.map((month, monthIndex) => {
                                        const perfKey = [
                                          'perf_janvier', 'perf_fevrier', 'perf_mars', 'perf_avril', 'perf_mai', 'perf_juin',
                                          'perf_juillet', 'perf_aout', 'perf_septembre', 'perf_octobre', 'perf_novembre', 'perf_decembre'
                                        ][monthIndex] as keyof SiteIndicatorValue;
                                        
                                        const perfValue = indicator[perfKey] as number | null;
                                        
                                        return (
                                          <div key={month} className="bg-gray-50 p-3 rounded-lg text-center">
                                            <div className="text-xs font-medium text-gray-600">{month.substring(0, 3)}</div>
                                            <div className={`text-sm font-bold mt-1 ${getPerformanceColor(perfValue)}`}>
                                              {perfValue !== null ? `${perfValue.toFixed(1)}%` : '-'}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="mt-6 pt-4 border-t border-gray-200">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                      <div className="text-xs font-medium text-blue-600 mb-1">Enjeu</div>
                                      <div className="text-sm text-blue-800">{indicator.enjeux || 'N/A'}</div>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded-lg">
                                      <div className="text-xs font-medium text-green-600 mb-1">Critère</div>
                                      <div className="text-sm text-green-800">{indicator.critere || 'N/A'}</div>
                                    </div>
                                    <div className="bg-purple-50 p-3 rounded-lg">
                                      <div className="text-xs font-medium text-purple-600 mb-1">Fréquence</div>
                                      <div className="text-sm text-purple-800">{indicator.frequence || 'N/A'}</div>
                                    </div>
                                    <div className="bg-amber-50 p-3 rounded-lg">
                                      <div className="text-xs font-medium text-amber-600 mb-1">Type</div>
                                      <div className="text-sm text-amber-800">{indicator.type || 'N/A'}</div>
                                    </div>
                                  </div>
                                  
                                  {indicator.definition && (
                                    <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                                      <div className="text-xs font-medium text-gray-600 mb-1">Définition</div>
                                      <div className="text-sm text-gray-800">{indicator.definition}</div>
                                    </div>
                                  )}
                                  
                                  {indicator.formule && (
                                    <div className="mt-4 bg-yellow-50 p-3 rounded-lg">
                                      <div className="text-xs font-medium text-yellow-600 mb-1">Formule</div>
                                      <div className="text-sm text-yellow-800 font-mono">{indicator.formule}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Performance Summary */}
        {vizFilteredIndicators.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center mb-4">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Résumé des Performances</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {vizFilteredIndicators.filter(ind => (ind.performances_pourcent || 0) >= 80).length}
                </div>
                <div className="text-sm text-gray-600">Excellentes performances (≥80%)</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {vizFilteredIndicators.filter(ind => (ind.performances_pourcent || 0) >= 60 && (ind.performances_pourcent || 0) < 80).length}
                </div>
                <div className="text-sm text-gray-600">Bonnes performances (60-79%)</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 mb-1">
                  {vizFilteredIndicators.filter(ind => (ind.performances_pourcent || 0) < 60).length}
                </div>
                <div className="text-sm text-gray-600">À améliorer (&lt;60%)</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Information Box */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <Eye className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Tableau de bord contributeur</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Ce tableau de bord vous permet de visualiser les indicateurs de performance énergétique de votre site. 
                  Vous pouvez voir les valeurs actuelles, les cibles à atteindre et les performances mensuelles.
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong>Performance</strong> : Pourcentage d'atteinte de la cible (valeur/cible × 100)</li>
                  <li><strong>Variation</strong> : Évolution par rapport à la valeur précédente</li>
                  <li><strong>Détails mensuels</strong> : Cliquez sur la flèche pour voir le détail par mois</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <motion.div 
        className={`bg-white shadow-lg border-r border-gray-100 min-h-screen flex flex-col ${sidebarCollapsed ? 'w-20' : 'w-64'}`} 
        initial={{ width: sidebarCollapsed ? 80 : 256 }} 
        animate={{ width: sidebarCollapsed ? 80 : 256 }} 
        transition={{ type: 'spring', stiffness: 300, damping: 30 }} 
      >
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <h1 className="text-xl font-bold text-gray-800">Pilotage</h1>
            )}
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-2 space-y-1">
            {sidebarItems.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`
                  w-full flex items-center p-3 rounded-lg mb-1 transition-all duration-200
                  ${activeTab === item.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'hover:bg-gray-50 text-gray-700'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-blue-600' : 'text-gray-500'}`} />
                {!sidebarCollapsed && (
                  <span className="ml-3 font-medium text-sm">{item.name}</span>
                )}
              </motion.button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center p-3 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
          >
            <Home className="w-5 h-5 text-gray-500" />
            {!sidebarCollapsed && <span className="ml-3 text-sm">Tableau de bord</span>}
          </button>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center p-3 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors mt-1"
          >
            <LogOut className="w-5 h-5 text-gray-500" />
            {!sidebarCollapsed && <span className="ml-3 text-sm">Déconnexion</span>}
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-100">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Collecte des données</h1>
              <p className="text-gray-500 text-sm mt-1"> 
                {selectedProcessusForView 
                  ? `Processus ${userProcessus.find(p => p.processus_code === selectedProcessusForView)?.processus.name}`
                  : "Gérez vos indicateurs de performance"}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {selectedProcessusForView && (
                <button
                  onClick={handleBackToAll}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Tous les processus</span>
                </button>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          {activeTab === 'collecte' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Filters */}
              <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-4">
                <div className="flex items-center flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Filtrer par :</span>
                  </div> 
                  
                  <div className="relative">
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    >
                      <option value="">Toutes périodes</option>
                      {collectionPeriods.map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.period_type === 'month' ? 
                            `${getMonthName(period.period_number)} ${period.year}` : 
                            `${period.period_type} ${period.period_number} - ${period.year}`}
                        </option>
                      ))}
                    </select>
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>

                  <select
                    value={selectedProcessus}
                    onChange={(e) => setSelectedProcessus(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                  >
                    <option value="">Tous processus</option>
                    {userProcessus.map(processus => (
                      <option key={processus.processus_code} value={processus.processus_code}>
                        {processus.processus.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                  >
                    {statuses.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stats Cards */}
              {selectedProcessusForView && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <ClipboardCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Indicateurs total</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {totalIndicators}
                        </p>
                    </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">À valider</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {submittedIndicators}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-green-50 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Validés</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {validatedIndicators}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-red-50 text-red-600">
                        <X className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Refusés</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {rejectedIndicators}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Processus Cards */}
              {!selectedProcessusForView && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">Mes processus</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {indicatorsByProcessus.map((processus) => (
                      <motion.div
                        key={processus.processus_code}
                        onClick={() => handleProcessusClick(processus.processus_code)}
                        whileHover={{ y: -2 }}
                        className="bg-white rounded-xl shadow-xs border border-gray-100 p-4 cursor-pointer transition-all hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{processus.processus.name}</h3>
                            <p className="text-xs text-gray-500 mt-1">{processus.processus_code}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold text-blue-600">{processus.indicatorCount}</span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Indicators Table */}
              {selectedProcessusForView && (
                <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-gray-900">
                        Indicateurs
                      </h2>
                      <div className="text-sm text-gray-500">
                        {getDisplayIndicators().filter(i => i.processus_code === selectedProcessusForView).length} indicateurs
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indicateur</th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Critère</th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enjeux</th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valeur</th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Période</th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commentaire</th>
                          <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                          <tr>
                            <td colSpan={8} className="px-5 py-8 text-center">
                              <div className="flex justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                              </div>
                            </td>
                          </tr>
                        ) : getDisplayIndicators()
                            .filter(i => i.processus_code === selectedProcessusForView)
                            .length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-5 py-8 text-center text-gray-500 text-sm">
                              Aucun indicateur trouvé
                            </td>
                          </tr>
                        ) : (
                          getDisplayIndicators()
                            .filter(i => i.processus_code === selectedProcessusForView)
                            .map((indicator) => {
                              const existingValue = indicator.existing_value;
                              const isEditing = editingIndicator === existingValue?.id;
                              const isCommentExpanded = existingValue?.id ? expandedComments[existingValue.id] : false;
                              
                              return (
                                <tr key={`${indicator.processus_code}-${indicator.indicator_code}`} className="hover:bg-gray-50">
                                  <td className="px-5 py-4">
                                    <div>
                                      <div className="font-medium text-gray-900 text-sm">{indicator.indicator_name}</div>
                                      <div className="text-xs text-gray-500 mt-1">{indicator.indicator_code}</div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 text-gray-600 text-sm">
                                    {indicator.critere || '-'}
                                  </td>
                                  <td className="px-5 py-4 text-gray-600 text-sm">
                                    {indicator.enjeux || '-'}
                                  </td>
                                  <td className="px-5 py-4">
                                    {isEditing ? (
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="number"
                                          value={editValue}
                                          onChange={(e) => setEditValue(e.target.value)}
                                          className="w-24 px-3 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                                          step="0.01"
                                        />
                                        <span className="text-xs text-gray-500">{indicator.indicator_unit || '-'}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-baseline space-x-1">
                                        <span className="text-gray-900 font-medium">
                                          {existingValue?.value !== null && existingValue?.value !== undefined 
                                            ? existingValue.value.toLocaleString() 
                                            : '-'}
                                        </span>
                                        {indicator.indicator_unit && (
                                          <span className="text-xs text-gray-500">{indicator.indicator_unit}</span>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      existingValue?.status === 'validated' ? 'bg-green-100 text-green-800' :
                                      existingValue?.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                                      existingValue?.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {getStatusIcon(existingValue?.status || 'draft')}
                                      <span className="ml-1">{getStatusText(existingValue?.status || 'draft')}</span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 text-gray-600 text-sm">
                                    {getPeriodText(existingValue?.collection_period)}
                                  </td>
                                  <td className="px-5 py-4 text-sm max-w-xs">
                                    {existingValue?.comment ? (
                                      <div 
                                        className={`text-gray-600 cursor-pointer ${!isCommentExpanded ? 'truncate' : ''}`}
                                        onClick={() => toggleCommentExpansion(existingValue.id)}
                                      >
                                        <div className="flex items-start">
                                          <MessageSquare className="w-4 h-4 mt-0.5 mr-1 flex-shrink-0 text-gray-400" />
                                          <span>{existingValue.comment}</span>
                                        </div>
                                      </div>
                                    ) : '-'}
                                  </td>
                                  <td className="px-5 py-4 text-right">
                                    <div className="flex justify-end space-x-2">
                                      {existingValue && isEditing ? (
                                        <>
                                          <button
                                            onClick={() => handleSave(existingValue.id)}
                                            className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                            title="Enregistrer"
                                          >
                                            <Save className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={handleCancel}
                                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Annuler"
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        </>
                                      ) : existingValue ? (
                                        <button
                                          onClick={() => handleEdit(existingValue)}
                                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                          disabled={existingValue.status === 'validated'}
                                          title="Modifier"
                                        >
                                          <Edit3 className="w-4 h-4" />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleAddValue(indicator)}
                                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                          title="Ajouter une valeur"
                                        >
                                          <Plus className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'performance mensuel' && (
            renderMonthlyPerformanceTab()
          )}

          {activeTab === 'visualisation' && (
            renderVisualisationTab()
          )}
        </main>
      </div>

      {/* Add Value Modal */}
      {selectedIndicatorForAdd && (
        <AddValueModal
          isOpen={addValueModalOpen}
          onClose={() => setAddValueModalOpen(false)}
          indicator={selectedIndicatorForAdd}
          periods={collectionPeriods}
          onSave={handleSaveNewValue}
        />
      )}
    </div>
  );
};

export default ContributorPilotagePage;