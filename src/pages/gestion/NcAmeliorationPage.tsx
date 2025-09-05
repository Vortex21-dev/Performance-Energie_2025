import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  CheckCircle,
  Loader,
  Building2,
  FileText,
  Search,
  Calendar,
  Clock,
  Download,
  Eye,
  Upload,
  File,
  MessageSquare,
  Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface NonConformity {
  id: string;
  organization_name: string;
  name: string;
  description: string | null;
  corrective_action: string | null;
  improvement: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  responsible_person: string | null;
  created_at: string;
  updated_at: string;
}

const NcAmeliorationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [nonConformities, setNonConformities] = useState<NonConformity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNC, setCurrentNC] = useState<NonConformity | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    corrective_action: '',
    improvement: '',
    status: 'open' as 'open' | 'in_progress' | 'closed',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: '',
    responsible_person: ''
  });
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_client';
  
  useEffect(() => {
    fetchUserOrganization();
  }, [user]);
  
  useEffect(() => {
    if (organizationName) {
      fetchNonConformities();
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
  
  const fetchNonConformities = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('non_conformities')
        .select('*')
        .eq('organization_name', organizationName)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setNonConformities(data || []);
    } catch (err: any) {
      console.error('Error fetching non-conformities:', err);
      setError('Erreur lors du chargement des non-conformités');
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
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Check file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('Le fichier ne doit pas dépasser 10MB');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
  };
  
  const uploadFile = async (): Promise<{ url: string; name: string; type: string } | null> => {
    if (!file || !organizationName) return null;
    
    try {
      setIsUploading(true);
      
      // Create a unique file path
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const sanitizedOrgName = organizationName.replace(/[^a-zA-Z0-9]/g, '-');
      const fileName = `${sanitizedOrgName}-nc-${timestamp}.${fileExt}`;
      const filePath = `non_conformities/${fileName}`;
      
      // Convert file to ArrayBuffer for upload
      const fileArrayBuffer = await file.arrayBuffer();
      
      // Upload the file to Supabase Storage with explicit content type
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, fileArrayBuffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Erreur de téléchargement: ${uploadError.message}`);
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      return {
        url: publicUrl,
        name: file.name,
        type: file.type || 'application/octet-stream'
      };
    } catch (err: any) {
      console.error('Error uploading file:', err);
      throw new Error(`Erreur lors du téléchargement du fichier: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Upload file if selected
      let fileData = null;
      if (file) {
        try {
          fileData = await uploadFile();
        } catch (uploadErr: any) {
          throw new Error(uploadErr.message);
        }
      }
      
      const ncData: any = {
        organization_name: organizationName,
        name: formData.name,
        description: formData.description || null,
        corrective_action: formData.corrective_action || null,
        improvement: formData.improvement || null,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null,
        responsible_person: formData.responsible_person || null
      };
      
      // Add file data if available
      if (fileData) {
        ncData.file_url = fileData.url;
        ncData.file_name = fileData.name;
        ncData.file_type = fileData.type;
      } else if (isEditing && currentNC) {
        // Keep existing file data when editing without changing the file
        ncData.file_url = currentNC.file_url;
        ncData.file_name = currentNC.file_name;
        ncData.file_type = currentNC.file_type;
      }
      
      let result;
      
      if (isEditing && currentNC) {
        // Update existing non-conformity
        result = await supabase
          .from('non_conformities')
          .update(ncData)
          .eq('id', currentNC.id);
      } else {
        // Insert new non-conformity
        result = await supabase
          .from('non_conformities')
          .insert([ncData]);
      }
      
      if (result.error) throw result.error;
      
      // Reset form and close modal
      resetForm();
      setShowModal(false);
      
      // Show success message
      setSuccess(isEditing 
        ? 'Non-conformité modifiée avec succès' 
        : 'Non-conformité ajoutée avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchNonConformities();
    } catch (err: any) {
      console.error('Error saving non-conformity:', err);
      setError('Erreur lors de l\'enregistrement de la non-conformité');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEdit = (nc: NonConformity) => {
    setCurrentNC(nc);
    setFormData({
      name: nc.name,
      description: nc.description || '',
      corrective_action: nc.corrective_action || '',
      improvement: nc.improvement || '',
      status: nc.status,
      priority: nc.priority,
      due_date: nc.due_date ? new Date(nc.due_date).toISOString().split('T')[0] : '',
      responsible_person: nc.responsible_person || ''
    });
    setIsEditing(true);
    setShowModal(true);
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette non-conformité ?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Get the file URL before deleting the record
      const { data, error: fetchError } = await supabase
        .from('non_conformities')
        .select('file_url')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Delete the record from the database
      const { error } = await supabase
        .from('non_conformities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Delete the file from storage if it exists
      if (data?.file_url) {
        const urlParts = data.file_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `non_conformities/${fileName}`;
        
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([filePath]);
        
        if (storageError) {
          console.error('Error deleting file from storage:', storageError);
          // Don't throw here, as the record is already deleted
        }
      }
      
      // Show success message
      setSuccess('Non-conformité supprimée avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchNonConformities();
    } catch (err: any) {
      console.error('Error deleting non-conformity:', err);
      setError('Erreur lors de la suppression de la non-conformité');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      corrective_action: '',
      improvement: '',
      status: 'open',
      priority: 'medium',
      due_date: '',
      responsible_person: ''
    });
    setCurrentNC(null);
    setIsEditing(false);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="w-5 h-5 text-gray-500" />;
    
    if (fileType.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    } else if (fileType.includes('image')) {
      return <FileText className="w-5 h-5 text-green-500" />;
    }
    
    return <File className="w-5 h-5 text-gray-500" />;
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            Ouverte
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            En cours
          </span>
        );
      case 'closed':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            Clôturée
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
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            Basse
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
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
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non définie';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const filteredNCs = nonConformities.filter(nc => {
    // Apply status filter
    if (statusFilter !== 'all' && nc.status !== statusFilter) {
      return false;
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all' && nc.priority !== priorityFilter) {
      return false;
    }
    
    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        nc.name.toLowerCase().includes(searchLower) ||
        (nc.description && nc.description.toLowerCase().includes(searchLower)) ||
        (nc.responsible_person && nc.responsible_person.toLowerCase().includes(searchLower))
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
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Non-conformités et Actions Correctives</h1>
                  {organizationName && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4" />
                      <span>{organizationName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-sm">
              <FileText className="w-4 h-4 text-red-600" />
              <span className="text-red-800 font-medium">Amélioration</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl">
            Gérez les non-conformités, définissez les actions correctives et suivez les améliorations. 
            Ce module vous permet d'identifier les écarts par rapport aux exigences, de mettre en place des 
            actions correctives et de suivre les améliorations pour renforcer votre performance énergétique.
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
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="open">Ouverte</option>
                  <option value="in_progress">En cours</option>
                  <option value="closed">Clôturée</option>
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <div className="relative">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Ajouter une non-conformité</span>
              </button>
            )}
          </div>
        </div>

        {/* Non-Conformities List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg mr-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Liste des non-conformités</h2>
            </div>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader className="w-8 h-8 animate-spin text-red-500" />
              </div>
            ) : filteredNCs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucune non-conformité trouvée. {isAdmin ? "Ajoutez des non-conformités pour commencer." : ""}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNCs.map((nc) => (
                  <motion.div
                    key={nc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            {getStatusBadge(nc.status)}
                            {getPriorityBadge(nc.priority)}
                          </div>
                          <h3 className="text-lg font-medium text-gray-900">{nc.name}</h3>
                        </div>
                        {isAdmin && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(nc)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(nc.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {nc.description && (
                        <p className="text-sm text-gray-600 mb-4">{nc.description}</p>
                      )}
                      
                      <div className="space-y-2 mb-4">
                        {nc.due_date && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            <span>Échéance: {formatDate(nc.due_date)}</span>
                          </div>
                        )}
                        
                        {nc.responsible_person && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MessageSquare className="w-4 h-4 mr-2 text-gray-400" />
                            <span>Responsable: {nc.responsible_person}</span>
                          </div>
                        )}
                      </div>
                      
                      {nc.file_url && (
                        <div className="flex flex-col space-y-2 mb-4">
                          <div className="text-xs text-gray-500">
                            {nc.file_name}
                          </div>
                          <div className="flex space-x-2">
                            <a
                              href={nc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Consulter</span>
                            </a>
                            <a
                              href={nc.file_url}
                              download
                              className="flex items-center space-x-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm"
                            >
                              <Download className="w-4 h-4" />
                              <span>Télécharger</span>
                            </a>
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>Créée le {formatDate(nc.created_at)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Non-Conformity Modal */}
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
              {isEditing ? 'Modifier la non-conformité' : 'Ajouter une non-conformité'}
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Ex: Non-respect des procédures d'extinction des équipements"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  >
                    <option value="open">Ouverte</option>
                    <option value="in_progress">En cours</option>
                    <option value="closed">Clôturée</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                    Priorité <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                  </select>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Décrivez la non-conformité..."
                  />
                </div>

              

                <div>
                  <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date d'échéance
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      id="due_date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label htmlFor="responsible_person" className="block text-sm font-medium text-gray-700 mb-1">
                    Personne responsable
                  </label>
                  <input
                    type="text"
                    id="responsible_person"
                    name="responsible_person"
                    value={formData.responsible_person}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Ex: Jean Dupont"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                    <div className="space-y-1 text-center">
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-red-600 hover:text-red-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-red-500"
                        >
                          <span>Télécharger un fichier</span>
                          <input
                            id="file-upload"
                            ref={fileInputRef}
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            onChange={handleFileChange}
                          />
                        </label>
                        <p className="pl-1">ou glisser-déposer</p>
                      </div>
                      <p className="text-xs text-gray-500">PDF, Word, Excel, Images jusqu'à 10MB</p>
                      {file && (
                        <div className="mt-2 flex items-center justify-center">
                          <FileText className="h-8 w-8 text-red-500 mr-2" />
                          <span className="text-sm text-gray-900">{file.name}</span>
                        </div>
                      )}
                      {isEditing && currentNC?.file_name && !file && (
                        <div className="mt-2 flex items-center justify-center">
                          {getFileIcon(currentNC.file_type)}
                          <span className="text-sm text-gray-900 ml-2">{currentNC.file_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
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
                  disabled={isSubmitting || !formData.name}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmitting || !formData.name
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
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

export default NcAmeliorationPage;