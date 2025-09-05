import React from 'react';
import { CheckCircle } from 'lucide-react';

interface Step {
  name: string;
  status: 'complete' | 'current' | 'upcoming';
}

interface ProgressNavProps {
  steps: Step[];
}

const ProgressNav: React.FC<ProgressNavProps> = ({ steps }) => {
  return (
    <nav aria-label="Progress\" className="relative mt-12 mb-16 max-w-5xl mx-auto flex justify-center">
      <ol role="list\" className="flex items-center justify-between">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className="relative flex items-center">
            {step.status === 'complete' ? (
              <div className="flex items-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 via-emerald-500 to-green-500 shadow-lg transition-all duration-500 hover:scale-110 group">
                  <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                  <CheckCircle className="h-8 w-8 text-white transform transition-transform duration-500 group-hover:rotate-12" aria-hidden="true" />
                  <span className="sr-only">{step.name}</span>
                  <div className="absolute -bottom-2 h-1 w-full bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                </div>
                {stepIdx !== steps.length - 1 && (
                  <div className="relative ml-4 h-0.5 w-32">
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 transform origin-left transition-transform duration-1000 scale-x-100"></div>
                  </div>
                )}
              </div>
            ) : step.status === 'current' ? (
              <div className="flex items-center" aria-current="step">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-emerald-500 bg-white shadow-lg transition-all duration-500 hover:scale-110 group">
                  <div className="absolute inset-0 rounded-full bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="h-4 w-4 rounded-full bg-emerald-500 animate-[pulse_2s_infinite] group-hover:scale-125 transition-transform duration-300"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500 opacity-50 animate-[ping_2s_infinite]"></div>
                  <span className="sr-only">{step.name}</span>
                  <div className="absolute -bottom-2 h-1 w-full bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                </div>
                {stepIdx !== steps.length - 1 && (
                  <div className="relative ml-4 h-0.5 w-32">
                    <div className="absolute inset-0 bg-gray-200 transform origin-left transition-transform duration-1000"></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-gray-200 bg-white transition-all duration-500 hover:scale-110 group">
                  <div className="absolute inset-0 rounded-full bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="h-4 w-4 rounded-full bg-gray-200 transition-all duration-300 group-hover:bg-gray-300"></div>
                  <span className="sr-only">{step.name}</span>
                  <div className="absolute -bottom-2 h-1 w-full bg-gradient-to-r from-gray-200 to-gray-300 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                </div>
                {stepIdx !== steps.length - 1 && (
                  <div className="relative ml-4 h-0.5 w-32">
                    <div className="absolute inset-0 bg-gray-200"></div>
                  </div>
                )}
              </div>
            )}
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-medium text-gray-700 transition-all duration-300 hover:text-gray-900 hover:scale-106">
              {step.name}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default ProgressNav;