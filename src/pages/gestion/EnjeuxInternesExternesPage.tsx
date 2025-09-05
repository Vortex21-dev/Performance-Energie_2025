import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Compass,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Loader,
  ExternalLink,
  Home,
  Building2,
  FileText,
  TrendingUp,
  ShieldCheck,
  List
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface EnjeuxInternesExternes {
  id: string;
  organization_name: string;
  type: 'interne' | 'externe';
  description: string;
  created_at: string;
  updated_at: string;
  risques?: string;
  opportunites?: string;
}

interface ContextDescription {
  id: string;
  organization_name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

const EnjeuxInternesExternesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [enjeuxInternes, setEnjeuxInternes] = useState<EnjeuxInternesExternes[]>([]);
  const [enjeuxExternes, setEnjeuxExternes] = useState<EnjeuxInternesExternes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Check if user is admin or admin_client
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_client';
  const isAdminClient = user?.role === 'admin_client';
  
  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEnjeu, setNewEnjeu] = useState<{
    type: 'interne' | 'externe';
    description: string;
    risques?: string;
    opportunites?: string;
  }>({
    type: 'interne',
    description: '',
    risques: '',
    opportunites: ''
  });
  
  // Edit state
  const [editingEnjeu, setEditingEnjeu] = useState<EnjeuxInternesExternes | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editRisques, setEditRisques] = useState('');
  const [editOpportunites, setEditOpportunites] = useState('');
  const [activeTab, setActiveTab] = useState<'description' | 'risques' | 'opportunites'>('description');
  
  // Context state
  const [contextDescription, setContextDescription] = useState<ContextDescription | null>(null);
  const [editContextDescription, setEditContextDescription] = useState('');
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [isSavingContext, setIsSavingContext] = useState(false);
  
  useEffect(() => {
    fetchUserOrganization();
  }, [user]);
  
  useEffect(() => {
    if (organizationName) {
      fetchEnjeuxInternesExternes();
      fetchContextDescription();
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
  
  const fetchEnjeuxInternesExternes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('enjeux_internes_externes')
        .select('*')
        .eq('organization_name', organizationName)
        .in('type', ['interne', 'externe']);
      
      if (error) throw error;
      
      // Separate internal and external issues
      const internes = data?.filter(enjeu => enjeu.type === 'interne') || [];
      const externes = data?.filter(enjeu => enjeu.type === 'externe') || [];
      
      setEnjeuxInternes(internes);
      setEnjeuxExternes(externes);
    } catch (err: any) {
      console.error('Error fetching enjeux:', err);
      setError('Erreur lors du chargement des enjeux internes et externes');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchContextDescription = async () => {
    try {
      const { data, error } = await supabase
        .from('enjeux_internes_externes')
        .select('*')
        .eq('organization_name', organizationName)
        .eq('type', 'context')
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setContextDescription(data);
        setEditContextDescription(data.description || '');
      }
    } catch (err: any) {
      console.error('Error fetching context description:', err);
      // Don't show error to user for this operation
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEnjeu.description.trim() || !organizationName) {
      setError('Veuillez saisir une description');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const enjeuData = {
        organization_name: organizationName,
        type: newEnjeu.type,
        description: newEnjeu.description.trim(),
        risques: newEnjeu.risques?.trim() || null,
        opportunites: newEnjeu.opportunites?.trim() || null
      };
      
      const { error } = await supabase
        .from('enjeux_internes_externes')
        .insert([enjeuData]);
      
      if (error) throw error;
      
      // Reset form
      setNewEnjeu({
        type: 'interne',
        description: '',
        risques: '',
        opportunites: ''
      });
      
      // Hide form
      setShowAddForm(false);
      
      // Show success message
      setSuccess('Enjeu ajouté avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchEnjeuxInternesExternes();
    } catch (err: any) {
      console.error('Error adding enjeu:', err);
      setError('Erreur lors de l\'ajout de l\'enjeu');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEdit = (enjeu: EnjeuxInternesExternes) => {
    setEditingEnjeu(enjeu);
    setEditDescription(enjeu.description || '');
    setEditRisques(enjeu.risques || '');
    setEditOpportunites(enjeu.opportunites || '');
    setActiveTab('description');
  };
  
  const handleSaveEdit = async () => {
    if (!editingEnjeu || !editDescription.trim()) {
      setError('Veuillez saisir une description');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('enjeux_internes_externes')
        .update({ 
          description: editDescription.trim(),
          risques: editRisques.trim() || null,
          opportunites: editOpportunites.trim() || null
        })
        .eq('id', editingEnjeu.id);
      
      if (error) throw error;
      
      // Reset edit state
      setEditingEnjeu(null);
      setEditDescription('');
      setEditRisques('');
      setEditOpportunites('');
      
      // Show success message
      setSuccess('Enjeu modifié avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchEnjeuxInternesExternes();
    } catch (err: any) {
      console.error('Error updating enjeu:', err);
      setError('Erreur lors de la modification de l\'enjeu');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async (enjeu: EnjeuxInternesExternes) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet enjeu ?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('enjeux_internes_externes')
        .delete()
        .eq('id', enjeu.id);
      
      if (error) throw error;
      
      // Show success message
      setSuccess('Enjeu supprimé avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchEnjeuxInternesExternes();
    } catch (err: any) {
      console.error('Error deleting enjeu:', err);
      setError('Erreur lors de la suppression de l\'enjeu');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveContext = async () => {
    if (!organizationName) return;
    
    try {
      setIsSavingContext(true);
      setError(null);
      
      if (contextDescription) {
        // Update existing context
        const { error } = await supabase
          .from('enjeux_internes_externes')
          .update({ description: editContextDescription.trim() })
          .eq('id', contextDescription.id);
        
        if (error) throw error;
      } else {
        // Insert new context
        const { error } = await supabase
          .from('enjeux_internes_externes')
          .insert([{
            organization_name: organizationName,
            type: 'context',
            description: editContextDescription.trim()
          }]);
        
        if (error) throw error;
      }
      
      // Show success message
      setSuccess('Contexte enregistré avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data and reset state
      fetchContextDescription();
      setIsEditingContext(false);
    } catch (err: any) {
      console.error('Error saving context:', err);
      setError('Erreur lors de l\'enregistrement du contexte');
    } finally {
      setIsSavingContext(false);
    }
  };
  
  const cancelEdit = () => {
    setEditingEnjeu(null);
    setEditDescription('');
    setEditRisques('');
    setEditOpportunites('');
  };
  
  const cancelEditContext = () => {
    setIsEditingContext(false);
    setEditContextDescription(contextDescription?.description || '');
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
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Compass className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Analyse du contexte 
</h1>
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
            Identifiez et analysez les facteurs internes et externes qui influencent votre performance énergétique. 
            Cette analyse est essentielle pour comprendre le contexte dans lequel votre système de management énergétique opère.
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

        {/* Context Description Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Contexte </h2>
            </div>
            
            {isAdminClient && !isEditingContext && (
              <button
                onClick={() => setIsEditingContext(true)}
                className="px-3 py-1.5 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
              >
                {contextDescription ? 'Modifier' : 'Ajouter'}
              </button>
            )}
          </div>
          
          {isEditingContext ? (
            <div className="space-y-4">
              <textarea
                rows={6}
                value={editContextDescription}
                onChange={(e) => setEditContextDescription(e.target.value)}
                placeholder="Décrivez le contexte de l'analyse des enjeux internes et externes..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelEditContext}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveContext}
                  disabled={isSavingContext}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSavingContext
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                    }
                  `}
                >
                  {isSavingContext ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Enregistrer
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              {contextDescription ? (
                <p className="text-gray-700 whitespace-pre-line">{contextDescription.description}</p>
              ) : (
                <p className="text-gray-500 italic text-center">
                  {isAdminClient 
                    ? "Aucun contexte n'a été défini. Cliquez sur 'Ajouter' pour en créer un."
                    : "Aucun contexte n'a été défini pour cette analyse."}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Add New Enjeu Form - Only visible for admin users */}
        {isAdmin && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              {showAddForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              <span>{showAddForm ? 'Annuler' : 'Ajouter un enjeu'}</span>
            </button>
          </div>
        )}

        {showAddForm && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Ajouter un nouvel enjeu
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type d'enjeu
                    </label>
                    <div className="flex flex-col space-y-2">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="form-radio h-5 w-5 text-emerald-600"
                          name="type"
                          value="interne"
                          checked={newEnjeu.type === 'interne'}
                          onChange={() => setNewEnjeu({ ...newEnjeu, type: 'interne' })}
                        />
                        <span className="ml-2 text-gray-700">Interne</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="form-radio h-5 w-5 text-blue-600"
                          name="type"
                          value="externe"
                          checked={newEnjeu.type === 'externe'}
                          onChange={() => setNewEnjeu({ ...newEnjeu, type: 'externe' })}
                        />
                        <span className="ml-2 text-gray-700">Externe</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="md:col-span-3">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                          Description de l'enjeu
                        </label>
                        <textarea
                          id="description"
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          placeholder="Décrivez l'enjeu interne ou externe..."
                          value={newEnjeu.description}
                          onChange={(e) => setNewEnjeu({ ...newEnjeu, description: e.target.value })}
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="risques" className="block text-sm font-medium text-gray-700 mb-2">
                          Risques associés
                        </label>
                        <textarea
                          id="risques"
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          placeholder="Décrivez les risques associés à cet enjeu..."
                          value={newEnjeu.risques || ''}
                          onChange={(e) => setNewEnjeu({ ...newEnjeu, risques: e.target.value })}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="opportunites" className="block text-sm font-medium text-gray-700 mb-2">
                          Opportunités associées
                        </label>
                        <textarea
                          id="opportunites"
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          placeholder="Décrivez les opportunités associées à cet enjeu..."
                          value={newEnjeu.opportunites || ''}
                          onChange={(e) => setNewEnjeu({ ...newEnjeu, opportunites: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading || !newEnjeu.description.trim()}
                    className={`
                      flex items-center px-4 py-2 rounded-lg text-white
                      ${isLoading || !newEnjeu.description.trim()
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                      }
                      transition-colors
                    `}
                  >
                    {isLoading ? (
                      <>
                        <Loader className="w-5 h-5 mr-2 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 mr-2" />
                        Ajouter
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enjeux Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Enjeux Internes */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-emerald-100 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                      <Home className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-800">Enjeux Internes</h2>
                  </div>
                  <div className="bg-white px-3 py-1 rounded-full text-xs font-medium text-gray-600 shadow-sm">
                    {enjeuxInternes.length} enjeu{enjeuxInternes.length !== 1 ? 'x' : ''}
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {isLoading && enjeuxInternes.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <Loader className="w-8 h-8 animate-spin text-emerald-500" />
                  </div>
                ) : enjeuxInternes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Aucun enjeu interne n'a été ajouté.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {enjeuxInternes.map((enjeu) => (
                      <motion.div
                        key={enjeu.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`
                          p-4 rounded-lg border border-gray-200
                          ${editingEnjeu?.id === enjeu.id 
                            ? 'bg-emerald-50' 
                            : 'bg-white hover:bg-gray-50'
                          }
                          transition-colors
                        `}
                      >
                        {editingEnjeu?.id === enjeu.id ? (
                          <div className="space-y-3">
                            <div className="flex space-x-2 mb-4">
                              <button
                                onClick={() => setActiveTab('description')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                                  activeTab === 'description' 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                Description
                              </button>
                              <button
                                onClick={() => setActiveTab('risques')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                                  activeTab === 'risques' 
                                    ? 'bg-red-100 text-red-700' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                Risques
                              </button>
                              <button
                                onClick={() => setActiveTab('opportunites')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                                  activeTab === 'opportunites' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                Opportunités
                              </button>
                            </div>
                            
                            {activeTab === 'description' && (
                              <textarea
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                required
                                placeholder="Description de l'enjeu..."
                              />
                            )}
                            
                            {activeTab === 'risques' && (
                              <textarea
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                value={editRisques}
                                onChange={(e) => setEditRisques(e.target.value)}
                                placeholder="Risques associés à cet enjeu..."
                              />
                            )}
                            
                            {activeTab === 'opportunites' && (
                              <textarea
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={editOpportunites}
                                onChange={(e) => setEditOpportunites(e.target.value)}
                                placeholder="Opportunités associées à cet enjeu..."
                              />
                            )}
                            
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={cancelEdit}
                                className="flex items-center px-3 py-1.5 text-gray-600 hover:text-gray-800 transition-colors"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Annuler
                              </button>
                              <button
                                onClick={handleSaveEdit}
                                disabled={isLoading || !editDescription.trim()}
                                className={`
                                  flex items-center px-3 py-1.5 rounded-lg text-white
                                  ${isLoading || !editDescription.trim()
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                  }
                                  transition-colors
                                `}
                              >
                                <Save className="w-4 h-4 mr-1" />
                                Enregistrer
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between mb-3">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    const element = document.getElementById(`description-${enjeu.id}`);
                                    if (element) {
                                      element.scrollIntoView({ behavior: 'smooth' });
                                    }
                                  }}
                                  className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                                >
                                  Description
                                </button>
                                <button
                                  onClick={() => {
                                    const element = document.getElementById(`risques-${enjeu.id}`);
                                    if (element) {
                                      element.scrollIntoView({ behavior: 'smooth' });
                                    }
                                  }}
                                  className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                >
                                  Risques
                                </button>
                                <button
                                  onClick={() => {
                                    const element = document.getElementById(`opportunites-${enjeu.id}`);
                                    if (element) {
                                      element.scrollIntoView({ behavior: 'smooth' });
                                    }
                                  }}
                                  className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                >
                                  Opportunités
                                </button>
                              </div>
                              
                              {isAdmin && (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleEdit(enjeu)}
                                    className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(enjeu)}
                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            <div id={`description-${enjeu.id}`} className="mb-3">
                              <div className="flex items-center mb-2">
                                <FileText className="w-4 h-4 text-emerald-600 mr-2" />
                                <h3 className="text-sm font-medium text-emerald-800">Description</h3>
                              </div>
                              <p className="text-gray-700 whitespace-pre-line pl-6">{enjeu.description}</p>
                            </div>
                            
                            <div id={`risques-${enjeu.id}`} className="mb-3">
                              <div className="flex items-center mb-2">
                                <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                                <h3 className="text-sm font-medium text-red-800">Risques</h3>
                              </div>
                              <p className="text-gray-700 whitespace-pre-line pl-6">
                                {enjeu.risques || 'Aucun risque identifié'}
                              </p>
                            </div>
                            
                            <div id={`opportunites-${enjeu.id}`}>
                              <div className="flex items-center mb-2">
                                <TrendingUp className="w-4 h-4 text-blue-600 mr-2" />
                                <h3 className="text-sm font-medium text-blue-800">Opportunités</h3>
                              </div>
                              <p className="text-gray-700 whitespace-pre-line pl-6">
                                {enjeu.opportunites || 'Aucune opportunité identifiée'}
                              </p>
                            </div>
                            
                            <div className="mt-3 text-xs text-gray-500">
                              Créé le {new Date(enjeu.created_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </div>
                          </>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Enjeux Externes */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                      <ExternalLink className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-800">Enjeux Externes</h2>
                  </div>
                  <div className="bg-white px-3 py-1 rounded-full text-xs font-medium text-gray-600 shadow-sm">
                    {enjeuxExternes.length} enjeu{enjeuxExternes.length !== 1 ? 'x' : ''}
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {isLoading && enjeuxExternes.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <Loader className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : enjeuxExternes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Aucun enjeu externe n'a été ajouté.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {enjeuxExternes.map((enjeu) => (
                      <motion.div
                        key={enjeu.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`
                          p-4 rounded-lg border border-gray-200
                          ${editingEnjeu?.id === enjeu.id 
                            ? 'bg-blue-50' 
                            : 'bg-white hover:bg-gray-50'
                          }
                          transition-colors
                        `}
                      >
                        {editingEnjeu?.id === enjeu.id ? (
                          <div className="space-y-3">
                            <div className="flex space-x-2 mb-4">
                              <button
                                onClick={() => setActiveTab('description')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                                  activeTab === 'description' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                Description
                              </button>
                              <button
                                onClick={() => setActiveTab('risques')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                                  activeTab === 'risques' 
                                    ? 'bg-red-100 text-red-700' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                Risques
                              </button>
                              <button
                                onClick={() => setActiveTab('opportunites')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                                  activeTab === 'opportunites' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                Opportunités
                              </button>
                            </div>
                            
                            {activeTab === 'description' && (
                              <textarea
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                required
                                placeholder="Description de l'enjeu..."
                              />
                            )}
                            
                            {activeTab === 'risques' && (
                              <textarea
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                value={editRisques}
                                onChange={(e) => setEditRisques(e.target.value)}
                                placeholder="Risques associés à cet enjeu..."
                              />
                            )}
                            
                            {activeTab === 'opportunites' && (
                              <textarea
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={editOpportunites}
                                onChange={(e) => setEditOpportunites(e.target.value)}
                                placeholder="Opportunités associées à cet enjeu..."
                              />
                            )}
                            
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={cancelEdit}
                                className="flex items-center px-3 py-1.5 text-gray-600 hover:text-gray-800 transition-colors"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Annuler
                              </button>
                              <button
                                onClick={handleSaveEdit}
                                disabled={isLoading || !editDescription.trim()}
                                className={`
                                  flex items-center px-3 py-1.5 rounded-lg text-white
                                  ${isLoading || !editDescription.trim()
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                  }
                                  transition-colors
                                `}
                              >
                                <Save className="w-4 h-4 mr-1" />
                                Enregistrer
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between mb-3">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    const element = document.getElementById(`description-${enjeu.id}`);
                                    if (element) {
                                      element.scrollIntoView({ behavior: 'smooth' });
                                    }
                                  }}
                                  className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                >
                                  Description
                                </button>
                                <button
                                  onClick={() => {
                                    const element = document.getElementById(`risques-${enjeu.id}`);
                                    if (element) {
                                      element.scrollIntoView({ behavior: 'smooth' });
                                    }
                                  }}
                                  className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                >
                                  Risques
                                </button>
                                <button
                                  onClick={() => {
                                    const element = document.getElementById(`opportunites-${enjeu.id}`);
                                    if (element) {
                                      element.scrollIntoView({ behavior: 'smooth' });
                                    }
                                  }}
                                  className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                >
                                  Opportunités
                                </button>
                              </div>
                              
                              {isAdmin && (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleEdit(enjeu)}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(enjeu)}
                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            <div id={`description-${enjeu.id}`} className="mb-3">
                              <div className="flex items-center mb-2">
                                <FileText className="w-4 h-4 text-blue-600 mr-2" />
                                <h3 className="text-sm font-medium text-blue-800">Description</h3>
                              </div>
                              <p className="text-gray-700 whitespace-pre-line pl-6">{enjeu.description}</p>
                            </div>
                            
                            <div id={`risques-${enjeu.id}`} className="mb-3">
                              <div className="flex items-center mb-2">
                                <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                                <h3 className="text-sm font-medium text-red-800">Risques</h3>
                              </div>
                              <p className="text-gray-700 whitespace-pre-line pl-6">
                                {enjeu.risques || 'Aucun risque identifié'}
                              </p>
                            </div>
                            
                            <div id={`opportunites-${enjeu.id}`}>
                              <div className="flex items-center mb-2">
                                <TrendingUp className="w-4 h-4 text-blue-600 mr-2" />
                                <h3 className="text-sm font-medium text-blue-800">Opportunités</h3>
                              </div>
                              <p className="text-gray-700 whitespace-pre-line pl-6">
                                {enjeu.opportunites || 'Aucune opportunité identifiée'}
                              </p>
                            </div>
                            
                            <div className="mt-3 text-xs text-gray-500">
                              Créé le {new Date(enjeu.created_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </div>
                          </>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <List className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Résumé des enjeux</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <Home className="w-4 h-4 text-emerald-600 mr-2" />
                Enjeux internes ({enjeuxInternes.length})
              </h3>
              {enjeuxInternes.length > 0 ? (
                <ul className="space-y-2">
                  {enjeuxInternes.map((enjeu) => (
                    <li key={enjeu.id} className="text-gray-700 text-sm">
                      • {enjeu.description.length > 100 
                          ? enjeu.description.substring(0, 100) + '...' 
                          : enjeu.description}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">Aucun enjeu interne défini</p>
              )}
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <ExternalLink className="w-4 h-4 text-blue-600 mr-2" />
                Enjeux externes ({enjeuxExternes.length})
              </h3>
              {enjeuxExternes.length > 0 ? (
                <ul className="space-y-2">
                  {enjeuxExternes.map((enjeu) => (
                    <li key={enjeu.id} className="text-gray-700 text-sm">
                      • {enjeu.description.length > 100 
                          ? enjeu.description.substring(0, 100) + '...' 
                          : enjeu.description}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">Aucun enjeu externe défini</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnjeuxInternesExternesPage;