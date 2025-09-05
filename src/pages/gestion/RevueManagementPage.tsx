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
  Search,
  Calendar,
  Clock,
  Download,
  Eye,
  Upload,
  File
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface RevueDocument {
  id: string;
  organization_name: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
  updated_at: string;
}

const RevueManagementPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [revueDocuments, setRevueDocuments] = useState<RevueDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<RevueDocument | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_client';
  
  useEffect(() => {
    fetchUserOrganization();
  }, [user]);
  
  useEffect(() => {
    if (organizationName) {
      fetchRevueDocuments();
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
  
  const fetchRevueDocuments = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('revue_management')
        .select('*')
        .eq('organization_name', organizationName)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setRevueDocuments(data || []);
    } catch (err: any) {
      console.error('Error fetching revue documents:', err);
      setError('Erreur lors du chargement des documents de revue');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Check if file is a PowerPoint or PDF
    const validTypes = [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/pdf'
    ];
    
    const validExtensions = ['.ppt', '.pptx', '.pdf'];
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
    
    if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(fileExtension)) {
      setError('Veuillez sélectionner un fichier PowerPoint (.ppt, .pptx) ou PDF');
      return;
    }
    
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
      const fileName = `${sanitizedOrgName}-revue-${timestamp}.${fileExt}`;
      const filePath = `revue_management/${fileName}`;
      
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
      
      const documentData: any = {
        organization_name: organizationName,
        title: formData.title,
        description: formData.description || null
      };
      
      // Add file data if available
      if (fileData) {
        documentData.file_url = fileData.url;
        documentData.file_name = fileData.name;
        documentData.file_type = fileData.type;
      } else if (isEditing && currentDocument) {
        // Keep existing file data when editing without changing the file
        documentData.file_url = currentDocument.file_url;
        documentData.file_name = currentDocument.file_name;
        documentData.file_type = currentDocument.file_type;
      }
      
      let result;
      
      if (isEditing && currentDocument) {
        // Update existing document
        result = await supabase
          .from('revue_management')
          .update(documentData)
          .eq('id', currentDocument.id);
      } else {
        // Insert new document
        result = await supabase
          .from('revue_management')
          .insert([documentData]);
      }
      
      if (result.error) throw result.error;
      
      // Reset form and close modal
      resetForm();
      setShowModal(false);
      
      // Show success message
      setSuccess(isEditing 
        ? 'Document modifié avec succès' 
        : 'Document ajouté avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchRevueDocuments();
    } catch (err: any) {
      console.error('Error saving document:', err);
      setError(err.message || 'Erreur lors de l\'enregistrement du document');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEdit = (document: RevueDocument) => {
    setCurrentDocument(document);
    setFormData({
      title: document.title,
      description: document.description || ''
    });
    setIsEditing(true);
    setShowModal(true);
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Get the file URL before deleting the record
      const { data, error: fetchError } = await supabase
        .from('revue_management')
        .select('file_url')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Delete the record from the database
      const { error } = await supabase
        .from('revue_management')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Delete the file from storage if it exists
      if (data?.file_url) {
        const urlParts = data.file_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `revue_management/${fileName}`;
        
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([filePath]);
        
        if (storageError) {
          console.error('Error deleting file from storage:', storageError);
          // Don't throw here, as the record is already deleted
        }
      }
      
      // Show success message
      setSuccess('Document supprimé avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchRevueDocuments();
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setError('Erreur lors de la suppression du document');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      title: '',
      description: ''
    });
    setCurrentDocument(null);
    setIsEditing(false);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="w-5 h-5 text-gray-500" />;
    
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
      return <FileText className="w-5 h-5 text-orange-500" />;
    } else if (fileType.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    
    return <File className="w-5 h-5 text-gray-500" />;
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const filteredDocuments = revueDocuments.filter(doc => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        doc.title.toLowerCase().includes(searchLower) ||
        (doc.description && doc.description.toLowerCase().includes(searchLower)) ||
        (doc.file_name && doc.file_name.toLowerCase().includes(searchLower))
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
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <ClipboardCheck className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Revue de Management Énergétique</h1>
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
              <span className="text-indigo-800 font-medium">Amélioration</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl">
            Gérez vos documents de revue de management énergétique. Vous pouvez télécharger, consulter et partager des présentations PowerPoint
            et des documents PDF contenant les analyses et revues de votre management énergétique.
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
            
            {isAdmin && (
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Ajouter un document</span>
              </button>
            )}
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Documents de revue de management</h2>
            </div>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucun document trouvé. {isAdmin ? "Ajoutez des documents pour commencer." : ""}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocuments.map((document) => (
                  <motion.div
                    key={document.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(document.file_type)}
                          <h3 className="font-medium text-gray-900">{document.title}</h3>
                        </div>
                        {isAdmin && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(document)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(document.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {document.description && (
                        <p className="text-sm text-gray-600 mb-4">{document.description}</p>
                      )}
                      
                      {document.file_url && (
                        <div className="flex flex-col space-y-2 mb-4">
                          <div className="text-xs text-gray-500">
                            {document.file_name}
                          </div>
                          <div className="flex space-x-2">
                            <a
                              href={document.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Consulter</span>
                            </a>
                            <a
                              href={document.file_url}
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
                        <span>Ajouté le {formatDate(document.created_at)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Document Modal */}
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
              {isEditing ? 'Modifier le document' : 'Ajouter un document'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: Revue de management Q2 2025"
                  required
                />
              </div>

              <div>
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
                  placeholder="Description du document..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document (PowerPoint ou PDF)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                  <div className="space-y-1 text-center">
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                      >
                        <span>Télécharger un fichier</span>
                        <input
                          id="file-upload"
                          ref={fileInputRef}
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".ppt,.pptx,.pdf"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">ou glisser-déposer</p>
                    </div>
                    <p className="text-xs text-gray-500">PowerPoint (.ppt, .pptx) ou PDF jusqu'à 10MB</p>
                    {file && (
                      <div className="mt-2 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-indigo-500 mr-2" />
                        <span className="text-sm text-gray-900">{file.name}</span>
                      </div>
                    )}
                    {isEditing && currentDocument?.file_name && !file && (
                      <div className="mt-2 flex items-center justify-center">
                        {getFileIcon(currentDocument.file_type)}
                        <span className="text-sm text-gray-900 ml-2">{currentDocument.file_name}</span>
                      </div>
                    )}
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
                  disabled={isSubmitting || !formData.title || ((!file && !isEditing) || (!file && isEditing && !currentDocument?.file_url))}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmitting || !formData.title || ((!file && !isEditing) || (!file && isEditing && !currentDocument?.file_url))
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

export default RevueManagementPage;