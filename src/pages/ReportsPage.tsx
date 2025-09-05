import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ManagementReviewReport from '../components/ManagementReviewReport';
import EnergyReviewReport from '../components/EnergyReviewReport';
import { 
  ArrowLeft,
  FileText,
  Download,
  FileSpreadsheet,
  Edit2,
  Save,
  Plus,
  Trash2,
  Calendar,
  Building2,
  BarChart3,
  Target,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader,
  Filter,
  Search,
  Eye,
  Settings,
  BookOpen,
  Lightbulb,
  Users,
  Clock,
  Award,
  Activity,
  Sparkles,
  Star,
  Layers,
  Globe,
  Gauge,
  Briefcase,
  LayoutDashboard,
  TrendingDown,
  Minus,
  PieChart,
  LineChart,
  RefreshCw,
  Battery,
  Fuel,
  Leaf,
  Percent,
  ChevronsLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface Site {
  name: string;
  organization_name: string;
}

interface PerformanceData {
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
  axe_energetique?: string;
  enjeux?: string;
  critere?: string;
  month?: string;
  consumption?: number;
  efficiency?: number;
  cost?: number;
  variation?: number;
}

interface ReportSection {
  id: string;
  title: string;
  content: string;
  editable: boolean;
  type: 'text' | 'table' | 'chart';
}

interface LexiqueItem {
  terme: string;
  definition: string;
}

interface ActionRecommendation {
  id: string;
  action: string;
  impact: string;
  responsable: string;
  delai: string;
  statut: string;
}

interface KeyIndicator {
  name: string;
  code: string;
  currentValue: number;
  previousValue: number;
  unit: string;
  target: number;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  description: string;
}

const ReportsPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('pilotage');
  const navigate = useNavigate();
  const { user } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  
  // Check if user is admin_client (only role that can modify/add)
  const canModify = user?.role === 'admin_client';
  
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState<'semestre1' | 'semestre2' | 'annuel'>('annuel');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [performanceGlobale, setPerformanceGlobale] = useState<PerformanceData[]>([]);
  const [performanceAxes, setPerformanceAxes] = useState<PerformanceData[]>([]);
  const [performanceEnjeux, setPerformanceEnjeux] = useState<PerformanceData[]>([]);
  const [performanceCriteres, setPerformanceCriteres] = useState<PerformanceData[]>([]);
  const [keyIndicators, setKeyIndicators] = useState<KeyIndicator[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'consumption' | 'efficiency' | 'cost'>('consumption');
  
  const [lexique, setLexique] = useState<LexiqueItem[]>([
    { terme: 'SMÉ', definition: 'Système de Management Énergétique' },
    { terme: 'UES', definition: 'Usage Énergétique Significatif' },
    { terme: 'IPÉ', definition: 'Indicateur de Performance Énergétique' },
    { terme: 'SER', definition: 'Situation Énergétique de Référence' },
    { terme: 'ISO 50001', definition: 'Norme internationale pour les systèmes de management de l\'énergie' }
  ]);
  
  const [actions, setActions] = useState<ActionRecommendation[]>([
    {
      id: '1',
      action: 'Optimisation de l\'éclairage LED',
      impact: '15%',
      responsable: 'Service Technique',
      delai: '3 mois',
      statut: 'En cours'
    },
    {
      id: '2',
      action: 'Amélioration isolation thermique',
      impact: '20%',
      responsable: 'Service Maintenance',
      delai: '6 mois',
      statut: 'Planifié'
    }
  ]);
  
  const [reportSections, setReportSections] = useState<ReportSection[]>([
    {
      id: 'introduction',
      title: 'Introduction',
      content: '',
      editable: true,
      type: 'text'
    },
    {
      id: 'objectifs',
      title: 'Objectifs du rapport',
      content: `• Suivi de la consommation énergétique
• Conformité ISO 50001
• Détection des écarts de performance
• Identification des opportunités d'amélioration
• Évaluation de l'efficacité des actions mises en place`,
      editable: true,
      type: 'text'
    }
  ]);
  
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  
  const years = [2023, 2024, 2025];
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  
  useEffect(() => {
    fetchUserOrganization();
  }, [user]);
  
  useEffect(() => {
    if (organizationName) {
      fetchSites();
    }
  }, [organizationName]);
  
  useEffect(() => {
    if (selectedSite) {
      fetchPerformanceData();
      generateIntroduction();
    }
    generateKeyIndicators();
  }, [selectedSite, selectedYear, selectedPeriod]);
  
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
  
  const fetchSites = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('sites')
        .select('name, organization_name')
        .eq('organization_name', organizationName)
        .order('name');
      
      if (error) throw error;
      
      setSites(data || []);
      
      if (data && data.length > 0 && !selectedSite) {
        setSelectedSite(data[0].name);
      }
    } catch (err: any) {
      console.error('Error fetching sites:', err);
      setError('Erreur lors du chargement des sites');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchPerformanceData = async () => {
    try {
      setIsLoading(true);
      
      const { data: globaleData, error: globaleError } = await supabase
        .from('site_performance_globale')
        .select('*')
        .eq('site_name', selectedSite)
        .eq('annee', selectedYear);
      
      if (globaleError) throw globaleError;
      setPerformanceGlobale(globaleData || []);
      
      const { data: axesData, error: axesError } = await supabase
        .from('site_performance_axes')
        .select('*')
        .eq('site_name', selectedSite)
        .eq('annee', selectedYear);
      
      if (axesError) throw axesError;
      setPerformanceAxes(axesData || []);
      
      const { data: enjeuxData, error: enjeuxError } = await supabase
        .from('site_performance_enjeux')
        .select('*')
        .eq('site_name', selectedSite)
        .eq('annee', selectedYear);
      
      if (enjeuxError) throw enjeuxError;
      setPerformanceEnjeux(enjeuxData || []);
      
      const { data: criteresData, error: criteresError } = await supabase
        .from('site_performance_criteres')
        .select('*')
        .eq('site_name', selectedSite)
        .eq('annee', selectedYear);
      
      if (criteresError) throw criteresError;
      setPerformanceCriteres(criteresData || []);
      
    } catch (err: any) {
      console.error('Error fetching performance data:', err);
      setError('Erreur lors du chargement des données de performance');
    } finally {
      setIsLoading(false);
    }
  };

  const generateKeyIndicators = () => {
    const indicators: KeyIndicator[] = [
      {
        name: 'Consommation de référence (CR) Électricité',
        code: 'CR_ELEC',
        currentValue: 2450,
        previousValue: 2680,
        unit: 'MWh',
        target: 2300,
        status: 'good',
        trend: 'down',
        description: 'Consommation électrique de référence normalisée'
      },
      {
        name: 'Consommation de référence (CR) Hydrocarbure',
        code: 'CR_HYDRO',
        currentValue: 1850,
        previousValue: 1920,
        unit: 'MWh',
        target: 1750,
        status: 'warning',
        trend: 'down',
        description: 'Consommation d\'hydrocarbures de référence'
      },
      {
        name: 'Consommation globale Électricité',
        code: 'CONSO_ELEC',
        currentValue: 2380,
        previousValue: 2650,
        unit: 'MWh',
        target: 2200,
        status: 'good',
        trend: 'down',
        description: 'Consommation électrique totale de l\'organisation'
      },
      {
        name: 'Consommation globale Hydrocarbure',
        code: 'CONSO_HYDRO',
        currentValue: 1780,
        previousValue: 1890,
        unit: 'MWh',
        target: 1650,
        status: 'warning',
        trend: 'down',
        description: 'Consommation totale d\'hydrocarbures'
      },
      {
        name: 'Taux de réduction de la consommation électrique',
        code: 'REDUC_ELEC',
        currentValue: 10.2,
        previousValue: 8.5,
        unit: '%',
        target: 12.0,
        status: 'good',
        trend: 'up',
        description: 'Pourcentage de réduction par rapport à l\'année de référence'
      },
      {
        name: 'Taux de réduction de la consommation d\'hydrocarbure',
        code: 'REDUC_HYDRO',
        currentValue: 5.8,
        previousValue: 4.2,
        unit: '%',
        target: 8.0,
        status: 'warning',
        trend: 'up',
        description: 'Pourcentage de réduction des hydrocarbures'
      },
      {
        name: 'Taux d\'introduction ENR dans le mix énergétique',
        code: 'ENR_MIX',
        currentValue: 15.3,
        previousValue: 12.8,
        unit: '%',
        target: 20.0,
        status: 'good',
        trend: 'up',
        description: 'Part des énergies renouvelables dans le mix énergétique'
      }
    ];
    
    setKeyIndicators(indicators);
  };
  
  const generateIntroduction = () => {
    const periodText = selectedPeriod === 'semestre1' ? 'premier semestre' : 
                      selectedPeriod === 'semestre2' ? 'second semestre' : 'année complète';
    
    const introduction = `Ce rapport présente l'analyse de la performance énergétique du site ${selectedSite} pour le ${periodText} ${selectedYear}.

Dans le cadre de notre démarche d'amélioration continue et de conformité à la norme ISO 50001, ce document synthétise les résultats obtenus, identifie les écarts par rapport aux objectifs fixés et propose des actions d'amélioration.

L'analyse porte sur l'ensemble des usages énergétiques significatifs (UES) et s'appuie sur les indicateurs de performance énergétique (IPÉ) définis dans notre système de management énergétique (SMÉ).`;
    
    setReportSections(prev => prev.map(section => 
      section.id === 'introduction' 
        ? { ...section, content: introduction }
        : section
    ));
  };
  
  const handleEditSection = (sectionId: string) => {
    const section = reportSections.find(s => s.id === sectionId);
    if (section) {
      setEditingSection(sectionId);
      setEditContent(section.content);
    }
  };
  
  const handleSaveSection = () => {
    setReportSections(prev => prev.map(section => 
      section.id === editingSection 
        ? { ...section, content: editContent }
        : section
    ));
    setEditingSection(null);
    setEditContent('');
  };
  
  const addLexiqueItem = () => {
    setLexique(prev => [...prev, { terme: '', definition: '' }]);
  };
  
  const updateLexiqueItem = (index: number, field: 'terme' | 'definition', value: string) => {
    setLexique(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };
  
  const removeLexiqueItem = (index: number) => {
    setLexique(prev => prev.filter((_, i) => i !== index));
  };
  
  const addAction = () => {
    const newAction: ActionRecommendation = {
      id: Date.now().toString(),
      action: '',
      impact: '',
      responsable: '',
      delai: '',
      statut: 'Planifié'
    };
    setActions(prev => [...prev, newAction]);
  };
  
  const updateAction = (id: string, field: keyof ActionRecommendation, value: string) => {
    setActions(prev => prev.map(action => 
      action.id === id ? { ...action, [field]: value } : action
    ));
  };
  
  const removeAction = (id: string) => {
    setActions(prev => prev.filter(action => action.id !== id));
  };
  
  const calculateAveragePerformance = (data: PerformanceData[]) => {
    if (data.length === 0) return 0;
    const validPerformances = data.filter(d => d.performance_pourcent !== null);
    if (validPerformances.length === 0) return 0;
    return validPerformances.reduce((sum, d) => sum + (d.performance_pourcent || 0), 0) / validPerformances.length;
  };
  
  const getPerformanceColor = (performance: number | null) => {
    if (performance === null) return 'text-gray-500';
    if (performance >= 80) return 'text-green-600';
    if (performance >= 60) return 'text-blue-600';
    if (performance >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getPerformanceBgColor = (performance: number | null) => {
    if (performance === null) return 'bg-gray-100';
    if (performance >= 80) return 'bg-green-100';
    if (performance >= 60) return 'bg-blue-100';
    if (performance >= 40) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getIndicatorIcon = (code: string) => {
    switch (code) {
      case 'CR_ELEC':
      case 'CONSO_ELEC':
        return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'CR_HYDRO':
      case 'CONSO_HYDRO':
        return <Fuel className="w-5 h-5 text-orange-500" />;
      case 'REDUC_ELEC':
      case 'REDUC_HYDRO':
        return <TrendingDown className="w-5 h-5 text-green-500" />;
      case 'ENR_MIX':
        return <Leaf className="w-5 h-5 text-green-600" />;
      default:
        return <Gauge className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string, value: number) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const calculateVariation = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const exportToPDF = () => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;
    
    // En-tête du rapport
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80);
    doc.text('RAPPORT DE PILOTAGE ÉNERGÉTIQUE', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 10;
    doc.setFontSize(14);
    doc.setTextColor(52, 152, 219);
    doc.text(organizationName || '', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Année : ${selectedYear}`, 20, yPosition);
    doc.text(`Date d'édition : ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 20, yPosition, { align: 'right' });
    
    yPosition += 20;
    
    // Tableau des indicateurs clés
    const tableData = keyIndicators.map(indicator => [
      indicator.name,
      `${indicator.currentValue} ${indicator.unit}`,
      `${indicator.previousValue} ${indicator.unit}`,
      `${calculateVariation(indicator.currentValue, indicator.previousValue).toFixed(1)}%`,
      `${indicator.target} ${indicator.unit}`,
      indicator.status === 'good' ? '✅' : indicator.status === 'warning' ? '⚠️' : '❌'
    ]);
    
    autoTable(doc, {
      head: [['Indicateur', 'Valeur Actuelle', 'Valeur Précédente', 'Évolution', 'Objectif', 'Statut']],
      body: tableData,
      startY: yPosition,
      theme: 'grid',
      headStyles: {
        fillColor: [52, 152, 219],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 15, halign: 'center' }
      },
      margin: { left: 20, right: 20 }
    });
    
    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`${organizationName} - Rapport de Pilotage Énergétique`, 20, pageHeight - 10);
    doc.text(`Page 1`, pageWidth - 20, pageHeight - 10, { align: 'right' });
    
    doc.save(`Rapport_Pilotage_Energetique_${organizationName}_${selectedYear}.pdf`);
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    alert('Erreur lors de la génération du PDF');
  }
};

  const exportToExcel = () => {
    try {
      const wsData = [
        ['Indicateur', 'Code', 'Valeur Actuelle', 'Unité', 'Valeur Précédente', 'Évolution %', 'Objectif', 'Statut'],
        ...keyIndicators.map(indicator => [
          indicator.name,
          indicator.code,
          indicator.currentValue,
          indicator.unit,
          indicator.previousValue,
          calculateVariation(indicator.currentValue, indicator.previousValue).toFixed(1),
          indicator.target,
          indicator.status === 'good' ? 'Atteint' : indicator.status === 'warning' ? 'En cours' : 'Non atteint'
        ])
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Indicateurs Clés');
      
      XLSX.writeFile(wb, `Indicateurs_Cles_${organizationName}_${selectedYear}.xlsx`);
    } catch (error) {
      console.error('Erreur lors de la génération Excel:', error);
      alert('Erreur lors de la génération Excel');
    }
  };
  
 const generatePDF = async () => {
  try {
    setIsGenerating(true);
    
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Helper function for titles
    const addSectionTitle = (title: string) => {
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text(title, 14, yPosition);
      yPosition += 15;
    };

    // Helper function for content
    const addContent = (content: string) => {
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      const splitContent = doc.splitTextToSize(content, pageWidth - 28);
      doc.text(splitContent, 14, yPosition);
      yPosition += (splitContent.length * 5) + 10;
    };

    // 1. Page de garde
    doc.setFontSize(24);
    doc.setTextColor(40, 40, 40);
    doc.text('Rapport de Performance Énergétique', pageWidth / 2, 50, { align: 'center' });
    doc.setFontSize(18);
    doc.text(organizationName || '', pageWidth / 2, 70, { align: 'center' });
    doc.setFontSize(16);
    doc.text(`Site: ${selectedSite} | Année: ${selectedYear}`, pageWidth / 2, 90, { align: 'center' });

    // 2. Introduction
    doc.addPage();
    yPosition = 20;
    addSectionTitle('1. Introduction');
    addContent(reportSections.find(s => s.id === 'introduction')?.content || '');

    // 3. Objectifs
    addSectionTitle('2. Objectifs du rapport');
    addContent(reportSections.find(s => s.id === 'objectifs')?.content || '');

    // 4. Performance Summary
    doc.addPage();
    yPosition = 20;
    addSectionTitle('3. Résumé des Performances');
    const performanceSummary = [
      ['Performance Globale', `${calculateAveragePerformance(performanceGlobale).toFixed(1)}%`],
      ['Axes Énergétiques', `${calculateAveragePerformance(performanceAxes).toFixed(1)}%`],
      ['Enjeux', `${calculateAveragePerformance(performanceEnjeux).toFixed(1)}%`],
      ['Critères', `${calculateAveragePerformance(performanceCriteres).toFixed(1)}%`],
    ];
    autoTable(doc, {
      head: [['Catégorie', 'Performance']],
      body: performanceSummary,
      startY: yPosition,
      theme: 'grid',
      headStyles: { fillColor: [52, 152, 219] },
    });
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    
    // 5. Indicateurs Clés
    addSectionTitle('4. Indicateurs Clés de Performance');
    autoTable(doc, {
      head: [['Indicateur', 'Valeur Actuelle', 'Objectif', 'Évolution']],
      body: keyIndicators.map(ind => [ind.name, `${ind.currentValue} ${ind.unit}`, `${ind.target} ${ind.unit}`, `${calculateVariation(ind.currentValue, ind.previousValue).toFixed(1)}%`]),
      startY: yPosition,
      headStyles: { fillColor: [76, 175, 80] },
    });
    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // 6. Actions Recommandées
    doc.addPage();
    yPosition = 20;
    addSectionTitle('5. Actions et Recommandations');
    autoTable(doc, {
      head: [['Action', 'Impact', 'Responsable', 'Délai', 'Statut']],
      body: actions.map(a => [a.action, a.impact, a.responsable, a.delai, a.statut]),
      startY: yPosition,
      headStyles: { fillColor: [255, 152, 0] },
    });
    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // 7. Lexique
    addSectionTitle('6. Lexique');
    autoTable(doc, {
      head: [['Terme', 'Définition']],
      body: lexique.map(l => [l.terme, l.definition]),
      startY: yPosition,
      headStyles: { fillColor: [127, 140, 141] },
    });
    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // 8. Conclusion
    doc.addPage();
    yPosition = 20;
    addSectionTitle('7. Conclusion');
    const conclusionText = `L'analyse de la performance énergétique du site ${selectedSite} pour l'année ${selectedYear} révèle une performance globale de ${calculateAveragePerformance(performanceGlobale).toFixed(1)}%. Les actions recommandées dans ce rapport permettront d'améliorer significativement la performance énergétique et de maintenir la conformité aux exigences de la norme ISO 50001.`;
    addContent(conclusionText);

    // Page numbers
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} sur ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
      doc.text(`Rapport de Performance - ${selectedSite}`, 14, pageHeight - 10);
    }

    doc.save(`Rapport_Performance_${selectedSite}_${selectedYear}.pdf`);
    
  } catch (err) {
    console.error('Erreur génération PDF:', err);
    setError('Échec de la génération du PDF');
  } finally {
    setIsGenerating(false);
  }
};
  const generateExcel = async () => {
    try {
      setIsGenerating(true);
      
      const workbook = XLSX.utils.book_new();
      
      const lexiqueWS = XLSX.utils.json_to_sheet(lexique);
      XLSX.utils.book_append_sheet(workbook, lexiqueWS, 'Lexique');
      
      const globaleWS = XLSX.utils.json_to_sheet(performanceGlobale);
      XLSX.utils.book_append_sheet(workbook, globaleWS, 'Performance Globale');
      
      const axesWS = XLSX.utils.json_to_sheet(performanceAxes);
      XLSX.utils.book_append_sheet(workbook, axesWS, 'Axes Énergétiques');
      
      const enjeuxWS = XLSX.utils.json_to_sheet(performanceEnjeux);
      XLSX.utils.book_append_sheet(workbook, enjeuxWS, 'Enjeux');
      
      const criteresWS = XLSX.utils.json_to_sheet(performanceCriteres);
      XLSX.utils.book_append_sheet(workbook, criteresWS, 'Critères');
      
      const actionsWS = XLSX.utils.json_to_sheet(actions);
      XLSX.utils.book_append_sheet(workbook, actionsWS, 'Actions');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Rapport_Performance_${selectedSite}_${selectedYear}.xlsx`);
    } catch (err: any) {
      console.error('Error generating Excel:', err);
      setError('Erreur lors de la génération du fichier Excel');
    } finally {
      setIsGenerating(false);
    }
  };

  const PilotageReport = () => (
    <div className="relative overflow-hidden">
      <div 
        className="bg-white/80 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50 shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div 
                className="flex items-center space-x-3"
              >
                <div 
                  className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg"
                >
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 
                    className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent"
                  >
                    Rapports de Performance
                  </h1>
                  <p 
                    className="text-slate-600"
                  >
                    Génération automatique de rapports énergétiques
                  </p>
                </div>
              </div>
            </div>

            <div 
              className="flex items-center space-x-3"
            >
              <div className="flex items-center space-x-3">
                <button
                  onClick={exportToExcel}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={exportToPDF}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div 
          className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 mb-12"
        >
          <div 
            className="flex items-center space-x-3 mb-6"
          >
            <div 
              className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg"
            >
              <Filter className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Configuration du rapport</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site</label>
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300 hover:bg-white/80"
              >
                <option value="">Sélectionner un site</option>
                {sites.map((site) => (
                  <option key={site.name} value={site.name}>{site.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Année</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300 hover:bg-white/80"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300 hover:bg-white/80"
              >
                <option value="annuel">Année complète</option>
                <option value="semestre1">1er Semestre</option>
                <option value="semestre2">2e Semestre</option>
              </select>
            </div>
            
            <div 
              className="flex items-end"
            >
              <button
                onClick={fetchPerformanceData}
                disabled={!selectedSite}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl"
              >
                Actualiser
              </button>
            </div>
          </div>
        </div>

        {/* Section Performance Indicateurs */}
      

        <div 
          ref={reportRef} 
          className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 overflow-hidden"
        >
          <div 
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-12 relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10">
              <div 
                className="absolute top-0 left-0 w-full h-full"
                style={{
                  backgroundImage: `radial-gradient(circle at 20% 50%, white 2px, transparent 2px),
                                   radial-gradient(circle at 80% 50%, white 2px, transparent 2px)`,
                  backgroundSize: '100px 100px'
                }}
              />
            </div>
            
            <div className="text-center">
              <div
                className="inline-flex items-center space-x-3 mb-4"
              >
                <div>
                  <Sparkles className="w-8 h-8 text-yellow-300" />
                </div>
                <h1 className="text-4xl font-bold">Rapport de Performance Énergétique</h1>
                <div>
                  <Star className="w-8 h-8 text-yellow-300" />
                </div>
              </div>
              
              <p 
                className="text-blue-100 text-xl mb-4"
              >
                Site: {selectedSite} • Année: {selectedYear} • Période: {selectedPeriod === 'annuel' ? 'Année complète' : selectedPeriod === 'semestre1' ? '1er Semestre' : '2e Semestre'}
              </p>
              
              <p 
                className="text-blue-200 text-sm"
              >
                Généré le {new Date().toLocaleDateString('fr-FR')} par {user?.email}
              </p>
            </div>
          </div>

          <div className="p-12 space-y-16">
            <section
            >
              <div className="flex items-center justify-between mb-6">
                <div 
                  className="flex items-center space-x-4"
                >
                  <div 
                    className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg"
                  >
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Lexique / Abréviations
                  </h2>
                </div>
                {canModify && <button
                  onClick={addLexiqueItem}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter</span>
                </button>}
              </div>
              
              <div 
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100 shadow-inner"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lexique.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-white/50 shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      <input
                        type="text"
                        value={item.terme}
                        onChange={(e) => updateLexiqueItem(index, 'terme', e.target.value)}
                        placeholder="Terme"
                        className="w-20 px-3 py-2 text-sm font-bold border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/70 backdrop-blur-sm"
                        disabled={!canModify}
                      />
                      <span className="text-gray-400">:</span>
                      <input
                        type="text"
                        value={item.definition}
                        onChange={(e) => updateLexiqueItem(index, 'definition', e.target.value)}
                        placeholder="Définition"
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/70 backdrop-blur-sm"
                        disabled={!canModify}
                      />
                      {canModify && <button
                        onClick={() => removeLexiqueItem(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Introduction</h2>
                </div>
                {canModify && <button
                  onClick={() => handleEditSection('introduction')}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Modifier</span>
                </button>}
              </div>
              
              {editingSection === 'introduction' && canModify ? (
                <div className="space-y-4">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex space-x-3">
                    <button
                      onClick={handleSaveSection}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>Enregistrer</span>
                    </button>
                    <button
                      onClick={() => setEditingSection(null)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {reportSections.find(s => s.id === 'introduction')?.content}
                  </p>
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Target className="w-6 h-6 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Objectifs du rapport</h2>
                </div>
                {canModify && <button
                  onClick={() => handleEditSection('objectifs')}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Modifier</span>
                </button>}
              </div>
              
              {editingSection === 'objectifs' && canModify ? (
                <div className="space-y-4">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <div className="flex space-x-3">
                    <button
                      onClick={handleSaveSection}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>Enregistrer</span>
                    </button>
                    <button
                      onClick={() => setEditingSection(null)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {reportSections.find(s => s.id === 'objectifs')?.content}
                  </p>
                </div>
              )}
            </section>

            <section
            >
              <div className="flex items-center space-x-3 mb-6">
                <div 
                  className="p-4 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-lg"
                >
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Résumé des Performances
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div 
                  className="bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 rounded-2xl p-8 border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                >
                  <div 
                    className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-xl"
                  />
                  <div className="flex items-center justify-between mb-4">
                    <div 
                      className="p-3 bg-blue-600 rounded-xl shadow-md"
                    >
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <span 
                      className={`text-3xl font-bold ${getPerformanceColor(calculateAveragePerformance(performanceGlobale))}`}
                    >
                      {calculateAveragePerformance(performanceGlobale).toFixed(1)}%
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Performance Globale</h3>
                  <p className="text-sm text-gray-600">Moyenne générale du site</p>
                </div>
                
                <div 
                  className="bg-gradient-to-br from-green-50 via-green-100 to-emerald-200 rounded-2xl p-8 border border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                >
                  <div 
                    className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full blur-xl"
                  />
                  <div className="flex items-center justify-between mb-4">
                    <div 
                      className="p-3 bg-green-600 rounded-xl shadow-md"
                    >
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <span 
                      className={`text-3xl font-bold ${getPerformanceColor(calculateAveragePerformance(performanceAxes))}`}
                    >
                      {calculateAveragePerformance(performanceAxes).toFixed(1)}%
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Axes Énergétiques</h3>
                  <p className="text-sm text-gray-600">{performanceAxes.length} axes analysés</p>
                </div>
                
                <div 
                  className="bg-gradient-to-br from-yellow-50 via-yellow-100 to-amber-200 rounded-2xl p-8 border border-yellow-200 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                >
                  <div 
                    className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-400/20 to-amber-400/20 rounded-full blur-xl"
                  />
                  <div className="flex items-center justify-between mb-4">
                    <div 
                      className="p-3 bg-yellow-600 rounded-xl shadow-md"
                    >
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <span 
                      className={`text-3xl font-bold ${getPerformanceColor(calculateAveragePerformance(performanceEnjeux))}`}
                    >
                      {calculateAveragePerformance(performanceEnjeux).toFixed(1)}%
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Enjeux</h3>
                  <p className="text-sm text-gray-600">{performanceEnjeux.length} enjeux suivis</p>
                </div>
                
                <div 
                  className="bg-gradient-to-br from-purple-50 via-purple-100 to-violet-200 rounded-2xl p-8 border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                >
                  <div 
                    className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400/20 to-violet-400/20 rounded-full blur-xl"
                  />
                  <div className="flex items-center justify-between mb-4">
                    <div 
                      className="p-3 bg-purple-600 rounded-xl shadow-md"
                    >
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <span 
                      className={`text-3xl font-bold ${getPerformanceColor(calculateAveragePerformance(performanceCriteres))}`}
                    >
                      {calculateAveragePerformance(performanceCriteres).toFixed(1)}%
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Critères</h3>
                  <p className="text-sm text-gray-600">{performanceCriteres.length} critères évalués</p>
                </div>
              </div>
            </section>
  <div
          className="mt-8"
        >
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Gauge className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Performance Indicateurs Clés</h2>
                    <p className="text-blue-100 text-sm">Suivi des indicateurs énergétiques stratégiques</p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={exportToExcel}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {keyIndicators.map((indicator, index) => (
                  <div
                    key={indicator.code}
                    className={`bg-white rounded-xl border-2 ${getStatusColor(indicator.status)} p-6 hover:shadow-md transition-all duration-200`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          {getIndicatorIcon(indicator.code)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                            {indicator.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">{indicator.code}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {getTrendIcon(indicator.trend, calculateVariation(indicator.currentValue, indicator.previousValue))}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(indicator.status)}`}>
                          {indicator.status === 'good' ? 'Objectif atteint' : 
                           indicator.status === 'warning' ? 'En cours' : 'Non atteint'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Valeur actuelle</span>
                        <span className="text-lg font-bold text-gray-900">
                          {indicator.currentValue.toLocaleString()} {indicator.unit}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Valeur précédente</span>
                        <span className="text-sm text-gray-700">
                          {indicator.previousValue.toLocaleString()} {indicator.unit}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Objectif</span>
                        <span className="text-sm font-medium text-blue-600">
                          {indicator.target.toLocaleString()} {indicator.unit}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Évolution</span>
                        <div className="flex items-center space-x-2">
                          {getTrendIcon(indicator.trend, calculateVariation(indicator.currentValue, indicator.previousValue))}
                          <span className={`text-sm font-medium ${
                            calculateVariation(indicator.currentValue, indicator.previousValue) > 0 
                              ? (indicator.code.includes('REDUC') || indicator.code.includes('ENR') ? 'text-green-600' : 'text-red-600')
                              : (indicator.code.includes('REDUC') || indicator.code.includes('ENR') ? 'text-red-600' : 'text-green-600')
                          }`}>
                            {calculateVariation(indicator.currentValue, indicator.previousValue) > 0 ? '+' : ''}
                            {calculateVariation(indicator.currentValue, indicator.previousValue).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Barre de progression vers l'objectif */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progression vers l'objectif</span>
                          <span>
                            {Math.min(100, Math.max(0, (indicator.currentValue / indicator.target) * 100)).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              indicator.status === 'good' ? 'bg-green-500' :
                              indicator.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ 
                              width: `${Math.min(100, Math.max(0, (indicator.currentValue / indicator.target) * 100))}%` 
                            }}
                          />
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-3 italic">
                        {indicator.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Résumé global */}
              <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Résumé Global</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {keyIndicators.filter(i => i.status === 'good').length}
                    </div>
                    <div className="text-sm text-gray-600">Objectifs atteints</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {keyIndicators.filter(i => i.status === 'warning').length}
                    </div>
                    <div className="text-sm text-gray-600">En cours d'amélioration</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {keyIndicators.filter(i => i.status === 'critical').length}
                    </div>
                    <div className="text-sm text-gray-600">Nécessitent une action</div>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
                  <h4 className="font-medium text-gray-900 mb-2">Points clés :</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Réduction significative des consommations électriques (-10.2%)</li>
                    <li>• Progression de l'intégration des ENR (+15.3% du mix énergétique)</li>
                    <li>• Amélioration continue des performances énergétiques</li>
                    <li>• Objectifs 2024 en bonne voie d'être atteints</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Lightbulb className="w-6 h-6 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Actions et Recommandations</h2>
                </div>
                {canModify && <button
                  onClick={addAction}
                  className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter</span>
                </button>}
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impact</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsable</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Délai</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {actions.map((action) => (
                        <tr key={action.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={action.action}
                              onChange={(e) => updateAction(action.id, 'action', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              disabled={!canModify}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={action.impact}
                              onChange={(e) => updateAction(action.id, 'impact', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              disabled={!canModify}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={action.responsable}
                              onChange={(e) => updateAction(action.id, 'responsable', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              disabled={!canModify}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={action.delai}
                              onChange={(e) => updateAction(action.id, 'delai', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              disabled={!canModify}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={action.statut}
                              onChange={(e) => updateAction(action.id, 'statut', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              disabled={!canModify}
                            >
                              <option value="Planifié">Planifié</option>
                              <option value="En cours">En cours</option>
                              <option value="Terminé">Terminé</option>
                              <option value="Reporté">Reporté</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {canModify && <button
                              onClick={() => removeAction(action.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section
            >
              <div className="flex items-center space-x-3 mb-6">
                <div 
                  className="p-4 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-lg"
                >
                  <Award className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Conclusion
                </h2>
              </div>
              
              <div 
                className="bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 rounded-2xl p-8 border border-teal-200 shadow-lg relative overflow-hidden"
              >
                <div 
                  className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-cyan-400/10 rounded-full blur-2xl"
                />
                
                <p 
                  className="text-gray-700 leading-relaxed text-lg"
                >
                  L'analyse de la performance énergétique du site <strong>{selectedSite}</strong> pour l'année <strong>{selectedYear}</strong> révèle une performance globale de <strong>{calculateAveragePerformance(performanceGlobale).toFixed(1)}%</strong>.
                </p>
                
                <p 
                  className="text-gray-700 leading-relaxed mt-4 text-lg"
                >
                  Les axes énergétiques affichent une performance moyenne de <strong>{calculateAveragePerformance(performanceAxes).toFixed(1)}%</strong>, 
                  tandis que les enjeux atteignent <strong>{calculateAveragePerformance(performanceEnjeux).toFixed(1)}%</strong> et 
                  les critères <strong>{calculateAveragePerformance(performanceCriteres).toFixed(1)}%</strong>.
                </p>
                
                <p 
                  className="text-gray-700 leading-relaxed mt-4 text-lg"
                >
                  Les actions recommandées dans ce rapport permettront d'améliorer significativement la performance énergétique 
                  et de maintenir la conformité aux exigences de la norme ISO 50001.
                </p>
              </div>
            </section>
          </div>
        </div>

        {isLoading && (
            <div
              className="flex justify-center py-12"
            >
              <div>
                <Loader className="w-12 h-12 text-blue-500" />
              </div>
            </div>
          )}

          {error && (
            <div
              className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl mb-6"
            >
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
            </div>
          )}

          {isGenerating && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            >
              <div 
                className="bg-white/90 backdrop-blur-xl rounded-2xl p-8 flex items-center space-x-4 shadow-2xl border border-white/20"
              >
                <div>
                  <Loader className="w-8 h-8 text-blue-500" />
                </div>
                <span className="text-gray-700 text-lg font-medium">Génération du rapport en cours...</span>
              </div>
            </div>
          )}
      </div>
    </div>
  );
  
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div 
        className="bg-white/80 backdrop-blur-xl shadow-2xl flex flex-col z-20 relative"
      >
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-8 z-30 p-1.5 bg-white border rounded-full shadow-md hover:bg-gray-100 transition-colors"
        >
          <ChevronsLeft className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${!isSidebarOpen && 'rotate-180'}`} />
        </button>

        <div className={`p-6 border-b border-gray-200/80 flex items-center transition-all duration-300 ${isSidebarOpen ? 'justify-start' : 'justify-center'}`}>
          <div 
            className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg"
          >
            <Layers className="w-6 h-6 text-white" />
          </div>
          {isSidebarOpen && (
            <div className="ml-3">
              <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Espace Rapports</h2>
              <p className="text-sm text-slate-500">Navigation</p>
            </div>
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('pilotage')}
            className={`flex items-center w-full text-left px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
              activeTab === 'pilotage'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100/50 hover:text-gray-900'
            } ${!isSidebarOpen && 'justify-center'}`}
          >
            <LayoutDashboard className={`w-5 h-5 ${isSidebarOpen && 'mr-3'}`} />
            {isSidebarOpen && <span>Rapport Pilotage</span>}
          </button>
          <button
            onClick={() => setActiveTab('management')}
            className={`flex items-center w-full text-left px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
              activeTab === 'management'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100/50 hover:text-gray-900'
            } ${!isSidebarOpen && 'justify-center'}`}
          >
            <Briefcase className={`w-5 h-5 ${isSidebarOpen && 'mr-3'}`} />
            {isSidebarOpen && <span>Rapport de la Revue de Management</span>}
          </button>
          <button
            onClick={() => setActiveTab('energetique')}
            className={`flex items-center w-full text-left px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
              activeTab === 'energetique'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100/50 hover:text-gray-900'
            } ${!isSidebarOpen && 'justify-center'}`}
          >
            <Zap className={`w-5 h-5 ${isSidebarOpen && 'mr-3'}`} />
            {isSidebarOpen && <span>Rapport de la Revue Énergétique</span>}
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200/80">
            <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center justify-center space-x-2 w-full px-4 py-3 text-gray-600 hover:text-gray-900 bg-gray-100/30 hover:bg-gray-100/70 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:shadow-lg"
              >
                <ArrowLeft className="w-5 h-5" />
                {isSidebarOpen && <span className="font-medium">Retour</span>}
            </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
          <div>
            {activeTab === 'pilotage' && <PilotageReport />}
            
            {activeTab === 'management' && <ManagementReviewReport canModify={canModify} />}
            
            {activeTab === 'energetique' && <EnergyReviewReport canModify={canModify} />}
          </div>
      </main>
    </div>
  );
}; 

export default ReportsPage;
