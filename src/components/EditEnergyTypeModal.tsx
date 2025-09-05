import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EditEnergyTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  energyType: {
    name: string;
    sector_name: string;
  };
}

const EditEnergyTypeModal: React.FC<EditEnergyTypeModalProps> = ({ isOpen, onClose, onSuccess, energyType }) => {
  const [energyTypeName, setEnergyTypeName] = useState(energyType.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('energy_types')
        .update({ name: energyTypeName })
        .eq('name', energyType.name)
        .eq('sector_name', energyType.sector_name);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative animate-scaleIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-2">Modifier le type d'énergie</h2>
        <p className="text-gray-600 mb-6">Pour le secteur: {energyType.sector_name}</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="energyTypeName" className="block text-sm font-medium text-gray-700 mb-2">
              Nom du type d'énergie
            </label>
            <input
              type="text"
              id="energyTypeName"
              value={energyTypeName}
              onChange={(e) => setEnergyTypeName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Ex: Électricité, Gaz Naturel..."
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !energyTypeName.trim() || energyTypeName === energyType.name}
              className={`
                px-4 py-2 rounded-lg text-white
                transition-all duration-200
                ${isSubmitting || !energyTypeName.trim() || energyTypeName === energyType.name
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600'
                }
              `}
            >
              {isSubmitting ? 'Modification en cours...' : 'Modifier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEnergyTypeModal;