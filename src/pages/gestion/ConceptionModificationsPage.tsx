import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  PenTool,
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
  Clock,
  CheckSquare,
  User,
  FileCheck,
  HelpCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface ConceptionModification {
  id: string;
  organization_name: string;
  title: string;
  description: string;
  type: 'conception' | 'modification';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  impact_description: string;
  energy_efficiency_measures: string;
  responsible_person: string;
  start_date: string;
  end_date: string | null;
  completion_date: string | null;
  documents: string[];
  created_at: string;
  updated_at: string;
}

const ConceptionModificationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [conceptionModifications, setConceptionModifications] = useState<ConceptionModification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<ConceptionModification | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'conception' as 'conception' | 'modification',
    status: 'planned' as 'planned' | 'in_progress' | 'completed' | 'cancelled',
    impact_description: '',
    energy_efficiency_measures: '',
    responsible_person: '',
    start_date: '',
    end_date: '',
    completion_date: '',
    documents: [] as string[]
  });
  
  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>('all');
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
      fetchConceptionModifications();
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
  
  const fetchConceptionModifications = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('conception_modifications')
        .select('*')
        .eq('organization_name', organizationName)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setConceptionModifications(data || []);
    } catch (err: any) {
      console.error('Error fetching conception modifications:', err);
      setError('Erreur lors du chargement des conceptions et modifications');
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
      
      const itemData = {
        organization_name: organizationName,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        status: formData.status,
        impact_description: formData.impact_description,
        energy_efficiency_measures: formData.energy_efficiency_measures,
        responsible_person: formData.responsible_person,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        completion_date: formData.completion_date || null,
        documents: formData.documents
      };
      
      let result;
      
      if (isEditing && currentItem) {
        // Update existing item
        result = await supabase
          .from('conception_modifications')
          .update(itemData)
          .eq('id', currentItem.id);
      } else {
        // Insert new item
        result = await supabase
          .from('conception_modifications')
          .insert([itemData]);
      }
      
      if (result.error) throw result.error;
      
      // Reset form and close modal
      resetForm();
      setShowModal(false);
      
      // Show success message
      setSuccess(isEditing 
        ? 'Élément modifié avec succès' 
        : 'Élément ajouté avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchConceptionModifications();
    } catch (err: any) {
      console.error('Error saving conception/modification:', err);
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEdit = (item: ConceptionModification) => {
    setCurrentItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      type: item.type,
      status: item.status,
      impact_description: item.impact_description,
      energy_efficiency_measures: item.energy_efficiency_measures,
      responsible_person: item.responsible_person,
      start_date: item.start_date,
      end_date: item.end_date || '',
      completion_date: item.completion_date || '',
      documents: item.documents || []
    });
    setIsEditing(true);
    setShowModal(true);
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('conception_modifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Show success message
      setSuccess('Élément supprimé avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchConceptionModifications();
    } catch (err: any) {
      console.error('Error deleting conception/modification:', err);
      setError('Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'conception',
      status: 'planned',
      impact_description: '',
      energy_efficiency_measures: '',
      responsible_person: '',
      start_date: '',
      end_date: '',
      completion_date: '',
      documents: []
    });
    setCurrentItem(null);
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
  
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'conception':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
            Conception
          </span>
        );
      case 'modification':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
            Modification
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            {type}
          </span>
        );
    }
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non défini';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const filteredItems = conceptionModifications.filter(item => {
    // Apply type filter
    if (typeFilter !== 'all' && item.type !== typeFilter) {
      return false;
    }
    
    // Apply status filter
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }
    
    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.responsible_person.toLowerCase().includes(searchLower)
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
                onClick={() => navigate('/gestion/systeme')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Retour</span>
              </button>
              
              <div className="h-6 w-px bg-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <PenTool className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Conception et Modifications</h1>
                  {organizationName && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4" />
                      <span>{organizationName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-sm">
              <FileText className="w-4 h-4 text-purple-600" />
              <span className="text-purple-800 font-medium">Système</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl">
            Gérez les projets de conception et de modification qui ont un impact sur la performance énergétique. 
            Documentez les mesures d'efficacité énergétique intégrées dans chaque projet et suivez leur mise en œuvre.
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
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">Tous les types</option>
                  <option value="conception">Conception</option>
                  <option value="modification">Modification</option>
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Ajouter un projet</span>
              </button>
            )}
          </div>
        </div>

        {/* Conception/Modifications List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <PenTool className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Projets de conception et modifications</h2>
            </div>
          </div>
          
          <div className="p-6">
            {isLoading && conceptionModifications.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucun projet trouvé. {isAdmin ? "Ajoutez des projets de conception ou de modification pour commencer." : ""}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            {getTypeBadge(item.type)}
                            {getStatusBadge(item.status)}
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                          <p className="text-gray-600 mb-4">{item.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Calendar className="w-4 h-4" />
                              <span>Début: {formatDate(item.start_date)}</span>
                            </div>
                            
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Calendar className="w-4 h-4" />
                              <span>Fin prévue: {formatDate(item.end_date)}</span>
                            </div>
                            
                            {item.status === 'completed' && (
                              <div className="flex items-center space-x-2 text-sm text-green-600">
                                <CheckSquare className="w-4 h-4" />
                                <span>Terminé le: {formatDate(item.completion_date)}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <User className="w-4 h-4" />
                              <span>Responsable: {item.responsible_person}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">Impact sur la performance énergétique:</h4>
                              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{item.impact_description}</p>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">Mesures d'efficacité énergétique:</h4>
                              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{item.energy_efficiency_measures}</p>
                            </div>
                          </div>
                        </div>
                        
                        {isAdmin && (
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {item.documents && item.documents.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Documents:</h4>
                          <div className="flex flex-wrap gap-2">
                            {item.documents.map((doc, index) => (
                              <a
                                key={index}
                                href={doc}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors"
                              >
                                <FileCheck className="w-3 h-3" />
                                <span>Document {index + 1}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4 text-xs text-gray-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>Dernière mise à jour: {new Date(item.updated_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Information Box */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <HelpCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Conception et modifications énergétiquement efficaces</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  La norme ISO 50001 exige que les organisations intègrent l'efficacité énergétique dans la conception et la modification 
                  de leurs installations, équipements, systèmes et processus.
                </p>
                <p className="mt-2">
                  Cela implique de :
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Identifier les opportunités d'amélioration de la performance énergétique</li>
                  <li>Considérer la consommation d'énergie dans les décisions de conception</li>
                  <li>Intégrer des critères d'efficacité énergétique dans les spécifications d'achat</li>
                  <li>Documenter les résultats des activités de conception</li>
                  <li>Évaluer l'impact des modifications sur la performance énergétique</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
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
              {isEditing ? 'Modifier le projet' : 'Ajouter un projet'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Titre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="conception">Conception</option>
                    <option value="modification">Modification</option>
                  </select>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="planned">Planifié</option>
                    <option value="in_progress">En cours</option>
                    <option value="completed">Terminé</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin prévue
                  </label>
                  <input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {formData.status === 'completed' && (
                  <div>
                    <label htmlFor="completion_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Date d'achèvement réelle <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="completion_date"
                      name="completion_date"
                      value={formData.completion_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required={formData.status === 'completed'}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="responsible_person" className="block text-sm font-medium text-gray-700 mb-1">
                    Personne responsable <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="responsible_person"
                    name="responsible_person"
                    value={formData.responsible_person}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="impact_description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description de l'impact sur la performance énergétique <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="impact_description"
                    name="impact_description"
                    value={formData.impact_description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="energy_efficiency_measures" className="block text-sm font-medium text-gray-700 mb-1">
                    Mesures d'efficacité énergétique <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="energy_efficiency_measures"
                    name="energy_efficiency_measures"
                    value={formData.energy_efficiency_measures}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Documents section - simplified for now */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Documents (URLs)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Entrez les URLs des documents, séparées par des virgules
                  </p>
                  <input
                    type="text"
                    name="documents"
                    value={formData.documents.join(', ')}
                    onChange={(e) => setFormData({
                      ...formData,
                      documents: e.target.value.split(',').map(url => url.trim()).filter(url => url !== '')
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="https://example.com/doc1, https://example.com/doc2"
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
                  disabled={isSubmitting || !formData.title || !formData.description}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmitting || !formData.title || !formData.description
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700'
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

export default ConceptionModificationsPage;