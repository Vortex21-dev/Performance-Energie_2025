import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  FileText,
  Save,
  Plus,
  Trash2,
  Edit2,
  X,
  AlertTriangle,
  CheckCircle,
  Loader,
  Building2,
  FileSpreadsheet,
  BarChart3,
  Target,
  ListChecks,
  ArrowRightLeft,
  Search,
  Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Processus {
  code: string;
  name: string;
  description: string | null;
}

interface ProcessusDocument {
  id: string;
  organization_name: string;
  processus_code: string;
  donnees_entree: string | null;
  donnees_sortie: string | null;
  objectifs: string | null;
  activites: string | null;
  usages_energetiques: string[] | null;
  created_at: string;
  updated_at: string;
  processus?: Processus;
}

interface Indicator {
  code: string;
  name: string;
  description: string | null;
  unit: string | null;
  processus_code: string;
}

const ProcessusSystemeDocumentairePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [processusList, setProcessusList] = useState<Processus[]>([]);
  const [processusDocuments, setProcessusDocuments] = useState<ProcessusDocument[]>([]);
  const [indicators, setIndicators] = useState<Record<string, Indicator[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProcessusDoc, setCurrentProcessusDoc] = useState<ProcessusDocument | null>(null);
  const [formData, setFormData] = useState({
    processus_code: '',
    donnees_entree: '',
    donnees_sortie: '',
    objectifs: '',
    activites: '',
    usages_energetiques: [] as string[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // UI state
  const [activeTab, setActiveTab] = useState<Record<string, 'donnees' | 'objectifs' | 'activites' | 'indicateurs' | 'usages'>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [processusFilter, setProcessusFilter] = useState<string>('all');
  
  // UE options
  const usageOptions = [
    'Climatisation',
    'Éclairages',
    'Bureautique et équipements connectés',
    'Groupe froid',
    'Groupe électrogène',
    'Vehicule',
    'Engins'
  ];
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_client';
  
  useEffect(() => {
    fetchUserOrganization();
  }, [user]);
  
  useEffect(() => {
    if (organizationName) {
      fetchProcessusList();
      fetchProcessusDocuments();
    }
  }, [organizationName]);
  
  useEffect(() => {
    if (processusDocuments.length > 0) {
      fetchIndicators();
    }
  }, [processusDocuments]);
  
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
  
  const fetchProcessusList = async () => {
    try {
      const { data, error } = await supabase
        .from('processus')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      setProcessusList(data || []);
    } catch (err: any) {
      console.error('Error fetching processus list:', err);
      setError('Erreur lors du chargement de la liste des processus');
    }
  };
  
  const fetchProcessusDocuments = async () => {
    try {
      setIsLoading(true);
      
      if (!organizationName) {
        setProcessusDocuments([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('processus_documents')
        .select(`
          *,
          processus:processus(*)
        `)
        .eq('organization_name', organizationName)
        .order('created_at');
      
      if (error) throw error;
      
      setProcessusDocuments(data || []);
      
      // Initialize active tabs
      const tabs: Record<string, 'donnees' | 'objectifs' | 'activites' | 'indicateurs' | 'usages'> = {};
      data?.forEach(doc => {
        tabs[doc.processus_code] = 'donnees';
      });
      setActiveTab(tabs);
    } catch (err: any) {
      console.error('Error fetching processus documents:', err);
      setError('Erreur lors du chargement des documents de processus');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchIndicators = async () => {
    try {
      const processusCodes = processusDocuments.map(doc => doc.processus_code);
      
      if (processusCodes.length === 0) {
        setIndicators({});
        return;
      }
      
      const { data, error } = await supabase
        .from('indicators')
        .select('*')
        .in('processus_code', processusCodes);
      
      if (error) throw error;
      
      // Group indicators by processus_code
      const groupedIndicators: Record<string, Indicator[]> = {};
      data?.forEach(indicator => {
        if (!groupedIndicators[indicator.processus_code]) {
          groupedIndicators[indicator.processus_code] = [];
        }
        groupedIndicators[indicator.processus_code].push(indicator);
      });
      
      setIndicators(groupedIndicators);
    } catch (err: any) {
      console.error('Error fetching indicators:', err);
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
  
  const handleUsageChange = (usage: string) => {
    setFormData(prev => {
      const usages = [...prev.usages_energetiques];
      if (usages.includes(usage)) {
        return {
          ...prev,
          usages_energetiques: usages.filter(u => u !== usage)
        };
      } else {
        return {
          ...prev,
          usages_energetiques: [...usages, usage]
        };
      }
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organizationName || !formData.processus_code) {
      setError('Veuillez sélectionner un processus');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const processusDocData = {
        organization_name: organizationName,
        processus_code: formData.processus_code,
        donnees_entree: formData.donnees_entree || null,
        donnees_sortie: formData.donnees_sortie || null,
        objectifs: formData.objectifs || null,
        activites: formData.activites || null,
        usages_energetiques: formData.usages_energetiques.length > 0 ? formData.usages_energetiques : null
      };
      
      let result;
      
      if (isEditing && currentProcessusDoc) {
        // Update existing record
        result = await supabase
          .from('processus_documents')
          .update(processusDocData)
          .eq('id', currentProcessusDoc.id);
      } else {
        // Check if document already exists for this processus
        const { data: existingDoc } = await supabase
          .from('processus_documents')
          .select('id')
          .eq('organization_name', organizationName)
          .eq('processus_code', formData.processus_code)
          .maybeSingle();
        
        if (existingDoc) {
          // Update existing record
          result = await supabase
            .from('processus_documents')
            .update(processusDocData)
            .eq('id', existingDoc.id);
        } else {
          // Insert new record
          result = await supabase
            .from('processus_documents')
            .insert([processusDocData]);
        }
      }
      
      if (result.error) throw result.error;
      
      // Reset form and close modal
      resetForm();
      setShowModal(false);
      
      // Show success message
      setSuccess(isEditing 
        ? 'Document de processus modifié avec succès' 
        : 'Document de processus ajouté avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchProcessusDocuments();
    } catch (err: any) {
      console.error('Error saving processus document:', err);
      setError('Erreur lors de l\'enregistrement du document de processus');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEdit = (processusDoc: ProcessusDocument) => {
    setCurrentProcessusDoc(processusDoc);
    setFormData({
      processus_code: processusDoc.processus_code,
      donnees_entree: processusDoc.donnees_entree || '',
      donnees_sortie: processusDoc.donnees_sortie || '',
      objectifs: processusDoc.objectifs || '',
      activites: processusDoc.activites || '',
      usages_energetiques: processusDoc.usages_energetiques || []
    });
    setIsEditing(true);
    setShowModal(true);
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document de processus ?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('processus_documents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Show success message
      setSuccess('Document de processus supprimé avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchProcessusDocuments();
    } catch (err: any) {
      console.error('Error deleting processus document:', err);
      setError('Erreur lors de la suppression du document de processus');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      processus_code: '',
      donnees_entree: '',
      donnees_sortie: '',
      objectifs: '',
      activites: '',
      usages_energetiques: []
    });
    setCurrentProcessusDoc(null);
    setIsEditing(false);
  };
  
  const handleTabChange = (processusCode: string, tab: 'donnees' | 'objectifs' | 'activites' | 'indicateurs' | 'usages') => {
    setActiveTab(prev => ({
      ...prev,
      [processusCode]: tab
    }));
  };
  
  const filteredProcessusDocuments = processusDocuments.filter(doc => {
    // Apply processus filter
    if (processusFilter !== 'all' && doc.processus_code !== processusFilter) {
      return false;
    }
    
    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        doc.processus?.name.toLowerCase().includes(searchLower) ||
        (doc.donnees_entree && doc.donnees_entree.toLowerCase().includes(searchLower)) ||
        (doc.donnees_sortie && doc.donnees_sortie.toLowerCase().includes(searchLower)) ||
        (doc.objectifs && doc.objectifs.toLowerCase().includes(searchLower)) ||
        (doc.activites && doc.activites.toLowerCase().includes(searchLower))
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
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Processus et Système Documentaire</h1>
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
              <span className="text-blue-800 font-medium">Système</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl">
            Documentez vos processus énergétiques en définissant les données d'entrée, les données de sortie, 
            les objectifs et les activités pour chaque processus. Cette documentation est essentielle pour 
            assurer la cohérence et l'efficacité de votre système de management énergétique.
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

        {/* Filters and Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <select
                  value={processusFilter}
                  onChange={(e) => setProcessusFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tous les processus</option>
                  {processusList.map((processus) => (
                    <option key={processus.code} value={processus.code}>
                      {processus.name}
                    </option>
                  ))}
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
                <span>Ajouter un document</span>
              </button>
            )}
          </div>
        </div>

        {/* Processus Documents List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredProcessusDocuments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun document de processus</h3>
            <p className="text-gray-500 mb-6">
              Vous n'avez pas encore créé de documentation pour vos processus.
            </p>
            {isAdmin && (
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter maintenant
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {filteredProcessusDocuments.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{doc.processus?.name || doc.processus_code}</h3>
                        <p className="text-sm text-gray-600">{doc.processus?.description}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(doc)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="border-b border-gray-200">
                  <div className="flex overflow-x-auto">
                    <button
                      onClick={() => handleTabChange(doc.processus_code, 'donnees')}
                      className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                        activeTab[doc.processus_code] === 'donnees'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                      }`}
                    >
                      Données d'entrée/sortie
                    </button>
                    <button
                      onClick={() => handleTabChange(doc.processus_code, 'objectifs')}
                      className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                        activeTab[doc.processus_code] === 'objectifs'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                      }`}
                    >
                      Objectifs
                    </button>
                    <button
                      onClick={() => handleTabChange(doc.processus_code, 'activites')}
                      className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                        activeTab[doc.processus_code] === 'activites'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                      }`}
                    >
                      Activités
                    </button>
                    <button
                      onClick={() => handleTabChange(doc.processus_code, 'indicateurs')}
                      className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                        activeTab[doc.processus_code] === 'indicateurs'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                      }`}
                    >
                      Indicateurs
                    </button>
                    <button
                      onClick={() => handleTabChange(doc.processus_code, 'usages')}
                      className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                        activeTab[doc.processus_code] === 'usages'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                      }`}
                    >
                      Usages Énergétiques
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  {activeTab[doc.processus_code] === 'donnees' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center space-x-2 mb-3">
                          <ArrowRightLeft className="w-5 h-5 text-blue-600 transform -rotate-90" />
                          <h4 className="font-medium text-gray-900">Données d'entrée</h4>
                        </div>
                        <p className="text-gray-700 whitespace-pre-line">{doc.donnees_entree || 'Non spécifié'}</p>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center space-x-2 mb-3">
                          <ArrowRightLeft className="w-5 h-5 text-green-600 transform rotate-90" />
                          <h4 className="font-medium text-gray-900">Données de sortie</h4>
                        </div>
                        <p className="text-gray-700 whitespace-pre-line">{doc.donnees_sortie || 'Non spécifié'}</p>
                      </div>
                    </div>
                  )}
                  
                  {activeTab[doc.processus_code] === 'objectifs' && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <Target className="w-5 h-5 text-indigo-600" />
                        <h4 className="font-medium text-gray-900">Objectifs du processus</h4>
                      </div>
                      <p className="text-gray-700 whitespace-pre-line">{doc.objectifs || 'Aucun objectif défini'}</p>
                    </div>
                  )}
                  
                  {activeTab[doc.processus_code] === 'activites' && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <ListChecks className="w-5 h-5 text-purple-600" />
                        <h4 className="font-medium text-gray-900">Activités du processus</h4>
                      </div>
                      <p className="text-gray-700 whitespace-pre-line">{doc.activites || 'Aucune activité définie'}</p>
                    </div>
                  )}
                  
                  {activeTab[doc.processus_code] === 'indicateurs' && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <BarChart3 className="w-5 h-5 text-amber-600" />
                        <h4 className="font-medium text-gray-900">Indicateurs associés</h4>
                      </div>
                      
                      {indicators[doc.processus_code] && indicators[doc.processus_code].length > 0 ? (
                        <div className="space-y-3">
                          {indicators[doc.processus_code].map((indicator) => (
                            <div key={indicator.code} className="bg-white p-3 rounded-lg border border-gray-200">
                              <div className="flex justify-between">
                                <div>
                                  <h5 className="font-medium text-gray-900">{indicator.name}</h5>
                                  {indicator.description && (
                                    <p className="text-sm text-gray-600">{indicator.description}</p>
                                  )}
                                </div>
                                {indicator.unit && (
                                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    Unité: {indicator.unit}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">Aucun indicateur associé à ce processus</p>
                      )}
                    </div>
                  )}
                  
                  {activeTab[doc.processus_code] === 'usages' && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <h4 className="font-medium text-gray-900">Usages Énergétiques</h4>
                      </div>
                      
                      {doc.usages_energetiques && doc.usages_energetiques.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {doc.usages_energetiques.map((usage, index) => (
                            <span 
                              key={index} 
                              className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                            >
                              {usage}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">Aucun usage énergétique associé à ce processus</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Processus Document Modal */}
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
              {isEditing ? 'Modifier le document de processus' : 'Ajouter un document de processus'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="processus_code" className="block text-sm font-medium text-gray-700 mb-2">
                  Processus <span className="text-red-500">*</span>
                </label>
                <select
                  id="processus_code"
                  name="processus_code"
                  value={formData.processus_code}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isEditing}
                >
                  <option value="">Sélectionnez un processus</option>
                  {processusList.map((processus) => (
                    <option key={processus.code} value={processus.code}>
                      {processus.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="donnees_entree" className="block text-sm font-medium text-gray-700 mb-2">
                  Données d'entrée
                </label>
                <textarea
                  id="donnees_entree"
                  name="donnees_entree"
                  value={formData.donnees_entree}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Décrivez les données d'entrée du processus..."
                />
              </div>

              <div>
                <label htmlFor="donnees_sortie" className="block text-sm font-medium text-gray-700 mb-2">
                  Données de sortie
                </label>
                <textarea
                  id="donnees_sortie"
                  name="donnees_sortie"
                  value={formData.donnees_sortie}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Décrivez les données de sortie du processus..."
                />
              </div>

              <div>
                <label htmlFor="objectifs" className="block text-sm font-medium text-gray-700 mb-2">
                  Objectifs
                </label>
                <textarea
                  id="objectifs"
                  name="objectifs"
                  value={formData.objectifs}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Décrivez les objectifs du processus..."
                />
              </div>

              <div>
                <label htmlFor="activites" className="block text-sm font-medium text-gray-700 mb-2">
                  Activités
                </label>
                <textarea
                  id="activites"
                  name="activites"
                  value={formData.activites}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Décrivez les activités du processus..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usages Énergétiques
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {usageOptions.map((usage) => (
                    <div 
                      key={usage}
                      className={`
                        flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                        ${formData.usages_energetiques.includes(usage)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                        }
                      `}
                      onClick={() => handleUsageChange(usage)}
                    >
                      <input
                        type="checkbox"
                        checked={formData.usages_energetiques.includes(usage)}
                        onChange={() => {}}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{usage}</span>
                    </div>
                  ))}
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
                  disabled={isSubmitting || !formData.processus_code}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmitting || !formData.processus_code
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

export default ProcessusSystemeDocumentairePage;