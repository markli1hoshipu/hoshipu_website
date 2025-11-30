import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion as _motion } from 'framer-motion';

const ResizablePanel = ({ 
  leftPanel, 
  rightPanel, 
  defaultLeftWidth = 60, // percentage
  minLeftWidth = 30,
  maxLeftWidth = 80,
  className = ""
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Clamp the width between min and max
    const clampedWidth = Math.min(Math.max(newLeftWidth, minLeftWidth), maxLeftWidth);
    setLeftWidth(clampedWidth);
  }, [isDragging, minLeftWidth, maxLeftWidth]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove]);

  return (
    <div ref={containerRef} className={`flex h-full ${className}`}>
      {/* Left Panel */}
      <div 
        style={{ width: `${leftWidth}%` }}
        className="overflow-hidden"
      >
        {leftPanel}
      </div>

      {/* Resizer */}
      <_motion.div
        className={`
          relative w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize flex-shrink-0
          transition-colors duration-200 group
          ${isDragging ? 'bg-blue-500' : ''}
        `}
        onMouseDown={handleMouseDown}
        whileHover={{ width: 4 }}
        transition={{ duration: 0.2 }}
      >
        {/* Visual indicator */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 bg-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        
        {/* Drag handle dots */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex flex-col space-y-1">
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
          </div>
        </div>
      </_motion.div>

      {/* Right Panel */}
      <div 
        style={{ width: `${100 - leftWidth}%` }}
        className="overflow-hidden"
      >
        {rightPanel}
      </div>
    </div>
  );
};

export default ResizablePanel; 