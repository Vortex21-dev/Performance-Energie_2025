import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, Target, Users, UserCheck, ShoppingCart, GraduationCap, FileText, Goal, Settings, BarChart3, ClipboardCheck, AlertOctagon, Plus, X, Save, Loader, Edit3, Trash2, MoreVertical } from 'lucide-react';
import ProgressNav from '../../components/ProgressNav';
import CollapsibleSearch from '../../components/CollapsibleSearch';
import { useSectorStandardsIssues } from '../../lib/hooks/useSectorStandardsIssues';
import { supabase } from '../../lib/supabase';

const IssuesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedEnergies, setSelectedEnergies] = useState<string[]>([]);
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Issue Modal state
  const [showAddIssueModal, setShowAddIssueModal] = useState(false);
  const [newIssueData, setNewIssueData] = useState({
    code: '',
    name: '',
    description: ''
  });
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issueSuccess, setIssueSuccess] = useState<string | null>(null);
  
  // Edit/Delete state
  const [showEditIssueModal, setShowEditIssueModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState<string | null>(null);
  const [editIssueData, setEditIssueData] = useState({
    code: '',
    name: '',
    description: ''
  });
  const [isEditingIssue, setIsEditingIssue] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const issueIcons: Record<string, any> = {
    'Contexte, dommaine d\'application et Situation Energetique de reference (SER)': {
      icon: Target,
      description: 'Définition du périmètre et des objectifs'
    },
    'Risques, impacts et opportunités': {
      icon: AlertOctagon,
      description: 'Analyse des risques et opportunités'
    },
    'Parties intéressées et exigences': {
      icon: Users,
      description: 'Identification des parties prenantes'
    },
    'Leadership et politique': {
      icon: UserCheck,
      description: 'Engagement de la direction'
    },
    'Ressources, achats et services énergétiques': {
      icon: ShoppingCart,
      description: 'Gestion des ressources et approvisionnements'
    },
    'Compétences, communication et sensibilisations': {
      icon: GraduationCap,
      description: 'Formation et sensibilisation'
    },
    'SMé, processus et infirmations documentées': {
      icon: FileText,
      description: 'Documentation et processus'
    },
    'Objectifs, cibles et planifications': {
      icon: Goal,
      description: 'Définition des objectifs et planification'
    },
    'Installations, équipements, usages énergétiques significatifs': {
      icon: Settings,
      description: 'Gestion des installations et équipements'
    },
    'Indicateurs de performance énergetique (IPE)': {
      icon: BarChart3,
      description: 'Mesure et analyse des performances'
    },
    'Revue énergétique, Audit et revue de management énergétique': {
      icon: ClipboardCheck,
      description: 'Évaluation et amélioration continue'
    },
    'Non conformités (NC), Actions correctives (AC) et Amélioration': {
      icon: AlertTriangle,
      description: 'Actions correctives et améliorations'
    }
  };

  useEffect(() => {
    const state = location.state as { 
      sector?: string; 
      energyTypes?: string[];
      standards?: string[];
      issues?: string[];
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
    if (state?.issues) {
      setSelectedIssues(state.issues);
    }
  }, [location]);

  const { issues, isLoading, error } = useSectorStandardsIssues(
    selectedSector,
    selectedEnergies,
    selectedStandards
  );

  const filteredIssues = issues.filter(issue =>
    issue.issue_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleIssue = (issueName: string) => {
    setSelectedIssues(prev => 
      prev.includes(issueName)
        ? prev.filter(i => i !== issueName)
        : [...prev, issueName]
    );
  };

  const handlePrevious = () => {
    navigate('/operations/standards', { 
      state: { 
        sector: selectedSector,
        energyTypes: selectedEnergies,
        standards: selectedStandards
      } 
    });
  };

  const handleNext = () => {
    navigate('/operations/criteria', { 
      state: { 
        sector: selectedSector,
        energyTypes: selectedEnergies,
        standards: selectedStandards,
        issues: selectedIssues 
      } 
    });
  };

  const handleAddIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newIssueData.code || !newIssueData.name) {
      setIssueError('Veuillez remplir le code et le nom de l\'enjeu');
      return;
    }

    try {
      setIsSubmittingIssue(true);
      setIssueError(null);

      // Insert new issue
      const { error: issueError } = await supabase
        .from('issues')
        .insert([{
          code: newIssueData.code,
          name: newIssueData.name,
          description: newIssueData.description || null
        }]);

      if (issueError) throw issueError;

      // Add the new issue to sector_standards_issues if sector, energy type and standards are selected
      if (selectedSector && selectedEnergies.length > 0) {
        // Get existing issues for this sector/energy type/standards
        const { data: existingData, error: fetchError } = await supabase
          .from('sector_standards_issues')
          .select('issue_codes')
          .eq('sector_name', selectedSector)
          .eq('energy_type_name', selectedEnergies[0])
          .eq('standard_name', selectedStandards[0])
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        const currentIssues = existingData?.issue_codes || [];
        const updatedIssues = [...currentIssues, newIssueData.code];

        // Update or insert sector_standards_issues
        const { error: upsertError } = await supabase
          .from('sector_standards_issues')
          .upsert({
            sector_name: selectedSector,
            energy_type_name: selectedEnergies[0],
            standard_name: selectedStandards[0],
            issue_codes: updatedIssues
          });

        if (upsertError) throw upsertError;

        // Add to selected issues
        setSelectedIssues(prev => [...prev, newIssueData.name]);
      }

      // Reset form and close modal
      setNewIssueData({ code: '', name: '', description: '' });
      setShowAddIssueModal(false);
      
      // Show success message
      setIssueSuccess('Enjeu ajouté avec succès');
      setTimeout(() => setIssueSuccess(null), 3000);

    } catch (err: any) {
      console.error('Error adding issue:', err);
      setIssueError(err.message || 'Erreur lors de l\'ajout de l\'enjeu');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  const resetIssueForm = () => {
    setNewIssueData({ code: '', name: '', description: '' });
    setIssueError(null);
  };

  const handleEditIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editIssueData.code || !editIssueData.name || !editingIssue) {
      setIssueError('Veuillez remplir le code et le nom de l\'enjeu');
      return;
    }

    try {
      setIsEditingIssue(true);
      setIssueError(null);

      // Update issue
      const { error: updateError } = await supabase
        .from('issues')
        .update({
          code: editIssueData.code,
          name: editIssueData.name,
          description: editIssueData.description || null
        })
        .eq('name', editingIssue);

      if (updateError) throw updateError;

      // Update in sector_standards_issues if the name changed
      if (editIssueData.name !== editingIssue && selectedSector && selectedEnergies.length > 0 && selectedStandards.length > 0) {
        const { data: sectorIssuesData, error: fetchError } = await supabase
          .from('sector_standards_issues')
          .select('issue_codes')
          .eq('sector_name', selectedSector)
          .eq('energy_type_name', selectedEnergies[0])
          .eq('standard_name', selectedStandards[0])
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        if (sectorIssuesData) {
          // Find the old issue code and replace it with the new one
          const { data: oldIssueData } = await supabase
            .from('issues')
            .select('code')
            .eq('name', editingIssue)
            .single();

          if (oldIssueData) {
            const updatedIssues = (sectorIssuesData.issue_codes || []).map((code: string) => 
              code === oldIssueData.code ? editIssueData.code : code
            );

            const { error: updateSectorError } = await supabase
              .from('sector_standards_issues')
              .update({ issue_codes: updatedIssues })
              .eq('sector_name', selectedSector)
              .eq('energy_type_name', selectedEnergies[0])
              .eq('standard_name', selectedStandards[0]);

            if (updateSectorError) throw updateSectorError;
          }
        }
      }

      // Update selected issues
      setSelectedIssues(prev => 
        prev.map(issue => issue === editingIssue ? editIssueData.name : issue)
      );

      // Reset form and close modal
      resetEditIssueForm();
      setShowEditIssueModal(false);
      
      // Show success message
      setIssueSuccess('Enjeu modifié avec succès');
      setTimeout(() => setIssueSuccess(null), 3000);

    } catch (err: any) {
      console.error('Error editing issue:', err);
      setIssueError(err.message || 'Erreur lors de la modification de l\'enjeu');
    } finally {
      setIsEditingIssue(false);
    }
  };

  const handleDeleteIssue = async (issueName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'enjeu "${issueName}" ?`)) {
      return;
    }

    try {
      setIssueError(null);

      // Get the issue code first
      const { data: issueData, error: fetchError } = await supabase
        .from('issues')
        .select('code')
        .eq('name', issueName)
        .single();

      if (fetchError) throw fetchError;

      // Delete from issues table
      const { error: deleteError } = await supabase
        .from('issues')
        .delete()
        .eq('name', issueName);

      if (deleteError) throw deleteError;

      // Remove from sector_standards_issues
      if (selectedSector && selectedEnergies.length > 0 && selectedStandards.length > 0) {
        const { data: sectorIssuesData, error: sectorFetchError } = await supabase
          .from('sector_standards_issues')
          .select('issue_codes')
          .eq('sector_name', selectedSector)
          .eq('energy_type_name', selectedEnergies[0])
          .eq('standard_name', selectedStandards[0])
          .single();

        if (sectorFetchError && sectorFetchError.code !== 'PGRST116') throw sectorFetchError;

        if (sectorIssuesData) {
          const updatedIssues = (sectorIssuesData.issue_codes || []).filter((code: string) => code !== issueData.code);

          const { error: updateError } = await supabase
            .from('sector_standards_issues')
            .update({ issue_codes: updatedIssues })
            .eq('sector_name', selectedSector)
            .eq('energy_type_name', selectedEnergies[0])
            .eq('standard_name', selectedStandards[0]);

          if (updateError) throw updateError;
        }
      }

      // Remove from selected issues
      setSelectedIssues(prev => prev.filter(issue => issue !== issueName));
      
      // Show success message
      setIssueSuccess('Enjeu supprimé avec succès');
      setTimeout(() => setIssueSuccess(null), 3000);

    } catch (err: any) {
      console.error('Error deleting issue:', err);
      setIssueError(err.message || 'Erreur lors de la suppression de l\'enjeu');
    }
  };

  const openEditModal = (issueName: string) => {
    setEditingIssue(issueName);
    setEditIssueData({
      code: '', // We'll fetch this
      name: issueName,
      description: ''
    });
    
    // Fetch issue details
    fetchIssueDetails(issueName);
    setShowEditIssueModal(true);
    setActiveDropdown(null);
  };

  const fetchIssueDetails = async (issueName: string) => {
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('name', issueName)
        .single();

      if (error) throw error;

      setEditIssueData({
        code: data.code,
        name: data.name,
        description: data.description || ''
      });
    } catch (err: any) {
      console.error('Error fetching issue details:', err);
      setIssueError('Erreur lors du chargement des détails de l\'enjeu');
    }
  };

  const resetEditIssueForm = () => {
    setEditIssueData({ code: '', name: '', description: '' });
    setEditingIssue(null);
    setIssueError(null);
  };

  const toggleDropdown = (issueName: string) => {
    setActiveDropdown(activeDropdown === issueName ? null : issueName);
  };

  const steps = [
    { name: 'Secteur', status: 'complete' },
    { name: 'Types d\'énergie', status: 'complete' },
    { name: 'Normes / Referentiel', status: 'complete' },
    { name: 'Enjeux', status: 'current' },
    { name: 'Critères', status: 'upcoming' },
    { name: 'Indicateurs', status: 'upcoming' },
    { name: 'Structure', status: 'upcoming' },
     { name: 'Utilisateurs', status: 'upcoming'  }
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex justify-between items-start mb-8">
          <div className="text-left">
            <h1 className="text-3xl font-bold text-gray-800">Sélectionnez vos enjeux</h1>
            <p className="text-gray-600 mt-2">
              {selectedSector 
                ? `Enjeux disponibles pour le secteur ${selectedSector}`
                : 'Identifiez les enjeux principaux de votre démarche'}
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
                resetIssueForm();
                setShowAddIssueModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Ajouter un enjeu</span>
            </button>
            <CollapsibleSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Rechercher un enjeu..."
              className="mt-2"
            />
          </div>
        </div>

        <ProgressNav steps={steps} />

        {/* Success and Error Messages for Issues */}
        {issueSuccess && (
          <div className="mt-8 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg animate-fade-in">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-700">{issueSuccess}</p>
            </div>
          </div>
        )}

        {issueError && (
          <div className="mt-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-fade-in">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{issueError}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">Une erreur est survenue lors du chargement des enjeux.</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="mt-12 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            {filteredIssues.map((issue) => {
              const { icon: Icon, description } = issueIcons[issue.issue_name] || 
                { icon: FileText, description: 'Enjeu énergétique' };
              
              return (
                <div
                  key={issue.issue_name}
                  onClick={() => toggleIssue(issue.issue_name)}
                  onMouseEnter={() => toggleDropdown(issue.issue_name)}
                  onMouseLeave={() => toggleDropdown(null)}
                  className={`
                    relative overflow-hidden rounded-xl p-6 cursor-pointer
                    transform transition-all duration-300 hover:scale-105
                    ${selectedIssues.includes(issue.issue_name)
                      ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg scale-105'
                      : 'bg-white text-gray-800 hover:shadow-xl'
                    }
                  `}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`
                      p-3 rounded-full
                      ${selectedIssues.includes(issue.issue_name)
                        ? 'bg-white/20'
                        : 'bg-gray-100'
                      }
                    `}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{issue.issue_name}</h3>
                      <p className={`
                        text-sm mt-1
                        ${selectedIssues.includes(issue.issue_name)
                          ? 'text-white/80'
                          : 'text-gray-600'
                        }
                      `}>
                        {description}
                      </p>
                    </div>
                  </div>

                  {/* Selection indicator */}
                  {selectedIssues.includes(issue.issue_name) && (
                    <div className="absolute top-4 right-4 z-10">
                      <div className="bg-white/20 rounded-full p-1">
                        <CheckCircle className="w-6 h-6 text-white animate-pulse" />
                      </div>
                    </div>
                  )}

                  {/* Operations Dropdown */}
                  <div
                    className={`
                      absolute right-3 top-3 transition-all duration-300 z-20
                      ${activeDropdown === issue.issue_name ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}
                    `}
                  >
                    <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-white/20 p-2 space-y-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(issue.issue_name);
                        }}
                        className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200 w-full text-left group"
                      >
                        <Edit3 size={16} className="group-hover:rotate-12 transition-transform duration-200" />
                        <span className="font-medium">Modifier</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteIssue(issue.issue_name);
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
            disabled={selectedIssues.length === 0}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium
              transform transition-all duration-300
              ${selectedIssues.length > 0
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

      {/* Add Issue Modal */}
      {showAddIssueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative animate-scaleIn">
            <button
              onClick={() => {
                setShowAddIssueModal(false);
                resetIssueForm();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Ajouter un nouvel enjeu</h2>

            <form onSubmit={handleAddIssue} className="space-y-4">
              <div>
                <label htmlFor="issue_code" className="block text-sm font-medium text-gray-700 mb-1">
                  Code de l'enjeu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="issue_code"
                  value={newIssueData.code}
                  onChange={(e) => setNewIssueData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ex: ENJ_001, CONTEXT_01..."
                  required
                />
              </div>

              <div>
                <label htmlFor="issue_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'enjeu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="issue_name"
                  value={newIssueData.name}
                  onChange={(e) => setNewIssueData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ex: Contexte et domaine d'application"
                  required
                />
              </div>

              <div>
                <label htmlFor="issue_description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="issue_description"
                  value={newIssueData.description}
                  onChange={(e) => setNewIssueData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Description de l'enjeu..."
                />
              </div>

              {issueError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                  {issueError}
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddIssueModal(false);
                    resetIssueForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIssue || !newIssueData.code || !newIssueData.name}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isSubmittingIssue || !newIssueData.code || !newIssueData.name
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'
                    }
                  `}
                >
                  {isSubmittingIssue ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Ajout en cours...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Ajouter l'enjeu
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Issue Modal */}
      {showEditIssueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative animate-scaleIn">
            <button
              onClick={() => {
                setShowEditIssueModal(false);
                resetEditIssueForm();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Modifier l'enjeu</h2>

            <form onSubmit={handleEditIssue} className="space-y-4">
              <div>
                <label htmlFor="edit_issue_code" className="block text-sm font-medium text-gray-700 mb-1">
                  Code de l'enjeu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="edit_issue_code"
                  value={editIssueData.code}
                  onChange={(e) => setEditIssueData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ex: ENJ_001, CONTEXT_01..."
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_issue_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'enjeu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="edit_issue_name"
                  value={editIssueData.name}
                  onChange={(e) => setEditIssueData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ex: Contexte et domaine d'application"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_issue_description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="edit_issue_description"
                  value={editIssueData.description}
                  onChange={(e) => setEditIssueData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Description de l'enjeu..."
                />
              </div>

              {issueError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                  {issueError}
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditIssueModal(false);
                    resetEditIssueForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isEditingIssue || !editIssueData.code || !editIssueData.name}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-white
                    transition-all duration-200
                    ${isEditingIssue || !editIssueData.code || !editIssueData.name
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'
                    }
                  `}
                >
                  {isEditingIssue ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Modification en cours...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Modifier l'enjeu
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

export default IssuesPage;