import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, 
  Zap, 
  Mail, 
  CheckCircle, 
  Settings,
  Target,
  TrendingUp,
  ArrowRight,
  Building2,
  Shield,
  User,
  Building,
  Factory,
  Briefcase,
  Users,
  MapPin,
  BarChart3,
  Calendar,
  FileText,
  ChevronRight,
  Sparkles,
  Globe,
  Lightbulb,
  Wind,
  Sun,
  Leaf,
  Battery,
  Gauge,
  AlertTriangle,
  RefreshCw,
  Phone,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, testSupabaseConnection } from '../lib/supabase';

interface OrganizationData {
  name: string;
  description?: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
}

interface OrganizationStats {
  filiereCount: number;
  filialeCount: number;
  siteCount: number;
  filieres: string[];
  filiales: string[];
  sites: string[];
}

interface EnergyConsumption {
  month: string;
  value: number;
  type: string;
}

const DashboardPage: React.FC = () => {
  const { user, logout, returnToAdmin } = useAuth();
  const navigate = useNavigate();
  const [showNotification, setShowNotification] = useState(true);
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);
  const [organizationStats, setOrganizationStats] = useState<OrganizationStats>({
    filiereCount: 0,
    filialeCount: 0,
    siteCount: 0,
    filieres: [],
    filiales: [],
    sites: []
  });
  const [energyConsumption, setEnergyConsumption] = useState<EnergyConsumption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [retryCount, setRetryCount] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNotification(false);
    }, 10000);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    initializeDashboard();
    generateMockEnergyData();
    
    if (user?.role === 'admin') {
      setIsAdmin(true);
    }
  }, [user?.email]);

  const initializeDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setConnectionStatus('checking');

      // Test Supabase connection first
      const isConnected = await testSupabaseConnection();
      
      if (!isConnected) {
        setConnectionStatus('disconnected');
        throw new Error('Unable to connect to Supabase. Please check your internet connection and Supabase configuration.');
      }

      setConnectionStatus('connected');
      await fetchOrganizationData();
    } catch (error: any) {
      setConnectionStatus('disconnected');
      setError(error.message || 'An unexpected error occurred while initializing the dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrganizationData = async () => {
    if (!user?.email) {
      return;
    }

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('organization_name, filiere_name, filiale_name, site_name')
        .eq('email', user.email)
        .single();
        
      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // No profile found - this is okay for new users
          console.log('No profile found for user, using default settings');
          return;
        }
        throw new Error(`Failed to fetch profile data: ${profileError.message}`);
      }
      
      if (!profileData?.organization_name) {
        console.log('User has no organization assigned');
        return;
      }
      
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('name', profileData.organization_name)
        .single();

      if (orgError) {
        if (orgError.code === 'PGRST116') {
          console.log('Organization not found');
          return;
        }
        throw new Error(`Failed to fetch organization data: ${orgError.message}`);
      }
      
      setOrganizationData(orgData);

      // Fetch related data with error handling
      const [filiereResult, filialeResult, siteResult] = await Promise.allSettled([
        supabase
          .from('filieres')
          .select('name')
          .eq('organization_name', profileData.organization_name),
        supabase
          .from('filiales')
          .select('name')
          .eq('organization_name', profileData.organization_name),
        supabase
          .from('sites')
          .select('name')
          .eq('organization_name', profileData.organization_name)
      ]);

      const filiereData = filiereResult.status === 'fulfilled' ? filiereResult.value.data : [];
      const filialeData = filialeResult.status === 'fulfilled' ? filialeResult.value.data : [];
      const siteData = siteResult.status === 'fulfilled' ? siteResult.value.data : [];

      setOrganizationStats({
        filiereCount: filiereData?.length || 0,
        filialeCount: filialeData?.length || 0,
        siteCount: siteData?.length || 0,
        filieres: filiereData?.map(f => f.name) || [],
        filiales: filialeData?.map(f => f.name) || [],
        sites: siteData?.map(s => s.name) || []
      });
    } catch (error: any) {
      console.error('Error fetching organization data:', error);
      throw error;
    }
  };

  const generateMockEnergyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const types = ['Électricité', 'Gaz', 'Renouvelable'];
    
    const data: EnergyConsumption[] = [];
    
    months.forEach(month => {
      types.forEach(type => {
        let baseValue = 0;
        if (type === 'Électricité') baseValue = 80 + Math.random() * 40;
        if (type === 'Gaz') baseValue = 50 + Math.random() * 30;
        if (type === 'Renouvelable') baseValue = 20 + Math.random() * 15;
        
        const monthIndex = months.indexOf(month);
        let seasonalFactor = 1;
        
        if (monthIndex <= 1 || monthIndex >= 10) seasonalFactor = 1.3;
        else if (monthIndex >= 5 && monthIndex <= 7) seasonalFactor = 0.8;
        
        data.push({
          month,
          value: Math.round(baseValue * seasonalFactor),
          type
        });
      });
    });
    
    setEnergyConsumption(data);
  };

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    await initializeDashboard();
  };

  const handleLogout = async () => {
    try {
      // Si l'utilisateur est admin_client ET qu'il a un rôle original (donc c'était un admin), retourner au rôle admin
      if (user?.role === 'admin_client' && user?.original_role === 'admin') {
        const { success, error } = await returnToAdmin();
        
        if (success) {
          navigate('/admin');
          return;
        } else {
          setError(error || 'Erreur lors du retour au rôle admin');
          return;
        }
      }
      
      // Déconnexion normale pour les autres rôles (y compris admin_client de base)
      const { success } = await logout();
      if (success) navigate('/login');
    } catch (err) {
      console.error('Error during logout:', err);
      // En cas d'erreur, forcer la déconnexion
      const { success } = await logout();
      if (success) navigate('/login');
    }
  };

  const handleForceLogout = async () => {
    try {
      // Forcer la déconnexion complète sans restaurer le rôle
      const { success } = await logout();
      if (success) navigate('/login');
    } catch (err) {
      console.error('Error during logout:', err);
      // En cas d'erreur, forcer la déconnexion
      const { success } = await logout();
      if (success) navigate('/login');
    }
  };

  const handlePilotageClick = () => {
    // Route based on user role
    if (user?.role === 'contributeur') {
      navigate('/pilotage');
    } else if (user?.role === 'admin_client') {
      navigate('/admin-client-pilotage');
    } else if (user?.role === 'validateur') {
      navigate('/validation');
    } else {
      // Default to contributor page for other roles
      navigate('/pilotage');
    }
  };

  const handleGestionClick = () => {
    navigate('/GestionPage');
  };


  // Connection status indicator
  const ConnectionStatusIndicator = () => (
    <div className="flex items-center space-x-2">
      {connectionStatus === 'checking' && (
        <>
          <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />
          <span className="text-sm text-yellow-600">Vérification...</span>
        </>
      )}
      {connectionStatus === 'connected' && (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-600">Connecté</span>
        </>
      )}
      {connectionStatus === 'disconnected' && (
        <>
          <WifiOff className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600">Déconnecté</span>
        </>
      )}
    </div>
  );

  // Error state with enhanced information
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-md"
        >
          <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 text-white">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8" />
              <div>
                <h3 className="text-xl font-bold">Erreur de connexion</h3>
                <ConnectionStatusIndicator />
              </div>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-700 mb-4">{error}</p>
            
            {retryCount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700">
                  Tentatives de reconnexion: {retryCount}
                </p>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Solutions possibles:</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Vérifiez votre connexion internet</li>
                <li>• Assurez-vous que Supabase est configuré</li>
                <li>• Vérifiez les paramètres CORS dans Supabase</li>
                <li>• Contactez l'administrateur si le problème persiste</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-md transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Réessayer
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      <AnimatePresence>
        {showNotification && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div className="bg-white rounded-xl shadow-xl border border-emerald-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-3 text-white">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Connexion réussie</span>
                </div>
              </div>
              <div className="p-4 text-sm text-gray-700">
                Bienvenue dans votre espace de gestion énergétique
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header /aeria.jpg  */}
         <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="flex items-center">
                {/*  <img 
                  src="/aeria.jpg" 
                  alt="Logo" 
                  className="h-12 w-15 rounded-lg object-cover"
                />*/}
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-gray-900">
                    {organizationData?.name || 'Perf-Energie'}
                  </h1>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-gray-500">Dashboard Premium</p>
                    <ConnectionStatusIndicator />
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <div className="hidden md:flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-lg">
                <div className="bg-blue-100 p-1.5 rounded-full">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{user?.email}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user?.role?.replace('_', ' ') || 'Compte actif'}
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {user?.role === 'admin_client' && isAdmin && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleReturnToAdmin}
                    className="hidden md:flex items-center space-x-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-all border border-amber-200"
                  >
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">Retour Admin</span>
                  </motion.button>
                )}
                
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all border border-red-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm font-medium">Déconnexion</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
<div className="flex justify-center">
  <div className="w-[900px] h-[160px] bg-[url('/dash.jpeg')] bg-cover bg-center rounded-2xl shadow-md" />
