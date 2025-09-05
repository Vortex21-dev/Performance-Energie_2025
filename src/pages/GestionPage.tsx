import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  ArrowRight,
  Calendar,
  Globe,
  Users,
  Cog,
  TrendingUp,
  Shield,
  Building2,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface Organization {
  name: string;
  description?: string;
  city: string;
  country: string;
}

const GestionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
        .select('name, description, city, country')
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

  // Management elements data
  const managementElements = [
    {
      id: 1,
      title: "DONNÉES DE PROGRAMMATION",
      description: "Gestion des périodes de collecte et planification des activités énergétiques",
      icon: Calendar,
      color: "blue",
      gradient: "from-blue-600 to-blue-800",
      borderColor: "border-blue-200",
      hoverBg: "hover:bg-blue-50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      action: () => navigate('/gestion/programmation')
    },
    {
      id: 2,
      title: "CONTEXTE",
      description: "Définition du contexte organisationnel et périmètre d'application",
      icon: Globe,
      color: "emerald",
      gradient: "from-emerald-600 to-emerald-800",
      borderColor: "border-emerald-200",
      hoverBg: "hover:bg-emerald-50",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      action: () => navigate('/gestion/contexte')
    },
    {
      id: 3,
      title: "LEADERSHIP ET ENGAGEMENTS",
      description: "Politique énergétique et engagement de la direction",
      icon: Users,
      color: "violet",
      gradient: "from-violet-600 to-violet-800",
      borderColor: "border-violet-200",
      hoverBg: "hover:bg-violet-50",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      action: () => navigate('/gestion/leadership')
    },
    {
      id: 4,
      title: "SYSTÈME",
      description: "Configuration et gestion du système de management énergétique",
      icon: Cog,
      color: "amber",
      gradient: "from-amber-600 to-amber-800",
      borderColor: "border-amber-200",
      hoverBg: "hover:bg-amber-50",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      action: () => navigate('/gestion/systeme')
    },
    {
      id: 5,
      title: "AMÉLIORATION",
      description: "Actions d'amélioration continue et gestion des non-conformités",
      icon: TrendingUp,
      color: "teal",
      gradient: "from-teal-600 to-teal-800",
      borderColor: "border-teal-200",
      hoverBg: "hover:bg-teal-50",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
      action: () => navigate('/gestion/amelioration')
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
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Retour</span>
              </button>
              
              <div className="h-6 w-px bg-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Éléments de Gestion</h1>
                  {organization && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                   
                      
                   
                    </div>
                  )}
                </div>
              </div>
            </div>

            {user && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800 font-medium">
                  {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl">
            Gérez tous les aspects de votre système de management énergétique avec ces modules spécialisés. 
            Chaque module est conçu pour optimiser vos processus selon les normes ISO 50001.
          </p>
        </div>

        {/* Management Elements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {managementElements.map((element, index) => (
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
                    Accéder au module
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
                Ces modules vous permettent de gérer efficacement votre système de management énergétique 
                selon les normes ISO 50001 et autres référentiels. Chaque module est conçu pour optimiser 
                vos processus et améliorer votre performance énergétique de manière structurée et mesurable.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GestionPage;