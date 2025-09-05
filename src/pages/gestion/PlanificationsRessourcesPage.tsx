import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Loader,
  Building2,
  FileText,
  Clock,
  DollarSign,
  Users,
  Briefcase,
  CalendarClock,
  BarChart3,
  Filter,
  ShoppingCart,
  CreditCard
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface PlanificationRessource {
  id: string;
  organization_name: string;
  action_name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: 'planned' | 'in_progress' | 'completed' | 'delayed';
  budget: number | null;
  human_resources: string | null;
  material_resources: string | null;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

interface OrganizationSettings {
  organization_name: string;
  achat_energetique: string | null;
  financement_investissement: string | null;
  created_at: string;
  updated_at: string;
}

const PlanificationsRessourcesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [planifications, setPlanifications] = useState<PlanificationRessource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_client';
  
  // Organization settings state
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null);
  const [showSettingsForm, setShowSettingsForm] = useState(false);
  const [settingsFormData, setSettingsFormData] = useState({
    achat_energetique: '',
    financement_investissement: ''
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPlanification, setCurrentPlanification] = useState<PlanificationRessource | null>(null);
  const [formData, setFormData] = useState({
    action_name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'planned' as 'planned' | 'in_progress' | 'completed' | 'delayed',
    budget: '',
    human_resources: '',
    material_resources: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  useEffect(() => {
    fetchUserOrganization();
  }, [user]);
  
  useEffect(() => {
    if (organizationName) {
      fetchPlanifications();
      fetchOrganizationSettings();
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
  
  const fetchPlanifications = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('planifications_ressources')
        .select('*')
        .eq('organization_name', organizationName)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setPlanifications(data || []);
    } catch (err: any) {
      console.error('Error fetching planifications:', err);
      setError('Erreur lors du chargement des planifications');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchOrganizationSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('planifications_settings')
        .select('*')
        .eq('organization_name', organizationName)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setOrgSettings(data);
        setSettingsFormData({
          achat_energetique: data.achat_energetique || '',
          financement_investissement: data.financement_investissement || ''
        });
      } else {
        // Settings don't exist yet, that's okay
        setOrgSettings(null);
        setSettingsFormData({
          achat_energetique: '',
          financement_investissement: ''
        });
      }
    } catch (err: any) {
      console.error('Error fetching organization settings:', err);
      // Don't show error to user, just log it
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSettingsInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettingsFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organizationName || !isAdmin) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const planificationData = {
        organization_name: organizationName,
        action_name: formData.action_name,
        description: formData.description || null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        human_resources: formData.human_resources || null,
        material_resources: formData.material_resources || null,
        priority: formData.priority
      };
      
      let result;
      
      if (isEditing && currentPlanification) {
        // Update existing record
        result = await supabase
          .from('planifications_ressources')
          .update(planificationData)
          .eq('id', currentPlanification.id);
      } else {
        // Insert new record
        result = await supabase
          .from('planifications_ressources')
          .insert([planificationData]);
      }
      
      if (result.error) throw result.error;
      
      // Reset form and close modal
      resetForm();
      setShowModal(false);
      
      // Show success message
      setSuccess(isEditing 
        ? 'Planification modifiée avec succès' 
        : 'Planification ajoutée avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchPlanifications();
    } catch (err: any) {
      console.error('Error saving planification:', err);
      setError('Erreur lors de l\'enregistrement de la planification');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organizationName || !isAdmin) return;
    
    try {
      setIsSavingSettings(true);
      setError(null);
      
      const settingsData = {
        organization_name: organizationName,
        achat_energetique: settingsFormData.achat_energetique || null,
        financement_investissement: settingsFormData.financement_investissement || null
      };
      
      let result;
      
      if (orgSettings) {
        // Update existing record
        result = await supabase
          .from('planifications_settings')
          .update(settingsData)
          .eq('organization_name', organizationName);
      } else {
        // Insert new record
        result = await supabase
          .from('planifications_settings')
          .insert([settingsData]);
      }
      
      if (result.error) throw result.error;
      
      // Show success message
      setSuccess('Paramètres enregistrés avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data and close form
      fetchOrganizationSettings();
      setShowSettingsForm(false);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError('Erreur lors de l\'enregistrement des paramètres');
    } finally {
      setIsSavingSettings(false);
    }
  };
  
  const handleEdit = (planification: PlanificationRessource) => {
    setCurrentPlanification(planification);
    setFormData({
      action_name: planification.action_name,
      description: planification.description || '',
      start_date: new Date(planification.start_date).toISOString().split('T')[0],
      end_date: new Date(planification.end_date).toISOString().split('T')[0],
      status: planification.status,
      budget: planification.budget?.toString() || '',
      human_resources: planification.human_resources || '',
      material_resources: planification.material_resources || '',
      priority: planification.priority
    });
    setIsEditing(true);
    setShowModal(true);
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette planification ?') || !isAdmin) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('planifications_ressources')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Show success message
      setSuccess('Planification supprimée avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchPlanifications();
    } catch (err: any) {
      console.error('Error deleting planification:', err);
      setError('Erreur lors de la suppression de la planification');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      action_name: '',
      description: '',
      start_date: '',
      end_date: '',
      status: 'planned',
      budget: '',
      human_resources: '',
      material_resources: '',
      priority: 'medium'
    });
    setCurrentPlanification(null);
    setIsEditing(false);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planned':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            Planifiée
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            En cours
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            Terminée
          </span>
        );
      case 'delayed':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            Retardée
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };
  
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            Basse
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            Moyenne
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            Haute
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            {priority}
          </span>
        );
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const filteredPlanifications = planifications.filter(plan => {
    // Apply status filter
    if (statusFilter !== 'all' && plan.status !== statusFilter) {
      return false;
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all' && plan.priority !== priorityFilter) {
      return false;
    }
    
    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        plan.action_name.toLowerCase().includes(searchLower) ||
        (plan.description && plan.description.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/gestion/leadership')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Retour</span>
              </button>
              
              <div className="h-6 w-px bg-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Planifications et Ressources</h1>
                  {organizationName && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4" />
                      <span>{organizationName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span className="text-indigo-800 font-medium">Management</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl">
            Planifiez vos actions énergétiques et allouez les ressources nécessaires pour atteindre vos objectifs. 
            Cette section vous permet de définir un calendrier d'actions et de suivre leur mise en œuvre.
          </p>
        </div>

        {/* Success and Error Messages */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg"
          >
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-700">{success}</p>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg"
          >
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Organization Settings Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Building2 className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Paramètres de l'organisation</h2>
            </div>
            
            {!showSettingsForm && isAdmin && (
              <button
                onClick={() => setShowSettingsForm(true)}
                className="px-3 py-1.5 text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                {orgSettings ? 'Modifier' : 'Configurer'}
              </button>
            )}
          </div>
          
          {showSettingsForm ? (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="achat_energetique" className="block text-sm font-medium text-gray-700 mb-2">
                    Achat énergétique
                  </label>
                  <div className="relative">
                    <textarea
                      id="achat_energetique"
                      name="achat_energetique"
                      value={settingsFormData.achat_energetique}
                      onChange={handleSettingsInputChange}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Stratégie d'achat énergétique de l'organisation..."
                    />
                    <ShoppingCart className="absolute right-3 top-3 text-gray-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="financement_investissement" className="block text-sm font-medium text-gray-700 mb-2">
                    Financement et investissement
                  </label>
                  <div className="relative">
                    <textarea
                      id="financement_investissement"
                      name="financement_investissement"
                      value={settingsFormData.financement_investissement}
                      onChange={handleSettingsInputChange}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Stratégie de financement et d'investissement énergétique..."
                    />
                    <CreditCard className="absolute right-3 top-3 text-gray-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSettingsForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSavingSettings
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                    }
                  `}
                >
                  {isSavingSettings ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Enregistrer
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {orgSettings && (orgSettings.achat_energetique || orgSettings.financement_investissement) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {orgSettings.achat_energetique && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <ShoppingCart className="w-5 h-5 text-orange-600" />
                        <h3 className="font-medium text-gray-900">Achat énergétique</h3>
                      </div>
                      <p className="text-gray-700 whitespace-pre-line">{orgSettings.achat_energetique}</p>
                    </div>
                  )}
                  
                  {orgSettings.financement_investissement && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <CreditCard className="w-5 h-5 text-teal-600" />
                        <h3 className="font-medium text-gray-900">Financement et investissement</h3>
                      </div>
                      <p className="text-gray-700 whitespace-pre-line">{orgSettings.financement_investissement}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">
                    Aucune information sur les achats énergétiques ou le financement n'a été configurée.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="planned">Planifiée</option>
                  <option value="in_progress">En cours</option>
                  <option value="completed">Terminée</option>
                  <option value="delayed">Retardée</option>
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <div className="relative">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">Toutes les priorités</option>
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>
            
            {isAdmin && (
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Ajouter une action</span>
              </button>
            )}
          </div>
        </div>

        {/* Planifications List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : filteredPlanifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune planification</h3>
            <p className="text-gray-500 mb-6">
              Vous n'avez pas encore créé de planification d'actions et de ressources.
            </p>
            {isAdmin && (
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter maintenant
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPlanifications.map((planification) => (
              <motion.div
                key={planification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 rounded-lg bg-indigo-100">
                        <Calendar className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900">{planification.action_name}</h3>
                          {getPriorityBadge(planification.priority)}
                        </div>
                        {planification.description && (
                          <p className="text-gray-600 mt-1">{planification.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>
                              {formatDate(planification.start_date)} - {formatDate(planification.end_date)}
                            </span>
                          </div>
                          <div>
                            {getStatusBadge(planification.status)}
                          </div>
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(planification)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(planification.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="px-6 py-4 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Ressources allouées</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Budget</p>
                        <p className="font-medium text-gray-900">
                          {planification.budget 
                            ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(planification.budget)
                            : 'Non défini'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Ressources humaines</p>
                        <p className="font-medium text-gray-900">
                          {planification.human_resources || 'Non défini'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Briefcase className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Ressources matérielles</p>
                        <p className="font-medium text-gray-900">
                          {planification.material_resources || 'Non défini'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        
        {/* Statistics */}
        {!isLoading && planifications.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Statistiques</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total des actions</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{planifications.length}</p>
                  </div>
                  <div className="p-3 bg-indigo-100 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">En cours</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {planifications.filter(p => p.status === 'in_progress').length}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Terminées</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {planifications.filter(p => p.status === 'completed').length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Priorité haute</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {planifications.filter(p => p.priority === 'high').length}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Planification Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl relative animate-scaleIn max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {isEditing ? 'Modifier l\'action' : 'Ajouter une action'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="action_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l'action <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="action_name"
                    name="action_name"
                    value={formData.action_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ex: Installation de panneaux solaires"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Description détaillée de l'action..."
                  />
                </div>

                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      id="start_date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                    <CalendarClock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      id="end_date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                    <CalendarClock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    Statut <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="planned">Planifiée</option>
                    <option value="in_progress">En cours</option>
                    <option value="completed">Terminée</option>
                    <option value="delayed">Retardée</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                    Priorité <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                    Budget (€)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="budget"
                      name="budget"
                      value={formData.budget}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Ex: 5000"
                      step="0.01"
                      min="0"
                    />
                    <DollarSign className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label htmlFor="human_resources" className="block text-sm font-medium text-gray-700 mb-2">
                    Ressources humaines
                  </label>
                  <input
                    type="text"
                    id="human_resources"
                    name="human_resources"
                    value={formData.human_resources}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ex: 2 techniciens, 1 ingénieur"
                  />
                </div>

                <div>
                  <label htmlFor="material_resources" className="block text-sm font-medium text-gray-700 mb-2">
                    Ressources matérielles
                  </label>
                  <input
                    type="text"
                    id="material_resources"
                    name="material_resources"
                    value={formData.material_resources}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ex: Équipements de mesure, logiciels"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.action_name || !formData.start_date || !formData.end_date}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmitting || !formData.action_name || !formData.start_date || !formData.end_date
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                    }
                  `}
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      {isEditing ? 'Modification en cours...' : 'Ajout en cours...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      {isEditing ? 'Modifier' : 'Ajouter'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanificationsRessourcesPage;

function Search(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}