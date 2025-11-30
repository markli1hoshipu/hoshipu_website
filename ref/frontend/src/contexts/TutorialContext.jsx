import React, { createContext, useContext, useState } from 'react';

const TutorialContext = createContext();

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

export const TutorialProvider = ({ children }) => {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const openTutorial = () => {
    setIsTutorialOpen(true);
  };

  const closeTutorial = () => {
    setIsTutorialOpen(false);
  };

  const toggleTutorial = () => {
    setIsTutorialOpen(!isTutorialOpen);
  };

  const value = {
    isTutorialOpen,
    openTutorial,
    closeTutorial,
    toggleTutorial
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};

export default TutorialContext;