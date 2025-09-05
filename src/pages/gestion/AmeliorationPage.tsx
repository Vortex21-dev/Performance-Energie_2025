import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  FileText,
  TrendingUp,
  Building2,
  ChevronRight,
  ClipboardCheck,
  Search,
  AlertCircle
} from 'lucide-react';

const AmeliorationPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Improvement elements
  const ameliorationElements = [
    {
      id: 'audits',
      title: "Donnée d'audits",
      description: "Planification et suivi des audits énergétiques",
      icon: ClipboardCheck,
      color: "blue",
      gradient: "from-blue-600 to-blue-800",
      borderColor: "border-blue-200",
      hoverBg: "hover:bg-blue-50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      action: () => navigate('/gestion/amelioration/audits')
    },
    {
      id: 'revue',
      title: "Revue de management énergétique",
      description: "Évaluation périodique du système de management énergétique",
      icon: Search,
      color: "emerald",
      gradient: "from-emerald-600 to-emerald-800",
      borderColor: "border-emerald-200",
      hoverBg: "hover:bg-emerald-50",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      action: () => navigate('/gestion/amelioration/revue')
    },
    {
      id: 'nc',
      title: "NC et Amélioration",
      description: "Gestion des non-conformités et actions d'amélioration continue",
      icon: AlertCircle,
      color: "violet",
      gradient: "from-violet-600 to-violet-800",
      borderColor: "border-violet-200",
      hoverBg: "hover:bg-violet-50",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      action: () => navigate('/gestion/amelioration/nc')
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
                <div className="p-2 bg-amber-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Amélioration</h1>
                  <p className="text-gray-600">Gestion des audits, revues et actions d'amélioration</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <FileText className="w-4 h-4 text-amber-600" />
              <span className="text-amber-800 font-medium">Amélioration Continue</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl">
            L'amélioration continue est un pilier fondamental de tout système de management énergétique efficace. 
            Cette section vous permet de gérer les audits, les revues de management et les actions d'amélioration 
            pour optimiser en permanence votre performance énergétique.
          </p>
        </div>

        {/* Improvement Elements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ameliorationElements.map((element, index) => (
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
                Amélioration Continue
              </h3>
              <p className="text-gray-600 leading-relaxed">
                L'amélioration continue est un processus cyclique qui vise à optimiser constamment la performance énergétique 
                de votre organisation. À travers les audits, les revues de management et la gestion des non-conformités, 
                vous identifiez les opportunités d'amélioration et mettez en place des actions correctives pour renforcer 
                l'efficacité de votre système de management énergétique.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AmeliorationPage;