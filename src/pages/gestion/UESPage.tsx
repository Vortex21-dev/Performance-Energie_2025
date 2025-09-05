import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Zap,
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
  BarChart3,
  Lightbulb,
  Thermometer,
  Cpu,
  Fan,
  Plug,
  HelpCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Equipment {
  id: string;
  organization_name: string;
  name: string;
  type: string;
  power: number;
  unit: string;
  location: string;
  usage_hours: number;
  is_significant: boolean;
  tranche: string;
  created_at: string;
  updated_at: string;
}

interface Tranche {
  id: string;
  organization_name: string;
  name: string;
  description: string;
  threshold: number;
  color: string;
  created_at: string;
  updated_at: string;
}

const UESPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Equipment form state
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [isEditingEquipment, setIsEditingEquipment] = useState(false);
  const [currentEquipment, setCurrentEquipment] = useState<Equipment | null>(null);
  const [equipmentFormData, setEquipmentFormData] = useState({
    name: '',
    type: 'lighting',
    power: 0,
    unit: 'kW',
    location: '',
    usage_hours: 0,
    is_significant: false,
    tranche: ''
  });
  
  // Tranche form state
  const [showTrancheModal, setShowTrancheModal] = useState(false);
  const [isEditingTranche, setIsEditingTranche] = useState(false);
  const [currentTranche, setCurrentTranche] = useState<Tranche | null>(null);
  const [trancheFormData, setTrancheFormData] = useState({
    name: '',
    description: '',
    threshold: 0,
    color: '#22c55e'
  });
  
  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [significantFilter, setSignificantFilter] = useState<string>('all');
  const [trancheFilter, setTrancheFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_client';
  
  useEffect(() => {
    fetchUserOrganization();
  }, [user]);
  
  useEffect(() => {
    if (organizationName) {
      fetchEquipment();
      fetchTranches();
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
  
  const fetchEquipment = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('organization_name', organizationName)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setEquipment(data || []);
    } catch (err: any) {
      console.error('Error fetching equipment:', err);
      setError('Erreur lors du chargement des équipements');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchTranches = async () => {
    try {
      const { data, error } = await supabase
        .from('tranches')
        .select('*')
        .eq('organization_name', organizationName)
        .order('threshold', { ascending: false });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Create default tranches if none exist
        await createDefaultTranches();
        fetchTranches();
      } else {
        setTranches(data);
      }
    } catch (err: any) {
      console.error('Error fetching tranches:', err);
      setError('Erreur lors du chargement des tranches');
    }
  };
  
  const createDefaultTranches = async () => {
    if (!organizationName) return;
    
    try {
      const defaultTranches = [
        {
          organization_name: organizationName,
          name: 'Élevé',
          description: 'Usage énergétique très significatif',
          threshold: 5000,
          color: '#ef4444' // red-500
        },
        {
          organization_name: organizationName,
          name: 'Moyen',
          description: 'Usage énergétique moyennement significatif',
          threshold: 1000,
          color: '#f59e0b' // amber-500
        },
        {
          organization_name: organizationName,
          name: 'Faible',
          description: 'Usage énergétique peu significatif',
          threshold: 0,
          color: '#22c55e' // green-500
        }
      ];
      
      const { error } = await supabase
        .from('tranches')
        .insert(defaultTranches);
      
      if (error) throw error;
    } catch (err: any) {
      console.error('Error creating default tranches:', err);
      setError('Erreur lors de la création des tranches par défaut');
    }
  };
  
  const handleEquipmentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEquipmentFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'number') {
      setEquipmentFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setEquipmentFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleTrancheInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setTrancheFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setTrancheFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleEquipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const equipmentData = {
        organization_name: organizationName,
        name: equipmentFormData.name,
        type: equipmentFormData.type,
        power: equipmentFormData.power,
        unit: equipmentFormData.unit,
        location: equipmentFormData.location,
        usage_hours: equipmentFormData.usage_hours,
        is_significant: equipmentFormData.is_significant,
        tranche: equipmentFormData.tranche
      };
      
      let result;
      
      if (isEditingEquipment && currentEquipment) {
        // Update existing equipment
        result = await supabase
          .from('equipment')
          .update(equipmentData)
          .eq('id', currentEquipment.id);
      } else {
        // Insert new equipment
        result = await supabase
          .from('equipment')
          .insert([equipmentData]);
      }
      
      if (result.error) throw result.error;
      
      // Reset form and close modal
      resetEquipmentForm();
      setShowEquipmentModal(false);
      
      // Show success message
      setSuccess(isEditingEquipment 
        ? 'Équipement modifié avec succès' 
        : 'Équipement ajouté avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchEquipment();
    } catch (err: any) {
      console.error('Error saving equipment:', err);
      setError('Erreur lors de l\'enregistrement de l\'équipement');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleTrancheSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const trancheData = {
        organization_name: organizationName,
        name: trancheFormData.name,
        description: trancheFormData.description,
        threshold: trancheFormData.threshold,
        color: trancheFormData.color
      };
      
      let result;
      
      if (isEditingTranche && currentTranche) {
        // Update existing tranche
        result = await supabase
          .from('tranches')
          .update(trancheData)
          .eq('id', currentTranche.id);
      } else {
        // Insert new tranche
        result = await supabase
          .from('tranches')
          .insert([trancheData]);
      }
      
      if (result.error) throw result.error;
      
      // Reset form and close modal
      resetTrancheForm();
      setShowTrancheModal(false);
      
      // Show success message
      setSuccess(isEditingTranche 
        ? 'Tranche modifiée avec succès' 
        : 'Tranche ajoutée avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchTranches();
    } catch (err: any) {
      console.error('Error saving tranche:', err);
      setError('Erreur lors de l\'enregistrement de la tranche');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEditEquipment = (equipment: Equipment) => {
    setCurrentEquipment(equipment);
    setEquipmentFormData({
      name: equipment.name,
      type: equipment.type,
      power: equipment.power,
      unit: equipment.unit,
      location: equipment.location,
      usage_hours: equipment.usage_hours,
      is_significant: equipment.is_significant,
      tranche: equipment.tranche
    });
    setIsEditingEquipment(true);
    setShowEquipmentModal(true);
  };
  
  const handleEditTranche = (tranche: Tranche) => {
    setCurrentTranche(tranche);
    setTrancheFormData({
      name: tranche.name,
      description: tranche.description,
      threshold: tranche.threshold,
      color: tranche.color
    });
    setIsEditingTranche(true);
    setShowTrancheModal(true);
  };
  
  const handleDeleteEquipment = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet équipement ?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Show success message
      setSuccess('Équipement supprimé avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchEquipment();
    } catch (err: any) {
      console.error('Error deleting equipment:', err);
      setError('Erreur lors de la suppression de l\'équipement');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteTranche = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tranche ? Les équipements associés à cette tranche seront affectés.')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('tranches')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Show success message
      setSuccess('Tranche supprimée avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchTranches();
      fetchEquipment();
    } catch (err: any) {
      console.error('Error deleting tranche:', err);
      setError('Erreur lors de la suppression de la tranche');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetEquipmentForm = () => {
    setEquipmentFormData({
      name: '',
      type: 'lighting',
      power: 0,
      unit: 'kW',
      location: '',
      usage_hours: 0,
      is_significant: false,
      tranche: ''
    });
    setCurrentEquipment(null);
    setIsEditingEquipment(false);
  };
  
  const resetTrancheForm = () => {
    setTrancheFormData({
      name: '',
      description: '',
      threshold: 0,
      color: '#22c55e'
    });
    setCurrentTranche(null);
    setIsEditingTranche(false);
  };
  
  const getEquipmentIcon = (type: string) => {
    switch (type) {
      case 'lighting':
        return <Lightbulb className="w-5 h-5 text-yellow-500" />;
      case 'hvac':
        return <Thermometer className="w-5 h-5 text-blue-500" />;
      case 'computing':
        return <Cpu className="w-5 h-5 text-purple-500" />;
      case 'motors':
        return <Fan className="w-5 h-5 text-green-500" />;
      case 'other':
        return <Plug className="w-5 h-5 text-gray-500" />;
      default:
        return <Zap className="w-5 h-5 text-amber-500" />;
    }
  };
  
  const getEquipmentTypeName = (type: string) => {
    switch (type) {
      case 'lighting':
        return 'Éclairage';
      case 'hvac':
        return 'Climatisation/Chauffage';
      case 'computing':
        return 'Informatique';
      case 'motors':
        return 'Moteurs/Machines';
      case 'other':
        return 'Autre';
      default:
        return type;
    }
  };
  
  const getTrancheColor = (trancheName: string) => {
    const tranche = tranches.find(t => t.name === trancheName);
    return tranche?.color || '#22c55e';
  };
  
  const getTrancheForPower = (power: number, hours: number) => {
    const annualConsumption = power * hours;
    const sortedTranches = [...tranches].sort((a, b) => b.threshold - a.threshold);
    
    for (const tranche of sortedTranches) {
      if (annualConsumption >= tranche.threshold) {
        return tranche.name;
      }
    }
    
    return sortedTranches[sortedTranches.length - 1]?.name || '';
  };
  
  const calculateAnnualConsumption = (power: number, hours: number) => {
    return power * hours;
  };
  
  const filteredEquipment = equipment.filter(eq => {
    // Apply type filter
    if (typeFilter !== 'all' && eq.type !== typeFilter) {
      return false;
    }
    
    // Apply significant filter
    if (significantFilter === 'significant' && !eq.is_significant) {
      return false;
    } else if (significantFilter === 'not-significant' && eq.is_significant) {
      return false;
    }
    
    // Apply tranche filter
    if (trancheFilter !== 'all' && eq.tranche !== trancheFilter) {
      return false;
    }
    
    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        eq.name.toLowerCase().includes(searchLower) ||
        eq.location.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });
  
  // Group equipment by tranche
  const equipmentByTranche = filteredEquipment.reduce((acc, eq) => {
    if (!acc[eq.tranche]) {
      acc[eq.tranche] = [];
    }
    acc[eq.tranche].push(eq);
    return acc;
  }, {} as Record<string, Equipment[]>);
  
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
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Zap className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Usages Énergétiques Significatifs (UES)</h1>
                  {organizationName && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4" />
                      <span>{organizationName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <FileText className="w-4 h-4 text-amber-600" />
              <span className="text-amber-800 font-medium">Système</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl">
            Identifiez et gérez vos Usages Énergétiques Significatifs (UES). Les UES sont les équipements, systèmes ou processus 
            qui ont un impact important sur votre consommation énergétique et offrent un potentiel d'amélioration significatif.
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
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="all">Tous les types</option>
                  <option value="lighting">Éclairage</option>
                  <option value="hvac">Climatisation/Chauffage</option>
                  <option value="computing">Informatique</option>
                  <option value="motors">Moteurs/Machines</option>
                  <option value="other">Autre</option>
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <div className="relative">
                <select
                  value={significantFilter}
                  onChange={(e) => setSignificantFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="all">Tous les équipements</option>
                  <option value="significant">UES uniquement</option>
                  <option value="not-significant">Non UES uniquement</option>
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              
              <div className="relative">
                <select
                  value={trancheFilter}
                  onChange={(e) => setTrancheFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="all">Toutes les tranches</option>
                  {tranches.map((tranche) => (
                    <option key={tranche.id} value={tranche.name}>{tranche.name}</option>
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
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>
            
            {isAdmin && (
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    resetTrancheForm();
                    setShowTrancheModal(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Ajouter une tranche</span>
                </button>
                
                <button
                  onClick={() => {
                    resetEquipmentForm();
                    setShowEquipmentModal(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Ajouter un équipement</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tranches Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tranches</h2>
          
          {isLoading && tranches.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : tranches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Aucune tranche définie. Veuillez créer des tranches pour classifier vos équipements.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tranches.map((tranche) => (
                <div
                  key={tranche.id}
                  className="p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                  style={{ borderLeftWidth: '4px', borderLeftColor: tranche.color }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{tranche.name}</h3>
                      <p className="text-sm text-gray-500">{tranche.description}</p>

                    </div>
                    {isAdmin && (
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEditTranche(tranche)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTranche(tranche.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Équipements: {equipmentByTranche[tranche.name]?.length || 0}</span>
                      <span>
                        {equipmentByTranche[tranche.name]?.filter(e => e.is_significant).length || 0} UES
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                      <div 
                        className="h-full rounded-full" 
                        style={{ 
                          width: `${equipmentByTranche[tranche.name]?.length ? 100 : 0}%`,
                          backgroundColor: tranche.color
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Equipment List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-amber-100">
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-lg mr-3">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Équipements et UES</h2>
            </div>
          </div>
          
          <div className="p-6">
            {isLoading && equipment.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader className="w-8 h-8 animate-spin text-amber-500" />
              </div>
            ) : filteredEquipment.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucun équipement trouvé. {isAdmin ? "Ajoutez des équipements pour identifier vos UES." : ""}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Équipement
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Puissance
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utilisation
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conso. annuelle
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tranche
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        UES
                      </th>
                      {isAdmin && (
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEquipment.map((eq) => (
                      <tr key={eq.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-gray-100">
                              {getEquipmentIcon(eq.type)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{eq.name}</div>
                              <div className="text-sm text-gray-500">{eq.location}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{getEquipmentTypeName(eq.type)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{eq.power} {eq.unit}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{eq.usage_hours} h/an</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {calculateAnnualConsumption(eq.power, eq.usage_hours)} kWh/an
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span 
                            className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                            style={{ 
                              backgroundColor: `${getTrancheColor(eq.tranche)}20`, // 20% opacity
                              color: getTrancheColor(eq.tranche)
                            }}
                          >
                            {eq.tranche}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            eq.is_significant 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {eq.is_significant ? 'Oui' : 'Non'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleEditEquipment(eq)}
                                className="text-indigo-600 hover:text-indigo-900 transition-colors"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteEquipment(eq.id)}
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
              <h3 className="text-sm font-medium text-blue-800">Qu'est-ce qu'un Usage Énergétique Significatif (UES) ?</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Un Usage Énergétique Significatif (UES) est un usage énergétique qui représente une consommation substantielle 
                  d'énergie et/ou qui offre un potentiel considérable d'amélioration de la performance énergétique.
                </p>
                <p className="mt-2">
                  Les critères pour déterminer un UES peuvent inclure :
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>La consommation énergétique</li>
                  <li>Le potentiel d'économie d'énergie</li>
                  <li>La durée d'utilisation</li>
                  <li>L'impact sur les objectifs énergétiques</li>
                  <li>Les exigences légales et autres</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Equipment Modal */}
      {showEquipmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative animate-scaleIn">
            <button
              onClick={() => {
                setShowEquipmentModal(false);
                resetEquipmentForm();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {isEditingEquipment ? 'Modifier l\'équipement' : 'Ajouter un équipement'}
            </h2>

            <form onSubmit={handleEquipmentSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'équipement <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={equipmentFormData.name}
                  onChange={handleEquipmentInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Type d'équipement <span className="text-red-500">*</span>
                </label>
                <select
                  id="type"
                  name="type"
                  value={equipmentFormData.type}
                  onChange={handleEquipmentInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                >
                  <option value="lighting">Éclairage</option>
                  <option value="hvac">Climatisation/Chauffage</option>
                  <option value="computing">Informatique</option>
                  <option value="motors">Moteurs/Machines</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="power" className="block text-sm font-medium text-gray-700 mb-1">
                    Puissance <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="power"
                    name="power"
                    value={equipmentFormData.power}
                    onChange={handleEquipmentInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                    Unité <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="unit"
                    name="unit"
                    value={equipmentFormData.unit}
                    onChange={handleEquipmentInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value="W">W</option>
                    <option value="kW">kW</option>
                    <option value="MW">MW</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Localisation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={equipmentFormData.location}
                  onChange={handleEquipmentInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="usage_hours" className="block text-sm font-medium text-gray-700 mb-1">
                  Heures d'utilisation par an <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="usage_hours"
                  name="usage_hours"
                  value={equipmentFormData.usage_hours}
                  onChange={handleEquipmentInputChange}
                  min="0"
                  max="8760"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="tranche" className="block text-sm font-medium text-gray-700 mb-1">
                  Tranche <span className="text-red-500">*</span>
                </label>
                <select
                  id="tranche"
                  name="tranche"
                  value={equipmentFormData.tranche}
                  onChange={handleEquipmentInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionnez une tranche</option>
                  {tranches.map((tranche) => (
                    <option key={tranche.id} value={tranche.name}>{tranche.name}</option>
                  ))}
                </select>
                {equipmentFormData.power > 0 && equipmentFormData.usage_hours > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    Consommation annuelle estimée: {calculateAnnualConsumption(equipmentFormData.power, equipmentFormData.usage_hours)} kWh/an
                    <br />
                    Tranche suggérée: {getTrancheForPower(equipmentFormData.power, equipmentFormData.usage_hours)}
                  </p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_significant"
                  name="is_significant"
                  checked={equipmentFormData.is_significant}
                  onChange={(e) => setEquipmentFormData(prev => ({
                    ...prev,
                    is_significant: e.target.checked
                  }))}
                  className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                />
                <label htmlFor="is_significant" className="ml-2 block text-sm text-gray-900">
                  Marquer comme Usage Énergétique Significatif (UES)
                </label>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEquipmentModal(false);
                    resetEquipmentForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !equipmentFormData.name || !equipmentFormData.tranche}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmitting || !equipmentFormData.name || !equipmentFormData.tranche
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-700'
                    }
                  `}
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      {isEditingEquipment ? 'Modification en cours...' : 'Ajout en cours...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      {isEditingEquipment ? 'Modifier' : 'Ajouter'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Tranche Modal */}
      {showTrancheModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative animate-scaleIn">
            <button
              onClick={() => {
                setShowTrancheModal(false);
                resetTrancheForm();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {isEditingTranche ? 'Modifier la tranche' : 'Ajouter une tranche'}
            </h2>

            <form onSubmit={handleTrancheSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la tranche <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={trancheFormData.name}
                  onChange={handleTrancheInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={trancheFormData.description}
                  onChange={handleTrancheInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="threshold" className="block text-sm font-medium text-gray-700 mb-1">
                  Seuil (kWh/an) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="threshold"
                  name="threshold"
                  value={trancheFormData.threshold}
                  onChange={handleTrancheInputChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
                  Couleur <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    id="color"
                    name="color"
                    value={trancheFormData.color}
                    onChange={handleTrancheInputChange}
                    className="h-10 w-10 border-0 rounded p-0"
                  />
                  <input
                    type="text"
                    value={trancheFormData.color}
                    onChange={handleTrancheInputChange}
                    name="color"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowTrancheModal(false);
                    resetTrancheForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !trancheFormData.name}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmitting || !trancheFormData.name
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                    }
                  `}
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      {isEditingTranche ? 'Modification en cours...' : 'Ajout en cours...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      {isEditingTranche ? 'Modifier' : 'Ajouter'}
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

export default UESPage;