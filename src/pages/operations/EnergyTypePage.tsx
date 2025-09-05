import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, Plus, Edit3, Trash2, Zap, Flame, Wind, Sun, Leaf, Factory, Battery, Sparkles } from 'lucide-react';
import ProgressNav from '../../components/ProgressNav';
import { useEnergyTypes } from '../../lib/hooks/useEnergyTypes';
import AddEnergyTypeModal from '../../components/AddEnergyTypeModal';
import EditEnergyTypeModal from '../../components/EditEnergyTypeModal';
import { supabase } from '../../lib/supabase';

const EnergyTypePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedEnergy, setSelectedEnergy] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [energyTypeToEdit, setEnergyTypeToEdit] = useState<{ name: string; sector_name: string } | null>(null);

  const energyTypeIcons: Record<string, any> = {
    'Énergies Fossiles': { 
      icon: Flame,
      description: 'Combustibles fossiles et énergies non-renouvelables',
      color: 'from-orange-400 via-orange-500 to-red-600',
      hoverColor: 'from-orange-50 to-red-100',
      iconColor: 'text-orange-500'
    },
    'Énergies Renouvelables': { 
      icon: Sun,
      description: 'Sources d\'énergie renouvelables et durables',
      color: 'from-emerald-400 via-green-500 to-teal-600',
      hoverColor: 'from-emerald-50 to-teal-100',
      iconColor: 'text-emerald-500'
    },
    'Électricité': {
      icon: Zap,
      description: 'Énergie électrique et systèmes électriques',
      color: 'from-yellow-400 via-yellow-500 to-amber-600',
      hoverColor: 'from-yellow-50 to-amber-100',
      iconColor: 'text-yellow-500'
    },
    'Bioénergie': {
      icon: Leaf,
      description: 'Énergies issues de la biomasse',
      color: 'from-green-400 via-green-500 to-emerald-600',
      hoverColor: 'from-green-50 to-emerald-100',
      iconColor: 'text-green-500'
    },
    'Energie électrique': {
      icon: Zap,
      description: 'Énergie électrique et systèmes électriques',
      color: 'from-blue-400 via-blue-500 to-indigo-600',
      hoverColor: 'from-blue-50 to-indigo-100',
      iconColor: 'text-blue-500'
    }
  };

  useEffect(() => {
    const state = location.state as { 
      sector?: string;
      energyTypes?: string[];
    };
    if (state?.sector) {
      setSelectedSector(state.sector);
    }
    if (state?.energyTypes?.[0]) {
      setSelectedEnergy(state.energyTypes[0]);
    }
  }, [location]);

  const { energyTypes, isLoading, error, refetch } = useEnergyTypes(selectedSector);

  const handlePrevious = () => {
    navigate('/operations/sectors', { 
      state: { 
        sector: selectedSector
      } 
    });
  };

  const handleNext = () => {
    if (selectedEnergy) {
      navigate('/operations/standards', { 
        state: { 
          sector: selectedSector,
          energyTypes: [selectedEnergy]
        } 
      });
    }
  };

  const toggleEnergy = (energyType: string) => {
    setSelectedEnergy(selectedEnergy === energyType ? null : energyType);
  };

  const toggleDropdown = (energyTypeName: string) => {
    setActiveDropdown(activeDropdown === energyTypeName ? null : energyTypeName);
  };

  const handleEdit = (e: React.MouseEvent, energyType: { name: string; sector_name: string }) => {
    e.stopPropagation();
    setEnergyTypeToEdit(energyType);
    setIsEditModalOpen(true);
    setActiveDropdown(null);
  };

  const handleDelete = async (e: React.MouseEvent, energyType: { name: string; sector_name: string }) => {
    e.stopPropagation();
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le type d'énergie "${energyType.name}" ?`)) {
      try {
        const { error } = await supabase
          .from('energy_types')
          .delete()
          .eq('name', energyType.name)
          .eq('sector_name', energyType.sector_name);

        if (error) throw error;

        if (selectedEnergy === energyType.name) {
          setSelectedEnergy(null);
        }
        refetch();
      } catch (err: any) {
        console.error('Error deleting energy type:', err.message);
        alert('Erreur lors de la suppression du type d\'énergie');
      }
    }
    setActiveDropdown(null);
  };

  const steps = [
    { name: 'Secteur', status: 'complete' },
    { name: 'Types d\'énergie', status: 'current' },
    { name: 'Normes / Referentiel', status: 'upcoming' },
    { name: 'Enjeux', status: 'upcoming' },
    { name: 'Critères', status: 'upcoming' },
    { name: 'Indicateurs', status: 'upcoming' },
    { name: 'Structure', status: 'upcoming' },
     { name: 'Utilisateurs', status: 'upcoming' }
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-12">
          <div className="text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl">
                <Battery className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Types d'énergie
              </h1>
            </div>
            <div className="space-y-2">
              {selectedSector && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full text-sm font-medium text-blue-800">
                  <Sparkles className="w-4 h-4" />
                  Secteur : {selectedSector}
                </div>
              )}
              <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
                {selectedSector 
                  ? `Découvrez les types d'énergie disponibles pour optimiser votre secteur ${selectedSector}`
                  : 'Choisissez le type d\'énergie que vous utilisez ou souhaitez optimiser pour votre activité'}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="font-medium">Ajouter un type d'énergie</span>
          </button>
        </div>

        <ProgressNav steps={steps} />

        {error && (
          <div className="mt-8 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-red-700 font-medium">Une erreur est survenue lors du chargement des types d'énergie.</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="mt-16 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-yellow-500 border-r-green-500 absolute top-0 left-0"></div>
            </div>
            <p className="text-slate-600 font-medium">Chargement des types d'énergie...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
            {energyTypes.map((energyType, index) => {
              const { icon: Icon, description, color, hoverColor, iconColor } = energyTypeIcons[energyType.name] || 
                { 
                  icon: Zap, 
                  description: 'Type d\'énergie personnalisé', 
                  color: 'from-slate-400 via-slate-500 to-slate-600',
                  hoverColor: 'from-slate-50 to-slate-100',
                  iconColor: 'text-slate-500'
                };
              
              return (
                <div
                  key={energyType.name}
                  className={`
                    relative overflow-hidden rounded-2xl cursor-pointer
                    transform transition-all duration-500 hover:scale-105 group
                    ${selectedEnergy === energyType.name
                      ? `bg-gradient-to-br ${color} text-white shadow-2xl scale-105 ring-4 ring-white/30`
                      : `bg-white/80 backdrop-blur-sm text-slate-800 hover:bg-gradient-to-br hover:${hoverColor} border border-slate-200/50 hover:border-slate-300/50 shadow-lg hover:shadow-2xl`
                    }
                  `}
                  style={{
                    animationDelay: `${index * 150}ms`
                  }}
                  onClick={() => toggleEnergy(energyType.name)}
                  onMouseEnter={() => toggleDropdown(energyType.name)}
                  onMouseLeave={() => toggleDropdown(null)}
                >
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                    <div className={`w-full h-full bg-gradient-to-br ${color} rounded-full blur-2xl`}></div>
                  </div>
                  
                  <div className="relative p-8 space-y-6">
                    {/* Icon and title section */}
                    <div className="flex items-start gap-4">
                      <div className={`
                        p-4 rounded-2xl transition-all duration-500 flex-shrink-0
                        ${selectedEnergy === energyType.name
                          ? 'bg-white/20 backdrop-blur-sm transform scale-110'
                          : `bg-gradient-to-br ${color.replace('via-', '').replace('to-', 'to-')} bg-opacity-10 group-hover:scale-110`
                        }
                      `}>
                        <Icon className={`w-8 h-8 ${
                          selectedEnergy === energyType.name 
                            ? 'text-white drop-shadow-lg' 
                            : `${iconColor} group-hover:text-white transition-colors duration-300`
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold mb-2 leading-tight">{energyType.name}</h3>
                        <div className={`h-1 w-16 rounded-full transition-all duration-300 ${
                          selectedEnergy === energyType.name 
                            ? 'bg-white/50' 
                            : `bg-gradient-to-r ${color} opacity-60`
                        }`}></div>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <p className={`
                      text-sm leading-relaxed
                      ${selectedEnergy === energyType.name
                        ? 'text-white/90'
                        : 'text-slate-600 group-hover:text-slate-700'
                      }
                    `}>
                      {description}
                    </p>

                    {/* Energy visualization */}
                    <div className="flex items-center gap-2">
                      <div className={`flex gap-1 ${
                        selectedEnergy === energyType.name ? 'opacity-100' : 'opacity-60 group-hover:opacity-80'
                      }`}>
                        {[...Array(4)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-6 rounded-full ${
                              selectedEnergy === energyType.name
                                ? 'bg-white/40'
                                : `bg-gradient-to-t ${color}`
                            } transition-all duration-300`}
                            style={{
                              animationDelay: `${i * 200}ms`,
                              animation: selectedEnergy === energyType.name ? 'pulse 2s infinite' : 'none'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Selection indicator */}
                  {selectedEnergy === energyType.name && (
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
                      ${activeDropdown === energyType.name ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}
                    `}
                  >
                    <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-white/20 p-2 space-y-1">
                      <button
                        onClick={(e) => handleEdit(e, energyType)}
                        className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200 w-full text-left group"
                      >
                        <Edit3 size={16} className="group-hover:rotate-12 transition-transform duration-200" />
                        <span className="font-medium">Modifier</span>
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, energyType)}
                        className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 w-full text-left group"
                      >
                        <Trash2 size={16} className="group-hover:scale-110 transition-transform duration-200" />
                        <span className="font-medium">Supprimer</span>
                      </button>
                    </div>
                  </div>

                  {/* Hover glow effect */}
                  <div className={`
                    absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none
                    ${selectedEnergy !== energyType.name ? 'bg-gradient-to-br ' + color + ' opacity-5' : ''}
                  `}></div>
                </div>
              );
            })}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-16 flex justify-between items-center">
          <button
            onClick={handlePrevious}
            className="group flex items-center gap-3 px-8 py-4 rounded-xl font-medium text-slate-600 hover:text-slate-800 bg-white/80 backdrop-blur-sm hover:bg-white border border-slate-200/50 hover:border-slate-300/50 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
            <span>Précédent</span>
          </button>
          
          <button
            onClick={handleNext}
            disabled={!selectedEnergy}
            className={`
              group flex items-center gap-3 px-8 py-4 rounded-xl font-medium
              transform transition-all duration-300 shadow-lg
              ${selectedEnergy
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 hover:shadow-xl hover:scale-105'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }
            `}
          >
            <span>Suivant</span>
            <ArrowRight className={`w-5 h-5 transition-transform duration-300 ${
              selectedEnergy ? 'group-hover:translate-x-1' : ''
            }`} />
          </button>
        </div>
      </div>

      {selectedSector && (
        <AddEnergyTypeModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={refetch}
          sectorName={selectedSector}
        />
      )}

      {energyTypeToEdit && (
        <EditEnergyTypeModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEnergyTypeToEdit(null);
          }}
          onSuccess={refetch}
          energyType={energyTypeToEdit}
        />
      )}
    </div>
  );
};

export default EnergyTypePage;