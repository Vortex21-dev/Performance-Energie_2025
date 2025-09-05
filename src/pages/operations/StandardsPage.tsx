import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, FileText, Book, Shield, Award, AlignCenterVertical as Certificate, Plus, X, Save, Loader, Edit3, Trash2, MoreVertical } from 'lucide-react';
import ProgressNav from '../../components/ProgressNav';
import CollapsibleSearch from '../../components/CollapsibleSearch';
import { useSectorStandards } from '../../lib/hooks/useSectorStandards';
import { supabase } from '../../lib/supabase';

const StandardsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedEnergies, setSelectedEnergies] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Standard Modal state
  const [showAddStandardModal, setShowAddStandardModal] = useState(false);
  const [newStandardData, setNewStandardData] = useState({
    code: '',
    name: '',
    description: ''
  });
  const [isSubmittingStandard, setIsSubmittingStandard] = useState(false);
  const [standardError, setStandardError] = useState<string | null>(null);
  const [standardSuccess, setStandardSuccess] = useState<string | null>(null);
  
  // Edit/Delete state
  const [showEditStandardModal, setShowEditStandardModal] = useState(false);
  const [editingStandard, setEditingStandard] = useState<string | null>(null);
  const [editStandardData, setEditStandardData] = useState({
    code: '',
    name: '',
    description: ''
  });
  const [isEditingStandard, setIsEditingStandard] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { 
      sector?: string; 
      energyTypes?: string[];
      standards?: string[];
    };
    if (state?.sector) {
      setSelectedSector(state.sector);
    }
    if (state?.energyTypes) {
      setSelectedEnergies(state.energyTypes);
    }
    if (state?.standards) {
      setSelectedStandards(state.standards);
    }
  }, [location]);

  const { standards, isLoading, error } = useSectorStandards(selectedSector, selectedEnergies);

  const filteredStandards = standards.filter(standard =>
    standard.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStandardInfo = (standardName: string) => {
    const standardsInfo: Record<string, { icon: any; description: string; gradient: string }> = {
      'ISO 50001': {
        icon: Shield,
        description: 'Système de management de l\'énergie',
        gradient: 'from-blue-500 to-indigo-600'
      },
      'ISO 50003': {
        icon: Certificate,
        description: 'Exigences pour les organismes d\'audit et de certification',
        gradient: 'from-purple-500 to-pink-600'
      },
      'ISO 50004': {
        icon: Book,
        description: 'Lignes directrices pour la mise en œuvre',
        gradient: 'from-green-500 to-emerald-600'
      },
      'ISO 50006': {
        icon: Award,
        description: 'Mesure de la performance énergétique',
        gradient: 'from-amber-500 to-orange-600'
      },
      'EN 16231': {
        icon: FileText,
        description: 'Méthodologie de benchmarking énergétique',
        gradient: 'from-rose-500 to-red-600'
      }
    };

    return standardsInfo[standardName] || {
      icon: FileText,
      description: 'Standard énergétique',
      gradient: 'from-gray-500 to-gray-600'
    };
  };

  const toggleStandard = (standardName: string) => {
    setSelectedStandards(prev => 
      prev.includes(standardName)
        ? prev.filter(s => s !== standardName)
        : [...prev, standardName]
    );
  };

  const handlePrevious = () => {
    navigate('/operations/energy-types', { 
      state: { 
        sector: selectedSector,
        energyTypes: selectedEnergies
      } 
    });
  };

  const handleNext = () => {
    navigate('/operations/issues', { 
      state: { 
        sector: selectedSector,
        energyTypes: selectedEnergies,
        standards: selectedStandards
      } 
    });
  };

  const handleAddStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newStandardData.code || !newStandardData.name) {
      setStandardError('Veuillez remplir le code et le nom de la norme');
      return;
    }

    try {
      setIsSubmittingStandard(true);
      setStandardError(null);

      // Insert new standard
      const { error: standardError } = await supabase
        .from('standards')
        .insert([{
          code: newStandardData.code,
          name: newStandardData.name,
          description: newStandardData.description || null
        }]);

      if (standardError) throw standardError;

      // Add the new standard to sector_standards if sector and energy type are selected
      if (selectedSector && selectedEnergies.length > 0) {
        // Get existing standards for this sector/energy type
        const { data: existingData, error: fetchError } = await supabase
          .from('sector_standards')
          .select('standard_codes')
          .eq('sector_name', selectedSector)
          .eq('energy_type_name', selectedEnergies[0])
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        const currentStandards = existingData?.standard_codes || [];
        const updatedStandards = [...currentStandards, newStandardData.code];

        // Update or insert sector_standards
        const { error: upsertError } = await supabase
          .from('sector_standards')
          .upsert({
            sector_name: selectedSector,
            energy_type_name: selectedEnergies[0],
            standard_codes: updatedStandards
          });

        if (upsertError) throw upsertError;

        // Add to selected standards
        setSelectedStandards(prev => [...prev, newStandardData.name]);
      }

      // Reset form and close modal
      setNewStandardData({ code: '', name: '', description: '' });
      setShowAddStandardModal(false);
      
      // Show success message
      setStandardSuccess('Norme ajoutée avec succès');
      setTimeout(() => setStandardSuccess(null), 3000);

    } catch (err: any) {
      console.error('Error adding standard:', err);
      setStandardError(err.message || 'Erreur lors de l\'ajout de la norme');
    } finally {
      setIsSubmittingStandard(false);
    }
  };

  const resetStandardForm = () => {
    setNewStandardData({ code: '', name: '', description: '' });
    setStandardError(null);
  };

  const handleEditStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editStandardData.code || !editStandardData.name || !editingStandard) {
      setStandardError('Veuillez remplir le code et le nom de la norme');
      return;
    }

    try {
      setIsEditingStandard(true);
      setStandardError(null);

      // Update standard
      const { error: updateError } = await supabase
        .from('standards')
        .update({
          code: editStandardData.code,
          name: editStandardData.name,
          description: editStandardData.description || null
        })
        .eq('code', editingStandard);

      if (updateError) throw updateError;

      // Update in sector_standards if the name changed
      if (editStandardData.code !== editingStandard && selectedSector && selectedEnergies.length > 0) {
        const { data: sectorStandardsData, error: fetchError } = await supabase
          .from('sector_standards')
          .select('standard_codes')
          .eq('sector_name', selectedSector)
          .eq('energy_type_name', selectedEnergies[0])
          .single();

        if (fetchError) throw fetchError;

        const updatedStandards = (sectorStandardsData.standard_codes || []).map((std: string) => 
          std === editingStandard ? editStandardData.code : std
        );

        const { error: updateSectorError } = await supabase
          .from('sector_standards')
          .update({ standard_codes: updatedStandards })
          .eq('sector_name', selectedSector)
          .eq('energy_type_name', selectedEnergies[0]);

        if (updateSectorError) throw updateSectorError;
      }

      // Update selected standards
      setSelectedStandards(prev => 
        prev.map(std => std === editingStandard ? editStandardData.code : std)
      );

      // Reset form and close modal
      resetEditStandardForm();
      setShowEditStandardModal(false);
      
      // Show success message
      setStandardSuccess('Norme modifiée avec succès');
      setTimeout(() => setStandardSuccess(null), 3000);

    } catch (err: any) {
      console.error('Error editing standard:', err);
      setStandardError(err.message || 'Erreur lors de la modification de la norme');
    } finally {
      setIsEditingStandard(false);
    }
  };

  const handleDeleteStandard = async (standardName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la norme "${standardName}" ?`)) {
      return;
    }

    try {
      setStandardError(null);

      // Delete from standards table
      const { error: deleteError } = await supabase
        .from('standards')
        .delete()
        .eq('code', standardName);

      if (deleteError) throw deleteError;

      // Remove from sector_standards
      if (selectedSector && selectedEnergies.length > 0) {
        const { data: sectorStandardsData, error: fetchError } = await supabase
          .from('sector_standards')
          .select('standard_codes')
          .eq('sector_name', selectedSector)
          .eq('energy_type_name', selectedEnergies[0])
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        if (sectorStandardsData) {
          const updatedStandards = (sectorStandardsData.standard_codes || []).filter((std: string) => std !== standardName);

          const { error: updateError } = await supabase
            .from('sector_standards')
            .update({ standard_codes: updatedStandards })
            .eq('sector_name', selectedSector)
            .eq('energy_type_name', selectedEnergies[0]);

          if (updateError) throw updateError;
        }
      }

      // Remove from selected standards
      setSelectedStandards(prev => prev.filter(std => std !== standardName));
      
      // Show success message
      setStandardSuccess('Norme supprimée avec succès');
      setTimeout(() => setStandardSuccess(null), 3000);

    } catch (err: any) {
      console.error('Error deleting standard:', err);
      setStandardError(err.message || 'Erreur lors de la suppression de la norme');
    }
  };

  const openEditModal = (standardName: string) => {
    // Find the standard details
    setEditingStandard(standardName);
    setEditStandardData({
      code: standardName,
      name: '', // Will be populated from database
      description: ''
    });
    
    // Fetch standard details
    fetchStandardDetails(standardName);
    setShowEditStandardModal(true);
    setActiveDropdown(null);
  };

  const fetchStandardDetails = async (standardName: string) => {
    try {
      const { data, error } = await supabase
        .from('standards')
        .select('*')
        .eq('code', standardName)
        .single();

      if (error) throw error;

      setEditStandardData({
        code: data.code,
        name: data.name,
        description: data.description || ''
      });
    } catch (err: any) {
      console.error('Error fetching standard details:', err);
      setStandardError('Erreur lors du chargement des détails de la norme');
    }
  };

  const resetEditStandardForm = () => {
    setEditStandardData({ code: '', name: '', description: '' });
    setEditingStandard(null);
    setStandardError(null);
  };

  const toggleDropdown = (standardName: string) => {
    setActiveDropdown(activeDropdown === standardName ? null : standardName);
  };

  const steps = [
    { name: 'Secteur', status: 'complete' },
    { name: 'Types d\'énergie', status: 'complete' },
    { name: 'Normes / Referentiel', status: 'current' },
    { name: 'Enjeux', status: 'upcoming' },
    { name: 'Critères', status: 'upcoming' },
    { name: 'Indicateurs', status: 'upcoming' },
    { name: 'Structure', status: 'upcoming' },
     { name: 'Utilisateurs', status: 'upcoming' }
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
          <div className="text-left">
            <h1 className="text-3xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-blue-600">
              Normes et Référentiels
            </h1>
            <p className="text-gray-600 mt-2">
              {selectedSector 
                ? `Standards disponibles pour le secteur ${selectedSector}`
                : 'Choisissez les standards qui s\'appliquent à votre activité'}
            </p>
            {selectedStandards.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-500">Normes sélectionnées:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedStandards.map((standard, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {standard}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end space-y-4">
            <button
              onClick={() => {
                resetStandardForm();
                setShowAddStandardModal(true);
              }}
              className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
              <span className="font-medium">Ajouter une norme</span>
            </button>
            <CollapsibleSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Rechercher une norme..."
              className="mt-2"
            />
          </div>
        </div>

        <ProgressNav steps={steps} />

        {/* Success and Error Messages for Standards */}
        {standardSuccess && (
          <div className="mt-8 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg animate-fade-in">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-700">{standardSuccess}</p>
            </div>
          </div>
        )}

        {standardError && (
          <div className="mt-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-fade-in">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{standardError}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-fade-in">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">Une erreur est survenue lors du chargement des standards.</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="mt-12 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {filteredStandards.map((standard) => {
              const { icon: Icon, description, gradient } = getStandardInfo(standard);
              
              return (
                <div
                  key={standard}
                  onClick={() => toggleStandard(standard)}
                  className={`
                    relative overflow-hidden rounded-xl p-6 cursor-pointer
                    transform transition-all duration-300 hover:scale-105 group
                    ${selectedStandards.includes(standard)
                      ? `bg-gradient-to-r ${gradient} text-white shadow-lg scale-105`
                      : 'bg-white text-gray-800 hover:shadow-xl'
                    }
                  `}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`
                      p-3 rounded-full transition-all duration-300
                      ${selectedStandards.includes(standard)
                        ? 'bg-white/20 group-hover:scale-110'
                        : 'bg-gray-100 group-hover:bg-gray-200'
                      }
                    `}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-semibold">{standard}</h3>
                  </div>
                  
                  <p className={`
                    text-sm mb-4
                    ${selectedStandards.includes(standard)
                      ? 'text-white/80'
                      : 'text-gray-600'
                    }
                  `}>
                    {description}
                  </p>

                  <div className={`
                    h-1 w-24 rounded-full transition-all duration-300
                    ${selectedStandards.includes(standard)
                      ? 'bg-white/30 group-hover:w-32'
                      : 'bg-green-100 group-hover:bg-green-200'
                    }
                  `} />

                  {selectedStandards.includes(standard) && (
                    <div className="absolute top-4 right-4 transform transition-all duration-300 group-hover:scale-110">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  )}

                  {/* Operations Dropdown */}
                  <div
                    className={`
                      absolute right-3 top-3 transition-all duration-300 z-20
                      ${activeDropdown === standard ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}
                    `}
                  >
                    <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-white/20 p-2 space-y-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(standard);
                        }}
                        className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200 w-full text-left group"
                      >
                        <Edit3 size={16} className="group-hover:rotate-12 transition-transform duration-200" />
                        <span className="font-medium">Modifier</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStandard(standard);
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
                      toggleDropdown(standard);
                    }}
                    className={`
                      absolute top-3 right-3 p-1 rounded-full transition-all duration-200
                      ${selectedStandards.includes(standard)
                        ? 'text-white/70 hover:text-white hover:bg-white/20'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <MoreVertical size={16} />
                  </button>
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
            disabled={selectedStandards.length === 0}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium
              transform transition-all duration-300
              ${selectedStandards.length > 0
                ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:shadow-lg hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            Suivant
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Add Standard Modal */}
      {showAddStandardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative animate-scaleIn">
            <button
              onClick={() => {
                setShowAddStandardModal(false);
                resetStandardForm();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Ajouter une nouvelle norme</h2>

            <form onSubmit={handleAddStandard} className="space-y-4">
              <div>
                <label htmlFor="standard_code" className="block text-sm font-medium text-gray-700 mb-1">
                  Code de la norme <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="standard_code"
                  value={newStandardData.code}
                  onChange={(e) => setNewStandardData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: ISO 50001, EN 16231..."
                  required
                />
              </div>

              <div>
                <label htmlFor="standard_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la norme <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="standard_name"
                  value={newStandardData.name}
                  onChange={(e) => setNewStandardData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: Système de management de l'énergie"
                  required
                />
              </div>

              <div>
                <label htmlFor="standard_description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="standard_description"
                  value={newStandardData.description}
                  onChange={(e) => setNewStandardData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Description de la norme..."
                />
              </div>

              {standardError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                  {standardError}
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStandardModal(false);
                    resetStandardForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStandard || !newStandardData.code || !newStandardData.name}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmittingStandard || !newStandardData.code || !newStandardData.name
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                    }
                  `}
                >
                  {isSubmittingStandard ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Ajout en cours...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Ajouter la norme
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Standard Modal */}
      {showEditStandardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative animate-scaleIn">
            <button
              onClick={() => {
                setShowEditStandardModal(false);
                resetEditStandardForm();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Modifier la norme</h2>

            <form onSubmit={handleEditStandard} className="space-y-4">
              <div>
                <label htmlFor="edit_standard_code" className="block text-sm font-medium text-gray-700 mb-1">
                  Code de la norme <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="edit_standard_code"
                  value={editStandardData.code}
                  onChange={(e) => setEditStandardData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: ISO 50001, EN 16231..."
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_standard_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la norme <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="edit_standard_name"
                  value={editStandardData.name}
                  onChange={(e) => setEditStandardData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: Système de management de l'énergie"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_standard_description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="edit_standard_description"
                  value={editStandardData.description}
                  onChange={(e) => setEditStandardData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Description de la norme..."
                />
              </div>

              {standardError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                  {standardError}
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditStandardModal(false);
                    resetEditStandardForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isEditingStandard || !editStandardData.code || !editStandardData.name}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isEditingStandard || !editStandardData.code || !editStandardData.name
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                    }
                  `}
                >
                  {isEditingStandard ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Modification en cours...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Modifier la norme
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

export default StandardsPage;