import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Users,
  Save,
  Download,
  Upload,
  File,
  AlertTriangle,
  CheckCircle,
  Loader,
  Building2,
  FileText,
  Edit2,
  Clock,
  Target,
  Zap,
  Compass,
  X,
  Image
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import html2canvas from 'html2canvas';

interface PolitiqueObjectifs {
  organization_name: string;
  politique_file_url: string | null;
  politique_file_type: string | null;
  objectifs_text: string | null;
  orientations_text: string | null;
  created_at: string;
  updated_at: string;
}

const PolitiqueObjectifsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [politiqueObjectifs, setPolitiqueObjectifs] = useState<PolitiqueObjectifs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_client';
  
  // Form state
  const [politiqueFile, setPolitiqueFile] = useState<File | null>(null);
  const [politiqueFileUrl, setPolitiqueFileUrl] = useState<string | null>(null);
  const [politiqueFileType, setPolitiqueFileType] = useState<'image' | 'pdf' | null>(null);
  const [objectifsText, setObjectifsText] = useState('');
  const [orientationsText, setOrientationsText] = useState('');
  
  // Refs for download functionality
  const politiqueRef = useRef<HTMLDivElement>(null);
  const objectifsRef = useRef<HTMLDivElement>(null);
  const orientationsRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    fetchUserOrganization();
  }, [user]);
  
  useEffect(() => {
    if (organizationName) {
      fetchPolitiqueObjectifs();
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
  
  const fetchPolitiqueObjectifs = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('politique_objectifs')
        .select('*')
        .eq('organization_name', organizationName)
        .maybeSingle();
      
      if (error) throw error;
      
      setPolitiqueObjectifs(data);
      
      // Initialize form values
      if (data) {
        setPolitiqueFileUrl(data.politique_file_url);
        setPolitiqueFileType(data.politique_file_type as 'image' | 'pdf' | null);
        setObjectifsText(data.objectifs_text || '');
        setOrientationsText(data.orientations_text || '');
      }
    } catch (err: any) {
      console.error('Error fetching politique and objectifs:', err);
      setError('Erreur lors du chargement des données de politique et objectifs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const fileType = file.type.startsWith('image/') ? 'image' : 
                    file.type === 'application/pdf' ? 'pdf' : null;
    
    if (!fileType) {
      setError('Type de fichier non supporté. Veuillez télécharger une image ou un PDF.');
      return;
    }

    setPolitiqueFile(file);
    setPolitiqueFileType(fileType);
  };

  const uploadFile = async () => {
    if (!politiqueFile || !organizationName) return null;
    
    try {
      setIsUploading(true);
      
      // Create a unique file path
      const fileExt = politiqueFile.name.split('.').pop();
      const fileName = `${organizationName.replace(/\s+/g, '-')}-politique-${Date.now()}.${fileExt}`;
      const filePath = `politique/${fileName}`;
      
      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, politiqueFile);
      
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(`Erreur lors du téléchargement du fichier: ${err.message}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleSave = async () => {
    if (!organizationName || !isAdmin) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      // Upload file if a new one is selected
      let fileUrl = politiqueFileUrl;
      if (politiqueFile) {
        fileUrl = await uploadFile();
        if (!fileUrl && politiqueFile) {
          throw new Error('Échec du téléchargement du fichier');
        }
      }
      
      const politiqueData = {
        organization_name: organizationName,
        politique_file_url: fileUrl,
        politique_file_type: politiqueFileType,
        objectifs_text: objectifsText,
        orientations_text: orientationsText
      };
      
      let result;
      
      if (politiqueObjectifs) {
        // Update existing record
        result = await supabase
          .from('politique_objectifs')
          .update(politiqueData)
          .eq('organization_name', organizationName);
      } else {
        // Insert new record
        result = await supabase
          .from('politique_objectifs')
          .insert([politiqueData]);
      }
      
      if (result.error) throw result.error;
      
      // Show success message
      setSuccess('Données enregistrées avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchPolitiqueObjectifs();
      
      // Exit edit mode
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error saving politique and objectifs:', err);
      setError('Erreur lors de l\'enregistrement des données');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleCancel = () => {
    // Reset form values to current data
    if (politiqueObjectifs) {
      setPolitiqueFileUrl(politiqueObjectifs.politique_file_url);
      setPolitiqueFileType(politiqueObjectifs.politique_file_type as 'image' | 'pdf' | null);
      setObjectifsText(politiqueObjectifs.objectifs_text || '');
      setOrientationsText(politiqueObjectifs.orientations_text || '');
    } else {
      setPolitiqueFileUrl(null);
      setPolitiqueFileType(null);
      setObjectifsText('');
      setOrientationsText('');
    }
    
    // Clear file selection
    setPolitiqueFile(null);
    
    setIsEditing(false);
  };
  
  const handleDownload = async (type: 'politique' | 'objectifs' | 'orientations') => {
    try {
      setIsDownloading(true);
      
      const element = type === 'politique' 
        ? politiqueRef.current 
        : type === 'objectifs' 
          ? objectifsRef.current 
          : orientationsRef.current;
      
      if (!element) {
        throw new Error('Élément non trouvé');
      }
      
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher scale for better quality
        logging: false,
        useCORS: true
      });
      
      // Create download link
      const link = document.createElement('a');
      link.download = type === 'politique' 
        ? `politique_energetique_${organizationName}.png` 
        : type === 'objectifs'
          ? `objectifs_energetiques_${organizationName}.png`
          : `orientations_strategiques_${organizationName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      // Show success message
      setSuccess(`${type === 'politique' ? 'Politique' : type === 'objectifs' ? 'Objectifs' : 'Orientations'} téléchargé(e) avec succès`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error downloading image:', err);
      setError(`Erreur lors du téléchargement: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
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
                <div className="p-2 bg-violet-100 rounded-lg">
                  <FileText className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Politique et Objectifs</h1>
                  {organizationName && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4" />
                      <span>{organizationName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl">
            Définissez votre politique énergétique, vos objectifs stratégiques et vos orientations. Ces documents formalisent l'engagement 
            de la direction et établissent le cadre pour l'amélioration continue de la performance énergétique.
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

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="space-y-8">
                 <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-teal-50 to-cyan-100 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center">
                  <div className="p-2 bg-teal-100 rounded-lg mr-3">
                    <Compass className="w-5 h-5 text-teal-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">Orientations Stratégiques</h2>
                </div>
                
                {!isEditing && politiqueObjectifs?.orientations_text && (
                  <button
                    onClick={() => handleDownload('orientations')}
                    disabled={isDownloading}
                    className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloading ? 'Téléchargement...' : 'Télécharger'}</span>
                  </button>
                )}
              </div>
              
              <div className="p-6">
                {isEditing ? (
                  <div>
                    <textarea
                      rows={10}
                      value={orientationsText}
                      onChange={(e) => setOrientationsText(e.target.value)}
                      placeholder="Saisissez vos orientations stratégiques ici..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                ) : politiqueObjectifs?.orientations_text ? (
                  <div 
                    ref={orientationsRef}
                    className="bg-white p-6 rounded-lg border border-gray-200"
                  >
                    <div className="mb-4 text-center">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">ORIENTATIONS STRATÉGIQUES</h3>
                      <div className="w-24 h-1 bg-teal-500 mx-auto"></div>
                    </div>
                    
                    <div className="mb-4 text-center">
                      <p className="text-lg font-medium text-gray-800">{organizationName}</p>
                    </div>
                    
                    <div className="whitespace-pre-line text-gray-700">
                      {politiqueObjectifs.orientations_text}
                    </div>
                    
                    <div className="mt-8 text-right">
                      <p className="text-sm text-gray-500">Date: {new Date().toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Compass className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune orientation définie</h3>
                    <p className="text-gray-500 mb-6">
                      Vous n'avez pas encore défini vos orientations stratégiques.
                    </p>
                    {!isEditing && isAdmin && (
                      <button
                        onClick={handleEdit}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors inline-flex items-center"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Ajouter maintenant
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Politique Énergétique */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-violet-50 to-purple-100 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center">
                  <div className="p-2 bg-violet-100 rounded-lg mr-3">
                    <Users className="w-5 h-5 text-violet-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">Politique Énergétique</h2>
                </div>
                
                {!isEditing && politiqueObjectifs?.politique_file_url && (
                  <button
                    onClick={() => handleDownload('politique')}
                    disabled={isDownloading}
                    className="flex items-center space-x-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloading ? 'Téléchargement...' : 'Télécharger'}</span>
                  </button>
                )}
              </div>
              
              <div className="p-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        id="politiqueFile"
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*,application/pdf"
                      />
                      
                      {politiqueFile ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center">
                            {politiqueFileType === 'image' ? (
                              <div className="relative">
                                <img 
                                  src={URL.createObjectURL(politiqueFile)} 
                                  alt="Politique énergétique" 
                                  className="max-h-64 rounded-lg border border-gray-200"
                                />
                                <button
                                  onClick={() => setPolitiqueFile(null)}
                                  className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 text-red-600 hover:bg-red-200 transition-colors"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <div className="flex items-center space-x-2 p-4 bg-gray-100 rounded-lg">
                                  <File className="w-8 h-8 text-gray-500" />
                                  <span className="text-gray-700 font-medium">{politiqueFile.name}</span>
                                </div>
                                <button
                                  onClick={() => setPolitiqueFile(null)}
                                  className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 text-red-600 hover:bg-red-200 transition-colors"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            Cliquez sur le bouton ci-dessous pour changer de fichier
                          </p>
                        </div>
                      ) : politiqueFileUrl ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center">
                            {politiqueFileType === 'image' ? (
                              <img 
                                src={politiqueFileUrl} 
                                alt="Politique énergétique" 
                                className="max-h-64 rounded-lg border border-gray-200"
                              />
                            ) : (
                              <div className="flex items-center space-x-2 p-4 bg-gray-100 rounded-lg">
                                <File className="w-8 h-8 text-gray-500" />
                                <span className="text-gray-700 font-medium">Document PDF</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            Cliquez sur le bouton ci-dessous pour changer de fichier
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="mb-4">
                            <Image className="w-16 h-16 text-gray-300 mx-auto" />
                          </div>
                          <p className="text-gray-500 mb-2">
                            Glissez-déposez votre fichier ici ou cliquez pour parcourir
                          </p>
                          <p className="text-sm text-gray-400">
                            Formats acceptés: JPG, PNG, PDF
                          </p>
                        </div>
                      )}
                      
                      <label
                        htmlFor="politiqueFile"
                        className="mt-4 inline-flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors cursor-pointer"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {politiqueFile || politiqueFileUrl ? 'Changer de fichier' : 'Sélectionner un fichier'}
                      </label>
                    </div>
                    

                  </div>
                ) : politiqueObjectifs?.politique_file_url ? (
                  <div 
                    ref={politiqueRef}
                    className="bg-white p-6 rounded-lg border border-gray-200"
                  >
                    <div className="mb-4 text-center">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">POLITIQUE ÉNERGÉTIQUE</h3>
                      <div className="w-24 h-1 bg-violet-500 mx-auto"></div>
                    </div>
                    
                    <div className="mb-4 text-center">
                      <p className="text-lg font-medium text-gray-800">{organizationName}</p>
                    </div>
                    
                    {politiqueObjectifs.politique_file_type === 'image' ? (
                      <div className="flex justify-center mb-6">
                        <img 
                          src={politiqueObjectifs.politique_file_url} 
                          alt="Politique énergétique" 
                          className="max-w-full rounded-lg border border-gray-200 shadow-sm"
                        />
                      </div>
                    ) : (
                      <div className="flex justify-center mb-6">
                        <a 
                          href={politiqueObjectifs.politique_file_url || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <File className="w-5 h-5 text-gray-600" />
                          <span className="text-gray-700 font-medium">Voir le document PDF</span>
                        </a>
                      </div>
                    )}
                    

                    
                    <div className="mt-8 text-right">
                      <p className="text-sm text-gray-500">Date: {new Date().toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune politique définie</h3>
                    <p className="text-gray-500 mb-6">
                      Vous n'avez pas encore défini votre politique énergétique.
                    </p>
                    {!isEditing && isAdmin && (
                      <button
                        onClick={handleEdit}
                        className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors inline-flex items-center"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Ajouter maintenant
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Objectifs Énergétiques */}
         
            
            {/* Orientations Stratégiques */}
       
            {/* Action Buttons */}
            {isEditing && (
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center"
                >
                  {isSaving ? (
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
            )}
            
            {/* Last Updated */}
            {politiqueObjectifs && !isEditing && (
              <div className="flex items-center justify-end text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                <span>Dernière mise à jour: {formatDate(politiqueObjectifs.updated_at)}</span>
              </div>
            )}
            
            {/* Information Box */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Zap className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Conseils pour une politique énergétique efficace</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Assurez-vous que votre politique est adaptée à la nature et à l'échelle des usages énergétiques de votre organisation</li>
                      <li>Incluez un engagement d'amélioration continue de la performance énergétique</li>
                      <li>Assurez-vous que les objectifs sont mesurables et réalisables</li>
                      <li>Prévoyez des ressources nécessaires pour atteindre les objectifs</li>
                      <li>Communiquez la politique à tous les niveaux de l'organisation</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PolitiqueObjectifsPage;