import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Globe,
  Users,
  MapPin,
  Zap,
  Target,
  Building2,
  Shield,
  ChevronRight,
  Search,
  UserCheck,
  Compass,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Organization {
  name: string;
  city: string;
  country: string;
}

const ContextePage = () => {
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      setIsLoading(true);
      // Get the first organization for now - in a real app you'd get the user's organization
      const { data, error } = await supabase
        .from('organizations')
        .select('name, city, country')
        .limit(1)
        .single();

      if (error) throw error;
      setOrganization(data);
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Context elements
  const contextElements = [
    {
      id: 1,
      title: "Analyse du contexte ",
      description: "Identification et évaluation des facteurs internes et externes qui influencent la performance énergétique",
      icon: Search,
      color: "blue",
      gradient: "from-blue-600 to-blue-800",
      borderColor: "border-blue-200",
      hoverBg: "hover:bg-blue-50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      action: () => navigate('/gestion/contexte/enjeux-internes-externes')
    },
    {
      id: 2,
      title: "Analyse Parties intéressées et leurs attentes",
      description: "Identification des parties prenantes et analyse de leurs besoins et attentes énergétiques",
      icon: Users,
      color: "emerald",
      gradient: "from-emerald-600 to-emerald-800",
      borderColor: "border-emerald-200",
      hoverBg: "hover:bg-emerald-50",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      action: () => navigate('/gestion/contexte/parties-interessees')
    },
    {
      id: 3,
      title: "Périmètres et Domaine d'application",
      description: "Définition des limites organisationnelles et du champ d'application du système énergétique",
      icon: MapPin,
      color: "violet",
      gradient: "from-violet-600 to-violet-800",
      borderColor: "border-violet-200",
      hoverBg: "hover:bg-violet-50",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      action: () => navigate('/gestion/contexte/perimetre-domaine')
    },
    {
      id: 4,
      title: "Enjeux énergétiques",
      description: "Identification et priorisation des enjeux énergétiques stratégiques de l'organisation",
      icon: Zap,
      color: "amber",
      gradient: "from-amber-600 to-amber-800",
      borderColor: "border-amber-200",
      hoverBg: "hover:bg-amber-50",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      action: () => navigate('/gestion/contexte/enjeux-energetiques')
    },
    {
      id: 5,
      title: "Situation énergétique de référence (SER), Objectifs et cibles principaux",
      description: "Établissement de la baseline énergétique et définition des objectifs de performance",
      icon: Target,
      color: "teal",
      gradient: "from-teal-600 to-teal-800",
      borderColor: "border-teal-200",
      hoverBg: "hover:bg-teal-50",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
      action: () => navigate('/gestion/contexte/ser-objectifs-cibles')
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

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
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Compass className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Contexte</h1>
   
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-800 font-medium">Analyse Contextuelle</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl">
            Analysez et définissez le contexte organisationnel de votre système de management énergétique. 
            Cette étape fondamentale permet d'établir les bases solides pour une démarche énergétique efficace et adaptée à votre environnement.
          </p>
        </div>

        {/* Context Elements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contextElements.map((element, index) => (
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
                    Analyser
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
              <div className="flex items-center justify-center mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Analyse du Contexte Organisationnel
                </h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                L'analyse du contexte est une étape cruciale qui permet de comprendre l'environnement dans lequel 
                évolue votre organisation. Elle identifie les facteurs internes et externes qui influencent votre 
                performance énergétique et guide la définition d'objectifs réalistes et pertinents pour votre 
                système de management énergétique.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ContextePage;