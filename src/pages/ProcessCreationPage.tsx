import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Layers,
  Target,
  BarChart3,
  FileText,
  Loader,
  Building2,
  ChevronDown,
  ChevronUp,
  Link,
  Settings
} from 'lucide-react';
import ProgressNav from '../components/ProgressNav';
import { supabase } from '../lib/supabase';

interface Processus {
  code: string;
  name: string;
  description: string | null;
}

interface Criterion {
  code: string;
  name: string;
  description: string | null;
}

interface Indicator {
  code: string;
  name: string;
  description: string | null;
  unit: string | null;
  type: string | null;
  formule: string | null;
  frequence?: string;
}

interface ProcessusForm {
  code: string;
  name: string;
  description: string;
  selectedCriteria: string[];
  selectedIndicators: string[];
}

const ProcessCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get data from previous steps
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedEnergyTypes, setSelectedEnergyTypes] = useState<string[]>([]);
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [organizationName, setOrganizationName] = useState<string>('');
  
  // Available data
  const [availableCriteria, setAvailableCriteria] = useState<Criterion[]>([]);
  const [availableIndicators, setAvailableIndicators] = useState<Indicator[]>([]);
  
  // Form state
  const [processusList, setProcessusList] = useState<ProcessusForm[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProcessusIndex, setCurrentProcessusIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProcessusForm>({
    code: '',
    name: '',
    description: '',
    selectedCriteria: [],
    selectedIndicators: []
  });
  
  // UI state
  const [expandedProcessus, setExpandedProcessus] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const steps = [
    { name: 'Secteur', status: 'complete' },
    { name: 'Types d\'énergie', status: 'complete' },
    { name: 'Normes / Referentiel', status: 'complete' },
    { name: 'Enjeux', status: 'complete' },
    { name: 'Critères', status: 'complete' },
    { name: 'Indicateurs', status: 'complete' },
    { name: 'Structure', status: 'complete' },
    { name: 'Processus', status: 'current' },
    { name: 'Utilisateurs', status: 'upcoming' }
  ] as const;

  useEffect(() => {
    // Get data from location state
    const state = location.state as {
      sector?: string;
      energyTypes?: string[];
      standards?: string[];
      issues?: string[];
      criteria?: string[];
      indicators?: string[];
      organizationName?: string;
    };

    if (state) {
      setSelectedSector(state.sector || null);
      setSelectedEnergyTypes(state.energyTypes || []);
      setSelectedStandards(state.standards || []);
      setSelectedIssues(state.issues || []);
      setSelectedCriteria(state.criteria || []);
      setSelectedIndicators(state.indicators || []);
      setOrganizationName(state.organizationName || '');
    }

    fetchAvailableData();
  }, [location]);

  const fetchAvailableData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch criteria
      const { data: criteriaData, error: criteriaError } = await supabase
        .from('criteria')
        .select('*')
        .order('name');

      if (criteriaError) throw criteriaError;
      setAvailableCriteria(criteriaData || []);

      // Fetch indicators
      const { data: indicatorsData, error: indicatorsError } = await supabase
        .from('indicators')
        .select('*')
        .order('name');

      if (indicatorsError) throw indicatorsError;
      setAvailableIndicators(indicatorsData || []);

    } catch (err: any) {
      console.error('Error fetching available data:', err);
      setError('Erreur lors du chargement des données disponibles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleCriterion = (criterionCode: string) => {
    setFormData(prev => ({
      ...prev,
      selectedCriteria: prev.selectedCriteria.includes(criterionCode)
        ? prev.selectedCriteria.filter(c => c !== criterionCode)
        : [...prev.selectedCriteria, criterionCode]
    }));
  };

  const toggleIndicator = (indicatorCode: string) => {
    setFormData(prev => ({
      ...prev,
      selectedIndicators: prev.selectedIndicators.includes(indicatorCode)
        ? prev.selectedIndicators.filter(i => i !== indicatorCode)
        : [...prev.selectedIndicators, indicatorCode]
    }));
  };

  const handleAddProcessus = () => {
    if (!formData.code || !formData.name) {
      setError('Veuillez remplir le code et le nom du processus');
      return;
    }

    // Check if code already exists
    if (processusList.some(p => p.code === formData.code)) {
      setError('Ce code de processus existe déjà');
      return;
    }

    if (isEditing && currentProcessusIndex !== null) {
      // Update existing processus
      setProcessusList(prev => {
        const newList = [...prev];
        newList[currentProcessusIndex] = { ...formData };
        return newList;
      });
    } else {
      // Add new processus
      setProcessusList(prev => [...prev, { ...formData }]);
    }

    resetForm();
    setShowModal(false);
    setSuccess('Processus ajouté avec succès');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleEditProcessus = (index: number) => {
    const processus = processusList[index];
    setFormData({ ...processus });
    setCurrentProcessusIndex(index);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteProcessus = (index: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce processus ?')) {
      setProcessusList(prev => prev.filter((_, i) => i !== index));
      setSuccess('Processus supprimé avec succès');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      selectedCriteria: [],
      selectedIndicators: []
    });
    setCurrentProcessusIndex(null);
    setIsEditing(false);
  };

  const toggleProcessusExpansion = (processusCode: string) => {
    setExpandedProcessus(prev =>
      prev.includes(processusCode)
        ? prev.filter(code => code !== processusCode)
        : [...prev, processusCode]
    );
  };

  const handleSubmit = async () => {
    if (processusList.length === 0) {
      setError('Veuillez créer au moins un processus');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Insert processus into database
      for (const processus of processusList) {
        // Check if processus already exists
        const { data: existingProcessus } = await supabase
          .from('processus')
          .select('code')
          .eq('code', processus.code)
          .maybeSingle();

        if (!existingProcessus) {
          // Insert new processus
          const { error: processusError } = await supabase
            .from('processus')
            .insert([{
              code: processus.code,
              name: processus.name,
              description: processus.description || null,
              criteres: processus.selectedCriteria,
              indicateurs: processus.selectedIndicators
            }]);

          if (processusError) throw processusError;
        }

      }

      setSuccess('Processus créés avec succès !');
      setTimeout(() => {
        navigate('/user-management', {
          state: {
            sector: selectedSector,
            energyTypes: selectedEnergyTypes,
            standards: selectedStandards,
            issues: selectedIssues,
            criteria: selectedCriteria,
            indicators: selectedIndicators,
            organizationName: organizationName,
            processus: processusList
          }
        });
      }, 1500);

    } catch (err: any) {
      console.error('Error saving processus:', err);
      setError(`Erreur lors de l'enregistrement: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrevious = () => {
    navigate(-1);
  };

  const getCriterionName = (code: string) => {
    const criterion = availableCriteria.find(c => c.code === code);
    return criterion?.name || code;
  };

  const getIndicatorName = (code: string) => {
    const indicator = availableIndicators.find(i => i.code === code);
    return indicator?.name || code;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Création des Processus</h1>
            <p className="mt-2 text-gray-600">Définissez vos processus et associez-les aux critères et indicateurs</p>
          </div>
          <button
            onClick={handlePrevious}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </button>
        </div>

        <ProgressNav steps={steps} />

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

        {/* Organization Info */}
        {organizationName && (
          <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{organizationName}</h3>
                <p className="text-gray-600 text-sm">
                  {selectedSector} • {selectedEnergyTypes.join(', ')} • {selectedCriteria.length} critères • {selectedIndicators.length} indicateurs
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add Processus Button */}
        <div className="mb-8 flex justify-end">
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl hover:from-indigo-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Ajouter un processus</span>
          </button>
        </div>

        {/* Processus List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                <Layers className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Processus définis</h2>
            </div>
          </div>

          <div className="p-6">
            {processusList.length === 0 ? (
              <div className="text-center py-12">
                <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun processus défini</h3>
                <p className="text-gray-500 mb-6">
                  Commencez par créer vos processus métier et associez-les aux critères et indicateurs pertinents.
                </p>
                <button
                  onClick={() => {
                    resetForm();
                    setShowModal(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer le premier processus
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {processusList.map((processus, index) => (
                  <motion.div
                    key={processus.code}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div 
                      className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleProcessusExpansion(processus.code)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-indigo-100 rounded-lg">
                            <Layers className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{processus.name}</h3>
                            <p className="text-sm text-gray-600">Code: {processus.code}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            {processus.selectedCriteria.length} critères • {processus.selectedIndicators.length} indicateurs
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditProcessus(index);
                            }}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProcessus(index);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {expandedProcessus.includes(processus.code) ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {expandedProcessus.includes(processus.code) && (
                      <div className="p-6 bg-white border-t border-gray-200">
                        {processus.description && (
                          <div className="mb-6">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                            <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{processus.description}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Critères associés */}
                          <div>
                            <div className="flex items-center space-x-2 mb-3">
                              <Target className="w-5 h-5 text-emerald-600" />
                              <h4 className="text-sm font-medium text-gray-700">Critères associés</h4>
                            </div>
                            {processus.selectedCriteria.length > 0 ? (
                              <div className="space-y-2">
                                {processus.selectedCriteria.map((criterionCode) => (
                                  <div key={criterionCode} className="flex items-center space-x-2 p-2 bg-emerald-50 rounded-lg">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                    <span className="text-sm text-gray-700">{getCriterionName(criterionCode)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 italic">Aucun critère associé</p>
                            )}
                          </div>

                          {/* Indicateurs associés */}
                          <div>
                            <div className="flex items-center space-x-2 mb-3">
                              <BarChart3 className="w-5 h-5 text-blue-600" />
                              <h4 className="text-sm font-medium text-gray-700">Indicateurs associés</h4>
                            </div>
                            {processus.selectedIndicators.length > 0 ? (
                              <div className="space-y-2">
                                {processus.selectedIndicators.map((indicatorCode) => (
                                  <div key={indicatorCode} className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span className="text-sm text-gray-700">{getIndicatorName(indicatorCode)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 italic">Aucun indicateur associé</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={handlePrevious}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
            Précédent
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || processusList.length === 0}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium
              transform transition-all duration-300
              ${processusList.length > 0 && !isSubmitting
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:scale-105 shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isSubmitting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                Suivant
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add/Edit Processus Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl relative animate-scaleIn max-h-[90vh] overflow-y-auto">
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
              {isEditing ? 'Modifier le processus' : 'Ajouter un processus'}
            </h2>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                    Code du processus <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ex: PROD-001"
                    required
                    disabled={isEditing}
                  />
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du processus <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ex: Processus de Production"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Description détaillée du processus..."
                  />
                </div>
              </div>

              {/* Criteria Selection */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Target className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-medium text-gray-900">Critères associés</h3>
                  <span className="text-sm text-gray-500">({formData.selectedCriteria.length} sélectionnés)</span>
                </div>
                
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableCriteria
                      .filter(criterion => selectedCriteria.includes(criterion.name))
                      .map((criterion) => (
                        <div
                          key={criterion.code}
                          onClick={() => toggleCriterion(criterion.code)}
                          className={`
                            p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                            ${formData.selectedCriteria.includes(criterion.code)
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900 text-sm">{criterion.name}</h4>
                              {criterion.description && (
                                <p className="text-xs text-gray-500 mt-1">{criterion.description}</p>
                              )}
                            </div>
                            {formData.selectedCriteria.includes(criterion.code) && (
                              <CheckCircle className="w-5 h-5 text-emerald-500" />
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Indicators Selection */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-medium text-gray-900">Indicateurs associés</h3>
                  <span className="text-sm text-gray-500">({formData.selectedIndicators.length} sélectionnés)</span>
                </div>
                
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableIndicators
                      .filter(indicator => selectedIndicators.includes(indicator.name))
                      .map((indicator) => (
                        <div
                          key={indicator.code}
                          onClick={() => toggleIndicator(indicator.code)}
                          className={`
                            p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                            ${formData.selectedIndicators.includes(indicator.code)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900 text-sm">{indicator.name}</h4>
                              <div className="flex items-center space-x-2 mt-1">
                                {indicator.unit && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                    {indicator.unit}
                                  </span>
                                )}
                                {indicator.frequency && (
                                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                                    {indicator.frequency}
                                  </span>
                                )}
                              </div>
                              {indicator.description && (
                                <p className="text-xs text-gray-500 mt-1">{indicator.description}</p>
                              )}
                            </div>
                            {formData.selectedIndicators.includes(indicator.code) && (
                              <CheckCircle className="w-5 h-5 text-blue-500" />
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
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
                  type="button"
                  onClick={handleAddProcessus}
                  disabled={!formData.code || !formData.name}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${!formData.code || !formData.name
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                    }
                  `}
                >
                  <Save className="w-5 h-5 mr-2" />
                  {isEditing ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessCreationPage;