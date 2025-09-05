import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Plus, Trash2, ArrowRight, Building2, Building, Factory, Users, Briefcase, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProgressNav from '../components/ProgressNav';

interface Site {
  name: string;
  description?: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
}

interface Filiale {
  name: string;
  description?: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  sites: Site[];
}

interface Filiere {
  name: string;
  location?: string;
  manager?: string;
  filiales: Filiale[];
}

interface Organization {
  name: string;
  description?: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  filieres: Filiere[];
}

const ComplexCompanyFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeSection, setActiveSection] = useState<'organization' | 'filieres'>('organization');

  const [organization, setOrganization] = useState<Organization>({
    name: '',
    description: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    filieres: []
  });

  // Get selections from location state
  const selectedSector = location.state?.sector || null;
  const selectedEnergyTypes = location.state?.energyTypes || [];
  const selectedStandards = location.state?.standards || [];
  const selectedIssues = location.state?.issues || [];
  const selectedCriteria = location.state?.criteria || [];
  const selectedIndicators = location.state?.indicators || [];

  const handleOrganizationChange = (field: keyof Organization, value: string) => {
    setOrganization(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFiliereChange = (index: number, field: keyof Filiere, value: string) => {
    setOrganization(prev => ({
      ...prev,
      filieres: prev.filieres.map((filiere, i) =>
        i === index ? { ...filiere, [field]: value } : filiere
      )
    }));
  };

  const handleFilialeChange = (filiereIndex: number, filialeIndex: number, field: keyof Filiale, value: string) => {
    setOrganization(prev => ({
      ...prev,
      filieres: prev.filieres.map((filiere, fi) =>
        fi === filiereIndex
          ? {
              ...filiere,
              filiales: filiere.filiales.map((filiale, fli) =>
                fli === filialeIndex ? { ...filiale, [field]: value } : filiale
              )
            }
          : filiere
      )
    }));
  };

  const handleSiteChange = (
    filiereIndex: number,
    filialeIndex: number,
    siteIndex: number,
    field: keyof Site,
    value: string
  ) => {
    setOrganization(prev => ({
      ...prev,
      filieres: prev.filieres.map((filiere, fi) =>
        fi === filiereIndex
          ? {
              ...filiere,
              filiales: filiere.filiales.map((filiale, fli) =>
                fli === filialeIndex
                  ? {
                      ...filiale,
                      sites: filiale.sites.map((site, si) =>
                        si === siteIndex ? { ...site, [field]: value } : site
                      )
                    }
                  : filiale
              )
            }
          : filiere
      )
    }));
  };

  const addFiliere = () => {
    setOrganization(prev => ({
      ...prev,
      filieres: [
        ...prev.filieres,
        {
          name: '',
          location: '',
          manager: '',
          filiales: []
        }
      ]
    }));
  };

  const addFiliale = (filiereIndex: number) => {
    setOrganization(prev => ({
      ...prev,
      filieres: prev.filieres.map((filiere, index) =>
        index === filiereIndex
          ? {
              ...filiere,
              filiales: [
                ...filiere.filiales,
                {
                  name: '',
                  description: '',
                  address: '',
                  city: '',
                  country: '',
                  phone: '',
                  email: '',
                  website: '',
                  sites: []
                }
              ]
            }
          : filiere
      )
    }));
  };

  const addSite = (filiereIndex: number, filialeIndex: number) => {
    setOrganization(prev => ({
      ...prev,
      filieres: prev.filieres.map((filiere, fi) =>
        fi === filiereIndex
          ? {
              ...filiere,
              filiales: filiere.filiales.map((filiale, fli) =>
                fli === filialeIndex
                  ? {
                      ...filiale,
                      sites: [
                        ...filiale.sites,
                        {
                          name: '',
                          description: '',
                          address: '',
                          city: '',
                          country: '',
                          phone: '',
                          email: '',
                          website: ''
                        }
                      ]
                    }
                  : filiale
              )
            }
          : filiere
      )
    }));
  };

  const removeFiliere = (index: number) => {
    setOrganization(prev => ({
      ...prev,
      filieres: prev.filieres.filter((_, i) => i !== index)
    }));
  };

  const removeFiliale = (filiereIndex: number, filialeIndex: number) => {
    setOrganization(prev => ({
      ...prev,
      filieres: prev.filieres.map((filiere, fi) =>
        fi === filiereIndex
          ? {
              ...filiere,
              filiales: filiere.filiales.filter((_, fli) => fli !== filialeIndex)
            }
          : filiere
      )
    }));
  };

  const removeSite = (filiereIndex: number, filialeIndex: number, siteIndex: number) => {
    setOrganization(prev => ({
      ...prev,
      filieres: prev.filieres.map((filiere, fi) =>
        fi === filiereIndex
          ? {
              ...filiere,
              filiales: filiere.filiales.map((filiale, fli) =>
                fli === filialeIndex
                  ? {
                      ...filiale,
                      sites: filiale.sites.filter((_, si) => si !== siteIndex)
                    }
                  : filiale
              )
            }
          : filiere
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Insert organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([{
          name: organization.name,
          description: organization.description,
          address: organization.address,
          city: organization.city,
          country: organization.country,
          phone: organization.phone,
          email: organization.email,
          website: organization.website
        }])
        .select()
        .single();

      if (orgError) throw orgError;

      // Insert filieres
      for (const filiere of organization.filieres) {
        const { error: filiereError } = await supabase
          .from('filieres')
          .insert([{
            name: filiere.name,
            organization_name: organization.name,
            location: filiere.location,
            manager: filiere.manager
          }]);

        if (filiereError) throw filiereError;

        // Insert filiales
        for (const filiale of filiere.filiales) {
          const { error: filialeError } = await supabase
            .from('filiales')
            .insert([{
              name: filiale.name,
              organization_name: organization.name,
              filiere_name: filiere.name,
              description: filiale.description,
              address: filiale.address,
              city: filiale.city,
              country: filiale.country,
              phone: filiale.phone,
              email: filiale.email,
              website: filiale.website
            }]);

          if (filialeError) throw filialeError;

          // Insert sites
          for (const site of filiale.sites) {
            const { error: siteError } = await supabase
              .from('sites')
              .insert([{
                name: site.name,
                organization_name: organization.name,
                filiere_name: filiere.name,
                filiale_name: filiale.name,
                description: site.description,
                address: site.address,
                city: site.city,
                country: site.country,
                phone: site.phone,
                email: site.email,
                website: site.website
              }]);

            if (siteError) throw siteError;
          }
        }
      }

      // Save selections to organization_selections table
      if (selectedSector && selectedEnergyTypes.length > 0) {
        const { error: selectionsError } = await supabase
          .from('organization_selections')
          .insert([{
            organization_name: organization.name,
            sector_name: selectedSector,
            energy_type_name: selectedEnergyTypes[0],
            standard_names: selectedStandards,
            issue_names: selectedIssues,
            criteria_names: selectedCriteria,
            indicator_names: selectedIndicators
          }]);

        if (selectionsError) throw selectionsError;
      }

      // Update user's profile with organization name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_name: organization.name,
          organization_level: 'organization'
        })
        .eq('email', user.email);

      if (profileError) throw profileError;

      setIsSubmitted(true);
      
      setTimeout(() => {
        navigate('/process-creation', {
          state: {
            sector: selectedSector,
            energyTypes: selectedEnergyTypes,
            standards: selectedStandards,
            issues: selectedIssues,
            criteria: selectedCriteria,
            indicators: selectedIndicators,
            organizationName: organization.name
          }
        });
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    navigate('/user-management');
  };

  const steps = [
    { name: 'Secteur', status: 'complete' },
    { name: 'Types d\'énergie', status: 'complete' },
    { name: 'Normes / Referentiel', status: 'complete' },
    { name: 'Enjeux', status: 'complete' },
    { name: 'Critères', status: 'complete' },
    { name: 'Indicateurs', status: 'complete' },
    { name: 'Structure', status: 'current' },
     { name: 'Utilisateurs', status: 'upcoming'}
  ] as const;

  const inputClasses = (id: string) => `
    w-full px-4 py-3 rounded-lg
    border border-gray-300
    focus:ring-2 focus:ring-green-500 focus:border-transparent
    transition-all duration-200
    hover:border-green-300
    ${error?.includes(id) ? 'border-red-300' : ''}
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Structure de l'Organisation</h1>
            <p className="mt-2 text-gray-600">Définissez la structure complète de votre organisation</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </button>
        </div>

        <ProgressNav steps={steps} />

        {error && (
          <div className="mt-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-fade-in">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {isSubmitted && (
          <div className="mt-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg animate-fade-in">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-700">Organisation enregistrée avec succès!</p>
            </div>
          </div>
        )}

        <div className="mt-8">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveSection('organization')}
                className={`
                  flex-1 px-6 py-4 text-center font-medium
                  transition-all duration-200
                  ${activeSection === 'organization'
                    ? 'text-green-600 border-b-2 border-green-500 bg-green-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center justify-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Informations Générales
                </div>
              </button>
              <button
                onClick={() => setActiveSection('filieres')}
                className={`
                  flex-1 px-6 py-4 text-center font-medium
                  transition-all duration-200
                  ${activeSection === 'filieres'
                    ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center justify-center gap-2">
                  <Users className="w-5 h-5" />
                  Structure Organisationnelle
                </div>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              {activeSection === 'organization' ? (
                <div className="space-y-8 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nom de l'organisation
                        </label>
                        <input
                          type="text"
                          value={organization.name}
                          onChange={(e) => handleOrganizationChange('name', e.target.value)}
                          className={inputClasses('name')}
                          placeholder="Ex: Groupe Énergie Verte"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={organization.description}
                          onChange={(e) => handleOrganizationChange('description', e.target.value)}
                          className={inputClasses('description')}
                          rows={3}
                          placeholder="Description de l'organisation..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Adresse
                        </label>
                        <input
                          type="text"
                          value={organization.address}
                          onChange={(e) => handleOrganizationChange('address', e.target.value)}
                          className={inputClasses('address')}
                          placeholder="Ex: 123 rue de l'Énergie"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ville
                        </label>
                        <input
                          type="text"
                          value={organization.city}
                          onChange={(e) => handleOrganizationChange('city', e.target.value)}
                          className={inputClasses('city')}
                          placeholder="Ex: Paris"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Pays
                        </label>
                        <input
                          type="text"
                          value={organization.country}
                          onChange={(e) => handleOrganizationChange('country', e.target.value)}
                          className={inputClasses('country')}
                          placeholder="Ex: Gabon"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          value={organization.phone}
                          onChange={(e) => handleOrganizationChange('phone', e.target.value)}
                          className={inputClasses('phone')}
                          placeholder="Ex:  +225 05 23 45 67 89 30"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={organization.email}
                          onChange={(e) => handleOrganizationChange('email', e.target.value)}
                          className={inputClasses('email')}
                          placeholder="Ex: contact@groupe-energie.fr"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Site web
                        </label>
                        <input
                          type="url"
                          value={organization.website}
                          onChange={(e) => handleOrganizationChange('website', e.target.value)}
                          className={inputClasses('website')}
                          placeholder="Ex: www.groupe-energie.fr"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Filières</h3>
                    <button
                      type="button"
                      onClick={addFiliere}
                      className="flex items-center gap-2 px-4 py-2 text-green-600 border-2 border-green-500 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <Plus size={20} />
                      Ajouter une filière
                    </button>
                  </div>

                  <div className="space-y-6">
                    {organization.filieres.map((filiere, filiereIndex) => (
                      <div
                        key={filiereIndex}
                        className="bg-gray-50 rounded-xl p-6 relative border-2 border-gray-200 hover:border-gray-300 transition-all duration-200"
                      >
                        <button
                          type="button"
                          onClick={() => removeFiliere(filiereIndex)}
                          className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Nom de la filière
                            </label>
                            <input
                              type="text"
                              value={filiere.name}
                              onChange={(e) => handleFiliereChange(filiereIndex, 'name', e.target.value)}
                              className={inputClasses(`filiere-${filiereIndex}-name`)}
                              placeholder="Ex: Filière Production"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Localisation
                            </label>
                            <input
                              type="text"
                              value={filiere.location}
                              onChange={(e) => handleFiliereChange(filiereIndex, 'location', e.target.value)}
                              className={inputClasses(`filiere-${filiereIndex}-location`)}
                              placeholder="Ex: Paris"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Responsable
                            </label>
                            <input
                              type="text"
                              value={filiere.manager}
                              onChange={(e) => handleFiliereChange(filiereIndex, 'manager', e.target.value)}
                              className={inputClasses(`filiere-${filiereIndex}-manager`)}
                              placeholder="Ex: Jean Dupont"
                            />
                          </div>

                          {/* Filiales Section */}
                          <div className="md:col-span-2 mt-6">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-lg font-medium text-gray-900">Filiales</h4>
                              <button
                                type="button"
                                onClick={() => addFiliale(filiereIndex)}
                                className="flex items-center gap-2 px-3 py-1.5 text-blue-600 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                <Plus size={16} />
                                Ajouter une filiale
                              </button>
                            </div>

                            <div className="space-y-6">
                              {filiere.filiales.map((filiale, filialeIndex) => (
                                <div
                                  key={filialeIndex}
                                  className="bg-white rounded-xl p-6 shadow-sm relative border-2 border-gray-100 hover:border-gray-200 transition-all duration-200"
                                >
                                  <button
                                    type="button"
                                    onClick={() => removeFiliale(filiereIndex, filialeIndex)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition-colors"
                                  >
                                    <Trash2 size={20} />
                                  </button>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nom de la filiale
                                      </label>
                                      <input
                                        type="text"
                                        value={filiale.name}
                                        onChange={(e) => handleFilialeChange(filiereIndex, filialeIndex, 'name', e.target.value)}
                                        className={inputClasses(`filiale-${filiereIndex}-${filialeIndex}-name`)}
                                        placeholder="Ex: Filiale Sud-Est"
                                        required
                                      />
                                    </div>

                                    <div className="md:col-span-2">
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                      </label>
                                      <textarea
                                        value={filiale.description}
                                        onChange={(e) => handleFilialeChange(filiereIndex, filialeIndex, 'description', e.target.value)}
                                        className={inputClasses(`filiale-${filiereIndex}-${filialeIndex}-description`)}
                                        rows={3}
                                        placeholder="Description de la filiale..."
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Adresse
                                      </label>
                                      <input
                                        type="text"
                                        value={filiale.address}
                                        onChange={(e) => handleFilialeChange(filiereIndex, filialeIndex, 'address', e.target.value)}
                                        className={inputClasses(`filiale-${filiereIndex}-${filialeIndex}-address`)}
                                        placeholder="Ex: 456 avenue de l'Innovation"
                                        required
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Ville
                                      </label>
                                      <input
                                        type="text"
                                        value={filiale.city}
                                        onChange={(e) => handleFilialeChange(filiereIndex, filialeIndex, 'city', e.target.value)}
                                        className={inputClasses(`filiale-${filiereIndex}-${filialeIndex}-city`)}
                                        placeholder="Ex: Lyon"
                                        required
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Pays
                                      </label>
                                      <input
                                        type="text"
                                        value={filiale.country}
                                        onChange={(e) => handleFilialeChange(filiereIndex, filialeIndex, 'country', e.target.value)}
                                        className={inputClasses(`filiale-${filiereIndex}-${filialeIndex}-country`)}
                                        placeholder="Ex: France"
                                        required
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Téléphone
                                      </label>
                                      <input
                                        type="tel"
                                        value={filiale.phone}
                                        onChange={(e) => handleFilialeChange(filiereIndex, filialeIndex, 'phone', e.target.value)}
                                        className={inputClasses(`filiale-${filiereIndex}-${filialeIndex}-phone`)}
                                        placeholder="Ex: +33 4 56 78 90 12"
                                        required
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                      </label>
                                      <input
                                        type="email"
                                        value={filiale.email}
                                        onChange={(e) => handleFilialeChange(filiereIndex, filialeIndex, 'email', e.target.value)}
                                        className={inputClasses(`filiale-${filiereIndex}-${filialeIndex}-email`)}
                                        placeholder="Ex: contact.sud-est@filiale.fr"
                                        required
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Site web
                                      </label>
                                      <input
                                        type="url"
                                        value={filiale.website}
                                        onChange={(e) => handleFilialeChange(filiereIndex, filialeIndex, 'website', e.target.value)}
                                        className={inputClasses(`filiale-${filiereIndex}-${filialeIndex}-website`)}
                                        placeholder="Ex: www.filiale-sud-est.fr"
                                      />
                                    </div>

                                    {/* Sites Section */}
                                    <div className="md:col-span-2 mt-6">
                                      <div className="flex justify-between items-center mb-4">
                                        <h5 className="text-lg font-medium text-gray-900">Sites</h5>
                                        <button
                                          type="button"
                                          onClick={() => addSite(filiereIndex, filialeIndex)}
                                          className="flex items-center gap-2 px-3 py-1.5 text-purple-600 border-2 border-purple-500 rounded-lg hover:bg-purple-50 transition-colors"
                                        >
                                          <Plus size={16} />
                                          Ajouter un site
                                        </button>
                                      </div>

                                      <div className="space-y-6">
                                        {filiale.sites.map((site, siteIndex) => (
                                          <div
                                            key={siteIndex}
                                            className="bg-gray-50 rounded-xl p-6 relative border-2 border-gray-100 hover:border-gray-200 transition-all duration-200"
                                          >
                                            <button
                                              type="button"
                                              onClick={() => removeSite(filiereIndex, filialeIndex, siteIndex)}
                                              className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition-colors"
                                            >
                                              <Trash2 size={20} />
                                            </button>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                              <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                  Nom du site
                                                </label>
                                                <input
                                                  type="text"
                                                  value={site.name}
                                                  onChange={(e) => handleSiteChange(filiereIndex, filialeIndex, siteIndex, 'name', e.target.value)}
                                                  className={inputClasses(`site-${filiereIndex}-${filialeIndex}-${siteIndex}-name`)}
                                                  placeholder="Ex: Site Production Sud"
                                                  required
                                                />
                                              </div>

                                              <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                  Description
                                                </label>
                                                <textarea
                                                  value={site.description}
                                                  onChange={(e) => handleSiteChange(filiereIndex, filialeIndex, siteIndex, 'description', e.target.value)}
                                                  className={inputClasses(`site-${filiereIndex}-${filialeIndex}-${siteIndex}-description`)}
                                                  rows={3}
                                                  placeholder="Description du site..."
                                                />
                                              </div>

                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                  Adresse
                                                </label>
                                                <input
                                                  type="text"
                                                  value={site.address}
                                                  onChange={(e) => handleSiteChange(filiereIndex, filialeIndex, siteIndex, 'address', e.target.value)}
                                                  className={inputClasses(`site-${filiereIndex}-${filialeIndex}-${siteIndex}-address`)}
                                                  placeholder="Ex: 789 route de la Production"
                                                  required
                                                />
                                              </div>

                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                  Ville
                                                </label>
                                                <input
                                                  type="text"
                                                  value={site.city}
                                                  onChange={(e) => handleSiteChange(filiereIndex, filialeIndex, siteIndex, 'city', e.target.value)}
                                                  className={inputClasses(`site-${filiereIndex}-${filialeIndex}-${siteIndex}-city`)}
                                                  placeholder="Ex: Marseille"
                                                  required
                                                />
                                              </div>

                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                  Pays
                                                </label>
                                                <input
                                                  type="text"
                                                  value={site.country}
                                                  onChange={(e) => handleSiteChange(filiereIndex, filialeIndex, siteIndex, 'country', e.target.value)}
                                                  className={inputClasses(`site-${filiereIndex}-${filialeIndex}-${siteIndex}-country`)}
                                                  placeholder="Ex: France"
                                                  required
                                                />
                                              </div>

                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                  Téléphone
                                                </label>
                                                <input
                                                  type="tel"
                                                  value={site.phone}
                                                  onChange={(e) => handleSiteChange(filiereIndex, filialeIndex, siteIndex, 'phone', e.target.value)}
                                                  className={inputClasses(`site-${filiereIndex}-${filialeIndex}-${siteIndex}-phone`)}
                                                  placeholder="Ex: +33 4 91 00 00 00"
                                                  required
                                                />
                                              </div>

                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                  Email
                                                </label>
                                                <input
                                                  type="email"
                                                  value={site.email}
                                                  onChange={(e) => handleSiteChange(filiereIndex, filialeIndex, siteIndex, 'email', e.target.value)}
                                                  className={inputClasses(`site-${filiereIndex}-${filialeIndex}-${siteIndex}-email`)}
                                                  placeholder="Ex: site.sud@filiale.fr"
                                                  required
                                                />
                                              </div>

                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                  Site web
                                                </label>
                                                <input
                                                  type="url"
                                                  value={site.website}
                                                  onChange={(e) => handleSiteChange(filiereIndex, filialeIndex, siteIndex, 'website', e.target.value)}
                                                  className={inputClasses(`site-${filiereIndex}-${filialeIndex}-${siteIndex}-website`)}
                                                  placeholder="Ex: www.site-sud.fr"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <ArrowLeft size={20} />
                  Retour
                </button>

                {!isSubmitted ? (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`
                      px-6 py-3 rounded-lg font-medium text-white
                      flex items-center gap-2
                      transition-all duration-300 transform hover:scale-105
                      ${isSubmitting
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl'
                      }
                    `}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        Enregistrer
                        <MapPin size={20} />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/process-creation', {
                      state: {
                        sector: selectedSector,
                        energyTypes: selectedEnergyTypes,
                        standards: selectedStandards,
                        issues: selectedIssues,
                        criteria: selectedCriteria,
                        indicators: selectedIndicators,
                        organizationName: organization.name
                      }
                    })}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                  >
                    Continuer
                    <ArrowRight size={20} />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplexCompanyFormPage;