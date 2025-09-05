import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Database,
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
  Zap,
  Layers,
  Ruler,
  Clock,
  Gauge,
  BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Perimetre {
  id: string;
  organization_name: string;
  name: string;
  description: string | null;
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

interface Equipment {
  id: string;
  name: string;
  type: string;
}

interface DonneeEnergetique {
  id: string;
  organization_name: string;
  perimetre_id: string;
  processus_code: string;
  ipe_code: string | null;
  ue_id: string | null;
  valeur: number | null;
  unite: string | null;
  date_mesure: string;
  commentaire: string | null;
  created_at: string;
  updated_at: string;
  perimetre?: Perimetre;
  processus?: Processus;
  equipment?: Equipment;
}

const DonneesEnergetiquesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [perimetres, setPerimetres] = useState<Perimetre[]>([]);
  const [processus, setProcessus] = useState<Processus[]>([]);
  const [perimetreProcessus, setPerimetreProcessus] = useState<PerimetreProcessus[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [donneesEnergetiques, setDonneesEnergetiques] = useState<DonneeEnergetique[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDonnee, setCurrentDonnee] = useState<DonneeEnergetique | null>(null);
  const [formData, setFormData] = useState({
    perimetre_id: '',
    processus_code: '',
    ue_id: '',
    ipe_code: '',
    donnee_a_mesurer: '',
    point_de_mesure: '',
    equipement_de_mesure: '',
    duree_frequence: '',
    valeur: '',
    unite: '',
    date_mesure: new Date().toISOString().split('T')[0],
    commentaire: ''
  });
  
  // Filter state
  const [perimetreFilter, setPerimetreFilter] = useState<string>('all');
  const [processusFilter, setProcessusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
      fetchEquipments();
      fetchDonneesEnergetiques();
    }
  }, [organizationName]);
  
  useEffect(() => {
    // When a perimetre is selected, filter available processus
    if (formData.perimetre_id) {
      const availableProcessusCodes = perimetreProcessus
        .filter(pp => pp.perimetre_id === formData.perimetre_id)
        .map(pp => pp.processus_code);
      
      if (availableProcessusCodes.length > 0 && !availableProcessusCodes.includes(formData.processus_code)) {
        // Reset processus selection if current selection is not valid for this perimetre
        setFormData(prev => ({
          ...prev,
          processus_code: ''
        }));
      }
    }
  }, [formData.perimetre_id, perimetreProcessus]);
  
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
      const { data, error } = await supabase
        .from('perimetre_domaine')
        .select('*')
        .eq('organization_name', organizationName)
        .order('name');
      
      if (error) throw error;
      
      setPerimetres(data || []);
    } catch (err: any) {
      console.error('Error fetching perimetres:', err);
      setError('Erreur lors du chargement des périmètres');
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
  
  const fetchEquipments = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('id, name, type')
        .eq('organization_name', organizationName)
        .order('name');
      
      if (error) throw error;
      
      setEquipments(data || []);
    } catch (err: any) {
      console.error('Error fetching equipments:', err);
      setError('Erreur lors du chargement des équipements');
    }
  };
  
  const fetchDonneesEnergetiques = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('donnees_energetiques')
        .select(`
          *,
          perimetre:perimetre_id(id, name),
          processus:processus_code(code, name),
          equipment:ue_id(id, name, type)
        `)
        .eq('organization_name', organizationName)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setDonneesEnergetiques(data || []);
    } catch (err: any) {
      console.error('Error fetching donnees energetiques:', err);
      setError('Erreur lors du chargement des données énergétiques');
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
      
      const donneeData = {
        organization_name: organizationName,
        perimetre_id: formData.perimetre_id,
        processus_code: formData.processus_code,
        ue_id: formData.ue_id || null,
        ipe_code: formData.ipe_code || null,
        valeur: formData.valeur ? parseFloat(formData.valeur) : null,
        unite: formData.unite || null,
        date_mesure: formData.date_mesure,
        commentaire: formData.commentaire || null
      };
      
      let result;
      
      if (isEditing && currentDonnee) {
        // Update existing record
        result = await supabase
          .from('donnees_energetiques')
          .update(donneeData)
          .eq('id', currentDonnee.id);
      } else {
        // Insert new record
        result = await supabase
          .from('donnees_energetiques')
          .insert([donneeData]);
      }
      
      if (result.error) throw result.error;
      
      // Reset form and close modal
      resetForm();
      setShowModal(false);
      
      // Show success message
      setSuccess(isEditing 
        ? 'Donnée énergétique modifiée avec succès' 
        : 'Donnée énergétique ajoutée avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchDonneesEnergetiques();
    } catch (err: any) {
      console.error('Error saving donnee energetique:', err);
      setError('Erreur lors de l\'enregistrement de la donnée énergétique');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEdit = (donnee: DonneeEnergetique) => {
    setCurrentDonnee(donnee);
    setFormData({
      perimetre_id: donnee.perimetre_id,
      processus_code: donnee.processus_code,
      ue_id: donnee.ue_id || '',
      ipe_code: donnee.ipe_code || '',
      donnee_a_mesurer: '', // These fields are not stored in the database
      point_de_mesure: '',
      equipement_de_mesure: '',
      duree_frequence: '',
      valeur: donnee.valeur?.toString() || '',
      unite: donnee.unite || '',
      date_mesure: donnee.date_mesure ? new Date(donnee.date_mesure).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      commentaire: donnee.commentaire || ''
    });
    setIsEditing(true);
    setShowModal(true);
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette donnée énergétique ?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('donnees_energetiques')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Show success message
      setSuccess('Donnée énergétique supprimée avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchDonneesEnergetiques();
    } catch (err: any) {
      console.error('Error deleting donnee energetique:', err);
      setError('Erreur lors de la suppression de la donnée énergétique');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      perimetre_id: '',
      processus_code: '',
      ue_id: '',
      ipe_code: '',
      donnee_a_mesurer: '',
      point_de_mesure: '',
      equipement_de_mesure: '',
      duree_frequence: '',
      valeur: '',
      unite: '',
      date_mesure: new Date().toISOString().split('T')[0],
      commentaire: ''
    });
    setCurrentDonnee(null);
    setIsEditing(false);
  };
  
  const getProcessusForPerimetre = (perimetreId: string) => {
    const processusCodes = perimetreProcessus
      .filter(pp => pp.perimetre_id === perimetreId)
      .map(pp => pp.processus_code);
    
    return processus.filter(p => processusCodes.includes(p.code));
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const filteredDonnees = donneesEnergetiques.filter(donnee => {
    // Apply perimetre filter
    if (perimetreFilter !== 'all' && donnee.perimetre_id !== perimetreFilter) {
      return false;
    }
    
    // Apply processus filter
    if (processusFilter !== 'all' && donnee.processus_code !== processusFilter) {
      return false;
    }
    
    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        (donnee.perimetre?.name?.toLowerCase().includes(searchLower) || false) ||
        (donnee.processus?.name?.toLowerCase().includes(searchLower) || false) ||
        (donnee.equipment?.name?.toLowerCase().includes(searchLower) || false) ||
        (donnee.commentaire?.toLowerCase().includes(searchLower) || false)
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
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Données Énergétiques</h1>
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
            Gérez les données énergétiques de votre organisation. Associez les périmètres, processus et usages énergétiques
            pour suivre et analyser votre consommation d'énergie.
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
                  value={perimetreFilter}
                  onChange={(e) => setPerimetreFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tous les périmètres</option>
                  {perimetres.map((perimetre) => (
                    <option key={perimetre.id} value={perimetre.id}>
                      {perimetre.name}
                    </option>
                  ))}
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <div className="relative">
                <select
                  value={processusFilter}
                  onChange={(e) => setProcessusFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tous les processus</option>
                  {processus.map((proc) => (
                    <option key={proc.code} value={proc.code}>
                      {proc.name}
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
                <span>Ajouter une donnée</span>
              </button>
            )}
          </div>
        </div>

        {/* Données Énergétiques Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Données Énergétiques</h2>
            </div>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : filteredDonnees.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucune donnée énergétique trouvée. {isAdmin ? "Ajoutez des données pour commencer." : ""}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Périmètre
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Processus
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usage Énergétique
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valeur
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date de mesure
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commentaire
                      </th>
                      {isAdmin && (
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDonnees.map((donnee) => (
                      <tr key={donnee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100">
                              <Layers className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{donnee.perimetre?.name || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{donnee.processus?.name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{donnee.processus_code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-amber-100">
                              <Zap className="h-4 w-4 text-amber-600" />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm text-gray-900">{donnee.equipment?.name || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{donnee.equipment?.type || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {donnee.valeur !== null ? donnee.valeur : 'N/A'} {donnee.unite || ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(donnee.date_mesure)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">{donnee.commentaire || '-'}</div>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleEdit(donnee)}
                                className="text-indigo-600 hover:text-indigo-900 transition-colors"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(donnee.id)}
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
              {isEditing ? 'Modifier la donnée énergétique' : 'Ajouter une donnée énergétique'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="perimetre_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Périmètre <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="perimetre_id"
                    name="perimetre_id"
                    value={formData.perimetre_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionnez un périmètre</option>
                    {perimetres.map((perimetre) => (
                      <option key={perimetre.id} value={perimetre.id}>
                        {perimetre.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="processus_code" className="block text-sm font-medium text-gray-700 mb-1">
                    Processus <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="processus_code"
                    name="processus_code"
                    value={formData.processus_code}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={!formData.perimetre_id}
                  >
                    <option value="">Sélectionnez un processus</option>
                    {formData.perimetre_id && getProcessusForPerimetre(formData.perimetre_id).map((proc) => (
                      <option key={proc.code} value={proc.code}>
                        {proc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="ue_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Usage Énergétique
                  </label>
                  <select
                    id="ue_id"
                    name="ue_id"
                    value={formData.ue_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionnez un usage énergétique</option>
                    {equipments.map((equipment) => (
                      <option key={equipment.id} value={equipment.id}>
                        {equipment.name} ({equipment.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="ipe_code" className="block text-sm font-medium text-gray-700 mb-1">
                    Indicateur de Performance Énergétique
                  </label>
                  <input
                    type="text"
                    id="ipe_code"
                    name="ipe_code"
                    value={formData.ipe_code}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Code de l'IPE"
                  />
                </div>

                <div>
                  <label htmlFor="donnee_a_mesurer" className="block text-sm font-medium text-gray-700 mb-1">
                    Donnée à mesurer
                  </label>
                  <input
                    type="text"
                    id="donnee_a_mesurer"
                    name="donnee_a_mesurer"
                    value={formData.donnee_a_mesurer}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Consommation électrique"
                  />
                </div>

                <div>
                  <label htmlFor="point_de_mesure" className="block text-sm font-medium text-gray-700 mb-1">
                    Point de mesure
                  </label>
                  <input
                    type="text"
                    id="point_de_mesure"
                    name="point_de_mesure"
                    value={formData.point_de_mesure}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Compteur principal"
                  />
                </div>

                <div>
                  <label htmlFor="equipement_de_mesure" className="block text-sm font-medium text-gray-700 mb-1">
                    Équipement de mesure
                  </label>
                  <input
                    type="text"
                    id="equipement_de_mesure"
                    name="equipement_de_mesure"
                    value={formData.equipement_de_mesure}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Wattmètre"
                  />
                </div>

                <div>
                  <label htmlFor="duree_frequence" className="block text-sm font-medium text-gray-700 mb-1">
                    Durée / Fréquence de mesure
                  </label>
                  <input
                    type="text"
                    id="duree_frequence"
                    name="duree_frequence"
                    value={formData.duree_frequence}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Mensuel, Continu"
                  />
                </div>

                <div>
                  <label htmlFor="valeur" className="block text-sm font-medium text-gray-700 mb-1">
                    Valeur <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="valeur"
                    name="valeur"
                    value={formData.valeur}
                    onChange={handleInputChange}
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="unite" className="block text-sm font-medium text-gray-700 mb-1">
                    Unité <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="unite"
                    name="unite"
                    value={formData.unite}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: kWh, m³"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="date_mesure" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de mesure <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="date_mesure"
                    name="date_mesure"
                    value={formData.date_mesure}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="commentaire" className="block text-sm font-medium text-gray-700 mb-1">
                    Commentaire
                  </label>
                  <textarea
                    id="commentaire"
                    name="commentaire"
                    value={formData.commentaire}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Commentaires ou observations supplémentaires..."
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
                  disabled={isSubmitting || !formData.perimetre_id || !formData.processus_code || !formData.valeur || !formData.unite || !formData.date_mesure}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmitting || !formData.perimetre_id || !formData.processus_code || !formData.valeur || !formData.unite || !formData.date_mesure
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

export default DonneesEnergetiquesPage;