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
  Search,
  Filter,
  Mail,
  User,
  Shield,
  Building2,
  Building,
  Factory,
  Briefcase,
  Eye,
  EyeOff,
  UserPlus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface UserProfile {
  email: string;
  role: string;
  organization_name: string | null;
  organization_level: string | null;
  filiere_name: string | null;
  filiale_name: string | null;
  site_name: string | null;
  created_at: string;
  updated_at: string;
}

interface UserData {
  email: string;
  nom: string;
  prenom: string;
  fonction: string;
  adresse: string | null;
  ville: string | null;
  pays: string | null;
  numero: string | null;
  titre: string | null;
  entreprise: string | null;
  created_at: string;
  updated_at: string;
}

interface Organization {
  name: string;
  city: string;
  country: string;
}

interface Site {
  name: string;
}

interface Filiale {
  name: string;
}

interface Filiere {
  name: string;
}

interface UserWithDetails extends UserProfile {
  userData?: UserData;
}

const UserProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [filiales, setFiliales] = useState<Filiale[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserWithDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nom: '',
    prenom: '',
    fonction: '',
    adresse: '',
    ville: '',
    pays: '',
    numero: '',
    titre: '',
    entreprise: '',
    role: 'guest' as string,
    organization_name: '',
    organization_level: 'site' as string,
    filiere_name: '',
    filiale_name: '',
    site_name: ''
  });
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  
  useEffect(() => {
    fetchUsers();
    fetchOrganizations();
    fetchSites();
    fetchFiliales();
    fetchFilieres();
  }, []);
  
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;
      
      // Fetch user data for each profile
      const usersWithDetails: UserWithDetails[] = [];
      
      for (const profile of profilesData || []) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', profile.email)
          .maybeSingle();
        
        if (userError && userError.code !== 'PGRST116') {
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
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('name, city, country')
        .order('name');
      
      if (error) throw error;
      setOrganizations(data || []);
    } catch (err: any) {
      console.error('Error fetching organizations:', err);
    }
  };
  
  const fetchSites = async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('name')
        .order('name');
      
      if (error) throw error;
      setSites(data || []);
    } catch (err: any) {
      console.error('Error fetching sites:', err);
    }
  };
  
  const fetchFiliales = async () => {
    try {
      const { data, error } = await supabase
        .from('filiales')
        .select('name')
        .order('name');
      
      if (error) throw error;
      setFiliales(data || []);
    } catch (err: any) {
      console.error('Error fetching filiales:', err);
    }
  };
  
  const fetchFilieres = async () => {
    try {
      const { data, error } = await supabase
        .from('filieres')
        .select('name')
        .order('name');
      
      if (error) throw error;
      setFilieres(data || []);
    } catch (err: any) {
      console.error('Error fetching filieres:', err);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      if (isEditing && currentUser) {
        // Update existing user
        
        // Update user data
        const { error: userError } = await supabase
          .from('users')
          .update({
            nom: formData.nom,
            prenom: formData.prenom,
            fonction: formData.fonction,
            adresse: formData.adresse || null,
            ville: formData.ville || null,
            pays: formData.pays || null,
            numero: formData.numero || null,
            titre: formData.titre || null,
            entreprise: formData.entreprise || null
          })
          .eq('email', currentUser.email);
        
        if (userError) throw userError;
        
        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            role: formData.role,
            organization_name: formData.organization_name || null,
            organization_level: formData.organization_level || null,
            filiere_name: formData.filiere_name || null,
            filiale_name: formData.filiale_name || null,
            site_name: formData.site_name || null
          })
          .eq('email', currentUser.email);
        
        if (profileError) throw profileError;
        
        setSuccess('Utilisateur modifié avec succès');
      } else {
        // Create new user
        
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: `${formData.prenom} ${formData.nom}`,
            },
          },
        });
        
        if (authError) throw authError;
        
        // Wait for triggers to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update user data
        const { error: userError } = await supabase
          .from('users')
          .update({
            nom: formData.nom,
            prenom: formData.prenom,
            fonction: formData.fonction,
            adresse: formData.adresse || null,
            ville: formData.ville || null,
            pays: formData.pays || null,
            numero: formData.numero || null,
            titre: formData.titre || null,
            entreprise: formData.entreprise || null
          })
          .eq('email', formData.email);
        
        if (userError) {
          console.warn('Warning updating user details:', userError);
        }
        
        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            role: formData.role,
            organization_name: formData.organization_name || null,
            organization_level: formData.organization_level || null,
            filiere_name: formData.filiere_name || null,
            filiale_name: formData.filiale_name || null,
            site_name: formData.site_name || null
          })
          .eq('email', formData.email);
        
        if (profileError) throw profileError;
        
        setSuccess('Utilisateur créé avec succès');
      }
      
      // Reset form and close modal
      resetForm();
      setShowModal(false);
      
      // Refresh users list
      fetchUsers();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving user:', err);
      setError(err.message || 'Erreur lors de l\'enregistrement de l\'utilisateur');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEdit = (userToEdit: UserWithDetails) => {
    setCurrentUser(userToEdit);
    setFormData({
      email: userToEdit.email,
      password: '',
      nom: userToEdit.userData?.nom || '',
      prenom: userToEdit.userData?.prenom || '',
      fonction: userToEdit.userData?.fonction || '',
      adresse: userToEdit.userData?.adresse || '',
      ville: userToEdit.userData?.ville || '',
      pays: userToEdit.userData?.pays || '',
      numero: userToEdit.userData?.numero || '',
      titre: userToEdit.userData?.titre || '',
      entreprise: userToEdit.userData?.entreprise || '',
      role: userToEdit.role,
      organization_name: userToEdit.organization_name || '',
      organization_level: userToEdit.organization_level || 'site',
      filiere_name: userToEdit.filiere_name || '',
      filiale_name: userToEdit.filiale_name || '',
      site_name: userToEdit.site_name || ''
    });
    setIsEditing(true);
    setShowModal(true);
  };
  
  const handleDelete = async (email: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${email} ?`)) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Delete from profiles first (this will cascade to other tables)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('email', email);
      
      if (profileError) throw profileError;
      
      // Delete from users table
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('email', email);
      
      if (userError) throw userError;
      
      setSuccess('Utilisateur supprimé avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh users list
      fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError('Erreur lors de la suppression de l\'utilisateur');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      nom: '',
      prenom: '',
      fonction: '',
      adresse: '',
      ville: '',
      pays: '',
      numero: '',
      titre: '',
      entreprise: '',
      role: 'guest',
      organization_name: '',
      organization_level: 'site',
      filiere_name: '',
      filiale_name: '',
      site_name: ''
    });
    setCurrentUser(null);
    setIsEditing(false);
  };
  
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </span>
        );
      case 'admin_client':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
            <Shield className="w-3 h-3 mr-1" />
            Admin Client
          </span>
        );
      case 'contributeur':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            <User className="w-3 h-3 mr-1" />
            Contributeur
          </span>
        );
      case 'validateur':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Validateur
          </span>
        );
      case 'guest':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            <User className="w-3 h-3 mr-1" />
            Invité
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            {role}
          </span>
        );
    }
  };
  
  const getOrganizationLevel = (userProfile: UserWithDetails) => {
    if (userProfile.site_name) {
      return (
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <Factory className="w-3.5 h-3.5" />
          <span>Site: {userProfile.site_name}</span>
        </div>
      );
    }
    if (userProfile.filiale_name) {
      return (
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <Building className="w-3.5 h-3.5" />
          <span>Filiale: {userProfile.filiale_name}</span>
        </div>
      );
    }
    if (userProfile.filiere_name) {
      return (
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <Building2 className="w-3.5 h-3.5" />
          <span>Filière: {userProfile.filiere_name}</span>
        </div>
      );
    }
    if (userProfile.organization_name) {
      return (
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <Briefcase className="w-3.5 h-3.5" />
          <span>Organisation: {userProfile.organization_name}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <User className="w-3.5 h-3.5" />
        <span>Aucune organisation</span>
      </div>
    );
  };
  
  const filteredUsers = users.filter(userProfile => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        userProfile.email.toLowerCase().includes(searchLower) ||
        (userProfile.userData?.nom?.toLowerCase().includes(searchLower) || false) ||
        (userProfile.userData?.prenom?.toLowerCase().includes(searchLower) || false) ||
        (userProfile.userData?.fonction?.toLowerCase().includes(searchLower) || false);
      
      if (!matchesSearch) return false;
    }
    
    // Role filter
    if (roleFilter !== 'all' && userProfile.role !== roleFilter) {
      return false;
    }
    
    // Organization filter
    if (organizationFilter !== 'all' && userProfile.organization_name !== organizationFilter) {
      return false;
    }
    
    return true;
  });
  
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
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestion des Profils Utilisateurs</h1>
                <p className="text-gray-600">Administrez tous les utilisateurs du système</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl hover:from-indigo-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <UserPlus className="w-5 h-5" />
            <span className="font-medium">Créer un utilisateur</span>
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
                  placeholder="Rechercher un utilisateur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Tous les rôles</option>
                  <option value="admin">Administrateur</option>
                  <option value="admin_client">Admin Client</option>
                  <option value="contributeur">Contributeur</option>
                  <option value="validateur">Validateur</option>
                  <option value="guest">Invité</option>
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <div className="relative">
                <select
                  value={organizationFilter}
                  onChange={(e) => setOrganizationFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Toutes les organisations</option>
                  {organizations.map((org) => (
                    <option key={org.name} value={org.name}>{org.name}</option>
                  ))}
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center">
              <Loader className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
              <p className="text-gray-600 font-medium">Chargement des utilisateurs...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-white/20 p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Aucun utilisateur trouvé</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchTerm || roleFilter !== 'all' || organizationFilter !== 'all'
                ? "Aucun utilisateur ne correspond à vos critères de recherche." 
                : "Vous n'avez pas encore créé d'utilisateur."}
            </p>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Créer un utilisateur
            </button>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-white/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rôle
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organisation
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fonction
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((userProfile) => (
                    <motion.tr
                      key={userProfile.email}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-indigo-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {userProfile.userData?.prenom} {userProfile.userData?.nom}
                            </div>
                            <div className="text-sm text-gray-500">{userProfile.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(userProfile.role)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {userProfile.organization_name || 'Aucune'}
                        </div>
                        {getOrganizationLevel(userProfile)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {userProfile.userData?.fonction || 'Non spécifié'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {userProfile.userData?.numero || 'Non spécifié'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {userProfile.userData?.ville ? `${userProfile.userData.ville}, ${userProfile.userData.pays}` : 'Non spécifié'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(userProfile)}
                            className="text-indigo-600 hover:text-indigo-900 transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(userProfile.email)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit User Modal */}
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
              {isEditing ? 'Modifier l\'utilisateur' : 'Créer un nouvel utilisateur'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informations de base */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informations de base</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                      disabled={isEditing}
                    />
                  </div>

                  {!isEditing && (
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Mot de passe <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="prenom" className="block text-sm font-medium text-gray-700 mb-1">
                      Prénom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="prenom"
                      name="prenom"
                      value={formData.prenom}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>

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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="fonction" className="block text-sm font-medium text-gray-700 mb-1">
                      Fonction
                    </label>
                    <input
                      type="text"
                      id="fonction"
                      name="fonction"
                      value={formData.fonction}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="titre" className="block text-sm font-medium text-gray-700 mb-1">
                      Titre
                    </label>
                    <input
                      type="text"
                      id="titre"
                      name="titre"
                      value={formData.titre}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Informations de contact */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informations de contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-1">
                      Numéro de téléphone
                    </label>
                    <input
                      type="tel"
                      id="numero"
                      name="numero"
                      value={formData.numero}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="entreprise" className="block text-sm font-medium text-gray-700 mb-1">
                      Entreprise
                    </label>
                    <input
                      type="text"
                      id="entreprise"
                      name="entreprise"
                      value={formData.entreprise}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="adresse" className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse
                    </label>
                    <input
                      type="text"
                      id="adresse"
                      name="adresse"
                      value={formData.adresse}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="ville" className="block text-sm font-medium text-gray-700 mb-1">
                      Ville
                    </label>
                    <input
                      type="text"
                      id="ville"
                      name="ville"
                      value={formData.ville}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="pays" className="block text-sm font-medium text-gray-700 mb-1">
                      Pays
                    </label>
                    <input
                      type="text"
                      id="pays"
                      name="pays"
                      value={formData.pays}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Rôle et organisation */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Rôle et organisation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                      Rôle <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    >
                      <option value="guest">Invité</option>
                      <option value="contributeur">Contributeur</option>
                      <option value="validateur">Validateur</option>
                      <option value="admin_client">Admin Client</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="organization_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Organisation
                    </label>
                    <select
                      id="organization_name"
                      name="organization_name"
                      value={formData.organization_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Aucune organisation</option>
                      {organizations.map((org) => (
                        <option key={org.name} value={org.name}>
                          {org.name} - {org.city}, {org.country}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="organization_level" className="block text-sm font-medium text-gray-700 mb-1">
                      Niveau d'organisation
                    </label>
                    <select
                      id="organization_level"
                      name="organization_level"
                      value={formData.organization_level}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="site">Site</option>
                      <option value="filiale">Filiale</option>
                      <option value="filiere">Filière</option>
                      <option value="groupe">Groupe</option>
                    </select>
                  </div>

                  {formData.organization_level === 'filiere' && (
                    <div>
                      <label htmlFor="filiere_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Filière
                      </label>
                      <select
                        id="filiere_name"
                        name="filiere_name"
                        value={formData.filiere_name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">Sélectionnez une filière</option>
                        {filieres.map((filiere) => (
                          <option key={filiere.name} value={filiere.name}>
                            {filiere.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.organization_level === 'filiale' && (
                    <div>
                      <label htmlFor="filiale_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Filiale
                      </label>
                      <select
                        id="filiale_name"
                        name="filiale_name"
                        value={formData.filiale_name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">Sélectionnez une filiale</option>
                        {filiales.map((filiale) => (
                          <option key={filiale.name} value={filiale.name}>
                            {filiale.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.organization_level === 'site' && (
                    <div>
                      <label htmlFor="site_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Site
                      </label>
                      <select
                        id="site_name"
                        name="site_name"
                        value={formData.site_name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">Sélectionnez un site</option>
                        {sites.map((site) => (
                          <option key={site.name} value={site.name}>
                            {site.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
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
                  disabled={isSubmitting || !formData.email || !formData.nom || !formData.prenom || (!isEditing && !formData.password)}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmitting || !formData.email || !formData.nom || !formData.prenom || (!isEditing && !formData.password)
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                    }
                  `}
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      {isEditing ? 'Modification en cours...' : 'Création en cours...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      {isEditing ? 'Modifier' : 'Créer'}
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

export default UserProfilePage;