</div>


      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Votre Espace de Contrôle
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Accédez à tous vos outils de gestion énergétique en un clic
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Gestion Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -10 }}
              onClick={handleGestionClick}
              className="group relative bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-green-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative p-6">
                <div className="flex justify-center mb-6">
                  <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg shadow-sm">
                    <Settings className="h-6 w-6 text-white" />
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 text-center mb-3">
                  Gestion
                </h3>
                
                <p className="text-gray-600 text-center mb-6">
                  Gérez vos paramètres et configurations avec une interface intuitive
                </p>
                
                <div className="flex justify-center">
                  <button className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium flex items-center group-hover:bg-emerald-100 transition-colors">
                    <span>Accéder</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Pilotage Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              whileHover={{ y: -10 }}
              onClick={handlePilotageClick}
              className="group relative bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative p-6">
                <div className="flex justify-center mb-6">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg shadow-sm">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 text-center mb-3">
                  {user?.role === 'validateur' ? "Pilotage" : "Pilotage"}
                </h3>
                
                <p className="text-gray-600 text-center mb-6">
                  {user?.role === 'validateur' 
                    ? "Validez les données soumises par les contributeurs" 
                    : "Suivez vos objectifs en temps réel avec des tableaux de bord avancés"}
                </p>
                
                <div className="flex justify-center">
                  <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium flex items-center group-hover:bg-blue-100 transition-colors">
                    <span>Accéder</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Rapports Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              whileHover={{ y: -10 }}
              onClick={() => navigate('/reports')}
              className="group relative bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-violet-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative p-6">
                <div className="flex justify-center mb-6">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg shadow-sm">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 text-center mb-3">
                  Rapports
                </h3>
                
                <p className="text-gray-600 text-center mb-6">
                  Analysez vos performances avec des rapports détaillés et personnalisés
                </p>
                
                <div className="flex justify-center">
                  <button className="px-4 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium flex items-center group-hover:bg-purple-100 transition-colors">
                    <span>Accéder</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Organization Stats */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Vue d'ensemble de l'organisation</h2>
            <p className="text-gray-600 text-lg">Statistiques de votre structure organisationnelle</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                  <div className="h-10 w-10 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-5 bg-gray-200 rounded mb-3 w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Filières Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg mr-4">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Filières</h3>
                  </div>
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-3xl font-bold text-gray-900">{organizationStats.filiereCount}</span>
                    <span className="text-sm text-gray-500">total</span>
                  </div>
                  
                  {organizationStats.filiereCount > 0 && (
                    <div className="space-y-2">
                      {organizationStats.filieres.slice(0, 3).map((filiere, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                          <span className="truncate">{filiere}</span>
                        </div>
                      ))}
                      {organizationStats.filieres.length > 3 && (
                        <button className="text-xs text-blue-600 font-medium mt-2 flex items-center">
                          <span>Voir plus</span>
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
              
              {/* Filiales Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-emerald-100 rounded-lg mr-4">
                      <Building className="h-5 w-5 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Filiales</h3>
                  </div>
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-3xl font-bold text-gray-900">{organizationStats.filialeCount}</span>
                    <span className="text-sm text-gray-500">total</span>
                  </div>
                  
                  {organizationStats.filialeCount > 0 && (
                    <div className="space-y-2">
                      {organizationStats.filiales.slice(0, 3).map((filiale, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
                          <span className="truncate">{filiale}</span>
                        </div>
                      ))}
                      {organizationStats.filiales.length > 3 && (
                        <button className="text-xs text-emerald-600 font-medium mt-2 flex items-center">
                          <span>Voir plus</span>
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
              
              {/* Sites Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg mr-4">
                      <Factory className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Sites</h3>
                  </div>
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-3xl font-bold text-gray-900">{organizationStats.siteCount}</span>
                    <span className="text-sm text-gray-500">total</span>
                  </div>
                  
                  {organizationStats.siteCount > 0 && (
                    <div className="space-y-2">
                      {organizationStats.sites.slice(0, 3).map((site, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                          <span className="truncate">{site}</span>
                        </div>
                      ))}
                      {organizationStats.sites.length > 3 && (
                        <button className="text-xs text-purple-600 font-medium mt-2 flex items-center">
                          <span>Voir plus</span>
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </section>

      {/* Organization Info */}
      {organizationData && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Informations de l'Organisation</h2>
              <p className="text-gray-600">Détails de votre organisation</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <div className="flex items-center mb-6">
                      <div className="p-2 bg-blue-100 rounded-lg mr-4">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">{organizationData.name}</h3>
                    </div>
                    
                    {organizationData.description && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
                        <p className="text-gray-700">{organizationData.description}</p>
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Adresse</h4>
                        <div className="flex items-start">
                          <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                          <p className="text-gray-700">
                            {organizationData.address}<br />
                            {organizationData.city}, {organizationData.country}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-3">Contact</h4>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <Mail className="w-5 h-5 text-gray-400 mr-3" />
                          <span className="text-gray-700">{organizationData.email}</span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="w-5 h-5 text-gray-400 mr-3" />
                          <span className="text-gray-700">{organizationData.phone}</span>
                        </div>
                        {organizationData.website && (
                          <div className="flex items-center">
                            <Globe className="w-5 h-5 text-gray-400 mr-3" />
                            <a href={organizationData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {organizationData.website.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <div className="flex items-center mb-2">
                        <Briefcase className="w-5 h-5 text-blue-600 mr-2" />
                        <h4 className="font-medium text-blue-800">Votre profil</h4>
                      </div>
                      <p className="text-sm text-blue-700 mb-3">
                        Vous êtes connecté en tant que <span className="font-medium capitalize">{user?.role?.replace('_', ' ') || 'Utilisateur'}</span>
                      </p>
                      <button 
                        onClick={() => navigate('/user-management')}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <span>Gérer les utilisateurs</span>
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-1.5 rounded-lg mr-3">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-gray-700 font-medium">Perf-Energie © 2025</span>
            </div>
            
            <div className="flex items-center space-x-6">
              <a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Confidentialité</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Conditions.</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Contact.</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardPage;