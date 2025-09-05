import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Target,
  FileText,
  Building2,
  CheckCircle,
  AlertTriangle,
  Loader,
  ChevronDown,
  ChevronUp,
  Filter
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

const EnjeuxCriteresPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationSelections, setOrganizationSelections] = useState<OrganizationSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<string[]>([]);
  const [filterStandard, setFilterStandard] = useState<string | null>(null);

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
      
      // Expand the first issue by default if there are selections
      if (data && data.length > 0 && data[0].issue_names && data[0].issue_names.length > 0) {
        setExpandedIssues([data[0].issue_names[0]]);
      }
    } catch (err: any) {
      console.error('Error fetching organization selections:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleIssueExpansion = (issueName: string) => {
    setExpandedIssues(prev => 
      prev.includes(issueName)
        ? prev.filter(i => i !== issueName)
        : [...prev, issueName]
    );
  };

  const getIssueIcon = (issueName: string) => {
    // Map issue names to appropriate icons based on their content
    if (issueName.includes('Contexte')) return '🌍';
    if (issueName.includes('Risques')) return '⚠️';
    if (issueName.includes('Parties')) return '👥';
    if (issueName.includes('Leadership')) return '👑';
    if (issueName.includes('Ressources')) return '🔋';
    if (issueName.includes('Compétences')) return '🎓';
    if (issueName.includes('SMé')) return '📊';
    if (issueName.includes('Objectifs')) return '🎯';
    if (issueName.includes('Installations')) return '🏭';
    if (issueName.includes('IPE')) return '📈';
    if (issueName.includes('Revue')) return '🔍';
    if (issueName.includes('NC')) return '🔧';
    return '📝';
  };

  const getCriteriaIcon = (criteriaName: string) => {
    // Map criteria names to appropriate icons based on their content
    if (criteriaName.includes('Contexte')) return '🌐';
    if (criteriaName.includes('Domaine')) return '📍';
    if (criteriaName.includes('SER')) return '📊';
    if (criteriaName.includes('Risques')) return '⚠️';
    if (criteriaName.includes('Parties')) return '👥';
    if (criteriaName.includes('Leadership')) return '👑';
    if (criteriaName.includes('Politique')) return '📜';
    if (criteriaName.includes('Ressources')) return '🔋';
    if (criteriaName.includes('Achats')) return '🛒';
    if (criteriaName.includes('Compétences')) return '🎓';
    if (criteriaName.includes('Communication')) return '📢';
    if (criteriaName.includes('Sensibilisations')) return '💡';
    if (criteriaName.includes('Smé')) return '⚙️';
    if (criteriaName.includes('Processus')) return '🔄';
    if (criteriaName.includes('Informations')) return '📋';
    if (criteriaName.includes('Objectifs')) return '🎯';
    if (criteriaName.includes('Planifications')) return '📅';
    if (criteriaName.includes('Installations')) return '🏭';
    if (criteriaName.includes('Usages')) return '⚡';
    if (criteriaName.includes('Conception')) return '✏️';
    if (criteriaName.includes('IPE')) return '📈';
    if (criteriaName.includes('Données')) return '💾';
    if (criteriaName.includes('Mesure')) return '📏';
    if (criteriaName.includes('Revue')) return '🔍';
    if (criteriaName.includes('Audit')) return '🔎';
    if (criteriaName.includes('NC')) return '❌';
    if (criteriaName.includes('AC')) return '✅';
    if (criteriaName.includes('Amélioration')) return '📈';
    return '📝';
  };

  const getIssueColor = (issueName: string, index: number) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-emerald-500 to-emerald-600',
      'from-purple-500 to-purple-600',
      'from-amber-500 to-amber-600',
      'from-rose-500 to-rose-600',
      'from-cyan-500 to-cyan-600',
      'from-indigo-500 to-indigo-600',
      'from-green-500 to-green-600',
      'from-pink-500 to-pink-600',
      'from-teal-500 to-teal-600',
      'from-orange-500 to-orange-600',
      'from-violet-500 to-violet-600'
    ];
    
    // Use a hash function to get a consistent color for the same issue name
    const hash = issueName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length] || colors[index % colors.length];
  };

  const getIssueLightColor = (issueName: string, index: number) => {
    const colors = [
      'from-blue-50 to-blue-100',
      'from-emerald-50 to-emerald-100',
      'from-purple-50 to-purple-100',
      'from-amber-50 to-amber-100',
      'from-rose-50 to-rose-100',
      'from-cyan-50 to-cyan-100',
      'from-indigo-50 to-indigo-100',
      'from-green-50 to-green-100',
      'from-pink-50 to-pink-100',
      'from-teal-50 to-teal-100',
      'from-orange-50 to-orange-100',
      'from-violet-50 to-violet-100'
    ];
    
    const hash = issueName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length] || colors[index % colors.length];
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
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Target className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Enjeux et Critères</h1>
                  <p className="text-gray-600">Définition des enjeux énergétiques et critères d'évaluation</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-800 font-medium">Configuration Système</span>
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
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune configuration trouvée</h3>
            <p className="text-gray-600 mb-6">
              Votre organisation n'a pas encore configuré d'enjeux et de critères.
            </p>
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/operations/issues')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
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
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <Building2 className="w-5 h-5 text-emerald-600" />
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

                {/* Filter by standard */}
                {selection.standard_names && selection.standard_names.length > 0 && (
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Filtrer par norme:</span>
                      <select
                        value={filterStandard || ''}
                        onChange={(e) => setFilterStandard(e.target.value || null)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">Toutes les normes</option>
                        {selection.standard_names.map((standard, idx) => (
                          <option key={idx} value={standard}>{standard}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="p-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Enjeux et Critères</h4>
                  
                  {selection.issue_names && selection.issue_names.length > 0 ? (
                    <div className="space-y-4">
                      {selection.issue_names
                        .filter(issue => !filterStandard || true) // TODO: Add actual filtering logic if needed
                        .map((issueName, issueIndex) => (
                          <div 
                            key={issueIndex}
                            className="border border-gray-200 rounded-xl overflow-hidden"
                          >
                            <div 
                              className={`bg-gradient-to-r ${getIssueLightColor(issueName, issueIndex)} p-4 cursor-pointer`}
                              onClick={() => toggleIssueExpansion(issueName)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r ${getIssueColor(issueName, issueIndex)} text-white`}>
                                    <span>{getIssueIcon(issueName)}</span>
                                  </div>
                                  <h5 className="font-medium text-gray-900">{issueName}</h5>
                                </div>
                                {expandedIssues.includes(issueName) ? (
                                  <ChevronUp className="w-5 h-5 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-500" />
                                )}
                              </div>
                            </div>
                            
                            {expandedIssues.includes(issueName) && (
                              <div className="p-4 bg-white">
                                <h6 className="text-sm font-medium text-gray-700 mb-3">Critères associés:</h6>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {selection.criteria_names
                                    .filter(criteriaName => 
                                      // Filter criteria that are relevant to this issue
                                      // This is a simplification - in a real app, you'd have a proper relationship
                                      criteriaName.includes(issueName.split(',')[0]) || 
                                      issueName.includes(criteriaName.split(' ')[0])
                                    )
                                    .map((criteriaName, criteriaIndex) => (
                                      <div 
                                        key={criteriaIndex}
                                        className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
                                      >
                                        <span className="flex-shrink-0">{getCriteriaIcon(criteriaName)}</span>
                                        <span className="text-gray-800 text-sm">{criteriaName}</span>
                                      </div>
                                    ))}
                                </div>
                                
                                {selection.criteria_names.filter(criteriaName => 
                                  criteriaName.includes(issueName.split(',')[0]) || 
                                  issueName.includes(criteriaName.split(' ')[0])
                                ).length === 0 && (
                                  <p className="text-gray-500 italic text-sm">Aucun critère spécifique associé à cet enjeu.</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Aucun enjeu n'a été configuré pour cette organisation.</p>
                    </div>
                  )}
                </div>

                {user?.role === 'admin' && (
                  <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button
                      onClick={() => navigate('/operations/issues', { 
                        state: { 
                          editMode: true,
                          selectionId: selection.id
                        }
                      })}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
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

export default EnjeuxCriteresPage;