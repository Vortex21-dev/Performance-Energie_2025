import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Shield, 
  ArrowRight,
  Lock,
  Mail,
  User
} from 'lucide-react';
import { FormErrors, FormValues } from '../types';
import { validateRegisterForm } from '../lib/validation';
import { useAuth } from '../context/AuthContext';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [values, setValues] = useState<FormValues>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    if (serverError) {
      setServerError(null);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateRegisterForm(values);
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    
    setIsSubmitting(true);
    setServerError(null);
    
    try {
      const { success, error } = await register(values);
      
      if (success) {
        setIsRegistered(true);
        
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        let errorMessage = 'Échec de l\'inscription. Veuillez réessayer.';
        
        if (error?.toLowerCase().includes('email already registered')) {
          errorMessage = 'Cette adresse email est déjà utilisée. Veuillez vous connecter ou utiliser une autre adresse.';
        } else if (error?.toLowerCase().includes('password')) {
          errorMessage = 'Le mot de passe ne respecte pas les critères de sécurité requis.';
        }
        
        setServerError(errorMessage);
      }
    } catch (error: any) {
      setServerError('Une erreur inattendue est survenue. Veuillez réessayer plus tard.');
      console.error('Register error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Section Image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-gray-900">
        <img 
          src="/number one.jpeg" 
          alt="Energy Management" 
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ objectPosition: 'center center' }}
        />
        
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/20"></div>
        
        <div className="relative z-10 h-full flex flex-col justify-center p-12 text-white">
          <div className="max-w-md">
            <h2 className="text-3xl font-bold mb-4 leading-tight">
              <span className="block">Rejoignez notre</span>
              <span className="text-emerald-300">plateforme énergétique</span>
            </h2>
            
            <p className="text-white/90 text-base mb-6 leading-relaxed">
              Créez votre compte pour accéder aux outils avancés de gestion énergétique.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <span className="text-sm text-white/80">Tableau de bord personnalisé</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <span className="text-sm text-white/80">Suivi en temps réel</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <span className="text-sm text-white/80">Rapports automatisés</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Formulaire */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-md p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img 
                src="/form-removebg-preview.png" 
                alt="Energy Management" 
                className="w-full h-45 object-cover"
              />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Créer un compte
            </h1>
            <p className="text-gray-500 text-sm">
              Rejoignez notre plateforme énergétique
            </p>
          </div>
          
          {isRegistered && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-3 animate-fade-in">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <p className="text-emerald-700 text-sm ml-2">
                  Compte créé avec succès - Redirection vers la connexion...
                </p>
              </div>
            </div>
          )}
          
          {serverError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-3 animate-fade-in">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <p className="text-red-700 text-sm ml-2">{serverError}</p>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={values.fullName}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-3 py-2 text-sm rounded-lg border
                    ${errors.fullName ? 'border-red-300 bg-red-50/50' : 'border-gray-300'} 
                    focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500`}
                  placeholder="Votre nom complet"
                  required
                />
              </div>
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.fullName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-3 py-2 text-sm rounded-lg border
                    ${errors.email ? 'border-red-300 bg-red-50/50' : 'border-gray-300'} 
                    focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500`}
                  placeholder="votre@email.com"
                  required
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.email}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={values.password}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-10 py-2 text-sm rounded-lg border
                    ${errors.password ? 'border-red-300 bg-red-50/50' : 'border-gray-300'} 
                    focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500`}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.password}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={values.confirmPassword}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-10 py-2 text-sm rounded-lg border
                    ${errors.confirmPassword ? 'border-red-300 bg-red-50/50' : 'border-gray-300'} 
                    focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500`}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isRegistered}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white text-sm
                  transition-colors duration-200
                  ${isSubmitting || isRegistered
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-sm'
                  }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Création du compte
                  </span>
                ) : isRegistered ? (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Compte créé
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4" />
                    Créer mon compte
                  </span>
                )}
              </button>
            </div>
            
            <div className="mt-6 text-center text-sm text-gray-500">
              Déjà un compte ?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-emerald-600 hover:text-emerald-800 font-medium"
              >
                Se connecter
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;