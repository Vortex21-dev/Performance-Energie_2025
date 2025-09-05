import React, { useState, useEffect, useRef } from 'react'; 
import { useNavigate, useParams } from 'react-router-dom'; 
import { motion, AnimatePresence } from 'framer-motion'; 
import PerformanceDashboard from '../components/PerformanceDashboard'; 
import { ArrowLeft, Factory, Layers, FileText, Loader, AlertTriangle, MapPin, Building2, Building, ChevronRight, BarChart3, Zap, Target, Settings, Users, LayoutGrid, List, Calendar, Search, ChevronUp, ChevronDown, HelpCircle, CheckCircle, Briefcase, TrendingUp, Eye, Sliders, Info, Sparkles, Globe, Home, Shield, Menu, X, Activity, Grid3X3, Filter } from 'lucide-react'; 
import { supabase } from '../lib/supabase'; 
import { useAuth } from '../context/AuthContext'; 
import isEqual from 'lodash.isequal';

interface IssueWithAxis { code: string; name: string; axe_energetique: string | null; }

interface Indicator { code: string; name: string; description: string | null; unit: string | null; type: string | null; formula: string | null; frequency: string | null; processus_code: string; }

interface IndicatorValue { id: string; indicator_code: string; processus_code: string; period_id: string; value: number | null; organization_name: string; site_name: string | null; created_at: string; collection_periods?: { year: number; period_number: number | null; }; }

interface SiteGlobalIndicatorValue { 
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
  created_at: string; 
  updated_at: string; 
  variations_pourcent: number | null;
  performances_pourcent: number | null;
}

interface UserProcessus { email: string; processus_code: string; }

interface Site { name: string; address: string; city: string; country: string; filiere_name: string | null; filiale_name: string | null; organization_name: string; }

interface Processus { code: string; name: string; description: string | null; icon_type?: string; }

