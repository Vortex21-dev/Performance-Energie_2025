import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface CollapsibleSearchProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const CollapsibleSearch: React.FC<CollapsibleSearchProps> = ({
  placeholder = "Rechercher...",
  value,
  onChange,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleSearch = () => {
    if (isExpanded && value) {
      onChange('');
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          flex items-center
          transition-all duration-300 ease-in-out
          ${isExpanded ? 'w-full' : 'w-12'}
          bg-white rounded-full shadow-lg
          hover:shadow-xl
        `}
      >
        <button
          onClick={toggleSearch}
          className={`
            p-3 rounded-full
            transition-all duration-300
            ${isExpanded ? 'bg-green-500 text-white' : 'bg-white text-gray-600'}
            hover:scale-105
          `}
        >
          {isExpanded ? <X size={20} /> : <Search size={20} />}
        </button>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`
            px-4 py-2 rounded-r-full
            focus:outline-none
            transition-all duration-300
            ${isExpanded ? 'w-full opacity-100' : 'w-0 opacity-0'}
          `}
        />
      </div>
    </div>
  );
};

export default CollapsibleSearch;