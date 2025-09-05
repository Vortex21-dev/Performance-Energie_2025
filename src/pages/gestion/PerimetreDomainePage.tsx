import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  MapPin,
  Save,
  AlertTriangle,
  CheckCircle,
  Loader,
  Building2,
  Info,
  Plus,
  Trash2,
  Edit2,
  X,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Perimetre {
  id: string;
  organization_name: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Processus {
  code: string;
  name: string;
  description: string | null;
}

interface PerimetreProcessus {
  perimetre_id: string;
  processus_code: string;
  organization_name: string;
}

const PerimetreDomainePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [perimetres, setPerimetres] = useState<Perimetre[]>([]);
  const [processus, setProcessus] = useState<Processus[]>([]);
  const [perimetreProcessus, setPerimetreProcessus] = useState<PerimetreProcessus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPerimetre, setCurrentPerimetre] = useState<Perimetre | null>(null);
  const [expandedPerimetres, setExpandedPerimetres] = useState<string[]>([]);
  
  // Form state
  const [perimetreName, setPerimetreName] = useState('');
  const [perimetreDescription, setPerimetreDescription] = useState('');
  const [selectedProcessus, setSelectedProcessus] = useState<string[]>([]);
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_client';
  
  useEffect(() => {
    fetchUserOrganization();
  }, [user]);
  
  useEffect(() => {
    if (organizationName) {
      fetchPerimetres();
      fetchProcessus();
      fetchPerimetreProcessus();
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
  
  const fetchPerimetres = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('perimetre_domaine')
        .select('*')
        .eq('organization_name', organizationName)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setPerimetres(data || []);
      
      // Expand the first perimetre by default
      if (data && data.length > 0) {
        setExpandedPerimetres([data[0].id]);
      }
    } catch (err: any) {
      console.error('Error fetching perimetres:', err);
      setError('Erreur lors du chargement des périmètres');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchProcessus = async () => {
    try {
      const { data, error } = await supabase
        .from('processus')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      setProcessus(data || []);
    } catch (err: any) {
      console.error('Error fetching processus:', err);
      setError('Erreur lors du chargement des processus');
    }
  };
  
  const fetchPerimetreProcessus = async () => {
    try {
      const { data, error } = await supabase
        .from('perimetre_processus')
        .select('*')
        .eq('organization_name', organizationName);
      
      if (error) throw error;
      
      setPerimetreProcessus(data || []);
    } catch (err: any) {
      console.error('Error fetching perimetre_processus:', err);
      setError('Erreur lors du chargement des associations périmètre-processus');
    }
  };
  
  const handleSave = async () => {
    if (!organizationName || !perimetreName.trim()) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      const perimetreData = {
        organization_name: organizationName,
        name: perimetreName.trim(),
        description: perimetreDescription.trim() || null
      };
      
      let result;
      
      if (isEditing && currentPerimetre) {
        // Update existing perimetre
        result = await supabase
          .from('perimetre_domaine')
          .update(perimetreData)
          .eq('id', currentPerimetre.id);
      } else {
        // Insert new perimetre
        result = await supabase
          .from('perimetre_domaine')
          .insert([perimetreData]);
      }
      
      if (result.error) throw result.error;
      
      // Get the perimetre ID
      let perimetreId: string;
      
      if (isEditing && currentPerimetre) {
        perimetreId = currentPerimetre.id;
      } else {
        // Fetch the newly created perimetre to get its ID
        const { data, error } = await supabase
          .from('perimetre_domaine')
          .select('id')
          .eq('organization_name', organizationName)
          .eq('name', perimetreName.trim())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (error) throw error;
        perimetreId = data.id;
      }
      
      // Save processus associations
      if (selectedProcessus.length > 0) {
        // First, delete existing associations
        const { error: deleteError } = await supabase
          .from('perimetre_processus')
          .delete()
          .eq('perimetre_id', perimetreId);
        
        if (deleteError) throw deleteError;
        
        // Then, insert new associations
        const associations = selectedProcessus.map(processusCode => ({
          perimetre_id: perimetreId,
          processus_code: processusCode,
          organization_name: organizationName
        }));
        
        const { error: insertError } = await supabase
          .from('perimetre_processus')
          .insert(associations);
        
        if (insertError) throw insertError;
      }
      
      // Show success message
      setSuccess(isEditing ? 'Périmètre modifié avec succès' : 'Périmètre ajouté avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Reset form
      resetForm();
      
      // Refresh data
      fetchPerimetres();
      fetchPerimetreProcessus();
    } catch (err: any) {
      console.error('Error saving perimetre:', err);
      setError('Erreur lors de l\'enregistrement du périmètre');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleEdit = (perimetre: Perimetre) => {
    setCurrentPerimetre(perimetre);
    setPerimetreName(perimetre.name);
    setPerimetreDescription(perimetre.description || '');
    
    // Get associated processus for this perimetre
    const associatedProcessus = perimetreProcessus
      .filter(pp => pp.perimetre_id === perimetre.id)
      .map(pp => pp.processus_code);
    
    setSelectedProcessus(associatedProcessus);
    setIsEditing(true);
    setShowAddForm(true);
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce périmètre ?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Delete associated processus first (cascade should handle this, but just to be safe)
      const { error: deleteAssocError } = await supabase
        .from('perimetre_processus')
        .delete()
        .eq('perimetre_id', id);
      
      if (deleteAssocError) throw deleteAssocError;
      
      // Then delete the perimetre
      const { error } = await supabase
        .from('perimetre_domaine')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Show success message
      setSuccess('Périmètre supprimé avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchPerimetres();
      fetchPerimetreProcessus();
    } catch (err: any) {
      console.error('Error deleting perimetre:', err);
      setError('Erreur lors de la suppression du périmètre');
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleProcessusSelection = (processusCode: string) => {
    setSelectedProcessus(prev => 
      prev.includes(processusCode)
        ? prev.filter(p => p !== processusCode)
        : [...prev, processusCode]
    );
  };
  
  const handleSaveProcessus = async (perimetreId: string) => {
    if (!organizationName) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      // First, delete all existing associations for this perimetre
      const { error: deleteError } = await supabase
        .from('perimetre_processus')
        .delete()
        .eq('perimetre_id', perimetreId);
      
      if (deleteError) throw deleteError;
      
      // Then, insert new associations
      if (selectedProcessus.length > 0) {
        const associations = selectedProcessus.map(processusCode => ({
          perimetre_id: perimetreId,
          processus_code: processusCode,
          organization_name: organizationName
        }));
        
        const { error: insertError } = await supabase
          .from('perimetre_processus')
          .insert(associations);
        
        if (insertError) throw insertError;
      }
      
      // Show success message
      setSuccess('Processus associés avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchPerimetreProcessus();
    } catch (err: any) {
      console.error('Error saving processus associations:', err);
      setError('Erreur lors de l\'enregistrement des associations de processus');
    } finally {
      setIsSaving(false);
    }
  };
  
  const resetForm = () => {
    setPerimetreName('');
    setPerimetreDescription('');
    setSelectedProcessus([]);
    setCurrentPerimetre(null);
    setIsEditing(false);
    setShowAddForm(false);
  };
  
  const togglePerimetreExpansion = (perimetreId: string) => {
    setExpandedPerimetres(prev => 
      prev.includes(perimetreId)
        ? prev.filter(id => id !== perimetreId)
        : [...prev, perimetreId]
    );
  };
  
  const getProcessusForPerimetre = (perimetreId: string) => {
    const processusCodes = perimetreProcessus
      .filter(pp => pp.perimetre_id === perimetreId)
      .map(pp => pp.processus_code);
    
    return processus.filter(p => processusCodes.includes(p.code));
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/gestion/contexte')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Retour</span>
              </button>
              
              <div className="h-6 w-px bg-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Périmètres</h1>
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
        {/* Success and Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-700">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Add Perimetre Button - Only visible for admin users */}
        {isAdmin && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => {
                resetForm();
                setShowAddForm(!showAddForm);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showAddForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              <span>{showAddForm ? 'Annuler' : 'Ajouter un périmètre'}</span>
            </button>
          </div>
        )}

        {/* Add/Edit Perimetre Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {isEditing ? 'Modifier le périmètre' : 'Ajouter un nouveau périmètre'}
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom du périmètre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={perimetreName}
                    onChange={(e) => setPerimetreName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Siège social, Usine principale, etc."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={perimetreDescription}
                    onChange={(e) => setPerimetreDescription(e.target.value)}
                    placeholder="Décrivez le périmètre..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Processus associés
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {processus.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">Aucun processus disponible</p>
                    ) : (
                      <div className="space-y-2">
                        {processus.map((proc) => (
                          <div 
                            key={proc.code}
                            className="flex items-center p-2 hover:bg-gray-50 rounded-lg"
                          >
                            <input
                              type="checkbox"
                              id={`processus-${proc.code}`}
                              checked={selectedProcessus.includes(proc.code)}
                              onChange={() => toggleProcessusSelection(proc.code)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label 
                              htmlFor={`processus-${proc.code}`}
                              className="ml-2 block text-sm text-gray-900 cursor-pointer"
                            >
                              <span className="font-medium">{proc.name}</span>
                              {proc.description && (
                                <p className="text-xs text-gray-500">{proc.description}</p>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !perimetreName.trim()}
                    className={`
                      px-4 py-2 rounded-lg text-white flex items-center
                      ${isSaving || !perimetreName.trim() 
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 transition-colors'
                      }
                    `}
                  >
                    {isSaving ? (
                      <>
                        <Loader className="w-5 h-5 mr-2 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        {isEditing ? 'Modifier' : 'Enregistrer'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Display Perimetres */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : perimetres.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun périmètre défini</h3>
            <p className="text-gray-500 mb-6">
              Vous n'avez pas encore défini de périmètres.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {perimetres.map((perimetre) => (
              <div 
                key={perimetre.id}
                className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
              >
                <div 
                  className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                  onClick={() => togglePerimetreExpansion(perimetre.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">{perimetre.name}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isAdmin && (
                      <div className="flex space-x-2 mr-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(perimetre);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(perimetre.id);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    {expandedPerimetres.includes(perimetre.id) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                {expandedPerimetres.includes(perimetre.id) && (
                  <div className="p-6">
                    {perimetre.description && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-gray-700 whitespace-pre-line">
                            {perimetre.description}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-700">Processus associés</h4>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              // Get current processus for this perimetre
                              const currentProcessus = perimetreProcessus
                                .filter(pp => pp.perimetre_id === perimetre.id)
                                .map(pp => pp.processus_code);
                              
                              setSelectedProcessus(currentProcessus);
                              
                              // Open modal or expand section for editing processus
                              // For now, we'll just save the current selection
                              handleSaveProcessus(perimetre.id);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            Gérer les processus
                          </button>
                        )}
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                        {getProcessusForPerimetre(perimetre.id).length === 0 ? (
                          <p className="text-gray-500 text-center py-2">Aucun processus associé</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {getProcessusForPerimetre(perimetre.id).map((proc) => (
                              <div 
                                key={proc.code}
                                className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm"
                              >
                                <div className="flex items-center space-x-2">
                                  <Layers className="w-4 h-4 text-blue-500" />
                                  <span className="font-medium text-gray-900">{proc.name}</span>
                                </div>
                                {proc.description && (
                                  <p className="text-xs text-gray-500 mt-1 ml-6">{proc.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 text-sm text-gray-500">
                      Ajouté le: {new Date(perimetre.created_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Information Box */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Définition des périmètres</h3>
              <p className="mt-2 text-sm text-blue-700">
                Les périmètres définissent les limites physiques et organisationnelles de votre système de management énergétique.
                Une définition claire des périmètres est essentielle pour délimiter le champ d'application de votre démarche énergétique.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerimetreDomainePage;