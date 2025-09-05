import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Target,
  Save,
  AlertTriangle,
  CheckCircle,
  Loader,
  Building2,
  BarChart3,
  Calendar,
  TrendingUp,
  Edit2,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface SERObjectives {
  organization_name: string;
  baseline_description: string | null;
  objectives_description: string | null;
  targets_description: string | null;
  reference_year: number | null;
  created_at: string;
  updated_at: string;
}

const SERObjectifsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [serObjectives, setSERObjectives] = useState<SERObjectives | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_client';
  
  // Form state
  const [baselineDescription, setBaselineDescription] = useState('');
  const [objectivesDescription, setObjectivesDescription] = useState('');
  const [targetsDescription, setTargetsDescription] = useState('');
  const [referenceYear, setReferenceYear] = useState<number | null>(null);
  
  useEffect(() => {
    fetchUserOrganization();
  }, [user]);
  
  useEffect(() => {
    if (organizationName) {
      fetchSERObjectives();
    }
  }, [organizationName]);
  
  const fetchUserOrganization = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('organization_name')
        .eq('email', user.email)
        .single();
      
      if (error) throw error;
      
      if (data?.organization_name) {
        setOrganizationName(data.organization_name);
      }
    } catch (err: any) {
      console.error('Error fetching user organization:', err);
      setError('Erreur lors du chargement des données de l\'organisation');
    }
  };
  
  const fetchSERObjectives = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('ser_objectives')
        .select('*')
        .eq('organization_name', organizationName)
        .maybeSingle();
      
      if (error) throw error;
      
      setSERObjectives(data);
      
      // Initialize form values
      if (data) {
        setBaselineDescription(data.baseline_description || '');
        setObjectivesDescription(data.objectives_description || '');
        setTargetsDescription(data.targets_description || '');
        setReferenceYear(data.reference_year);
      }
    } catch (err: any) {
      console.error('Error fetching SER objectives:', err);
      setError('Erreur lors du chargement des données SER et objectifs');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSave = async () => {
    if (!organizationName || !isAdmin) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      const serData = {
        organization_name: organizationName,
        baseline_description: baselineDescription,
        objectives_description: objectivesDescription,
        targets_description: targetsDescription,
        reference_year: referenceYear
      };
      
      let result;
      
      if (serObjectives) {
        // Update existing record
        result = await supabase
          .from('ser_objectives')
          .update(serData)
          .eq('organization_name', organizationName);
      } else {
        // Insert new record
        result = await supabase
          .from('ser_objectives')
          .insert([serData]);
      }
      
      if (result.error) throw result.error;
      
      // Show success message
      setSuccess('Données enregistrées avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchSERObjectives();
      
      // Exit edit mode
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error saving SER objectives:', err);
      setError('Erreur lors de l\'enregistrement des données');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleCancel = () => {
    // Reset form values to current data
    if (serObjectives) {
      setBaselineDescription(serObjectives.baseline_description || '');
      setObjectivesDescription(serObjectives.objectives_description || '');
      setTargetsDescription(serObjectives.targets_description || '');
      setReferenceYear(serObjectives.reference_year);
    } else {
      setBaselineDescription('');
      setObjectivesDescription('');
      setTargetsDescription('');
      setReferenceYear(null);
    }
    
    setIsEditing(false);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/gestion/contexte')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Retour</span>
              </button>
              
              <div className="h-6 w-px bg-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Situation énergétique de référence (SER), Objectifs et cibles principaux</h1>
                  {organizationName && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4" />
                      <span>{organizationName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl">
            Établissez votre situation énergétique de référence (SER) et définissez vos objectifs et cibles de performance énergétique.
            Ces éléments serviront de base pour mesurer vos progrès et orienter vos actions d'amélioration.
          </p>
        </div>

        {/* Success and Error Messages */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg"
          >
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-700">{success}</p>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg"
          >
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Situation énergétique et objectifs</h2>
              </div>
              
              {!isEditing && isAdmin && (
                <button
                  onClick={handleEdit}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>{serObjectives ? 'Modifier' : 'Ajouter'}</span>
                </button>
              )}
            </div>
            
            <div className="p-6">
              {isEditing ? (
                <form className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Année de référence.
                    </label>
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                      <input
                        type="text"
                        value={referenceYear || ''}
                        onChange={(e) => setReferenceYear(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="Ex: 2023"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description de la situation énergétique de référence (SER)
                    </label>
                    <div className="flex items-start">
                      <BarChart3 className="w-5 h-5 text-gray-400 mt-2 mr-2 flex-shrink-0" />
                      <textarea
                        rows={6}
                        value={baselineDescription || ''}
                        onChange={(e) => setBaselineDescription(e.target.value)}
                        placeholder="Décrivez la situation énergétique actuelle de votre organisation, incluant les consommations de référence, les facteurs statiques, etc."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description des objectifs énergétiques
                    </label>
                    <div className="flex items-start">
                      <Target className="w-5 h-5 text-gray-400 mt-2 mr-2 flex-shrink-0" />
                      <textarea
                        rows={6}
                        value={objectivesDescription || ''}
                        onChange={(e) => setObjectivesDescription(e.target.value)}
                        placeholder="Décrivez les objectifs énergétiques généraux de votre organisation"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description des cibles spécifiques
                    </label>
                    <div className="flex items-start">
                      <TrendingUp className="w-5 h-5 text-gray-400 mt-2 mr-2 flex-shrink-0" />
                      <textarea
                        rows={6}
                        value={targetsDescription || ''}
                        onChange={(e) => setTargetsDescription(e.target.value)}
                        placeholder="Décrivez les cibles spécifiques et mesurables pour atteindre vos objectifs énergétiques"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    >
                      {isSaving ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Enregistrer
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : serObjectives ? (
                <div className="space-y-8">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">Année de référence</h3>
                      <p className="text-gray-700">
                        {serObjectives.reference_year || 'Non spécifiée'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">Situation énergétique de référence (SER)</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-line">
                          {serObjectives.baseline_description || 'Aucune description fournie'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      <Target className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">Objectifs énergétiques</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-line">
                          {serObjectives.objectives_description || 'Aucune description fournie'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">Cibles spécifiques</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-line">
                          {serObjectives.targets_description || 'Aucune description fournie'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>Dernière mise à jour: {formatDate(serObjectives.updated_at)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune donnée disponible</h3>
                  <p className="text-gray-500 mb-6">
                    Vous n'avez pas encore défini votre situation énergétique de référence et vos objectifs.
                  </p>
                  {isAdmin && (
                    <button
                      onClick={handleEdit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Ajouter maintenant
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SERObjectifsPage;