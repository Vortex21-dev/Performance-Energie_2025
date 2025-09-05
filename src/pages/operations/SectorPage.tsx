import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, Plus, Settings, Trash2, Edit3, Building2, Truck, Factory, Sparkles } from 'lucide-react';
import ProgressNav from '../../components/ProgressNav';
import AddSectorModal from '../../components/AddSectorModal';
import EditSectorModal from '../../components/EditSectorModal';
import { useSectors } from '../../lib/hooks/useSectors';
import { supabase } from '../../lib/supabase';

const SectorPage = () => {
  const navigate = useNavigate();
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [sectorToEdit, setSectorToEdit] = useState<{ name: string } | null>(null);
  const { sectors, isLoading, error, refetch } = useSectors();

  const handleNext = () => {
    if (selectedSector) {
      navigate('/operations/energy-types', { 
        state: { sector: selectedSector }
      });
    }
  };

  const toggleDropdown = (sectorName: string) => {
    setActiveDropdown(activeDropdown === sectorName ? null : sectorName);
  };

  const handleEdit = (e: React.MouseEvent, sector: { name: string }) => {
    e.stopPropagation();
    setSectorToEdit(sector);
    setIsEditModalOpen(true);
    setActiveDropdown(null);
  };

  const handleDelete = async (e: React.MouseEvent, sectorName: string) => {
    e.stopPropagation();
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le secteur "${sectorName}" ?`)) {
      try {
        const { error } = await supabase
          .from('sectors')
          .delete()
          .eq('name', sectorName);

        if (error) throw error;

        if (selectedSector === sectorName) {
          setSelectedSector(null);
        }
        refetch();
      } catch (err: any) {
        console.error('Error deleting sector:', err.message);
        alert('Erreur lors de la suppression du secteur');
      }
    }
    setActiveDropdown(null);
  };

  const steps = [
    { name: 'Secteur', status: 'current' },
    { name: 'Types d\'énergie', status: 'upcoming' },
    { name: 'Normes / Referentiel', status: 'upcoming' },
    { name: 'Enjeux', status: 'upcoming' },
    { name: 'Critères', status: 'upcoming' },
    { name: 'Indicateurs', status: 'upcoming' },
    { name: 'Structure', status: 'upcoming' },
     { name: 'Utilisateurs', status: 'upcoming' }
  ] as const;

  const getSectorIcon = (sectorName: string) => {
    switch (sectorName) {
      case 'Transport':
        return <Truck className="w-16 h-16 text-white drop-shadow-lg" />;
      case 'Batiment tertiaire':
        return <Building2 className="w-16 h-16 text-white drop-shadow-lg" />;
      case 'Industrie':
        return <Factory className="w-16 h-16 text-white drop-shadow-lg" />;
      default:
        return <Factory className="w-16 h-16 text-white drop-shadow-lg" />;
    }
  };

  const getSectorGradient = (sectorName: string) => {
    switch (sectorName) {
      case 'Transport':
        return 'from-blue-400 via-blue-500 to-blue-600';
      case 'Batiment tertiaire':
        return 'from-emerald-400 via-emerald-500 to-green-600';
      case 'Industrie':
        return 'from-purple-400 via-purple-500 to-indigo-600';
      default:
        return 'from-gray-400 via-gray-500 to-gray-600';
    }
  };

  const getSectorHoverGradient = (sectorName: string) => {
    switch (sectorName) {
      case 'Transport':
        return 'from-blue-50 to-blue-100';
      case 'Batiment tertiaire':
        return 'from-emerald-50 to-green-100';
      case 'Industrie':
        return 'from-purple-50 to-indigo-100';
      default:
        return 'from-gray-50 to-gray-100';
    }
  };

  const getSectorIconColor = (sectorName: string) => {
    switch (sectorName) {
      case 'Transport':
        return 'text-blue-500';
      case 'Batiment tertiaire':
        return 'text-emerald-500';
      case 'Industrie':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-12">
          <div className="text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Sélectionnez votre secteur d'activité
              </h1>
            </div>
            <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
              Cette étape nous permet de personnaliser votre expérience selon votre domaine d'activité
            </p>
          </div>
          
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="font-medium">Ajouter un secteur</span>
          </button>
        </div>

        <ProgressNav steps={steps} />

        {error && (
          <div className="mt-8 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-red-700 font-medium">Une erreur est survenue lors du chargement des secteurs.</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="mt-16 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-emerald-500 border-r-blue-500 absolute top-0 left-0"></div>
            </div>
            <p className="text-slate-600 font-medium">Chargement des secteurs...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
            {sectors.map((sector, index) => (
              <div
                key={sector.name}
                className={`
                  relative overflow-hidden rounded-2xl cursor-pointer
                  transform transition-all duration-500 hover:scale-105 group
                  ${selectedSector === sector.name 
                    ? `bg-gradient-to-br ${getSectorGradient(sector.name)} text-white shadow-2xl scale-105 ring-4 ring-white/30` 
                    : `bg-white/80 backdrop-blur-sm text-slate-800 hover:bg-gradient-to-br hover:${getSectorHoverGradient(sector.name)} border border-slate-200/50 hover:border-slate-300/50 shadow-lg hover:shadow-2xl`
                  }
                `}
                style={{
                  animationDelay: `${index * 150}ms`
                }}
                onClick={() => setSelectedSector(sector.name)}
                onMouseEnter={() => toggleDropdown(sector.name)}
                onMouseLeave={() => toggleDropdown(null)}
              >
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                  <div className={`w-full h-full bg-gradient-to-br ${getSectorGradient(sector.name)} rounded-full blur-2xl`}></div>
                </div>
                
                <div className="relative p-8 space-y-6">
                  {/* Icon section */}
                  <div className={`
                    flex items-center justify-center transition-all duration-500
                    ${selectedSector === sector.name 
                      ? 'transform scale-110' 
                      : `group-hover:scale-110 ${getSectorIconColor(sector.name)}`
                    }
                  `}>
                    {selectedSector === sector.name 
                      ? getSectorIcon(sector.name)
                      : React.cloneElement(getSectorIcon(sector.name), {
                          className: `w-16 h-16 ${getSectorIconColor(sector.name)} drop-shadow-lg`
                        })
                    }
                  </div>
                  
                  {/* Title */}
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-2">{sector.name}</h3>
                    <div className={`h-1 w-12 mx-auto rounded-full transition-all duration-300 ${
                      selectedSector === sector.name 
                        ? 'bg-white/50' 
                        : `bg-gradient-to-r ${getSectorGradient(sector.name)} opacity-60`
                    }`}></div>
                  </div>
                </div>

                {/* Operations Dropdown */}
                <div
                  className={`
                    absolute right-3 top-3 transition-all duration-300 z-20
                    ${activeDropdown === sector.name ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}
                  `}
                >
                  <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-white/20 p-2 space-y-1">
                    <button
                      onClick={(e) => handleEdit(e, sector)}
                      className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200 w-full text-left group"
                    >
                      <Edit3 size={16} className="group-hover:rotate-12 transition-transform duration-200" />
                      <span className="font-medium">Modifier</span>
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, sector.name)}
                      className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 w-full text-left group"
                    >
                      <Trash2 size={16} className="group-hover:scale-110 transition-transform duration-200" />
                      <span className="font-medium">Supprimer</span>
                    </button>
                  </div>
                </div>

                {/* Selection indicator */}
                {selectedSector === sector.name && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-white/20 rounded-full p-1">
                      <CheckCircle className="w-6 h-6 text-white animate-pulse" />
                    </div>
                  </div>
                )}

                {/* Hover glow effect */}
                <div className={`
                  absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none
                  ${selectedSector !== sector.name ? 'bg-gradient-to-br ' + getSectorGradient(sector.name) + ' opacity-5' : ''}
                `}></div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-16 flex justify-between items-center">
          <button
            onClick={() => navigate('/admin')}
            className="group flex items-center gap-3 px-8 py-4 rounded-xl font-medium text-slate-600 hover:text-slate-800 bg-white/80 backdrop-blur-sm hover:bg-white border border-slate-200/50 hover:border-slate-300/50 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
            <span>Précédent.</span>
          </button>
          
          <button
            onClick={handleNext}
            disabled={!selectedSector}
            className={`
              group flex items-center gap-3 px-8 py-4 rounded-xl font-medium
              transform transition-all duration-300 shadow-lg
              ${selectedSector
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 hover:shadow-xl hover:scale-105'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }
            `}
          >
            <span>Suivant</span>
            <ArrowRight className={`w-5 h-5 transition-transform duration-300 ${
              selectedSector ? 'group-hover:translate-x-1' : ''
            }`} />
          </button>
        </div>
      </div>

      <AddSectorModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={refetch}
      />

      {sectorToEdit && (
        <EditSectorModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSectorToEdit(null);
          }}
          onSuccess={refetch}
          sector={sectorToEdit}
        />
      )}
    </div>
  );
};

export default SectorPage;