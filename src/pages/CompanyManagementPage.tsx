import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Building2, 
  Search, 
  Filter, 
  Plus, 
  LogIn, 
  Mail, 
  MapPin, 
  Phone, 
  Globe, 
  Users, 
  Briefcase,
  Loader,
  AlertTriangle,
  CheckCircle,
  Edit2,
  Trash2,
  Eye,
  MoreVertical
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
}

const CompanyManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [sectors, setSectors] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies();
    fetchSectors();
  }, []);

  useEffect(() => {
    filterCompanies();
  }, [companies, searchTerm, sectorFilter]);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
      setFilteredCompanies(data || []);
    } catch (err: any) {
      console.error('Error fetching companies:', err);
      setError('Erreur lors du chargement des entreprises');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSectors = async () => {
    try {
      const { data, error } = await supabase
        .from('sectors')
        .select('name')
        .order('name');

      if (error) throw error;
      setSectors(data?.map(sector => sector.name) || []);
    } catch (err: any) {
      console.error('Error fetching sectors:', err);
    }
  };

  const filterCompanies = () => {
    let filtered = [...companies];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(company => 
        company.name.toLowerCase().includes(searchLower) ||
        company.city.toLowerCase().includes(searchLower) ||
        company.country.toLowerCase().includes(searchLower) ||
        (company.description && company.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply sector filter
    if (sectorFilter !== 'all') {
      filtered = filtered.filter(company => company.sector_name === sectorFilter);
    }

    setFilteredCompanies(filtered);
  };

  const handleConnectAsAdminClient = async (companyName: string) => {
    try {
      setIsConnecting(companyName);
      setError(null);
      
      // 1. Vérifier que l'utilisateur est bien admin
      if (user?.role !== 'admin') {
        throw new Error('Seuls les administrateurs peuvent se connecter aux entreprises');
      }
      
      // 2. Stocker le rôle original et mettre à jour le profil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'admin_client',
          organization_name: companyName,
          organization_level: 'groupe',
          original_role: 'admin' // Stocker le rôle admin original
        })
        .eq('email', user?.email);
      
      if (updateError) throw updateError;
      
      // 3. Afficher un message de succès
      setSuccess(`Connexion à l'entreprise ${companyName} réussie. Redirection...`);
      
      // 4. Rediriger vers le dashboard après un délai
      setTimeout(() => {
        // Forcer le rechargement de la page pour que le contexte d'auth se mette à jour
        window.location.href = '/dashboard';
      }, 1500);
      
    } catch (err: any) {
      console.error('Error connecting as admin_client:', err);
      setError(`Erreur lors de la connexion: ${err.message}`);
      setIsConnecting(null);
    }
  };

  const handleEditCompany = (companyName: string) => {
    navigate(`/company-detail/${companyName}`, { state: { editMode: true } });
  };

  const handleDeleteCompany = async (companyName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'entreprise "${companyName}" ? Cette action est irréversible et supprimera toutes les données associées.`)) {
      return;
    }

    try {
      setError(null);
      
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('name', companyName);

      if (error) throw error;

      setSuccess(`L'entreprise "${companyName}" a été supprimée avec succès.`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh the companies list
      fetchCompanies();
    } catch (err: any) {
      console.error('Error deleting company:', err);
      setError(`Erreur lors de la suppression: ${err.message}`);
    }
  };

  const handleAddCompany = () => {
    navigate('/company-type-selection');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 left-20 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin')}
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
                <h1 className="text-2xl font-bold text-gray-900">Gestion des Entreprises</h1>
                <p className="text-gray-600">Administrez les entreprises et leurs configurations</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleAddCompany}
            className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl hover:from-indigo-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Ajouter une entreprise</span>
          </button>
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

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-white/20 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-grow md:flex-grow-0 md:min-w-[300px]">
                <input
                  type="text"
                  placeholder="Rechercher une entreprise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <div className="relative">
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Tous les secteurs</option>
                  {sectors.map((sector) => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Companies List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center">
              <Loader className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
              <p className="text-gray-600 font-medium">Chargement des entreprises...</p>
            </div>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-white/20 p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Aucune entreprise trouvée</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchTerm || sectorFilter !== 'all' 
                ? "Aucune entreprise ne correspond à vos critères de recherche." 
                : "Vous n'avez pas encore ajouté d'entreprise."}
            </p>
            <button
              onClick={handleAddCompany}
              className="px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Ajouter une entreprise
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredCompanies.map((company) => (
              <motion.div
                key={company.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-white/20 overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-indigo-100 rounded-xl">
                        <Building2 className="w-8 h-8 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{company.name}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-gray-600">
                          {company.sector_name && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              <Briefcase className="w-3.5 h-3.5 mr-1" />
                              {company.sector_name}
                            </span>
                          )}
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1 text-gray-500" />
                            <span>{company.city}, {company.country}</span>
                          </div>
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-1 text-gray-500" />
                            <span>{company.email}</span>
                          </div>
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-1 text-gray-500" />
                            <span>{company.phone}</span>
                          </div>
                          {company.website && (
                            <div className="flex items-center">
                              <Globe className="w-4 h-4 mr-1 text-gray-500" />
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
                        {company.description && (
                          <p className="mt-2 text-gray-600 line-clamp-2">{company.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleConnectAsAdminClient(company.name)}
                        disabled={isConnecting !== null}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {isConnecting === company.name ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            <span className="font-medium">Connexion...</span>
                          </>
                        ) : (
                          <>
                            <LogIn className="w-4 h-4" />
                            <span className="font-medium">Se connecter</span>
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => navigate(`/company-detail/${company.name}`)}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span className="font-medium">Modifier</span>
                      </button>
                      
                      <button
                        onClick={() => handleDeleteCompany(company.name)}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="font-medium">Supprimer</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
};

export default CompanyManagementPage;