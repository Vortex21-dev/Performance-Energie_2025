import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, Building, ArrowLeft, Sparkles, Users, Globe, CheckCircle } from 'lucide-react';
import ProgressNav from '../components/ProgressNav';

const CompanyTypeSelectionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<'simple' | 'complex' | null>(null);
  const [selectedType, setSelectedType] = useState<'simple' | 'complex' | null>(null);

  const handleSimpleCompany = () => {
    setSelectedType('simple');
    navigate('/simple-company-form', { state: location.state });
  };

  const handleComplexCompany = () => {
    setSelectedType('complex');
    navigate('/complex-company-form', { state: location.state });
  };

  const handlePrevious = () => {
    navigate(-1);
  };

  const steps = [
    { name: 'Secteur', status: 'complete' },
    { name: 'Types d\'énergie', status: 'complete' },
    { name: 'Normes / Referentiel', status: 'complete' },
    { name: 'Enjeux', status: 'complete' },
    { name: 'Critères', status: 'complete' },
    { name: 'Indicateurs', status: 'complete' },
    { name: 'Structure', status: 'current' },
    { name: 'Utilisateurs', status: 'upcoming'}
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-r from-green-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-purple-400/5 to-pink-400/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full text-blue-700 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Configuration d'entreprise
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 bg-clip-text text-transparent mb-4">
            Choisissez le type d'entreprise
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Sélectionnez la structure qui correspond le mieux à votre organisation pour une configuration optimale
          </p>
        </div>

        <ProgressNav steps={steps} />

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-16 max-w-5xl mx-auto">
          {/* Simple Company Card */}
          <div
            onClick={handleSimpleCompany}
            onMouseEnter={() => setHoveredCard('simple')}
            onMouseLeave={() => setHoveredCard(null)}
            className={`group relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 cursor-pointer transform transition-all duration-500 hover:scale-[1.02] ${
              selectedType === 'simple' 
                ? 'ring-4 ring-green-500/50 shadow-2xl shadow-green-500/20' 
                : 'hover:shadow-2xl shadow-lg'
            } border border-gray-100/50`}
          >
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-blue-50/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Selection Indicator */}
            {selectedType === 'simple' && (
              <div className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            )}

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-4 rounded-2xl transition-all duration-500 ${
                  hoveredCard === 'simple'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg shadow-green-500/30'
                    : 'bg-gradient-to-r from-green-100 to-blue-100'
                }`}>
                  <Building2 className={`h-10 w-10 transition-colors duration-500 ${
                    hoveredCard === 'simple' ? 'text-white' : 'text-green-600'
                  }`} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">Entreprise Simple</h2>
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Recommandé pour débuter</span>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                Idéal pour les entreprises avec une structure unique qui peut avoir un ou plusieurs sites.
              </p>

              <div className="grid grid-cols-1 gap-4 mb-6">
                {[
                  { icon: Building, text: "Structure unique et centralisée" },
                  { icon: Users, text: "Gestion simplifiée des équipes" },
                  { icon: Sparkles, text: "Configuration rapide et intuitive" }
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 group-hover:bg-white/80 transition-colors duration-300">
                    <div className="p-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg">
                      <feature.icon className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700 font-medium">{feature.text}</span>
                  </div>
                ))}
              </div>

         
            </div>
          </div>

          {/* Complex Company Card */}
          <div
            onClick={handleComplexCompany}
            onMouseEnter={() => setHoveredCard('complex')}
            onMouseLeave={() => setHoveredCard(null)}
            className={`group relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 cursor-pointer transform transition-all duration-500 hover:scale-[1.02] ${
              selectedType === 'complex' 
                ? 'ring-4 ring-blue-500/50 shadow-2xl shadow-blue-500/20' 
                : 'hover:shadow-2xl shadow-lg'
            } border border-gray-100/50`}
          >
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Selection Indicator */}
            {selectedType === 'complex' && (
              <div className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            )}

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-4 rounded-2xl transition-all duration-500 ${
                  hoveredCard === 'complex'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30'
                    : 'bg-gradient-to-r from-blue-100 to-purple-100'
                }`}>
                  <Building2 className={`h-10 w-10 transition-colors duration-500 ${
                    hoveredCard === 'complex' ? 'text-white' : 'text-blue-600'
                  }`} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">Entreprise Composée</h2>
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Pour les organisations complexes</span>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                Adapté aux organisations complexes avec plusieurs filières, filiales et sites distribués.
              </p>

              <div className="grid grid-cols-1 gap-4 mb-6">
                {[
                  { icon: Building2, text: "Filières et filiales multiples" },
                  { icon: Globe, text: "Gestion multi-sites avancée" },
                  { icon: Users, text: "Hiérarchies complexes" }
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 group-hover:bg-white/80 transition-colors duration-300">
                    <div className="p-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg">
                      <feature.icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-gray-700 font-medium">{feature.text}</span>
                  </div>
                ))}
              </div>

           
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-12 max-w-5xl mx-auto">
          <button
            onClick={handlePrevious}
            className="group flex items-center gap-3 px-6 py-4 rounded-xl font-medium text-gray-600 hover:text-gray-800 bg-white/80 hover:bg-white backdrop-blur-sm border border-gray-200/50 hover:border-gray-300/50 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
            Précédent
          </button>

          {selectedType && (
            <button className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 transform hover:scale-105">
              Continuer
              <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform duration-300">
                →
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyTypeSelectionPage;