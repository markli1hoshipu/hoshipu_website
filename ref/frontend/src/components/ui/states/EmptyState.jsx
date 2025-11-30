import React from 'react';

export const EmptyState = ({ icon: Icon, iconColor, iconBgGradient, title, description, action }) => (
  <div className="text-center py-12">
    <div className={`mx-auto w-16 h-16 bg-gradient-to-br ${iconBgGradient} rounded-full flex items-center justify-center mb-4`}>
      <Icon className={`w-8 h-8 ${iconColor}`} />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
    <div className="flex items-center justify-center gap-3">{action}</div>
  </div>
);
