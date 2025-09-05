import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  LogOut, 
  Zap, 
  ArrowRight, 
  Mail, 
  CheckCircle, 
  Shield, 
  User, 
  Building2, 
  Users, 
  Settings,
  BarChart3,
  Briefcase,
  Sparkles,
  Database,
  UserPlus,
  Building,
  FileText,
  Layers,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  AlertTriangle,
  Loader
} from 'lucide-react';

interface Organization {
  name: string;
  city: string;
  country: string;
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
  created_at: string;
}

const AdminPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotification, setShowNotification] = useState(true);
  
  // Collection management state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [collectionPeriods, setCollectionPeriods] = useState<CollectionPeriod[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [collectionSuccess, setCollectionSuccess] = useState<string | null>(null);
  const [showCollectionManagement, setShowCollectionManagement] = useState(false);
  
  // Form state
  const [selectedOrganization, setSelectedOrganization] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month');
  const [periodNumber, setPeriodNumber] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'open' | 'closed'>('open');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<CollectionPeriod | null>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNotification(false);
    }, 10000); 
    
    // Fetch organizations and collection periods
    fetchOrganizations();
    fetchCollectionPeriods();
    
    return () => clearTimeout(timer);
  }, []);
  
  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('name, city, country')
        .order('name');
      
      if (error) throw error;
      setOrganizations(data || []);
    } catch (err: any) {
      console.error('Error fetching organizations:', err);
      setCollectionError('Erreur lors du chargement des organisations');
    }
  };
  
  const fetchCollectionPeriods = async () => {
    try {
      setIsLoadingCollections(true);
      const { data, error } = await supabase
        .from('collection_periods')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCollectionPeriods(data || []);
    } catch (err: any) {
      console.error('Error fetching collection periods:', err);
      setCollectionError('Erreur lors du chargement des périodes de collecte');
    } finally {
      setIsLoadingCollections(false);
    }
  };
  
  const handleSubmitPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrganization || !startDate || !endDate) {
      setCollectionError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setCollectionError(null);
      
      // Check if a period already exists for this organization, year, period_type, and period_number
      const { data: existingPeriod, error: checkError } = await supabase
        .from('collection_periods')
        .select('id')
        .eq('organization_name', selectedOrganization)
        .eq('year', year)
        .eq('period_type', periodType)
        .eq('period_number', periodNumber)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      const periodData = {
        organization_name: selectedOrganization,
        year,
        period_type: periodType,
        period_number: periodNumber,
        start_date: startDate,
        end_date: endDate,
        status
      };
      
      if (existingPeriod) {
        // Update existing period
        const { error: updateError } = await supabase
          .from('collection_periods')
          .update(periodData)
          .eq('id', existingPeriod.id);
        
        if (updateError) throw updateError;
        setCollectionSuccess('Période de collecte mise à jour avec succès');
      } else {
        // Insert new period
        const { error: insertError } = await supabase
          .from('collection_periods')
          .insert([periodData]);
        
        if (insertError) throw insertError;
        setCollectionSuccess('Période de collecte créée avec succès');
      }
      
      // Reset form
      setSelectedOrganization('');
      setYear(new Date().getFullYear());
      setPeriodType('month');
      setPeriodNumber(1);
      setStartDate('');
      setEndDate('');
      setStatus('open');
      
      // Refresh data
      fetchCollectionPeriods();
      
      // Clear success message after 3 seconds
      setTimeout(() => setCollectionSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving collection period:', err);
      setCollectionError('Erreur lors de l\'enregistrement de la période de collecte');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEditPeriod = (period: CollectionPeriod) => {
    setEditingPeriod(period);
    setSelectedOrganization(period.organization_name);
    setYear(period.year);
    setPeriodType(period.period_type);
    setPeriodNumber(period.period_number);
    setStartDate(period.start_date);
    setEndDate(period.end_date);
    setStatus(period.status);
    setShowEditModal(true);
  };
  
  const handleUpdatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPeriod || !selectedOrganization || !startDate || !endDate) {
      setCollectionError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setCollectionError(null);
      
      const periodData = {
        organization_name: selectedOrganization,
        year,
        period_type: periodType,
        period_number: periodNumber,
        start_date: startDate,
        end_date: endDate,
        status
      };
      
      const { error } = await supabase
        .from('collection_periods')
        .update(periodData)
        .eq('id', editingPeriod.id);
      
      if (error) throw error;
      
      setCollectionSuccess('Période de collecte modifiée avec succès');
      setShowEditModal(false);
      setEditingPeriod(null);
      
      // Reset form
      setSelectedOrganization('');
      setYear(new Date().getFullYear());
      setPeriodType('month');
      setPeriodNumber(1);
      setStartDate('');
      setEndDate('');
      setStatus('open');
      
      // Refresh data
      fetchCollectionPeriods();
      
      // Clear success message after 3 seconds
      setTimeout(() => setCollectionSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating collection period:', err);
      setCollectionError('Erreur lors de la modification de la période de collecte');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeletePeriod = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette période de collecte ?')) {
      return;
    }
    
    try {
      setIsLoadingCollections(true);
      const { error } = await supabase
        .from('collection_periods')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setCollectionSuccess('Période de collecte supprimée avec succès');
      fetchCollectionPeriods();
      
      // Clear success message after 3 seconds
      setTimeout(() => setCollectionSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting collection period:', err);
      setCollectionError('Erreur lors de la suppression de la période de collecte');
    } finally {
      setIsLoadingCollections(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const getPeriodTypeLabel = (type: string) => {
    switch (type) {
      case 'month': return 'Mensuel';
      case 'quarter': return 'Trimestriel';
      case 'year': return 'Annuel';
      default: return type;
    }
  };
  
  const getStatusBadge = (status: string) => {
    return status === 'open' ? (
      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
        Ouvert
      </span>
    ) : (
      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
        Fermé
      </span>
    );
  };
  
  const handleLogout = async () => {
    const { success } = await logout();
    if (success) {
      navigate('/login');
    }
  };

  const handleStartOperation = () => {
    navigate('/operations/sectors');
  };

  const handleManageCompanies = () => {
    navigate('/company-management');
  };

  const handleManageUsers = () => {
    navigate('/user-profiles');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 left-20 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Success notification */}
      {showNotification && (
        <div 
          className="fixed bottom-6 right-6 bg-white/95 backdrop-blur-xl border border-emerald-200/50 rounded-2xl p-6 shadow-2xl transform transition-all duration-500 animate-[slideIn_0.5s_ease-out] z-50"
          style={{
            animation: `
              slideIn 0.5s ease-out,
              float 3s infinite ease-in-out,
              fadeOut 0.5s ease-in 9.5s forwards
            `,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          }}
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full blur-sm opacity-40 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-emerald-500 to-teal-500 p-2 rounded-full">
                <CheckCircle className="h-5 w-5 text-white animate-bounce" />
              </div>
            </div>
            <div>
              <p className="text-emerald-800 font-semibold text-sm">Connexion réussie</p>
              <p className="text-emerald-600 text-xs">Administrateur connecté</p>
            </div>
          </div>
        </div>
      )}
      
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center space-x-4 group cursor-pointer">
            <div className="relative transform transition-all duration-500 group-hover:scale-110">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full blur-md"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                <Layers className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                PERF-ENERGIE
              </h1>
              <p className="text-slate-500 text-sm font-medium">Panneau d'administration</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 bg-gradient-to-r from-slate-50 to-white px-5 py-3 rounded-2xl border border-slate-200/50 shadow-sm transform transition-all duration-300 hover:scale-105 hover:shadow-md">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur opacity-30 animate-pulse"></div>
                  <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-full">
                    <User className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-slate-700 font-semibold text-sm">{user?.email}</p>
                  <p className="text-slate-500 text-xs flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Administrateur
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-red-50 to-rose-50 text-red-600 rounded-2xl border border-red-200/50 hover:from-red-100 hover:to-rose-100 transition-all duration-300 hover:scale-105 hover:shadow-lg group"
            >
              <LogOut size={18} className="transform transition-transform duration-300 group-hover:rotate-12" />
              <span className="font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-800 mb-3 bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Tableau de bord</h2>
          <p className="text-slate-600 text-lg">Gérez vos évaluations énergétiques en toute simplicité</p>
        </div>

        {/* Section Commencer l'Opération */}
        <div className="bg-white/70 backdrop-blur-xl shadow-xl rounded-3xl p-8 border border-white/20 animate-fade-in">
          <div 
            onClick={handleStartOperation}
            className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-600 p-10 rounded-3xl text-white cursor-pointer transform transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl group overflow-hidden"
          >
            {/* Effet de brillance animé */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform -translate-x-full transition-transform duration-1000 group-hover:translate-x-full"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-2xl mb-2 transform transition-all duration-300 group-hover:translate-x-2">
                    Commencer l'Opération
                  </h3>
                  <p className="text-emerald-100 text-lg transform transition-all duration-300 group-hover:translate-x-2">
                    Lancez une nouvelle évaluation énergétique
                  </p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl transform transition-all duration-500 group-hover:translate-x-4 group-hover:rotate-12">
                  <ArrowRight className="text-white h-8 w-8" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                {[
                  'Secteur',
                  "Type d'énergie",
                  'Normes',
                  'Enjeux',
                  'Critères',
                  'Indicateurs'
                ].map((step, index) => (
                  <div 
                    key={step}
                    className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl transform transition-all duration-300 hover:scale-110 hover:bg-white/20"
                    style={{
                      animationDelay: `${index * 100}ms`
                    }}
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-white rounded-full blur opacity-50"></div>
                      <div className="relative w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    <span className="text-white/90 font-medium">{step}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Particules flottantes */}
            <div className="absolute top-4 right-4 w-2 h-2 bg-white/30 rounded-full animate-ping"></div>
            <div className="absolute bottom-8 left-8 w-1 h-1 bg-white/40 rounded-full animate-pulse"></div>
            <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce"></div>
          </div>
        </div>

        {/* Nouvelles sections */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {/* Gérer les entreprises */}
          <div 
            onClick={handleManageCompanies}
            className="bg-white/70 backdrop-blur-xl p-8 rounded-3xl border border-white/20 transform transition-all duration-300 hover:scale-[1.03] cursor-pointer group shadow-lg hover:shadow-xl"
          >
            <div className="flex items-start gap-6 mb-6">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-2xl blur-md opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-2xl shadow-lg">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors">
                  Gérer les entreprises
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Administrez les entreprises, leurs configurations énergétiques et leurs structures organisationnelles
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-indigo-50 p-3 rounded-xl text-center">
                <Building className="h-5 w-5 text-indigo-500 mx-auto mb-1" />
                <span className="text-xs font-medium text-indigo-700">Entreprises</span>
              </div>
              <div className="bg-indigo-50 p-3 rounded-xl text-center">
                <Settings className="h-5 w-5 text-indigo-500 mx-auto mb-1" />
                <span className="text-xs font-medium text-indigo-700">Configurations</span>
              </div>
              <div className="bg-indigo-50 p-3 rounded-xl text-center">
                <Database className="h-5 w-5 text-indigo-500 mx-auto mb-1" />
                <span className="text-xs font-medium text-indigo-700">Structures</span>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <div className="flex items-center text-indigo-600 font-medium text-sm">
                <span>Accéder</span>
                <ArrowRight className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-2" />
              </div>
            </div>
          </div>
          
          {/* Gérer les utilisateurs */}
          <div 
            className="bg-white/70 backdrop-blur-xl p-8 rounded-3xl border border-white/20 transform transition-all duration-300 hover:scale-[1.03] group shadow-lg hover:shadow-xl cursor-pointer"
            onClick={handleManageUsers}
          >
            <div className="flex items-start gap-6 mb-6">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl blur-md opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 p-4 rounded-2xl shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-amber-600 transition-colors">
                  Gérer les utilisateurs
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Administrez les utilisateurs, leurs rôles et leurs permissions dans le système
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-amber-50 p-3 rounded-xl text-center">
                <UserPlus className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                <span className="text-xs font-medium text-amber-700">Utilisateurs</span>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl text-center">
                <Briefcase className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                <span className="text-xs font-medium text-amber-700">Rôles</span>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl text-center">
                <Shield className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                <span className="text-xs font-medium text-amber-700">Permissions</span>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <div className="flex items-center text-indigo-600 font-medium text-sm">
                <span>Accéder</span>
                <ArrowRight className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-2" />
              </div>
            </div>
          </div>

          {/* Gérer les périodes de collecte */}
          <div 
            onClick={() => setShowCollectionManagement(true)}
            className="bg-white/70 backdrop-blur-xl p-8 rounded-3xl border border-white/20 transform transition-all duration-300 hover:scale-[1.03] cursor-pointer group shadow-lg hover:shadow-xl md:col-span-2 lg:col-span-1"
          >
            <div className="flex items-start gap-6 mb-6">
                <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-2xl blur-md opacity-30 group-hover:opacity-50 transition-opacity"></div>
                    <div className="relative bg-gradient-to-r from-cyan-500 to-blue-600 p-4 rounded-2xl shadow-lg">
                        <Calendar className="h-8 w-8 text-white" />
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-cyan-700 transition-colors">
                        Gérer les périodes de collecte
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                        Créez, modifiez et suivez les périodes de collecte des données.
                    </p>
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <div className="flex items-center text-indigo-600 font-medium text-sm">
                    <span>Accéder</span>
                    <ArrowRight className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-2" />
                </div>
            </div>
          </div>
        </div>

        {/* Section statistiques rapides */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl border border-white/20 transform transition-all duration-300 hover:scale-105 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Évaluations</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">24</p>
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-xl shadow-md">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl border border-white/20 transform transition-all duration-300 hover:scale-105 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">En cours</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">3</p>
              </div>
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-3 rounded-xl shadow-md">
                <ArrowRight className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl border border-white/20 transform transition-all duration-300 hover:scale-105 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Terminées</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">21</p>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl shadow-md">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Section fonctionnalités */}
        <div className="mt-12 bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Fonctionnalités disponibles</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100/50 hover:shadow-md transition-all duration-300 hover:scale-105">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <h4 className="font-semibold text-slate-800">Rapports</h4>
              </div>
              <p className="text-slate-600 text-sm">Générez des rapports détaillés sur la performance énergétique</p>
            </div>
            
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-xl border border-emerald-100/50 hover:shadow-md transition-all duration-300 hover:scale-105">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-emerald-600" />
                </div>
                <h4 className="font-semibold text-slate-800">Analyses</h4>
              </div>
              <p className="text-slate-600 text-sm">Analysez les tendances et identifiez les opportunités d'amélioration</p>
            </div>
            
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-100/50 hover:shadow-md transition-all duration-300 hover:scale-105">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
                <h4 className="font-semibold text-slate-800">Équipes</h4>
              </div>
              <p className="text-slate-600 text-sm">Gérez les équipes et assignez des responsabilités</p>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100/50 hover:shadow-md transition-all duration-300 hover:scale-105">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Settings className="h-5 w-5 text-purple-600" />
                </div>
                <h4 className="font-semibold text-slate-800">Configuration</h4>
              </div>
              <p className="text-slate-600 text-sm">Personnalisez les paramètres selon vos besoins</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/70 backdrop-blur-sm border-t border-white/20 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-lg mr-3">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <span className="text-gray-700 font-medium">Perf-Energie © 2025.</span>
            </div>
            
            <div className="flex items-center space-x-6">
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Politique de confidentialité</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Conditions d'utilisation</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {showCollectionManagement && (
          <motion.div
            key="collection-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col"
            >
              <div className="flex-shrink-0 p-6 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Gestion des Collectes</h2>
                    <p className="text-gray-600">Définissez les périodes de collecte pour chaque organisation</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCollectionManagement(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="flex-grow p-6 overflow-y-auto">
                {/* Success and Error Messages */}
                {collectionSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg"
                  >
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <p className="text-green-700">{collectionSuccess}</p>
                    </div>
                  </motion.div>
                )}

                {collectionError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg"
                  >
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                      <p className="text-red-700">{collectionError}</p>
                    </div>
                  </motion.div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmitPeriod} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-2">
                        Organisation <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="organization"
                        value={selectedOrganization}
                        onChange={(e) => setSelectedOrganization(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        required
                      >
                        <option value="">Sélectionnez une organisation</option>
                        {organizations.map((org) => (
                          <option key={org.name} value={org.name}>
                            {org.name} - {org.city}, {org.country}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                        Année <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="year"
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        min="2020"
                        max="2030"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="periodType" className="block text-sm font-medium text-gray-700 mb-2">
                        Type de période <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="periodType"
                        value={periodType}
                        onChange={(e) => setPeriodType(e.target.value as 'month' | 'quarter' | 'year')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        required
                      >
                        <option value="month">Mensuel</option>
                        <option value="quarter">Trimestriel</option>
                        <option value="year">Annuel</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="periodNumber" className="block text-sm font-medium text-gray-700 mb-2">
                        Numéro de période <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="periodNumber"
                        value={periodNumber}
                        onChange={(e) => setPeriodNumber(parseInt(e.target.value))}
                        min="1"
                        max={periodType === 'month' ? 12 : periodType === 'quarter' ? 4 : 1}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                        Date de début <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                        Date de fin <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                        Statut <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as 'open' | 'closed')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        required
                      >
                        <option value="open">Ouvert</option>
                        <option value="closed">Fermé</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 lg:col-span-1 flex items-end">
                      <button
                        type="submit"
                        disabled={isSubmitting || !selectedOrganization || !startDate || !endDate}
                        className={`
                          w-full px-6 py-3 rounded-lg font-medium text-white
                          transform transition-all duration-300
                          ${isSubmitting || !selectedOrganization || !startDate || !endDate
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 hover:scale-105 shadow-lg hover:shadow-xl'
                          }
                        `}
                      >
                        {isSubmitting ? (
                          <div className="flex items-center justify-center">
                            <Loader className="w-5 h-5 mr-2 animate-spin" />
                            Enregistrement...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <Save className="w-5 h-5 mr-2" />
                            Enregistrer
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Collection Periods Table */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Périodes de collecte définies</h3>
                  </div>
                  
                  <div className="p-6">
                    {isLoadingCollections ? (
                      <div className="flex justify-center py-8">
                        <Loader className="w-8 h-8 animate-spin text-indigo-500" />
                      </div>
                    ) : collectionPeriods.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Aucune période de collecte définie</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Organisation
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Année
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Type
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Période
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date début
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date fin
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Statut
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {collectionPeriods.map((period) => (
                              <tr key={period.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{period.organization_name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{period.year}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{getPeriodTypeLabel(period.period_type)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{period.period_number}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{formatDate(period.start_date)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{formatDate(period.end_date)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {getStatusBadge(period.status)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      onClick={() => handleEditPeriod(period)}
                                      className="text-indigo-600 hover:text-indigo-900 transition-colors p-1.5 hover:bg-indigo-50 rounded-full"
                                      title="Modifier"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeletePeriod(period.id)}
                                      className="text-red-600 hover:text-red-900 transition-colors p-1.5 hover:bg-red-50 rounded-full"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showEditModal && editingPeriod && (
          <motion.div
            key="edit-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl p-6 w-full max-w-2xl relative"
            >
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingPeriod(null);
                // Reset form
                setSelectedOrganization('');
                setYear(new Date().getFullYear());
                setPeriodType('month');
                setPeriodNumber(1);
                setStartDate('');
                setEndDate('');
                setStatus('open');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Modifier la période de collecte</h2>

              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingPeriod(null);
                  // Reset form
                  setSelectedOrganization('');
                  setYear(new Date().getFullYear());
                  setPeriodType('month');
                  setPeriodNumber(1);
                  setStartDate('');
                  setEndDate('');
                  setStatus('open');
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>

              <h2 className="text-2xl font-bold text-gray-800 mb-6">Modifier la période de collecte</h2>

              <form onSubmit={handleUpdatePeriod} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="editOrganization" className="block text-sm font-medium text-gray-700 mb-2">
                      Organisation <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="editOrganization"
                      value={selectedOrganization}
                      onChange={(e) => setSelectedOrganization(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      required
                    >
                      <option value="">Sélectionnez une organisation</option>
                      {organizations.map((org) => (
                        <option key={org.name} value={org.name}>
                          {org.name} - {org.city}, {org.country}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="editYear" className="block text-sm font-medium text-gray-700 mb-2">
                      Année <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="editYear"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value))}
                      min="2020"
                      max="2030"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="editPeriodType" className="block text-sm font-medium text-gray-700 mb-2">
                      Type de période <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="editPeriodType"
                      value={periodType}
                      onChange={(e) => setPeriodType(e.target.value as 'month' | 'quarter' | 'year')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      required
                    >
                      <option value="month">Mensuel</option>
                      <option value="quarter">Trimestriel</option>
                      <option value="year">Annuel</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="editPeriodNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro de période <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="editPeriodNumber"
                      value={periodNumber}
                      onChange={(e) => setPeriodNumber(parseInt(e.target.value))}
                      min="1"
                      max={periodType === 'month' ? 12 : periodType === 'quarter' ? 4 : 1}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="editStartDate" className="block text-sm font-medium text-gray-700 mb-2">
                      Date de début <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="editStartDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="editEndDate" className="block text-sm font-medium text-gray-700 mb-2">
                      Date de fin <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="editEndDate"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="editStatus" className="block text-sm font-medium text-gray-700 mb-2">
                      Statut <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="editStatus"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'open' | 'closed')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      required
                    >
                      <option value="open">Ouvert</option>
                      <option value="closed">Fermé</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingPeriod(null);
                      // Reset form
                      setSelectedOrganization('');
                      setYear(new Date().getFullYear());
                      setPeriodType('month');
                      setPeriodNumber(1);
                      setStartDate('');
                      setEndDate('');
                      setStatus('open');
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedOrganization || !startDate || !endDate}
                    className={`
                      flex items-center px-6 py-3 rounded-lg text-white font-medium
                      transition-all duration-200
                      ${isSubmitting || !selectedOrganization || !startDate || !endDate
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                      }
                    `}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader className="w-5 h-5 mr-2 animate-spin" />
                        Modification...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        Modifier
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPage;
