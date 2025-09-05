import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  Calendar, 
  Search, 
  BarChart3, 
  ClipboardCheck, 
  Eye, 
  Menu, 
  FileText,
  ArrowLeft,
  ChevronRight,
  User,
  Clock,
  HardDrive,
  Layers,
  Home,
  Database,
  PieChart,
  TrendingUp,
  Award,
  RefreshCw,
  Target,
  Gauge,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface Indicator {
  code: string;
  name: string;
  description: string | null;
  unit: string | null;
}

interface IndicatorValue {
  id: string;
  period_id: string;
  organization_name: string;
  filiere_name: string | null;
  filiale_name: string | null;
  site_name: string | null;
  processus_code: string;
  indicator_code: string;
  value: number | null;
  unit: string | null;
  status: 'draft' | 'submitted' | 'validated' | 'rejected';
  comment: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
  indicator?: Indicator;
  processus?: {
    name: string;
  };
}

interface CollectionPeriod {
  id: string;
  organization_name: string;
  year: number;
  period_type: 'month' | 'quarter' | 'year';
  period_number: number;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed';
}

interface ProcessusType {
  code: string;
  name: string;
  description: string | null;
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

const ValidatorPilotagePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'validation' | 'visualisation' | 'performance_mensuelle'>('validation');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [periods, setPeriods] = useState<CollectionPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [assignedProcessus, setAssignedProcessus] = useState<ProcessusType[]>([]);
  const [indicatorValues, setIndicatorValues] = useState<IndicatorValue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'validated' | 'rejected'>('submitted');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProcessus, setExpandedProcessus] = useState<string[]>([]);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedIndicatorValue, setSelectedIndicatorValue] = useState<IndicatorValue | null>(null);
  const [userSite, setUserSite] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  
  const [monthlyValidatorStats, setMonthlyValidatorStats] = useState({
    total: 0,
    validated: 0,
    rejected: 0,
    performance: 0,
  });
  const [monthlyReviewedIndicators, setMonthlyReviewedIndicators] = useState<IndicatorValue[]>([]);
  const [selectedPerfMonth, setSelectedPerfMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedPerfYear, setSelectedPerfYear] = useState<number>(new Date().getFullYear());

  // State for Visualisation Tab
  const [vizIndicators, setVizIndicators] = useState<SiteIndicatorValue[]>([]);
  const [vizFilteredIndicators, setVizFilteredIndicators] = useState<SiteIndicatorValue[]>([]);
  const [vizDashboardStats, setVizDashboardStats] = useState<DashboardStats>({
    totalIndicators: 0,
    indicatorsWithValues: 0,
    averagePerformance: 0,
    topPerformingIndicator: null,
  });
  const [vizIsLoading, setVizIsLoading] = useState(true);
  const [vizError, setVizError] = useState<string | null>(null);
  const [vizSelectedYear, setVizSelectedYear] = useState(new Date().getFullYear());
  const [vizSearchQuery, setVizSearchQuery] = useState('');
  const [axeFilter, setAxeFilter] = useState<string>('all');
  const [enjeuxFilter, setEnjeuxFilter] = useState<string>('all');
  const [expandedVizIndicators, setExpandedVizIndicators] = useState<string[]>([]);
  const [vizRefreshing, setVizRefreshing] = useState(false);

  const vizYears = [2023, 2024, 2025];
  const vizMonths = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const sidebarItems = [
    {
      id: 'validation',
      name: 'Validation des données',
      icon: Database,
      description: 'Valider les indicateurs saisies'
    },
 
    {
      id: 'performance_mensuelle',
      name: 'Performance Mensuelle',
      icon: PieChart,
      description: 'Consulter vos performances de validation'
    },
    {
      id: 'visualisation',
      name: 'Tableau de Bord',
      icon:  BarChart3,
      description: 'Consulter vos tableau de bord'
    }

  ];

  useEffect(() => {
    fetchUserOrganization();
    fetchUserSite();
  }, [user]);
  
  useEffect(() => {
    if (organizationName) {
      fetchPeriods();
      fetchAssignedProcessus();
    }
  }, [organizationName]);
  
  useEffect(() => {
    if (selectedPeriodId && assignedProcessus.length > 0) {
      fetchIndicatorValues();
    }
  }, [selectedPeriodId, assignedProcessus, statusFilter]);
  
  useEffect(() => {
    if (activeTab === 'performance_mensuelle' && organizationName && assignedProcessus.length > 0) {
      fetchMonthlyPerformanceData();
    }
  }, [activeTab, organizationName, assignedProcessus, selectedPerfMonth, selectedPerfYear]);

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
      setError('Erreur lors du chargement des données de l\'organisation');
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
  
  const fetchPeriods = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('collection_periods')
        .select('*')
        .eq('organization_name', organizationName)
        .order('year', { ascending: false })
        .order('period_number', { ascending: false });
      
      if (error) throw error;
      
      setPeriods(data || []);
      
      if (data && data.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching periods:', err);
      setError('Erreur lors du chargement des périodes');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchAssignedProcessus = async () => {
    try {
      if (!user) return;
      
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('user_processus')
        .select('processus_code')
        .eq('email', user.email);
      
      if (assignmentError) throw assignmentError;
      
      if (!assignmentData || assignmentData.length === 0) {
        setAssignedProcessus([]);
        return;
      }
      
      const processusCodes = assignmentData.map(a => a.processus_code);
      
      const { data: processusData, error: processusError } = await supabase
        .from('processus')
        .select('*')
        .in('code', processusCodes);
      
      if (processusError) throw processusError;
      
      setAssignedProcessus(processusData || []);
      
      if (processusData && processusData.length > 0) {
        setExpandedProcessus([processusData[0].code]);
      }
    } catch (err) {
      console.error('Error fetching assigned processus:', err);
      setError('Erreur lors du chargement des processus assignés');
    }
  };
  
  const fetchIndicatorValues = async () => {
    try {
      setIsLoading(true);
      
      if (!selectedPeriodId || assignedProcessus.length === 0) {
        setIndicatorValues([]);
        return;
      }
      
      const processusCodes = assignedProcessus.map(p => p.code);
      
      // Build the query
      let query = supabase
        .from('indicator_values')
        .select(`
          *,
          indicator:indicators(code, name, description, unit),
          processus:processus(name)
        `)
        .eq('period_id', selectedPeriodId)
        .in('processus_code', processusCodes);
      
      // Add site filter for validators assigned to a specific site
      if (userSite) {
        query = query.eq('site_name', userSite);
      }
      
      // Add status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setIndicatorValues(data || []);
    } catch (err) {
      console.error('Error fetching indicator values:', err);
      setError('Erreur lors du chargement des valeurs d\'indicateurs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMonthlyPerformanceData = async () => {
    try {
      setIsLoading(true);
      
      if (!organizationName || assignedProcessus.length === 0) {
        setMonthlyReviewedIndicators([]);
        setMonthlyValidatorStats({ total: 0, validated: 0, rejected: 0, performance: 0 });
        return;
      }

      const processusCodes = assignedProcessus.map(p => p.code);
      
      const { data: periodData, error: periodError } = await supabase
        .from('collection_periods')
        .select('id')
        .eq('organization_name', organizationName)
        .eq('year', selectedPerfYear)
        .eq('period_type', 'month')
        .eq('period_number', selectedPerfMonth)
        .maybeSingle();

      if (periodError) throw periodError;
      if (!periodData) {
        setMonthlyReviewedIndicators([]);
        setMonthlyValidatorStats({ total: 0, validated: 0, rejected: 0, performance: 0 });
        return;
      }

      let query = supabase
        .from('indicator_values')
        .select(`*, indicator:indicators(name), processus:processus(name)`)
        .eq('period_id', periodData.id)
        .in('processus_code', processusCodes)
        .in('status', ['validated', 'rejected']);

      if (userSite) {
        query = query.eq('site_name', userSite);
      }

      const { data, error } = await query;

      if (error) throw error;

      const reviewedIndicators = data || [];
      setMonthlyReviewedIndicators(reviewedIndicators);

      const validatedCount = reviewedIndicators.filter(v => v.status === 'validated').length;
      const rejectedCount = reviewedIndicators.filter(v => v.status === 'rejected').length;
      const total = validatedCount + rejectedCount;
      const performance = total > 0 ? Math.round((validatedCount / total) * 100) : 0;

      setMonthlyValidatorStats({
        total,
        validated: validatedCount,
        rejected: rejectedCount,
        performance,
      });

    } catch (err) {
      console.error('Error fetching monthly performance data:', err);
      setError('Erreur lors du chargement des données de performance');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = async () => {
    const { success } = await logout();
    if (success) {
      navigate('/login');
    }
  };

  const handleReturnToDashboard = () => {
    navigate('/dashboard');
  };
  
  const toggleProcessusExpansion = (processusCode: string) => {
    setExpandedProcessus(prev => 
      prev.includes(processusCode)
        ? prev.filter(p => p !== processusCode)
        : [...prev, processusCode]
    );
  };
  
  const openCommentModal = (value: IndicatorValue) => {
    setSelectedIndicatorValue(value);
    setComment(value.comment || '');
    setCommentModalOpen(true);
  };
  
  const handleValidate = async (value: IndicatorValue) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('indicator_values')
        .update({
          status: 'validated',
          validated_by: user.email,
          validated_at: new Date().toISOString()
        })
        .eq('id', value.id);
      
      if (error) throw error;
      
      fetchIndicatorValues();
    } catch (err) {
      console.error('Error validating indicator value:', err);
      setError('Erreur lors de la validation de l\'indicateur');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleReject = async () => {
    if (!user || !selectedIndicatorValue) return;
    
    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('indicator_values')
        .update({
          status: 'rejected',
          comment: comment
        })
        .eq('id', selectedIndicatorValue.id);
      
      if (error) throw error;
      
      setCommentModalOpen(false);
      setSelectedIndicatorValue(null);
      setComment('');
      fetchIndicatorValues();
    } catch (err) {
      console.error('Error rejecting indicator value:', err);
      setError('Erreur lors du refus de l\'indicateur');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            Soumis
          </span>
        );
      case 'validated':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            Validé
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            Refusé
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            Brouillon
          </span>
        );
    }
  };
  
  const getLocationLabel = (value: IndicatorValue) => {
    if (value.site_name) {
      return `Site: ${value.site_name}`;
    } else if (value.filiale_name) {
      return `Filiale: ${value.filiale_name}`;
    } else if (value.filiere_name) {
      return `Filière: ${value.filiere_name}`;
    } else {
      return `Organisation: ${value.organization_name}`;
    }
  };
  
  const getPeriodLabel = (period: CollectionPeriod) => {
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };
    
    switch (period.period_type) {
      case 'month':
        const monthNames = [
          'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];
        return `${monthNames[period.period_number - 1]} ${period.year}`;
      case 'quarter':
        return `T${period.period_number} ${period.year}`;
      case 'year':
        return `Année ${period.year}`;
      default:
        return `${formatDate(period.start_date)} - ${formatDate(period.end_date)}`;
    }
  };
  
  const filteredIndicatorValues = indicatorValues.filter(value => {
    const indicatorName = value.indicator?.name?.toLowerCase() || '';
    const indicatorCode = value.indicator_code.toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    
    return indicatorName.includes(searchLower) || indicatorCode.includes(searchLower);
  });
  
  const indicatorValuesByProcessus = filteredIndicatorValues.reduce((acc, value) => {
    const processusCode = value.processus_code;
    if (!acc[processusCode]) {
      acc[processusCode] = [];
    }
    acc[processusCode].push(value);
    return acc;
  }, {} as Record<string, IndicatorValue[]>);
  
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
    setExpandedVizIndicators(prev => 
      prev.includes(indicatorId)
        ? prev.filter(id => id !== indicatorId)
        : [...prev, indicatorId]
    );
  };

  const getPerformanceColor = (performance: number | null) => {
    if (performance === null) return 'text-gray-500';
    if (performance >= 90) return 'text-green-600';
    if (performance >= 70) return 'text-blue-600';
    if (performance >= 50) return 'text-yellow-600';
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
    if (variation > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (variation < 0) return <TrendingUp className="w-4 h-4 text-red-500 transform rotate-180" />;
    return <Activity className="w-4 h-4 text-gray-500" />;
  };

  const getUniqueVizValues = (field: keyof SiteIndicatorValue) => {
    return [...new Set(vizIndicators.map(ind => ind[field]).filter(Boolean))];
  };

  const renderMonthlyPerformanceTab = () => {
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    return (
      <div className="space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-xs border border-gray-100 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Sélection de la Période</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="perf-month" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Mois
              </label>
              <select
                id="perf-month"
                value={selectedPerfMonth}
                onChange={(e) => setSelectedPerfMonth(parseInt(e.target.value))}
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
              <label htmlFor="perf-year" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Année
              </label>
              <select
                id="perf-year"
                value={selectedPerfYear}
                onChange={(e) => setSelectedPerfYear(parseInt(e.target.value))}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Database} title="Indicateurs Revus" value={monthlyValidatorStats.total} color="blue" />
          <StatCard icon={CheckCircle} title="Validés" value={monthlyValidatorStats.validated} color="green" />
          <StatCard icon={AlertCircle} title="Refusés" value={monthlyValidatorStats.rejected} color="red" />
          <StatCard icon={Zap} title="Taux de validation" value={`${monthlyValidatorStats.performance}%`} color="purple" />
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              Détail des validations - {monthNames[selectedPerfMonth - 1]} {selectedPerfYear}
            </h3>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div></div>
            ) : monthlyReviewedIndicators.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Aucune donnée pour cette période.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indicateur</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processus</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valeur Soumise</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Validation</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {monthlyReviewedIndicators.map(value => (
                    <tr key={value.id}>
                      <td className="px-4 py-3"><div className="text-sm font-medium text-gray-900">{value.indicator?.name || value.indicator_code}</div></td>
                      <td className="px-4 py-3"><div className="text-sm text-gray-900">{value.processus?.name || value.processus_code}</div></td>
                      <td className="px-4 py-3"><div className="text-sm font-semibold text-gray-900">{value.value} {value.unit}</div></td>
                      <td className="px-4 py-3">{getStatusBadge(value.status)}</td>
                      <td className="px-4 py-3"><div className="text-sm text-gray-500">{value.validated_at ? new Date(value.validated_at).toLocaleDateString('fr-FR') : '-'}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  };

  const StatCard = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-5">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg bg-${color}-50 text-${color}-600`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  const renderVisualisationTab = () => {
    if (vizIsLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Chargement du tableau de bord...</p>
          </div>
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
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Performance Moyenne</p>
                <p className={`text-2xl font-bold mt-1 ${getPerformanceColor(vizDashboardStats.averagePerformance)}`}>
                  {vizDashboardStats.averagePerformance.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Gauge className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Meilleur Indicateur</p>
                <p className="text-sm font-bold text-gray-900 mt-1 truncate">
                  {vizDashboardStats.topPerformingIndicator || 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Award className="w-6 h-6 text-amber-600" />
              </div>
            </div>
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
                  <tr>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Axe Énergétique
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Critère
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enjeux
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Processus
                    </th>
                    <th scope="col" className="w-12 px-6 py-3"></th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Indicateur
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valeur Actuelle
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cible
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performance
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Variation
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
                                                    <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                              {indicator.axe_energetique || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {indicator.critere || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {indicator.enjeux || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{indicator.processus || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{indicator.processus_code}</div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => toggleVizIndicatorExpansion(indicator.id)}
                              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              )}
                            </button>
                          </td>
                          
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPerformanceBadge(indicator.performances_pourcent)}`}>
                              {indicator.performances_pourcent !== null ? `${indicator.performances_pourcent.toFixed(1)}%` : 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {getVariationIcon(indicator.variations_pourcent)}
                              <span className={`text-sm font-medium ${getPerformanceColor(indicator.variations_pourcent)}`}>
                                {indicator.variations_pourcent !== null ? `${indicator.variations_pourcent.toFixed(1)}` : 'N/A'}
                              </span>
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
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mt-0 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="mr-4 p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-2 rounded-lg shadow">
                  <ClipboardCheck className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-lg font-semibold text-gray-900">Validation des Indicateurs</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleReturnToDashboard}
                className="hidden md:flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <ArrowLeft size={16} />
                <span className="text-sm font-medium">Dashboard</span>
              </button>
              
      
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <motion.div 
          className={`bg-white shadow-lg border-r border-gray-100 min-h-screen flex flex-col ${sidebarCollapsed ? 'w-20' : 'w-64'}`}
          initial={{ width: sidebarCollapsed ? 80 : 256 }}
          animate={{ width: sidebarCollapsed ? 80 : 256 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-gray-800">Validation</span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-2 space-y-1">
              {sidebarItems.map((item) => (
                <motion.button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as 'validation' | 'visualisation' | 'performance_mensuelle')}
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
              onClick={handleReturnToDashboard}
              className="w-full flex items-center p-3 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <Home className="w-5 h-5 text-gray-500" />
              {!sidebarCollapsed && <span className="ml-3 text-sm">Tableau de bord</span>}
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center p-3 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors mt-1"
            >
              <LogOut className="w-5 h-5 text-gray-500" />
              {!sidebarCollapsed && <span className="ml-3 text-sm">Déconnexion</span>}
            </button>
          </div>
        </motion.div>

        {/* Main content */}
        <div className="flex-1 overflow-auto bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {activeTab === 'validation' ? (
              <>
                {/* Filters and controls */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-xs border border-gray-100 p-5 mb-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Period selection */}
                    <div>
                      <label htmlFor="period" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                        Période de collecte
                      </label>
                      <div className="relative">
                        <select
                          id="period"
                          value={selectedPeriodId || ''}
                          onChange={(e) => setSelectedPeriodId(e.target.value || null)}
                          className="block w-full pl-3 pr-10 py-2.5 text-sm border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg shadow-xs"
                        >
                          <option value="">Sélectionnez une période</option>
                          {periods.map((period) => (
                            <option key={period.id} value={period.id}>
                              {getPeriodLabel(period)}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <Calendar className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Status filter */}
                    <div>
                      <label htmlFor="status" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                        Filtre par statut
                      </label>
                      <div className="relative">
                        <select
                          id="status"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as any)}
                          className="block w-full pl-3 pr-10 py-2.5 text-sm border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg shadow-xs"
                        >
                          <option value="all">Tous les statuts</option>
                          <option value="submitted">À valider</option>
                          <option value="validated">Validés</option>
                          <option value="rejected">Refusés</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <Filter className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Search */}
                    <div>
                      <label htmlFor="search" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                        Rechercher un indicateur
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Nom ou code de l'indicateur..."
                          className="block w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-xs leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Stats cards */}
                {selectedPeriodId && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                          <ClipboardCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Indicateurs total</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {filteredIndicatorValues.length}
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
                            {filteredIndicatorValues.filter(v => v.status === 'submitted').length}
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
                            {filteredIndicatorValues.filter(v => v.status === 'validated').length}
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
                            {filteredIndicatorValues.filter(v => v.status === 'rejected').length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Indicator values by processus */}
                {isLoading ? (
                  <div className="flex justify-center items-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : error ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md"
                  >
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700 font-medium">{error}</p>
                        <p className="text-sm text-red-600 mt-1">Veuillez rafraîchir la page ou contacter le support</p>
                      </div>
                    </div>
                  </motion.div>
                ) : Object.keys(indicatorValuesByProcessus).length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-xl shadow-xs border border-gray-100 p-8 text-center"
                  >
                    <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-blue-50 to-teal-50 rounded-full mb-4 shadow-inner">
                      <ClipboardCheck className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {statusFilter === 'submitted' 
                        ? "Aucune donnée à valider"
                        : "Aucune donnée disponible"}
                    </h3>
                    <p className="text-gray-500 max-w-md mx-auto text-sm">
                      {statusFilter === 'submitted' 
                        ? "Tous les indicateurs ont été validés ou aucun n'a été soumis pour cette période."
                        : statusFilter === 'validated'
                        ? "Aucun indicateur n'a encore été validé pour cette période."
                        : statusFilter === 'rejected'
                        ? "Aucun indicateur n'a été refusé pour cette période."
                        : "Aucune donnée n'est disponible pour les critères sélectionnés."}
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {assignedProcessus.map((processus) => {
                      const values = indicatorValuesByProcessus[processus.code] || [];
                      const isExpanded = expandedProcessus.includes(processus.code);
                      
                      if (values.length === 0) return null;
                      
                      return (
                        <motion.div
                          key={processus.code}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden"
                        >
                          <div 
                            className="px-5 py-4 border-b border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleProcessusExpansion(processus.code)}
                          >
                            <div className="flex items-center space-x-4">
                              <div className="bg-gradient-to-r from-blue-50 to-teal-50 p-2 rounded-lg shadow-inner">
                                <Layers className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="text-base font-semibold text-gray-900">{processus.name}</h3>
                                <p className="text-xs text-gray-500">
                                  {values.length} indicateur{values.length > 1 ? 's' : ''} • {values.filter(v => v.status === 'submitted').length} à valider
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                isExpanded ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {isExpanded ? 'Réduire' : 'Voir les indicateurs'}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.1 }}
                              className="p-1"
                            >
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Indicateur
                                      </th>
                                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Localisation
                                      </th>
                                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Valeur
                                      </th>
                                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Statut
                                      </th>
                                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Soumis le
                                      </th>
                                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-100">
                                    {values.map((value) => (
                                      <tr key={value.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          <div className="flex flex-col">
                                            <div className="text-sm font-medium text-gray-900">
                                              {value.indicator?.name || value.indicator_code}
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono">
                                              {value.indicator_code}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          <div className="flex items-center space-x-2">
                                            <HardDrive className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                            <span className="text-sm text-gray-900">
                                              {getLocationLabel(value)}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          <div className="text-sm font-semibold text-gray-900">
                                            {value.value !== null ? value.value : '-'} <span className="text-gray-500 text-xs">{value.unit || value.indicator?.unit || ''}</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          {getStatusBadge(value.status)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
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
                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                          {value.status === 'submitted' && (
                                            <div className="flex items-center justify-center space-x-2">
                                              <button
                                                onClick={() => handleValidate(value)}
                                                disabled={isSubmitting}
                                                className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors shadow-xs"
                                                title="Valider"
                                              >
                                                <ThumbsUp className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={() => openCommentModal(value)}
                                                disabled={isSubmitting}
                                                className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors shadow-xs"
                                                title="Refuser"
                                              >
                                                <ThumbsDown className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={() => openCommentModal(value)}
                                                disabled={isSubmitting}
                                                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors shadow-xs"
                                                title="Commenter"
                                              >
                                                <MessageSquare className="w-4 h-4" />
                                              </button>
                                            </div>
                                          )}
                                          {value.status === 'validated' && (
                                            <div className="text-xs text-center text-gray-500">
                                              <div className="flex items-center justify-center space-x-1">
                                                <CheckCircle className="h-3 w-3 text-green-500" />
                                                <span>Validé par {value.validated_by?.split('@')[0] || 'admin'}</span>
                                              </div>
                                            </div>
                                          )}
                                          {value.status === 'rejected' && (
                                            <div className="flex justify-center">
                                              <button
                                                onClick={() => openCommentModal(value)}
                                                className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors shadow-xs"
                                                title="Voir le commentaire"
                                              >
                                                <MessageSquare className="w-4 h-4" />
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : activeTab === 'performance_mensuelle' ? (
              renderMonthlyPerformanceTab()
            ) : (
              renderVisualisationTab()
            )}
          </div>
        </div>
      </div>

      {/* Comment Modal */}
      <AnimatePresence>
        {commentModalOpen && selectedIndicatorValue && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="bg-white rounded-xl shadow-lg w-full max-w-md relative"
            >
              <button
                onClick={() => {
                  setCommentModalOpen(false);
                  setSelectedIndicatorValue(null);
                  setComment('');
                }}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-50 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>

              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {selectedIndicatorValue.status === 'rejected' 
                    ? 'Commentaire de refus' 
                    : 'Commenter cet indicateur'}
                </h2>

                <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Indicateur</p>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {selectedIndicatorValue.indicator?.name || selectedIndicatorValue.indicator_code}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Valeur</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedIndicatorValue.value !== null ? selectedIndicatorValue.value : '-'} 
                        <span className="text-gray-500 ml-1 text-xs">{selectedIndicatorValue.unit || selectedIndicatorValue.indicator?.unit || ''}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Localisation</p>
                      <p className="text-sm text-gray-900">
                        {getLocationLabel(selectedIndicatorValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Soumis par</p>
                      <p className="text-sm text-gray-900">
                        {selectedIndicatorValue.submitted_by || '-'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-5">
                  <label htmlFor="comment" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    {selectedIndicatorValue.status === 'rejected' 
                      ? 'Commentaire de refus' 
                      : 'Votre commentaire'}
                  </label>
                  <textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder={selectedIndicatorValue.status === 'rejected' 
                      ? "Commentaire laissé lors du refus..." 
                      : "Expliquez les raisons du refus ou donnez des précisions..."}
                    readOnly={selectedIndicatorValue.status === 'rejected'}
                  />
                </div>

                {selectedIndicatorValue.status !== 'rejected' ? (
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setCommentModalOpen(false);
                        setSelectedIndicatorValue(null);
                        setComment('');
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity shadow-xs disabled:opacity-70"
                    >
                      {isSubmitting ? 'Envoi en cours...' : 'Refuser avec commentaire'}
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setCommentModalOpen(false);
                        setSelectedIndicatorValue(null);
                        setComment('');
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity shadow-xs"
                    >
                      Fermer.
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ValidatorPilotagePage;
