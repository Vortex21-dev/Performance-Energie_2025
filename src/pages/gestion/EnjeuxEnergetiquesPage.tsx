import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Zap,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Loader,
  Building2,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Issue {
  code: string;
  name: string;
  description: string | null;
}

interface OrganizationIssue {
  organization_name: string;
  issue_code: string;
  priority: number | null;
  notes: string | null;
  created_at: string;
  issue?: Issue;
}

const EnjeuxEnergetiquesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<OrganizationIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingIssue, setEditingIssue] = useState<OrganizationIssue | null>(null);
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<number | null>(null);
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_client';
  
  useEffect(() => {
    fetchUserOrganization();
  }, [user]);
  
  useEffect(() => {
    if (organizationName) {
      fetchAllIssues();
      fetchSelectedIssues();
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
  
  const fetchAllIssues = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      setAllIssues(data || []);
    } catch (err: any) {
      console.error('Error fetching issues:', err);
      setError('Erreur lors du chargement des enjeux');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchSelectedIssues = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('organization_issues')
        .select(`
          *,
          issue:issues(*)
        `)
        .eq('organization_name', organizationName)
        .order('priority', { ascending: true, nullsLast: true });
      
      if (error) throw error;
      
      setSelectedIssues(data || []);
    } catch (err: any) {
      console.error('Error fetching selected issues:', err);
      setError('Erreur lors du chargement des enjeux sélectionnés');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddIssue = async (issueCode: string) => {
    if (!organizationName || !isAdmin) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if already selected
      const isAlreadySelected = selectedIssues.some(i => i.issue_code === issueCode);
      
      if (isAlreadySelected) {
        setError('Cet enjeu est déjà sélectionné');
        return;
      }
      
      // Get the next priority number
      const nextPriority = selectedIssues.length > 0 
        ? Math.max(...selectedIssues.map(i => i.priority || 0)) + 1 
        : 1;
      
      const { error } = await supabase
        .from('organization_issues')
        .insert([{
          organization_name: organizationName,
          issue_code: issueCode,
          priority: nextPriority,
          notes: ''
        }]);
      
      if (error) throw error;
      
      // Show success message
      setSuccess('Enjeu ajouté avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchSelectedIssues();
    } catch (err: any) {
      console.error('Error adding issue:', err);
      setError('Erreur lors de l\'ajout de l\'enjeu');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemoveIssue = async (issueCode: string) => {
    if (!organizationName || !isAdmin) return;
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet enjeu ?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('organization_issues')
        .delete()
        .eq('organization_name', organizationName)
        .eq('issue_code', issueCode);
      
      if (error) throw error;
      
      // Show success message
      setSuccess('Enjeu supprimé avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchSelectedIssues();
    } catch (err: any) {
      console.error('Error removing issue:', err);
      setError('Erreur lors de la suppression de l\'enjeu');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEdit = (issue: OrganizationIssue) => {
    setEditingIssue(issue);
    setNotes(issue.notes || '');
    setPriority(issue.priority);
  };
  
  const handleSaveEdit = async () => {
    if (!editingIssue || !organizationName || !isAdmin) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('organization_issues')
        .update({ 
          notes: notes,
          priority: priority
        })
        .eq('organization_name', organizationName)
        .eq('issue_code', editingIssue.issue_code);
      
      if (error) throw error;
      
      // Reset edit state
      setEditingIssue(null);
      setNotes('');
      setPriority(null);
      
      // Show success message
      setSuccess('Enjeu modifié avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchSelectedIssues();
    } catch (err: any) {
      console.error('Error updating issue:', err);
      setError('Erreur lors de la modification de l\'enjeu');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleMovePriority = async (issueCode: string, direction: 'up' | 'down') => {
    if (!organizationName || !isAdmin) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Find the current issue and its neighbors
      const sortedIssues = [...selectedIssues].sort((a, b) => {
        if (a.priority === null) return 1;
        if (b.priority === null) return -1;
        return a.priority - b.priority;
      });
      
      const currentIndex = sortedIssues.findIndex(i => i.issue_code === issueCode);
      if (currentIndex === -1) return;
      
      // Can't move up if already at the top
      if (direction === 'up' && currentIndex === 0) return;
      
      // Can't move down if already at the bottom
      if (direction === 'down' && currentIndex === sortedIssues.length - 1) return;
      
      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      // Swap priorities
      const currentIssue = sortedIssues[currentIndex];
      const swapIssue = sortedIssues[swapIndex];
      
      const currentPriority = currentIssue.priority;
      const swapPriority = swapIssue.priority;
      
      // Update the first issue
      const { error: error1 } = await supabase
        .from('organization_issues')
        .update({ priority: swapPriority })
        .eq('organization_name', organizationName)
        .eq('issue_code', currentIssue.issue_code);
      
      if (error1) throw error1;
      
      // Update the second issue
      const { error: error2 } = await supabase
        .from('organization_issues')
        .update({ priority: currentPriority })
        .eq('organization_name', organizationName)
        .eq('issue_code', swapIssue.issue_code);
      
      if (error2) throw error2;
      
      // Refresh data
      fetchSelectedIssues();
    } catch (err: any) {
      console.error('Error updating priority:', err);
      setError('Erreur lors de la modification de la priorité');
    } finally {
      setIsLoading(false);
    }
  };
  
  const cancelEdit = () => {
    setEditingIssue(null);
    setNotes('');
    setPriority(null);
  };
  
  const filteredIssues = allIssues.filter(issue => {
    const searchLower = searchQuery.toLowerCase();
    return (
      issue.name.toLowerCase().includes(searchLower) ||
      (issue.description && issue.description.toLowerCase().includes(searchLower)) ||
      issue.code.toLowerCase().includes(searchLower)
    );
  });
  
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
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Zap className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Enjeux énergétiques</h1>
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
            Identifiez et priorisez les enjeux énergétiques stratégiques de votre organisation. 
            Cette étape est essentielle pour cibler vos efforts d'amélioration de la performance énergétique.
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Available Issues */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-amber-100 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-amber-100 rounded-lg mr-3">
                      <Zap className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-800">Enjeux disponibles</h2>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher un enjeu..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {isLoading && allIssues.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <Loader className="w-8 h-8 animate-spin text-amber-500" />
                  </div>
                ) : filteredIssues.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Aucun enjeu trouvé.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {filteredIssues.map((issue) => {
                      const isSelected = selectedIssues.some(i => i.issue_code === issue.code);
                      
                      return (
                        <motion.div
                          key={issue.code}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`
                            p-4 rounded-lg border transition-all duration-200
                            ${isSelected 
                              ? 'border-amber-300 bg-amber-50' 
                              : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600">
                                <span>{getIssueIcon(issue.name)}</span>
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900">{issue.name}</h3>
                                {issue.description && (
                                  <p className="text-sm text-gray-500">{issue.description}</p>
                                )}
                              </div>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => isSelected ? handleRemoveIssue(issue.code) : handleAddIssue(issue.code)}
                                className={`
                                  flex items-center px-3 py-1.5 rounded-lg text-sm font-medium
                                  ${isSelected
                                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                    : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                  }
                                  transition-colors
                                `}
                              >
                                {isSelected ? (
                                  <>
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Retirer
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4 mr-1" />
                                    Ajouter
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Selected Issues */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-green-100 border-b border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg mr-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Enjeux sélectionnés</h2>
                    <p className="text-sm text-gray-600">Priorité décroissante (du plus au moins important)</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {isLoading && selectedIssues.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <Loader className="w-8 h-8 animate-spin text-green-500" />
                  </div>
                ) : selectedIssues.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Aucun enjeu sélectionné.</p>
                    <p className="text-sm text-gray-400 mt-2">Ajoutez des enjeux depuis la liste à gauche.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedIssues.map((issue) => (
                      <motion.div
                        key={issue.issue_code}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`
                          p-4 rounded-lg border transition-all duration-200
                          ${editingIssue?.issue_code === issue.issue_code 
                            ? 'border-blue-300 bg-blue-50' 
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                          }
                        `}
                      >
                        {editingIssue?.issue_code === issue.issue_code ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Priorité
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={priority || ''}
                                onChange={(e) => setPriority(e.target.value ? parseInt(e.target.value) : null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                              </label>
                              <textarea
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Notes sur cet enjeu..."
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={cancelEdit}
                                className="flex items-center px-3 py-1.5 text-gray-600 hover:text-gray-800 transition-colors"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Annuler
                              </button>
                              <button
                                onClick={handleSaveEdit}
                                className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <Save className="w-4 h-4 mr-1" />
                                Enregistrer
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600">
                                  <span>{getIssueIcon(issue.issue?.name || '')}</span>
                                </div>
                                <div>
                                  <div className="flex items-center">
                                    <h3 className="font-medium text-gray-900">{issue.issue?.name}</h3>
                                    {issue.priority && (
                                      <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                                        Priorité {issue.priority}
                                      </span>
                                    )}
                                  </div>
                                  {issue.issue?.description && (
                                    <p className="text-sm text-gray-500">{issue.issue.description}</p>
                                  )}
                                </div>
                              </div>
                              {isAdmin && (
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => handleMovePriority(issue.issue_code, 'up')}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                    title="Augmenter la priorité"
                                  >
                                    <ArrowUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleMovePriority(issue.issue_code, 'down')}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                    title="Diminuer la priorité"
                                  >
                                    <ArrowDown className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEdit(issue)}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                    title="Modifier"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveIssue(issue.issue_code)}
                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                            {issue.notes && (
                              <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                                <div className="flex items-start">
                                  <Info className="w-4 h-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                                  <p>{issue.notes}</p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnjeuxEnergetiquesPage;