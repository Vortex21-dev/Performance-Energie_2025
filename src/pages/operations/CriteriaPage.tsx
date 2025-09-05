import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, FileText, Target, Users, UserCheck, ShoppingCart, GraduationCap, FileSpreadsheet, Goal, Settings, BarChart3, ClipboardCheck, PenTool as Tool, Plus, X, Save, Loader, Edit3, Trash2, MoreVertical } from 'lucide-react';
import ProgressNav from '../../components/ProgressNav';
import CollapsibleSearch from '../../components/CollapsibleSearch';
import { supabase } from '../../lib/supabase';

interface Criterion {
  code: string;
  name: string;
  description: string | null;
}

const CriteriaPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedEnergies, setSelectedEnergies] = useState<string[]>([]);
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Criterion Modal state
  const [showAddCriterionModal, setShowAddCriterionModal] = useState(false);
  const [newCriterionData, setNewCriterionData] = useState({
    code: '',
    name: '',
    description: ''
  });
  const [isSubmittingCriterion, setIsSubmittingCriterion] = useState(false);
  const [criterionError, setCriterionError] = useState<string | null>(null);
  const [criterionSuccess, setCriterionSuccess] = useState<string | null>(null);
  
  // Edit/Delete state
  const [showEditCriterionModal, setShowEditCriterionModal] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<string | null>(null);
  const [editCriterionData, setEditCriterionData] = useState({
    code: '',
    name: '',
    description: ''
  });
  const [isEditingCriterion, setIsEditingCriterion] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { 
      sector?: string; 
      energyTypes?: string[];
      standards?: string[];
      issues?: string[];
    };
    if (state?.sector) setSelectedSector(state.sector);
    if (state?.energyTypes) setSelectedEnergies(state.energyTypes);
    if (state?.standards) setSelectedStandards(state.standards);
    if (state?.issues) setSelectedIssues(state.issues);
  }, [location]);

  useEffect(() => {
    if (selectedSector && selectedEnergies.length && selectedStandards.length && selectedIssues.length) {
      fetchCriteria();
    }
  }, [selectedSector, selectedEnergies, selectedStandards, selectedIssues, criterionSuccess]);

  const fetchCriteria = async () => {
    if (!selectedSector || !selectedEnergies.length || !selectedStandards.length || !selectedIssues.length) {
      setCriteria([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get criteria codes from sector_standards_issues_criteria table
      // Filter by sector, energy type, and standards
      const { data: criteriaCodesData, error: criteriaCodesError } = await supabase
        .from('sector_standards_issues_criteria')
        .select('criteria_codes')
        .eq('sector_name', selectedSector)
        .eq('energy_type_name', selectedEnergies[0])
        .in('standard_name', selectedStandards)
        .in('issue_name', selectedIssues);

      if (criteriaCodesError) throw criteriaCodesError;

      if (!criteriaCodesData?.length) {
        setCriteria([]);
        return;
      }

      // Flatten all criteria codes and get unique ones
      const allCriteriaCodes = criteriaCodesData
        .flatMap(item => item.criteria_codes || [])
        .filter((code, index, self) => self.indexOf(code) === index);

      if (!allCriteriaCodes.length) {
        setCriteria([]);
        return;
      }

      // Fetch actual criteria details from criteria table
      const { data: criteriaDetailsData, error: criteriaDetailsError } = await supabase
        .from('criteria')
        .select('code, name, description')
        .in('code', allCriteriaCodes);

      if (criteriaDetailsError) throw criteriaDetailsError;

      setCriteria(criteriaDetailsData || []);
    } catch (err: any) {
      console.error('Error fetching criteria:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCriteria = criteria.filter(criterion =>
    criterion.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCriterion = (criterionName: string) => {
    setSelectedCriteria(prev => 
      prev.includes(criterionName)
        ? prev.filter(c => c !== criterionName)
        : [...prev, criterionName]
    );
  };

  const handlePrevious = () => {
    navigate('/operations/issues', { 
      state: { 
        sector: selectedSector,
        energyTypes: selectedEnergies,
        standards: selectedStandards,
        issues: selectedIssues
      } 
    });
  };

  const handleNext = () => {
    navigate('/operations/indicators', { 
      state: { 
        sector: selectedSector,
        energyTypes: selectedEnergies,
        standards: selectedStandards,
        issues: selectedIssues,
        criteria: selectedCriteria
      } 
    });
  };

  const handleAddCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCriterionData.code || !newCriterionData.name) {
      setCriterionError('Veuillez remplir le code et le nom du critère');
      return;
    }

    try {
      setIsSubmittingCriterion(true);
      setCriterionError(null);

      // Insert new criterion
      const { error: criterionError } = await supabase
        .from('criteria')
        .insert([{
          code: newCriterionData.code,
          name: newCriterionData.name,
          description: newCriterionData.description || null
        }]);

      if (criterionError) throw criterionError;

      // Add the new criterion to sector_standards_issues_criteria if sector, energy type, standards and issues are selected
      if (selectedSector && selectedEnergies.length > 0 && selectedStandards.length > 0 && selectedIssues.length > 0) {
        // Get existing criteria for this sector/energy type/standards/issues combination
        const { data: existingData, error: fetchError } = await supabase
          .from('sector_standards_issues_criteria')
          .select('criteria_codes')
          .eq('sector_name', selectedSector)
          .eq('energy_type_name', selectedEnergies[0])
          .eq('standard_name', selectedStandards[0])
          .eq('issue_name', selectedIssues[0])
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        const currentCriteria = existingData?.criteria_codes || [];
        const updatedCriteria = [...currentCriteria, newCriterionData.code];

        // Update or insert sector_standards_issues_criteria
        const { error: upsertError } = await supabase
          .from('sector_standards_issues_criteria')
          .upsert({
            sector_name: selectedSector,
            energy_type_name: selectedEnergies[0],
            standard_name: selectedStandards[0],
            issue_name: selectedIssues[0],
            criteria_codes: updatedCriteria
          });

        if (upsertError) throw upsertError;

        // Add to selected criteria
        setSelectedCriteria(prev => [...prev, newCriterionData.name]);
      }

      // Reset form and close modal
      setNewCriterionData({ code: '', name: '', description: '' });
      setShowAddCriterionModal(false);
      
      // Show success message
      setCriterionSuccess('Critère ajouté avec succès');
      setTimeout(() => setCriterionSuccess(null), 3000);

    } catch (err: any) {
      console.error('Error adding criterion:', err);
      setCriterionError(err.message || 'Erreur lors de l\'ajout du critère');
    } finally {
      setIsSubmittingCriterion(false);
    }
  };

  const resetCriterionForm = () => {
    setNewCriterionData({ code: '', name: '', description: '' });
    setCriterionError(null);
  };

  const handleEditCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editCriterionData.code || !editCriterionData.name || !editingCriterion) {
      setCriterionError('Veuillez remplir le code et le nom du critère');
      return;
    }

    try {
      setIsEditingCriterion(true);
      setCriterionError(null);

      // Update criterion
      const { error: updateError } = await supabase
        .from('criteria')
        .update({
          code: editCriterionData.code,
          name: editCriterionData.name,
          description: editCriterionData.description || null
        })
        .eq('name', editingCriterion);

      if (updateError) throw updateError;

      // Update in sector_standards_issues_criteria if the name changed
      if (editCriterionData.name !== editingCriterion && selectedSector && selectedEnergies.length > 0 && selectedStandards.length > 0 && selectedIssues.length > 0) {
        const { data: sectorCriteriaData, error: fetchError } = await supabase
          .from('sector_standards_issues_criteria')
          .select('criteria_codes')
          .eq('sector_name', selectedSector)
          .eq('energy_type_name', selectedEnergies[0])
          .eq('standard_name', selectedStandards[0])
          .eq('issue_name', selectedIssues[0])
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        if (sectorCriteriaData) {
          // Find the old criterion code and replace it with the new one
          const { data: oldCriterionData } = await supabase
            .from('criteria')
            .select('code')
            .eq('name', editingCriterion)
            .single();

          if (oldCriterionData) {
            const updatedCriteria = (sectorCriteriaData.criteria_codes || []).map((code: string) => 
              code === oldCriterionData.code ? editCriterionData.code : code
            );

            const { error: updateSectorError } = await supabase
              .from('sector_standards_issues_criteria')
              .update({ criteria_codes: updatedCriteria })
              .eq('sector_name', selectedSector)
              .eq('energy_type_name', selectedEnergies[0])
              .eq('standard_name', selectedStandards[0])
              .eq('issue_name', selectedIssues[0]);

            if (updateSectorError) throw updateSectorError;
          }
        }
      }

      // Update selected criteria
      setSelectedCriteria(prev => 
        prev.map(criterion => criterion === editingCriterion ? editCriterionData.name : criterion)
      );

      // Reset form and close modal
      resetEditCriterionForm();
      setShowEditCriterionModal(false);
      
      // Show success message
      setCriterionSuccess('Critère modifié avec succès');
      setTimeout(() => setCriterionSuccess(null), 3000);

    } catch (err: any) {
      console.error('Error editing criterion:', err);
      setCriterionError(err.message || 'Erreur lors de la modification du critère');
    } finally {
      setIsEditingCriterion(false);
    }
  };

  const handleDeleteCriterion = async (criterionName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le critère "${criterionName}" ?`)) {
      return;
    }

    try {
      setCriterionError(null);

      // Get the criterion code first
      const { data: criterionData, error: fetchError } = await supabase
        .from('criteria')
        .select('code')
        .eq('name', criterionName)
        .single();

      if (fetchError) throw fetchError;

      // Delete from criteria table
      const { error: deleteError } = await supabase
        .from('criteria')
        .delete()
        .eq('name', criterionName);

      if (deleteError) throw deleteError;

      // Remove from sector_standards_issues_criteria
      if (selectedSector && selectedEnergies.length > 0 && selectedStandards.length > 0 && selectedIssues.length > 0) {
        const { data: sectorCriteriaData, error: sectorFetchError } = await supabase
          .from('sector_standards_issues_criteria')
          .select('criteria_codes')
          .eq('sector_name', selectedSector)
          .eq('energy_type_name', selectedEnergies[0])
          .eq('standard_name', selectedStandards[0])
          .eq('issue_name', selectedIssues[0])
          .single();

        if (sectorFetchError && sectorFetchError.code !== 'PGRST116') throw sectorFetchError;

        if (sectorCriteriaData) {
          const updatedCriteria = (sectorCriteriaData.criteria_codes || []).filter((code: string) => code !== criterionData.code);

          const { error: updateError } = await supabase
            .from('sector_standards_issues_criteria')
            .update({ criteria_codes: updatedCriteria })
            .eq('sector_name', selectedSector)
            .eq('energy_type_name', selectedEnergies[0])
            .eq('standard_name', selectedStandards[0])
            .eq('issue_name', selectedIssues[0]);

          if (updateError) throw updateError;
        }
      }

      // Remove from selected criteria
      setSelectedCriteria(prev => prev.filter(criterion => criterion !== criterionName));
      
      // Show success message
      setCriterionSuccess('Critère supprimé avec succès');
      setTimeout(() => setCriterionSuccess(null), 3000);

    } catch (err: any) {
      console.error('Error deleting criterion:', err);
      setCriterionError(err.message || 'Erreur lors de la suppression du critère');
    }
  };

  const openEditModal = (criterionName: string) => {
    setEditingCriterion(criterionName);
    setEditCriterionData({
      code: '', // We'll fetch this
      name: criterionName,
      description: ''
    });
    
    // Fetch criterion details
    fetchCriterionDetails(criterionName);
    setShowEditCriterionModal(true);
    setActiveDropdown(null);
  };

  const fetchCriterionDetails = async (criterionName: string) => {
    try {
      const { data, error } = await supabase
        .from('criteria')
        .select('*')
        .eq('name', criterionName)
        .single();

      if (error) throw error;

      setEditCriterionData({
        code: data.code,
        name: data.name,
        description: data.description || ''
      });
    } catch (err: any) {
      console.error('Error fetching criterion details:', err);
      setCriterionError('Erreur lors du chargement des détails du critère');
    }
  };

  const resetEditCriterionForm = () => {
    setEditCriterionData({ code: '', name: '', description: '' });
    setEditingCriterion(null);
    setCriterionError(null);
  };

  const toggleDropdown = (criterionName: string) => {
    setActiveDropdown(activeDropdown === criterionName ? null : criterionName);
  };

  const steps = [
    { name: 'Secteur', status: 'complete' },
    { name: 'Types d\'énergie', status: 'complete' },
    { name: 'Normes / Referentiel', status: 'complete' },
    { name: 'Enjeux', status: 'complete' },
    { name: 'Critères', status: 'current' },
    { name: 'Indicateurs', status: 'upcoming' },
    { name: 'Structure', status: 'upcoming' },
     { name: 'Utilisateurs', status: 'upcoming' }
  ] as const;

  const getCriterionIcon = (name: string) => {
    const icons: Record<string, any> = {
      'Contexte': Target,
      'Domaine d\'application': FileText,
      'Situation Energetique de reference (SER)': BarChart3,
      'Risques, impacts et opportunités': AlertTriangle,
      'Parties intéressées et exigences': Users,
      'Leadership': UserCheck,
      'Politique énergétiques': Goal,
      'Ressources': ShoppingCart,
      'Achats et services énergétiques': ShoppingCart,
      'Compétences': GraduationCap,
      'Communication': Users,
      'Sensibilisations': Users,
      'Smé': Settings,
      'Processus': FileSpreadsheet,
      'Informations documentées': FileText,
      'Objectifs et cibles énergétiques': Target,
      'Planifications': ClipboardCheck,
      'Installations, équipements': Tool
    };
    return icons[name] || FileText;
  };

  const getCriterionGradient = (name: string) => {
    const gradients: Record<string, string> = {
      'Contexte': 'from-blue-500 to-indigo-500',
      'Domaine d\'application': 'from-purple-500 to-pink-500',
      'Situation Energetique de reference (SER)': 'from-green-500 to-teal-500',
      'Risques, impacts et opportunités': 'from-yellow-500 to-orange-500',
      'Parties intéressées et exigences': 'from-red-500 to-pink-500',
      'Leadership': 'from-indigo-500 to-purple-500',
      'Politique énergétiques': 'from-cyan-500 to-blue-500',
      'Ressources': 'from-emerald-500 to-green-500',
      'Achats et services énergétiques': 'from-amber-500 to-yellow-500',
      'Compétences': 'from-violet-500 to-purple-500',
      'Communication': 'from-fuchsia-500 to-pink-500',
      'Sensibilisations': 'from-rose-500 to-red-500',
      'Smé': 'from-sky-500 to-blue-500',
      'Processus': 'from-lime-500 to-green-500',
      'Informations documentées': 'from-orange-500 to-red-500',
      'Objectifs et cibles énergétiques': 'from-teal-500 to-cyan-500',
      'Planifications': 'from-indigo-500 to-blue-500',
      'Installations, équipements': 'from-purple-500 to-indigo-500'
    };
    return gradients[name] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex justify-between items-start mb-8">
          <div className="text-left">
            <h1 className="text-3xl font-bold text-gray-800">Sélectionnez vos critères</h1>
            <p className="text-gray-600 mt-2">
              {selectedSector 
                ? `Critères disponibles pour les enjeux sélectionnés dans le secteur ${selectedSector}`
                : 'Définissez les critères de suivi de votre performance'}
            </p>
            {selectedIssues.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-500">Enjeux sélectionnés:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedIssues.map((issue, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {issue}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end space-y-4">
            <button
              onClick={() => {
                resetCriterionForm();
                setShowAddCriterionModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Ajouter un critère</span>
            </button>
          </div>
        </div>

        <ProgressNav steps={steps} />

        {/* Success and Error Messages for Criteria */}
        {criterionSuccess && (
          <div className="mt-8 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg animate-fade-in">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-700">{criterionSuccess}</p>
            </div>
          </div>
        )}

        {criterionError && (
          <div className="mt-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-fade-in">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{criterionError}</p>
            </div>
          </div>
        )}

        <CollapsibleSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher un critère..."
          className="mt-2"
        />

        {error && (
          <div className="mt-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">Une erreur est survenue lors du chargement des critères: {error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="mt-12 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            {filteredCriteria.length === 0 ? (
              <div className="col-span-2 text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun critère trouvé</h3>
                <p className="text-gray-600">
                  {searchQuery 
                    ? 'Aucun critère ne correspond à votre recherche.'
                    : 'Aucun critère n\'est disponible pour les enjeux sélectionnés.'}
                </p>
              </div>
            ) : (
              filteredCriteria.map((criterion) => {
                const Icon = getCriterionIcon(criterion.name);
                const gradient = getCriterionGradient(criterion.name);
                
                return (
                  <div
                    key={criterion.code}
                    onClick={() => toggleCriterion(criterion.name)}
                    onMouseEnter={() => toggleDropdown(criterion.name)}
                    onMouseLeave={() => toggleDropdown(null)}
                    className={`
                      relative overflow-hidden rounded-xl p-6 cursor-pointer
                      transform transition-all duration-300 hover:scale-105
                      ${selectedCriteria.includes(criterion.name)
                        ? `bg-gradient-to-r ${gradient} text-white shadow-lg scale-105`
                        : 'bg-white text-gray-800 hover:shadow-xl'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`
                        p-3 rounded-full
                        ${selectedCriteria.includes(criterion.name)
                          ? 'bg-white/20'
                          : 'bg-gray-100'
                        }
                      `}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{criterion.name}</h3>
                        {criterion.description && (
                          <p className={`
                            mt-1 text-sm
                            ${selectedCriteria.includes(criterion.name)
                              ? 'text-white/80'
                              : 'text-gray-600'
                            }
                          `}>
                            {criterion.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {selectedCriteria.includes(criterion.name) && (
                      <CheckCircle className="absolute top-4 right-4 w-6 h-6 text-white" />
                    )}

                    {/* Operations Dropdown */}
                    <div
                      className={`
                        absolute right-3 top-3 transition-all duration-300 z-20
                        ${activeDropdown === criterion.name ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}
                      `}
                    >
                      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-white/20 p-2 space-y-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(criterion.name);
                          }}
                          className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200 w-full text-left group"
                        >
                          <Edit3 size={16} className="group-hover:rotate-12 transition-transform duration-200" />
                          <span className="font-medium">Modifier</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCriterion(criterion.name);
                          }}
                          className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 w-full text-left group"
                        >
                          <Trash2 size={16} className="group-hover:scale-110 transition-transform duration-200" />
                          <span className="font-medium">Supprimer</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
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
            disabled={selectedCriteria.length === 0}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium
              transform transition-all duration-300
              ${selectedCriteria.length > 0
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

      {/* Add Criterion Modal */}
      {showAddCriterionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative animate-scaleIn">
            <button
              onClick={() => {
                setShowAddCriterionModal(false);
                resetCriterionForm();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Ajouter un nouveau critère</h2>

            <form onSubmit={handleAddCriterion} className="space-y-4">
              <div>
                <label htmlFor="criterion_code" className="block text-sm font-medium text-gray-700 mb-1">
                  Code du critère <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="criterion_code"
                  value={newCriterionData.code}
                  onChange={(e) => setNewCriterionData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: CRIT_001, CONTEXT_01..."
                  required
                />
              </div>

              <div>
                <label htmlFor="criterion_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du critère <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="criterion_name"
                  value={newCriterionData.name}
                  onChange={(e) => setNewCriterionData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: Contexte et domaine d'application"
                  required
                />
              </div>

              <div>
                <label htmlFor="criterion_description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="criterion_description"
                  value={newCriterionData.description}
                  onChange={(e) => setNewCriterionData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Description du critère..."
                />
              </div>

              {criterionError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                  {criterionError}
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCriterionModal(false);
                    resetCriterionForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCriterion || !newCriterionData.code || !newCriterionData.name}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmittingCriterion || !newCriterionData.code || !newCriterionData.name
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700'
                    }
                  `}
                >
                  {isSubmittingCriterion ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Ajout en cours...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Ajouter le critère
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Criterion Modal */}
      {showEditCriterionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative animate-scaleIn">
            <button
              onClick={() => {
                setShowEditCriterionModal(false);
                resetEditCriterionForm();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Modifier le critère</h2>

            <form onSubmit={handleEditCriterion} className="space-y-4">
              <div>
                <label htmlFor="edit_criterion_code" className="block text-sm font-medium text-gray-700 mb-1">
                  Code du critère <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="edit_criterion_code"
                  value={editCriterionData.code}
                  onChange={(e) => setEditCriterionData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: CRIT_001, CONTEXT_01..."
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_criterion_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du critère <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="edit_criterion_name"
                  value={editCriterionData.name}
                  onChange={(e) => setEditCriterionData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: Contexte et domaine d'application"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_criterion_description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="edit_criterion_description"
                  value={editCriterionData.description}
                  onChange={(e) => setEditCriterionData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Description du critère..."
                />
              </div>

              {criterionError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                  {criterionError}
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditCriterionModal(false);
                    resetEditCriterionForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isEditingCriterion || !editCriterionData.code || !editCriterionData.name}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isEditingCriterion || !editCriterionData.code || !editCriterionData.name
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700'
                    }
                  `}
                >
                  {isEditingCriterion ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Modification en cours...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Modifier le critère
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

export default CriteriaPage;