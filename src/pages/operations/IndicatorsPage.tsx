import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Target, LineChart, PieChart, BarChart3, Activity, Thermometer, Lightbulb, Cpu, Plus, X, Save, Loader, Edit3, Trash2, MoreVertical } from 'lucide-react';
import ProgressNav from '../../components/ProgressNav';
import { useSectorStandardsIssuesCriteriaIndicator } from '../../lib/hooks/useSectorStandardsIssuesCriteriaIndicator';
import { supabase } from '../../lib/supabase';

const IndicatorsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedEnergies, setSelectedEnergies] = useState<string[]>([]);
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const [expandedCriteria, setExpandedCriteria] = useState<string[]>([]);

  // Add Indicator Modal state
  const [showAddIndicatorModal, setShowAddIndicatorModal] = useState(false);
  const [newIndicatorData, setNewIndicatorData] = useState({
    code: '',
    name: '',
    description: '',
    unit: '',
    type: '',
    formule: '',
    frequence: 'Mensuelle',
    criteria_name: ''
  });
  const [isSubmittingIndicator, setIsSubmittingIndicator] = useState(false);
  const [indicatorError, setIndicatorError] = useState<string | null>(null);
  const [indicatorSuccess, setIndicatorSuccess] = useState<string | null>(null);
  
  // Edit/Delete state
  const [showEditIndicatorModal, setShowEditIndicatorModal] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<string | null>(null);
  const [editIndicatorData, setEditIndicatorData] = useState({
    code: '',
    name: '',
    description: '',
    unit: '',
    type: '',
    formule: '',
    frequence: 'Mensuelle',
    criteria_name: ''
  });
  const [isEditingIndicator, setIsEditingIndicator] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { 
      sector?: string; 
      energyTypes?: string[];
      standards?: string[];
      issues?: string[];
      criteria?: string[];
    };
    if (state?.sector) setSelectedSector(state.sector);
    if (state?.energyTypes) setSelectedEnergies(state.energyTypes);
    if (state?.standards) setSelectedStandards(state.standards);
    if (state?.issues) setSelectedIssues(state.issues);
    if (state?.criteria) setSelectedCriteria(state.criteria);
  }, [location]);

  const { indicators, isLoading, error, refetch } = useSectorStandardsIssuesCriteriaIndicator(
    selectedSector,
    selectedEnergies,
    selectedStandards,
    selectedIssues,
    selectedCriteria,
    indicatorSuccess // Add this to trigger refresh when indicator is added/modified
  );

  const toggleCriteriaExpansion = (criteriaName: string) => {
    setExpandedCriteria(prev => 
      prev.includes(criteriaName)
        ? prev.filter(c => c !== criteriaName)
        : [...prev, criteriaName]
    );
  };

  const toggleIndicator = (indicatorName: string) => {
    setSelectedIndicators(prev => 
      prev.includes(indicatorName)
        ? prev.filter(i => i !== indicatorName)
        : [...prev, indicatorName]
    );
  };

  const toggleAllIndicatorsForCriteria = (criteriaName: string) => {
    const criteriaIndicators = indicators
      .filter(i => i.criteria_name === criteriaName)
      .map(i => i.indicator_name);

    const allSelected = criteriaIndicators.every(i => selectedIndicators.includes(i));

    if (allSelected) {
      setSelectedIndicators(prev => prev.filter(i => !criteriaIndicators.includes(i)));
    } else {
      setSelectedIndicators(prev => [...new Set([...prev, ...criteriaIndicators])]);
    }
  };

  const handleAddIndicator = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newIndicatorData.code || !newIndicatorData.name || !newIndicatorData.criteria_name) {
      setIndicatorError('Veuillez remplir le code, le nom et le critère de l\'indicateur');
      return;
    }

    try {
      setIsSubmittingIndicator(true);
      setIndicatorError(null);

      // Insert new indicator
      const { error: indicatorError } = await supabase
        .from('indicators')
        .insert([{
          code: newIndicatorData.code,
          name: newIndicatorData.name,
          description: newIndicatorData.description || null,
          unit: newIndicatorData.unit || null,
          type: newIndicatorData.type || null,
          formule: newIndicatorData.formule || null,
          frequence: newIndicatorData.frequence || 'Mensuelle'
        }]);

      if (indicatorError) throw indicatorError;

      // Add the new indicator to sector_standards_issues_criteria_indicators for the selected criteria
      if (selectedSector && selectedEnergies.length > 0 && selectedStandards.length > 0 && selectedIssues.length > 0) {
        // Find the issue that contains this criteria
        const targetIssue = selectedIssues.find(issue => {
          // This is a simplified check - in a real app you'd have proper relationships
          return selectedCriteria.some(criteria => 
            criteria.includes(newIndicatorData.criteria_name.split(' ')[0]) || 
            newIndicatorData.criteria_name.includes(criteria.split(' ')[0])
          );
        }) || selectedIssues[0];

        // Get existing indicators for this sector/energy type/standards/issues/criteria combination
        const { data: existingData, error: fetchError } = await supabase
          .from('sector_standards_issues_criteria_indicators')
          .select('indicator_codes')
          .eq('sector_name', selectedSector)
          .eq('energy_type_name', selectedEnergies[0])
          .eq('standard_name', selectedStandards[0])
          .eq('issue_name', targetIssue)
          .eq('criteria_name', newIndicatorData.criteria_name)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        const currentIndicators = existingData?.indicator_codes || [];
        const updatedIndicators = [...currentIndicators, newIndicatorData.code];

        // Update or insert sector_standards_issues_criteria_indicators
        const { error: upsertError } = await supabase
          .from('sector_standards_issues_criteria_indicators')
          .upsert({
            sector_name: selectedSector,
            energy_type_name: selectedEnergies[0],
            standard_name: selectedStandards[0],
            issue_name: targetIssue,
            criteria_name: newIndicatorData.criteria_name,
            indicator_codes: updatedIndicators,
            unit: newIndicatorData.unit || ''
          });

        if (upsertError) throw upsertError;

        // Add to selected indicators
        setSelectedIndicators(prev => [...prev, newIndicatorData.name]);
      }

      // Reset form and close modal
      setNewIndicatorData({ code: '', name: '', description: '', unit: '', type: '', formule: '', frequency: 'Mensuelle', criteria_name: '' });
      setShowAddIndicatorModal(false);
      
      // Show success message
      setIndicatorSuccess('Indicateur ajouté avec succès');
      setTimeout(() => setIndicatorSuccess(null), 3000);
      
      // Refresh indicators list
      refetch();

    } catch (err: any) {
      console.error('Error adding indicator:', err);
      setIndicatorError(err.message || 'Erreur lors de l\'ajout de l\'indicateur');
    } finally {
      setIsSubmittingIndicator(false);
    }
  };

  const resetIndicatorForm = () => {
    setNewIndicatorData({ code: '', name: '', description: '', unit: '', type: '', formule: '', frequence: 'Mensuelle', criteria_name: '' });
    setIndicatorError(null);
  };

  const handleEditIndicator = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editIndicatorData.code || !editIndicatorData.name || !editIndicatorData.criteria_name || !editingIndicator) {
      setIndicatorError('Veuillez remplir le code, le nom et le critère de l\'indicateur');
      return;
    }

    try {
      setIsEditingIndicator(true);
      setIndicatorError(null);

      // Update indicator
      const { error: updateError } = await supabase
        .from('indicators')
        .update({
          code: editIndicatorData.code,
          name: editIndicatorData.name,
          description: editIndicatorData.description || null,
          unit: editIndicatorData.unit || null,
          type: editIndicatorData.type || null,
          formule: editIndicatorData.formule || null,
          frequence: editIndicatorData.frequence || 'Mensuelle'
        })
        .eq('code', editingIndicator);

      if (updateError) throw updateError;

      // Update in sector_standards_issues_criteria_indicators
      if (selectedSector && selectedEnergies.length > 0 && selectedStandards.length > 0 && selectedIssues.length > 0) {
        // Find the issue that contains this criteria
        const targetIssue = selectedIssues.find(issue => {
          return selectedCriteria.some(criteria => 
            criteria.includes(editIndicatorData.criteria_name.split(' ')[0]) || 
            editIndicatorData.criteria_name.includes(criteria.split(' ')[0])
          );
        }) || selectedIssues[0];

        const { data: sectorIndicatorsData, error: fetchError } = await supabase
          .from('sector_standards_issues_criteria_indicators')
          .select('indicator_codes')
          .eq('sector_name', selectedSector)
          .eq('energy_type_name', selectedEnergies[0])
          .eq('standard_name', selectedStandards[0])
          .eq('issue_name', targetIssue)
          .eq('criteria_name', editIndicatorData.criteria_name)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        if (sectorIndicatorsData) {
          const updatedIndicators = (sectorIndicatorsData.indicator_codes || []).map((code: string) => 
            code === editingIndicator ? editIndicatorData.code : code
          );

          const { error: updateSectorError } = await supabase
            .from('sector_standards_issues_criteria_indicators')
            .update({ indicator_codes: updatedIndicators })
            .eq('sector_name', selectedSector)
            .eq('energy_type_name', selectedEnergies[0])
            .eq('standard_name', selectedStandards[0])
            .eq('issue_name', targetIssue)
            .eq('criteria_name', editIndicatorData.criteria_name);

          if (updateSectorError) throw updateSectorError;
        }
      }

      // Update selected indicators
      setSelectedIndicators(prev => 
        prev.map(indicator => indicator === editingIndicator ? editIndicatorData.name : indicator)
      );

      // Reset form and close modal
      resetEditIndicatorForm();
      setShowEditIndicatorModal(false);
      
      // Show success message
      setIndicatorSuccess('Indicateur modifié avec succès');
      setTimeout(() => setIndicatorSuccess(null), 3000);
      
      // Refresh indicators list
      refetch();

    } catch (err: any) {
      console.error('Error editing indicator:', err);
      setIndicatorError(err.message || 'Erreur lors de la modification de l\'indicateur');
    } finally {
      setIsEditingIndicator(false);
    }
  };

  const handleDeleteIndicator = async (indicatorName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'indicateur "${indicatorName}" ?`)) {
      return;
    }

    try {
      setIndicatorError(null);

      // Get the indicator code first
      const { data: indicatorData, error: fetchError } = await supabase
        .from('indicators')
        .select('code, name')
        .eq('name', indicatorName)
        .single();

      if (fetchError) throw fetchError;

      // Delete from indicators table
      const { error: deleteError } = await supabase
        .from('indicators')
        .delete()
        .eq('code', indicatorData.code);

      if (deleteError) throw deleteError;

      // Remove from all sector_standards_issues_criteria_indicators entries
      if (selectedSector && selectedEnergies.length > 0 && selectedStandards.length > 0 && selectedIssues.length > 0) {
        // Get all entries that might contain this indicator
        const { data: sectorIndicatorsData, error: sectorFetchError } = await supabase
          .from('sector_standards_issues_criteria_indicators')
          .select('indicator_codes, criteria_name, issue_name')
          .eq('sector_name', selectedSector)
          .eq('energy_type_name', selectedEnergies[0]);

        if (sectorFetchError && sectorFetchError.code !== 'PGRST116') throw sectorFetchError;

        // Update each entry that contains this indicator
        for (const entry of sectorIndicatorsData || []) {
          if (entry.indicator_codes && entry.indicator_codes.includes(indicatorData.code)) {
            const updatedIndicators = entry.indicator_codes.filter((code: string) => code !== indicatorData.code);

            const { error: updateError } = await supabase
              .from('sector_standards_issues_criteria_indicators')
              .update({ indicator_codes: updatedIndicators })
              .eq('sector_name', selectedSector)
              .eq('energy_type_name', selectedEnergies[0])
              .eq('criteria_name', entry.criteria_name)
              .eq('issue_name', entry.issue_name);

            if (updateError) throw updateError;
          }
        }
      }

      // Remove from selected indicators
      setSelectedIndicators(prev => prev.filter(indicator => indicator !== indicatorName));
      
      // Show success message
      setIndicatorSuccess('Indicateur supprimé avec succès');
      setTimeout(() => setIndicatorSuccess(null), 3000);
      
      // Refresh indicators list
      refetch();

    } catch (err: any) {
      console.error('Error deleting indicator:', err);
      setIndicatorError(err.message || 'Erreur lors de la suppression de l\'indicateur');
    }
  };

  const openEditModal = (indicatorName: string) => {
    // Find the indicator to get its code
    const indicator = indicators.find(i => i.indicator_name === indicatorName);
    if (!indicator) return;
    
    setEditingIndicator(indicator.indicator_name);
    setEditIndicatorData({
      code: '', // We'll fetch this
      name: indicatorName,
      description: '',
      unit: '',
      type: '',
      formule: '',
      frequency: 'Mensuelle',
      criteria_name: indicator.criteria_name
    });
    
    // Fetch indicator details
    fetchIndicatorDetails(indicatorName);
    setShowEditIndicatorModal(true);
    setActiveDropdown(null);
  };

  const fetchIndicatorDetails = async (indicatorName: string) => {
    try {
      const { data, error } = await supabase
        .from('indicators')
        .select('*')
        .eq('name', indicatorName)
        .single();

      if (error) throw error;

      setEditIndicatorData(prev => ({
        ...prev,
        code: data.code,
        name: data.name,
        description: data.description || '',
        unit: data.unit || '',
        type: data.type || '',
        formule: data.formule || '',
        frequence: data.frequence || 'Mensuelle'
      }));
    } catch (err: any) {
      console.error('Error fetching indicator details:', err);
      setIndicatorError('Erreur lors du chargement des détails de l\'indicateur');
    }
  };

  const resetEditIndicatorForm = () => {
    setEditIndicatorData({ code: '', name: '', description: '', unit: '', type: '', formule: '', frequence: 'Mensuelle', criteria_name: '' });
    setEditingIndicator(null);
    setIndicatorError(null);
  };

  const toggleDropdown = (indicatorName: string) => {
    setActiveDropdown(activeDropdown === indicatorName ? null : indicatorName);
  };

  const getIndicatorIcon = (name: string | null | undefined) => {
    // Safely handle null/undefined by defaulting to empty string
    const normalizedName = (name || '').toLowerCase();
    
    if (normalizedName.includes('consommation')) return BarChart3;
    if (normalizedName.includes('performance')) return LineChart;
    if (normalizedName.includes('émission')) return Activity;
    if (normalizedName.includes('température')) return Thermometer;
    if (normalizedName.includes('éclairage')) return Lightbulb;
    if (normalizedName.includes('système')) return Cpu;
    return PieChart;
  };

  const handlePrevious = () => {
    navigate('/operations/criteria', { 
      state: { 
        sector: selectedSector,
        energyTypes: selectedEnergies,
        standards: selectedStandards,
        issues: selectedIssues,
        criteria: selectedCriteria
      } 
    });
  };

  const handleNext = () => {
    navigate('/company-type-selection', { 
      state: { 
        sector: selectedSector,
        energyTypes: selectedEnergies,
        standards: selectedStandards,
        issues: selectedIssues,
        criteria: selectedCriteria,
        indicators: selectedIndicators
      } 
    });
  };

  const steps = [
    { name: 'Secteur', status: 'complete' },
    { name: 'Types d\'énergie', status: 'complete' },
    { name: 'Normes / Referentiel', status: 'complete' },
    { name: 'Enjeux', status: 'complete' },
    { name: 'Critères', status: 'complete' },
    { name: 'Indicateurs', status: 'current' },
    { name: 'Structure', status: 'upcoming' },
    { name: 'Utilisateurs', status: 'upcoming'}
  ] as const;

  // Group indicators by criteria
  const indicatorsByCriteria = indicators.reduce((acc, indicator) => {
    if (!acc[indicator.criteria_name]) {
      acc[indicator.criteria_name] = [];
    }
    acc[indicator.criteria_name].push(indicator);
    return acc;
  }, {} as Record<string, typeof indicators>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex justify-between items-start mb-8">
          <div className="text-left">
            <h1 className="text-3xl font-bold text-gray-800">Sélectionnez vos indicateurs</h1>
            <p className="text-gray-600 mt-2">
              {selectedSector 
                ? `Indicateurs disponibles pour le secteur ${selectedSector}`
                : 'Choisissez les indicateurs pour suivre votre performance'}
            </p>
          </div>
          <div className="flex flex-col items-end space-y-4">
            <button
              onClick={() => {
                resetIndicatorForm();
                setShowAddIndicatorModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Ajouter un indicateur</span>
            </button>
          </div>
        </div>

        <ProgressNav steps={steps} />

        {/* Success and Error Messages for Indicators */}
        {indicatorSuccess && (
          <div className="mt-8 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg animate-fade-in">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-700">{indicatorSuccess}</p>
            </div>
          </div>
        )}

        {indicatorError && (
          <div className="mt-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-fade-in">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{indicatorError}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">Une erreur est survenue lors du chargement des indicateurs.</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="mt-12 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="space-y-4 mt-8">
            {selectedCriteria.map((criteriaName) => {
              const criteriaIndicators = indicatorsByCriteria[criteriaName] || [];
              const isExpanded = expandedCriteria.includes(criteriaName);
              const allIndicatorsSelected = criteriaIndicators.every(
                i => selectedIndicators.includes(i.indicator_name)
              );

              return (
                <div
                  key={criteriaName}
                  className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300"
                >
                  <div
                    onClick={() => toggleCriteriaExpansion(criteriaName)}
                    className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <Target className="w-6 h-6 text-blue-500" />
                      <h3 className="text-lg font-semibold text-gray-800">{criteriaName}</h3>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAllIndicatorsForCriteria(criteriaName);
                        }}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          allIndicatorsSelected
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {allIndicatorsSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-6 space-y-4 animate-fade-in">
                      {criteriaIndicators.map((indicator) => {
                        const Icon = getIndicatorIcon(indicator.indicator_name);
                        return (
                          <div
                            key={indicator.indicator_name}
                            className="relative flex items-center space-x-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                            onMouseEnter={() => toggleDropdown(indicator.indicator_name)}
                            onMouseLeave={() => toggleDropdown(null)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIndicators.includes(indicator.indicator_name)}
                              onChange={() => toggleIndicator(indicator.indicator_name)}
                              className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <Icon className="w-5 h-5 text-gray-500" />
                            <div>
                              <p className="font-medium text-gray-800">{indicator.indicator_name}</p>
                              {indicator.unit && (
                                <p className="text-sm text-gray-500">Unité: {indicator.unit}</p>
                              )}
                            </div>
                            
                            {/* Operations Dropdown */}
                            <div
                              className={`
                                absolute right-3 top-3 transition-all duration-300 z-20
                                ${activeDropdown === indicator.indicator_name ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}
                              `}
                            >
                              <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-white/20 p-2 space-y-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(indicator.indicator_name);
                                  }}
                                  className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200 w-full text-left group"
                                >
                                  <Edit3 size={16} className="group-hover:rotate-12 transition-transform duration-200" />
                                  <span className="font-medium">Modifier</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteIndicator(indicator.indicator_name);
                                  }}
                                  className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 w-full text-left group"
                                >
                                  <Trash2 size={16} className="group-hover:scale-110 transition-transform duration-200" />
                                  <span className="font-medium">Supprimer</span>
                                </button>
                              </div>
                            </div>

                            {/* Dropdown trigger */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDropdown(indicator.indicator_name);
                              }}
                              className="absolute top-3 right-3 p-1 rounded-full transition-all duration-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            >
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <button
            onClick={handlePrevious}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
            Précédent
          </button>
          
          <button
            onClick={handleNext}
            disabled={selectedIndicators.length === 0}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium
              transform transition-all duration-300
              ${selectedIndicators.length > 0
                ? 'bg-green-500 text-white hover:bg-green-600 hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            Suivant
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Add Indicator Modal */}
      {showAddIndicatorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative animate-scaleIn">
            <button
              onClick={() => {
                setShowAddIndicatorModal(false);
                resetIndicatorForm();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Ajouter un nouvel indicateur</h2>

            <form onSubmit={handleAddIndicator} className="space-y-4">
              <div>
                <label htmlFor="indicator_code" className="block text-sm font-medium text-gray-700 mb-1">
                  Code de l'indicateur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="indicator_code"
                  value={newIndicatorData.code}
                  onChange={(e) => setNewIndicatorData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: IND_001, PERF_01..."
                  required
                />
              </div>

              <div>
                <label htmlFor="indicator_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'indicateur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="indicator_name"
                  value={newIndicatorData.name}
                  onChange={(e) => setNewIndicatorData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: Consommation énergétique totale"
                  required
                />
              </div>

              <div>
                <label htmlFor="indicator_criteria" className="block text-sm font-medium text-gray-700 mb-1">
                  Critère associé <span className="text-red-500">*</span>
                </label>
                <select
                  id="indicator_criteria"
                  value={newIndicatorData.criteria_name}
                  onChange={(e) => setNewIndicatorData(prev => ({ ...prev, criteria_name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionnez un critère</option>
                  {selectedCriteria.map((criteria, index) => (
                    <option key={index} value={criteria}>
                      {criteria}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="indicator_unit" className="block text-sm font-medium text-gray-700 mb-1">
                  Unité
                </label>
                <input
                  type="text"
                  id="indicator_unit"
                  value={newIndicatorData.unit}
                  onChange={(e) => setNewIndicatorData(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: kWh, MJ, %"
                />
              </div>

              <div>
                <label htmlFor="indicator_frequency" className="block text-sm font-medium text-gray-700 mb-1">
                  Fréquence
                </label>
                <select
                  id="indicator_frequency"
                  value={newIndicatorData.frequence}
                  onChange={(e) => setNewIndicatorData(prev => ({ ...prev, frequence: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="Mensuelle">Mensuelle</option>
                  <option value="Trimestrielle">Trimestrielle</option>
                  <option value="Annuelle">Annuelle</option>
                  <option value="Continue">Continue</option>
                </select>
              </div>

              <div>
                <label htmlFor="indicator_formula" className="block text-sm font-medium text-gray-700 mb-1">
                  Formule
                </label>
                <input
                  type="text"
                  id="indicator_formula"
                  value={newIndicatorData.formule}
                  onChange={(e) => setNewIndicatorData(prev => ({ ...prev, formule: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: (A + B) / C"
                />
              </div>

              <div>
                <label htmlFor="indicator_description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="indicator_description"
                  value={newIndicatorData.description}
                  onChange={(e) => setNewIndicatorData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Description de l'indicateur..."
                />
              </div>

              {indicatorError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                  {indicatorError}
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddIndicatorModal(false);
                    resetIndicatorForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIndicator || !newIndicatorData.code || !newIndicatorData.name || !newIndicatorData.criteria_name}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmittingIndicator || !newIndicatorData.code || !newIndicatorData.name || !newIndicatorData.criteria_name
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                    }
                  `}
                >
                  {isSubmittingIndicator ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Ajout en cours...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Ajouter l'indicateur
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Indicator Modal */}
      {showEditIndicatorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative animate-scaleIn">
            <button
              onClick={() => {
                setShowEditIndicatorModal(false);
                resetEditIndicatorForm();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Modifier l'indicateur</h2>

            <form onSubmit={handleEditIndicator} className="space-y-4">
              <div>
                <label htmlFor="edit_indicator_code" className="block text-sm font-medium text-gray-700 mb-1">
                  Code de l'indicateur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="edit_indicator_code"
                  value={editIndicatorData.code}
                  onChange={(e) => setEditIndicatorData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: IND_001, PERF_01..."
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_indicator_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'indicateur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="edit_indicator_name"
                  value={editIndicatorData.name}
                  onChange={(e) => setEditIndicatorData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: Consommation énergétique totale"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_indicator_criteria" className="block text-sm font-medium text-gray-700 mb-1">
                  Critère associé <span className="text-red-500">*</span>
                </label>
                <select
                  id="edit_indicator_criteria"
                  value={editIndicatorData.criteria_name}
                  onChange={(e) => setEditIndicatorData(prev => ({ ...prev, criteria_name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionnez un critère</option>
                  {selectedCriteria.map((criteria, index) => (
                    <option key={index} value={criteria}>
                      {criteria}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit_indicator_unit" className="block text-sm font-medium text-gray-700 mb-1">
                  Unité
                </label>
                <input
                  type="text"
                  id="edit_indicator_unit"
                  value={editIndicatorData.unit}
                  onChange={(e) => setEditIndicatorData(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: kWh, MJ, %"
                />
              </div>

              <div>
                <label htmlFor="edit_indicator_frequency" className="block text-sm font-medium text-gray-700 mb-1">
                  Fréquence
                </label>
                <select
                  id="edit_indicator_frequency"
                  value={editIndicatorData.frequence}
                  onChange={(e) => setEditIndicatorData(prev => ({ ...prev, frequence: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="Mensuelle">Mensuelle</option>
                  <option value="Trimestrielle">Trimestrielle</option>
                  <option value="Annuelle">Annuelle</option>
                  <option value="Continue">Continue</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit_indicator_formula" className="block text-sm font-medium text-gray-700 mb-1">
                  Formule
                </label>
                <input
                  type="text"
                  id="edit_indicator_formula"
                  value={editIndicatorData.formule}
                  onChange={(e) => setEditIndicatorData(prev => ({ ...prev, formule: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: (A + B) / C"
                />
              </div>

              <div>
                <label htmlFor="edit_indicator_description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="edit_indicator_description"
                  value={editIndicatorData.description}
                  onChange={(e) => setEditIndicatorData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Description de l'indicateur..."
                />
              </div>

              {indicatorError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                  {indicatorError}
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditIndicatorModal(false);
                    resetEditIndicatorForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isEditingIndicator || !editIndicatorData.code || !editIndicatorData.name || !editIndicatorData.criteria_name}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isEditingIndicator || !editIndicatorData.code || !editIndicatorData.name || !editIndicatorData.criteria_name
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                    }
                  `}
                >
                  {isEditingIndicator ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Modification en cours...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Modifier l'indicateur
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

export default IndicatorsPage;