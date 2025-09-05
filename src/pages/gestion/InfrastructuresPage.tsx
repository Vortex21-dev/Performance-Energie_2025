import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Building,
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
  MapPin,
  Calendar,
  Clock,
  HelpCircle,
  Warehouse,
  Home,
  Factory,
  Landmark,
  Gauge,
  BarChart3,
  Tag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Infrastructure {
  id: string;
  organization_name: string;
  name: string;
  type: string;
  location: string;
  construction_year: number | null;
  surface_area: number | null;
  area_unit: string;
  energy_performance: string | null;
  description: string | null;
  status: 'active' | 'inactive' | 'maintenance' | 'planned';
  tags: string[];
  created_at: string;
  updated_at: string;
}

const InfrastructuresPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentInfrastructure, setCurrentInfrastructure] = useState<Infrastructure | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'building',
    location: '',
    construction_year: '',
    surface_area: '',
    area_unit: 'm²',
    energy_performance: '',
    description: '',
    status: 'active' as 'active' | 'inactive' | 'maintenance' | 'planned',
    tags: [] as string[]
  });
  
  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState<string>('');
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_client';
  
  useEffect(() => {
    fetchUserOrganization();
  }, [user]);
  
  useEffect(() => {
    if (organizationName) {
      fetchInfrastructures();
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
  
  const fetchInfrastructures = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('infrastructures')
        .select('*')
        .eq('organization_name', organizationName)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setInfrastructures(data || []);
    } catch (err: any) {
      console.error('Error fetching infrastructures:', err);
      setError('Erreur lors du chargement des infrastructures');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'construction_year' || name === 'surface_area') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };
  
  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const infrastructureData = {
        organization_name: organizationName,
        name: formData.name,
        type: formData.type,
        location: formData.location,
        construction_year: formData.construction_year ? parseInt(formData.construction_year) : null,
        surface_area: formData.surface_area ? parseFloat(formData.surface_area) : null,
        area_unit: formData.area_unit,
        energy_performance: formData.energy_performance || null,
        description: formData.description || null,
        status: formData.status,
        tags: formData.tags
      };
      
      let result;
      
      if (isEditing && currentInfrastructure) {
        // Update existing infrastructure
        result = await supabase
          .from('infrastructures')
          .update(infrastructureData)
          .eq('id', currentInfrastructure.id);
      } else {
        // Insert new infrastructure
        result = await supabase
          .from('infrastructures')
          .insert([infrastructureData]);
      }
      
      if (result.error) throw result.error;
      
      // Reset form and close modal
      resetForm();
      setShowModal(false);
      
      // Show success message
      setSuccess(isEditing 
        ? 'Infrastructure modifiée avec succès' 
        : 'Infrastructure ajoutée avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchInfrastructures();
    } catch (err: any) {
      console.error('Error saving infrastructure:', err);
      setError('Erreur lors de l\'enregistrement de l\'infrastructure');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEdit = (infrastructure: Infrastructure) => {
    setCurrentInfrastructure(infrastructure);
    setFormData({
      name: infrastructure.name,
      type: infrastructure.type,
      location: infrastructure.location,
      construction_year: infrastructure.construction_year?.toString() || '',
      surface_area: infrastructure.surface_area?.toString() || '',
      area_unit: infrastructure.area_unit,
      energy_performance: infrastructure.energy_performance || '',
      description: infrastructure.description || '',
      status: infrastructure.status,
      tags: infrastructure.tags || []
    });
    setIsEditing(true);
    setShowModal(true);
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette infrastructure ?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('infrastructures')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Show success message
      setSuccess('Infrastructure supprimée avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchInfrastructures();
    } catch (err: any) {
      console.error('Error deleting infrastructure:', err);
      setError('Erreur lors de la suppression de l\'infrastructure');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      type: 'building',
      location: '',
      construction_year: '',
      surface_area: '',
      area_unit: 'm²',
      energy_performance: '',
      description: '',
      status: 'active',
      tags: []
    });
    setCurrentInfrastructure(null);
    setIsEditing(false);
    setTagInput('');
  };
  
  const getInfrastructureIcon = (type: string) => {
    switch (type) {
      case 'building':
        return <Building className="w-5 h-5 text-blue-500" />;
      case 'office':
        return <Home className="w-5 h-5 text-green-500" />;
      case 'factory':
        return <Factory className="w-5 h-5 text-amber-500" />;
      case 'warehouse':
        return <Warehouse className="w-5 h-5 text-purple-500" />;
      case 'administrative':
        return <Landmark className="w-5 h-5 text-indigo-500" />;
      default:
        return <Building className="w-5 h-5 text-gray-500" />;
    }
  };
  
  const getInfrastructureTypeName = (type: string) => {
    switch (type) {
      case 'building':
        return 'Bâtiment';
      case 'office':
        return 'Bureau';
      case 'factory':
        return 'Usine';
      case 'warehouse':
        return 'Entrepôt';
      case 'administrative':
        return 'Administratif';
      default:
        return type;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            Actif
          </span>
        );
      case 'inactive':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            Inactif
          </span>
        );
      case 'maintenance':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            En maintenance
          </span>
        );
      case 'planned':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            Planifié
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
  
  const filteredInfrastructures = infrastructures.filter(infra => {
    // Apply type filter
    if (typeFilter !== 'all' && infra.type !== typeFilter) {
      return false;
    }
    
    // Apply status filter
    if (statusFilter !== 'all' && infra.status !== statusFilter) {
      return false;
    }
    
    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        infra.name.toLowerCase().includes(searchLower) ||
        infra.location.toLowerCase().includes(searchLower) ||
        (infra.description && infra.description.toLowerCase().includes(searchLower)) ||
        infra.tags.some(tag => tag.toLowerCase().includes(searchLower))
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
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Building className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Maintenance des infrastructures</h1>
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
              <span className="text-indigo-800 font-medium">Système</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl">
            Gérez vos infrastructures énergétiques telles que les bâtiments, bureaux, usines et entrepôts. 
            Documentez leurs caractéristiques, leur performance énergétique et leur statut pour une meilleure gestion.
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
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">Tous les types</option>
                  <option value="building">Bâtiment</option>
                  <option value="office">Bureau</option>
                  <option value="factory">Usine</option>
                  <option value="warehouse">Entrepôt</option>
                  <option value="administrative">Administratif</option>
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                  <option value="maintenance">En maintenance</option>
                  <option value="planned">Planifié</option>
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
                <span>Ajouter une infrastructure</span>
              </button>
            )}
          </div>
        </div>

        {/* Infrastructures List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                <Building className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Infrastructures</h2>
            </div>
          </div>
          
          <div className="p-6">
            {isLoading && infrastructures.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : filteredInfrastructures.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucune infrastructure trouvée. {isAdmin ? "Ajoutez des infrastructures pour commencer." : ""}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInfrastructures.map((infra) => (
                  <motion.div
                    key={infra.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            {getInfrastructureIcon(infra.type)}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{infra.name}</h3>
                            <p className="text-sm text-gray-500">{getInfrastructureTypeName(infra.type)}</p>
                          </div>
                        </div>
                        <div>
                          {getStatusBadge(infra.status)}
                        </div>
                      </div>
                      
                      <div className="mt-4 space-y-3">
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                          <span className="text-sm text-gray-600">{infra.location}</span>
                        </div>
                        
                        {infra.construction_year && (
                          <div className="flex items-start space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                            <span className="text-sm text-gray-600">Année de construction: {infra.construction_year}</span>
                          </div>
                        )}
                        
                        {infra.surface_area && (
                          <div className="flex items-start space-x-2">
                            <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                            <span className="text-sm text-gray-600">Surface: {infra.surface_area} {infra.area_unit}</span>
                          </div>
                        )}
                        
                        {infra.energy_performance && (
                          <div className="flex items-start space-x-2">
                            <Gauge className="w-4 h-4 text-gray-400 mt-0.5" />
                            <span className="text-sm text-gray-600">Performance énergétique: {infra.energy_performance}</span>
                          </div>
                        )}
                        
                        {infra.description && (
                          <div className="flex items-start space-x-2">
                            <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                            <span className="text-sm text-gray-600">{infra.description}</span>
                          </div>
                        )}
                        
                        {infra.tags && infra.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {infra.tags.map((tag, index) => (
                              <span 
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                        <div className="text-xs text-gray-400 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>Mis à jour: {new Date(infra.updated_at).toLocaleDateString()}</span>
                        </div>
                        
                        {isAdmin && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(infra)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(infra.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Statistics */}
        {!isLoading && infrastructures.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total des infrastructures</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{infrastructures.length}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Building className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Surface totale</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {infrastructures
                      .filter(i => i.surface_area !== null)
                      .reduce((sum, i) => sum + (i.surface_area || 0), 0)
                    } m²
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Infrastructures actives</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {infrastructures.filter(i => i.status === 'active').length}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Information Box */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <HelpCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Gestion des infrastructures énergétiques</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  La gestion des infrastructures est un élément clé de votre système de management énergétique. 
                  Elle vous permet de :
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Identifier les infrastructures ayant un impact significatif sur la performance énergétique</li>
                  <li>Suivre les caractéristiques et l'état de vos bâtiments et installations</li>
                  <li>Planifier les améliorations et les rénovations énergétiques</li>
                  <li>Documenter les performances énergétiques de vos infrastructures</li>
                  <li>Prioriser les actions d'amélioration en fonction des caractéristiques des infrastructures</li>
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
              {isEditing ? 'Modifier l\'infrastructure' : 'Ajouter une infrastructure'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="building">Bâtiment</option>
                    <option value="office">Bureau</option>
                    <option value="factory">Usine</option>
                    <option value="warehouse">Entrepôt</option>
                    <option value="administrative">Administratif</option>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                    <option value="maintenance">En maintenance</option>
                    <option value="planned">Planifié</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                    Localisation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="construction_year" className="block text-sm font-medium text-gray-700 mb-1">
                    Année de construction
                  </label>
                  <input
                    type="number"
                    id="construction_year"
                    name="construction_year"
                    value={formData.construction_year}
                    onChange={handleInputChange}
                    min="1900"
                    max={new Date().getFullYear()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="flex space-x-3">
                  <div className="flex-1">
                    <label htmlFor="surface_area" className="block text-sm font-medium text-gray-700 mb-1">
                      Surface
                    </label>
                    <input
                      type="number"
                      id="surface_area"
                      name="surface_area"
                      value={formData.surface_area}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="w-24">
                    <label htmlFor="area_unit" className="block text-sm font-medium text-gray-700 mb-1">
                      Unité
                    </label>
                    <select
                      id="area_unit"
                      name="area_unit"
                      value={formData.area_unit}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="m²">m²</option>
                      <option value="ft²">ft²</option>
                      <option value="ha">ha</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="energy_performance" className="block text-sm font-medium text-gray-700 mb-1">
                    Performance énergétique
                  </label>
                  <input
                    type="text"
                    id="energy_performance"
                    name="energy_performance"
                    value={formData.energy_performance}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ex: A, B, C, D, E, F, G ou kWh/m²/an"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Ajouter un tag"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Ajouter
                    </button>
                  </div>
                  
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {formData.tags.map((tag, index) => (
                        <div 
                          key={index}
                          className="flex items-center space-x-1 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-gray-500 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                  disabled={isSubmitting || !formData.name || !formData.location}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmitting || !formData.name || !formData.location
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

export default InfrastructuresPage;