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
  Clock,
  Filter,
  Search,
  CalendarDays,
  FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

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
  updated_at: string;
}

const CollectionManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [collectionPeriods, setCollectionPeriods] = useState<CollectionPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Check if user is admin (not admin_client)
  const isAdmin = profile?.role === 'admin';

  // Form state
  const [formData, setFormData] = useState({
    organization_name: '',
    year: new Date().getFullYear(),
    period_type: 'month' as 'month' | 'quarter' | 'year',
    period_number: 1,
    start_date: '',
    end_date: '',
    status: 'open' as 'open' | 'closed'
  });
  
  // Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<CollectionPeriod | null>(null);
  const [editFormData, setEditFormData] = useState({
    year: new Date().getFullYear(),
    period_type: 'month' as 'month' | 'quarter' | 'year',
    period_number: 1,
    start_date: '',
    end_date: '',
    status: 'open' as 'open' | 'closed'
  });
  
  // Filter state
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchOrganizations();
    fetchCollectionPeriods();
  }, []);

  // Redirect non-admin users
  useEffect(() => {
    if (profile && !isAdmin) {
      navigate('/dashboard');
    }
  }, [profile, isAdmin, navigate]);
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
      setError('Erreur lors du chargement des organisations');
    }
  };

  const fetchCollectionPeriods = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('collection_periods')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollectionPeriods(data || []);
    } catch (err: any) {
      console.error('Error fetching collection periods:', err);
      setError('Erreur lors du chargement des périodes de collecte');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'year' || name === 'period_number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'year' || name === 'period_number') {
      setEditFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdmin) {
      setError('Accès refusé. Seuls les administrateurs peuvent créer des périodes de collecte.');
      return;
    }

    if (!formData.organization_name || !formData.start_date || !formData.end_date) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Check if a period already exists for this organization/year/type/number
      const { data: existingPeriod, error: checkError } = await supabase
        .from('collection_periods')
        .select('id')
        .eq('organization_name', formData.organization_name)
        .eq('year', formData.year)
        .eq('period_type', formData.period_type)
        .eq('period_number', formData.period_number)
        .maybeSingle();

      if (checkError) throw checkError;

      const periodData = {
        organization_name: formData.organization_name,
        year: formData.year,
        period_type: formData.period_type,
        period_number: formData.period_number,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status
      };

      let result;
      
      if (existingPeriod) {
        // Update existing period
        result = await supabase
          .from('collection_periods')
          .update(periodData)
          .eq('id', existingPeriod.id);
      } else {
        // Insert new period
        result = await supabase
          .from('collection_periods')
          .insert([periodData]);
      }

      if (result.error) throw result.error;

      // Reset form
      setFormData({
        organization_name: '',
        year: new Date().getFullYear(),
        period_type: 'month',
        period_number: 1,
        start_date: '',
        end_date: '',
        status: 'open'
      });

      // Show success message
      setSuccess(existingPeriod 
        ? 'Période de collecte mise à jour avec succès' 
        : 'Période de collecte créée avec succès');
      setTimeout(() => setSuccess(null), 3000);

      // Refresh data
      fetchCollectionPeriods();
    } catch (err: any) {
      console.error('Error saving collection period:', err);
      setError('Erreur lors de l\'enregistrement de la période de collecte');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (period: CollectionPeriod) => {
    if (!isAdmin) {
      setError('Accès refusé. Seuls les administrateurs peuvent modifier des périodes de collecte.');
      return;
    }

    setEditingPeriod(period);
    setEditFormData({
      year: period.year,
      period_type: period.period_type,
      period_number: period.period_number,
      start_date: period.start_date,
      end_date: period.end_date,
      status: period.status
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdmin) {
      setError('Accès refusé. Seuls les administrateurs peuvent modifier des périodes de collecte.');
      return;
    }

    if (!editingPeriod || !editFormData.start_date || !editFormData.end_date) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const { error } = await supabase
        .from('collection_periods')
        .update({
          year: editFormData.year,
          period_type: editFormData.period_type,
          period_number: editFormData.period_number,
          start_date: editFormData.start_date,
          end_date: editFormData.end_date,
          status: editFormData.status
        })
        .eq('id', editingPeriod.id);

      if (error) throw error;

      // Close modal and reset
      setShowEditModal(false);
      setEditingPeriod(null);

      // Show success message
      setSuccess('Période de collecte modifiée avec succès');
      setTimeout(() => setSuccess(null), 3000);

      // Refresh data
      fetchCollectionPeriods();
    } catch (err: any) {
      console.error('Error updating collection period:', err);
      setError('Erreur lors de la modification de la période de collecte');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      setError('Accès refusé. Seuls les administrateurs peuvent supprimer des périodes de collecte.');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette période de collecte ?')) {
      return;
    }

    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('collection_periods')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Show success message
      setSuccess('Période de collecte supprimée avec succès');
      setTimeout(() => setSuccess(null), 3000);

      // Refresh data
      fetchCollectionPeriods();
    } catch (err: any) {
      console.error('Error deleting collection period:', err);
      setError('Erreur lors de la suppression de la période de collecte');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            Ouvert
          </span>
        );
      case 'closed':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            Fermé
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

  const getPeriodTypeName = (type: string) => {
    switch (type) {
      case 'month':
        return 'Mensuel';
      case 'quarter':
        return 'Trimestriel';
      case 'year':
        return 'Annuel';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const filteredPeriods = collectionPeriods.filter(period => {
    // Apply organization filter
    if (organizationFilter !== 'all' && period.organization_name !== organizationFilter) {
      return false;
    }
    
    // Apply status filter
    if (statusFilter !== 'all' && period.status !== statusFilter) {
      return false;
    }
    
    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        period.organization_name.toLowerCase().includes(searchLower) ||
        period.period_type.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Show loading or redirect for non-admin users
  if (!profile || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès Refusé</h2>
          <p className="text-gray-600 mb-4">
            Seuls les administrateurs peuvent accéder à la gestion des collectes.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 left-20 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Retour</span>
            </button>
            
            <div className="h-6 w-px bg-gray-300"></div>
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarDays className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestion des Collectes</h1>
                <p className="text-gray-600">Configuration des périodes de collecte de données</p>
              </div>
            </div>
          </div>
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

        {/* Create Collection Period Form - Only for admins */}
        {isAdmin && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-white/20 p-6 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Plus className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Créer une période de collecte</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label htmlFor="organization_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Organisation <span className="text-red-500">*</span>
                </label>
                <select
                  id="organization_name"
                  name="organization_name"
                  value={formData.organization_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                  Année <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  min="2000"
                  max="2100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="period_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Type de période <span className="text-red-500">*</span>
                </label>
                <select
                  id="period_type"
                  name="period_type"
                  value={formData.period_type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="month">Mensuel</option>
                  <option value="quarter">Trimestriel</option>
                  <option value="year">Annuel</option>
                </select>
              </div>

              <div>
                <label htmlFor="period_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de période <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="period_number"
                  name="period_number"
                  value={formData.period_number}
                  onChange={handleInputChange}
                  min="1"
                  max={formData.period_type === 'month' ? 12 : formData.period_type === 'quarter' ? 4 : 1}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date de début <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Statut <span className="text-red-500">*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="open">Ouvert</option>
                  <option value="closed">Fermé</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !formData.organization_name || !formData.start_date || !formData.end_date}
                className={`
                  flex items-center space-x-2 px-6 py-3 rounded-lg font-medium
                  transition-all duration-300 transform hover:scale-105
                  ${isSubmitting || !formData.organization_name || !formData.start_date || !formData.end_date
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-lg hover:shadow-xl'
                  }
                `}
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Enregistrer</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        )}

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-white/20 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <select
                  value={organizationFilter}
                  onChange={(e) => setOrganizationFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Toutes les organisations</option>
                  {organizations.map((org) => (
                    <option key={org.name} value={org.name}>{org.name}</option>
                  ))}
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="open">Ouvert</option>
                  <option value="closed">Fermé</option>
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Collection Periods Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-white/20 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Périodes de collecte configurées</h2>
            </div>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : filteredPeriods.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune période de collecte</h3>
                <p className="text-gray-500">
                  {searchQuery || organizationFilter !== 'all' || statusFilter !== 'all'
                    ? "Aucune période ne correspond à vos critères de recherche."
                    : "Vous n'avez pas encore créé de période de collecte."}
                </p>
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
                        Date de début
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date de fin
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      {isAdmin && (
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPeriods.map((period) => (
                      <motion.tr
                        key={period.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{period.organization_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{period.year}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{getPeriodTypeName(period.period_type)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {period.period_type === 'year' ? 'Année complète' : `Période ${period.period_number}`}
                          </div>
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
                        {isAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleEdit(period)}
                                className="text-indigo-600 hover:text-indigo-900 transition-colors"
                                title="Modifier"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(period.id)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Information Box */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <Clock className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">À propos des périodes de collecte</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Les périodes de collecte définissent les intervalles de temps pendant lesquels les données énergétiques 
                  sont collectées et analysées. Elles permettent de structurer le suivi de la performance énergétique 
                  et d'organiser les cycles de reporting.
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong>Mensuel</strong> : Collecte mensuelle (1-12)</li>
                  <li><strong>Trimestriel</strong> : Collecte trimestrielle (1-4)</li>
                  <li><strong>Annuel</strong> : Collecte annuelle (1)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingPeriod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl relative animate-scaleIn">
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingPeriod(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Modifier la période de collecte
            </h2>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Organisation : {editingPeriod.organization_name}</span>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="edit_year" className="block text-sm font-medium text-gray-700 mb-1">
                    Année <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="edit_year"
                    name="year"
                    value={editFormData.year}
                    onChange={handleEditInputChange}
                    min="2000"
                    max="2100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="edit_period_type" className="block text-sm font-medium text-gray-700 mb-1">
                    Type de période <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="edit_period_type"
                    name="period_type"
                    value={editFormData.period_type}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="month">Mensuel</option>
                    <option value="quarter">Trimestriel</option>
                    <option value="year">Annuel</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit_period_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de période <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="edit_period_number"
                    name="period_number"
                    value={editFormData.period_number}
                    onChange={handleEditInputChange}
                    min="1"
                    max={editFormData.period_type === 'month' ? 12 : editFormData.period_type === 'quarter' ? 4 : 1}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="edit_status" className="block text-sm font-medium text-gray-700 mb-1">
                    Statut <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="edit_status"
                    name="status"
                    value={editFormData.status}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="open">Ouvert</option>
                    <option value="closed">Fermé</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit_start_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="edit_start_date"
                    name="start_date"
                    value={editFormData.start_date}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="edit_end_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="edit_end_date"
                    name="end_date"
                    value={editFormData.end_date}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingPeriod(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !editFormData.start_date || !editFormData.end_date}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmitting || !editFormData.start_date || !editFormData.end_date
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
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
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionManagementPage;