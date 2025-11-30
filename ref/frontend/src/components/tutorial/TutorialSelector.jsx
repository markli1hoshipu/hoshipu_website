import React from 'react';
import { motion } from 'framer-motion';
import { X, PlayCircle, CheckCircle } from 'lucide-react';
import { tutorialModules } from './PlatformTutorial';

const TutorialSelector = ({ isOpen, onClose, onSelectTutorial }) => {
  if (!isOpen) return null;

  const modules = Object.values(tutorialModules);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-teal-500 to-cyan-500">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="pr-12">
            <h2 className="text-2xl font-bold text-white mb-2">
              Choose Your Tutorial
            </h2>
            <p className="text-white/90 text-sm">
              Select a tutorial to learn about specific features of the platform. Each tutorial is interactive and guides you step-by-step.
            </p>
          </div>
        </div>

        {/* Tutorial Options */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules.map((module) => (
              <motion.button
                key={module.id}
                onClick={() => {
                  onSelectTutorial(module.id);
                  onClose();
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative overflow-hidden bg-white border-2 border-gray-200 hover:border-teal-400 rounded-xl p-5 text-left transition-all hover:shadow-lg"
              >
                {/* Background Gradient on Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{module.icon}</span>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-teal-600 transition-colors">
                          {module.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {module.steps.length} steps
                        </p>
                      </div>
                    </div>
                    <PlayCircle className="h-6 w-6 text-gray-400 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed">
                    {module.description}
                  </p>

                  {/* Features Preview */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
                      <CheckCircle className="h-3 w-3" />
                      Interactive
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      <CheckCircle className="h-3 w-3" />
                      Spotlight Guide
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-900">
              <strong>Tip:</strong> Each tutorial uses an interactive spotlight to guide you through specific features. The screen will darken except for the area you need to focus on. Follow the instructions and click where indicated to progress.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              You can exit any tutorial at any time by clicking the X button.
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TutorialSelector;
