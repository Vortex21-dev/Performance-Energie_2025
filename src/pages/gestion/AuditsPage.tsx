import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  ClipboardCheck,
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
  Filter,
  Search,
  Calendar,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Audit {
  id: string;
  organization_name: string;
  name: string;
  period: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

const AuditsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAudit, setCurrentAudit] = useState<Audit | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    period: '',
    status: 'planned' as 'planned' | 'in_progress' | 'completed' | 'cancelled'
  });
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_client';
  
  useEffect(() => {
    fetchUserOrganization();
  }, [user]);
  
  useEffect(() => {
    if (organizationName) {
      fetchAudits();
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
  
  const fetchAudits = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('audits')
        .select('*')
        .eq('organization_name', organizationName)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setAudits(data || []);
    } catch (err: any) {
      console.error('Error fetching audits:', err);
      setError('Erreur lors du chargement des audits');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const auditData = {
        organization_name: organizationName,
        name: formData.name,
        period: formData.period,
        status: formData.status
      };
      
      let result;
      
      if (isEditing && currentAudit) {
        // Update existing audit
        result = await supabase
          .from('audits')
          .update(auditData)
          .eq('id', currentAudit.id);
      } else {
        // Insert new audit
        result = await supabase
          .from('audits')
          .insert([auditData]);
      }
      
      if (result.error) throw result.error;
      
      // Reset form and close modal
      resetForm();
      setShowModal(false);
      
      // Show success message
      setSuccess(isEditing 
        ? 'Audit modifié avec succès' 
        : 'Audit ajouté avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchAudits();
    } catch (err: any) {
      console.error('Error saving audit:', err);
      setError('Erreur lors de l\'enregistrement de l\'audit');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEdit = (audit: Audit) => {
    setCurrentAudit(audit);
    setFormData({
      name: audit.name,
      period: audit.period,
      status: audit.status
    });
    setIsEditing(true);
    setShowModal(true);
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet audit ?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('audits')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Show success message
      setSuccess('Audit supprimé avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchAudits();
    } catch (err: any) {
      console.error('Error deleting audit:', err);
      setError('Erreur lors de la suppression de l\'audit');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      period: '',
      status: 'planned'
    });
    setCurrentAudit(null);
    setIsEditing(false);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planned':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            Planifié
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
            Terminé
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            Annulé
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
  
  const filteredAudits = audits.filter(audit => {
    // Apply status filter
    if (statusFilter !== 'all' && audit.status !== statusFilter) {
      return false;
    }
    
    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        audit.name.toLowerCase().includes(searchLower) ||
        audit.period.toLowerCase().includes(searchLower)
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
                onClick={() => navigate('/gestion/amelioration')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Retour</span>
              </button>
              
              <div className="h-6 w-px bg-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ClipboardCheck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Audits</h1>
                  {organizationName && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4" />
                      <span>{organizationName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800 font-medium">Amélioration</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl">
            Planifiez et suivez vos audits énergétiques. Les audits sont essentiels pour évaluer votre performance énergétique,
            identifier les opportunités d'amélioration et assurer la conformité avec les normes et réglementations.
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

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="planned">Planifié</option>
                  <option value="in_progress">En cours</option>
                  <option value="completed">Terminé</option>
                  <option value="cancelled">Annulé</option>
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
            
            {isAdmin && (
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Ajouter un audit</span>
              </button>
            )}
          </div>
        </div>

        {/* Audits List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <ClipboardCheck className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Liste des audits</h2>
            </div>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : filteredAudits.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucun audit trouvé. {isAdmin ? "Ajoutez des audits pour commencer." : ""}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nom de l'audit
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Période
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date de création
                      </th>
                      {isAdmin && (
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAudits.map((audit) => (
                      <tr key={audit.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{audit.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{audit.period}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(audit.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(audit.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleEdit(audit)}
                                className="text-indigo-600 hover:text-indigo-900 transition-colors"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(audit.id)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Audit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative animate-scaleIn">
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
              {isEditing ? 'Modifier l\'audit' : 'Ajouter un audit'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'audit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Audit énergétique annuel"
                  required
                />
              </div>

              <div>
                <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-1">
                  Période <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="period"
                    name="period"
                    value={formData.period}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Q2 2025, Année 2025, etc."
                    required
                  />
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
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
                  <option value="planned">Planifié</option>
                  <option value="in_progress">En cours</option>
                  <option value="completed">Terminé</option>
                  <option value="cancelled">Annulé</option>
                </select>
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
                  disabled={isSubmitting || !formData.name || !formData.period}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmitting || !formData.name || !formData.period
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
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

export default AuditsPage;