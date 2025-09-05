import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Users,
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
  Filter,
  UserPlus,
  User,
  Building,
  Globe,
  Briefcase,
  ShieldCheck,
  Truck,
  HelpCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface PartieInteressee {
  id: string;
  organization_name: string;
  nom: string;
  type: 'interne' | 'externe';
  categorie: string;
  attentes: string;
  influence: 'faible' | 'moyenne' | 'forte';
  created_at: string;
  updated_at: string;
}

const PartiesInteresseesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [partiesInteressees, setPartiesInteressees] = useState<PartieInteressee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_client';
  
  // Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPartie, setCurrentPartie] = useState<PartieInteressee | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    type: 'externe' as 'interne' | 'externe',
    categorie: '',
    attentes: '',
    influence: 'moyenne' as 'faible' | 'moyenne' | 'forte'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [influenceFilter, setInfluenceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  useEffect(() => {
    fetchUserOrganization();
  }, [user]);
  
  useEffect(() => {
    if (organizationName) {
      fetchPartiesInteressees();
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
  
  const fetchPartiesInteressees = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('parties_interessees')
        .select('*')
        .eq('organization_name', organizationName)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setPartiesInteressees(data || []);
    } catch (err: any) {
      console.error('Error fetching parties interessees:', err);
      setError('Erreur lors du chargement des parties intéressées');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      
      const partieData = {
        organization_name: organizationName,
        nom: formData.nom,
        type: formData.type,
        categorie: formData.categorie,
        attentes: formData.attentes,
        influence: formData.influence
      };
      
      let result;
      
      if (isEditing && currentPartie) {
        // Update existing record
        result = await supabase
          .from('parties_interessees')
          .update(partieData)
          .eq('id', currentPartie.id);
      } else {
        // Insert new record
        result = await supabase
          .from('parties_interessees')
          .insert([partieData]);
      }
      
      if (result.error) throw result.error;
      
      // Reset form and close modal
      resetForm();
      setShowModal(false);
      
      // Show success message
      setSuccess(isEditing 
        ? 'Partie intéressée modifiée avec succès' 
        : 'Partie intéressée ajoutée avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchPartiesInteressees();
    } catch (err: any) {
      console.error('Error saving partie interessee:', err);
      setError('Erreur lors de l\'enregistrement de la partie intéressée');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEdit = (partie: PartieInteressee) => {
    setCurrentPartie(partie);
    setFormData({
      nom: partie.nom,
      type: partie.type,
      categorie: partie.categorie,
      attentes: partie.attentes,
      influence: partie.influence
    });
    setIsEditing(true);
    setShowModal(true);
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette partie intéressée ?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('parties_interessees')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Show success message
      setSuccess('Partie intéressée supprimée avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchPartiesInteressees();
    } catch (err: any) {
      console.error('Error deleting partie interessee:', err);
      setError('Erreur lors de la suppression de la partie intéressée');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      nom: '',
      type: 'externe',
      categorie: '',
      attentes: '',
      influence: 'moyenne'
    });
    setCurrentPartie(null);
    setIsEditing(false);
  };
  
  const getTypeIcon = (type: string, categorie: string) => {
    // Map issue names to appropriate icons based on their content
    if (type === 'interne') {
      if (categorie.toLowerCase().includes('employe') || categorie.toLowerCase().includes('employé')) {
        return <User className="w-5 h-5 text-blue-600" />;
      } else if (categorie.toLowerCase().includes('direction')) {
        return <Briefcase className="w-5 h-5 text-purple-600" />;
      } else {
        return <Building className="w-5 h-5 text-indigo-600" />;
      }
    } else {
      if (categorie.toLowerCase().includes('client')) {
        return <Users className="w-5 h-5 text-green-600" />;
      } else if (categorie.toLowerCase().includes('fournisseur')) {
        return <Truck className="w-5 h-5 text-amber-600" />;
      } else if (categorie.toLowerCase().includes('autorite') || categorie.toLowerCase().includes('autorité')) {
        return <ShieldCheck className="w-5 h-5 text-red-600" />;
      } else {
        return <Globe className="w-5 h-5 text-teal-600" />;
      }
    }
  };
  
  const getInfluenceBadge = (influence: string) => {
    switch (influence) {
      case 'faible':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            Faible
          </span>
        );
      case 'moyenne':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            Moyenne
          </span>
        );
      case 'forte':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            Forte
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            {influence}
          </span>
        );
    }
  };
  
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'interne':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
            Interne
          </span>
        );
      case 'externe':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-teal-100 text-teal-800">
            Externe
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
  
  const filteredParties = partiesInteressees.filter(partie => {
    // Apply type filter
    if (typeFilter !== 'all' && partie.type !== typeFilter) {
      return false;
    }
    
    // Apply influence filter
    if (influenceFilter !== 'all' && partie.influence !== influenceFilter) {
      return false;
    }
    
    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        partie.nom.toLowerCase().includes(searchLower) ||
        partie.categorie.toLowerCase().includes(searchLower) ||
        partie.attentes.toLowerCase().includes(searchLower)
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
                onClick={() => navigate('/gestion/contexte')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Retour</span>
              </button>
              
              <div className="h-6 w-px bg-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Analyse Parties intéressées et leurs attentes</h1>
                  {organizationName && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4" />
                      <span>{organizationName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-800 font-medium">Contexte</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl">
            Identifiez et analysez les parties intéressées (stakeholders) qui ont un impact sur votre système de management énergétique 
            ou qui sont affectées par celui-ci. Définissez leurs attentes et évaluez leur niveau d'influence pour mieux 
            répondre à leurs besoins dans votre démarche énergétique.
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
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="all">Tous les types</option>
                  <option value="interne">Interne</option>
                  <option value="externe">Externe</option>
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <div className="relative">
                <select
                  value={influenceFilter}
                  onChange={(e) => setInfluenceFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="all">Toutes les influences</option>
                  <option value="faible">Faible</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="forte">Forte</option>
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                <span>Ajouter une partie intéressée</span>
              </button>
            )}
          </div>
        </div>

        {/* Parties Intéressées Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-indigo-50">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Liste des parties intéressées</h2>
            </div>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : filteredParties.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucune partie intéressée trouvée. {isAdmin ? "Ajoutez des parties intéressées pour commencer." : ""}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Partie intéressée
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Catégorie
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attentes
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Influence
                      </th>
                      {isAdmin && (
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredParties.map((partie) => (
                      <tr key={partie.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-gray-100">
                              {getTypeIcon(partie.type, partie.categorie)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{partie.nom}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getTypeBadge(partie.type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{partie.categorie}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs break-words">{partie.attentes}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getInfluenceBadge(partie.influence)}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleEdit(partie)}
                                className="text-indigo-600 hover:text-indigo-900 transition-colors"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(partie.id)}
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
        
        {/* Information Box */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <HelpCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Pourquoi identifier les parties intéressées ?</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  L'identification des parties intéressées et de leurs attentes est une exigence clé de la norme ISO 50001. 
                  Cette analyse permet de :
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Comprendre le contexte dans lequel votre système de management énergétique opère</li>
                  <li>Identifier les exigences légales et autres exigences applicables</li>
                  <li>Prioriser les actions en fonction de l'influence des parties prenantes</li>
                  <li>Adapter votre communication et votre stratégie énergétique</li>
                  <li>Améliorer l'efficacité de votre démarche énergétique</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Partie Intéressée Modal */}
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
              {isEditing ? 'Modifier la partie intéressée' : 'Ajouter une partie intéressée'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="nom"
                    name="nom"
                    value={formData.nom}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Ex: Employés, Clients, Autorités réglementaires..."
                    required
                  />
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className={`
                        flex items-center justify-center p-3 rounded-lg cursor-pointer transition-all duration-200
                        ${formData.type === 'interne'
                          ? 'bg-indigo-50 border-2 border-indigo-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        }
                      `}
                      onClick={() => setFormData(prev => ({ ...prev, type: 'interne' }))}
                    >
                      <Building className="w-5 h-5 text-indigo-600 mr-2" />
                      <span className="font-medium">Interne</span>
                    </div>
                    <div
                      className={`
                        flex items-center justify-center p-3 rounded-lg cursor-pointer transition-all duration-200
                        ${formData.type === 'externe'
                          ? 'bg-teal-50 border-2 border-teal-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        }
                      `}
                      onClick={() => setFormData(prev => ({ ...prev, type: 'externe' }))}
                    >
                      <Globe className="w-5 h-5 text-teal-600 mr-2" />
                      <span className="font-medium">Externe</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="categorie" className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="categorie"
                    name="categorie"
                    value={formData.categorie}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Ex: Employés, Fournisseurs, Clients..."
                    required
                  />
                </div>

                <div>
                  <label htmlFor="attentes" className="block text-sm font-medium text-gray-700 mb-1">
                    Attentes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="attentes"
                    name="attentes"
                    value={formData.attentes}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Décrivez les attentes de cette partie intéressée..."
                    required
                  />
                </div>

                <div>
                  <label htmlFor="influence" className="block text-sm font-medium text-gray-700 mb-1">
                    Niveau d'influence <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="influence"
                    name="influence"
                    value={formData.influence}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  >
                    <option value="faible">Faible</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="forte">Forte</option>
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
                    disabled={isSubmitting || !formData.nom || !formData.categorie || !formData.attentes}
                    className={`
                      flex items-center px-4 py-2 rounded-lg text-white
                      transition-all duration-200
                      ${isSubmitting || !formData.nom || !formData.categorie || !formData.attentes
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700'
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
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartiesInteresseesPage;