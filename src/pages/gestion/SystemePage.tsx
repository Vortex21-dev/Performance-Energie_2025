import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Cog, Building2, ChevronRight, FileSpreadsheet, Zap, BarChart3, Database, Search, PenTool, Building, Presentation as FilePresentation } from 'lucide-react';

const SystemePage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // System elements
  const systemElements = [
    {
      id: 'processus',
      title: "Processus et système documentaire",
      description: "Gestion des processus et documentation du système énergétique",
      icon: FileSpreadsheet,
      color: "blue",
      gradient: "from-blue-600 to-blue-800",
      borderColor: "border-blue-200",
      hoverBg: "hover:bg-blue-50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      action: () => navigate('/gestion/systeme/processus')
    },
    {
      id: 'ues',
      title: "UES",
      description: "Usages Énergétiques Significatifs",
      icon: Zap,
      color: "emerald",
      gradient: "from-emerald-600 to-emerald-800",
      borderColor: "border-emerald-200",
      hoverBg: "hover:bg-emerald-50",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      action: () => navigate('/gestion/systeme/ues')
    },
    {
      id: 'demande',
      title: "Demande énergétique",
      description: "Analyse et gestion de la demande énergétique",
      icon: BarChart3,
      color: "amber",
      gradient: "from-amber-600 to-amber-800",
      borderColor: "border-amber-200",
      hoverBg: "hover:bg-amber-50",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      action: () => navigate('/gestion/systeme/demande')
    },
    {
      id: 'donnees',
      title: "Données énergétiques",
      description: "Collecte et gestion des données énergétiques",
      icon: Database,
      color: "violet",
      gradient: "from-violet-600 to-violet-800",
      borderColor: "border-violet-200",
      hoverBg: "hover:bg-violet-50",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      action: () => navigate('/gestion/systeme/donnees')
    },
    {
      id: 'revue',
      title: "Revue énergetiques",
      description: "Analyse et revue des données énergétiques",
      icon: FilePresentation,
      color: "purple",
      gradient: "from-purple-600 to-purple-800",
      borderColor: "border-purple-200",
      hoverBg: "hover:bg-purple-50",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      action: () => navigate('/gestion/systeme/revue')
    },
    {
      id: 'conception',
      title: "Conception et modifications",
      description: "Conception et modifications des systèmes énergétiques",
      icon: PenTool,
      color: "teal",
      gradient: "from-teal-600 to-teal-800",
      borderColor: "border-teal-200",
      hoverBg: "hover:bg-teal-50",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
      action: () => navigate('/gestion/systeme/conception')
    },
    {
      id: 'infrastructures',
      title: "Maintenance des infrastructures",
      description: "Gestion des infrastructures énergétiques",
      icon: Building,
      color: "indigo",
      gradient: "from-indigo-600 to-indigo-800",
      borderColor: "border-indigo-200",
      hoverBg: "hover:bg-indigo-50",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      action: () => navigate('/gestion/systeme/infrastructures')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/GestionPage')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Retour</span>
              </button>
              
              <div className="h-6 w-px bg-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Cog className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Système</h1>
                  <p className="text-gray-600">Configuration et gestion du système de management énergétique</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800 font-medium">Configuration Système</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl">
            Configurez et gérez tous les aspects de votre système de management énergétique. 
            Cette section vous permet de définir les processus, les usages énergétiques significatifs, 
            et de gérer les données et infrastructures énergétiques.
          </p>
        </div>

        {/* System Elements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {systemElements.map((element, index) => (
            <motion.div
              key={element.id}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: (i) => ({
                  opacity: 1,
                  y: 0,
                  transition: {
                    delay: i * 0.1,
                    duration: 0.5,
                    ease: "easeOut"
                  }
                })
              }}
              className={`
                group relative bg-white rounded-xl border-2 ${element.borderColor} 
                ${element.hoverBg} hover:border-gray-300 hover:shadow-lg 
                transition-all duration-300 cursor-pointer overflow-hidden
              `}
              onClick={element.action}
            >
              {/* Content */}
              <div className="p-6">
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-12 h-12 ${element.iconBg} rounded-lg mb-4`}>
                  <element.icon className={`w-6 h-6 ${element.iconColor}`} />
                </div>
                
                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-900 mb-3 leading-tight">
                  {element.title}
                </h3>
                
                {/* Description */}
                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  {element.description}
                </p>

                {/* Action Link */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    Configurer
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200" />
                </div>
              </div>

              {/* Hover indicator */}
              <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${element.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
            </motion.div>
          ))}
        </div>

        {/* Information Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-12"
        >
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <div className="max-w-4xl mx-auto text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Système de Management Énergétique
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Le système de management énergétique (SMÉ) est l'ensemble des éléments corrélés ou interactifs 
                qui permettent d'élaborer une politique énergétique et des objectifs énergétiques, ainsi que 
                des processus et procédures pour atteindre ces objectifs. Cette section vous permet de configurer 
                et de gérer tous les aspects de votre SMÉ selon les normes ISO 50001 et autres référentiels.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SystemePage;