import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Users,
  FileText,
  Building2,
  ChevronRight,
  UserCheck,
  Target,
  Briefcase,
  ClipboardList,
  FileSpreadsheet,
  Calendar
} from 'lucide-react';

const LeadershipPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Leadership elements
  const leadershipElements = [
    {
      id: 'politique',
      title: "Politique et Objectifs",
      description: "Définition de la politique énergétique et des objectifs stratégiques",
      icon: Target,
      color: "blue",
      gradient: "from-blue-600 to-blue-800",
      borderColor: "border-blue-200",
      hoverBg: "hover:bg-blue-50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      action: () => navigate('/gestion/leadership/politique')
    },
    {
      id: 'organisation',
      title: "Organisation et Responsabilités",
      description: "Structure organisationnelle et attribution des responsabilités",
      icon: UserCheck,
      color: "emerald",
      gradient: "from-emerald-600 to-emerald-800",
      borderColor: "border-emerald-200",
      hoverBg: "hover:bg-emerald-50",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      action: () => navigate('/gestion/leadership/organisation')
    },
    {
      id: 'planification',
      title: "Planifications et Ressources",
      description: "Planification des actions et allocation des ressources nécessaires",
      icon: Calendar,
      color: "indigo",
      gradient: "from-indigo-600 to-indigo-800",
      borderColor: "border-indigo-200",
      hoverBg: "hover:bg-indigo-50",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      action: () => navigate('/gestion/leadership/planification')
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
                <div className="p-2 bg-violet-100 rounded-lg">
                  <Users className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Leadership et Engagements</h1>
                  <p className="text-gray-600">Engagement de la direction et politique énergétique</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg text-sm">
              <FileText className="w-4 h-4 text-violet-600" />
              <span className="text-violet-800 font-medium">Management</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl">
            Le leadership et les engagements de la direction sont essentiels pour un système de management énergétique efficace. 
            Cette section vous permet de définir votre politique énergétique, d'organiser les responsabilités et de planifier les ressources nécessaires.
          </p>
        </div>

        {/* Leadership Elements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leadershipElements.map((element, index) => (
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
                Importance du Leadership
              </h3>
              <p className="text-gray-600 leading-relaxed">
                L'engagement de la direction est un pilier fondamental de tout système de management énergétique efficace. 
                Il se traduit par une politique énergétique claire, une organisation adaptée et l'allocation des ressources nécessaires. 
                Cette section vous aide à structurer et à formaliser cet engagement pour assurer le succès de votre démarche énergétique.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LeadershipPage;