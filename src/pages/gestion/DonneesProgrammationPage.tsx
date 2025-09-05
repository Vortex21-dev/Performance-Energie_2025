import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Calendar,
  Globe,
  Users,
  Cog,
  TrendingUp,
  Shield,
  Building2,
  ChevronRight,
  Search,
  UserCheck,
  Compass,
  List,
  Menu,
  X,
  CheckCircle,
  AlertTriangle,
  Loader,
  FileText,
  ChevronDown,
  ChevronUp,
  Filter,
  Mail,
  User,
  Plus,
  Briefcase,
  Building,
  Factory,
  Target,
  Save
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Organization {
  name: string;
  city: string;
  country: string;
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

const DonneesProgrammationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState(1);
  const [organizationSelections, setOrganizationSelections] = useState<OrganizationSelection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<string[]>([]);
  const [filterStandard, setFilterStandard] = useState<string | null>(null);
  
  // User management state
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  // User creation state for admin_client
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    nom: '',
    prenom: '',
    fonction: '',
    role: 'contributeur' as 'contributeur' | 'validateur' | 'admin_client',
    organization_level: 'site' as 'site' | 'filiale' | 'filiere' | 'groupe',
    filiere_name: '',
    filiale_name: '',
    site_name: ''
  });
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [sites, setSites] = useState<{name: string}[]>([]);
  const [filiales, setFiliales] = useState<{name: string}[]>([]);
  const [filieres, setFilieres] = useState<{name: string}[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganization();
    if (user) {
      fetchOrganizationSelections();
      if (selectedElement === 5) {
        fetchUserOrganization();
      }
      if (selectedElement === 5 && organizationName) {
        fetchOrganizationStructure();
      }
    }
  }, [user, selectedElement]);

  const fetchOrganization = async () => {
    try {
      setIsLoading(true);
      // Get the first organization for now - in a real app you'd get the user's organization
      const { data, error } = await supabase
        .from('organizations')
        .select('name, city, country')
        .limit(1)
        .single();

      if (error) throw error;
      setOrganization(data);
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrganizationSelections = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Récupérer d'abord le profil de l'utilisateur pour obtenir son organization_name
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('organization_name')
        .eq('email', user?.email)
        .single();

      if (profileError) throw profileError;
      
      if (!profileData?.organization_name) {
        setOrganizationSelections([]);
        setError("Vous n'êtes associé à aucune organisation.");
        setIsLoading(false);
        return;
      }

      // Récupérer les sélections pour cette organisation
      const { data, error } = await supabase
        .from('organization_selections')
        .select('*')
        .eq('organization_name', profileData.organization_name)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrganizationSelections(data || []);
      
      // Expand the first issue by default if there are selections
      if (data && data.length > 0 && data[0].issue_names && data[0].issue_names.length > 0) {
        setExpandedIssues([data[0].issue_names[0]]);
      }
    } catch (err: any) {
      console.error('Error fetching organization selections:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

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

  const fetchOrganizationStructure = async () => {
    if (!organizationName) return;
    
    try {
      // Fetch sites
      const { data: sitesData } = await supabase
        .from('sites')
        .select('name')
        .eq('organization_name', organizationName)
        .order('name');
      
      // Fetch filiales
      const { data: filialesData } = await supabase
        .from('filiales')
        .select('name')
        .eq('organization_name', organizationName)
        .order('name');
      
      // Fetch filieres
      const { data: filieresData } = await supabase
        .from('filieres')
        .select('name')
        .eq('organization_name', organizationName)
        .order('name');
      
      setSites(sitesData || []);
      setFiliales(filialesData || []);
      setFilieres(filieresData || []);
    } catch (err: any) {
      console.error('Error fetching organization structure:', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError(null);
    setIsCreatingUser(true);

    try {
      // Create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserData.email,
        password: newUserData.password,
        options: {
          data: {
            full_name: `${newUserData.prenom} ${newUserData.nom}`,
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
          nom: newUserData.nom,
          prenom: newUserData.prenom,
          fonction: newUserData.fonction || '----'
        })
        .eq('email', newUserData.email);

      if (userError) {
        console.warn('Warning updating user details:', userError);
      }

      // Update profile with role and organization details
      const profileData: any = {
        role: newUserData.role,
        organization_name: organizationName,
        organization_level: newUserData.organization_level
      };

      // Add specific entity based on level
      if (newUserData.organization_level === 'site' && newUserData.site_name) {
        profileData.site_name = newUserData.site_name;
        profileData.filiale_name = null;
        profileData.filiere_name = null;
      } else if (newUserData.organization_level === 'filiale' && newUserData.filiale_name) {
        profileData.site_name = null;
        profileData.filiale_name = newUserData.filiale_name;
        profileData.filiere_name = null;
      } else if (newUserData.organization_level === 'filiere' && newUserData.filiere_name) {
        profileData.site_name = null;
        profileData.filiale_name = null;
        profileData.filiere_name = newUserData.filiere_name;
      } else if (newUserData.organization_level === 'groupe') {
        profileData.site_name = null;
        profileData.filiale_name = null;
        profileData.filiere_name = null;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('email', newUserData.email);

      if (profileError) throw profileError;

      // Reset form and close modal
      setNewUserData({
        email: '',
        password: '',
        nom: '',
        prenom: '',
        fonction: '',
        role: 'contributeur',
        organization_level: 'site',
        filiere_name: '',
        filiale_name: '',
        site_name: ''
      });
      setShowCreateUserModal(false);
      
      // Refresh users list
      if (organizationName) {
        fetchUsers(organizationName);
      }
      
      setSuccess('Utilisateur créé avec succès');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      console.error('Error creating user:', err);
      setCreateUserError(err.message || 'Erreur lors de la création de l\'utilisateur');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const toggleIssueExpansion = (issueName: string) => {
    setExpandedIssues(prev => 
      prev.includes(issueName)
        ? prev.filter(i => i !== issueName)
        : [...prev, issueName]
    );
  };

  const getIssueIcon = (issueName: string) => {
    // Map issue names to appropriate icons based on their content
    if (issueName.includes('Contexte')) return '🌍';
    if (issueName.includes('Risques')) return '⚠️';
    if (issueName.includes('Parties')) return '👥';
    if (issueName.includes('Leadership')) return '👑';
    if (issueName.includes('Ressources')) return '🔋';
    if (issueName.includes('Compétences')) return '🎓';
    if (issueName.includes('SMé')) return '📊';
    if (issueName.includes('Objectifs')) return '🎯';
    if (issueName.includes('Installations')) return '🏭';
    if (issueName.includes('IPE')) return '📈';
    if (issueName.includes('Revue')) return '🔍';
    if (issueName.includes('NC')) return '🔧';
    return '📝';
  };

  const getCriteriaIcon = (criteriaName: string) => {
    // Map criteria names to appropriate icons based on their content
    if (criteriaName.includes('Contexte')) return '🌐';
    if (criteriaName.includes('Domaine')) return '📍';
    if (criteriaName.includes('SER')) return '📊';
    if (criteriaName.includes('Risques')) return '⚠️';
    if (criteriaName.includes('Parties')) return '👥';
    if (criteriaName.includes('Leadership')) return '👑';
    if (criteriaName.includes('Politique')) return '📜';
    if (criteriaName.includes('Ressources')) return '🔋';
    if (criteriaName.includes('Achats')) return '🛒';
    if (criteriaName.includes('Compétences')) return '🎓';
    if (criteriaName.includes('Communication')) return '📢';
    if (criteriaName.includes('Sensibilisations')) return '💡';
    if (criteriaName.includes('Smé')) return '⚙️';
    if (criteriaName.includes('Processus')) return '🔄';
    if (criteriaName.includes('Informations')) return '📋';
    if (criteriaName.includes('Objectifs')) return '🎯';
    if (criteriaName.includes('Planifications')) return '📅';
    if (criteriaName.includes('Installations')) return '🏭';
    if (criteriaName.includes('Usages')) return '⚡';
    if (criteriaName.includes('Conception')) return '✏️';
    if (criteriaName.includes('IPE')) return '📈';
    if (criteriaName.includes('Données')) return '💾';
    if (criteriaName.includes('Mesure')) return '📏';
    if (criteriaName.includes('Revue')) return '🔍';
    if (criteriaName.includes('Audit')) return '🔎';
    if (criteriaName.includes('NC')) return '❌';
    if (criteriaName.includes('AC')) return '✅';
    if (criteriaName.includes('Amélioration')) return '📈';
    return '📝';
  };

  const getIssueColor = (issueName: string, index: number) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-emerald-500 to-emerald-600',
      'from-purple-500 to-purple-600',
      'from-amber-500 to-amber-600',
      'from-rose-500 to-rose-600',
      'from-cyan-500 to-cyan-600',
      'from-indigo-500 to-indigo-600',
      'from-green-500 to-green-600',
      'from-pink-500 to-pink-600',
      'from-teal-500 to-teal-600',
      'from-orange-500 to-orange-600',
      'from-violet-500 to-violet-600'
    ];
    
    // Use a hash function to get a consistent color for the same issue name
    const hash = issueName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length] || colors[index % colors.length];
  };

  const getIssueLightColor = (issueName: string, index: number) => {
    const colors = [
      'from-blue-50 to-blue-100',
      'from-emerald-50 to-emerald-100',
      'from-purple-50 to-purple-100',
      'from-amber-50 to-amber-100',
      'from-rose-50 to-rose-100',
      'from-cyan-50 to-cyan-100',
      'from-indigo-50 to-indigo-100',
      'from-green-50 to-green-100',
      'from-pink-50 to-pink-100',
      'from-teal-50 to-teal-100',
      'from-orange-50 to-orange-100',
      'from-violet-50 to-violet-100'
    ];
    
    const hash = issueName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length] || colors[index % colors.length];
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

  // Programming data elements
  const programmingElements = [
    {
      id: 1,
      title: "Secteurs, Types d'énergie et Normes",
      description: "Configuration des secteurs d'activité, types d'énergie utilisés et normes applicables",
      icon: Globe,
      color: "blue",
      gradient: "from-blue-600 to-blue-800",
      borderColor: "border-blue-200",
      hoverBg: "hover:bg-blue-50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      action: () => navigate('/secteur-energie')
    },
    {
      id: 2,
      title: "Enjeux et Critères",
      description: "Définition des enjeux énergétiques et critères d'évaluation de la performance",
      icon: TrendingUp,
      color: "emerald",
      gradient: "from-emerald-600 to-emerald-800",
      borderColor: "border-emerald-200",
      hoverBg: "hover:bg-emerald-50",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      action: () => navigate('/enjeux-criteres')
    },
   
    {
      id: 5,
      title: "Contributeurs, validateurs et administrateurs",
      description: "Configuration des rôles et permissions des utilisateurs du système",
      icon: UserCheck,
      color: "teal",
      gradient: "from-teal-600 to-teal-800",
      borderColor: "border-teal-200",
      hoverBg: "hover:bg-teal-50",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
      action: () => navigate('/gestion/users-management')
    }
  ];

  const selectedElementData = programmingElements.find(el => el.id === selectedElement);

  // Render the Secteur Energie content directly when that module is selected
  const renderSecteurEnergieContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement des données...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">Erreur: {error}</p>
          </div>
        </div>
      );
    }

    if (organizationSelections.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune configuration trouvée</h3>
          <p className="text-gray-600 mb-6">
            Votre organisation n'a pas encore configuré de secteur, type d'énergie ou norme.
          </p>
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/operations/sectors')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Configurer maintenant
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {organizationSelections.map((selection) => (
          <motion.div
            key={selection.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="p-11 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selection.organization_name}
                  </h3>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 rounded-full text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-800 font-medium">Configuration active</span>
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Secteur */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Globe className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Secteur d'activité</h4>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-gray-800 font-medium">{selection.sector_name || 'Non défini'}</p>
                </div>
              </div>

              {/* Type d'énergie */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Cog className="w-5 h-5 text-amber-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Type d'énergie</h4>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-gray-800 font-medium">{selection.energy_type_name || 'Non défini'}</p>
                </div>
              </div>

              {/* Normes */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Normes</h4>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200 max-h-40 overflow-y-auto">
                  {selection.standard_names && selection.standard_names.length > 0 ? (
                    <ul className="space-y-2">
                      {selection.standard_names.map((standard, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span className="text-gray-800">{standard}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">Aucune norme sélectionnée</p>
                  )}
                </div>
              </div>
            </div>

            {user?.role === 'admin' && (
              <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => navigate('/operations/sectors', { 
                    state: { 
                      editMode: true,
                      selectionId: selection.id
                    }
                  })}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Modifier la configuration
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    );
  };

  // Render the Enjeux Criteres content directly when that module is selected
  const renderEnjeuxCriteresContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement des données...</p>
        </div>
      );
    }

    if (error) {
      return (
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
      );
    }

    if (organizationSelections.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune configuration trouvée</h3>
          <p className="text-gray-600 mb-6">
            Votre organisation n'a pas encore configuré d'enjeux et de critères.
          </p>
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/operations/issues')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Configurer maintenant
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {organizationSelections.map((selection) => (
          <motion.div
            key={selection.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selection.organization_name}
                  </h3>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 rounded-full text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-800 font-medium">Configuration active</span>
                </div>
              </div>
            </div>

            {/* Filter by standard */}
            {selection.standard_names && selection.standard_names.length > 0 && (
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filtrer par norme:</span>
                  <select
                    value={filterStandard || ''}
                    onChange={(e) => setFilterStandard(e.target.value || null)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Toutes les normes</option>
                    {selection.standard_names.map((standard, idx) => (
                      <option key={idx} value={standard}>{standard}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Enjeux et Critères</h4>
              
              {selection.issue_names && selection.issue_names.length > 0 ? (
                <div className="space-y-4">
                  {selection.issue_names
                    .filter(issue => !filterStandard || true) // TODO: Add actual filtering logic if needed
                    .map((issueName, issueIndex) => (
                      <div 
                        key={issueIndex}
                        className="border border-gray-200 rounded-xl overflow-hidden"
                      >
                        <div 
                          className={`bg-gradient-to-r ${getIssueLightColor(issueName, issueIndex)} p-4 cursor-pointer`}
                          onClick={() => toggleIssueExpansion(issueName)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r ${getIssueColor(issueName, issueIndex)} text-white`}>
                                <span>{getIssueIcon(issueName)}</span>
                              </div>
                              <h5 className="font-medium text-gray-900">{issueName}</h5>
                            </div>
                            {expandedIssues.includes(issueName) ? (
                              <ChevronUp className="w-5 h-5 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                        </div>
                        
                        {expandedIssues.includes(issueName) && (
                          <div className="p-4 bg-white">
                            <h6 className="text-sm font-medium text-gray-700 mb-3">Critères associés:</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {selection.criteria_names
                                .filter(criteriaName => 
                                  // Filter criteria that are relevant to this issue
                                  // This is a simplification - in a real app, you'd have a proper relationship
                                  criteriaName.includes(issueName.split(',')[0]) || 
                                  issueName.includes(criteriaName.split(' ')[0])
                                )
                                .map((criteriaName, criteriaIndex) => (
                                  <div 
                                    key={criteriaIndex}
                                    className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
                                  >
                                    <span className="flex-shrink-0">{getCriteriaIcon(criteriaName)}</span>
                                    <span className="text-gray-800 text-sm">{criteriaName}</span>
                                  </div>
                                ))}
                            </div>
                            
                            {selection.criteria_names.filter(criteriaName => 
                              criteriaName.includes(issueName.split(',')[0]) || 
                              issueName.includes(criteriaName.split(' ')[0])
                            ).length === 0 && (
                              <p className="text-gray-500 italic text-sm">Aucun critère spécifique associé à cet enjeu.</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Aucun enjeu n'a été configuré pour cette organisation.</p>
                </div>
              )}
            </div>

            {user?.role === 'admin' && (
              <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => navigate('/operations/issues', { 
                    state: { 
                      editMode: true,
                      selectionId: selection.id
                    }
                  })}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Modifier la configuration
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    );
  };

  // Render the Users Management content directly when that module is selected
  const renderUsersManagementContent = () => {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Chargement des utilisateurs...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
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
      );
    }

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

    return (
      <div>
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
            
            {user?.role === 'admin_client' && (
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Créer un utilisateur</span>
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
            
            {user?.role === 'admin_client' && (
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Créer un utilisateur
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
                      
                      {user?.role === 'admin_client' && (
                        <span className="text-xs text-gray-500">
                          Géré par admin client
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render content based on selected element
  const renderSelectedContent = () => {
    switch (selectedElement) {
      case 1:
        return renderSecteurEnergieContent();
      case 2:
        return renderEnjeuxCriteresContent();
      case 5:
        return renderUsersManagementContent();
      default:
        const IconToRender = selectedElementData?.icon || Cog;
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <IconToRender className="w-16 h-16 text-gray-400 mr-4" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Module en développement</h3>
                <p className="text-gray-600">Cette fonctionnalité sera bientôt disponible</p>
              </div>
            </div>
          </div>
        );
    }
  };

  if (isLoading && selectedElement !== 1 && selectedElement !== 2 && selectedElement !== 5) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                
                <button
                  onClick={() => navigate('/GestionPage')}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-medium">Retour</span>
                </button>
                
                <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
                
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Données de Programmation</h1>
                    {organization && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Building2 className="w-4 h-4" />
                        <span className="hidden sm:inline">{organization.name}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{organization.city}, {organization.country}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800 font-medium">Configuration Système</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-80 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out`}>
            <div className="flex flex-col h-full">
              {/* Sidebar Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Configuration</h2>
                    <p className="text-sm text-gray-600">Modules de programmation</p>
                  </div>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {programmingElements.map((element, index) => (
                    <motion.button
                      key={element.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                      onClick={() => {
                        setSelectedElement(element.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full text-left p-4 rounded-lg transition-all duration-200 group ${
                        selectedElement === element.id
                          ? `bg-${element.color}-50 border-2 border-${element.color}-200`
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${
                          selectedElement === element.id
                            ? `bg-${element.color}-100`
                            : 'bg-white group-hover:bg-gray-200'
                        }`}>
                          <element.icon className={`w-5 h-5 ${
                            selectedElement === element.id
                              ? `text-${element.color}-600`
                              : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-medium text-sm mb-1 ${
                            selectedElement === element.id ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {element.title}
                          </h3>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            {element.description}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Sidebar Footer */}
              <div className="p-4 border-t border-gray-200">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <List className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Aide</span>
                  </div>
                  <p className="text-xs text-blue-700">
                    Configurez chaque module selon les besoins de votre organisation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Overlay for mobile */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main Content */}
          <div className="flex-1 lg:ml-0">
            <div className="max-w-4xl mx-auto px-6 py-8">
              {renderSelectedContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Create User Modal for Admin Client */}
      {showCreateUserModal && user?.role === 'admin_client' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl relative animate-scaleIn max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowCreateUserModal(false);
                setNewUserData({
                  email: '',
                  password: '',
                  nom: '',
                  prenom: '',
                  fonction: '',
                  role: 'contributeur',
                  organization_level: 'site',
                  filiere_name: '',
                  filiale_name: '',
                  site_name: ''
                });
                setCreateUserError(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Créer un nouvel utilisateur</h2>

            <form onSubmit={handleCreateUser} className="space-y-6">
              {/* Informations de base */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informations personnelles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Mot de passe <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="prenom" className="block text-sm font-medium text-gray-700 mb-1">
                      Prénom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="prenom"
                      value={newUserData.prenom}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, prenom: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                      value={newUserData.nom}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, nom: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="fonction" className="block text-sm font-medium text-gray-700 mb-1">
                      Fonction
                    </label>
                    <input
                      type="text"
                      id="fonction"
                      value={newUserData.fonction}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, fonction: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                      value={newUserData.role}
                      onChange={(e) => setNewUserData(prev => ({ 
                        ...prev, 
                        role: e.target.value as 'contributeur' | 'validateur' | 'admin_client',
                        organization_level: e.target.value === 'admin_client' ? 'groupe' : 'site'
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    >
                      <option value="contributeur">Contributeur</option>
                      <option value="validateur">Validateur</option>
                      <option value="admin_client">Administrateur Client</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="organization_level" className="block text-sm font-medium text-gray-700 mb-1">
                      Niveau d'organisation <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="organization_level"
                      value={newUserData.organization_level}
                      onChange={(e) => setNewUserData(prev => ({ 
                        ...prev, 
                        organization_level: e.target.value as 'site' | 'filiale' | 'filiere' | 'groupe',
                        site_name: '',
                        filiale_name: '',
                        filiere_name: ''
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    >
                      {newUserData.role === 'admin_client' ? (
                        <option value="groupe">Groupe</option>
                      ) : (
                        <>
                          <option value="site">Site</option>
                          {filieres.length > 0 && <option value="filiere">Filière</option>}
                          {filiales.length > 0 && <option value="filiale">Filiale</option>}
                        </>
                      )}
                    </select>
                  </div>

                  {newUserData.organization_level === 'site' && newUserData.role !== 'admin_client' && (
                    <div>
                      <label htmlFor="site_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Site <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="site_name"
                        value={newUserData.site_name}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, site_name: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
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

                  {newUserData.organization_level === 'filiale' && newUserData.role !== 'admin_client' && (
                    <div>
                      <label htmlFor="filiale_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Filiale <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="filiale_name"
                        value={newUserData.filiale_name}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, filiale_name: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
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

                  {newUserData.organization_level === 'filiere' && newUserData.role !== 'admin_client' && (
                    <div>
                      <label htmlFor="filiere_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Filière <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="filiere_name"
                        value={newUserData.filiere_name}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, filiere_name: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
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
                </div>
              </div>

              {createUserError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                  {createUserError}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateUserModal(false);
                    setNewUserData({
                      email: '',
                      password: '',
                      nom: '',
                      prenom: '',
                      fonction: '',
                      role: 'contributeur',
                      organization_level: 'site',
                      filiere_name: '',
                      filiale_name: '',
                      site_name: ''
                    });
                    setCreateUserError(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser || !newUserData.email || !newUserData.password || !newUserData.nom || !newUserData.prenom}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isCreatingUser || !newUserData.email || !newUserData.password || !newUserData.nom || !newUserData.prenom
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700'
                    }
                  `}
                >
                  {isCreatingUser ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Créer l'utilisateur
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default DonneesProgrammationPage;