const SiteProcessesPage: React.FC = () => { 
  const navigate = useNavigate(); 
  const { siteName } = useParams<{ siteName: string }>(); 
  const { user } = useAuth(); 
  const [site, setSite] = useState<Site | null>(null); 
  const [processus, setProcessus] = useState<Processus[]>([]); 
  const [isLoading, setIsLoading] = useState(true); 
  const [siteUsers, setSiteUsers] = useState<string[]>([]); 
  const [error, setError] = useState<string | null>(null); 
  const [viewMode, setViewMode] = useState<'process' | 'global' | 'performance' | 'visualization'>('global'); 
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Global view state
  const [siteGlobalIndicators, setSiteGlobalIndicators] = useState<SiteGlobalIndicatorValue[]>([]); 
  const [isLoadingIndicators, setIsLoadingIndicators] = useState(false); 
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  // Energy context data
  const [energySector, setEnergySector] = useState<{name: string} | null>(null); 
  const [energyType, setEnergyType] = useState<{name: string; sector_name: string} | null>(null); 
  const [standards, setStandards] = useState<{code: string; name: string}[]>([]); 
  const [issues, setIssues] = useState<IssueWithAxis[]>([]); 
  const [criteria, setCriteria] = useState<{code: string; name: string}[]>([]); 
  const [issueStandards, setIssueStandards] = useState<Record<string, string>>({});

  // Years for filtering
  const currentYear = new Date().getFullYear(); 
  const years = [currentYear - 1, currentYear, currentYear + 1];

  // Months for display
  const months = [ 
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre' 
  ];

  const [dataSaved, setDataSaved] = useState(false);

  // Sidebar navigation items
  const sidebarItems = [ 
    { id: 'dashboard', name: 'Tableau de bord', icon: BarChart3, description: 'Vue d\'ensemble des performances', active: viewMode === 'process' }, 
    { id: 'performance', name: 'Performance', icon: TrendingUp, description: 'Analyse des performances énergétiques' }
  ];

  useEffect(() => { 
    if (siteName) { 
      fetchSiteData(); 
    } 
  }, [siteName]);

  useEffect(() => { 
    if (site) { 
      fetchSiteUsers(); 
    } 
  }, [site]);

  useEffect(() => { 
    if (siteUsers.length > 0) { 
      fetchSiteProcessus(); 
    } 
  }, [siteUsers, viewMode]);

  useEffect(() => { 
    if (viewMode === 'global' && siteName) { 
      fetchSiteGlobalIndicators(); 
    } 
  }, [viewMode, siteName, yearFilter]);

  const fetchSiteData = async () => { 
    try { 
      setIsLoading(true); 
      const { data, error } = await supabase 
        .from('sites') 
        .select('*') 
        .eq('name', siteName) 
        .single();

      if (error) throw error;
      setSite(data);
    } catch (err: any) {
      console.error('Error fetching site data:', err);
      setError('Erreur lors du chargement des données du site: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSiteUsers = async () => { 
    try { 
      if (!site?.organization_name) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('organization_name', site.organization_name)
        .eq('site_name', siteName)
        .eq('role', 'contributeur');

      if (error) throw error;

      const userEmails = data?.map(user => user.email) || [];
      setSiteUsers(userEmails);
    } catch (err: any) {
      console.error('Error fetching site users:', err);
      setError('Erreur lors du chargement des utilisateurs du site: ' + err.message);
    }
  };

  const fetchSiteProcessus = async () => { 
    try { 
      if (siteUsers.length === 0) { 
        setProcessus([]); 
        return; 
      }

      const { data: userProcessusData, error: userProcessusError } = await supabase
        .from('user_processus')
        .select('processus_code')
        .in('email', siteUsers);

      if (userProcessusError) throw userProcessusError;

      if (!userProcessusData || userProcessusData.length === 0) {
        setProcessus([]);
        return;
      }

      const processusCodes = [...new Set(userProcessusData.map(up => up.processus_code))];

      const { data: processusData, error: processusError } = await supabase
        .from('processus')
        .select('*')
        .in('code', processusCodes)
        .order('name');

      if (processusError) throw processusError;

      const iconTypes = ['management', 'operation', 'support', 'measurement', 'improvement'];
      const processusWithIcons = processusData?.map(proc => ({
        ...proc,
        icon_type: iconTypes[Math.floor(Math.random() * iconTypes.length)]
      })) || [];

      setProcessus(processusWithIcons);
    } catch (err: any) {
      console.error('Error fetching processus:', err);
      setError('Erreur lors du chargement des processus: ' + err.message);
    }
  };

  const fetchSiteGlobalIndicators = async () => { 
    try { 
      if (!siteName) { 
        setSiteGlobalIndicators([]); 
        return; 
      }

      setIsLoadingIndicators(true);

      // Récupération directe des indicateurs globaux du site
      const { data, error } = await supabase
        .from('site_global_indicator_values_simple')
        .select('*')
        .eq('site_name', siteName)
        .eq('year', yearFilter)
        .order('code');

      if (error) throw error;

      setSiteGlobalIndicators(data || []);
    } catch (err: any) {
      console.error('Error fetching site global indicators:', err);
      setError('Erreur lors du chargement des indicateurs globaux: ' + err.message);
    } finally {
      setIsLoadingIndicators(false);
    }
  };

  const handleProcessusClick = (processusCode: string) => { 
    navigate(`/site/${siteName}/process/${processusCode}`); 
  };

  const handleViewModeChange = (mode: 'process' | 'global') => { 
    setViewMode(mode); 
    if (mode === 'global' && siteName) { 
      fetchSiteGlobalIndicators(); 
    } 
  };

  const handleBack = () => { 
    navigate('/admin-client-pilotage'); 
  };

  const toggleRowExpansion = (indicatorCode: string) => { 
    setExpandedRows(prev => 
      prev.includes(indicatorCode) 
        ? prev.filter(code => code !== indicatorCode) 
        : [...prev, indicatorCode] 
    );
  };

  const getProcessusIcon = (iconType: string = 'default') => { 
    switch (iconType) { 
      case 'management': return <Settings className="w-6 h-6" />;
      case 'operation': return <Factory className="w-6 h-6" />;
      case 'support': return <Users className="w-6 h-6" />;
      case 'measurement': return <BarChart3 className="w-6 h-6" />;
      case 'improvement': return <TrendingUp className="w-6 h-6" />;
      default: return <Layers className="w-6 h-6" />;
    }
  };

  const getProcessusColor = (iconType: string = 'default') => { 
    switch (iconType) { 
      case 'management': return 'from-blue-500 to-indigo-600'; 
      case 'operation': return 'from-amber-500 to-orange-600'; 
      case 'support': return 'from-purple-500 to-violet-600'; 
      case 'measurement': return 'from-green-500 to-emerald-600'; 
      case 'improvement': return 'from-red-500 to-rose-600'; 
      default: return 'from-gray-500 to-slate-600'; 
    }
  };

  const filteredIndicators = siteGlobalIndicators.filter(indicator => { 
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      (indicator.indicateur && indicator.indicateur.toLowerCase().includes(searchLower)) ||
      indicator.code.toLowerCase().includes(searchLower) ||
      (indicator.definition && indicator.definition.toLowerCase().includes(searchLower)) ||
      (indicator.axe_energetique && indicator.axe_energetique.toLowerCase().includes(searchLower)) ||
      (indicator.enjeux && indicator.enjeux.toLowerCase().includes(searchLower)) ||
      (indicator.normes && indicator.normes.toLowerCase().includes(searchLower)) ||
      (indicator.critere && indicator.critere.toLowerCase().includes(searchLower))
    );
  });

  if (isLoading) { 
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="flex flex-col items-center max-w-md text-center"
      >
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }} 
          className="mb-6"
        >
          <Loader className="w-12 h-12 text-purple-400" />
        </motion.div>
        <h2 className="text-xl font-semibold text-white mb-2">Chargement du site...</h2>
        <p className="text-slate-400">Récupération des données en cours</p>
      </motion.div>
    ); 
  }

  if (error) { 
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="max-w-2xl w-full bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-red-500/50"
      >
        <div className="p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400 mr-3" />
            <h2 className="text-xl font-semibold text-white">Erreur</h2>
          </div>
          <p className="text-slate-300">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </motion.div>
    ); 
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Sidebar */}
      <motion.div 
        className={`bg-slate-800/50 backdrop-blur-xl border-r border-slate-700/50 min-h-screen flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'}`} 
        initial={{ width: sidebarOpen ? 256 : 80 }} 
        animate={{ width: sidebarOpen ? 256 : 80 }} 
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Sidebar content remains the same as your original code */}
        {/* ... */}
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Performance Dashboard */}
        {viewMode === 'performance' && (
          <PerformanceDashboard siteName={siteName || ''} />
        )}
        
        {/* Visualization Dashboard */}
        {viewMode === 'visualization' && (
          <div className="p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <h2 className="text-2xl font-bold text-white mb-2">Visualisations Avancées</h2>
              <p className="text-slate-400">
                Analyses graphiques détaillées des performances énergétiques du site "{siteName}".
              </p>
            </motion.div>

            {/* Contrôles de filtrage */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 mb-8">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Paramètres d'analyse</h3>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <select
                      value={yearFilter}
                      onChange={(e) => setYearFilter(parseInt(e.target.value))}
                      className="pl-10 pr-4 py-2 border border-slate-600 rounded-lg bg-slate-700/50 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
                    >
                      {years.map(year => (
                        <option key={year} value={year} className="bg-slate-800">{year}</option>
                      ))}
                    </select>
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {isLoadingIndicators ? (
              <div className="flex justify-center py-12">
                <Loader className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : siteGlobalIndicators.length === 0 ? (
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-12 text-center">
                <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Aucune donnée disponible</h3>
                <p className="text-slate-400">Aucun indicateur trouvé pour ce site en {yearFilter}.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Métriques clés */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Performance Moyenne</p>
                        <p className="text-3xl font-bold">
                          {siteGlobalIndicators.length > 0 
                            ? Math.round(siteGlobalIndicators.reduce((sum, ind) => sum + (ind.performances_pourcent || 0), 0) / siteGlobalIndicators.length)
                            : 0}%
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-blue-200" />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-emerald-100 text-sm">Indicateurs Actifs</p>
                        <p className="text-3xl font-bold">{siteGlobalIndicators.length}</p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-emerald-200" />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">Axes Énergétiques</p>
                        <p className="text-3xl font-bold">
                          {new Set(siteGlobalIndicators.map(ind => ind.axe_energetique).filter(Boolean)).size}
                        </p>
                      </div>
                      <Zap className="w-8 h-8 text-purple-200" />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-2xl p-6 text-white"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-amber-100 text-sm">Objectifs Atteints</p>
                        <p className="text-3xl font-bold">
                          {siteGlobalIndicators.filter(ind => (ind.performances_pourcent || 0) >= 80).length}
                          <span className="text-lg">/{siteGlobalIndicators.length}</span>
                        </p>
                      </div>
                      <Target className="w-8 h-8 text-amber-200" />
                    </div>
                  </motion.div>
                </div>

                {/* Graphiques principaux */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Graphique en courbes - Évolution mensuelle */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-white">Évolution Mensuelle des Performances</h3>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-slate-400">Performance (%)</span>
                      </div>
                    </div>
                    
                    <div className="relative h-80">
                      <svg viewBox="0 0 800 300" className="w-full h-full">
                        {/* Grille */}
                        <defs>
                          <pattern id="grid" width="66.67" height="60" patternUnits="userSpaceOnUse">
                            <path d="M 66.67 0 L 0 0 0 60" fill="none" stroke="rgb(71 85 105)" strokeWidth="0.5" opacity="0.3"/>
                          </pattern>
                        </defs>
                        <rect width="800" height="300" fill="url(#grid)" />
                        
                        {/* Axes */}
                        <line x1="60" y1="20" x2="60" y2="280" stroke="rgb(148 163 184)" strokeWidth="2"/>
                        <line x1="60" y1="280" x2="780" y2="280" stroke="rgb(148 163 184)" strokeWidth="2"/>
                        
                        {/* Labels Y */}
                        {[0, 25, 50, 75, 100].map((value, index) => (
                          <g key={value}>
                            <line x1="55" y1={280 - (value * 2.6)} x2="65" y2={280 - (value * 2.6)} stroke="rgb(148 163 184)" strokeWidth="1"/>
                            <text x="45" y={285 - (value * 2.6)} fill="rgb(148 163 184)" fontSize="12" textAnchor="end">{value}%</text>
                          </g>
                        ))}
                        
                        {/* Labels X */}
                        {months.map((month, index) => (
                          <text key={month} x={120 + (index * 60)} y="295" fill="rgb(148 163 184)" fontSize="10" textAnchor="middle">
                            {month.substring(0, 3)}
                          </text>
                        ))}
                        
                        {/* Courbe de performance moyenne */}
                        {(() => {
                          const monthlyPerformances = months.map((_, monthIndex) => {
                            const monthKey = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 
                                            'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'][monthIndex];
                            const monthlyValues = siteGlobalIndicators
                              .map(ind => ind[monthKey as keyof SiteGlobalIndicatorValue] as number)
                              .filter(val => val !== null && val !== undefined);
                            
                            return monthlyValues.length > 0 
                              ? monthlyValues.reduce((sum, val) => sum + val, 0) / monthlyValues.length 
                              : 0;
                          });
                          
                          const points = monthlyPerformances.map((perf, index) => 
                            `${120 + (index * 60)},${280 - (perf * 2.6)}`
                          ).join(' ');
                          
                          return (
                            <>
                              <polyline
                                points={points}
                                fill="none"
                                stroke="rgb(59 130 246)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              {monthlyPerformances.map((perf, index) => (
                                <circle
                                  key={index}
                                  cx={120 + (index * 60)}
                                  cy={280 - (perf * 2.6)}
                                  r="4"
                                  fill="rgb(59 130 246)"
                                  stroke="white"
                                  strokeWidth="2"
                                />
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </motion.div>

                  {/* Graphique en barres - Comparaison par axe énergétique */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-white">Performance par Axe Énergétique</h3>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <span className="text-sm text-slate-400">Performance moyenne</span>
                      </div>
                    </div>
                    
                    <div className="relative h-80">
                      <svg viewBox="0 0 800 300" className="w-full h-full">
                        {/* Grille */}
                        <rect width="800" height="300" fill="url(#grid)" />
                        
                        {/* Axes */}
                        <line x1="60" y1="20" x2="60" y2="280" stroke="rgb(148 163 184)" strokeWidth="2"/>
                        <line x1="60" y1="280" x2="780" y2="280" stroke="rgb(148 163 184)" strokeWidth="2"/>
                        
                        {/* Labels Y */}
                        {[0, 25, 50, 75, 100].map((value) => (
                          <g key={value}>
                            <line x1="55" y1={280 - (value * 2.6)} x2="65" y2={280 - (value * 2.6)} stroke="rgb(148 163 184)" strokeWidth="1"/>
                            <text x="45" y={285 - (value * 2.6)} fill="rgb(148 163 184)" fontSize="12" textAnchor="end">{value}%</text>
                          </g>
                        ))}
                        
                        {/* Barres par axe énergétique */}
                        {(() => {
                          const axesData = siteGlobalIndicators.reduce((acc, ind) => {
                            const axe = ind.axe_energetique || 'Non défini';
                            if (!acc[axe]) {
                              acc[axe] = [];
                            }
                            acc[axe].push(ind.performances_pourcent || 0);
                            return acc;
                          }, {} as Record<string, number[]>);
                          
                          const axesPerformances = Object.entries(axesData).map(([axe, perfs]) => ({
                            axe,
                            performance: perfs.reduce((sum, p) => sum + p, 0) / perfs.length
                          }));
                          
                          const barWidth = 80;
                          const spacing = 100;
                          const colors = ['rgb(34 197 94)', 'rgb(59 130 246)', 'rgb(168 85 247)', 'rgb(245 158 11)', 'rgb(239 68 68)'];
                          
                          return axesPerformances.map((data, index) => (
                            <g key={data.axe}>
                              <rect
                                x={80 + (index * spacing)}
                                y={280 - (data.performance * 2.6)}
                                width={barWidth}
                                height={data.performance * 2.6}
                                fill={colors[index % colors.length]}
                                rx="4"
                              />
                              <text
                                x={120 + (index * spacing)}
                                y="295"
                                fill="rgb(148 163 184)"
                                fontSize="10"
                                textAnchor="middle"
                              >
                                {data.axe.length > 10 ? data.axe.substring(0, 10) + '...' : data.axe}
                              </text>
                              <text
                                x={120 + (index * spacing)}
                                y={275 - (data.performance * 2.6)}
                                fill="white"
                                fontSize="12"
                                textAnchor="middle"
                                fontWeight="bold"
                              >
                                {Math.round(data.performance)}%
                              </text>
                            </g>
                          ));
                        })()}
                      </svg>
                    </div>
                  </motion.div>
                </div>

                {/* Graphique en secteurs - Répartition par enjeux */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-6">Répartition par Enjeux Énergétiques</h3>
                  
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <svg viewBox="0 0 400 400" className="w-80 h-80">
                        {(() => {
                          const enjeuxData = siteGlobalIndicators.reduce((acc, ind) => {
                            const enjeu = ind.enjeux || 'Non défini';
                            acc[enjeu] = (acc[enjeu] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);
                          
                          const total = Object.values(enjeuxData).reduce((sum, count) => sum + count, 0);
                          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                          
                          let currentAngle = 0;
                          
                          return Object.entries(enjeuxData).map(([enjeu, count], index) => {
                            const percentage = (count / total) * 100;
                            const angle = (count / total) * 360;
                            const startAngle = currentAngle;
                            const endAngle = currentAngle + angle;
                            
                            const x1 = 200 + 120 * Math.cos((startAngle - 90) * Math.PI / 180);
                            const y1 = 200 + 120 * Math.sin((startAngle - 90) * Math.PI / 180);
                            const x2 = 200 + 120 * Math.cos((endAngle - 90) * Math.PI / 180);
                            const y2 = 200 + 120 * Math.sin((endAngle - 90) * Math.PI / 180);
                            
                            const largeArcFlag = angle > 180 ? 1 : 0;
                            
                            const pathData = [
                              `M 200 200`,
                              `L ${x1} ${y1}`,
                              `A 120 120 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                              'Z'
                            ].join(' ');
                            
                            currentAngle += angle;
                            
                            return (
                              <g key={enjeu}>
                                <path
                                  d={pathData}
                                  fill={colors[index % colors.length]}
                                  stroke="rgb(30 41 59)"
                                  strokeWidth="2"
                                />
                                <text
                                  x={200 + 80 * Math.cos((startAngle + angle/2 - 90) * Math.PI / 180)}
                                  y={200 + 80 * Math.sin((startAngle + angle/2 - 90) * Math.PI / 180)}
                                  fill="white"
                                  fontSize="12"
                                  textAnchor="middle"
                                  fontWeight="bold"
                                >
                                  {Math.round(percentage)}%
                                </text>
                              </g>
                            );
                          });
                        })()}
                      </svg>
                      
                      {/* Légende */}
                      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 space-y-2">
                        {(() => {
                          const enjeuxData = siteGlobalIndicators.reduce((acc, ind) => {
                            const enjeu = ind.enjeux || 'Non défini';
                            acc[enjeu] = (acc[enjeu] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);
                          
                          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                          
                          return Object.entries(enjeuxData).map(([enjeu, count], index) => (
                            <div key={enjeu} className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: colors[index % colors.length] }}
                              ></div>
                              <span className="text-sm text-slate-300 max-w-32 truncate">{enjeu}</span>
                              <span className="text-xs text-slate-500">({count})</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Histogramme - Distribution des performances */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-6">Distribution des Performances</h3>
                  
                  <div className="relative h-80">
                    <svg viewBox="0 0 800 300" className="w-full h-full">
                      {/* Grille */}
                      <rect width="800" height="300" fill="url(#grid)" />
                      
                      {/* Axes */}
                      <line x1="60" y1="20" x2="60" y2="280" stroke="rgb(148 163 184)" strokeWidth="2"/>
                      <line x1="60" y1="280" x2="780" y2="280" stroke="rgb(148 163 184)" strokeWidth="2"/>
                      
                      {/* Histogramme */}
                      {(() => {
                        const ranges = [
                          { min: 0, max: 20, label: '0-20%', color: '#ef4444' },
                          { min: 20, max: 40, label: '20-40%', color: '#f59e0b' },
                          { min: 40, max: 60, label: '40-60%', color: '#eab308' },
                          { min: 60, max: 80, label: '60-80%', color: '#3b82f6' },
                          { min: 80, max: 100, label: '80-100%', color: '#10b981' }
                        ];
                        
                        const distribution = ranges.map(range => ({
                          ...range,
                          count: siteGlobalIndicators.filter(ind => {
                            const perf = ind.performances_pourcent || 0;
                            return perf >= range.min && perf < range.max;
                          }).length
                        }));
                        
                        const maxCount = Math.max(...distribution.map(d => d.count), 1);
                        const barWidth = 100;
                        const spacing = 120;
                        
                        return distribution.map((data, index) => (
                          <g key={data.label}>
                            <rect
                              x={80 + (index * spacing)}
                              y={280 - (data.count / maxCount * 240)}
                              width={barWidth}
                              height={data.count / maxCount * 240}
                              fill={data.color}
                              rx="4"
                            />
                            <text
                              x={130 + (index * spacing)}
                              y="295"
                              fill="rgb(148 163 184)"
                              fontSize="10"
                              textAnchor="middle"
                            >
                              {data.label}
                            </text>
                            <text
                              x={130 + (index * spacing)}
                              y={275 - (data.count / maxCount * 240)}
                              fill="white"
                              fontSize="12"
                              textAnchor="middle"
                              fontWeight="bold"
                            >
                              {data.count}
                            </text>
                          </g>
                        ));
                      })()}
                      
                      {/* Labels Y */}
                      {Array.from({ length: 6 }, (_, i) => {
                        const maxCount = Math.max(...siteGlobalIndicators.map(() => 1), 1);
                        const value = Math.round((maxCount / 5) * i);
                        return (
                          <g key={i}>
                            <line x1="55" y1={280 - (i * 48)} x2="65" y2={280 - (i * 48)} stroke="rgb(148 163 184)" strokeWidth="1"/>
                            <text x="45" y={285 - (i * 48)} fill="rgb(148 163 184)" fontSize="12" textAnchor="end">{value}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </motion.div>

                {/* Carte de chaleur - Performance mensuelle */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-6">Carte de Chaleur - Performance Mensuelle</h3>
                  
                  <div className="overflow-x-auto">
                    <div className="min-w-full">
                      {/* En-têtes des mois */}
                      <div className="grid grid-cols-13 gap-1 mb-2">
                        <div className="text-xs text-slate-400 font-medium p-2">Indicateur</div>
                        {months.map(month => (
                          <div key={month} className="text-xs text-slate-400 font-medium text-center p-2">
                            {month.substring(0, 3)}
                          </div>
                        ))}
                      </div>
                      
                      {/* Lignes d'indicateurs */}
                      {siteGlobalIndicators.slice(0, 10).map((indicator, rowIndex) => (
                        <motion.div
                          key={indicator.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1 + rowIndex * 0.1 }}
                          className="grid grid-cols-13 gap-1 mb-1"
                        >
                          <div className="text-xs text-white p-2 bg-slate-700/50 rounded truncate">
                            {indicator.indicateur || indicator.code}
                          </div>
                          {['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 
                            'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'].map(month => {
                            const value = indicator[month as keyof SiteGlobalIndicatorValue] as number | null;
                            const performance = value !== null ? Math.min(Math.max(value / (indicator.cible || 100) * 100, 0), 100) : 0;
                            
                            const getHeatmapColor = (perf: number) => {
                              if (perf >= 80) return 'bg-green-500';
                              if (perf >= 60) return 'bg-blue-500';
                              if (perf >= 40) return 'bg-yellow-500';
                              if (perf >= 20) return 'bg-orange-500';
                              return 'bg-red-500';
                            };
                            
                            return (
                              <div
                                key={month}
                                className={`p-2 rounded text-center text-xs font-medium text-white ${
                                  value !== null ? getHeatmapColor(performance) : 'bg-slate-600'
                                }`}
                                title={`${month}: ${value !== null ? value : 'N/A'} ${indicator.unite || ''}`}
                              >
                                {value !== null ? Math.round(value) : '-'}
                              </div>
                            );
                          })}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Légende de la carte de chaleur */}
                  <div className="mt-6 flex items-center justify-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className="text-xs text-slate-400">0-20%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-orange-500 rounded"></div>
                      <span className="text-xs text-slate-400">20-40%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span className="text-xs text-slate-400">40-60%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <span className="text-xs text-slate-400">60-80%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="text-xs text-slate-400">80-100%</span>
                    </div>
                  </div>
                </motion.div>

                {/* Graphiques de tendances individuelles */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                  className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-6">Tendances des Indicateurs Clés</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {siteGlobalIndicators.slice(0, 4).map((indicator, index) => (
                      <div key={indicator.id} className="bg-slate-700/30 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-white mb-3 truncate">
                          {indicator.indicateur || indicator.code}
                        </h4>
                        
                        <div className="relative h-32">
                          <svg viewBox="0 0 400 120" className="w-full h-full">
                            {/* Grille mini */}
                            <defs>
                              <pattern id={`mini-grid-${index}`} width="33.33" height="24" patternUnits="userSpaceOnUse">
                                <path d="M 33.33 0 L 0 0 0 24" fill="none" stroke="rgb(71 85 105)" strokeWidth="0.5" opacity="0.2"/>
                              </pattern>
                            </defs>
                            <rect width="400" height="120" fill={`url(#mini-grid-${index})`} />
                            
                            {/* Ligne de tendance */}
                            {(() => {
                              const monthlyValues = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 
                                                   'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']
                                .map(month => indicator[month as keyof SiteGlobalIndicatorValue] as number | null)
                                .map(val => val || 0);
                              
                              const maxValue = Math.max(...monthlyValues, indicator.cible || 100);
                              const points = monthlyValues.map((val, idx) => 
                                `${30 + (idx * 30)},${100 - (val / maxValue * 80)}`
                              ).join(' ');
                              
                              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
                              
                              return (
                                <>
                                  <polyline
                                    points={points}
                                    fill="none"
                                    stroke={colors[index % colors.length]}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                  {monthlyValues.map((val, idx) => (
                                    <circle
                                      key={idx}
                                      cx={30 + (idx * 30)}
                                      cy={100 - (val / maxValue * 80)}
                                      r="2"
                                      fill={colors[index % colors.length]}
                                    />
                                  ))}
                                  
                                  {/* Ligne de cible */}
                                  {indicator.cible && (
                                    <line
                                      x1="30"
                                      y1={100 - (indicator.cible / maxValue * 80)}
                                      x2="390"
                                      y2={100 - (indicator.cible / maxValue * 80)}
                                      stroke="rgb(245 158 11)"
                                      strokeWidth="1"
                                      strokeDasharray="5,5"
                                    />
                                  )}
                                </>
                              );
                            })()}
                          </svg>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-400">
                            Valeur: {indicator.value || 'N/A'} {indicator.unite || ''}
                          </span>
                          <span className="text-xs text-slate-400">
                            Cible: {indicator.cible || 'N/A'} {indicator.unite || ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Analyse comparative */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                  className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-6">Analyse Comparative {yearFilter-1} vs {yearFilter}</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Graphique de comparaison */}
                    <div>
                      <h4 className="text-md font-medium text-white mb-4">Évolution Annuelle</h4>
                      <div className="relative h-64">
                        <svg viewBox="0 0 600 240" className="w-full h-full">
                          {/* Grille */}
                          <rect width="600" height="240" fill="url(#grid)" />
                          
                          {/* Axes */}
                          <line x1="50" y1="20" x2="50" y2="220" stroke="rgb(148 163 184)" strokeWidth="2"/>
                          <line x1="50" y1="220" x2="580" y2="220" stroke="rgb(148 163 184)" strokeWidth="2"/>
                          
                          {/* Barres comparatives */}
                          {siteGlobalIndicators.slice(0, 8).map((indicator, index) => {
                            const currentValue = indicator.value || 0;
                            const previousValue = indicator.valeur_precedente || 0;
                            const maxValue = Math.max(currentValue, previousValue, 100);
                            
                            const barWidth = 30;
                            const groupWidth = 70;
                            const x = 70 + (index * groupWidth);
                            
                            return (
                              <g key={indicator.id}>
                                {/* Barre année précédente */}
                                <rect
                                  x={x}
                                  y={220 - (previousValue / maxValue * 180)}
                                  width={barWidth}
                                  height={previousValue / maxValue * 180}
                                  fill="rgb(245 158 11)"
                                  rx="2"
                                />
                                
                                {/* Barre année actuelle */}
                                <rect
                                  x={x + barWidth + 5}
                                  y={220 - (currentValue / maxValue * 180)}
                                  width={barWidth}
                                  height={currentValue / maxValue * 180}
                                  fill="rgb(59 130 246)"
                                  rx="2"
                                />
                                
                                {/* Label */}
                                <text
                                  x={x + barWidth}
                                  y="235"
                                  fill="rgb(148 163 184)"
                                  fontSize="8"
                                  textAnchor="middle"
                                >
                                  {indicator.code.substring(0, 6)}
                                </text>
                              </g>
                            );
                          })}
                          
                          {/* Légende */}
                          <g>
                            <rect x="400" y="30" width="15" height="15" fill="rgb(245 158 11)" rx="2"/>
                            <text x="420" y="42" fill="rgb(148 163 184)" fontSize="12">{yearFilter-1}</text>
                            <rect x="400" y="50" width="15" height="15" fill="rgb(59 130 246)" rx="2"/>
                            <text x="420" y="62" fill="rgb(148 163 184)" fontSize="12">{yearFilter}</text>
                          </g>
                        </svg>
                      </div>
                    </div>

                    {/* Statistiques détaillées */}
                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-white mb-4">Statistiques Détaillées</h4>
                      
                      {/* Top performers */}
                      <div className="bg-slate-700/30 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-green-400 mb-3">🏆 Meilleures Performances</h5>
                        <div className="space-y-2">
                          {siteGlobalIndicators
                            .filter(ind => ind.performances_pourcent !== null)
                            .sort((a, b) => (b.performances_pourcent || 0) - (a.performances_pourcent || 0))
                            .slice(0, 3)
                            .map((indicator, index) => (
                              <div key={indicator.id} className="flex items-center justify-between">
                                <span className="text-xs text-slate-300 truncate max-w-32">
                                  {indicator.indicateur || indicator.code}
                                </span>
                                <span className="text-xs font-bold text-green-400">
                                  {Math.round(indicator.performances_pourcent || 0)}%
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Needs improvement */}
                      <div className="bg-slate-700/30 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-red-400 mb-3">⚠️ À Améliorer</h5>
                        <div className="space-y-2">
                          {siteGlobalIndicators
                            .filter(ind => ind.performances_pourcent !== null)
                            .sort((a, b) => (a.performances_pourcent || 0) - (b.performances_pourcent || 0))
                            .slice(0, 3)
                            .map((indicator, index) => (
                              <div key={indicator.id} className="flex items-center justify-between">
                                <span className="text-xs text-slate-300 truncate max-w-32">
                                  {indicator.indicateur || indicator.code}
                                </span>
                                <span className="text-xs font-bold text-red-400">
                                  {Math.round(indicator.performances_pourcent || 0)}%
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Résumé mensuel */}
                      <div className="bg-slate-700/30 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-blue-400 mb-3">📊 Résumé Mensuel</h5>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-300">Moyenne générale</span>
                            <span className="text-xs font-bold text-blue-400">
                              {Math.round(siteGlobalIndicators.reduce((sum, ind) => sum + (ind.performances_pourcent || 0), 0) / siteGlobalIndicators.length)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-300">Variation moyenne</span>
                            <span className="text-xs font-bold text-purple-400">
                              {Math.round(siteGlobalIndicators.reduce((sum, ind) => sum + (ind.variations_pourcent || 0), 0) / siteGlobalIndicators.length)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-300">Objectifs atteints</span>
                            <span className="text-xs font-bold text-emerald-400">
                              {siteGlobalIndicators.filter(ind => (ind.performances_pourcent || 0) >= 80).length}/{siteGlobalIndicators.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Graphique radar - Vue d'ensemble des axes */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-6">Vue Radar - Performance par Axe</h3>
                  
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <svg viewBox="0 0 400 400" className="w-80 h-80">
                        {/* Grille radar */}
                        {[1, 2, 3, 4, 5].map(level => (
                          <polygon
                            key={level}
                            points={Array.from({ length: 6 }, (_, i) => {
                              const angle = (i * 60 - 90) * Math.PI / 180;
                              const radius = level * 30;
                              const x = 200 + radius * Math.cos(angle);
                              const y = 200 + radius * Math.sin(angle);
                              return `${x},${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="rgb(71 85 105)"
                            strokeWidth="1"
                            opacity="0.3"
                          />
                        ))}
                        
                        {/* Lignes radiales */}
                        {Array.from({ length: 6 }, (_, i) => {
                          const angle = (i * 60 - 90) * Math.PI / 180;
                          const x = 200 + 150 * Math.cos(angle);
                          const y = 200 + 150 * Math.sin(angle);
                          return (
                            <line
                              key={i}
                              x1="200"
                              y1="200"
                              x2={x}
                              y2={y}
                              stroke="rgb(71 85 105)"
                              strokeWidth="1"
                              opacity="0.3"
                            />
                          );
                        })}
                        
                        {/* Données radar */}
                        {(() => {
                          const axesData = siteGlobalIndicators.reduce((acc, ind) => {
                            const axe = ind.axe_energetique || 'Autre';
                            if (!acc[axe]) {
                              acc[axe] = [];
                            }
                            acc[axe].push(ind.performances_pourcent || 0);
                            return acc;
                          }, {} as Record<string, number[]>);
                          
                          const axesPerformances = Object.entries(axesData)
                            .slice(0, 6)
                            .map(([axe, perfs]) => ({
                              axe,
                              performance: perfs.reduce((sum, p) => sum + p, 0) / perfs.length
                            }));
                          
                          // Compléter avec des axes vides si nécessaire
                          while (axesPerformances.length < 6) {
                            axesPerformances.push({ axe: '', performance: 0 });
                          }
                          
                          const radarPoints = axesPerformances.map((data, index) => {
                            const angle = (index * 60 - 90) * Math.PI / 180;
                            const radius = (data.performance / 100) * 150;
                            const x = 200 + radius * Math.cos(angle);
                            const y = 200 + radius * Math.sin(angle);
                            return `${x},${y}`;
                          }).join(' ');
                          
                          return (
                            <>
                              <polygon
                                points={radarPoints}
                                fill="rgba(59, 130, 246, 0.2)"
                                stroke="rgb(59 130 246)"
                                strokeWidth="2"
                              />
                              {axesPerformances.map((data, index) => {
                                const angle = (index * 60 - 90) * Math.PI / 180;
                                const radius = (data.performance / 100) * 150;
                                const x = 200 + radius * Math.cos(angle);
                                const y = 200 + radius * Math.sin(angle);
                                const labelX = 200 + 170 * Math.cos(angle);
                                const labelY = 200 + 170 * Math.sin(angle);
                                
                                return (
                                  <g key={index}>
                                    <circle cx={x} cy={y} r="4" fill="rgb(59 130 246)" stroke="white" strokeWidth="2"/>
                                    {data.axe && (
                                      <text
                                        x={labelX}
                                        y={labelY}
                                        fill="rgb(148 163 184)"
                                        fontSize="10"
                                        textAnchor="middle"
                                      >
                                        {data.axe.length > 12 ? data.axe.substring(0, 12) + '...' : data.axe}
                                      </text>
                                    )}
                                  </g>
                                );
                              })}
                            </>
                          );
                        })()}
                      </svg>
                    </div>

                    {/* Métriques détaillées */}
                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-white mb-4">Métriques Détaillées</h4>
                      
                      {(() => {
                        const axesData = siteGlobalIndicators.reduce((acc, ind) => {
                          const axe = ind.axe_energetique || 'Autre';
                          if (!acc[axe]) {
                            acc[axe] = { performances: [], variations: [], count: 0 };
                          }
                          acc[axe].performances.push(ind.performances_pourcent || 0);
                          acc[axe].variations.push(ind.variations_pourcent || 0);
                          acc[axe].count++;
                          return acc;
                        }, {} as Record<string, { performances: number[], variations: number[], count: number }>);
                        
                        return Object.entries(axesData).map(([axe, data]) => {
                          const avgPerformance = data.performances.reduce((sum, p) => sum + p, 0) / data.performances.length;
                          const avgVariation = data.variations.reduce((sum, v) => sum + v, 0) / data.variations.length;
                          
                          return (
                            <div key={axe} className="bg-slate-700/30 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-sm font-medium text-white truncate">{axe}</h5>
                                <span className="text-xs text-slate-400">{data.count} indicateurs</span>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-400">Performance</span>
                                  <span className="text-xs font-bold text-blue-400">{Math.round(avgPerformance)}%</span>
                                </div>
                                
                                <div className="w-full bg-slate-600 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(avgPerformance, 100)}%` }}
                                  ></div>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-400">Variation</span>
                                  <span className={`text-xs font-bold ${avgVariation >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {avgVariation >= 0 ? '+' : ''}{Math.round(avgVariation)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </motion.div>

                {/* Graphique de corrélation */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 }}
                  className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-6">Analyse de Corrélation - Valeur vs Performance</h3>
                  
                  <div className="relative h-80">
                    <svg viewBox="0 0 800 300" className="w-full h-full">
                      {/* Grille */}
                      <rect width="800" height="300" fill="url(#grid)" />
                      
                      {/* Axes */}
                      <line x1="60" y1="20" x2="60" y2="280" stroke="rgb(148 163 184)" strokeWidth="2"/>
                      <line x1="60" y1="280" x2="780" y2="280" stroke="rgb(148 163 184)" strokeWidth="2"/>
                      
                      {/* Labels */}
                      <text x="400" y="295" fill="rgb(148 163 184)" fontSize="12" textAnchor="middle">Valeur Actuelle</text>
                      <text x="25" y="150" fill="rgb(148 163 184)" fontSize="12" textAnchor="middle" transform="rotate(-90 25 150)">Performance (%)</text>
                      
                      {/* Points de données */}
                      {siteGlobalIndicators.map((indicator, index) => {
                        const value = indicator.value || 0;
                        const performance = indicator.performances_pourcent || 0;
                        const maxValue = Math.max(...siteGlobalIndicators.map(ind => ind.value || 0), 1);
                        
                        const x = 60 + (value / maxValue) * 720;
                        const y = 280 - (performance / 100) * 260;
                        
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                        const color = colors[index % colors.length];
                        
                        return (
                          <circle
                            key={indicator.id}
                            cx={x}
                            cy={y}
                            r="6"
                            fill={color}
                            stroke="white"
                            strokeWidth="2"
                            opacity="0.8"
                          >
                            <title>{indicator.indicateur || indicator.code}: {value} {indicator.unite || ''} - {Math.round(performance)}%</title>
                          </circle>
                        );
                      })}
                      
                      {/* Ligne de tendance approximative */}
                      <line
                        x1="60"
                        y1="250"
                        x2="780"
                        y2="50"
                        stroke="rgb(245 158 11)"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        opacity="0.6"
                      />
                    </svg>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="bg-slate-800/30 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    {site?.name || 'Site'}
                  </h1>
                  <p className="text-slate-400 text-sm">Gestion de la performance énergétique</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-slate-800/50 rounded-lg shadow-sm border border-slate-700 p-1">
                <button
                  onClick={() => setViewMode('process')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                    viewMode === 'process' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span>Par Processus</span>
                </button>
                <button
                  onClick={() => setViewMode('global')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                    viewMode === 'global' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Vue Globale</span>
                </button>
                <button
                  onClick={() => setViewMode('performance')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                    viewMode === 'performance' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Performance</span>
                </button>
                <button
                  onClick={() => setViewMode('visualization')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                    viewMode === 'visualization' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span>Visualisation</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'process' && (
          <div className="p-6">
            {/* Vue par processus */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <h2 className="text-2xl font-bold text-white mb-2">Gestion des Indicateurs</h2>
              <p className="text-slate-400">
                Sélectionnez un processus pour accéder à ses détails.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {processus.map((proc, index) => (
                <motion.div
                  key={`${proc.code}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleProcessusClick(proc.code)}
                  className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-700/50 overflow-hidden cursor-pointer group"
                >
                  <div className={`h-1 w-full bg-gradient-to-r ${getProcessusColor(proc.icon_type)}`}></div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-xl bg-slate-700/50 backdrop-blur-sm">
                        {getProcessusIcon(proc.icon_type)}
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">{proc.name}</h3>
                    {proc.description && (
                      <p className="text-slate-400 text-sm line-clamp-2 mb-4">{proc.description}</p>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-500 bg-slate-700/50 px-2 py-1 rounded-full">
                        {proc.code}
                      </span>
                      <span className="text-sm text-purple-400 font-medium group-hover:underline">
                        Voir les indicateurs
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {processus.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-700/50 p-12 text-center"
              >
                <div className="mx-auto max-w-md">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-slate-700 to-slate-600 rounded-full flex items-center justify-center text-slate-400 mb-6">
                    <FileText className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {siteUsers.length === 0
                      ? "Aucun Contributeur Associé"
                      : "Aucun Processus Associé"}
                  </h3>
                  <p className="text-slate-400 mb-6">
                    {siteUsers.length === 0
                      ? "Ce site n'a pas encore de contributeurs assignés."
                      : "Les contributeurs de ce site n'ont pas de processus assignés."}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {viewMode === 'global' && (
          <div className="p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <h2 className="text-2xl font-bold text-white mb-2">Vue Globale des Indicateurs</h2>
              <p className="text-slate-400">
                Vue globale de tous les indicateurs du site "{siteName}" pour l'année {yearFilter}.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-700/50 overflow-hidden"
            >
              {dataSaved && (
                <div className="bg-green-900/50 border border-green-500/50 p-4 m-4 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-300">
                        Données enregistrées avec succès.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg mr-4">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-white">Indicateurs de Performance Énergétique</h2>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(parseInt(e.target.value))}
                        className="pl-10 pr-4 py-2 border border-slate-600 rounded-lg bg-slate-700/50 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
                      >
                        {years.map(year => (
                          <option key={year} value={year} className="bg-slate-800">{year}</option>
                        ))}
                      </select>
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-600 rounded-lg bg-slate-700/50 text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {isLoadingIndicators ? (
                  <div className="flex justify-center py-8">
                    <Loader className="w-8 h-8 animate-spin text-purple-400" />
                  </div>
                ) : error ? (
                  <div className="bg-red-900/50 border border-red-500/50 p-4 rounded-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-300">{error}</p>
                      </div>
                    </div>
                  </div>
                ) : filteredIndicators.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">Aucun indicateur trouvé</h3>
                    <p className="text-slate-400 max-w-md mx-auto">
                      {searchQuery
                        ? "Aucun indicateur ne correspond à votre recherche."
                        : `Aucun indicateur pour "${siteName}" en ${yearFilter}.`}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700/50">
                      <thead className="bg-slate-800/30">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Axe Énergétique</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Enjeux</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Normes</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Critère</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Code</th>
                          <th scope="col" className="px-7 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Indicateur</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Processus</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Fréquence</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Unité</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Formule</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Valeur {yearFilter - 1}</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Valeur {yearFilter}</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Cible</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Variation</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Performance</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Détails</th>
                        </tr>
                      </thead>
                      <tbody className="bg-slate-800/20 divide-y divide-slate-700/50">
                        {filteredIndicators.map((indicator) => {
                          const isExpanded = expandedRows.includes(indicator.code);

                          return (
                            <React.Fragment key={indicator.id || indicator.code}>
                              <tr className="hover:bg-slate-700/30 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.axe_energetique || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.enjeux || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.normes || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.critere || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-400">{indicator.code}</td>
                                <td className="px-7 py-4 text-sm">
                                  <div className="font-semibold text-white">{indicator.indicateur || indicator.code}</div>
                                  {indicator.definition && <p className="text-xs text-slate-400 mt-1 max-w-xs truncate">{indicator.definition}</p>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.processus || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.frequence || 'Mensuelle'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.unite || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.type || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.formule || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.valeur_precedente !== null ? indicator.valeur_precedente : '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">{indicator.value !== null ? indicator.value : '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.cible !== null ? indicator.cible : '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                  {indicator.variations_pourcent !== null ? `${indicator.variations_pourcent}` : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                  {indicator.performances_pourcent !== null ? `${indicator.performances_pourcent}%` : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                  <button
                                    onClick={() => toggleRowExpansion(indicator.code)}
                                    className="flex items-center space-x-1 text-purple-400 hover:text-purple-300 transition-colors"
                                  >
                                    <span>Détails</span>
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                </td>
                              </tr>

                              {isExpanded && (
                                <tr className="bg-slate-900/50">
                                  <td colSpan={17} className="p-4">
                                    <div className="overflow-x-auto bg-slate-800/50 rounded-lg p-4">
                                      <table className="min-w-full divide-y divide-slate-700/50">
                                        <thead className="bg-slate-700/30">
                                          <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Mois</th>
                                            {months.map((month) => (
                                              <th key={month} scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">{month}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className="bg-slate-800/30 divide-y divide-slate-700/50">
                                          <tr>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                              Valeur {yearFilter}
                                              <br />
                                              <span className="text-cyan-400 block">{indicator.indicateur}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.janvier || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.fevrier || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.mars || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.avril || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.mai || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.juin || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.juillet || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.aout || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.septembre || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.octobre || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.novembre || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{indicator.decembre || '-'}</td>
                                          </tr>
                                        </tbody>
                                      </table>
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

              {/* Information Box */}
              <div className="mt-8 mx-6 mb-6 bg-slate-800/50 border-l-4 border-purple-500 p-4 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <HelpCircle className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-purple-300">À propos des indicateurs de performance</h3>
                    <div className="mt-2 text-sm text-slate-400">
                      <p>
                        Les indicateurs de performance énergétique (IPE) sont essentiels pour suivre l'évolution de la consommation et l'efficacité des actions d'amélioration.
                      </p>
                      <p className="mt-2">
                        Les valeurs mensuelles permettent un suivi précis des tendances, tandis que les valeurs annuelles offrent une vue d'ensemble.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  ); 
}; 

export default SiteProcessesPage;