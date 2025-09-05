import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Globe,
  Zap,
  FileText,
  Building2,
  CheckCircle,
  AlertTriangle,
  Loader
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface OrganizationSelection {
  id: string;
  organization_name: string;
  sector_name: string;
  energy_type_name: string;
  standard_names: string[];
  issue_names: string[];
  criteria_names: string[];
  indicator_names: string[];
  created_at: string;
}

const SecteurEnergiePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationSelections, setOrganizationSelections] = useState<OrganizationSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchOrganizationSelections();
    }
  }, [user]);

  const fetchOrganizationSelections = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Récupérer d'abord le profil de l'utilisateur pour obtenir son organization_name
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('organization_name')
        .eq('email', user?.email)
        .single();

      if (profileError) throw profileError;
      
      if (!profileData?.organization_name) {
        setOrganizationSelections([]);
        setError("Vous n'êtes associé à aucune organisation.");
        setIsLoading(false);
        return;
      }

      // Récupérer les sélections pour cette organisation
      const { data, error } = await supabase
        .from('organization_selections')
        .select('*')
        .eq('organization_name', profileData.organization_name)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrganizationSelections(data || []);
    } catch (err: any) {
      console.error('Error fetching organization selections:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement des données...</p>
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
                onClick={() => navigate('/gestion/programmation')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Retour</span>
              </button>
              
              <div className="h-6 w-px bg-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Globe className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Secteurs, Types d'énergie et Normes</h1>
                  <p className="text-gray-600">Configuration des secteurs d'activité et normes énergétiques</p>
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
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4"
          >
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">Erreur: {error}</p>
            </div>
          </motion.div>
        )}

        {organizationSelections.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune configuration trouvée</h3>
            <p className="text-gray-600 mb-6">
              Votre organisation n'a pas encore configuré de secteur, type d'énergie ou norme.
            </p>
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/operations/sectors')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Configurer maintenant
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {organizationSelections.map((selection) => (
              <motion.div
                key={selection.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {selection.organization_name}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 rounded-full text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-800 font-medium">Configuration active</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Secteur */}
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Globe className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Secteur d'activité</h4>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-gray-800 font-medium">{selection.sector_name || 'Non défini'}</p>
                    </div>
                  </div>

                  {/* Type d'énergie */}
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Zap className="w-5 h-5 text-amber-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Type d'énergie</h4>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-gray-800 font-medium">{selection.energy_type_name || 'Non défini'}</p>
                    </div>
                  </div>

                  {/* Normes */}
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <FileText className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Normes</h4>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200 max-h-40 overflow-y-auto">
                      {selection.standard_names && selection.standard_names.length > 0 ? (
                        <ul className="space-y-2">
                          {selection.standard_names.map((standard, index) => (
                            <li key={index} className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              <span className="text-gray-800">{standard}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 italic">Aucune norme sélectionnée</p>
                      )}
                    </div>
                  </div>
                </div>

                {user?.role === 'admin' && (
                  <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button
                      onClick={() => navigate('/operations/sectors', { 
                        state: { 
                          editMode: true,
                          selectionId: selection.id
                        }
                      })}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Modifier la configuration
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SecteurEnergiePage;