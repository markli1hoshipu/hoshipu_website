import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Book, 
  Play, 
  Navigation, 
  Target, 
  BarChart3, 
  Heart, 
  Users, 
  Calendar, 
  BarChart2, 
  MessageCircle,
  HelpCircle,
  Lightbulb,
  Keyboard
} from 'lucide-react';
import { Button } from '../ui/primitives/button';
import tutorialData from '../../data/tutorialData';

const iconMap = {
  Play,
  Navigation,
  Target,
  BarChart3,
  Heart,
  Users,
  Calendar,
  BarChart2,
  MessageCircle
};

const TutorialModal = ({ isOpen, onClose }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState('tutorial');

  const section = tutorialData.sections[currentSection];
  const step = section?.steps[currentStep];
  const totalSteps = section?.steps.length || 0;

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else if (currentSection < tutorialData.sections.length - 1) {
      setCurrentSection(currentSection + 1);
      setCurrentStep(0);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      const prevSection = tutorialData.sections[currentSection - 1];
      setCurrentStep(prevSection.steps.length - 1);
    }
  };

  const isFirstStep = currentSection === 0 && currentStep === 0;
  const isLastStep = currentSection === tutorialData.sections.length - 1 && currentStep === totalSteps - 1;

  const progress = ((currentSection * 100) + ((currentStep + 1) / totalSteps * 100)) / tutorialData.sections.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Book className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">{tutorialData.title}</h1>
                <p className="text-blue-100 mt-1">{tutorialData.description}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-blue-100 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-blue-800/30 rounded-full h-2">
              <motion.div
                className="bg-white rounded-full h-2"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('tutorial')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'tutorial'
                  ? 'border-blue-500 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Book className="inline h-4 w-4 mr-2" />
              Tutorial
            </button>
            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'shortcuts'
                  ? 'border-blue-500 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Keyboard className="inline h-4 w-4 mr-2" />
              Shortcuts
            </button>
            <button
              onClick={() => setActiveTab('troubleshooting')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'troubleshooting'
                  ? 'border-blue-500 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <HelpCircle className="inline h-4 w-4 mr-2" />
              Troubleshooting
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {activeTab === 'tutorial' && (
            <>
              {/* Sidebar - Section Navigation */}
              <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Sections
                  </h3>
                  <div className="space-y-2">
                    {tutorialData.sections.map((sectionItem, index) => {
                      const IconComponent = iconMap[sectionItem.icon];
                      const isActive = index === currentSection;
                      const isCompleted = index < currentSection;
                      
                      return (
                        <button
                          key={sectionItem.id}
                          onClick={() => {
                            setCurrentSection(index);
                            setCurrentStep(0);
                          }}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            isActive
                              ? 'bg-blue-100 border-2 border-blue-300 text-blue-700'
                              : isCompleted
                              ? 'bg-green-50 border-2 border-green-200 text-green-700'
                              : 'bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <IconComponent className="h-5 w-5" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{sectionItem.title}</div>
                              <div className="text-xs mt-1 opacity-75">
                                {sectionItem.description}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${currentSection}-${currentStep}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="p-8"
                  >
                    {section && step && (
                      <>
                        {/* Section Header */}
                        <div className="mb-6">
                          <div className="flex items-center gap-3 mb-2">
                            {React.createElement(iconMap[section.icon], { className: "h-6 w-6 text-blue-600" })}
                            <span className="text-sm text-blue-600 font-medium">{section.title}</span>
                          </div>
                          <h2 className="text-3xl font-bold text-gray-900 mb-2">{step.title}</h2>
                          <div className="text-sm text-gray-500">
                            Step {currentStep + 1} of {totalSteps}
                          </div>
                        </div>

                        {/* Step Content */}
                        <div className="space-y-6">
                          <div className="text-lg text-gray-700 leading-relaxed">
                            {step.content}
                          </div>

                          {step.image && (
                            <div className="bg-gray-100 rounded-lg p-4 text-center">
                              <div className="text-gray-500">
                                [Tutorial Image: {step.image}]
                              </div>
                            </div>
                          )}

                          {step.tips && step.tips.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Lightbulb className="h-5 w-5 text-yellow-600" />
                                <h4 className="font-semibold text-yellow-800">Tips</h4>
                              </div>
                              <ul className="space-y-2">
                                {step.tips.map((tip, index) => (
                                  <li key={index} className="text-yellow-700 text-sm flex items-start gap-2">
                                    <span className="text-yellow-500 mt-1">•</span>
                                    <span>{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          )}

          {activeTab === 'shortcuts' && (
            <div className="flex-1 overflow-y-auto p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Keyboard Shortcuts</h2>
              <div className="grid gap-4">
                {tutorialData.shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          {keyIndex > 0 && <span className="text-gray-400 mx-1">+</span>}
                          <kbd className="px-2 py-1 bg-gray-200 border border-gray-300 rounded text-sm font-mono">
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'troubleshooting' && (
            <div className="flex-1 overflow-y-auto p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Troubleshooting</h2>
              <div className="space-y-6">
                {tutorialData.troubleshooting.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-red-500" />
                      {item.problem}
                    </h3>
                    <p className="text-gray-700 pl-7">{item.solution}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Navigation */}
        {activeTab === 'tutorial' && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={isFirstStep}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="text-sm text-gray-500">
                Section {currentSection + 1} of {tutorialData.sections.length}
              </div>

              <Button
                onClick={nextStep}
                disabled={isLastStep}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TutorialModal;