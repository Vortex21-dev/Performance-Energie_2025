import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Building2, Building, Factory, ChevronRight, Loader, 
  AlertTriangle, CheckCircle, Search, Layers, MapPin, Globe, Home, 
  ChevronDown, ChevronUp, List, LayoutGrid, FileText, Calendar, HelpCircle,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Organization { 
  name: string; 
  description?: string; 
  city: string; 
  country: string; 
  logo_url?: string; 
}

interface Filiere { 
  name: string; 
  location?: string; 
  organization_name: string; 
}

interface Filiale { 
  name: string; 
  filiere_name: string; 
  organization_name: string; 
}

interface Site { 
  name: string; 
  filiale_name?: string; 
  filiere_name?: string; 
  organization_name: string; 
  address?: string; 
}

interface ConsolidatedIndicatorValue {
  id: string;
  organization_name: string;
  filiere_names: string[];
  filiale_names: string[];
  year: number;
  code: string;
  site_names: string[];
  axe_energetique: string | null;
  enjeux: string | null;
  normes: string | null;
  critere: string | null;
  indicateur: string | null;
  definition: string | null;
  processus: string | null;
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
  variations_pourcent: number | null;
  performances_pourcent: number | null;
  created_at: string;
  updated_at: string;
}

interface FiliereConsolidatedIndicatorValue {
  id: string;
  organization_name: string;
  filiere_names: string[];
  year: number;
  code: string;
  site_names: string[];
  axe_energetique: string | null;
  enjeux: string | null;
  normes: string | null;
  critere: string | null;
  indicateur: string | null;
  definition: string | null;
  processus: string | null;
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
  variations_pourcent: number | null;
  performances_pourcent: number | null;
  created_at: string;
  updated_at: string;
}

interface FilialeConsolidatedIndicatorValue {
  id: string;
  organization_name: string;
  filiere_name: string | null;
  filiale_names: string[];
  year: number;
  code: string;
  site_names: string[];
  axe_energetique: string | null;
  enjeux: string | null;
  normes: string | null;
  critere: string | null;
  indicateur: string | null;
  definition: string | null;
  processus: string | null;
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
  variations_pourcent: number | null;
  performances_pourcent: number | null;
  created_at: string;
  updated_at: string;
}

const AdminClientPilotagePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userLevel, setUserLevel] = useState<string | null>(null);
  const [userFiliereName, setUserFiliereName] = useState<string | null>(null);
  const [userFilialeName, setUserFilialeName] = useState<string | null>(null);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [filiales, setFiliales] = useState<Filiale[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isComplex, setIsComplex] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'sites' | 'global'>('sites');
  const [expandedSections, setExpandedSections] = useState({ filieres: true, filiales: true, sites: true });
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // UI state
  const [selectedFiliere, setSelectedFiliere] = useState<string | null>(null);
  const [selectedFiliale, setSelectedFiliale] = useState<string | null>(null);

  // Global view state
  const [consolidatedIndicators, setConsolidatedIndicators] = useState<ConsolidatedIndicatorValue[]>([]);
  const [isLoadingConsolidated, setIsLoadingConsolidated] = useState(false);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  // Filiere view state
  const [filiereConsolidatedIndicators, setFiliereConsolidatedIndicators] = useState<FiliereConsolidatedIndicatorValue[]>([]);
  const [isLoadingFiliereConsolidated, setIsLoadingFiliereConsolidated] = useState(false);
  const [filiereError, setFiliereError] = useState<string | null>(null);

  // Filiale view state
  const [filialeConsolidatedIndicators, setFilialeConsolidatedIndicators] = useState<FilialeConsolidatedIndicatorValue[]>([]);
  const [isLoadingFilialeConsolidated, setIsLoadingFilialeConsolidated] = useState(false);
  const [filialeError, setFilialeError] = useState<string | null>(null);

  // Site (per filiale) view state
  const [siteConsolidatedIndicators, setSiteConsolidatedIndicators] = useState<ConsolidatedIndicatorValue[]>([]);
  const [isLoadingSiteConsolidated, setIsLoadingSiteConsolidated] = useState(false);
  const [siteError, setSiteError] = useState<string | null>(null);

  // Years for filtering
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  // Months for display
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  useEffect(() => {
    if (user?.email) {
      fetchOrganizationData();
    }
  }, [user?.email]);

  useEffect(() => {
    if (viewMode !== 'global' || !organization) {
      // Clear data when not in global view or no org
      setConsolidatedIndicators([]);
      setFiliereConsolidatedIndicators([]);
      setFilialeConsolidatedIndicators([]);
      setSiteConsolidatedIndicators([]);
      return;
    }

    if (isComplex) {
      if (selectedFiliere && selectedFiliale) {
        fetchSiteConsolidatedIndicators();
      } else if (selectedFiliere) {
        fetchFilialeConsolidatedIndicators();
      } else {
        fetchFiliereConsolidatedIndicators();
      }
    } else {
      fetchConsolidatedIndicators();
    }
  }, [viewMode, organization, isComplex, yearFilter, selectedFiliere, selectedFiliale]);

  const fetchOrganizationData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get user's organization from profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('organization_name, organization_level, filiere_name, filiale_name')
        .eq('email', user?.email)
        .single();

      if (profileError) throw profileError;

      if (!profileData?.organization_name) {
        throw new Error("Vous n'êtes associé à aucune organisation");
      }

      const orgName = profileData.organization_name;
      setUserLevel(profileData.organization_level);
      setUserFiliereName(profileData.filiere_name);
      setUserFilialeName(profileData.filiale_name);

      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('name', orgName)
        .single();

      if (orgError) throw orgError;
      setOrganization(orgData);

      // Get filieres with filtering based on user level
      let filiereQuery = supabase
        .from('filieres')
        .select('*')
        .eq('organization_name', orgName);
      
      if (profileData.organization_level === 'filiere' && profileData.filiere_name) {
        filiereQuery = filiereQuery.eq('name', profileData.filiere_name);
      }
      
      const { data: filieresData, error: filieresError } = await filiereQuery;

      if (filieresError) throw filieresError;
      setFilieres(filieresData || []);

      // Get filiales with filtering based on user level
      let filialeQuery = supabase
        .from('filiales')
        .select('*')
        .eq('organization_name', orgName);
      
      if (profileData.organization_level === 'filiere' && profileData.filiere_name) {
        filialeQuery = filialeQuery.eq('filiere_name', profileData.filiere_name);
      } else if (profileData.organization_level === 'filiale' && profileData.filiale_name) {
        filialeQuery = filialeQuery.eq('name', profileData.filiale_name);
      }
      
      const { data: filialesData, error: filialesError } = await filialeQuery;

      if (filialesError) throw filialesError;
      setFiliales(filialesData || []);

      // Get sites with filtering based on user level
      let siteQuery = supabase
        .from('sites')
        .select('*')
        .eq('organization_name', orgName);
      
      if (profileData.organization_level === 'filiere' && profileData.filiere_name) {
        siteQuery = siteQuery.eq('filiere_name', profileData.filiere_name);
      } else if (profileData.organization_level === 'filiale' && profileData.filiale_name) {
        siteQuery = siteQuery.eq('filiale_name', profileData.filiale_name);
      }
      
      const { data: sitesData, error: sitesError } = await siteQuery;

      if (sitesError) throw sitesError;
      setSites(sitesData || []);

      // Determine if organization is complex (has filieres or filiales)
      setIsComplex((filieresData && filieresData.length > 0) || (filialesData && filialesData.length > 0));

    } catch (err: any) {
      console.error('Error fetching organization data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnToDashboard = () => {
    navigate('/dashboard');
  };

  const handleSelectFiliere = (filiereName: string) => {
    setSelectedFiliere(filiereName);
    setSelectedFiliale(null);
  };

  const handleSelectFiliale = (filialeName: string) => {
    setSelectedFiliale(filialeName);
  };

  const handleSelectSite = (siteName: string) => {
    // Navigate to the site processes page
    navigate(`/site/${siteName}`);
  };

  const toggleSection = (section: 'filieres' | 'filiales' | 'sites') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const fetchConsolidatedIndicators = async () => {
    if (!organization) return;
    try {
      setIsLoadingConsolidated(true);
      setConsolidatedIndicators([]);
      setFiliereConsolidatedIndicators([]);
      setFilialeConsolidatedIndicators([]);
      setSiteConsolidatedIndicators([]);
      
      const { data, error } = await supabase
        .from('filiere_consolide')
        .select('*')
        .eq('organization_name', organization.name)
        .eq('year', yearFilter)
        .order('code');

      if (error) throw error;
      setConsolidatedIndicators(data || []);
    } catch (err: any) {
      console.error('Error fetching consolidated indicators:', err);
    } finally {
      setIsLoadingConsolidated(false);
    }
  };

  const fetchFiliereConsolidatedIndicators = async () => {
    if (!organization) return;
    try {
      setIsLoadingFiliereConsolidated(true);
      setFiliereError(null);
      setConsolidatedIndicators([]);
      setFilialeConsolidatedIndicators([]);
      setSiteConsolidatedIndicators([]);

      const { data, error } = await supabase
        .from('filiere_consolide')
        .select('*')
        .eq('organization_name', organization.name)
        .eq('year', yearFilter)
        .order('code');

      if (error) throw error;
      setFiliereConsolidatedIndicators(data || []);
    } catch (err: any) {
      console.error('Error fetching filiere consolidated indicators:', err);
      setFiliereError(err.message);
    } finally {
      setIsLoadingFiliereConsolidated(false);
    }
  };

  const fetchFilialeConsolidatedIndicators = async () => {
    if (!organization || !selectedFiliere) return;
    try {
      setIsLoadingFilialeConsolidated(true);
      setFilialeError(null);
      setConsolidatedIndicators([]);
      setFiliereConsolidatedIndicators([]);
      setSiteConsolidatedIndicators([]);

      const { data, error } = await supabase
        .from('filaires_consolide')
        .select('*')
        .eq('organization_name', organization.name)
        .eq('year', yearFilter)
        .eq('filiere_name', selectedFiliere)
        .order('code');

      if (error) throw error;
      setFilialeConsolidatedIndicators(data || []);
    } catch (err: any) {
      console.error('Error fetching filiale consolidated indicators:', err);
      setFilialeError(err.message);
    } finally {
      setIsLoadingFilialeConsolidated(false);
    }
  };

  const fetchSiteConsolidatedIndicators = async () => {
    if (!organization || !selectedFiliere || !selectedFiliale) return;
    try {
      setIsLoadingSiteConsolidated(true);
      setSiteError(null);
      setConsolidatedIndicators([]);
      setFiliereConsolidatedIndicators([]);
      setFilialeConsolidatedIndicators([]);
      setSiteConsolidatedIndicators([]);

      const { data, error } = await supabase
        .from('consolide_site')
        .select('*')
        .eq('organization_name', organization.name)
        .eq('year', yearFilter)
        .eq('filiere_name', selectedFiliere)
        .eq('filiale_name', selectedFiliale)
        .order('code');

      if (error) throw error;
      setSiteConsolidatedIndicators(data || []);
    } catch (err: any) {
      console.error('Error fetching site consolidated indicators:', err);
      setSiteError(err.message);
    } finally {
      setIsLoadingSiteConsolidated(false);
    }
  };

  const toggleRowExpansion = (code: string) => {
    setExpandedRows(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const filteredConsolidatedIndicators = consolidatedIndicators.filter(indicator => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      (indicator.indicateur && indicator.indicateur.toLowerCase().includes(searchLower)) ||
      indicator.code.toLowerCase().includes(searchLower) ||
      (indicator.definition && indicator.definition.toLowerCase().includes(searchLower))
    );
  });

  const filteredFiliereConsolidatedIndicators = filiereConsolidatedIndicators.filter(indicator => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      (indicator.indicateur && indicator.indicateur.toLowerCase().includes(searchLower)) ||
      indicator.code.toLowerCase().includes(searchLower) ||
      (indicator.definition && indicator.definition.toLowerCase().includes(searchLower))
    );
  });

  const filteredFilialeConsolidatedIndicators = filialeConsolidatedIndicators.filter(indicator => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      (indicator.indicateur && indicator.indicateur.toLowerCase().includes(searchLower)) ||
      indicator.code.toLowerCase().includes(searchLower) ||
      (indicator.definition && indicator.definition.toLowerCase().includes(searchLower))
    );
  });

  const filteredSiteConsolidatedIndicators = siteConsolidatedIndicators.filter(indicator => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      (indicator.indicateur && indicator.indicateur.toLowerCase().includes(searchLower)) ||
      indicator.code.toLowerCase().includes(searchLower) ||
      (indicator.definition && indicator.definition.toLowerCase().includes(searchLower))
    );
  });

  const filteredFilieres = filieres.filter(filiere => 
    filiere.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (filiere.location && filiere.location.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => a.name.localeCompare(b.name));

  const filteredFiliales = filiales
    .filter(filiale => selectedFiliere ? filiale.filiere_name === selectedFiliere : true)
    .filter(filiale => filiale.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredSites = sites
    .filter(site => {
      if (selectedFiliale) {
        return site.filiale_name === selectedFiliale;
      }
      if (isComplex || selectedFiliere) {
        return false;
      }
      return true;
    })
    .filter(site => site.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (site.address && site.address.toLowerCase().includes(searchTerm.toLowerCase())))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
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
          <h2 className="text-xl font-semibold text-white mb-2">Chargement de votre organisation</h2>
          <p className="text-gray-400">Nous préparons votre espace de pilotage...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="max-w-2xl w-full bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-red-500/50"
        >
          <div className="p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-red-500/20 rounded-full mr-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">Erreur de chargement</h1>
            </div>
            <p className="text-gray-300 mb-6">{error}</p>
            <div className="flex space-x-4">
              <button
                onClick={fetchOrganizationData}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300"
              >
                Réessayer
              </button>
              <button
                onClick={handleReturnToDashboard}
                className="px-6 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-all duration-300"
              >
                Retour au tableau de bord
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleReturnToDashboard}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour</span>
          </button>
          
          {organization && (
            <div className="flex items-center space-x-3 bg-gray-800/50 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm">
              {organization.logo_url ? (
                <img src={organization.logo_url} alt="Logo" className="w-8 h-8 object-contain rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white">
                  <Building2 className="w-4 h-4" />
                </div>
              )}
              <span className="font-medium text-gray-200">{organization.name}</span>
            </div>
          )}
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
              Pilotage Organisationnel
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Naviguez à travers votre organisation et accédez aux tableaux de bord.
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto relative"
        >
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher une filière, filiale ou site..."
            className="block w-full pl-12 pr-4 py-3 border border-gray-700 rounded-xl bg-gray-800/50 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </motion.div>
      </header>

      {/* Main content */}
      <main className="space-y-8">
        {/* Breadcrumb navigation */}
        {(selectedFiliere || selectedFiliale) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-2 text-sm text-gray-400 bg-gray-800/50 backdrop-blur-sm p-3 rounded-xl shadow-sm max-w-max border border-gray-700"
          >
            <button
              onClick={() => {
                setSelectedFiliere(null);
                setSelectedFiliale(null);
              }}
              className="flex items-center hover:text-purple-400 transition-colors"
            >
              <Home className="w-4 h-4 mr-1" />
              <span>Tous</span>
            </button>
            
            {selectedFiliere && (
              <>
                <ChevronRight className="w-4 h-4 text-gray-600" />
                <button
                  onClick={() => setSelectedFiliale(null)}
                  className="flex items-center hover:text-purple-400 transition-colors"
                >
                  <Layers className="w-4 h-4 mr-1" />
                  <span>{selectedFiliere}</span>
                </button>
              </>
            )}
            
            {selectedFiliale && (
              <>
                <ChevronRight className="w-4 h-4 text-gray-600" />
                <div className="flex items-center text-white">
                  <Building className="w-4 h-4 mr-1" />
                  <span>{selectedFiliale}</span>
                </div>
              </>
            )}
          </motion.div>
        )}
        
        {/* View Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-2 border border-gray-700 flex">
            <button
              onClick={() => setViewMode('sites')}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all ${
                viewMode === 'sites' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Vue Structure</span>
            </button>
            <button
              onClick={() => setViewMode('global')}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all ${
                viewMode === 'global' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Vue Consolidée</span>
            </button>
          </div>
        </motion.div>
        
        {/* Filieres Section */}
        {viewMode === 'sites' && isComplex && (!selectedFiliere || searchTerm) && filteredFilieres.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-700 overflow-hidden"
          >
            <button
              onClick={() => toggleSection('filieres')}
              className="w-full flex justify-between items-center p-6 hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg text-white">
                  <Layers className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-semibold text-white">Filières</h2>
                <span className="text-sm text-gray-400 bg-gray-700 px-2.5 py-1 rounded-full">
                  {filteredFilieres.length}
                </span>
              </div>
              {expandedSections.filieres ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            <AnimatePresence>
              {expandedSections.filieres && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {filteredFilieres.map((filiere) => (
                    <motion.div
                      key={filiere.name}
                      whileHover={{ y: -4, boxShadow: '0 10px 15px -3px rgba(147, 51, 234, 0.2), 0 4px 6px -2px rgba(147, 51, 234, 0.1)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectFiliere(filiere.name)}
                      className="bg-gray-800 border border-gray-700 rounded-xl p-5 cursor-pointer hover:border-purple-500 transition-all duration-300 group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-purple-400">
                          <Layers className="w-6 h-6" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition-colors" />
                      </div>
                      <h3 className="font-semibold text-white text-lg mb-1">{filiere.name}</h3>
                      {filiere.location && (
                        <div className="flex items-center text-sm text-gray-400">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span>{filiere.location}</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )}
        
        {/* Filiales Section */}
        {viewMode === 'sites' && isComplex && selectedFiliere && (!selectedFiliale || searchTerm) && filteredFiliales.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-700 overflow-hidden"
          >
            <button
              onClick={() => toggleSection('filiales')}
              className="w-full flex justify-between items-center p-6 hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg text-white">
                  <Building className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-semibold text-white">Filiales</h2>
                <span className="text-sm text-gray-400 bg-gray-700 px-2.5 py-1 rounded-full">
                  {filteredFiliales.length}
                </span>
                </div>
              {expandedSections.filiales ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            <AnimatePresence>
              {expandedSections.filiales && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {filteredFiliales.map((filiale) => (
                    <motion.div
                      key={filiale.name}
                      whileHover={{ y: -4, boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.2), 0 4px 6px -2px rgba(59, 130, 246, 0.1)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectFiliale(filiale.name)}
                      className="bg-gray-800 border border-gray-700 rounded-xl p-5 cursor-pointer hover:border-blue-500 transition-all duration-300 group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-blue-400">
                          <Building className="w-6 h-6" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors" />
                      </div>
                      <h3 className="font-semibold text-white text-lg mb-1">{filiale.name}</h3>
                      <div className="text-xs text-gray-500 mt-2">
                        <span className="bg-gray-700/50 px-2 py-1 rounded-md text-gray-400">Filière: {filiale.filiere_name}</span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )}
        
        {viewMode === 'sites' && (
          <>
            {/* Sites Section */}
            {filteredSites.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-700 overflow-hidden"
              >
                <button
                  onClick={() => toggleSection('sites')}
                  className="w-full flex justify-between items-center p-6 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-green-600 to-teal-600 rounded-lg text-white">
                      <Factory className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-semibold text-white">Sites</h2>
                    <span className="text-sm text-gray-400 bg-gray-700 px-2.5 py-1 rounded-full">
                      {filteredSites.length}
                    </span>
                  </div>
                  {expandedSections.sites ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                
                <AnimatePresence>
                  {expandedSections.sites && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                      {filteredSites.map((site) => (
                        <motion.div
                          key={site.name}
                          whileHover={{ y: -4, boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2), 0 4px 6px -2px rgba(16, 185, 129, 0.1)' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectSite(site.name)}
                          className="bg-gray-800 border border-gray-700 rounded-xl p-5 cursor-pointer hover:border-green-500 transition-all duration-300 group"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-green-400">
                              <Factory className="w-6 h-6" />
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-green-400 transition-colors" />
                          </div>
                          <h3 className="font-semibold text-white text-lg mb-1">{site.name}</h3>
                          {site.address && (
                            <div className="flex items-center text-sm text-gray-400">
                              <MapPin className="w-4 h-4 mr-2" />
                              <span className="truncate">{site.address}</span>
                            </div>
                          )}
                          <div className="mt-4 flex flex-wrap gap-2">
                            {site.filiere_name && (
                              <span className="text-xs bg-purple-600/20 text-purple-300 px-2.5 py-1 rounded-full">
                                {site.filiere_name}
                              </span>
                            )}
                            {site.filiale_name && (
                              <span className="text-xs bg-blue-600/20 text-blue-300 px-2.5 py-1 rounded-full">
                                {site.filiale_name}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            )}
          </>
        )}
        
        {viewMode === 'global' && (
          <GlobalView
            isComplex={isComplex}
            selectedFiliere={selectedFiliere}
            selectedFiliale={selectedFiliale}
            isLoadingSiteConsolidated={isLoadingSiteConsolidated}
            siteError={siteError}
            filteredSiteConsolidatedIndicators={filteredSiteConsolidatedIndicators}
            yearFilter={yearFilter}
            setYearFilter={setYearFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            expandedRows={expandedRows}
            toggleRowExpansion={toggleRowExpansion}
            months={months}
            isLoadingFilialeConsolidated={isLoadingFilialeConsolidated}
            filialeError={filialeError}
            filteredFilialeConsolidatedIndicators={filteredFilialeConsolidatedIndicators}
            isLoadingFiliereConsolidated={isLoadingFiliereConsolidated}
            filiereError={filiereError}
            filteredFiliereConsolidatedIndicators={filteredFiliereConsolidatedIndicators}
            isLoadingConsolidated={isLoadingConsolidated}
            error={error}
            filteredConsolidatedIndicators={filteredConsolidatedIndicators}
          />
        )}
        
        {/* Empty state */}
        {!isLoading && !error && viewMode === 'sites' && filteredFilieres.length === 0 && filteredFiliales.length === 0 && filteredSites.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-700 p-12 text-center"
          >
            <div className="mx-auto max-w-md">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-700 to-gray-600 rounded-full flex items-center justify-center text-gray-400 mb-6">
                <Search className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Aucun Résultat</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm 
                  ? "Aucun élément ne correspond à votre recherche. Essayez de nouveaux termes."
                  : "Votre organisation ne contient actuellement aucun élément à afficher."}
              </p>
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-purple-500/50"
                >
                  Réinitialiser la recherche
                </button>
              ) : (
                <button
                  onClick={fetchOrganizationData}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-purple-500/50"
                >
                  Actualiser les données
                </button>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default AdminClientPilotagePage;

const GlobalView = ({
  isComplex,
  selectedFiliere,
  selectedFiliale,
  isLoadingSiteConsolidated,
  siteError,
  filteredSiteConsolidatedIndicators,
  yearFilter,
  setYearFilter,
  searchQuery,
  setSearchQuery,
  expandedRows,
  toggleRowExpansion,
  months,
  isLoadingFilialeConsolidated,
  filialeError,
  filteredFilialeConsolidatedIndicators,
  isLoadingFiliereConsolidated,
  filiereError,
  filteredFiliereConsolidatedIndicators,
  isLoadingConsolidated,
  error,
  filteredConsolidatedIndicators
}: any) => {
  const years = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

  const renderIndicatorTable = (
    title: string,
    icon: React.ReactNode,
    isLoading: boolean,
    error: string | null,
    indicators: any[],
    columns: any[],
    emptyMessage: string
  ) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-700 overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg mr-4">
              {icon}
            </div>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(parseInt(e.target.value))}
                className="pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
              >
                {years.map(year => (
                  <option key={year} value={year} className="bg-gray-800">{year}</option>
                ))}
              </select>
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
      <div className="p-6">
        {isLoading ? (
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
        ) : indicators.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Aucun indicateur trouvé</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              {searchQuery
                ? "Aucun indicateur ne correspond à votre recherche."
                : emptyMessage}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800/50">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {col.header}
                    </th>
                  ))}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Détails
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {indicators.map((indicator) => {
                  const isExpanded = expandedRows.includes(indicator.code);
                  return (
                    <React.Fragment key={indicator.id}>
                      <tr className="hover:bg-gray-700/50">
                        {columns.map(col => (
                          <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {col.render(indicator)}
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          <button
                            onClick={() => toggleRowExpansion(indicator.code)}
                            className="flex items-center space-x-1 text-purple-400 hover:text-purple-300"
                          >
                            <span>Détails</span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-900/50">
                          <td colSpan={columns.length + 1} className="p-4">
                            <div className="overflow-x-auto bg-gray-800 rounded-lg p-4">
                              <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-700/50">
                                  <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Mois</th>
                                    {months.map(month => <th key={month} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{month}</th>)}
                                  </tr>
                                </thead>
                                <tbody className="bg-gray-800 divide-y divide-gray-700">
                                  <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">Valeur {yearFilter}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{indicator.janvier || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{indicator.fevrier || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{indicator.mars || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{indicator.avril || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{indicator.mai || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{indicator.juin || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{indicator.juillet || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{indicator.aout || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{indicator.septembre || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{indicator.octobre || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{indicator.novembre || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{indicator.decembre || '-'}</td>
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
    </motion.div>
  );

  const siteColumns = [
    { key: 'axe', header: 'Axe Énergétique', render: (indicator: any) => indicator.axe_energetique || '-' },
    { key: 'enjeux', header: 'Enjeux', render: (indicator: any) => indicator.enjeux || '-' },
    { key: 'normes', header: 'Normes', render: (indicator: any) => indicator.normes || '-' },
    { key: 'critere', header: 'Critère', render: (indicator: any) => indicator.critere || '-' },
    { key: 'indicateur', header: 'Indicateur', render: (indicator: any) => <div className="font-semibold text-white">{indicator.indicateur || indicator.code}</div> },
    { key: 'valeur', header: `Valeur ${yearFilter}`, render: (indicator: any) => indicator.value !== null ? indicator.value : '-' },
    { key: 'cible', header: 'Cible', render: (indicator: any) => indicator.cible !== null ? indicator.cible : '-' },
    { key: 'sites', header: 'Sites', render: (indicator: any) => (
      <div className="flex flex-wrap gap-1">
        {indicator.site_names?.map((site: string, index: number) => (
          <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-600/30 text-green-300">{site}</span>
        ))}
      </div>
    )},
  ];

  const filialeColumns = [
    { key: 'axe', header: 'Axe Énergétique', render: (indicator: any) => indicator.axe_energetique || '-' },
    { key: 'enjeux', header: 'Enjeux', render: (indicator: any) => indicator.enjeux || '-' },
    { key: 'normes', header: 'Normes', render: (indicator: any) => indicator.normes || '-' },
    { key: 'critere', header: 'Critère', render: (indicator: any) => indicator.critere || '-' },
    { key: 'indicateur', header: 'Indicateur', render: (indicator: any) => <div className="font-semibold text-white">{indicator.indicateur || indicator.code}</div> },
    { key: 'valeur', header: `Valeur ${yearFilter}`, render: (indicator: any) => indicator.value !== null ? indicator.value : '-' },
    { key: 'cible', header: 'Cible', render: (indicator: any) => indicator.cible !== null ? indicator.cible : '-' },
   
    { key: 'filiales', header: 'Filiales', render: (indicator: any) => (
      <div className="flex flex-wrap gap-1">
        {indicator.filiale_names?.map((filiale: string, index: number) => (
          <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600/30 text-blue-300">{filiale}</span>
        ))}
      </div>
    )},
    { key: 'sites', header: 'Sites', render: (indicator: any) => (
      <div className="flex flex-wrap gap-1">
        {indicator.site_names?.slice(0, 2).map((site: string, index: number) => (
          <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-600/30 text-green-300">{site}</span>
        ))}
        {indicator.site_names?.length > 2 && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">+{indicator.site_names.length - 2}</span>}
      </div>
    )},
  ];

  const filiereColumns = [
    { key: 'axe', header: 'Axe Énergétique', render: (indicator: any) => indicator.axe_energetique || '-' },
    { key: 'enjeux', header: 'Enjeux', render: (indicator: any) => indicator.enjeux || '-' },
    { key: 'normes', header: 'Normes', render: (indicator: any) => indicator.normes || '-' },
    { key: 'critere', header: 'Critère', render: (indicator: any) => indicator.critere || '-' },
    { key: 'indicateur', header: 'Indicateur', render: (indicator: any) => <div className="font-semibold text-white">{indicator.indicateur || indicator.code}</div> },
    { key: 'valeur', header: `Valeur ${yearFilter}`, render: (indicator: any) => indicator.value !== null ? indicator.value : '-' },
    { key: 'cible', header: 'Cible', render: (indicator: any) => indicator.cible !== null ? indicator.cible : '-' },
    
    { key: 'filieres', header: 'Filières', render: (indicator: any) => (
      <div className="flex flex-wrap gap-1">
        {indicator.filiere_names?.map((filiere: string, index: number) => (
          <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-600/30 text-purple-300">{filiere}</span>
        ))}
      </div>
    )}
  ];
  
  const getPerformanceColor = (performance: number | null) => {
    if (performance === null) return 'text-gray-400';
    if (performance >= 100) return 'text-green-400';
    if (performance >= 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  const renderVariation = (variation: number | null) => {
    if (variation === null) return <span className="text-gray-400">-</span>;
    const color = variation > 0 ? 'text-green-400' : variation < 0 ? 'text-red-400' : 'text-gray-400';
    const icon = variation > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : variation < 0 ? <TrendingDown className="w-4 h-4 mr-1" /> : <Minus className="w-4 h-4 mr-1" />;
    return (
      <span className={`flex items-center ${color}`}>
        {icon}
        {variation.toFixed(2)}%
      </span>
    );
  };

  const globalColumns = [
    { key: 'axe', header: 'Axe Énergétique', render: (indicator: any) => <span className="font-medium text-gray-300">{indicator.axe_energetique || '-'}</span> },
    { key: 'enjeux', header: 'Enjeux', render: (indicator: any) => <span className="text-sm text-gray-400">{indicator.enjeux || '-'}</span> },
    { key: 'normes', header: 'Normes', render: (indicator: any) => <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">{indicator.normes || '-'}</span> },
    { key: 'critere', header: 'Critère', render: (indicator: any) => <span className="text-sm text-gray-400">{indicator.critere || '-'}</span> },
    { key: 'code', header: 'Code', render: (indicator: any) => <span className="font-mono text-purple-400">{indicator.code}</span> },
    { key: 'indicateur', header: 'Indicateur', render: (indicator: any) => <div className="font-semibold text-white">{indicator.indicateur || indicator.code}</div> },
    { key: 'frequence', header: 'Fréquence', render: (indicator: any) => indicator.frequence || 'Mensuelle' },
    { key: 'unite', header: 'Unité', render: (indicator: any) => <span className="font-semibold">{indicator.unite || '-'}</span> },
    { key: 'type', header: 'Type', render: (indicator: any) => indicator.type || '-' },
    { key: 'formule', header: 'Formule', render: (indicator: any) => indicator.formule || '-' },
    { key: 'valeur_prec', header: `Valeur ${yearFilter - 1}`, render: (indicator: any) => indicator.valeur_precedente !== null ? indicator.valeur_precedente : '-' },
    { key: 'valeur', header: `Valeur ${yearFilter}`, render: (indicator: any) => <span className="text-2xl font-bold text-white">{indicator.value !== null ? indicator.value : '-'}</span> },
    { key: 'cible', header: 'Cible', render: (indicator: any) => <span className="text-lg font-medium text-blue-300">{indicator.cible !== null ? indicator.cible : '-'}</span> },
    { key: 'variation', header: 'Variation', render: (indicator: any) => renderVariation(indicator.variations_pourcent) },
    { key: 'performance', header: 'Performance', render: (indicator: any) => <span className={`text-lg font-bold ${getPerformanceColor(indicator.performances_pourcent)}`}>{indicator.performances_pourcent !== null ? `${indicator.performances_pourcent.toFixed(2)}%` : '-'}</span> },
    { key: 'sites', header: 'Sites', render: (indicator: any) => (
      <div className="flex flex-wrap gap-1 max-w-xs">
        {indicator.site_names?.slice(0, 2).map((site: string, index: number) => (
          <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600/30 text-blue-300">{site}</span>
        ))}
        {indicator.site_names?.length > 2 && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">+{indicator.site_names.length - 2}</span>}
      </div>
    )},
  ];


  if (isComplex) {
    if (selectedFiliere && selectedFiliale) {
      return renderIndicatorTable(
        `Vue Consolidée par Site pour ${selectedFiliale}`,
        <Factory className="w-6 h-6 text-white" />,
        isLoadingSiteConsolidated,
        siteError,
        filteredSiteConsolidatedIndicators,
        siteColumns,
        `Aucun indicateur consolidé pour ${selectedFiliale} pour l'année ${yearFilter}.`
      );
    } else if (selectedFiliere) {
      return renderIndicatorTable(
        'Vue Consolidée par Filiale',
        <Building className="w-6 h-6 text-white" />,
        isLoadingFilialeConsolidated,
        filialeError,
        filteredFilialeConsolidatedIndicators,
        filialeColumns,
        `Aucun indicateur consolidé pour l'année ${yearFilter}.`
      );
    } else {
      return renderIndicatorTable(
        'Vue Consolidée par Filière',
        <Layers className="w-6 h-6 text-white" />,
        isLoadingFiliereConsolidated,
        filiereError,
        filteredFiliereConsolidatedIndicators,
        filiereColumns,
        `Aucun indicateur consolidé pour l'année ${yearFilter}.`
      );
    }
  }

  return renderIndicatorTable(
    'Vue Globale Consolidée',
    <Globe className="w-6 h-6 text-white" />,
    isLoadingConsolidated,
    error,
    filteredConsolidatedIndicators,
    globalColumns,
    `Aucun indicateur consolidé pour l'année ${yearFilter}.`
  );
};