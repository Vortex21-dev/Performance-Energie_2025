import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Download, 
  Edit2, 
  Save, 
  X, 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Zap, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Target, 
  FileImage, 
  Building2,
  Loader,
  Plus,
  Trash2,
  Camera
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface EnergyConsumption {
  type: string;
  consumption: number;
  unit: string;
  percentage: number;
}

interface UES {
  usage: string;
  energyType: string;
  percentage: number;
}

interface IPE {
  indicator: string;
  valueN1: number;
  valueN: number;
  evolution: number;
  objectiveReached: boolean;
  unit: string;
}

interface ImprovementAction {
  action: string;
  responsible: string;
  deadline: string;
  status: string;
  progress: number;
}

interface Decision {
  decision: string;
  responsible: string;
  deadline: string;
}

interface Participant {
  name: string;
  function: string;
}

const EnergyReviewReport: React.FC<{ canModify: boolean }> = ({ canModify }) => {
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState<string>('');
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Array<{id: string, file: File | null, url: string, description: string}>>([]);
  const [newPhotoDescription, setNewPhotoDescription] = useState('');
  
  // Form data state
  const [formData, setFormData] = useState({
    // Section 1: Informations générales
    dateRevue: new Date().toISOString().split('T')[0],
    duree: '14h00 - 16h00',
    lieu: 'Salle de réunion principale',
    periodeReference: '2024',
    president: 'Directeur Général',
    participants: ['Directeur Technique', 'Responsable Énergie', 'Chef de maintenance'],
    newParticipant: '',
    
    // Section 2: Objectifs
    objectifs: ['Évaluer la performance énergétique de la période', 'Identifier les écarts par rapport aux objectifs'],
    newObjectif: '',
    
    // Section 3: Consommations
    consommations: [
      { type: 'Électricité', kwh: 180000, pourcentage: 72 },
      { type: 'Gaz naturel', kwh: 45000, pourcentage: 18 },
      { type: 'Énergies renouvelables', kwh: 25000, pourcentage: 10 }
    ],
    newConsommationType: '',
    newConsommationKwh: '',
    
    // Section 4: UES
    ues: [
      { usage: 'Climatisation', type: 'Électricité', poids: 35 },
      { usage: 'Chauffage', type: 'Gaz naturel', poids: 18 },
      { usage: 'Éclairage', type: 'Électricité', poids: 15 },
      { usage: 'Bureautique', type: 'Électricité', poids: 8 }
    ],
    newUesUsage: '',
    newUesType: '',
    newUesPoids: '',
    
    // Section 5: IPE
    ipe: [
      { indicateur: 'Intensité énergétique', valeurN1: 135, valeurN: 128, evolution: -5.2, objectifAtteint: true },
      { indicateur: 'Consommation spécifique', valeurN1: 125, valeurN: 118, evolution: -5.6, objectifAtteint: true },
      { indicateur: 'Part ENR', valeurN1: 8, valeurN: 10, evolution: 25, objectifAtteint: true }
    ],
    newIpeIndicateur: '',
    newIpeValeurN1: '',
    newIpeValeurN: '',
    newIpeObjectif: false,
    
    // Section 6: Écarts
    ecarts: [
      'Dépassement de consommation électrique en juillet (+12%)',
      'Retard dans la mise en service du système de récupération de chaleur',
      'Données de consommation manquantes pour le mois de février'
    ],
    newEcart: '',
    
    // Section 7: Actions
    actions: [
      { action: 'Installation LED', responsable: 'Service Maintenance', echeance: '2025-06-30', statut: 'En cours', avancement: 75 },
      { action: 'Optimisation CVC', responsable: 'Bureau d\'études', echeance: '2025-09-15', statut: 'Planifié', avancement: 0 }
    ],
    newActionNom: '',
    newActionResponsable: '',
    newActionEcheance: '',
    newActionStatut: 'Planifié',
    
    // Section 8: Données de référence
    anneeReference: 2023,
    changementsIPE: '',
    
    // Section 9: Décisions
    decisions: [
      { decision: 'Validation du budget 2025', responsable: 'Direction Générale', echeance: '2025-01-31' },
      { decision: 'Nomination d\'un energy manager', responsable: 'DRH', echeance: '2025-02-28' }
    ],
    newDecisionTexte: '',
    newDecisionResponsable: '',
    newDecisionEcheance: '',
    
    // Section 10: Conclusion
    bilanGlobal: 'La performance énergétique s\'améliore avec une réduction de 8% de la consommation totale.',
    axesPrioritaires: 'Poursuivre les investissements en efficacité énergétique et développer les énergies renouvelables.',
    
    // Section 11: Annexes
    annexes: ['Liste de présence', 'Graphiques de consommation', 'Photos des installations'],
    newAnnexe: ''
  });

  useEffect(() => {
    fetchOrganizationData();
  }, [user]);

  const fetchOrganizationData = async () => {
    try {
      setIsLoading(true);
      
      if (!user?.email) return;

      // Get user's organization
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('organization_name')
        .eq('email', user.email)
        .single();

      if (profileError) throw profileError;

      if (profileData?.organization_name) {
        setOrganizationName(profileData.organization_name);
        // Pour cet exemple, on utilise le logo Aeria existant
        // Dans un vrai projet, vous pourriez avoir une table logos ou stocker le logo dans la table organizations
       
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addItem = (section: string, newItemField: string) => {
    const newItem = formData[newItemField as keyof typeof formData] as string;
    if (!newItem.trim()) return;

    if (section === 'participants' || section === 'objectifs' || section === 'ecarts' || section === 'annexes') {
      const currentItems = formData[section as keyof typeof formData] as string[];
      handleInputChange(section, [...currentItems, newItem.trim()]);
      handleInputChange(newItemField, '');
    } else if (section === 'consommations') {
      const kwh = parseFloat(formData.newConsommationKwh as string) || 0;
      const total = formData.consommations.reduce((sum, item) => sum + item.kwh, 0) + kwh;
      const pourcentage = total > 0 ? Math.round((kwh / total) * 100) : 0;
      
      const newConsommation = {
        type: formData.newConsommationType as string,
        kwh,
        pourcentage
      };
      
      handleInputChange('consommations', [...formData.consommations, newConsommation]);
      handleInputChange('newConsommationType', '');
      handleInputChange('newConsommationKwh', '');
    } else if (section === 'ues') {
      const newUes = {
        usage: formData.newUesUsage as string,
        type: formData.newUesType as string,
        poids: parseFloat(formData.newUesPoids as string) || 0
      };
      
      handleInputChange('ues', [...formData.ues, newUes]);
      handleInputChange('newUesUsage', '');
      handleInputChange('newUesType', '');
      handleInputChange('newUesPoids', '');
    } else if (section === 'ipe') {
      const valeurN1 = parseFloat(formData.newIpeValeurN1 as string) || 0;
      const valeurN = parseFloat(formData.newIpeValeurN as string) || 0;
      const evolution = valeurN1 > 0 ? ((valeurN - valeurN1) / valeurN1) * 100 : 0;
      
      const newIpe = {
        indicateur: formData.newIpeIndicateur as string,
        valeurN1,
        valeurN,
        evolution: Math.round(evolution * 10) / 10,
        objectifAtteint: formData.newIpeObjectif as boolean
      };
      
      handleInputChange('ipe', [...formData.ipe, newIpe]);
      handleInputChange('newIpeIndicateur', '');
      handleInputChange('newIpeValeurN1', '');
      handleInputChange('newIpeValeurN', '');
      handleInputChange('newIpeObjectif', false);
    } else if (section === 'actions') {
      const newAction = {
        action: formData.newActionNom as string,
        responsable: formData.newActionResponsable as string,
        echeance: formData.newActionEcheance as string,
        statut: formData.newActionStatut as string,
        avancement: formData.newActionStatut === 'Réalisé' ? 100 : 0
      };
      
      handleInputChange('actions', [...formData.actions, newAction]);
      handleInputChange('newActionNom', '');
      handleInputChange('newActionResponsable', '');
      handleInputChange('newActionEcheance', '');
      handleInputChange('newActionStatut', 'Planifié');
    } else if (section === 'decisions') {
      const newDecision = {
        decision: formData.newDecisionTexte as string,
        responsable: formData.newDecisionResponsable as string,
        echeance: formData.newDecisionEcheance as string
      };
      
      handleInputChange('decisions', [...formData.decisions, newDecision]);
      handleInputChange('newDecisionTexte', '');
      handleInputChange('newDecisionResponsable', '');
      handleInputChange('newDecisionEcheance', '');
    }
  };

  const removeItem = (section: string, index: number) => {
    const currentItems = formData[section as keyof typeof formData] as any[];
    const newItems = currentItems.filter((_, i) => i !== index);
    handleInputChange(section, newItems);
  };

  const updateItem = (section: string, index: number, field: string, value: any) => {
    const currentItems = [...(formData[section as keyof typeof formData] as any[])];
    currentItems[index] = { ...currentItems[index], [field]: value };
    handleInputChange(section, currentItems);
  };

  const handleAddPhoto = () => {
    if (newPhotoDescription.trim()) {
      const newPhoto = {
        id: Date.now().toString(),
        file: null,
        url: '',
        description: newPhotoDescription.trim()
      };
      setPhotos([...photos, newPhoto]);
      setNewPhotoDescription('');
    }
  };

  const handlePhotoUpload = (photoId: string, file: File) => {
    const url = URL.createObjectURL(file);
    setPhotos(photos.map(p => 
      p.id === photoId 
        ? { ...p, file, url }
        : p
    ));
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos(photos.filter(p => p.id !== photoId));
  };

  const handlePhotoDescriptionChange = (photoId: string, description: string) => {
    setPhotos(photos.map(p => 
      p.id === photoId 
        ? { ...p, description }
        : p
    ));
  };

  const handleSave = () => {
    // Save to localStorage for persistence
    localStorage.setItem('energyReviewData', JSON.stringify({
      ...formData,
      photos: photos.map(p => ({...p, file: null}))
    }));
    setIsEditing(false);
  };

  const generatePDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;
      let pageNumber = 1;

      // Fonction pour ajouter le logo et le nom de l'entreprise
      const addHeaderWithLogo = async (pdf: jsPDF, yPos: number) => {
        // Ajouter le logo si disponible
        if (organizationLogo) {
          try {
            // Créer une image temporaire pour obtenir les dimensions
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = organizationLogo;
            });
            
            // Calculer les dimensions pour le logo (hauteur max 15mm)
            const logoHeight = 15;
            const logoWidth = (img.width / img.height) * logoHeight;
            
            // Ajouter le logo
            pdf.addImage(organizationLogo, 'JPEG', 20, yPos, logoWidth, logoHeight);
            
            // Ajouter le nom de l'entreprise à côté du logo
            pdf.setFontSize(18);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(44, 62, 80);
            pdf.text(organizationName, 20 + logoWidth + 10, yPos + 8);
            
            return yPos + logoHeight + 10;
          } catch (error) {
            console.error('Erreur lors de l\'ajout du logo:', error);
            // Fallback sans logo
            pdf.setFontSize(18);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(44, 62, 80);
            pdf.text(organizationName, 20, yPos + 8);
            return yPos + 15;
          }
        } else {
          // Sans logo
          pdf.setFontSize(18);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(44, 62, 80);
          pdf.text(organizationName, 20, yPos + 8);
          return yPos + 15;
        }
      };

      // Helper function to check if we need a new page
      const checkNewPage = async (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - 20) {
          pdf.addPage();
          yPosition = await addHeaderWithLogo(pdf, 20);
          pageNumber++;
          addPageFooter();
        }
      };

      // Helper function to add page footer
      const addPageFooter = () => {
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`${organizationName} - Revue Énergétique`, 20, pageHeight - 15);
        pdf.text(`Page ${pageNumber}`, pageWidth - 30, pageHeight - 15);
        pdf.text(new Date().toLocaleDateString('fr-FR'), pageWidth - 30, pageHeight - 10);
      };

      // Title page
      yPosition = await addHeaderWithLogo(pdf, yPosition);
      
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(41, 128, 185); // Blue color
      pdf.text('REVUE ÉNERGÉTIQUE', pageWidth / 2, yPosition, { align: 'center' });
      
      // Add decorative line
      pdf.setDrawColor(41, 128, 185);
      pdf.setLineWidth(2);
      pdf.line(50, yPosition + 5, pageWidth - 50, yPosition + 5);

      yPosition += 20;
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${organizationName}`, pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 15;
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Période : ${formData.periodeReference}`, pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 10;
      pdf.text(`Date : ${new Date(formData.dateRevue).toLocaleDateString('fr-FR')}`, pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 30;

      // Add first page footer
      addPageFooter();

      // 1. Informations générales
      await checkNewPage(60);
      pdf.setFillColor(52, 152, 219); // Blue background
      pdf.rect(15, yPosition - 5, pageWidth - 30, 12, 'F');
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255); // White text
      pdf.text('1. INFORMATIONS GÉNÉRALES', 20, yPosition + 3);

      yPosition += 15;
      pdf.setTextColor(0, 0, 0); // Reset to black
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      const generalInfo = [
        ['Objet', 'Revue énergétique'],
        ['Date de la revue', new Date(formData.dateRevue).toLocaleDateString('fr-FR')],
        ['Durée', formData.duree],
        ['Lieu', formData.lieu],
        ['Période de référence', formData.periodeReference],
        ['Président de séance', formData.president]
      ];

      autoTable(pdf, {
        startY: yPosition,
        head: [['Élément', 'Information']],
        body: generalInfo,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 20, right: 20 }
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 10;

      // Participants
      await checkNewPage(30);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Participants :', 20, yPosition);
      yPosition += 8;

      const participantsData = formData.participants.map(p => [p, '']);
      autoTable(pdf, {
        startY: yPosition,
        head: [['Nom', 'Fonction']],
        body: participantsData,
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94] },
        margin: { left: 20, right: 20 }
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 15;

      // 2. Objectifs de la revue
      await checkNewPage(40);
      pdf.setFillColor(46, 204, 113); // Green background
      pdf.rect(15, yPosition - 5, pageWidth - 30, 12, 'F');
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('2. OBJECTIFS DE LA REVUE', 20, yPosition + 3);

      yPosition += 15;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      formData.objectifs.forEach(obj => {
        pdf.text(`• ${obj}`, 25, yPosition);
        yPosition += 6;
      });
      yPosition += 10;

      // 3. Bilan des consommations énergétiques
      await checkNewPage(80);
      pdf.setFillColor(155, 89, 182); // Purple background
      pdf.rect(15, yPosition - 5, pageWidth - 30, 12, 'F');
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('3. BILAN DES CONSOMMATIONS ÉNERGÉTIQUES', 20, yPosition + 3);

      yPosition += 15;
      pdf.setTextColor(0, 0, 0);

      const consumptionData = formData.consommations.map(c => [
        c.type,
        c.kwh.toLocaleString('fr-FR'),
        'kWh',
        `${c.pourcentage}%`
      ]);

      autoTable(pdf, {
        startY: yPosition,
        head: [['Type d\'énergie', 'Consommation', 'Unité', '% du total']],
        body: consumptionData,
        theme: 'grid',
        headStyles: { 
          fillColor: [155, 89, 182],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 20, right: 20 }
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 10;

      pdf.setFont('helvetica', 'bold');
      pdf.text(`Total énergie consommée : ${formData.consommations.reduce((sum, item) => sum + item.kwh, 0).toLocaleString('fr-FR')} kWh équivalent`, 20, yPosition);
      yPosition += 15;

      // 4. Analyse des UES
      await checkNewPage(80);
      pdf.setFillColor(230, 126, 34); // Orange background
      pdf.rect(15, yPosition - 5, pageWidth - 30, 12, 'F');
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('4. ANALYSE DES USAGES ÉNERGÉTIQUES SIGNIFICATIFS (UES)', 20, yPosition + 3);

      yPosition += 15;
      pdf.setTextColor(0, 0, 0);

      const uesTableData = formData.ues.map(u => [u.usage, u.type, `${u.poids}%`]);

      autoTable(pdf, {
        startY: yPosition,
        head: [['Usage', 'Type d\'énergie', 'Poids (% consommation)']],
        body: uesTableData,
        theme: 'grid',
        headStyles: {
          fillColor: [230, 126, 34],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 20, right: 20 }
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 15;

      // 5. Indicateurs de performance énergétique
      await checkNewPage(80);
      pdf.setFillColor(231, 76, 60); // Red background
      pdf.rect(15, yPosition - 5, pageWidth - 30, 12, 'F');
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('5. INDICATEURS DE PERFORMANCE ÉNERGÉTIQUE (IPE)', 20, yPosition + 3);

      yPosition += 15;
      pdf.setTextColor(0, 0, 0);

      const ipeTableData = formData.ipe.map(i => [
        i.indicateur,
        `${i.valeurN1}`,
        `${i.valeurN}`,
        `${i.evolution > 0 ? '+' : ''}${i.evolution}%`,
        i.objectifAtteint ? '✅' : '❌'
      ]);

      autoTable(pdf, {
        startY: yPosition,
        head: [['Indicateur', 'Valeur N-1', 'Valeur N', 'Évolution %', 'Objectif atteint']],
        body: ipeTableData,
        theme: 'grid',
        headStyles: {
          fillColor: [231, 76, 60],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 20, right: 20 }
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 15;

      // 6. Écarts et anomalies
      await checkNewPage(60);
      pdf.setFillColor(241, 196, 15); // Yellow background
      pdf.rect(15, yPosition - 5, pageWidth - 30, 12, 'F');
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0); // Black text for yellow background
      pdf.text('6. ÉCARTS ET ANOMALIES', 20, yPosition + 3);

      yPosition += 15;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      formData.ecarts.forEach((gap, index) => {
        if (gap.trim()) {
          pdf.text(`• ${gap}`, 25, yPosition);
          yPosition += 6;
        }
      });
      yPosition += 10;

      // 7. Actions d'amélioration
      await checkNewPage(80);
      pdf.setFillColor(26, 188, 156); // Teal background
      pdf.rect(15, yPosition - 5, pageWidth - 30, 12, 'F');
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('7. ACTIONS D\'AMÉLIORATION', 20, yPosition + 3);

      yPosition += 15;
      pdf.setTextColor(0, 0, 0);

      const actionsData = formData.actions.map(a => [
        a.action,
        a.responsable,
        a.echeance,
        a.statut,
        `${a.avancement}%`
      ]);

      autoTable(pdf, {
        startY: yPosition,
        head: [['Action', 'Responsable', 'Échéance', 'Statut', 'Avancement']],
        body: actionsData,
        theme: 'grid',
        headStyles: {
          fillColor: [26, 188, 156],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 20, right: 20 }
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 15;

      // 8. Mise à jour des données de référence
      await checkNewPage(40);
      pdf.setFillColor(142, 68, 173); // Purple background
      pdf.rect(15, yPosition - 5, pageWidth - 30, 12, 'F');
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('8. MISE À JOUR DES DONNÉES DE RÉFÉRENCE ET DES IPE', 20, yPosition + 3);

      yPosition += 15;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Année de référence actuelle : ${formData.anneeReference}`, 25, yPosition);
      yPosition += 8;
      pdf.text('Révisions prévues : ' + (formData.changementsIPE || 'Aucun changement prévu'), 25, yPosition);
      yPosition += 15;

      // 9. Décisions prises
      await checkNewPage(80);
      pdf.setFillColor(52, 73, 94); // Dark blue background
      pdf.rect(15, yPosition - 5, pageWidth - 30, 12, 'F');
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('9. DÉCISIONS PRISES', 20, yPosition + 3);

      yPosition += 15;
      pdf.setTextColor(0, 0, 0);

      const decisionsData = formData.decisions.map(d => [d.decision, d.responsable, d.echeance]);

      autoTable(pdf, {
        startY: yPosition,
        head: [['Décision', 'Responsable', 'Échéance']],
        body: decisionsData,
        theme: 'grid',
        headStyles: {
          fillColor: [52, 73, 94],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 20, right: 20 }
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 15;

      // 10. Conclusion
      await checkNewPage(60);
      pdf.setFillColor(39, 174, 96); // Green background
      pdf.rect(15, yPosition - 5, pageWidth - 30, 12, 'F');
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('10. CONCLUSION', 20, yPosition + 3);

      yPosition += 15;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Bilan global :', 20, yPosition);
      yPosition += 6;
      pdf.text(formData.bilanGlobal, 25, yPosition);
      yPosition += 10;

      pdf.text('Axes prioritaires :', 20, yPosition);
      yPosition += 6;
      pdf.text(formData.axesPrioritaires, 25, yPosition);
      yPosition += 15;

      // 11. Annexes
      await checkNewPage(60);
      pdf.setFillColor(149, 165, 166); // Gray background
      pdf.rect(15, yPosition - 5, pageWidth - 30, 12, 'F');
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('11. ANNEXES', 20, yPosition + 3);

      yPosition += 15;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      formData.annexes.forEach((annexe, index) => {
        pdf.text(`• ${annexe}`, 25, yPosition);
        yPosition += 8;
      });

      // Add photos section
      if (photos.length > 0) {
        yPosition += 10;
        await checkNewPage(30);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Photos et images :', 20, yPosition);
        yPosition += 15;

        for (const photo of photos) {
          await checkNewPage(60);

          if (photo.url) {
            try {
              // Add image to PDF
              const img = new Image();
              img.crossOrigin = 'anonymous';
              await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = photo.url;
              });

              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = img.width;
              canvas.height = img.height;
              ctx?.drawImage(img, 0, 0);

              const imgData = canvas.toDataURL('image/jpeg', 0.8);
              const imgWidth = 80;
              const imgHeight = (img.height * imgWidth) / img.width;

              pdf.addImage(imgData, 'JPEG', 20, yPosition, imgWidth, imgHeight);
              yPosition += imgHeight + 5;
            } catch (error) {
              console.error('Error adding image to PDF:', error);
            }
          }

          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'italic');
          pdf.text(photo.description, 20, yPosition);
          yPosition += 15;
        }
      }

      // Formule de clôture
      await checkNewPage(40);
      yPosition += 20;

      // Add signature box
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.rect(20, yPosition, pageWidth - 40, 30);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Fait à ${formData.lieu}, le ${new Date().toLocaleDateString('fr-FR')}`, 25, yPosition + 10);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Signature du responsable :', 25, yPosition + 20);

      // Add final footer
      addPageFooter();

      // Save the PDF
      pdf.save(`Revue_Energetique_${organizationName}_${formData.dateRevue}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement du rapport de revue énergétique...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8">
          <div className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Revue Énergétique</h1>
                <p className="text-gray-600">Rapport conforme ISO 50001:2018</p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              {canModify && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                    isEditing 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Edit2 className="w-5 h-5" />
                  <span>{isEditing ? 'Sauvegarder' : 'Modifier'}</span>
                </button>
              )}
              
              <button
                onClick={generatePDF}
                className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-300"
              >
                <Download className="w-5 h-5" />
                <span>Télécharger PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-8 space-y-8">
            
            {/* Section 1: Informations générales */}
            <section className="border-b border-gray-200 pb-8">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-100 p-6 rounded-xl mb-6">
                <div className="flex items-center space-x-4 mb-4">
                  <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold">1</span>
                  <div className="flex items-center space-x-4">
                    {organizationLogo && (
                      <img 
                        src={organizationLogo} 
                        alt="Logo entreprise" 
                        className="h-12 w-12 object-cover rounded-lg border border-gray-200 shadow-sm"
                      />
                    )} 
                    <h2 className="text-2xl font-bold text-blue-900">Informations générales.</h2>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={organizationName}
                          onChange={(e) => setOrganizationName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{organizationName}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date de la revue</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={formData.dateRevue}
                          onChange={(e) => handleInputChange('dateRevue', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{new Date(formData.dateRevue).toLocaleDateString('fr-FR')}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Durée</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.duree}
                          onChange={(e) => handleInputChange('duree', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: 14h00 - 16h00"
                        />
                      ) : (
                        <p className="text-gray-900">{formData.duree}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.lieu}
                          onChange={(e) => handleInputChange('lieu', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{formData.lieu}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Période de référence</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.periodeReference}
                          onChange={(e) => handleInputChange('periodeReference', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{formData.periodeReference}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Président de séance</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.president}
                          onChange={(e) => handleInputChange('president', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{formData.president}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Participants</label>
                  {isEditing ? (
                    <div className="space-y-2">
                      {formData.participants.map((participant, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={participant}
                            onChange={(e) => {
                              const newParticipants = [...formData.participants];
                              newParticipants[index] = e.target.value;
                              handleInputChange('participants', newParticipants);
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => removeItem('participants', index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={formData.newParticipant}
                          onChange={(e) => handleInputChange('newParticipant', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Nouveau participant"
                        />
                        <button
                          onClick={() => addItem('participants', 'newParticipant')}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {formData.participants.map((participant, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {participant}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Section 2: Objectifs de la revue */}
            <section className="border-b border-gray-200 pb-8">
              <div className="bg-gradient-to-r from-green-50 to-emerald-100 p-6 rounded-xl mb-6">
                <h2 className="text-2xl font-bold text-green-900 mb-4 flex items-center">
                  <span className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-3">2</span>
                  Objectifs de la revue
                </h2>
                
                {isEditing ? (
                  <div className="space-y-2">
                    {formData.objectifs.map((objectif, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={objectif}
                          onChange={(e) => {
                            const newObjectifs = [...formData.objectifs];
                            newObjectifs[index] = e.target.value;
                            handleInputChange('objectifs', newObjectifs);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                        <button
                          onClick={() => removeItem('objectifs', index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={formData.newObjectif}
                        onChange={(e) => handleInputChange('newObjectif', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="Nouvel objectif"
                      />
                      <button
                        onClick={() => addItem('objectifs', 'newObjectif')}
                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {formData.objectifs.map((objectif, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-gray-700">{objectif}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Section 3: Bilan des consommations énergétiques */}
            <section className="border-b border-gray-200 pb-8">
              <div className="bg-gradient-to-r from-purple-50 to-violet-100 p-6 rounded-xl mb-6">
                <h2 className="text-2xl font-bold text-purple-900 mb-4 flex items-center">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-3">3</span>
                  Bilan des consommations énergétiques
                </h2>
                
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                        <thead className="bg-purple-600 text-white">
                          <tr>
                            <th className="px-4 py-3 text-left">Type d'énergie</th>
                            <th className="px-4 py-3 text-center">Consommation (kWh)</th>
                            <th className="px-4 py-3 text-center">Pourcentage</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.consommations.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200">
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={item.type}
                                  onChange={(e) => updateItem('consommations', index, 'type', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="number"
                                  value={item.kwh}
                                  onChange={(e) => updateItem('consommations', index, 'kwh', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="number"
                                  value={item.pourcentage}
                                  onChange={(e) => updateItem('consommations', index, 'pourcentage', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => removeItem('consommations', index)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                      <input
                        type="text"
                        value={formData.newConsommationType}
                        onChange={(e) => handleInputChange('newConsommationType', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Type d'énergie"
                      />
                      <input
                        type="number"
                        value={formData.newConsommationKwh}
                        onChange={(e) => handleInputChange('newConsommationKwh', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Consommation (kWh)"
                      />
                      <button
                        onClick={() => addItem('consommations', 'newConsommationType')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                      <thead className="bg-purple-600 text-white">
                        <tr>
                          <th className="px-6 py-3 text-left">Type d'énergie</th>
                          <th className="px-6 py-3 text-center">Consommation (kWh)</th>
                          <th className="px-6 py-3 text-center">Pourcentage</th>
                          <th className="px-6 py-3 text-center">Répartition</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.consommations.map((item, index) => (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">{item.type}</td>
                            <td className="px-6 py-4 text-center">{item.kwh.toLocaleString()}</td>
                            <td className="px-6 py-4 text-center">{item.pourcentage}%</td>
                            <td className="px-6 py-4">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-purple-600 h-2 rounded-full" 
                                  style={{ width: `${item.pourcentage}%` }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                <div className="mt-4 p-4 bg-white rounded-lg">
                  <p className="text-lg font-semibold text-gray-900">
                    Total énergie consommée : {formData.consommations.reduce((sum, item) => sum + item.kwh, 0).toLocaleString()} kWh équivalent
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4: Analyse des UES */}
            <section className="border-b border-gray-200 pb-8">
              <div className="bg-gradient-to-r from-amber-50 to-orange-100 p-6 rounded-xl mb-6">
                <h2 className="text-2xl font-bold text-amber-900 mb-4 flex items-center">
                  <span className="bg-amber-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-3">4</span>
                  Analyse des Usages Énergétiques Significatifs (UES)
                </h2>
                
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                        <thead className="bg-amber-600 text-white">
                          <tr>
                            <th className="px-4 py-3 text-left">Usage</th>
                            <th className="px-4 py-3 text-center">Type d'énergie</th>
                            <th className="px-4 py-3 text-center">Poids (%)</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.ues.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200">
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={item.usage}
                                  onChange={(e) => updateItem('ues', index, 'usage', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={item.type}
                                  onChange={(e) => updateItem('ues', index, 'type', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="number"
                                  value={item.poids}
                                  onChange={(e) => updateItem('ues', index, 'poids', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => removeItem('ues', index)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                      <input
                        type="text"
                        value={formData.newUesUsage}
                        onChange={(e) => handleInputChange('newUesUsage', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Usage"
                      />
                      <input
                        type="text"
                        value={formData.newUesType}
                        onChange={(e) => handleInputChange('newUesType', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Type d'énergie"
                      />
                      <input
                        type="number"
                        value={formData.newUesPoids}
                        onChange={(e) => handleInputChange('newUesPoids', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Poids (%)"
                      />
                      <button
                        onClick={() => addItem('ues', 'newUesUsage')}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                      <thead className="bg-amber-600 text-white">
                        <tr>
                          <th className="px-6 py-3 text-left">Usage</th>
                          <th className="px-6 py-3 text-center">Type d'énergie</th>
                          <th className="px-6 py-3 text-center">Poids (%)</th>
                          <th className="px-6 py-3 text-center">Impact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.ues.map((item, index) => (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">{item.usage}</td>
                            <td className="px-6 py-4 text-center">{item.type}</td>
                            <td className="px-6 py-4 text-center">{item.poids}%</td>
                            <td className="px-6 py-4">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-amber-600 h-2 rounded-full" 
                                  style={{ width: `${item.poids}%` }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* Section 5: Indicateurs de performance énergétique (IPE) */}
            <section className="border-b border-gray-200 pb-8">
              <div className="bg-gradient-to-r from-teal-50 to-cyan-100 p-6 rounded-xl mb-6">
                <h2 className="text-2xl font-bold text-teal-900 mb-4 flex items-center">
                  <span className="bg-teal-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-3">5</span>
                  Indicateurs de performance énergétique (IPE)
                </h2>
                
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                        <thead className="bg-teal-600 text-white">
                          <tr>
                            <th className="px-4 py-3 text-left">Indicateur</th>
                            <th className="px-4 py-3 text-center">Valeur N-1</th>
                            <th className="px-4 py-3 text-center">Valeur N</th>
                            <th className="px-4 py-3 text-center">Évolution (%)</th>
                            <th className="px-4 py-3 text-center">Objectif atteint</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.ipe.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200">
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={item.indicateur}
                                  onChange={(e) => updateItem('ipe', index, 'indicateur', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={item.valeurN1}
                                  onChange={(e) => updateItem('ipe', index, 'valeurN1', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={item.valeurN}
                                  onChange={(e) => updateItem('ipe', index, 'valeurN', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-sm ${
                                  item.evolution > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                }`}>
                                  {item.evolution > 0 ? '+' : ''}{item.evolution}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.objectifAtteint}
                                  onChange={(e) => updateItem('ipe', index, 'objectifAtteint', e.target.checked)}
                                  className="w-4 h-4 text-teal-600 rounded"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => removeItem('ipe', index)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
                      <input
                        type="text"
                        value={formData.newIpeIndicateur}
                        onChange={(e) => handleInputChange('newIpeIndicateur', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Indicateur"
                      />
                      <input
                        type="number"
                        value={formData.newIpeValeurN1}
                        onChange={(e) => handleInputChange('newIpeValeurN1', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Valeur N-1"
                      />
                      <input
                        type="number"
                        value={formData.newIpeValeurN}
                        onChange={(e) => handleInputChange('newIpeValeurN', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Valeur N"
                      />
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.newIpeObjectif}
                          onChange={(e) => handleInputChange('newIpeObjectif', e.target.checked)}
                          className="w-4 h-4 text-teal-600 rounded"
                        />
                        <span className="text-sm">Objectif atteint</span>
                      </label>
                      <button
                        onClick={() => addItem('ipe', 'newIpeIndicateur')}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                      <thead className="bg-teal-600 text-white">
                        <tr>
                          <th className="px-6 py-3 text-left">Indicateur</th>
                          <th className="px-6 py-3 text-center">Valeur N-1</th>
                          <th className="px-6 py-3 text-center">Valeur N</th>
                          <th className="px-6 py-3 text-center">Évolution</th>
                          <th className="px-6 py-3 text-center">Objectif atteint</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.ipe.map((item, index) => (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">{item.indicateur}</td>
                            <td className="px-6 py-4 text-center">{item.valeurN1}</td>
                            <td className="px-6 py-4 text-center">{item.valeurN}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                                item.evolution > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {item.evolution > 0 ? '+' : ''}{item.evolution}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {item.objectifAtteint ? (
                                <CheckCircle className="w-6 h-6 text-green-600 mx-auto" />
                              ) : (
                                <X className="w-6 h-6 text-red-600 mx-auto" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* Section 6: Écarts et anomalies */}
            <section className="border-b border-gray-200 pb-8">
              <div className="bg-gradient-to-r from-red-50 to-pink-100 p-6 rounded-xl mb-6">
                <h2 className="text-2xl font-bold text-red-900 mb-4 flex items-center">
                  <span className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-3">6</span>
                  Écarts et anomalies
                </h2>
                
                {isEditing ? (
                  <div className="space-y-2">
                    {formData.ecarts.map((ecart, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={ecart}
                          onChange={(e) => {
                            const newEcarts = [...formData.ecarts];
                            newEcarts[index] = e.target.value;
                            handleInputChange('ecarts', newEcarts);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        />
                        <button
                          onClick={() => removeItem('ecarts', index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={formData.newEcart}
                        onChange={(e) => handleInputChange('newEcart', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        placeholder="Nouvel écart ou anomalie"
                      />
                      <button
                        onClick={() => addItem('ecarts', 'newEcart')}
                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {formData.ecarts.map((ecart, index) => (
                      <li key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                        <span className="text-gray-700">{ecart}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Section 7: Actions d'amélioration */}
            <section className="border-b border-gray-200 pb-8">
              <div className="bg-gradient-to-r from-indigo-50 to-blue-100 p-6 rounded-xl mb-6">
                <h2 className="text-2xl font-bold text-indigo-900 mb-4 flex items-center">
                  <span className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-3">7</span>
                  Actions d'amélioration
                </h2>
                
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                        <thead className="bg-indigo-600 text-white">
                          <tr>
                            <th className="px-4 py-3 text-left">Action</th>
                            <th className="px-4 py-3 text-center">Responsable</th>
                            <th className="px-4 py-3 text-center">Échéance</th>
                            <th className="px-4 py-3 text-center">Statut</th>
                            <th className="px-4 py-3 text-center">Avancement (%)</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.actions.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200">
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={item.action}
                                  onChange={(e) => updateItem('actions', index, 'action', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={item.responsable}
                                  onChange={(e) => updateItem('actions', index, 'responsable', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="date"
                                  value={item.echeance}
                                  onChange={(e) => updateItem('actions', index, 'echeance', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={item.statut}
                                  onChange={(e) => updateItem('actions', index, 'statut', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                >
                                  <option value="Planifié">Planifié</option>
                                  <option value="En cours">En cours</option>
                                  <option value="Réalisé">Réalisé</option>
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={item.avancement}
                                  onChange={(e) => updateItem('actions', index, 'avancement', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                                  min="0"
                                  max="100"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => removeItem('actions', index)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
                      <input
                        type="text"
                        value={formData.newActionNom}
                        onChange={(e) => handleInputChange('newActionNom', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Action"
                      />
                      <input
                        type="text"
                        value={formData.newActionResponsable}
                        onChange={(e) => handleInputChange('newActionResponsable', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Responsable"
                      />
                      <input
                        type="date"
                        value={formData.newActionEcheance}
                        onChange={(e) => handleInputChange('newActionEcheance', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <select
                        value={formData.newActionStatut}
                        onChange={(e) => handleInputChange('newActionStatut', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="Planifié">Planifié</option>
                        <option value="En cours">En cours</option>
                        <option value="Réalisé">Réalisé</option>
                      </select>
                      <button
                        onClick={() => addItem('actions', 'newActionNom')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                      <thead className="bg-indigo-600 text-white">
                        <tr>
                          <th className="px-6 py-3 text-left">Action</th>
                          <th className="px-6 py-3 text-center">Responsable</th>
                          <th className="px-6 py-3 text-center">Échéance</th>
                          <th className="px-6 py-3 text-center">Statut</th>
                          <th className="px-6 py-3 text-center">Avancement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.actions.map((item, index) => (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">{item.action}</td>
                            <td className="px-6 py-4 text-center">{item.responsable}</td>
                            <td className="px-6 py-4 text-center">{new Date(item.echeance).toLocaleDateString('fr-FR')}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                item.statut === 'Réalisé' ? 'bg-green-100 text-green-800' :
                                item.statut === 'En cours' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {item.statut}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-indigo-600 h-2 rounded-full" 
                                    style={{ width: `${item.avancement}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium text-gray-700">{item.avancement}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* Section 8: Mise à jour des données de référence et des IPE */}
            <section className="border-b border-gray-200 pb-8">
              <div className="bg-gradient-to-r from-yellow-50 to-amber-100 p-6 rounded-xl mb-6">
                <h2 className="text-2xl font-bold text-yellow-900 mb-4 flex items-center">
                  <span className="bg-yellow-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-3">8</span>
                  Mise à jour des données de référence et des IPE
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Année de référence actuelle</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={formData.anneeReference}
                        onChange={(e) => handleInputChange('anneeReference', parseInt(e.target.value) || 2023)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        min="2020"
                        max="2030"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{formData.anneeReference}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Changements ou révisions prévus pour les IPE</label>
                    {isEditing ? (
                      <textarea
                        value={formData.changementsIPE}
                        onChange={(e) => handleInputChange('changementsIPE', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        rows={3}
                        placeholder="Décrivez les changements prévus..."
                      />
                    ) : (
                      <p className="text-gray-700">{formData.changementsIPE || 'Aucun changement prévu pour le moment'}</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Section 9: Décisions prises */}
            <section className="border-b border-gray-200 pb-8">
              <div className="bg-gradient-to-r from-emerald-50 to-green-100 p-6 rounded-xl mb-6">
                <h2 className="text-2xl font-bold text-emerald-900 mb-4 flex items-center">
                  <span className="bg-emerald-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-3">9</span>
                  Décisions prises
                </h2>
                
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                        <thead className="bg-emerald-600 text-white">
                          <tr>
                            <th className="px-4 py-3 text-left">Décision</th>
                            <th className="px-4 py-3 text-center">Responsable</th>
                            <th className="px-4 py-3 text-center">Échéance</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.decisions.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200">
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={item.decision}
                                  onChange={(e) => updateItem('decisions', index, 'decision', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={item.responsable}
                                  onChange={(e) => updateItem('decisions', index, 'responsable', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="date"
                                  value={item.echeance}
                                  onChange={(e) => updateItem('decisions', index, 'echeance', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => removeItem('decisions', index)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                      <input
                        type="text"
                        value={formData.newDecisionTexte}
                        onChange={(e) => handleInputChange('newDecisionTexte', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Décision"
                      />
                      <input
                        type="text"
                        value={formData.newDecisionResponsable}
                        onChange={(e) => handleInputChange('newDecisionResponsable', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Responsable"
                      />
                      <input
                        type="date"
                        value={formData.newDecisionEcheance}
                        onChange={(e) => handleInputChange('newDecisionEcheance', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <button
                        onClick={() => addItem('decisions', 'newDecisionTexte')}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                      <thead className="bg-emerald-600 text-white">
                        <tr>
                          <th className="px-6 py-3 text-left">Décision</th>
                          <th className="px-6 py-3 text-center">Responsable</th>
                          <th className="px-6 py-3 text-center">Échéance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.decisions.map((item, index) => (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">{item.decision}</td>
                            <td className="px-6 py-4 text-center">{item.responsable}</td>
                            <td className="px-6 py-4 text-center">{new Date(item.echeance).toLocaleDateString('fr-FR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* Section 10: Conclusion */}
            <section className="border-b border-gray-200 pb-8">
              <div className="bg-gradient-to-r from-slate-50 to-gray-100 p-6 rounded-xl mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
                  <span className="bg-slate-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-3">10</span>
                  Conclusion
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bilan global de la performance énergétique</label>
                    {isEditing ? (
                      <textarea
                        value={formData.bilanGlobal}
                        onChange={(e) => handleInputChange('bilanGlobal', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                        rows={3}
                      />
                    ) : (
                      <p className="text-gray-700 bg-white p-4 rounded-lg">{formData.bilanGlobal}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Axes prioritaires pour l'année à venir</label>
                    {isEditing ? (
                      <textarea
                        value={formData.axesPrioritaires}
                        onChange={(e) => handleInputChange('axesPrioritaires', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                        rows={3}
                      />
                    ) : (
                      <p className="text-gray-700 bg-white p-4 rounded-lg">{formData.axesPrioritaires}</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Section 11: Annexes */}
            <section className="border-b border-gray-200 pb-8">
              <div className="bg-gradient-to-r from-rose-50 to-pink-100 p-6 rounded-xl mb-6">
                <h2 className="text-2xl font-bold text-rose-900 mb-4 flex items-center">
                  <span className="bg-rose-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-3">11</span>
                  Annexes
                </h2>
                
                {isEditing ? (
                  <div className="space-y-2">
                    {formData.annexes.map((annexe, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={annexe}
                          onChange={(e) => {
                            const newAnnexes = [...formData.annexes];
                            newAnnexes[index] = e.target.value;
                            handleInputChange('annexes', newAnnexes);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                        />
                        <button
                          onClick={() => removeItem('annexes', index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={formData.newAnnexe}
                        onChange={(e) => handleInputChange('newAnnexe', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                        placeholder="Nouvelle annexe"
                      />
                      <button
                        onClick={() => addItem('annexes', 'newAnnexe')}
                        className="p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {formData.annexes.map((annexe, index) => (
                      <li key={index} className="flex items-center space-x-2 p-3 bg-white rounded-lg">
                        <FileText className="w-5 h-5 text-rose-600" />
                        <span className="text-gray-700">{annexe}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Section 12: Photos et Images */}
            <section className="border-b border-gray-200 pb-8">
              <div className="bg-gradient-to-r from-gray-50 to-slate-100 p-6 rounded-xl mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="bg-gray-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-3">12</span>
                  Photos et Images
                </h2>
                
                {isEditing ? (
                  <div className="space-y-6">
                    {/* Add new photo */}
                    <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
                      <div className="flex flex-col space-y-3">
                        <input
                          type="text"
                          value={newPhotoDescription}
                          onChange={(e) => setNewPhotoDescription(e.target.value)}
                          placeholder="Description de la photo..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        />
                        <button
                          onClick={handleAddPhoto}
                          className="self-start flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Ajouter une photo
                        </button>
                      </div>
                    </div>

                    {/* Photos list */}
                    <div className="space-y-4">
                      {photos.map((photo) => (
                        <div key={photo.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start space-x-4">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={photo.description}
                                onChange={(e) => handlePhotoDescriptionChange(photo.id, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent mb-3"
                                placeholder="Description de la photo..."
                              />
                              
                              <div className="flex items-center space-x-3">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handlePhotoUpload(photo.id, file);
                                    }
                                  }}
                                  className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                                />
                                
                                {photo.url && (
                                  <div className="flex items-center space-x-2 text-green-600">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-sm">Image chargée</span>
                                  </div>
                                )}
                              </div>
                              
                              {photo.url && (
                                <div className="mt-3">
                                  <img 
                                    src={photo.url} 
                                    alt={photo.description}
                                    className="max-w-xs max-h-48 object-cover rounded-lg border border-gray-200"
                                  />
                                </div>
                              )}
                            </div>
                            
                            <button
                              onClick={() => handleRemovePhoto(photo.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {photos.length === 0 ? (
                      <p className="text-gray-500 italic">Aucune photo ajoutée</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {photos.map((photo) => (
                          <div key={photo.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            {photo.url ? (
                              <div className="space-y-3">
                                <img 
                                  src={photo.url} 
                                  alt={photo.description}
                                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                                />
                                <p className="text-sm text-gray-700 font-medium">{photo.description}</p>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-48 bg-gray-200 rounded-lg">
                                <div className="text-center">
                                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                  <p className="text-sm text-gray-500">{photo.description}</p>
                                  <p className="text-xs text-gray-400 mt-1">Image non chargée</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Formule de clôture */}
            <div className="text-center pt-8 border-t border-gray-200">
              <p className="text-lg font-medium text-gray-900">
                Fait à {isEditing ? (
                  <input
                    type="text"
                    value={formData.lieu}
                    onChange={(e) => handleInputChange('lieu', e.target.value)}
                    className="inline-block px-2 py-1 border border-gray-300 rounded mx-1"
                  />
                ) : (
                  <span className="font-semibold">{formData.lieu}</span>
                )}, le {isEditing ? (
                  <input
                    type="date"
                    value={formData.dateRevue}
                    onChange={(e) => handleInputChange('dateRevue', e.target.value)}
                    className="inline-block px-2 py-1 border border-gray-300 rounded mx-1"
                  />
                ) : (
                  <span className="font-semibold">{new Date(formData.dateRevue).toLocaleDateString('fr-FR')}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnergyReviewReport;
