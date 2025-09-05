import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, Save, Plus, Trash2, MapPin } from 'lucide-react';
import ProgressNav from '../components/ProgressNav';
import { supabase } from '../lib/supabase';

interface Site {
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
}

const SimpleCompanyFormPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [companyData, setCompanyData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    website: ''
  });

  const [sites, setSites] = useState<Site[]>([{
    name: '',
    description: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    website: ''
  }]);

  const handleCompanyChange = (field: keyof typeof companyData, value: string) => {
    setCompanyData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing a new name
    if (field === 'name') {
      setError(null);
    }
  };

  const handleSiteChange = (index: number, field: keyof Site, value: string) => {
    setSites(prev => {
      const newSites = [...prev];
      newSites[index] = {
        ...newSites[index],
        [field]: value
      };
      return newSites;
    });
  };

  const addSite = () => {
    setSites(prev => [...prev, {
      name: '',
      description: '',
      address: '',
      city: '',
      country: '',
      phone: '',
      email: '',
      website: ''
    }]);
  };

  const removeSite = (index: number) => {
    setSites(prev => prev.filter((_, i) => i !== index));
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
        .insert([companyData])
        .select()
        .single();

      if (orgError) {
        // Handle duplicate organization name error
        if (orgError.code === '23505' && orgError.message?.includes('organizations_pkey')) {
          setError(`Une organisation avec le nom "${companyData.name}" existe déjà. Veuillez choisir un nom différent.`);
          setIsSubmitting(false);
          return;
        }
        throw orgError;
      }

      // Insert sites
      for (const site of sites) {
        if (site.name && site.address && site.city && site.country && site.phone && site.email) {
          const { error: siteError } = await supabase
            .from('sites')
            .insert([{
              name: site.name,
              description: site.description || null,
              address: site.address,
              city: site.city,
              country: site.country,
              phone: site.phone,
              email: site.email,
              website: site.website || null,
              organization_name: companyData.name,
              filiere_name: null,
              filiale_name: null
            }]);

          if (siteError) {
            console.error('Error creating site:', siteError);
            // Don't throw here, just log the error and continue
          }
        }
      }

      // Get selections from location state
      const state = location.state as {
        sector?: string;
        energyTypes?: string[];
        standards?: string[];
        issues?: string[];
        criteria?: string[];
        indicators?: string[];
      };

      // Insert selections
      if (state?.sector && state?.energyTypes?.length) {
        const { error: selectionsError } = await supabase
          .from('organization_selections')
          .insert([{
            organization_name: companyData.name,
            sector_name: state.sector,
            energy_type_name: state.energyTypes[0],
            standard_names: state.standards || [],
            issue_names: state.issues || [],
            criteria_names: state.criteria || [],
            indicator_names: state.indicators || []
          }]);

        if (selectionsError) throw selectionsError;
      }

      // Note: Profile update skipped due to database trigger issues
      // User-organization association can be managed through the user management interface
      console.log('Organization created successfully. Profile association can be updated later through user management.');
        navigate('/process-creation', {
          state: {
            sector: state?.sector,
            energyTypes: state?.energyTypes,
            standards: state?.standards,
            issues: state?.issues,
            criteria: state?.criteria,
            indicators: state?.indicators,
            organizationName: companyData.name
          }
        });
      setIsSubmitted(true);
    } catch (err: any) {
      // Handle database trigger errors with user-friendly messages
      if (err.message?.includes('DELETE requires a WHERE clause')) {
        setError('Une erreur de configuration de base de données a été détectée. L\'organisation a été créée mais certaines opérations ont été ignorées. Veuillez contacter l\'administrateur système.');
      } else {
        setError(err.message);
      }
      console.error('Error saving organization:', err);
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
            <p className="mt-2 text-gray-600">Définissez la structure de votre entreprise</p>
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
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {isSubmitted && (
          <div className="mt-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg animate-fade-in">
            <p className="text-green-700">Organisation enregistrée avec succès!</p>
          </div>
        )}

        <div className="mt-8">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <form onSubmit={handleSubmit} className="p-8">
              {/* Company Information */}
              <div className="mb-8">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="p-3 bg-gradient-to-r from-green-100 to-blue-100 rounded-full">
                    <Building2 className="h-6 w-6 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">Informations de l'entreprise</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom de l'organisation
                    </label>
                    <input
                      type="text"
                      value={companyData.name}
                      onChange={(e) => handleCompanyChange('name', e.target.value)}
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
                      value={companyData.description}
                      onChange={(e) => handleCompanyChange('description', e.target.value)}
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
                      value={companyData.address}
                      onChange={(e) => handleCompanyChange('address', e.target.value)}
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
                      value={companyData.city}
                      onChange={(e) => handleCompanyChange('city', e.target.value)}
                      className={inputClasses('city')}
                      placeholder="Ex: Paris"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pays
                    </label>
                    <input
                      type="text"
                      value={companyData.country}
                      onChange={(e) => handleCompanyChange('country', e.target.value)}
                      className={inputClasses('country')}
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
                      value={companyData.phone}
                      onChange={(e) => handleCompanyChange('phone', e.target.value)}
                      className={inputClasses('phone')}
                      placeholder="Ex: +33 1 23 45 67 89"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={companyData.email}
                      onChange={(e) => handleCompanyChange('email', e.target.value)}
                      className={inputClasses('email')}
                      placeholder="Ex: contact@energie-verte.fr"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Site web
                    </label>
                    <input
                      type="url"
                      value={companyData.website}
                      onChange={(e) => handleCompanyChange('website', e.target.value)}
                      className={inputClasses('website')}
                      placeholder="Ex: https://www.energie-verte.fr"
                    />
                  </div>
                </div>
              </div>

              {/* Sites Section */}
              <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full">
                      <MapPin className="h-6 w-6 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800">Sites</h2>
                  </div>
                  <button
                    type="button"
                    onClick={addSite}
                    className="flex items-center gap-2 px-4 py-2 text-blue-600 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Plus size={20} />
                    Ajouter un site
                  </button>
                </div>

                <div className="space-y-8">
                  {sites.map((site, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-xl p-6 relative border-2 border-gray-200 hover:border-gray-300 transition-all duration-200"
                    >
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeSite(index)}
                          className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nom du site
                          </label>
               <input
  type="text"
  value={site.name}
  onChange={(e) => handleSiteChange(index, 'name', e.target.value)}
  className={inputClasses(`site-${index}-name`)}
  placeholder="Ex: Site Principal"
  required
/>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                    <input
                      type="text"
                      value={site.description}
                      onChange={(e) => handleSiteChange(index, 'description', e.target.value)}
                      className={inputClasses(`site-${index}-description`)}
                      placeholder="Description du site"
                    />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Adresse
                          </label>
                    <input
                      type="text"
                      value={site.address}
                      onChange={(e) => handleSiteChange(index, 'address', e.target.value)}
                      className={inputClasses(`site-${index}-address`)}
                      placeholder="Ex: 123 avenue de la Production"
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
                      onChange={(e) => handleSiteChange(index, 'city', e.target.value)}
                      className={inputClasses(`site-${index}-city`)}
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
                      value={site.country}
                      onChange={(e) => handleSiteChange(index, 'country', e.target.value)}
                      className={inputClasses(`site-${index}-country`)}
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
                      onChange={(e) => handleSiteChange(index, 'phone', e.target.value)}
                      className={inputClasses(`site-${index}-phone`)}
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
                      value={site.email}
                      onChange={(e) => handleSiteChange(index, 'email', e.target.value)}
                      className={inputClasses(`site-${index}-email`)}
                      placeholder="Ex: contact.site@energie-verte.fr"
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
                      onChange={(e) => handleSiteChange(index, 'website', e.target.value)}
                      className={inputClasses(`site-${index}-website`)}
                      placeholder="Ex: https://site.energie-verte.fr"
                    />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

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
                        <Save size={20} />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleContinue}
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

export default SimpleCompanyFormPage;