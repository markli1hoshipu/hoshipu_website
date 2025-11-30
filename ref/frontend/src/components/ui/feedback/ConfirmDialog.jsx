import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Save, X } from 'lucide-react';
import { Button } from '../primitives/button';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning", // warning, danger, info
  details = null,
  isLoading = false
}) => {
  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconColor: 'text-red-600',
          icon: <Trash2 className="w-6 h-6" />,
          confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white',
          headerColor: 'bg-red-50 border-red-200'
        };
      case 'info':
        return {
          iconColor: 'text-blue-600',
          icon: <Save className="w-6 h-6" />,
          confirmButtonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
          headerColor: 'bg-blue-50 border-blue-200'
        };
      default:
        return {
          iconColor: 'text-amber-600',
          icon: <AlertTriangle className="w-6 h-6" />,
          confirmButtonClass: 'bg-amber-600 hover:bg-amber-700 text-white',
          headerColor: 'bg-amber-50 border-amber-200'
        };
    }
  };

  const typeStyles = getTypeStyles();

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b ${typeStyles.headerColor}`}>
            <div className="flex items-center gap-3">
              <div className={typeStyles.iconColor}>
                {typeStyles.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <p className="text-gray-700 mb-4 leading-relaxed">
              {message}
            </p>
            
            {details && (
              <div className="bg-gray-50 rounded-md p-3 mb-4 border">
                <p className="text-sm text-gray-600">
                  {details}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              className={typeStyles.confirmButtonClass}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </div>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default ConfirmDialog; 