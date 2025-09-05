import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  BarChart3,
  Save,
  AlertTriangle,
  CheckCircle,
  Loader,
  Building2,
  FileText,
  Zap,
  TrendingUp,
  Calendar,
  Clock,
  Info,
  Lightbulb,
  Battery,
  Gauge,
  Plus,
  Trash2,
  Edit2,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface DemandePeriod {
  id: string;
  organization_name: string;
  period: string;
  year: number;
  peak_demand: number;
  average_demand: number;
  base_demand: number;
  load_factor: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

const DemandeEnergetiquePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [demandePeriods, setDemandePeriods] = useState<DemandePeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state for periods
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [isEditingPeriod, setIsEditingPeriod] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<DemandePeriod | null>(null);
  const [periodFormData, setPeriodFormData] = useState({
    period: '',
    year: new Date().getFullYear(),
    peak_demand: 0,
    average_demand: 0,
    base_demand: 0,
    load_factor: 0,
    notes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_client';
  
  useEffect(() => {
    fetchUserOrganization();
  }, [user]);
  
  useEffect(() => {
    if (organizationName) {
      fetchDemandePeriods();
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
  
  const fetchDemandePeriods = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('demande_energetique_periods')
        .select('*')
        .eq('organization_name', organizationName)
        .order('year', { ascending: false })
        .order('period', { ascending: false });
      
      if (error) throw error;
      
      setDemandePeriods(data || []);
    } catch (err: any) {
      console.error('Error fetching demand periods:', err);
      setError('Erreur lors du chargement des périodes de demande');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePeriodInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'year' || name === 'peak_demand' || name === 'average_demand' || name === 'base_demand' || name === 'load_factor') {
      setPeriodFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setPeriodFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handlePeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const periodData = {
        organization_name: organizationName,
        period: periodFormData.period,
        year: periodFormData.year,
        peak_demand: periodFormData.peak_demand,
        average_demand: periodFormData.average_demand,
        base_demand: periodFormData.base_demand,
        load_factor: periodFormData.load_factor,
        notes: periodFormData.notes
      };
      
      let result;
      
      if (isEditingPeriod && currentPeriod) {
        // Update existing period
        result = await supabase
          .from('demande_energetique_periods')
          .update(periodData)
          .eq('id', currentPeriod.id);
      } else {
        // Insert new period
        result = await supabase
          .from('demande_energetique_periods')
          .insert([periodData]);
      }
      
      if (result.error) throw result.error;
      
      // Reset form and close modal
      resetPeriodForm();
      setShowPeriodModal(false);
      
      // Show success message
      setSuccess(isEditingPeriod 
        ? 'Période modifiée avec succès' 
        : 'Période ajoutée avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchDemandePeriods();
    } catch (err: any) {
      console.error('Error saving period:', err);
      setError('Erreur lors de l\'enregistrement de la période');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEditPeriod = (period: DemandePeriod) => {
    setCurrentPeriod(period);
    setPeriodFormData({
      period: period.period,
      year: period.year,
      peak_demand: period.peak_demand,
      average_demand: period.average_demand,
      base_demand: period.base_demand,
      load_factor: period.load_factor,
      notes: period.notes
    });
    setIsEditingPeriod(true);
    setShowPeriodModal(true);
  };
  
  const handleDeletePeriod = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette période ?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('demande_energetique_periods')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Show success message
      setSuccess('Période supprimée avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchDemandePeriods();
    } catch (err: any) {
      console.error('Error deleting period:', err);
      setError('Erreur lors de la suppression de la période');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetPeriodForm = () => {
    setPeriodFormData({
      period: '',
      year: new Date().getFullYear(),
      peak_demand: 0,
      average_demand: 0,
      base_demand: 0,
      load_factor: 0,
      notes: ''
    });
    setCurrentPeriod(null);
    setIsEditingPeriod(false);
  };
  
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
                  <BarChart3 className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Demande Énergétique</h1>
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
            Analysez et gérez la demande énergétique de votre organisation. Suivez les tendances historiques, 
            identifiez les pics de consommation pour optimiser votre stratégie énergétique.
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

        {/* Historical Demand Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-amber-100 flex justify-between items-center">
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-lg mr-3">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Demande Énergétique Historique</h2>
            </div>
            
            {isAdmin && (
              <button
                onClick={() => {
                  resetPeriodForm();
                  setShowPeriodModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Ajouter une période</span>
              </button>
            )}
          </div>
          
          <div className="p-6">
            {isLoading && demandePeriods.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader className="w-8 h-8 animate-spin text-amber-500" />
              </div>
            ) : demandePeriods.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune donnée historique</h3>
                <p className="text-gray-500 mb-6">
                  Vous n'avez pas encore ajouté de données historiques de demande énergétique.
                </p>
                {isAdmin && (
                  <button
                    onClick={() => {
                      resetPeriodForm();
                      setShowPeriodModal(true);
                    }}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors inline-flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter maintenant
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Période
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Année
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Demande de pointe (kW)
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Demande moyenne (kW)
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Demande de base (kW)
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Facteur de charge (%)
                      </th>
                      {isAdmin && (
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {demandePeriods.map((period) => (
                      <tr key={period.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{period.period}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{period.year}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{period.peak_demand.toLocaleString()} kW</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{period.average_demand.toLocaleString()} kW</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{period.base_demand.toLocaleString()} kW</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{period.load_factor}%</div>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleEditPeriod(period)}
                                className="text-indigo-600 hover:text-indigo-900 transition-colors"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeletePeriod(period.id)}
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
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Comprendre la demande énergétique</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  La demande énergétique représente la puissance électrique requise à un moment donné, mesurée en kilowatts (kW).
                  Comprendre et gérer cette demande est essentiel pour optimiser les coûts énergétiques et planifier les infrastructures.
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong>Demande de pointe</strong> : La puissance maximale requise pendant une période donnée</li>
                  <li><strong>Demande moyenne</strong> : La puissance moyenne requise pendant une période</li>
                  <li><strong>Demande de base</strong> : La puissance minimale requise en permanence</li>
                  <li><strong>Facteur de charge</strong> : Le ratio entre la demande moyenne et la demande de pointe, exprimé en pourcentage</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Period Modal */}
      {showPeriodModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative animate-scaleIn">
            <button
              onClick={() => {
                setShowPeriodModal(false);
                resetPeriodForm();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {isEditingPeriod ? 'Modifier la période' : 'Ajouter une période'}
            </h2>

            <form onSubmit={handlePeriodSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-1">
                    Période <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="period"
                    name="period"
                    value={periodFormData.period}
                    onChange={handlePeriodInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionner</option>
                    <option value="Janvier">Janvier</option>
                    <option value="Février">Février</option>
                    <option value="Mars">Mars</option>
                    <option value="Avril">Avril</option>
                    <option value="Mai">Mai</option>
                    <option value="Juin">Juin</option>
                    <option value="Juillet">Juillet</option>
                    <option value="Août">Août</option>
                    <option value="Septembre">Septembre</option>
                    <option value="Octobre">Octobre</option>
                    <option value="Novembre">Novembre</option>
                    <option value="Décembre">Décembre</option>
                    <option value="Trimestre 1">Trimestre 1</option>
                    <option value="Trimestre 2">Trimestre 2</option>
                    <option value="Trimestre 3">Trimestre 3</option>
                    <option value="Trimestre 4">Trimestre 4</option>
                    <option value="Année complète">Année complète</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                    Année <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="year"
                    name="year"
                    value={periodFormData.year}
                    onChange={handlePeriodInputChange}
                    min="2000"
                    max="2100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="peak_demand" className="block text-sm font-medium text-gray-700 mb-1">
                  Demande de pointe (kW) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="peak_demand"
                  name="peak_demand"
                  value={periodFormData.peak_demand}
                  onChange={handlePeriodInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="average_demand" className="block text-sm font-medium text-gray-700 mb-1">
                  Demande moyenne (kW) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="average_demand"
                  name="average_demand"
                  value={periodFormData.average_demand}
                  onChange={handlePeriodInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="base_demand" className="block text-sm font-medium text-gray-700 mb-1">
                  Demande de base (kW) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="base_demand"
                  name="base_demand"
                  value={periodFormData.base_demand}
                  onChange={handlePeriodInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="load_factor" className="block text-sm font-medium text-gray-700 mb-1">
                  Facteur de charge (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="load_factor"
                  name="load_factor"
                  value={periodFormData.load_factor}
                  onChange={handlePeriodInputChange}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={periodFormData.notes}
                  onChange={handlePeriodInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPeriodModal(false);
                    resetPeriodForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !periodFormData.period || periodFormData.year === 0}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmitting || !periodFormData.period || periodFormData.year === 0
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-700'
                    }
                  `}
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      {isEditingPeriod ? 'Modification en cours...' : 'Ajout en cours...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      {isEditingPeriod ? 'Modifier' : 'Ajouter'}
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

export default DemandeEnergetiquePage;