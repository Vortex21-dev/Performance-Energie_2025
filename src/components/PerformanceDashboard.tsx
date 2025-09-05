import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Zap, 
  Target, 
  CheckSquare, 
  TrendingUp,
  X,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronRight,
  Activity,
  Gauge,
  Award,
  Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PerformanceData {
  id: string;
  site_name: string;
  annee: number;
  performance_pourcent: number | null;
  performance_precedente: number | null;
  performance_janvier: number | null;
  performance_fevrier: number | null;
  performance_mars: number | null;
  performance_avril: number | null;
  performance_mai: number | null;
  performance_juin: number | null;
  performance_juillet: number | null;
  performance_aout: number | null;
  performance_septembre: number | null;
  performance_octobre: number | null;
  performance_novembre: number | null;
  performance_decembre: number | null;
  nombre_axes?: number;
  nombre_enjeux?: number;
  nombre_criteres?: number;
  nombre_indicateurs?: number;
  nombre_total_indicateurs?: number;
  axe_energetique?: string;
  enjeux?: string;
  critere?: string;
  created_at: string;
  updated_at: string;
}

interface PerformanceDashboardProps {
  siteName: string;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ siteName }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [performanceData, setPerformanceData] = useState<{
    globale: PerformanceData | null;
    axes: PerformanceData[];
    enjeux: PerformanceData[];
    criteres: PerformanceData[];
  }>({
    globale: null,
    axes: [],
    enjeux: [],
    criteres: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const monthKeys = [
    'performance_janvier', 'performance_fevrier', 'performance_mars', 'performance_avril',
    'performance_mai', 'performance_juin', 'performance_juillet', 'performance_aout',
    'performance_septembre', 'performance_octobre', 'performance_novembre', 'performance_decembre'
  ];

  const years = [2023, 2024, 2025];

  useEffect(() => {
    fetchPerformanceData();
  }, [siteName, selectedYear]);

  const fetchPerformanceData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch global performance
      const { data: globaleData, error: globaleError } = await supabase
        .from('site_performance_globale')
        .select('*')
        .eq('site_name', siteName)
        .eq('annee', selectedYear)
        .maybeSingle();

      if (globaleError) throw globaleError;

      // Fetch axes performance
      const { data: axesData, error: axesError } = await supabase
        .from('site_performance_axes')
        .select('*')
        .eq('site_name', siteName)
        .eq('annee', selectedYear);

      if (axesError) throw axesError;

      // Fetch enjeux performance
      const { data: enjeuxData, error: enjeuxError } = await supabase
        .from('site_performance_enjeux')
        .select('*')
        .eq('site_name', siteName)
        .eq('annee', selectedYear);

      if (enjeuxError) throw enjeuxError;

      // Fetch criteres performance
      const { data: criteresData, error: criteresError } = await supabase
        .from('site_performance_criteres')
        .select('*')
        .eq('site_name', siteName)
        .eq('annee', selectedYear);

      if (criteresError) throw criteresError;

      setPerformanceData({
        globale: globaleData,
        axes: axesData || [],
        enjeux: enjeuxData || [],
        criteres: criteresData || []
      });

    } catch (err: any) {
      console.error('Error fetching performance data:', err);
      setError('Erreur lors du chargement des données de performance');
    } finally {
      setIsLoading(false);
    }
  };

  const getPerformanceColor = (performance: number | null) => {
    if (performance === null) return 'bg-gray-400';
    if (performance >= 80) return 'bg-green-500';
    if (performance >= 60) return 'bg-blue-500';
    if (performance >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getPerformanceGradient = (performance: number | null) => {
    if (performance === null) return 'from-gray-400 to-gray-500';
    if (performance >= 80) return 'from-green-400 to-green-600';
    if (performance >= 60) return 'from-blue-400 to-blue-600';
    if (performance >= 40) return 'from-yellow-400 to-yellow-600';
    return 'from-red-400 to-red-600';
  };

  const getPerformanceTrend = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) return null;
    const diff = current - previous;
    if (Math.abs(diff) < 1) return { icon: Minus, color: 'text-gray-500', text: 'Stable' };
    if (diff > 0) return { icon: ArrowUp, color: 'text-green-500', text: `+${diff.toFixed(1)}%` };
    return { icon: ArrowDown, color: 'text-red-500', text: `${diff.toFixed(1)}%` };
  };

  const renderPerformanceBlock = (
    title: string,
    icon: React.ElementType,
    data: PerformanceData | PerformanceData[] | null,
    blockType: string,
    className: string = ""
  ) => {
    const performance = Array.isArray(data) 
      ? data.length > 0 ? data.reduce((sum, item) => sum + (item.performance_pourcent || 0), 0) / data.length : null
      : data?.performance_pourcent || null;

    const previousPerformance = Array.isArray(data)
      ? data.length > 0 ? data.reduce((sum, item) => sum + (item.performance_precedente || 0), 0) / data.length : null
      : data?.performance_precedente || null;

    const trend = getPerformanceTrend(performance, previousPerformance);
    const Icon = icon;

    return (
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setSelectedBlock(blockType)}
        className={`
          relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300
          bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50
          hover:border-slate-600/50 hover:shadow-xl hover:shadow-slate-900/20
          ${className}
        `}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${getPerformanceGradient(performance)} shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="text-slate-400 text-sm">
                  {Array.isArray(data) ? `${data.length} éléments` : 'Performance globale'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>

          <div className="space-y-4">
            <div className="flex items-end space-x-4">
              <div className="flex-1">
                <div className="text-3xl font-bold text-white mb-1">
                  {performance !== null ? `${performance.toFixed(1)}%` : 'N/A'}
                </div>
                {trend && (
                  <div className={`flex items-center space-x-1 ${trend.color}`}>
                    <trend.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{trend.text}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${performance || 0}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full bg-gradient-to-r ${getPerformanceGradient(performance)} rounded-full`}
              />
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderDetailModal = () => {
    if (!selectedBlock) return null;

    let data: PerformanceData[] = [];
    let title = '';
    let icon = BarChart3;

    switch (selectedBlock) {
      case 'globale':
        data = performanceData.globale ? [performanceData.globale] : [];
        title = 'Performance Globale';
        icon = Gauge;
        break;
      case 'axes':
        data = performanceData.axes;
        title = 'Axes Énergétiques';
        icon = Zap;
        break;
      case 'enjeux':
        data = performanceData.enjeux;
        title = 'Enjeux Énergétiques';
        icon = Target;
        break;
      case 'criteres':
        data = performanceData.criteres;
        title = 'Critères Énergétiques';
        icon = CheckSquare;
        break;
    }

    const Icon = icon;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={() => setSelectedBlock(null)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-slate-700"
        >
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{title}</h2>
                  <p className="text-slate-400">Site: {siteName} • Année: {selectedYear}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBlock(null)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {data.length === 0 ? (
              <div className="text-center py-12">
                <Icon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">Aucune donnée disponible</h3>
                <p className="text-slate-500">Aucune donnée de performance pour {title.toLowerCase()} en {selectedYear}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">
                        {selectedBlock === 'globale' ? 'Site' : 
                         selectedBlock === 'axes' ? 'Axe Énergétique' :
                         selectedBlock === 'enjeux' ? 'Enjeu' : 'Critère'}
                      </th>
                      <th className="text-center py-3 px-4 text-slate-300 font-medium">Performance Annuelle</th>
                      <th className="text-center py-3 px-4 text-slate-300 font-medium">Évolution</th>
                      {months.map((month) => (
                        <th key={month} className="text-center py-3 px-2 text-slate-300 font-medium text-sm">
                          {month.substring(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, index) => {
                      const trend = getPerformanceTrend(item.performance_pourcent, item.performance_precedente);
                      
                      return (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${getPerformanceColor(item.performance_pourcent)}`}></div>
                              <span className="text-white font-medium">
                                {selectedBlock === 'globale' ? item.site_name :
                                 selectedBlock === 'axes' ? item.axe_energetique :
                                 selectedBlock === 'enjeux' ? item.enjeux :
                                 item.critere}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex flex-col items-center space-y-1">
                              <span className="text-2xl font-bold text-white">
                                {item.performance_pourcent?.toFixed(1) || 'N/A'}%
                              </span>
                              <div className="w-20 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full bg-gradient-to-r ${getPerformanceGradient(item.performance_pourcent)} rounded-full`}
                                  style={{ width: `${item.performance_pourcent || 0}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {trend ? (
                              <div className={`flex items-center justify-center space-x-1 ${trend.color}`}>
                                <trend.icon className="w-4 h-4" />
                                <span className="text-sm font-medium">{trend.text}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          {monthKeys.map((monthKey, monthIndex) => {
                            const monthPerformance = item[monthKey as keyof PerformanceData] as number | null;
                            return (
                              <td key={monthKey} className="py-4 px-2 text-center">
                                <div className="flex flex-col items-center space-y-1">
                                  <span className="text-sm font-medium text-slate-300">
                                    {monthPerformance?.toFixed(1) || '-'}
                                  </span>
                                  {monthPerformance !== null && (
                                    <div className="w-8 bg-slate-700 rounded-full h-1 overflow-hidden">
                                      <div
                                        className={`h-full ${getPerformanceColor(monthPerformance)} rounded-full`}
                                        style={{ width: `${monthPerformance}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-slate-300 text-lg">Chargement des données de performance...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Performance Énergétique</h1>
              <p className="text-slate-400">Site: {siteName}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Circular Performance Layout - Cross Formation */}
        <div className="relative flex items-center justify-center h-[600px]">
          {/* Central Performance Block */}
                     <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="absolute top-0 left-['55px'] transform -translate-x-1/2 -translate-y-1/2"
          >
            {renderPerformanceBlock(
              'Performance Globale',
              Gauge,
              performanceData.globale,
              'globale',
               'w-56 h-56'
            )}
          </motion.div>

          {/* Top Block - Axes */}
   <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="absolute left-0 top-['18px'] transform -translate-x-1/2 -translate-y-1/2"
          >
            {renderPerformanceBlock(
              'Axes Énergétiques',
              Zap,
              performanceData.axes,
              'axes',
              'w-56 h-56'
            )}
          </motion.div>

          {/* Right Block - Enjeux */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="absolute right-0 top-['18px']transform translate-x-1/2 -translate-y-1/2"
          >
            {renderPerformanceBlock(
              'Enjeux Énergétiques',
              Target,
              performanceData.enjeux,
              'enjeux',
              'w-56 h-56'
            )}
          </motion.div>

          {/* Bottom Block - Criteres */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="absolute bottom-0 left-['55px']transform -translate-x-1/2 translate-y-1/2"
          >
            {renderPerformanceBlock(
              'Critères Énergétiques',
              CheckSquare,
              performanceData.criteres,
              'criteres',
              'w-56 h-56'
            )}
          </motion.div>

          {/* Left Block - Détails 
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="absolute left-0 top-['18px'] transform -translate-x-1/2 -translate-y-1/2"
          >
            {renderPerformanceBlock(
              'Détails Performance',
              Activity,
              performanceData.globale,
              'globale',
              'w-56 h-56'
            )}
          </motion.div>*/}
        </div>

        {/* Indicateurs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 p-6 mt-8"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Indicateurs de Performance</h3>
              <p className="text-slate-400 text-sm">Vue d'ensemble des indicateurs clés</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total Axes</span>
                <Award className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {performanceData.globale?.nombre_axes || 0}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total Enjeux</span>
                <Target className="w-4 h-4 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {performanceData.enjeux.length}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total Critères</span>
                <CheckSquare className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {performanceData.criteres.length}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total Indicateurs</span>
                <BarChart3 className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {performanceData.globale?.nombre_total_indicateurs || 0}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Légende des couleurs */}
        <motion.div
          className="bg-slate-800/50 p-4 rounded-lg mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Niveaux de Performance</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-slate-300 text-sm">Excellent (&gt;80%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-slate-300 text-sm">Bon (60-80%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-slate-300 text-sm">Moyen (40-60%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-slate-300 text-sm">Faible (&lt;40%)</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modal pour les détails */}
      <AnimatePresence>
        {selectedBlock && renderDetailModal()}
      </AnimatePresence>
    </div>
  );
};

export default PerformanceDashboard;