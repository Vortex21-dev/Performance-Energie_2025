import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Save,
  Plus,
  Trash2,
  Edit2,
  X,
  Calendar,
  Users,
  Target,
  TrendingUp,
  CheckCircle,
  FileText,
  Camera,
  Building2,
  Loader,
  AlertTriangle,
  Paperclip,
  Upload,
  Eye
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Participant {
  name: string;
  function: string;
}

interface EnergyPerformance {
  indicator: string;
  currentValue: number;
  previousValue: number;
  unit: string;
  evolution: number;
  target: number;
  status: string;
}

interface Action {
  action: string;
  responsible: string;
  deadline: string;
  status: string;
  progress: number;
}

interface Photo {
  id: string;
  url: string;
  description: string;
}

interface Document {
  id: string;
  name: string;
  url: string;
}

const ManagementReviewReport: React.FC<{ canModify: boolean }> = ({ canModify }) => {
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Report data states
  const [reportInfo, setReportInfo] = useState({
    date: new Date().toISOString().split('T')[0],
    period: 'Janvier - Décembre 2024',
    location: 'Salle de réunion principale',
    president: 'Directeur Général',
    duration: '2h30'
  });

  const [participants, setParticipants] = useState<Participant[]>([
    { name: 'Jean Dupont', function: 'Directeur Général' },
    { name: 'Marie Martin', function: 'Responsable Énergie' },
    { name: 'Pierre Durand', function: 'Responsable Technique' }
  ]);

  const [objectives, setObjectives] = useState<string[]>([
    'Réduire la consommation énergétique de 10%',
    'Améliorer l\'efficacité énergétique des équipements',
    'Développer les énergies renouvelables'
  ]);

  const [energyPerformance, setEnergyPerformance] = useState<EnergyPerformance[]>([
    {
      indicator: 'Consommation électrique',
      currentValue: 1250,
      previousValue: 1380,
      unit: 'MWh',
      evolution: -9.4,
      target: 1200,
      status: 'En cours'
    },
    {
      indicator: 'Intensité énergétique',
      currentValue: 125,
      previousValue: 140,
      unit: 'kWh/m²',
      evolution: -10.7,
      target: 120,
      status: 'Atteint'
    }
  ]);

  const [actions, setActions] = useState<Action[]>([
    {
      action: 'Installation de LED dans tous les bureaux',
      responsible: 'Service Technique',
      deadline: '2024-06-30',
      status: 'Terminé',
      progress: 100
    },
    {
      action: 'Optimisation du système de chauffage',
      responsible: 'Responsable Énergie',
      deadline: '2024-12-31',
      status: 'En cours',
      progress: 65
    }
  ]);

  const [decisions, setDecisions] = useState<string[]>([
    'Validation du budget pour l\'audit énergétique externe',
    'Mise en place d\'un système de monitoring en temps réel',
    'Formation du personnel aux bonnes pratiques énergétiques'
  ]);

  const [conclusions, setConclusions] = useState({
    globalAssessment: 'Les objectifs énergétiques ont été largement atteints avec une réduction de 9.4% de la consommation électrique.',
    priorityAxes: 'Poursuivre les efforts sur l\'efficacité énergétique et développer les énergies renouvelables.'
  });

  const [annexes, setAnnexes] = useState<string[]>([
    'Factures énergétiques 2024',
    'Rapport d\'audit énergétique',
    'Tableaux de bord mensuels'
  ]);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isEditingPhoto, setIsEditingPhoto] = useState<string | null>(null);
  const [photoDescription, setPhotoDescription] = useState('');

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch user organization and load existing data
  useEffect(() => {
    if (user) {
      fetchUserOrganization();
    }
  }, [user]);

  useEffect(() => {
    if (organizationName) {
      loadExistingData();
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

  const loadExistingData = async () => {
    if (!user?.email) return;
    
    try {
      // Retry logic for network issues
      const retryWithBackoff = async (fn: () => Promise<any>, maxRetries: number = 3) => {
        let lastError: Error;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            return await fn();
          } catch (error: any) {
            lastError = error;
            
            // Only retry on network errors
            if (!error.message?.includes('Failed to fetch') && error.name !== 'TypeError') {
              throw error;
            }
            
            if (attempt < maxRetries - 1) {
              const delay = 1000 * Math.pow(2, attempt);
              console.log(`Retry attempt ${attempt + 1}/${maxRetries} in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        throw lastError;
      };

      setIsLoading(true);

      // Load main report data
      const { data: reportData, error: reportError } = await supabase
        .from('management_review_reports')
        .select('*')
        .eq('organization_name', organizationName)
        .maybeSingle();

      if (reportError && reportError.code !== 'PGRST116') throw reportError;

      if (reportData) {
        setReportInfo({
          date: reportData.report_date || new Date().toISOString().split('T')[0],
          period: reportData.review_period || '',
          location: reportData.location || '',
          president: reportData.president || '',
          duration: reportData.duration || ''
        });
      }

      // Load participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('management_review_participants')
        .select('*')
        .eq('organization_name', organizationName);

      if (participantsError) throw participantsError;

      if (participantsData) {
        setParticipants(participantsData.map(p => ({
          name: p.name,
          function: p.function || ''
        })));
      }

      // Load objectives
      const { data: objectivesData, error: objectivesError } = await supabase
        .from('management_review_objectives')
        .select('*')
        .eq('organization_name', organizationName);

      if (objectivesError) throw objectivesError;

      if (objectivesData) {
        setObjectives(objectivesData.map(o => o.objective));
      }

      // Load energy performance
      const { data: performanceData, error: performanceError } = await supabase
        .from('management_review_energy_performance')
        .select('*')
        .eq('organization_name', organizationName);

      if (performanceError) throw performanceError;

      if (performanceData) {
        setEnergyPerformance(performanceData.map(p => ({
          indicator: p.indicator_name,
          currentValue: p.current_value || 0,
          previousValue: p.previous_value || 0,
          unit: p.unit || '',
          evolution: p.evolution_percent || 0,
          target: p.target || 0,
          status: p.status || 'En cours'
        })));
      }

      // Load actions
      const { data: actionsData, error: actionsError } = await supabase
        .from('management_review_actions')
        .select('*')
        .eq('organization_name', organizationName);

      if (actionsError) throw actionsError;

      if (actionsData) {
        setActions(actionsData.map(a => ({
          action: a.action,
          responsible: a.responsible || '',
          deadline: a.deadline || '',
          status: a.status || 'En cours',
          progress: a.progress || 0
        })));
      }

      // Load decisions
      const { data: decisionsData, error: decisionsError } = await supabase
        .from('management_review_decisions')
        .select('*')
        .eq('organization_name', organizationName);

      if (decisionsError) throw decisionsError;

      if (decisionsData) {
        setDecisions(decisionsData.map(d => d.decision));
      }

      // Load conclusions
      const { data: conclusionsData, error: conclusionsError } = await supabase
        .from('management_review_conclusions')
        .select('*')
        .eq('organization_name', organizationName)
        .maybeSingle();

      if (conclusionsError && conclusionsError.code !== 'PGRST116') throw conclusionsError;

      if (conclusionsData) {
        setConclusions({
          globalAssessment: conclusionsData.global_assessment || '',
          priorityAxes: conclusionsData.priority_axes || ''
        });
      }

      // Load annexes
      const { data: annexesData, error: annexesError } = await supabase
        .from('management_review_annexes')
        .select('*')
        .eq('organization_name', organizationName);

      if (annexesError) throw annexesError;

      if (annexesData) {
        setAnnexes(annexesData.map(a => a.annex_name));
      }

      // Load documents
      const { data, error } = await retryWithBackoff(() =>
        supabase
          .from('management_review_documents')
          .select('*')
          .eq('organization_name', organizationName)
      );
      
      if (error) throw error;
      
      if (data) {
        setDocuments(data.map(d => ({
          id: d.document_url,
          name: d.document_name,
          url: d.document_url,
        })));
      }

      // Load photos
      const { data: photosData, error: photosError } = await supabase
        .from('management_review_photos')
        .select('*')
        .eq('organization_name', organizationName);

      if (photosError) throw photosError;

      if (photosData) {
        setPhotos(photosData.map(p => ({
          id: p.id,
          url: p.photo_url,
          description: p.description || ''
        })));
      }

    } catch (error: any) {
      console.error('Error loading existing data:', error);
      
      // Handle specific error types
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        setError('Network error: Unable to connect to the server. Please check your internet connection and try again.');
      } else if (error.message?.includes('timeout')) {
        setError('Request timeout: The server is taking too long to respond. Please try again.');
      } else {
        setError(`Failed to load existing data: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const addParticipant = () => {
    setParticipants([...participants, { name: '', function: '' }]);
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    const updated = [...participants];
    updated[index][field] = value;
    setParticipants(updated);
  };

  const addObjective = () => {
    setObjectives([...objectives, '']);
  };

  const removeObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const updateObjective = (index: number, value: string) => {
    const updated = [...objectives];
    updated[index] = value;
    setObjectives(updated);
  };

  const addEnergyPerformance = () => {
    setEnergyPerformance([...energyPerformance, {
      indicator: '',
      currentValue: 0,
      previousValue: 0,
      unit: '',
      evolution: 0,
      target: 0,
      status: 'En cours'
    }]);
  };

  const removeEnergyPerformance = (index: number) => {
    setEnergyPerformance(energyPerformance.filter((_, i) => i !== index));
  };

  const updateEnergyPerformance = (index: number, field: keyof EnergyPerformance, value: any) => {
    const updated = [...energyPerformance];
    updated[index][field] = value;
    setEnergyPerformance(updated);
  };

  const addAction = () => {
    setActions([...actions, {
      action: '',
      responsible: '',
      deadline: '',
      status: 'En cours',
      progress: 0
    }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, field: keyof Action, value: any) => {
    const updated = [...actions];
    updated[index][field] = value;
    setActions(updated);
  };

  const addDecision = () => {
    setDecisions([...decisions, '']);
  };

  const removeDecision = (index: number) => {
    setDecisions(decisions.filter((_, i) => i !== index));
  };

  const updateDecision = (index: number, value: string) => {
    const updated = [...decisions];
    updated[index] = value;
    setDecisions(updated);
  };

  const addAnnex = () => {
    setAnnexes([...annexes, '']);
  };

  const removeAnnex = (index: number) => {
    setAnnexes(annexes.filter((_, i) => i !== index));
  };

  const updateAnnex = (index: number, value: string) => {
    const updated = [...annexes];
    updated[index] = value;
    setAnnexes(updated);
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !organizationName) return;

    setIsUploading(true);
    setError(null);

    try {
      const filePath = `${organizationName}/${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      const publicUrl = data.publicUrl;

      if (!publicUrl) throw new Error('Could not get public URL for the document.');

      const newDocument: Document = {
        id: publicUrl,
        name: file.name,
        url: publicUrl,
      };
      setDocuments([...documents, newDocument]);

    } catch (err: any) {
      console.error('Error uploading document:', err);
      setError(`Erreur lors du téléversement du document: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const removeDocument = async (docToRemove: Document) => {
    const bucketName = 'documents';
    const urlParts = docToRemove.url.split(`/${bucketName}/`);
    if (urlParts.length < 2) {
      setError("URL du document invalide, ne peut pas supprimer.");
      console.error("Invalid document URL:", docToRemove.url);
      return;
    }
    const filePath = decodeURI(urlParts[1]);

    try {
      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);
      
      if (deleteError) {
        console.warn('Could not delete document from storage:', deleteError.message);
      }
      
      setDocuments(documents.filter(doc => doc.url !== docToRemove.url));

    } catch (err: any) {
      console.error('Error removing document:', err);
      setError(`Erreur lors de la suppression du document: ${err.message}`);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newPhoto: Photo = {
          id: Date.now().toString(),
          url: e.target?.result as string,
          description: ''
        };
        setPhotos([...photos, newPhoto]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (id: string) => {
    setPhotos(photos.filter(photo => photo.id !== id));
  };

  const updatePhotoDescription = (id: string, description: string) => {
    setPhotos(photos.map(photo =>
      photo.id === id ? { ...photo, description } : photo
    ));
  };

  const saveReport = async () => {
    if (!organizationName) {
      setError('Organisation non trouvée');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Save main report info
      const { error: reportError } = await supabase
        .from('management_review_reports')
        .upsert({
          organization_name: organizationName,
          report_date: reportInfo.date,
          review_period: reportInfo.period,
          location: reportInfo.location,
          president: reportInfo.president,
          duration: reportInfo.duration
        });

      if (reportError) throw reportError;

      // Clear and save participants
      await supabase
        .from('management_review_participants')
        .delete()
        .eq('organization_name', organizationName);

      if (participants.length > 0) {
        const { error: participantsError } = await supabase
          .from('management_review_participants')
          .insert(
            participants.map(p => ({
              organization_name: organizationName,
              name: p.name,
              function: p.function
            }))
          );

        if (participantsError) throw participantsError;
      }

      // Clear and save objectives
      await supabase
        .from('management_review_objectives')
        .delete()
        .eq('organization_name', organizationName);

      if (objectives.length > 0) {
        const { error: objectivesError } = await supabase
          .from('management_review_objectives')
          .insert(
            objectives.map(obj => ({
              organization_name: organizationName,
              objective: obj
            }))
          );

        if (objectivesError) throw objectivesError;
      }

      // Clear and save energy performance
      await supabase
        .from('management_review_energy_performance')
        .delete()
        .eq('organization_name', organizationName);

      if (energyPerformance.length > 0) {
        const { error: performanceError } = await supabase
          .from('management_review_energy_performance')
          .insert(
            energyPerformance.map(p => ({
              organization_name: organizationName,
              indicator_name: p.indicator,
              current_value: p.currentValue,
              previous_value: p.previousValue,
              unit: p.unit,
              evolution_percent: p.evolution,
              target: p.target,
              status: p.status
            }))
          );

        if (performanceError) throw performanceError;
      }

      // Clear and save actions
      await supabase
        .from('management_review_actions')
        .delete()
        .eq('organization_name', organizationName);

      if (actions.length > 0) {
        const { error: actionsError } = await supabase
          .from('management_review_actions')
          .insert(
            actions.map(a => ({
              organization_name: organizationName,
              action: a.action,
              responsible: a.responsible,
              deadline: a.deadline || null,
              status: a.status,
              progress: a.progress
            }))
          );

        if (actionsError) throw actionsError;
      }

      // Clear and save decisions
      await supabase
        .from('management_review_decisions')
        .delete()
        .eq('organization_name', organizationName);

      if (decisions.length > 0) {
        const { error: decisionsError } = await supabase
          .from('management_review_decisions')
          .insert(
            decisions.map(d => ({
              organization_name: organizationName,
              decision: d
            }))
          );

        if (decisionsError) throw decisionsError;
      }

      // Save conclusions
      const { error: conclusionsError } = await supabase
        .from('management_review_conclusions')
        .upsert({
          organization_name: organizationName,
          global_assessment: conclusions.globalAssessment,
          priority_axes: conclusions.priorityAxes
        });

      if (conclusionsError) throw conclusionsError;

      // Clear and save annexes
      await supabase
        .from('management_review_annexes')
        .delete()
        .eq('organization_name', organizationName);

      if (annexes.length > 0) {
        const { error: annexesError } = await supabase
          .from('management_review_annexes')
          .insert(
            annexes.map(a => ({
              organization_name: organizationName,
              annex_name: a
            }))
          );

        if (annexesError) throw annexesError;
      }

      // Clear and save documents
      await supabase
        .from('management_review_documents')
        .delete()
        .eq('organization_name', organizationName);

      if (documents.length > 0) {
        const { error: documentsError } = await supabase
          .from('management_review_documents')
          .insert(
            documents.map(d => ({
              organization_name: organizationName,
              document_name: d.name,
              document_url: d.url,
            }))
          );
        if (documentsError) throw documentsError;
      }

      // Clear and save photos
      await supabase
        .from('management_review_photos')
        .delete()
        .eq('organization_name', organizationName);

      if (photos.length > 0) {
        const { error: photosError } = await supabase
          .from('management_review_photos')
          .insert(
            photos.map(p => ({
              organization_name: organizationName,
              photo_url: p.url,
              description: p.description
            }))
          );

        if (photosError) throw photosError;
      }

      setSuccess('Rapport sauvegardé avec succès dans la base de données !');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      console.error('Error saving report:', err);
      setError(`Erreur lors de la sauvegarde : ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

 const generatePDF = async () => {
  if (!reportRef.current) return;

  setIsGeneratingPDF(true);

  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Rapport de Revue de Management Énergétique', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Company name
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    pdf.text(organizationName || 'PERF-ENERGIE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Report info
    pdf.setFontSize(12);
    pdf.text(`Date: ${reportInfo.date}`, margin, yPosition);
    yPosition += 7;
    pdf.text(`Période: ${reportInfo.period}`, margin, yPosition);
    yPosition += 7;
    pdf.text(`Lieu: ${reportInfo.location}`, margin, yPosition);
    yPosition += 15;

    // Participants
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Participants', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    participants.forEach(participant => {
      pdf.text(`• ${participant.name} - ${participant.function}`, margin + 5, yPosition);
      yPosition += 5;
    });
    yPosition += 10;

    // Check if we need a new page
    if (yPosition > pageHeight - 50) {
      pdf.addPage();
      yPosition = margin;
    }

    // Objectives
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Objectifs énergétiques', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    objectives.forEach(objective => {
      const lines = pdf.splitTextToSize(objective, pageWidth - 2 * margin - 5);
      pdf.text(`• ${lines[0]}`, margin + 5, yPosition);
      yPosition += 5;
      for (let i = 1; i < lines.length; i++) {
        pdf.text(`  ${lines[i]}`, margin + 5, yPosition);
        yPosition += 5;
      }
    });
    yPosition += 10;

    // Energy Performance
    if (energyPerformance.length > 0) {
      if (yPosition > pageHeight - 80) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Performance énergétique', margin, yPosition);
      yPosition += 10;

      const tableData = energyPerformance.map(perf => [
        perf.indicator,
        `${perf.currentValue} ${perf.unit}`,
        `${perf.previousValue} ${perf.unit}`,
        `${perf.evolution > 0 ? '+' : ''}${perf.evolution.toFixed(1)}%`,
        perf.status
      ]);

      autoTable(pdf, {
        head: [['Indicateur', 'Valeur actuelle', 'Valeur précédente', 'Évolution', 'Statut']],
        body: tableData,
        startY: yPosition,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [63, 81, 181] }
      });

      yPosition = pdf.lastAutoTable.finalY + 15;
    }

    // Actions
    if (actions.length > 0) {
      if (yPosition > pageHeight - 80) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Actions', margin, yPosition);
      yPosition += 10;

      const actionsTableData = actions.map(action => [
        action.action,
        action.responsible,
        action.deadline,
        action.status,
        `${action.progress}%`
      ]);

      autoTable(pdf, {
        head: [['Action', 'Responsable', 'Échéance', 'Statut', 'Avancement']],
        body: actionsTableData,
        startY: yPosition,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [76, 175, 80] }
      });

      yPosition = pdf.lastAutoTable.finalY + 15;
    }

    // Decisions
    if (decisions.length > 0) {
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Décisions', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      decisions.forEach(decision => {
        const lines = pdf.splitTextToSize(decision, pageWidth - 2 * margin - 5);
        pdf.text(`• ${lines[0]}`, margin + 5, yPosition);
        yPosition += 5;
        for (let i = 1; i < lines.length; i++) {
          pdf.text(`  ${lines[i]}`, margin + 5, yPosition);
          yPosition += 5;
        }
      });
      yPosition += 10;
    }

    // Conclusions
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Conclusions', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    if (conclusions.globalAssessment) {
      pdf.text('Évaluation globale:', margin, yPosition);
      yPosition += 7;
      const assessmentLines = pdf.splitTextToSize(conclusions.globalAssessment, pageWidth - 2 * margin);
      pdf.text(assessmentLines, margin, yPosition);
      yPosition += assessmentLines.length * 5 + 10;
    }

    if (conclusions.priorityAxes) {
      pdf.text('Axes prioritaires:', margin, yPosition);
      yPosition += 7;
      const axesLines = pdf.splitTextToSize(conclusions.priorityAxes, pageWidth - 2 * margin);
      pdf.text(axesLines, margin, yPosition);
    }

    // Save the PDF
    pdf.save(`rapport-revue-management-${reportInfo.date}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    setError('Erreur lors de la génération du PDF');
  } finally {
    setIsGeneratingPDF(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 relative overflow-hidden">
      {/* Success and Error Messages */}
      {success && (
        <div
          className="fixed top-6 right-6 z-50 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg shadow-lg"
        >
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <p className="text-green-700">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div
          className="fixed top-6 right-6 z-50 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-lg"
        >
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl"
        />
        <div
          className="absolute -bottom-40 -right-40 w-80 h-80 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <div>
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Rapport de Revue de Management Énergétique</h1>
                <p className="text-gray-600">
                  {organizationName ? `${organizationName} - ` : ''}Conforme à la norme ISO 50001:2018
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              {canModify && (
                <button
                  onClick={saveReport}
                  disabled={isSaving || !organizationName}
                  className={`
                    flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl
                    ${isSaving || !organizationName
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                    }
                  `}
                >
                  {isSaving ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span className="font-medium">Sauvegarde...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span className="font-medium">Sauvegarder</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={generatePDF}
                disabled={isGeneratingPDF}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span className="font-medium">Génération...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span className="font-medium">Télécharger PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Report Content */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="flex flex-col items-center">
                <Loader className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-gray-600 font-medium">Chargement des données...</p>
              </div>
            </div>
          ) : (
            <div ref={reportRef} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
              
                  <div>
                    <h1 className="text-3xl font-bold">{organizationName || 'PERF-ENERGIE'}</h1>
                    <p className="text-blue-100">Rapport de Revue de Management Énergétique</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-blue-100">Conforme à la norme</p>
                  <p className="text-xl font-bold">ISO 50001:2018</p>
                </div>
              </div>
            </div>

            {/* Report Information */}
            <div className="p-8 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Calendar className="w-6 h-6 mr-3 text-indigo-600" />
                Informations de la réunion
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Date de la réunion</label>
                  <input
                    type="date"
                    value={reportInfo.date}
                    readOnly={!canModify}
                    onChange={(e) => canModify && setReportInfo({...reportInfo, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Période de revue</label>
                  <input
                    type="text"
                    value={reportInfo.period}
                    readOnly={!canModify}
                    onChange={(e) => canModify && setReportInfo({...reportInfo, period: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ex: Janvier - Décembre 2024"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Lieu</label>
                  <input
                    type="text"
                    value={reportInfo.location}
                    readOnly={!canModify}
                    onChange={(e) => canModify && setReportInfo({...reportInfo, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ex: Salle de réunion principale"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Président de séance</label>
                  <input
                    type="text"
                    value={reportInfo.president}
                    readOnly={!canModify}
                    onChange={(e) => canModify && setReportInfo({...reportInfo, president: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ex: Directeur Général"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Durée</label>
                  <input
                    type="text"
                    value={reportInfo.duration}
                    readOnly={!canModify}
                    onChange={(e) => canModify && setReportInfo({...reportInfo, duration: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ex: 2h30"
                  />
                </div>
              </div>
            </div>

            {/* Participants Section */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Users className="w-6 h-6 mr-3 text-indigo-600" />
                  Participants
                </h2>
                {canModify && (
                  <button
                    onClick={addParticipant}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter</span>
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {participants.map((participant, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        value={participant.name}
                        readOnly={!canModify}
                        onChange={(e) => canModify && updateParticipant(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Nom du participant"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={participant.function}
                        readOnly={!canModify}
                        onChange={(e) => canModify && updateParticipant(index, 'function', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Fonction"
                      />
                    </div>
                    {canModify && (
                      <button
                        onClick={() => removeParticipant(index)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Objectives Section */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Target className="w-6 h-6 mr-3 text-indigo-600" />
                  Objectifs énergétiques
                </h2>
                {canModify && (
                  <button
                    onClick={addObjective}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter</span>
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {objectives.map((objective, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <textarea
                        value={objective}
                        readOnly={!canModify}
                        onChange={(e) => canModify && updateObjective(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        placeholder="Décrivez l'objectif énergétique"
                        rows={2}
                      />
                    </div>
                    {canModify && (
                      <button
                        onClick={() => removeObjective(index)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Energy Performance Section */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <TrendingUp className="w-6 h-6 mr-3 text-indigo-600" />
                  Performance énergétique
                </h2>
                {canModify && (
                  <button
                    onClick={addEnergyPerformance}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter</span>
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Indicateur</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Valeur actuelle</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Valeur précédente</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Unité</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Évolution (%)</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Cible</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Statut</th>
                      {canModify && <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {energyPerformance.map((perf, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-3">
                          <input
                            type="text"
                            value={perf.indicator}
                            readOnly={!canModify}
                            onChange={(e) => canModify && updateEnergyPerformance(index, 'indicator', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Nom de l'indicateur"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-3">
                          <input
                            type="number"
                            value={perf.currentValue}
                            readOnly={!canModify}
                            onChange={(e) => canModify && updateEnergyPerformance(index, 'currentValue', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-3">
                          <input
                            type="number"
                            value={perf.previousValue}
                            readOnly={!canModify}
                            onChange={(e) => canModify && updateEnergyPerformance(index, 'previousValue', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-3">
                          <input
                            type="text"
                            value={perf.unit}
                            readOnly={!canModify}
                            onChange={(e) => canModify && updateEnergyPerformance(index, 'unit', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="kWh, m³, etc."
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-3">
                          <input
                            type="number"
                            step="0.1"
                            value={perf.evolution}
                            readOnly={!canModify}
                            onChange={(e) => canModify && updateEnergyPerformance(index, 'evolution', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-3">
                          <input
                            type="number"
                            value={perf.target}
                            readOnly={!canModify}
                            onChange={(e) => canModify && updateEnergyPerformance(index, 'target', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-3">
                          <select
                            value={perf.status}
                            disabled={!canModify}
                            onChange={(e) => canModify && updateEnergyPerformance(index, 'status', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          >
                            <option value="En cours">En cours</option>
                            <option value="Atteint">Atteint</option>
                            <option value="Non atteint">Non atteint</option>
                            <option value="Dépassé">Dépassé</option>
                          </select>
                        </td>
                        {canModify && (
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <button
                              onClick={() => removeEnergyPerformance(index)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions Section */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <CheckCircle className="w-6 h-6 mr-3 text-indigo-600" />
                  Actions et suivi
                </h2>
                {canModify && (
                  <button
                    onClick={addAction}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter</span>
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Action</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Responsable</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Échéance</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Statut</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Avancement (%)</th>
                      {canModify && <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {actions.map((action, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-3">
                          <textarea
                            value={action.action}
                            readOnly={!canModify}
                            onChange={(e) => canModify && updateAction(index, 'action', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            placeholder="Description de l'action"
                            rows={2}
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-3">
                          <input
                            type="text"
                            value={action.responsible}
                            readOnly={!canModify}
                            onChange={(e) => canModify && updateAction(index, 'responsible', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Responsable"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-3">
                          <input
                            type="date"
                            value={action.deadline}
                            readOnly={!canModify}
                            onChange={(e) => canModify && updateAction(index, 'deadline', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-3">
                          <select
                            value={action.status}
                            disabled={!canModify}
                            onChange={(e) => canModify && updateAction(index, 'status', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          >
                            <option value="En cours">En cours</option>
                            <option value="Terminé">Terminé</option>
                            <option value="En retard">En retard</option>
                            <option value="Annulé">Annulé</option>
                          </select>
                        </td>
                        <td className="border border-gray-300 px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={action.progress}
                            readOnly={!canModify}
                            onChange={(e) => canModify && updateAction(index, 'progress', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </td>
                        {canModify && (
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <button
                              onClick={() => removeAction(index)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Decisions Section */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Building2 className="w-6 h-6 mr-3 text-indigo-600" />
                  Décisions de la direction
                </h2>
                {canModify && (
                  <button
                    onClick={addDecision}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter</span>
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {decisions.map((decision, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <textarea
                        value={decision}
                        readOnly={!canModify}
                        onChange={(e) => canModify && updateDecision(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        placeholder="Décision prise par la direction"
                        rows={2}
                      />
                    </div>
                    {canModify && (
                      <button
                        onClick={() => removeDecision(index)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Conclusions Section */}
            <div className="p-8 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <CheckCircle className="w-6 h-6 mr-3 text-indigo-600" />
                Conclusions
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Évaluation globale</label>
                  <textarea
                    value={conclusions.globalAssessment}
                    readOnly={!canModify}
                    onChange={(e) => canModify && setConclusions({...conclusions, globalAssessment: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    placeholder="Évaluation globale de la performance énergétique..."
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Axes prioritaires pour la période suivante</label>
                  <textarea
                    value={conclusions.priorityAxes}
                    readOnly={!canModify}
                    onChange={(e) => canModify && setConclusions({...conclusions, priorityAxes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    placeholder="Axes prioritaires et orientations stratégiques..."
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* Annexes Section */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <FileText className="w-6 h-6 mr-3 text-indigo-600" />
                  Annexes
                </h2>
                {canModify && (
                  <button
                    onClick={addAnnex}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter</span>
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {annexes.map((annex, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        value={annex}
                        readOnly={!canModify}
                        onChange={(e) => canModify && updateAnnex(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Nom de l'annexe"
                      />
                    </div>
                    {canModify && (
                      <button
                        onClick={() => removeAnnex(index)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Documents Section */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Paperclip className="w-6 h-6 mr-3 text-indigo-600" />
                  Pièces Jointes
                </h2>
                {canModify && (
                  <div>
                    <input
                      type="file"
                      onChange={handleDocumentUpload}
                      className="hidden"
                      id="document-upload"
                      disabled={isUploading || !organizationName}
                    />
                    <label
                      htmlFor="document-upload"
                      className={`flex items-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors cursor-pointer ${isUploading || !organizationName ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                      {isUploading ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>Téléversement...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Ajouter un document</span>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>
              
              {documents.length > 0 ? (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between space-x-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1 font-medium text-gray-800 truncate" title={doc.name}>
                        {doc.name}
                      </div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Voir le document"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        {canModify && (
                          <button
                            onClick={() => removeDocument(doc)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Supprimer le document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Paperclip className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucun document ajouté</p>
                  <p className="text-sm text-gray-500">Cliquez sur "Ajouter un document" pour commencer</p>
                </div>
              )}
            </div>

            {/* Photos Section */}
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Camera className="w-6 h-6 mr-3 text-indigo-600" />
                  Photos et documents visuels
                </h2>
                {canModify && (
                  <div className="flex items-center space-x-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Ajouter une photo</span>
                    </label>
                  </div>
                )}
              </div>

              {photos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="bg-white rounded-lg shadow-md overflow-hidden"
                    >
                      <img
                        src={photo.url}
                        alt="Photo du rapport"
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-4">
                        {isEditingPhoto === photo.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={photoDescription}
                              onChange={(e) => setPhotoDescription(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              placeholder="Description de la photo"
                              autoFocus
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  updatePhotoDescription(photo.id, photoDescription);
                                  setIsEditingPhoto(null);
                                  setPhotoDescription('');
                                }}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                              >
                                Sauvegarder
                              </button>
                              <button
                                onClick={() => {
                                  setIsEditingPhoto(null);
                                  setPhotoDescription('');
                                }}
                                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600">
                              {photo.description || 'Aucune description'}
                            </p>
                            {canModify && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setIsEditingPhoto(photo.id);
                                    setPhotoDescription(photo.description);
                                  }}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => removePhoto(photo.id)}
                                  className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucune photo ajoutée</p>
                  <p className="text-sm text-gray-500">Cliquez sur "Ajouter une photo" pour commencer</p>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagementReviewReport;
