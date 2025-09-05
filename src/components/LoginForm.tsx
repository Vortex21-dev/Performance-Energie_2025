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
  Mail
} from 'lucide-react';
import { FormErrors, FormValues } from '../types';
import { validateLoginForm } from '../lib/validation';
import { useAuth } from '../context/AuthContext';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [values, setValues] = useState<FormValues>({
    email: '',
    password: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'guest' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
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
    
    const validationErrors = validateLoginForm(values);
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    
    setIsSubmitting(true);
    setServerError(null);
    
    try {
      const { success, error, role } = await login(values.email, values.password);
      
      if (success) {
        setIsConnected(true);
        setUserRole(role as 'admin' | 'guest' || 'guest');
        
        setTimeout(() => {
          if (role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        }, 1500);
      } else {
        let errorMessage = 'Échec de la connexion. Veuillez vérifier vos identifiants.';
        
        if (error?.toLowerCase().includes('invalid login credentials')) {
          errorMessage = 'Email ou mot de passe incorrect. Veuillez réessayer.';
        } else if (error?.toLowerCase().includes('email not confirmed')) {
          errorMessage = 'Veuillez confirmer votre email avant de vous connecter.';
        } else if (error?.toLowerCase().includes('too many requests')) {
          errorMessage = 'Trop de tentatives de connexion. Veuillez réessayer plus tard.';
        }
        
        setServerError(errorMessage);
      }
    } catch (error: any) {
      setServerError('Une erreur inattendue est survenue. Veuillez réessayer plus tard.');
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Section Image - Pleine hauteur avec image bien centrée */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-gray-900">
        <img 
          src="/number one.jpeg " 
          alt="Energy Management" 
          className="absolute inset-0 w-full h-full object-cover object-center "
          style={{ objectPosition: 'center center' }}
        />
        
        {/* Overlay avec dégradé subtil */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/20"></div>
        
        {/* Contenu superposé */}
        <div className="relative z-10 h-full flex flex-col justify-between p-12 text-white">
          {/* Logo */}
  
          
          {/* Texte principal */}
          { /*      <div className="mt-[308px]">


  <h2 className="text-3xl font-bold mt-10 leading-tight">
    <span className="block">Gestion énergétique</span>
    <span className="text-emerald-300">optimisée</span>
  </h2>
  
  <p className="text-white/90 text-base max-w-md mb-6 leading-relaxed">
    Accédez à des outils avancés pour piloter votre performance énergétique.
  </p>
</div>*/}

          
          {/* Point clé */}

        </div>
      </div>

      {/* Section Formulaire - Plus compacte */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-md p-8">
          {/* En-tête compact */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
       <img 
          src="/form-removebg-preview.png" 
          alt="Energy Managements" 
          className="w-full h-45 object-cover"
        />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Connexion
            </h1>
            <p className="text-gray-500 text-sm">
              Accédez à votre espace sécurisé
            </p>
          </div>
          
          {/* Messages d'état */}
          {isConnected && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-3 animate-fade-in">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <p className="text-emerald-700 text-sm ml-2">
                  Connexion réussie - Redirection en cours...
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
          
          {/* Formulaire compact */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Mot de passe
                </label>
                <button
                  type="button"
                  className="text-xs text-emerald-600 hover:text-emerald-800"
                >
                  Oublié ?
                </button>
              </div>
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
            
            {/* Bouton plus compact */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isConnected}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white text-sm
                  transition-colors duration-200
                  ${isSubmitting || isConnected
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-sm'
                  }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Connexion
                  </span>
                ) : isConnected ? (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Connecté
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4" />
                    Se connecter
                  </span>
                )}
              </button>
            </div>
            
            {/*   <div className="mt-6 text-center text-sm text-gray-500">
              Pas encore de compte ?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-emerald-600 hover:text-emerald-800 font-medium"
              >
                S'inscrire
              </button>
            </div>*/}
          </form>
          
          {/* Footer minimaliste */}
          { /*   <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              © 2025 Perf-Energie - Tous droits réservés
            </p>
          </div> */}
        </div>
      </div>
      
      {/* Animation */}
      <style jsx global>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default LoginForm;