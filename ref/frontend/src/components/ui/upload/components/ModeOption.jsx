/**
 * Mode Option Component - Upload mode selection card
 */
import React from 'react';
import { CheckCircle, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../primitives/card';
import { Button } from '../../primitives/button';

const ModeOption = ({
  icon: IconComponent,
  title,
  description,
  features = [],
  confidence,
  recommended = false,
  onClick,
  disabled = false,
  className = ''
}) => {
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
        recommended 
          ? 'border-prelude-800 bg-prelude-50' 
          : 'border-gray-200 hover:border-prelude-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <CardContent className="p-6">
        <motion.div
          whileHover={!disabled ? { scale: 1.02 } : {}}
          whileTap={!disabled ? { scale: 0.98 } : {}}
          onClick={!disabled ? onClick : undefined}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                recommended ? 'bg-prelude-800' : 'bg-gray-100'
              }`}>
                <IconComponent className={`w-6 h-6 ${
                  recommended ? 'text-white' : 'text-gray-600'
                }`} />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
            </div>

            {/* Recommended Badge */}
            {recommended && (
              <div className="flex items-center gap-1 px-2 py-1 bg-prelude-800 text-white rounded-full text-xs font-medium">
                <Star className="w-3 h-3" />
                <span>Recommended</span>
              </div>
            )}
          </div>

          {/* Confidence Score */}
          {confidence !== undefined && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Mapping Confidence</span>
                <span className={`font-medium ${
                  (typeof confidence === 'object' ? confidence.confidence : confidence) >= 90 ? 'text-green-600' :
                  (typeof confidence === 'object' ? confidence.confidence : confidence) >= 70 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {typeof confidence === 'object' ? (confidence.confidence_display || confidence.confidence + '%') : confidence + '%'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    (typeof confidence === 'object' ? confidence.confidence : confidence) >= 90 ? 'bg-green-500' :
                    (typeof confidence === 'object' ? confidence.confidence : confidence) >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${typeof confidence === 'object' ? confidence.confidence : confidence}%` }}
                />
              </div>
            </div>
          )}

          {/* Features List */}
          {features.length > 0 && (
            <div className="mb-4">
              <ul className="space-y-2">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Button */}
          <Button
            className={`w-full ${
              recommended 
                ? 'bg-prelude-800 hover:bg-prelude-900 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            }`}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled && onClick) onClick();
            }}
          >
            {recommended ? 'Choose Recommended' : 'Select This Mode'}
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default ModeOption;