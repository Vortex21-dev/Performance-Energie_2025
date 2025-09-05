import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  Globe, 
  Users, 
  Briefcase,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Settings,
  BarChart3,
  Layers,
  CheckCircle,
  AlertTriangle,
  Loader,
  Building,
  Factory,
  Plus,
  Save,
  X,
  Zap,
  Target
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Company {
  name: string;
  description?: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  sector_name?: string;
  created_at: string;
  updated_at: string;
}

interface Filiere {
  name: string;
  location?: string;
  manager?: string;
  organization_name: string;
  created_at: string;
}

interface Filiale {
  name: string;
  description?: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  organization_name: string;
  filiere_name: string;
  created_at: string;
}

interface Site {
  name: string;
  description?: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  organization_name: string;
  filiale_name: string;
  created_at: string;
}

interface OrganizationSelection {
  id: string;
  organization_name: string;
  sector_name: string;
  energy_type_name: string;
  standard_names: string[];
  issue_names: string[];
  criteria_names: string[];
  indicator_names: string[];
  created_at: string;
}

const CompanyDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { companyName } = useParams<{ companyName: string }>();
  const { user } = useAuth();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [filiales, setFiliales] = useState<Filiale[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selections, setSelections] = useState<OrganizationSelection | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [expandedSections, setExpandedSections] = useState<{
    structure: boolean;
    configuration: boolean;
    filieres: string[];
  }>({
    structure: true,
    configuration: true,
    filieres: []
  });
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedCompany, setEditedCompany] = useState<Company | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Structure editing state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<'site' | 'filiale' | 'filiere'>('site');
  const [newItemData, setNewItemData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    location: '',
    manager: '',
    filiere_name: '',
    filiale_name: ''
  });
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  useEffect(() => {
    if (companyName) {
      fetchCompanyData();
    }
  }, [companyName]);

  const fetchCompanyData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch company details
      const { data: companyData, error: companyError } = await supabase
        .from('organizations')
        .select('*')
        .eq('name', companyName)
        .single();

      if (companyError) throw companyError;
      setCompany(companyData);

      // Fetch filieres
      const { data: filieresData, error: filieresError } = await supabase
        .from('filieres')
        .select('*')
        .eq('organization_name', companyName)
        .order('name');

      if (filieresError) throw filieresError;
      setFilieres(filieresData || []);

      // Fetch filiales
      const { data: filialesData, error: filialesError } = await supabase
        .from('filiales')
        .select('*')
        .eq('organization_name', companyName)
        .order('name');

      if (filialesError) throw filialesError;
      setFiliales(filialesData || []);

      // Fetch sites
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('*')
        .eq('organization_name', companyName)
        .order('name');

      if (sitesError) throw sitesError;
      setSites(sitesData || []);

      // Fetch selections
      const { data: selectionsData, error: selectionsError } = await supabase
        .from('organization_selections')
        .select('*')
        .eq('organization_name', companyName)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (selectionsError && selectionsError.code !== 'PGRST116') {
        console.error('Error fetching selections:', selectionsError);
      } else {
        setSelections(selectionsData);
      }

    } catch (err: any) {
      console.error('Error fetching company data:', err);
      setError(`Erreur lors du chargement des données: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: 'structure' | 'configuration') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleFiliere = (filiereName: string) => {
    setExpandedSections(prev => {
      const filieres = [...prev.filieres];
      if (filieres.includes(filiereName)) {
        return {
          ...prev,
          filieres: filieres.filter(f => f !== filiereName)
        };
      } else {
        return {
          ...prev,
          filieres: [...filieres, filiereName]
        };
      }
    });
  };

  const handleEditCompany = () => {
    if (company) {
      setEditedCompany({ ...company });
      setIsEditMode(true);
    }
  };

  const handleSaveCompany = async () => {
    if (!editedCompany) return;

    try {
      setIsSaving(true);
      setError(null);

      const { error } = await supabase
        .from('organizations')
        .update({
          description: editedCompany.description,
          address: editedCompany.address,
          city: editedCompany.city,
          country: editedCompany.country,
          phone: editedCompany.phone,
          email: editedCompany.email,
          website: editedCompany.website
        })
        .eq('name', companyName);

      if (error) throw error;

      setCompany(editedCompany);
      setIsEditMode(false);
      setSuccess('Entreprise modifiée avec succès');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating company:', err);
      setError(`Erreur lors de la modification: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedCompany(null);
    setIsEditMode(false);
  };

  const handleDeleteCompany = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'entreprise "${companyName}" ? Cette action est irréversible.`)) {
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('name', companyName);

      if (error) throw error;

      setSuccess(`L'entreprise "${companyName}" a été supprimée avec succès.`);
      setTimeout(() => {
        navigate('/company-management');
      }, 2000);
    } catch (err: any) {
      console.error('Error deleting company:', err);
      setError(`Erreur lors de la suppression: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleAddStructureItem = (type: 'site' | 'filiale' | 'filiere') => {
    setAddModalType(type);
    setNewItemData({
      name: '',
      description: '',
      address: '',
      city: '',
      country: '',
      phone: '',
      email: '',
      website: '',
      location: '',
      manager: '',
      filiere_name: '',
      filiale_name: ''
    });
    setShowAddModal(true);
  };

  const handleSubmitNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName) return;

    try {
      setIsSubmittingItem(true);
      setError(null);

      let result;
      
      if (addModalType === 'site') {
        result = await supabase
          .from('sites')
          .insert([{
            name: newItemData.name,
            description: newItemData.description || null,
            address: newItemData.address,
            city: newItemData.city,
            country: newItemData.country,
            phone: newItemData.phone,
            email: newItemData.email,
            website: newItemData.website || null,
            organization_name: companyName,
            filiere_name: newItemData.filiere_name || null,
            filiale_name: newItemData.filiale_name || null
          }]);
      } else if (addModalType === 'filiale') {
        result = await supabase
          .from('filiales')
          .insert([{
            name: newItemData.name,
            description: newItemData.description || null,
            address: newItemData.address,
            city: newItemData.city,
            country: newItemData.country,
            phone: newItemData.phone,
            email: newItemData.email,
            website: newItemData.website || null,
            organization_name: companyName,
            filiere_name: newItemData.filiere_name || null
          }]);
      } else if (addModalType === 'filiere') {
        result = await supabase
          .from('filieres')
          .insert([{
            name: newItemData.name,
            location: newItemData.location || null,
            manager: newItemData.manager || null,
            organization_name: companyName
          }]);
      }

      if (result?.error) throw result.error;

      setShowAddModal(false);
      setSuccess(`${addModalType === 'site' ? 'Site' : addModalType === 'filiale' ? 'Filiale' : 'Filière'} ajouté(e) avec succès`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchCompanyData();
    } catch (err: any) {
      console.error('Error adding item:', err);
      setError(`Erreur lors de l'ajout: ${err.message}`);
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleDeleteStructureItem = async (type: 'site' | 'filiale' | 'filiere', name: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${type === 'site' ? 'le site' : type === 'filiale' ? 'la filiale' : 'la filière'} "${name}" ?`)) {
      return;
    }

    try {
      setError(null);
      
      const tableName = type === 'site' ? 'sites' : type === 'filiale' ? 'filiales' : 'filieres';
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('name', name);

      if (error) throw error;

      setSuccess(`${type === 'site' ? 'Site' : type === 'filiale' ? 'Filiale' : 'Filière'} supprimé(e) avec succès`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchCompanyData();
    } catch (err: any) {
      console.error('Error deleting item:', err);
      setError(`Erreur lors de la suppression: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
          <p className="text-gray-600 font-medium">Chargement des données de l'entreprise...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8 border border-red-100">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Erreur</h1>
          </div>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/company-management')}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour à la liste des entreprises</span>
          </button>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Entreprise non trouvée</h1>
          </div>
          <p className="text-gray-600 mb-6">L'entreprise demandée n'existe pas ou a été supprimée.</p>
          <button
            onClick={() => navigate('/company-management')}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour à la liste des entreprises</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 left-20 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Success notification */}
      {success && (
        <div className="fixed top-6 right-6 z-50 bg-white/95 backdrop-blur-lg border border-green-200/50 rounded-2xl p-4 shadow-2xl shadow-green-500/10">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500 rounded-full blur-sm opacity-30 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-green-400 to-emerald-500 rounded-full p-2">
                <CheckCircle className="h-5 w-5 text-white animate-bounce" />
              </div>
            </div>
            <div>
              <p className="text-green-700 font-semibold text-sm">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/company-management')}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Retour</span>
            </button>
            
            <div className="h-6 w-px bg-gray-300"></div>
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Building2 className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  {company.sector_name && (
                    <>
                      <Briefcase className="w-4 h-4" />
                      <span>{company.sector_name}</span>
                      <span>•</span>
                    </>
                  )}
                  <MapPin className="w-4 h-4" />
                  <span>{company.city}, {company.country}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleEditCompany}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Edit2 className="w-5 h-5" />
              <span>Modifier</span>
            </button>
            
            <button
              onClick={handleDeleteCompany}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              <span>Supprimer</span>
            </button>
          </div>
        </div>

        {/* Company Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Main Info */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-white/20 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Informations de l'entreprise</h2>
                {!isEditMode && (
                  <button
                    onClick={handleEditCompany}
                    className="ml-auto flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Modifier</span>
                  </button>
                )}
              </div>
              
              {isEditMode ? (
                <form onSubmit={(e) => { e.preventDefault(); handleSaveCompany(); }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                      <input
                        type="text"
                        value={editedCompany?.address || ''}
                        onChange={(e) => setEditedCompany(prev => prev ? { ...prev, address: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
                      <input
                        type="text"
                        value={editedCompany?.city || ''}
                        onChange={(e) => setEditedCompany(prev => prev ? { ...prev, city: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pays</label>
                      <input
                        type="text"
                        value={editedCompany?.country || ''}
                        onChange={(e) => setEditedCompany(prev => prev ? { ...prev, country: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={editedCompany?.email || ''}
                        onChange={(e) => setEditedCompany(prev => prev ? { ...prev, email: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                      <input
                        type="tel"
                        value={editedCompany?.phone || ''}
                        onChange={(e) => setEditedCompany(prev => prev ? { ...prev, phone: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Site web</label>
                      <input
                        type="url"
                        value={editedCompany?.website || ''}
                        onChange={(e) => setEditedCompany(prev => prev ? { ...prev, website: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={editedCompany?.description || ''}
                      onChange={(e) => setEditedCompany(prev => prev ? { ...prev, description: e.target.value } : null)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      {isSaving ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>Enregistrement...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Enregistrer</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Adresse</h3>
                    <p className="text-gray-900">{company.address}</p>
                    <p className="text-gray-900">{company.city}, {company.country}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Contact</h3>
                    <div className="flex items-center space-x-2 mb-1">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{company.email}</p>
                    </div>
                    <div className="flex items-center space-x-2 mb-1">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{company.phone}</p>
                    </div>
                    {company.website && (
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <a 
                          href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          {company.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {!isEditMode && company.description && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                  <p className="text-gray-900">{company.description}</p>
                </div>
              )}
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <FileText className="w-4 h-4" />
                    <span>Créée le {new Date(company.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <FileText className="w-4 h-4" />
                    <span>Mise à jour le {new Date(company.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-white/20 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Statistiques</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Filières</h3>
                    <span className="text-2xl font-bold text-indigo-700">{filieres.length}</span>
                  </div>
                  <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full" 
                      style={{ width: `${Math.min(100, filieres.length * 10)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Filiales</h3>
                    <span className="text-2xl font-bold text-emerald-700">{filiales.length}</span>
                  </div>
                  <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full" 
                      style={{ width: `${Math.min(100, filiales.length * 5)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Sites</h3>
                    <span className="text-2xl font-bold text-amber-700">{sites.length}</span>
                  </div>
                  <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full" 
                      style={{ width: `${Math.min(100, sites.length * 3.33)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Structure Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-white/20 overflow-hidden mb-8">
          <div 
            className="px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-50"
            onClick={() => toggleSection('structure')}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Structure organisationnelle</h2>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddStructureItem('filiere');
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Filière</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddStructureItem('filiale');
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Filiale</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddStructureItem('site');
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Site</span>
                </button>
              </div>
              {expandedSections.structure ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </div>
          </div>
          
          {expandedSections.structure && (
            <div className="p-6">
              {filieres.length === 0 && filiales.length === 0 && sites.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Aucune structure organisationnelle définie pour cette entreprise.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Filieres */}
                  {filieres.map((filiere) => (
                    <div key={filiere.name} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 flex justify-between items-center cursor-pointer"
                        onClick={() => toggleFiliere(filiere.name)}
                      >
                        <div className="flex items-center space-x-3">
                          <Building className="w-5 h-5 text-blue-600" />
                          <div>
                            <h3 className="font-medium text-gray-900">{filiere.name}</h3>
                            {filiere.location && (
                              <p className="text-xs text-gray-500">Localisation: {filiere.location}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStructureItem('filiere', filiere.name);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {expandedSections.filieres.includes(filiere.name) ? (
                            <ChevronUp className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                      </div>
                      
                      {expandedSections.filieres.includes(filiere.name) && (
                        <div className="p-4">
                          {/* Filiales for this filiere */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-700">Filiales</h4>
                              <button
                                onClick={() => {
                                  setNewItemData(prev => ({ ...prev, filiere_name: filiere.name }));
                                  handleAddStructureItem('filiale');
                                }}
                                className="flex items-center space-x-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-xs hover:bg-emerald-100 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Ajouter filiale</span>
                              </button>
                            </div>
                            {filiales.filter(f => f.filiere_name === filiere.name).length > 0 ? (
                              <div className="space-y-3">
                                {filiales
                                  .filter(f => f.filiere_name === filiere.name)
                                  .map((filiale) => (
                                    <div key={filiale.name} className="bg-gray-50 p-3 rounded-lg">
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center space-x-2">
                                          <Building className="w-4 h-4 text-indigo-600" />
                                          <h5 className="font-medium text-gray-900">{filiale.name}</h5>
                                        </div>
                                        <button
                                          onClick={() => handleDeleteStructureItem('filiale', filiale.name)}
                                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                      <div className="pl-6 text-sm text-gray-600">
                                        <p>{filiale.address}, {filiale.city}, {filiale.country}</p>
                                        
                                        {/* Sites for this filiale */}
                                        {sites.filter(s => s.filiale_name === filiale.name).length > 0 && (
                                          <div className="mt-2">
                                            <div className="flex items-center justify-between mb-1">
                                              <h6 className="text-xs font-medium text-gray-700">Sites</h6>
                                              <button
                                                onClick={() => {
                                                  setNewItemData(prev => ({ 
                                                    ...prev, 
                                                    filiere_name: filiere.name,
                                                    filiale_name: filiale.name 
                                                  }));
                                                  handleAddStructureItem('site');
                                                }}
                                                className="flex items-center space-x-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-xs hover:bg-amber-100 transition-colors"
                                              >
                                                <Plus className="w-3 h-3" />
                                                <span>Site</span>
                                              </button>
                                            </div>
                                            <div className="space-y-2">
                                              {sites
                                                .filter(s => s.filiale_name === filiale.name)
                                                .map((site) => (
                                                  <div key={site.name} className="bg-white p-2 rounded border border-gray-200">
                                                    <div className="flex items-center justify-between">
                                                      <div className="flex items-center space-x-2">
                                                        <Factory className="w-3.5 h-3.5 text-gray-600" />
                                                        <span className="text-gray-800">{site.name}</span>
                                                      </div>
                                                      <button
                                                        onClick={() => handleDeleteStructureItem('site', site.name)}
                                                        className="p-0.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                      >
                                                        <Trash2 className="w-3 h-3" />
                                                      </button>
                                                    </div>
                                                    <p className="text-xs text-gray-500 pl-5 mt-1">
                                                      {site.address}, {site.city}
                                                    </p>
                                                  </div>
                                                ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 italic">Aucune filiale pour cette filière</p>
                            )}
                          </div>
                          
                          {/* Manager info if available */}
                          {filiere.manager && (
                            <div className="mt-3 bg-blue-50 p-3 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4 text-blue-600" />
                                <h4 className="text-sm font-medium text-blue-800">Responsable</h4>
                              </div>
                              <p className="text-sm text-blue-700 pl-6 mt-1">{filiere.manager}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Direct sites (not associated with filiales) */}
                  {sites.filter(s => !s.filiale_name).length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <Factory className="w-5 h-5 text-amber-600" />
                          <h3 className="font-medium text-gray-900">Sites indépendants</h3>
                        </div>
                        <button
                          onClick={() => {
                            setNewItemData(prev => ({ ...prev, filiere_name: '', filiale_name: '' }));
                            handleAddStructureItem('site');
                          }}
                          className="flex items-center space-x-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs hover:bg-amber-200 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Ajouter site</span>
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="space-y-3">
                          {sites
                            .filter(s => !s.filiale_name)
                            .map((site) => (
                              <div key={site.name} className="bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center space-x-2">
                                    <Factory className="w-4 h-4 text-amber-600" />
                                    <h5 className="font-medium text-gray-900">{site.name}</h5>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteStructureItem('site', site.name)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <p className="pl-6 text-sm text-gray-600">
                                  {site.address}, {site.city}, {site.country}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Configuration Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-white/20 overflow-hidden mb-8">
          <div 
            className="px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-50"
            onClick={() => toggleSection('configuration')}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Settings className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Configuration énergétique</h2>
            </div>
            {expandedSections.configuration ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
          
          {expandedSections.configuration && (
            <div className="p-6">
              {!selections ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Aucune configuration énergétique définie pour cette entreprise.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                    <h3 className="text-lg font-medium text-gray-800 mb-3">Secteur et Énergie</h3>
                    <div className="space-y-3">
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="flex items-center space-x-2 mb-1">
                          <Briefcase className="w-4 h-4 text-blue-600" />
                          <h4 className="font-medium text-gray-900">Secteur</h4>
                        </div>
                        <p className="pl-6 text-gray-700">{selections.sector_name}</p>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="flex items-center space-x-2 mb-1">
                          <Zap className="w-4 h-4 text-amber-600" />
                          <h4 className="font-medium text-gray-900">Type d'énergie</h4>
                        </div>
                        <p className="pl-6 text-gray-700">{selections.energy_type_name}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-100">
                    <h3 className="text-lg font-medium text-gray-800 mb-3">Normes et Standards</h3>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-medium text-gray-900">Normes sélectionnées</h4>
                      </div>
                      {selections.standard_names && selections.standard_names.length > 0 ? (
                        <div className="pl-6 flex flex-wrap gap-2">
                          {selections.standard_names.map((standard, index) => (
                            <span 
                              key={index} 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"
                            >
                              {standard}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="pl-6 text-gray-500 italic">Aucune norme sélectionnée</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                    <h3 className="text-lg font-medium text-gray-800 mb-3">Enjeux et Critères</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="flex items-center space-x-2 mb-2">
                          <Target className="w-4 h-4 text-purple-600" />
                          <h4 className="font-medium text-gray-900">Enjeux sélectionnés</h4>
                        </div>
                        {selections.issue_names && selections.issue_names.length > 0 ? (
                          <div className="pl-6 space-y-1">
                            {selections.issue_names.map((issue, index) => (
                              <div key={index} className="text-sm text-gray-700">
                                • {issue}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="pl-6 text-gray-500 italic">Aucun enjeu sélectionné</p>
                        )}
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-pink-600" />
                          <h4 className="font-medium text-gray-900">Critères sélectionnés</h4>
                        </div>
                        {selections.criteria_names && selections.criteria_names.length > 0 ? (
                          <div className="pl-6 space-y-1 max-h-40 overflow-y-auto">
                            {selections.criteria_names.map((criteria, index) => (
                              <div key={index} className="text-sm text-gray-700">
                                • {criteria}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="pl-6 text-gray-500 italic">Aucun critère sélectionné</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-100">
                    <h3 className="text-lg font-medium text-gray-800 mb-3">Indicateurs</h3>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <BarChart3 className="w-4 h-4 text-amber-600" />
                        <h4 className="font-medium text-gray-900">Indicateurs sélectionnés</h4>
                      </div>
                      {selections.indicator_names && selections.indicator_names.length > 0 ? (
                        <div className="pl-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                          {selections.indicator_names.map((indicator, index) => (
                            <div key={index} className="text-sm text-gray-700">
                              • {indicator}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="pl-6 text-gray-500 italic">Aucun indicateur sélectionné</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Add Structure Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative animate-scaleIn">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Ajouter {addModalType === 'site' ? 'un site' : addModalType === 'filiale' ? 'une filiale' : 'une filière'}
            </h2>

            <form onSubmit={handleSubmitNewItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newItemData.name}
                  onChange={(e) => setNewItemData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              {addModalType !== 'filiere' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newItemData.address}
                      onChange={(e) => setNewItemData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ville <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newItemData.city}
                        onChange={(e) => setNewItemData(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pays <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newItemData.country}
                        onChange={(e) => setNewItemData(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={newItemData.phone}
                        onChange={(e) => setNewItemData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={newItemData.email}
                        onChange={(e) => setNewItemData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Site web
                    </label>
                    <input
                      type="url"
                      value={newItemData.website}
                      onChange={(e) => setNewItemData(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {addModalType === 'filiere' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Localisation
                    </label>
                    <input
                      type="text"
                      value={newItemData.location}
                      onChange={(e) => setNewItemData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Responsable
                    </label>
                    <input
                      type="text"
                      value={newItemData.manager}
                      onChange={(e) => setNewItemData(prev => ({ ...prev, manager: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {addModalType === 'filiale' && filieres.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filière parente
                  </label>
                  <select
                    value={newItemData.filiere_name}
                    onChange={(e) => setNewItemData(prev => ({ ...prev, filiere_name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Aucune filière parente</option>
                    {filieres.map((filiere) => (
                      <option key={filiere.name} value={filiere.name}>
                        {filiere.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {addModalType === 'site' && filiales.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filiale parente
                  </label>
                  <select
                    value={newItemData.filiale_name}
                    onChange={(e) => setNewItemData(prev => ({ ...prev, filiale_name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Aucune filiale parente</option>
                    {filiales.map((filiale) => (
                      <option key={filiale.name} value={filiale.name}>
                        {filiale.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newItemData.description}
                  onChange={(e) => setNewItemData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingItem || !newItemData.name || (addModalType !== 'filiere' && (!newItemData.address || !newItemData.city || !newItemData.country || !newItemData.phone || !newItemData.email))}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmittingItem || !newItemData.name || (addModalType !== 'filiere' && (!newItemData.address || !newItemData.city || !newItemData.country || !newItemData.phone || !newItemData.email))
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                    }
                  `}
                >
                  {isSubmittingItem ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Ajout en cours...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Ajouter
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

export default CompanyDetailPage;