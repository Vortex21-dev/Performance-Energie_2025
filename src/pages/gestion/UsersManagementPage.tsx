import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Users,
  UserCheck,
  Shield,
  FileText,
  Building2,
  CheckCircle,
  AlertTriangle,
  Loader,
  Search,
  Mail,
  User,
  Filter,
  Plus,
  Briefcase,
  Building,
  Factory
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface UserProfile {
  email: string;
  role: string;
  organization_name: string | null;
  filiere_name: string | null;
  filiale_name: string | null;
  site_name: string | null;
  created_at: string;
}

interface UserData {
  email: string;
  nom: string;
  prenom: string;
  fonction: string;
  created_at: string;
}

interface UserWithDetails extends UserProfile {
  userData?: UserData;
}

const UsersManagementPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserOrganization();
    }
  }, [user]);

  const fetchUserOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('organization_name')
        .eq('email', user?.email)
        .single();

      if (error) throw error;
      
      if (data?.organization_name) {
        setOrganizationName(data.organization_name);
        fetchUsers(data.organization_name);
      } else {
        setError("Vous n'êtes associé à aucune organisation.");
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Error fetching user organization:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const fetchUsers = async (orgName: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Récupérer les profils des utilisateurs de cette organisation
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_name', orgName)
        .in('role', ['contributeur', 'validateur', 'admin_client']);

      if (profilesError) throw profilesError;

      // Récupérer les données utilisateur pour chaque profil
      const usersWithDetails: UserWithDetails[] = [];
      
      for (const profile of profilesData || []) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', profile.email)
          .single();

        if (userError && userError.code !== 'PGRST116') { // PGRST116 is "row not found"
          console.error(`Error fetching user data for ${profile.email}:`, userError);
        }

        usersWithDetails.push({
          ...profile,
          userData: userData || undefined
        });
      }

      setUsers(usersWithDetails);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'contributeur':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          icon: <UserCheck className="w-4 h-4 text-blue-600" />
        };
      case 'validateur':
        return {
          bg: 'bg-emerald-100',
          text: 'text-emerald-800',
          icon: <CheckCircle className="w-4 h-4 text-emerald-600" />
        };
      case 'admin_client':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-800',
          icon: <Shield className="w-4 h-4 text-purple-600" />
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: <User className="w-4 h-4 text-gray-600" />
        };
    }
  };

  const getFormattedRole = (role: string) => {
    switch (role) {
      case 'contributeur':
        return 'Contributeur';
      case 'validateur':
        return 'Validateur';
      case 'admin_client':
        return 'Administrateur';
      default:
        return role;
    }
  };

  const getOrganizationLevel = (user: UserWithDetails) => {
    if (user.site_name) {
      return (
        <div className="flex items-center gap-1.5">
          <Factory className="w-3.5 h-3.5 text-gray-500" />
          <span>Site: {user.site_name}</span>
        </div>
      );
    }
    if (user.filiale_name) {
      return (
        <div className="flex items-center gap-1.5">
          <Building className="w-3.5 h-3.5 text-gray-500" />
          <span>Filiale: {user.filiale_name}</span>
        </div>
      );
    }
    if (user.filiere_name) {
      return (
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-gray-500" />
          <span>Filière: {user.filiere_name}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5">
        <Briefcase className="w-3.5 h-3.5 text-gray-500" />
        <span>Niveau: Organisation</span>
      </div>
    );
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      user.email.toLowerCase().includes(searchLower) ||
      (user.userData?.nom?.toLowerCase().includes(searchLower) || false) ||
      (user.userData?.prenom?.toLowerCase().includes(searchLower) || false) ||
      (user.userData?.fonction?.toLowerCase().includes(searchLower) || false);
    
    const matchesRoleFilter = !roleFilter || user.role === roleFilter;
    
    return matchesSearch && matchesRoleFilter;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/gestion/programmation')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Retour</span>
              </button>
              
              <div className="h-6 w-px bg-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Contributeurs, validateurs et administrateurs</h1>
                  <p className="text-gray-600">Gestion des utilisateurs de l'organisation</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-sm">
              <FileText className="w-4 h-4 text-purple-600" />
              <span className="text-purple-800 font-medium">Configuration Système</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4"
          >
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">Erreur: {error}</p>
            </div>
          </motion.div>
        )}

        {organizationName && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{organizationName}</h3>
                <p className="text-gray-600 text-sm">Organisation</p>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Rôle:</span>
              </div>
              <select
                value={roleFilter || ''}
                onChange={(e) => setRoleFilter(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Tous les rôles</option>
                <option value="contributeur">Contributeurs</option>
                <option value="validateur">Validateurs</option>
                <option value="admin_client">Administrateurs</option>
              </select>
            </div>
            
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/user-management')}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un utilisateur</span>
              </button>
            )}
          </div>
        </div>

        {/* Users List */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun utilisateur trouvé</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || roleFilter 
                ? "Aucun utilisateur ne correspond à vos critères de recherche."
                : "Aucun contributeur, validateur ou administrateur n'est configuré pour cette organisation."}
            </p>
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/user-management')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Ajouter des utilisateurs
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((userProfile) => {
              const roleBadge = getRoleBadgeColor(userProfile.role);
              
              return (
                <motion.div
                  key={userProfile.email}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {userProfile.userData?.prenom} {userProfile.userData?.nom}
                          </h3>
                          <p className="text-gray-600 text-sm">{userProfile.userData?.fonction || 'Non spécifié'}</p>
                        </div>
                      </div>
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${roleBadge.bg} ${roleBadge.text}`}>
                        {roleBadge.icon}
                        <span className="text-xs font-medium">{getFormattedRole(userProfile.role)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{userProfile.email}</span>
                      </div>
                      {getOrganizationLevel(userProfile)}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Ajouté le {new Date(userProfile.created_at).toLocaleDateString()}
                      </span>
                      
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => navigate('/user-management', { state: { editUser: userProfile.email } })}
                          className="text-sm text-purple-600 hover:text-purple-800 transition-colors"
                        >
                          Gérer
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersManagementPage;