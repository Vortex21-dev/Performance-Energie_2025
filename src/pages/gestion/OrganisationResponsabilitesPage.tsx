import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Users,
  Plus,
  Trash2,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Loader,
  Building2,
  UserCheck,
  Filter,
  Download,
  FileText,
  GraduationCap,
  Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Fonction {
  id: string;
  name: string;
}

interface Activite {
  id: string;
  description: string;
}

interface ResponsabiliteType {
  id: string;
  name: string;
  color: string;
  description: string;
}

interface OrganisationResponsabilite {
  id: string;
  organization_name: string;
  fonction_id: string;
  activite_id: string;
  type_responsabilite_id: string;
  created_at: string;
  updated_at: string;
  fonction?: Fonction;
  activite?: Activite;
  type_responsabilite?: ResponsabiliteType;
}

interface Formation {
  id: string;
  organization_name: string;
  theme: string;
  duree: string;
  nombre_participants: number;
  annee: number;
  created_at: string;
  updated_at: string;
}

const OrganisationResponsabilitesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [fonctions, setFonctions] = useState<Fonction[]>([]);
  const [activites, setActivites] = useState<Activite[]>([]);
  const [typesResponsabilite, setTypesResponsabilite] = useState<ResponsabiliteType[]>([]);
  const [responsabilites, setResponsabilites] = useState<OrganisationResponsabilite[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_client';
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedFonction, setSelectedFonction] = useState<string>('');
  const [selectedActivite, setSelectedActivite] = useState<string>('');
  const [selectedTypeResponsabilite, setSelectedTypeResponsabilite] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Formation state
  const [showFormationModal, setShowFormationModal] = useState(false);
  const [formationData, setFormationData] = useState({
    theme: '',
    duree: '',
    nombre_participants: 0,
    annee: new Date().getFullYear()
  });
  
  // Filter state
  const [fonctionFilter, setFonctionFilter] = useState<string | null>(null);
  
  useEffect(() => {
    fetchUserOrganization();
  }, [user]);
  
  useEffect(() => {
    if (organizationName) {
      fetchFonctions();
      fetchActivites();
      fetchTypesResponsabilite();
      fetchResponsabilites();
      fetchFormations();
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
  
  const fetchFonctions = async () => {
    try {
      const { data, error } = await supabase
        .from('fonctions')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Insert default functions if none exist
        await insertDefaultFonctions();
        const { data: newData, error: newError } = await supabase
          .from('fonctions')
          .select('*')
          .order('name');
        
        if (newError) throw newError;
        setFonctions(newData || []);
      } else {
        setFonctions(data);
      }
    } catch (err: any) {
      console.error('Error fetching fonctions:', err);
      setError('Erreur lors du chargement des fonctions');
    }
  };
  
  const insertDefaultFonctions = async () => {
    const defaultFonctions = [
      { name: 'Chef de département C&GR' },
      { name: 'Chargé Qualité' },
      { name: 'DT' },
      { name: 'Chef de service MIT' },
      { name: 'Chef de service MI' },
      { name: 'Chargé Electrotech' },
      { name: 'Chef de service Etude et projet' },
      { name: 'Responsable RH' },
      { name: 'Responsable Comm' },
      { name: 'Chargé Achat' },
      { name: 'Chargé électroméca' },
      { name: 'Chargé Matériel et Logistique' },
      { name: 'Chargé Audit et Méthodes' },
      { name: 'DG/DGA' }
    ];
    
    try {
      const { error } = await supabase
        .from('fonctions')
        .insert(defaultFonctions);
      
      if (error) throw error;
    } catch (err: any) {
      console.error('Error inserting default fonctions:', err);
      throw err;
    }
  };
  
  const fetchActivites = async () => {
    try {
      const { data, error } = await supabase
        .from('activites')
        .select('*')
        .order('description');
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Insert default activities if none exist
        await insertDefaultActivites();
        const { data: newData, error: newError } = await supabase
          .from('activites')
          .select('*')
          .order('description');
        
        if (newError) throw newError;
        setActivites(newData || []);
      } else {
        setActivites(data);
      }
    } catch (err: any) {
      console.error('Error fetching activites:', err);
      setError('Erreur lors du chargement des activités');
    }
  };
  
  const insertDefaultActivites = async () => {
    const defaultActivites = [
      { description: 'Mettre en place le Smé' },
      { description: 'Assurer le bon fonctionnement du Smé et coordonner tout besoin d\'amélioration notamment lors des Comités de Direction Générale et lors de la revue de direction de la performance énergétique' },
      { description: 'Former les acteurs clés' },
      { description: 'Elaborer une Road Mapp Energie' },
      { description: 'Elaborer la Vision, la SER, les objectifs, les cibles, et la politique énergie' },
      { description: 'Elaborer un plan d\'actions de pilotage opérationnel' },
      { description: 'Identifier les équipements, procédés, infrastructures, bâtiments, salles spécialisées, surfaces vitrées' },
      { description: 'Collecter et analyser les données des tableaux de bord et des revues énergétiques' },
      { description: 'Préparer les plans de communication du SMé en collaboration avec le service communication' },
      { description: 'S\'assurer de l\'avancement des plans de mise en conformité et des plan d\'actions correctives et préventives du SMé' },
      { description: 'Réaliser les revues énergétiques et de management du SMÉ' },
      { description: 'Réaliser les audits internes' },
      { description: 'Identifier les gisements d\'économie d\'énergie' },
      { description: 'Sensibiliser les autres acteurs et tranferer les acquis' },
      { description: 'Organiser la certification de tous les périmètres' }
    ];
    
    try {
      const { error } = await supabase
        .from('activites')
        .insert(defaultActivites);
      
      if (error) throw error;
    } catch (err: any) {
      console.error('Error inserting default activites:', err);
      throw err;
    }
  };
  
  const fetchTypesResponsabilite = async () => {
    try {
      const { data, error } = await supabase
        .from('types_responsabilite')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Insert default responsibility types if none exist
        await insertDefaultTypesResponsabilite();
        const { data: newData, error: newError } = await supabase
          .from('types_responsabilite')
          .select('*')
          .order('name');
        
        if (newError) throw newError;
        setTypesResponsabilite(newData || []);
      } else {
        setTypesResponsabilite(data);
      }
    } catch (err: any) {
      console.error('Error fetching types_responsabilite:', err);
      setError('Erreur lors du chargement des types de responsabilité');
    }
  };
  
  const insertDefaultTypesResponsabilite = async () => {
    const defaultTypesResponsabilite = [
      { 
        name: 'Responsable', 
        description: 'Celui qui réalise l\'activité',
        color: '#4ade80' // green-400
      },
      { 
        name: 'Approbateur', 
        description: 'Celui qui approve l\'activité',
        color: '#3b82f6' // blue-500
      },
      { 
        name: 'Consulté', 
        description: 'Celui qui est consulté',
        color: '#f59e0b' // amber-500
      },
      { 
        name: 'Informé', 
        description: 'Celui qui doit être informé',
        color: '#a855f7' // purple-500
      }
    ];
    
    try {
      const { error } = await supabase
        .from('types_responsabilite')
        .insert(defaultTypesResponsabilite);
      
      if (error) throw error;
    } catch (err: any) {
      console.error('Error inserting default types_responsabilite:', err);
      throw err;
    }
  };
  
  const fetchResponsabilites = async () => {
    try {
      setIsLoading(true);
      
      if (!organizationName) {
        setResponsabilites([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('organisation_responsabilites')
        .select(`
          *,
          fonction:fonctions(*),
          activite:activites(*),
          type_responsabilite:types_responsabilite(*)
        `)
        .eq('organization_name', organizationName)
        .order('created_at');
      
      if (error) throw error;
      
      setResponsabilites(data || []);
    } catch (err: any) {
      console.error('Error fetching responsabilites:', err);
      setError('Erreur lors du chargement des responsabilités');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchFormations = async () => {
    try {
      if (!organizationName) {
        setFormations([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('formations')
        .select('*')
        .eq('organization_name', organizationName)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setFormations(data || []);
    } catch (err: any) {
      console.error('Error fetching formations:', err);
      setError('Erreur lors du chargement des formations');
    }
  };
  
  const handleAddResponsabilite = async () => {
    if (!organizationName || !selectedFonction || !selectedActivite || !selectedTypeResponsabilite || !isAdmin) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Check if this combination already exists
      const { data: existingData, error: checkError } = await supabase
        .from('organisation_responsabilites')
        .select('id')
        .eq('organization_name', organizationName)
        .eq('fonction_id', selectedFonction)
        .eq('activite_id', selectedActivite)
        .eq('type_responsabilite_id', selectedTypeResponsabilite)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existingData) {
        setError('Cette combinaison existe déjà');
        return;
      }
      
      const { error } = await supabase
        .from('organisation_responsabilites')
        .insert([{
          organization_name: organizationName,
          fonction_id: selectedFonction,
          activite_id: selectedActivite,
          type_responsabilite_id: selectedTypeResponsabilite
        }]);
      
      if (error) throw error;
      
      // Reset form and close modal
      setSelectedFonction('');
      setSelectedActivite('');
      setSelectedTypeResponsabilite('');
      setShowModal(false);
      
      // Show success message
      setSuccess('Responsabilité ajoutée avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchResponsabilites();
    } catch (err: any) {
      console.error('Error adding responsabilite:', err);
      setError('Erreur lors de l\'ajout de la responsabilité');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteResponsabilite = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette responsabilité ?') || !isAdmin) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('organisation_responsabilites')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Show success message
      setSuccess('Responsabilité supprimée avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchResponsabilites();
    } catch (err: any) {
      console.error('Error deleting responsabilite:', err);
      setError('Erreur lors de la suppression de la responsabilité');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFormationInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormationData(prev => ({
      ...prev,
      [name]: name === 'nombre_participants' || name === 'annee' ? parseInt(value) || 0 : value
    }));
  };
  
  const handleAddFormation = async () => {
    if (!organizationName || !formationData.theme || !formationData.duree || !formationData.nombre_participants || !formationData.annee) {
      setError('Veuillez remplir tous les champs de formation');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const { error } = await supabase
        .from('formations')
        .insert([{
          organization_name: organizationName,
          theme: formationData.theme,
          duree: formationData.duree,
          nombre_participants: formationData.nombre_participants,
          annee: formationData.annee
        }]);
      
      if (error) throw error;
      
      // Reset form and close modal
      setFormationData({
        theme: '',
        duree: '',
        nombre_participants: 0,
        annee: new Date().getFullYear()
      });
      setShowFormationModal(false);
      
      // Show success message
      setSuccess('Competence  ajoutée avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchFormations();
    } catch (err: any) {
      console.error('Error adding formation:', err);
      setError('Erreur lors de l\'ajout de la formation');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteFormation = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette formation ?') || !isAdmin) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('formations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Show success message
      setSuccess('Competence supprimée avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchFormations();
    } catch (err: any) {
      console.error('Error deleting formation:', err);
      setError('Erreur lors de la suppression de la formation');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExportCSV = () => {
    if (responsabilites.length === 0) return;
    
    try {
      // Create matrix data structure
      const fonctionMap = new Map<string, Fonction>();
      const activiteMap = new Map<string, Activite>();
      const matrix: Record<string, Record<string, string>> = {};
      
      // Populate maps for quick lookups
      fonctions.forEach(f => fonctionMap.set(f.id, f));
      activites.forEach(a => activiteMap.set(a.id, a));
      
      // Initialize matrix
      activites.forEach(activite => {
        matrix[activite.id] = {};
        fonctions.forEach(fonction => {
          matrix[activite.id][fonction.id] = '';
        });
      });
      
      // Fill matrix with responsibility types
      responsabilites.forEach(resp => {
        if (resp.fonction_id && resp.activite_id && resp.type_responsabilite?.name) {
          matrix[resp.activite_id][resp.fonction_id] = resp.type_responsabilite.name.charAt(0);
        }
      });
      
      // Create CSV content
      let csvContent = 'Activité / Fonction';
      
      // Add function names as headers
      fonctions.forEach(fonction => {
        csvContent += `,${fonction.name}`;
      });
      csvContent += '\n';
      
      // Add rows
      activites.forEach(activite => {
        csvContent += `"${activite.description}"`;
        fonctions.forEach(fonction => {
          csvContent += `,${matrix[activite.id][fonction.id] || ''}`;
        });
        csvContent += '\n';
      });
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `matrice_raci_${organizationName}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess('Matrice RACI exportée avec succès');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      setError('Erreur lors de l\'exportation de la matrice RACI');
    }
  };
  
  const filteredResponsabilites = fonctionFilter
    ? responsabilites.filter(resp => resp.fonction_id === fonctionFilter)
    : responsabilites;
  
  const groupedByFonction = filteredResponsabilites.reduce((acc, resp) => {
    const fonctionId = resp.fonction_id;
    if (!acc[fonctionId]) {
      acc[fonctionId] = [];
    }
    acc[fonctionId].push(resp);
    return acc;
  }, {} as Record<string, OrganisationResponsabilite[]>);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/gestion/leadership')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Retour</span>
              </button>
              
              <div className="h-6 w-px bg-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserCheck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Organisation et Responsabilités</h1>
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
              <span className="text-blue-800 font-medium">Management</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl">
            Gérez les rôles et responsabilités au sein de votre organisation pour la mise en œuvre et le maintien 
            du système de management énergétique. Cette matrice RACI (Responsable, Approbateur, Consulté, Informé) 
            permet de clarifier qui fait quoi dans votre démarche énergétique.
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
                  value={fonctionFilter || ''}
                  onChange={(e) => setFonctionFilter(e.target.value || null)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Toutes les fonctions</option>
                  {fonctions.map((fonction) => (
                    <option key={fonction.id} value={fonction.id}>
                      {fonction.name}
                    </option>
                  ))}
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <button
                onClick={handleExportCSV}
                disabled={responsabilites.length === 0}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
                  ${responsabilites.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }
                `}
              >
                <Download className="w-5 h-5" />
                <span>Exporter CSV</span>
              </button>
            </div>
            
            <div className="flex space-x-3">
              {isAdmin && (
                <button
                  onClick={() => setShowFormationModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <GraduationCap className="w-5 h-5" />
                  <span>Ajouter une Competence</span>
                </button>
              )}
              
              {isAdmin && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Ajouter une responsabilité</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Formations Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <GraduationCap className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Competences</h2>
            </div>
          </div>
          
          {formations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Aucune competence n'a été ajoutée.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thème
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durée
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre de participants
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Année
                    </th>
                    {isAdmin && (
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formations.map((formation) => (
                    <tr key={formation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formation.theme}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formation.duree}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formation.nombre_participants}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formation.annee}</div>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeleteFormation(formation.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tranches Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Matrice RACI</h2>
          
          {isLoading && responsabilites.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : responsabilites.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Aucune responsabilité définie. Veuillez ajouter des responsabilités pour créer la matrice RACI.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activité
                    </th>
                    {fonctions.map((fonction) => (
                      <th key={fonction.id} scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {fonction.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activites.map((activite) => (
                    <tr key={activite.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {activite.description}
                        </div>
                      </td>
                      {fonctions.map((fonction) => {
                        const resp = responsabilites.find(
                          r => r.fonction_id === fonction.id && r.activite_id === activite.id
                        );
                        
                        return (
                          <td key={fonction.id} className="px-4 py-4 text-center">
                            {resp ? (
                              <div 
                                className="w-8 h-8 mx-auto rounded-full flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: resp.type_responsabilite?.color || '#718096' }}
                                title={resp.type_responsabilite?.description || ''}
                              >
                                {resp.type_responsabilite?.name.charAt(0) || '?'}
                              </div>
                            ) : (
                              <div className="w-8 h-8 mx-auto rounded-full bg-gray-200"></div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Legend */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Légende</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {typesResponsabilite.map((type) => (
                <div key={type.id} className="flex items-center space-x-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: type.color }}
                  >
                    {type.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{type.name}</p>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Responsibility Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative animate-scaleIn">
            <button
              onClick={() => {
                setShowModal(false);
                setSelectedFonction('');
                setSelectedActivite('');
                setSelectedTypeResponsabilite('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Ajouter une responsabilité</h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="fonction" className="block text-sm font-medium text-gray-700 mb-2">
                  Fonction
                </label>
                <select
                  id="fonction"
                  value={selectedFonction}
                  onChange={(e) => setSelectedFonction(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionnez une fonction</option>
                  {fonctions.map((fonction) => (
                    <option key={fonction.id} value={fonction.id}>
                      {fonction.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="activite" className="block text-sm font-medium text-gray-700 mb-2">
                  Activité
                </label>
                <select
                  id="activite"
                  value={selectedActivite}
                  onChange={(e) => setSelectedActivite(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionnez une activité</option>
                  {activites.map((activite) => (
                    <option key={activite.id} value={activite.id}>
                      {activite.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="typeResponsabilite" className="block text-sm font-medium text-gray-700 mb-2">
                  Type de responsabilité
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {typesResponsabilite.map((type) => (
                    <div
                      key={type.id}
                      onClick={() => setSelectedTypeResponsabilite(type.id)}
                      className={`
                        flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200
                        ${selectedTypeResponsabilite === type.id
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        }
                      `}
                    >
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                        style={{ backgroundColor: type.color }}
                      >
                        {type.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{type.name}</p>
                        <p className="text-xs text-gray-500 truncate">{type.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedFonction('');
                    setSelectedActivite('');
                    setSelectedTypeResponsabilite('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleAddResponsabilite}
                  disabled={isSubmitting || !selectedFonction || !selectedActivite || !selectedTypeResponsabilite}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmitting || !selectedFonction || !selectedActivite || !selectedTypeResponsabilite
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                    }
                  `}
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Ajout en cours...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Ajouter
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Formation Modal */}
      {showFormationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative animate-scaleIn">
            <button
              onClick={() => {
                setShowFormationModal(false);
                setFormationData({
                  theme: '',
                  duree: '',
                  nombre_participants: 0,
                  annee: new Date().getFullYear()
                });
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Ajouter une Competence</h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-2">
                  Thème de la formation
                </label>
                <input
                  type="text"
                  id="theme"
                  name="theme"
                  value={formationData.theme}
                  onChange={handleFormationInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: Gestion de l'énergie"
                  required
                />
              </div>

              <div>
                <label htmlFor="duree" className="block text-sm font-medium text-gray-700 mb-2">
                  Durée
                </label>
                <input
                  type="text"
                  id="duree"
                  name="duree"
                  value={formationData.duree}
                  onChange={handleFormationInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: 2 jours, 16 heures"
                  required
                />
              </div>

              <div>
                <label htmlFor="nombre_participants" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de participants
                </label>
                <input
                  type="number"
                  id="nombre_participants"
                  name="nombre_participants"
                  value={formationData.nombre_participants}
                  onChange={handleFormationInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="1"
                  required
                />
              </div>

              <div>
                <label htmlFor="annee" className="block text-sm font-medium text-gray-700 mb-2">
                  Année
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="annee"
                    name="annee"
                    value={formationData.annee}
                    onChange={handleFormationInputChange}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min="2000"
                    max="2100"
                    required
                  />
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowFormationModal(false);
                    setFormationData({
                      theme: '',
                      duree: '',
                      nombre_participants: 0,
                      annee: new Date().getFullYear()
                    });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleAddFormation}
                  disabled={isSubmitting || !formationData.theme || !formationData.duree || !formationData.nombre_participants}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmitting || !formationData.theme || !formationData.duree || !formationData.nombre_participants
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                    }
                  `}
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Ajout en cours...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Ajouter
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganisationResponsabilitesPage;