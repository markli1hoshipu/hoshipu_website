import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Star,
  Plus,
  RefreshCw,
  Calendar,
  Mail,
  Phone,
  Users
} from 'lucide-react';
import { Button } from '../../ui/primitives/button';
import { Input } from '../../ui/primitives/input';
import { Textarea } from '../../ui/primitives/textarea';
import { Label } from '../../ui/primitives/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/primitives/dialog';

/**
 * AddNoteModal - Enhanced with shadcn Dialog primitive
 *
 * Now uses shadcn's Dialog for better accessibility and consistency.
 * Supports both old (isOpen/onClose) and new (open/onOpenChange) prop names for backward compatibility.
 *
 * @param {boolean} open - Whether the modal is visible (new prop name)
 * @param {boolean} isOpen - Legacy prop name (backward compatibility)
 * @param {function} onOpenChange - Callback when modal state changes (new prop name)
 * @param {function} onClose - Legacy callback (backward compatibility)
 * @param {function} onAddNote - Callback when note is added
 * @param {object} interaction - Interaction object to add note to
 * @param {boolean} isAdding - Whether note is being added
 */
const AddNoteModal = ({
  open,
  isOpen, // Legacy prop
  onOpenChange,
  onClose, // Legacy prop
  onAddNote,
  interaction,
  isAdding
}) => {
  const MAX_TITLE_LENGTH = 200;
  const MAX_NOTE_LENGTH = 2000;

  // Support both new (open) and legacy (isOpen) prop names
  const modalOpen = open !== undefined ? open : isOpen;

  // Support both new (onOpenChange) and legacy (onClose) callbacks
  const handleOpenChange = (newOpen) => {
    if (!newOpen && !isAdding) {
      if (onOpenChange) {
        onOpenChange(newOpen);
      } else if (onClose) {
        onClose();
      }
    }
  };

  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteStar, setNoteStar] = useState(false);

  // Pre-populate title when interaction changes
  useEffect(() => {
    if (interaction?.theme || interaction?.title) {
      setNoteTitle(interaction.theme || interaction.title || '');
    } else {
      setNoteTitle('');
    }
  }, [interaction]);

  // Reset form when modal closes
  useEffect(() => {
    if (!modalOpen) {
      setNoteTitle('');
      setNoteBody('');
      setNoteStar(false);
    }
  }, [modalOpen]);

  // Get type-specific icon and styling
  const getTypeConfig = (type) => {
    switch (type?.toLowerCase()) {
      case 'email':
        return {
          icon: Mail,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-600',
          borderColor: 'border-blue-200'
        };
      case 'call':
        return {
          icon: Phone,
          bgColor: 'bg-green-100',
          textColor: 'text-green-600',
          borderColor: 'border-green-200'
        };
      case 'meeting':
        return {
          icon: Users,
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-600',
          borderColor: 'border-purple-200'
        };
      default:
        return {
          icon: Calendar,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200'
        };
    }
  };

  const typeConfig = getTypeConfig(interaction?.type);
  const TypeIcon = typeConfig.icon;

  const handleSubmit = () => {
    if (!noteBody.trim()) return;

    onAddNote({
      title: noteTitle.trim(),
      body: noteBody.trim(),
      star: noteStar
    });
  };

  if (!interaction) return null;

  return (
    <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onClose={() => handleOpenChange(false)}
      >
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full ${typeConfig.bgColor} flex items-center justify-center`}>
              <TypeIcon className={`w-6 h-6 ${typeConfig.textColor}`} />
            </div>
            <div>
              <DialogTitle className="text-xl">Add Note to Interaction</DialogTitle>
              <p className="text-sm text-gray-500 capitalize">{interaction.type} Interaction</p>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-6">
          {/* Interaction Preview */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{interaction.title}</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{interaction.description}</p>
              </div>
            </div>
          </div>

          {/* Note Title */}
          <div className="space-y-2">
            <Label htmlFor="note-title">
              Note Title
            </Label>
            <div className="relative">
              <Input
                id="note-title"
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note title (optional)..."
                className="pr-20"
                maxLength={MAX_TITLE_LENGTH}
                disabled={isAdding}
              />
              <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                {noteTitle.length}/{MAX_TITLE_LENGTH}
              </div>
            </div>
          </div>

          {/* Note Body */}
          <div className="space-y-2">
            <Label htmlFor="note-body">
              Note Content <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Textarea
                id="note-body"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Add your note about this interaction..."
                className="h-32 pr-20 resize-none"
                maxLength={MAX_NOTE_LENGTH}
                disabled={isAdding}
              />
              <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                {noteBody.length}/{MAX_NOTE_LENGTH}
              </div>
            </div>
          </div>

          {/* Star Toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={noteStar}
                onChange={(e) => setNoteStar(e.target.checked)}
                disabled={isAdding}
                className="sr-only"
              />
              <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors ${
                noteStar
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
              }`}>
                <Star className={`w-4 h-4 ${noteStar ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                {noteStar ? 'Important' : 'Mark as Important'}
              </div>
            </label>
          </div>
        </div>

        <DialogFooter className="bg-gray-50 border-t border-gray-200 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
            onClick={handleSubmit}
            disabled={!noteBody.trim() || isAdding}
          >
            {isAdding ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Adding Note...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Note
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddNoteModal;
