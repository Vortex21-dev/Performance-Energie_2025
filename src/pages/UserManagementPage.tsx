import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Shield, ArrowLeft, CheckCircle, AlertTriangle, Building2, Building, Factory, Briefcase, Plus, X, Mail, User, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProgressNav from '../components/ProgressNav';

interface User {
  email: string;
  role: string;
  created_at: string;
}

interface ProcessusType {
  code: string;
  name: string;
  description: string | null;
  indicateurs: string[]; // Tableau des codes d'indicateurs
}

interface Organization {
  name: string;
  description: string | null;
  city: string;
  country: string;
}

interface Site {
  name: string;
  address: string;
  city: string;
}

interface Filiale {
  name: string;
  description: string | null;
}

interface Filiere {
  name: string;
  location: string | null;
}

interface OrganizationStructure {
  sites: Site[];
  filiales: Filiale[];
  filieres: Filiere[];
  isComplex: boolean;
}

const UserManagementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'contributeur' | 'validateur' | 'admin_client'>('contributeur');
  const [organizationLevel, setOrganizationLevel] = useState<'site' | 'filiale' | 'filiere' | 'groupe'>('site');
  const [selectedProcessus, setSelectedProcessus] = useState<string[]>([]);
  const [processus, setProcessus] = useState<ProcessusType[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizationStructure, setOrganizationStructure] = useState<OrganizationStructure>({
    sites: [],
    filiales: [],
    filieres: [],
    isComplex: false
  });
  const [selectedEntityName, setSelectedEntityName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [createdProcessus, setCreatedProcessus] = useState<ProcessusType[]>([]);
  const [indicatorProcessus, setIndicatorProcessus] = useState<ProcessusType[]>([]);
  const [allProcessus, setAllProcessus] = useState<ProcessusType[]>([]);
  const [organizationIndicators, setOrganizationIndicators] = useState<string[]>([]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    fullName: '',
    fonction: ''
  });
  const [createUserError, setCreateUserError] = useState<string | null>(null);

  const steps = [
    { name: 'Secteur', status: 'complete' },
    { name: 'Types d\'énergie', status: 'complete' },
    { name: 'Normes / Referentiel', status: 'complete' },
    { name: 'Enjeux', status: 'complete' },
    { name: 'Critères', status: 'complete' },
    { name: 'Indicateurs', status: 'complete' },
    { name: 'Structure', status: 'complete' },
    { name: 'Utilisateurs', status: 'current' }
  ] as const;

  useEffect(() => {
    fetchUsers();
    initializeFromLocationState();
  }, []);

  useEffect(() => {
    if (selectedOrganization) {
      fetchOrganizationStructureAndProcessus(selectedOrganization);
      fetchOrganizationIndicators(selectedOrganization);
    }
  }, [selectedOrganization, createdProcessus, indicatorProcessus]);

  const initializeFromLocationState = () => {
    const state = location.state as {
      organizationName?: string;
      processus?: Array<{
        code: string;
        name: string;
        description: string;
        selectedCriteria: string[];
        selectedIndicators: string[];
      }>;
      indicators?: string[];
    };

    if (state?.organizationName) {
      // Set the created organization as the only available organization
      const createdOrg: Organization = {
        name: state.organizationName,
        description: null,
        city: '',
        country: ''
      };
      setAvailableOrganizations([createdOrg]);
      setSelectedOrganization(state.organizationName);
    }

    if (state?.processus) {
      // Convert the processus from location state to ProcessusType format
      const processusTypes: ProcessusType[] = state.processus.map(p => ({
        code: p.code,
        name: p.name,
        description: p.description,
        indicateurs: p.selectedIndicators || [] // Store the selected indicators
      }));
      setCreatedProcessus(processusTypes);
    }

    // Get indicators from location state to fetch their associated processus
    if (state?.indicators) {
      fetchProcessusFromIndicators(state.indicators);
    }
  };

  const fetchProcessusFromIndicators = async (indicatorNames: string[]) => {
    try {
      // Récupérer tous les processus qui contiennent ces indicateurs dans leur attribut indicateurs
      const { data: processusData, error: processusError } = await supabase
        .from('processus')
        .select('code, name, description, indicateurs')
        .order('name');

      if (processusError) throw processusError;

      // Filtrer les processus qui contiennent au least un des indicateurs sélectionnés
      const relevantProcessus = (processusData || []).filter(processus => {
        if (!processus.indicateurs || processus.indicateurs.length === 0) return false;
        
        // Vérifier si au moins un indicateur du processus est dans la liste des indicateurs sélectionnés
        return processus.indicateurs.some(indicatorCode => 
          indicatorNames.some(selectedName => {
            // Comparer par nom d'indicateur - nous devons récupérer le nom depuis le code
            return selectedName.includes(indicatorCode) || indicatorCode.includes(selectedName);
          })
        );
      });

      setIndicatorProcessus(relevantProcessus);
    } catch (err) {
      console.error('Error fetching processus from indicators:', err);
    }
  };

  const fetchOrganizationIndicators = async (organizationName: string) => {
    try {
      // Récupérer les indicateurs sélectionnés pour cette organisation
      const { data: selectionData, error: selectionError } = await supabase
        .from('organization_selections')
        .select('indicator_names')
        .eq('organization_name', organizationName)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selectionError && selectionError.code !== 'PGRST116') {
        throw selectionError;
      }

      const indicatorNames = selectionData?.indicator_names || [];
      setOrganizationIndicators(indicatorNames);

      // Récupérer les processus associés à ces indicateurs
      if (indicatorNames.length > 0) {
        await fetchProcessusFromOrganizationIndicators(indicatorNames);
      }
    } catch (err) {
      console.error('Error fetching organization indicators:', err);
    }
  };

  const fetchProcessusFromOrganizationIndicators = async (indicatorNames: string[]) => {
    try {
      // Récupérer tous les processus
      const { data: allProcessusData, error: processusError } = await supabase
        .from('processus')
        .select('code, name, description, indicateurs')
        .order('name');

      if (processusError) throw processusError;

      // Récupérer les détails des indicateurs pour faire la correspondance par nom
      const { data: indicatorsData, error: indicatorsError } = await supabase
        .from('indicators')
        .select('code, name')
        .in('name', indicatorNames);

      if (indicatorsError) throw indicatorsError;

      // Créer un map des noms d'indicateurs vers leurs codes
      const indicatorNameToCode = new Map<string, string>();
      indicatorsData?.forEach(indicator => {
        indicatorNameToCode.set(indicator.name, indicator.code);
      });

      // Filtrer les processus qui contiennent au moins un des indicateurs sélectionnés
      const relevantProcessus = (allProcessusData || []).filter(processus => {
        if (!processus.indicateurs || processus.indicateurs.length === 0) return false;
        
        // Vérifier si au moins un indicateur du processus correspond aux indicateurs sélectionnés
        return processus.indicateurs.some(indicatorCode => {
          // Vérifier si ce code d'indicateur correspond à un des indicateurs sélectionnés
          return indicatorNames.some(selectedName => {
            const selectedCode = indicatorNameToCode.get(selectedName);
            return selectedCode === indicatorCode;
          });
        });
      });

      // Convertir au format ProcessusType avec les indicateurs associés
      const processusTypes: ProcessusType[] = relevantProcessus.map(processus => ({
        code: processus.code,
        name: processus.name,
        description: processus.description,
        indicateurs: processus.indicateurs || []
      }));

      setIndicatorProcessus(processusTypes);
    } catch (err) {
      console.error('Error fetching processus from organization indicators:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email, created_at');

      if (error) throw error;
      
      // Get profiles for each user to get their roles
      const usersWithRoles = [];
      for (const user of data || []) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('email', user.email)
          .single();
          
        if (profileError && profileError.code !== 'PGRST116') {
          console.error(`Error fetching profile for ${user.email}:`, profileError);
        }
        
        usersWithRoles.push({
          ...user,
          role: profileData?.role || 'contributeur'
        });
      }
      
      setUsers(usersWithRoles);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrganizationStructureAndProcessus = async (organizationName: string) => {
    try {
      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('name, description, city, country')
        .eq('name', organizationName)
        .single();
        
      if (orgError) throw orgError;
      setOrganization(orgData);

      // Determine if this is a complex organization by checking for filieres and filiales
      const { data: filieresData } = await supabase
        .from('filieres')
        .select('name, location, manager')
        .eq('organization_name', organizationName);
      
      const { data: filialesData } = await supabase
        .from('filiales')
        .select('name, description')
        .eq('organization_name', organizationName);
      
      const { data: sitesData } = await supabase
        .from('sites')
        .select('name, address, city')
        .eq('organization_name', organizationName);
      
      const isComplex = (filieresData && filieresData.length > 0) || 
                        (filialesData && filialesData.length > 0);
      
      setOrganizationStructure({
        sites: sitesData || [],
        filiales: filialesData || [],
        filieres: filieresData || [],
        isComplex: isComplex
      });
      
      // Use the created processus from location state if available, otherwise fetch from database
      if (createdProcessus.length > 0) {
        // Combine created processus and indicator processus (from organization indicators), removing duplicates
        const combinedProcessus = [...createdProcessus];
        
        // Add indicator processus that are not already in created processus
        indicatorProcessus.forEach(indProc => {
          if (!combinedProcessus.find(cp => cp.code === indProc.code)) {
            combinedProcessus.push(indProc);
          }
        });
        
        setProcessus(combinedProcessus);
        setAllProcessus(combinedProcessus);
      } else {
        // Use indicator processus from organization indicators
        const combinedProcessus = [...indicatorProcessus];
        
        // Also add any processus from location state indicators if available
        indicatorProcessus.forEach(indProc => {
          if (!combinedProcessus.find(cp => cp.code === indProc.code)) {
            combinedProcessus.push(indProc);
          }
        });
        
        setProcessus(combinedProcessus);
        setAllProcessus(combinedProcessus);
      }
    } catch (err) {
      console.error('Error fetching organization structure and processus:', err);
      setError('Erreur lors du chargement de la structure de l\'organisation');
    }
  };

  const handleUserSelect = (email: string) => {
    setSelectedUser(email);
    setUserRole('contributeur');
    setOrganizationLevel('site');
    setSelectedProcessus([]);
    setSelectedEntityName('');
  };

  const handleRoleChange = (role: 'contributeur' | 'validateur' | 'admin_client') => {
    setUserRole(role);
    
    // Reset organization level based on role and company type
    if (role === 'contributeur') {
      setOrganizationLevel('site');
    } else if (role === 'validateur') {
      setOrganizationLevel('site');
    } else if (role === 'admin_client') {
      if (organizationStructure.isComplex) {
        setOrganizationLevel('groupe');
      } else {
        setOrganizationLevel('groupe');
      }
    }
    
    // Reset selected entity
    setSelectedEntityName('');
    
    // Clear selected processus for admin_client
    if (role === 'admin_client') {
      setSelectedProcessus([]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Update user's role and organization level in profiles
      const updateData: any = {
        role: userRole,
        organization_level: organizationLevel,
        organization_name: selectedOrganization || null
      };
      
      // Add the specific entity name based on the level
      if (organizationLevel === 'site' && selectedEntityName) {
        updateData.site_name = selectedEntityName;
        updateData.filiale_name = null;
        updateData.filiere_name = null;
      } else if (organizationLevel === 'filiale' && selectedEntityName) {
        updateData.site_name = null;
        updateData.filiale_name = selectedEntityName;
        updateData.filiere_name = null;
      } else if (organizationLevel === 'filiere' && selectedEntityName) {
        updateData.site_name = null;
        updateData.filiale_name = null;
        updateData.filiere_name = selectedEntityName;
      } else if (organizationLevel === 'groupe') {
        updateData.site_name = null;
        updateData.filiale_name = null;
        updateData.filiere_name = null;
      }
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('email', selectedUser);

      if (profileError) throw profileError;

      // Only handle processus assignments for contributeur and validateur
      if (userRole !== 'admin_client') {
        // Delete existing processus assignments
        const { error: deleteError } = await supabase
          .from('user_processus')
          .delete()
          .eq('email', selectedUser);

        if (deleteError) throw deleteError;

        // Insert new processus assignments using upsert to handle duplicates
        if (selectedProcessus.length > 0) {
          const processusAssignments = selectedProcessus.map(processCode => ({
            email: selectedUser,
            processus_code: processCode
          }));

          const { error: upsertError } = await supabase
            .from('user_processus')
            .upsert(processusAssignments, {
              onConflict: 'email,processus_code',
              ignoreDuplicates: true
            });

          if (upsertError) throw upsertError;
        }
      }

      // Reset form
      setSelectedUser(null);
      setUserRole('contributeur');
      setOrganizationLevel('site');
      setSelectedProcessus([]);
      setSelectedEntityName('');

      // Refresh users list
      fetchUsers();
    } catch (err) {
      console.error('Error saving user configuration:', err);
      setError('Erreur lors de la sauvegarde de la configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError(null);
    setIsSubmitting(true);

    try {
      // Create the auth user - the database triggers will handle creating the user and profile records
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserData.email,
        password: newUserData.password,
        options: {
          data: {
            full_name: newUserData.fullName,
            fonction: newUserData.fonction,
          },
        },
      });

      if (authError) throw authError;

      // Wait a moment for the triggers to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update the user record with additional information if needed
      if (newUserData.fullName || newUserData.fonction) {
        const nameParts = newUserData.fullName.split(' ');
        const { error: updateError } = await supabase
          .from('users')
          .update({
            nom: nameParts[0] || 'Nouvel',
            prenom: nameParts.slice(1).join(' ') || 'Utilisateur',
            fonction: newUserData.fonction || '----'
          })
          .eq('email', newUserData.email);

        if (updateError) {
          console.warn('Warning updating user details:', updateError);
          // Don't throw here as the user was created successfully
        }
      }

      // Reset form and close modal
      setNewUserData({
        email: '',
        password: '',
        fullName: '',
        fonction: ''
      });
      setShowCreateUserModal(false);
      
      // Refresh users list
      fetchUsers();
    } catch (err: any) {
      console.error('Error creating user:', err);
      setCreateUserError(err.message || 'Erreur lors de la création de l\'utilisateur');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get available organization levels based on role and company type
  const getAvailableLevels = () => {
    if (userRole === 'contributeur') {
      return [
        { value: 'site', icon: Factory, label: 'Site' }
      ];
    } else if (userRole === 'validateur') {
      if (organizationStructure.isComplex) {
        return [
          { value: 'site', icon: Factory, label: 'Site' },
          { value: 'filiale', icon: Building, label: 'Filiale' },
          { value: 'filiere', icon: Building2, label: 'Filière' }
        ];
      } else {
        return [
          { value: 'site', icon: Factory, label: 'Site' }
        ];
      }
    } else { // admin_client
      if (organizationStructure.isComplex) {
        return [
          { value: 'groupe', icon: Briefcase, label: 'Groupe' },
          { value: 'filiale', icon: Building, label: 'Filiale' },
          { value: 'filiere', icon: Building2, label: 'Filière' }
        ];
      } else {
        return [
          { value: 'groupe', icon: Briefcase, label: 'Groupe' }
        ];
      }
    }
  };

  // Get entities based on selected level
  const getEntitiesForLevel = () => {
    switch (organizationLevel) {
      case 'site':
        return organizationStructure.sites;
      case 'filiale':
        return organizationStructure.filiales;
      case 'filiere':
        return organizationStructure.filieres;
      default:
        return [];
    }
  };

  // Get entity name field based on level
  const getEntityNameField = () => {
    switch (organizationLevel) {
      case 'site':
      case 'filiale':
      case 'filiere':
        return 'name';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </button>
        </div>

        <ProgressNav steps={steps} />

        <div className="flex justify-end mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <UserPlus size={20} />
              <span>Créer un utilisateur</span>
            </button>
            
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <CheckCircle size={20} />
              <span className="font-medium">Terminer</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Users List */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Utilisateurs</h2>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                users.map((user) => (
                  <div
                    key={user.email}
                    onClick={() => handleUserSelect(user.email)}
                    className={`
                      p-4 rounded-lg cursor-pointer transition-all duration-200
                      ${selectedUser === user.email
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{user.email}</p>
                        <p className="text-sm text-gray-500">
                          Créé le {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {selectedUser === user.email && (
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Configuration */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-50 rounded-lg">
                <Shield className="w-6 h-6 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Configuration</h2>
            </div>

            {selectedUser ? (
              <div className="space-y-6">
                {/* Organization Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organisation
                  </label>
                  {availableOrganizations.length === 1 ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                      <span className="text-gray-900 font-medium">{availableOrganizations[0].name}</span>
                      <span className="text-gray-500 text-sm ml-2">
                        {availableOrganizations[0].city && availableOrganizations[0].country 
                          ? `- ${availableOrganizations[0].city}, ${availableOrganizations[0].country}`
                          : '(Organisation créée)'
                        }
                      </span>
                    </div>
                  ) : (
                    <select
                      value={selectedOrganization}
                      onChange={(e) => setSelectedOrganization(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez une organisation</option>
                      {availableOrganizations.map((org) => (
                        <option key={org.name} value={org.name}>
                          {org.name} - {org.city}, {org.country}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Organization Section */}
                {organization && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-medium text-gray-800 mb-2">Organisation</h3>
                    <p className="text-gray-600">{organization.name}</p>
                    <p className="text-sm text-gray-500">{organization.city}, {organization.country}</p>
                  </div>
                )}

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rôle
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['contributeur', 'validateur', 'admin_client'] as const).map((role) => (
                      <button
                        key={role}
                        onClick={() => handleRoleChange(role)}
                        className={`
                          p-3 rounded-lg border-2 transition-all duration-200
                          ${userRole === role
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }
                        `}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Organization Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Niveau d'organisation
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {getAvailableLevels().map(({ value, icon: Icon, label }) => (
                      <button
                        key={value}
                        onClick={() => {
                          setOrganizationLevel(value);
                          setSelectedEntityName('');
                        }}
                        className={`
                          p-3 rounded-lg border-2 transition-all duration-200
                          flex items-center gap-2 justify-center
                          ${organizationLevel === value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Entity Selection - Only show if not 'groupe' level */}
                {organizationLevel !== 'groupe' && getEntitiesForLevel().length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {organizationLevel === 'site' ? 'Site' : 
                       organizationLevel === 'filiale' ? 'Filiale' : 'Filière'}
                    </label>
                    <select
                      value={selectedEntityName}
                      onChange={(e) => setSelectedEntityName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez {organizationLevel === 'site' ? 'un site' : 
                                                    organizationLevel === 'filiale' ? 'une filiale' : 'une filière'}</option>
                      {getEntitiesForLevel().map((entity: any) => (
                        <option key={entity[getEntityNameField()]} value={entity[getEntityNameField()]}>
                          {entity[getEntityNameField()]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Process Selection - Only show if not admin_client */}
                {userRole !== 'admin_client' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Processus assignés ({organizationIndicators.length > 0 ? 'basés sur les indicateurs sélectionnés' : 'aucun indicateur sélectionné'})
                    </label>
                    {organizationIndicators.length > 0 && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700">
                          <strong>Indicateurs de l'organisation :</strong> {organizationIndicators.slice(0, 3).join(', ')}
                          {organizationIndicators.length > 3 && ` et ${organizationIndicators.length - 3} autres...`}
                        </p>
                      </div>
                    )}
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {processus.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p>Aucun processus disponible.</p>
                          {organizationIndicators.length === 0 && (
                            <p className="text-xs mt-2">L'organisation doit d'abord sélectionner des indicateurs.</p>
                          )}
                        </div>
                      ) : (
                        processus.map((process) => (
                        <div
                          key={process.code}
                          onClick={() => {
                            setSelectedProcessus(prev =>
                              prev.includes(process.code)
                                ? prev.filter(p => p !== process.code)
                                : [...prev, process.code]
                            );
                          }}
                          className={`
                            p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                            ${selectedProcessus.includes(process.code)
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{process.name}</p>
                              {process.description && (
                                <p className="text-sm text-gray-500">{process.description}</p>
                              )}
                              {process.indicateurs && process.indicateurs.length > 0 ? (
                                <p className="text-xs text-blue-600 mt-1">
                                 
                                </p>
                              ) : (
                                <p className="text-xs text-gray-400 mt-1">Aucun indicateur associé</p>
                              )}
                            </div>
                            {selectedProcessus.includes(process.code) && (
                              <CheckCircle className="w-5 h-5 text-purple-500" />
                            )}
                          </div>
                        </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !selectedOrganization || (organizationLevel !== 'groupe' && !selectedEntityName)}
                  className={`
                    w-full px-4 py-2 rounded-lg transition-colors
                    ${isSubmitting || !selectedOrganization || (organizationLevel !== 'groupe' && !selectedEntityName)
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600'
                    }
                  `}
                >
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer la configuration'}
                </button>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
                    <AlertTriangle className="inline-block mr-2 h-5 w-5" />
                    {error}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Sélectionnez un utilisateur pour configurer son rôle
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative animate-scaleIn">
            <button
              onClick={() => setShowCreateUserModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Créer un nouvel utilisateur</h2>

            <form onSubmit={handleCreateUser}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    value={newUserData.fullName}
                    onChange={(e) => setNewUserData({...newUserData, fullName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    value={newUserData.fonction}
                    onChange={(e) => setNewUserData({...newUserData, fonction: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {createUserError && (
                  <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                    {createUserError}
                  </div>
                )}

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateUserModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newUserData.email || !newUserData.password || !newUserData.fullName}
                    className={`
                      px-4 py-2 rounded-lg text-white
                      transition-all duration-200
                      ${isSubmitting || !newUserData.email || !newUserData.password || !newUserData.fullName
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600'
                      }
                    `}
                  >
                    {isSubmitting ? 'Création en cours...' : 'Créer l\'utilisateur'}
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

export default UserManagementPage;