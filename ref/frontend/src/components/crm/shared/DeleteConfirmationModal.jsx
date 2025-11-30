import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '../../ui/primitives/alert-dialog';

/**
 * DeleteConfirmationModal - Enhanced with shadcn AlertDialog primitive
 *
 * Now uses shadcn's AlertDialog for better accessibility and consistency.
 * Supports both old (isOpen/onClose) and new (open/onOpenChange) prop names for backward compatibility.
 *
 * @param {boolean} open - Whether the modal is visible (new prop name)
 * @param {boolean} isOpen - Legacy prop name (backward compatibility)
 * @param {function} onOpenChange - Callback when modal state changes (new prop name)
 * @param {function} onClose - Legacy callback (backward compatibility)
 * @param {function} onCancel - Alternative legacy callback
 * @param {function} onConfirm - Callback when deletion is confirmed
 * @param {string} title - Modal title
 * @param {string} itemName - Name of the item being deleted
 * @param {object} customer - Customer object (alternative to itemName)
 * @param {string} itemType - Type of item (e.g., "customer", "deal", "note")
 * @param {string} warningMessage - Custom warning message
 * @param {array} relatedItems - Array of related items that will be affected
 * @param {boolean} isDeleting - Whether deletion is in progress
 * @param {string} deleteButtonText - Custom text for delete button
 */
const DeleteConfirmationModal = ({
  open,
  isOpen, // Legacy prop
  onOpenChange,
  onClose, // Legacy prop
  onCancel, // Legacy prop
  onConfirm,
  title = 'Confirm Deletion',
  itemName,
  customer,
  itemType = 'item',
  warningMessage,
  relatedItems = [],
  isDeleting = false,
  deleteButtonText = 'Delete'
}) => {
  // Support both new (open) and legacy (isOpen) prop names
  const modalOpen = open !== undefined ? open : isOpen;

  // Support both new (onOpenChange) and legacy (onClose/onCancel) callbacks
  const handleOpenChange = (newOpen) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else if (onClose) {
      onClose();
    } else if (onCancel) {
      onCancel();
    }
  };

  // Extract itemName from customer object if provided
  const displayItemName = itemName || (customer?.company);

  return (
    <AlertDialog open={modalOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl">
              {title}
            </AlertDialogTitle>
          </div>

          <AlertDialogDescription className="space-y-4 pt-2">
            {/* Main Confirmation Message */}
            <div className="space-y-3">
              {displayItemName ? (
                <div>
                  <p className="text-base text-gray-700 leading-relaxed">
                    Are you sure you want to delete{' '}
                    <span className="font-semibold text-gray-900 px-1.5 py-0.5 bg-red-50 rounded">
                      {displayItemName}
                    </span>
                    ?
                  </p>
                </div>
              ) : (
                <p className="text-base text-gray-700 leading-relaxed">
                  Are you sure you want to delete this {itemType}?
                </p>
              )}

              {/* Warning Message */}
              {warningMessage ? (
                <p className="text-sm text-gray-600 leading-relaxed">{warningMessage}</p>
              ) : (
                <p className="text-sm text-gray-600 leading-relaxed">
                  This action cannot be undone. All associated data will be permanently deleted.
                </p>
              )}
            </div>

            {/* Related Items Warning */}
            {relatedItems && relatedItems.length > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-amber-800 mb-2">
                      The following related items will also be affected:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-amber-700">
                      {relatedItems.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 min-w-[100px]"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              deleteButtonText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmationModal;
