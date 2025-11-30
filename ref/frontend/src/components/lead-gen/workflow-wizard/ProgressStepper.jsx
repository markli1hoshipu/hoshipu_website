import React from 'react';
import { ArrowRight } from 'lucide-react';

const ProgressStepper = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center justify-between max-w-4xl mx-auto">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            {/* Step Circle */}
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                currentStep >= step.number
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              <span className="text-lg font-semibold">{step.number}</span>
            </div>

            {/* Step Title */}
            <p
              className={`mt-2 text-sm font-medium ${
                currentStep >= step.number
                  ? 'text-indigo-900'
                  : 'text-gray-500'
              }`}
            >
              {step.title}
            </p>
          </div>

          {/* Arrow between steps */}
          {index < steps.length - 1 && (
            <ArrowRight
              className={`mx-4 flex-shrink-0 transition-colors ${
                currentStep > step.number
                  ? 'text-indigo-600'
                  : 'text-gray-300'
              }`}
              size={24}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default ProgressStepper;
