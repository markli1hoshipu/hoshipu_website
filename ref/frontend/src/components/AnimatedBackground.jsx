import React from 'react';

const AnimatedBackground = ({ children, className = "", gradientFrom = "gray-50", gradientVia = "white", gradientTo = "gray-50" }) => {
  return (
    <div className={`relative min-h-screen overflow-hidden bg-gradient-to-br from-${gradientFrom} via-${gradientVia} to-${gradientTo} ${className}`}>
      {/* Simplified background pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default AnimatedBackground; 