import React from 'react';
import { motion } from 'framer-motion';
import { Clock, ExternalLink } from 'lucide-react';
import { Button } from '../ui/primitives/button';
import { renderClickableContent, formatEventDate, formatEventTime } from './calendar-helpers.jsx';

const EventDetailModal = ({ event, onClose }) => {
  if (!event) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-display font-semibold text-prelude-900">
            {event.summary || 'Untitled Event'}
          </h3>
          <div className="flex items-center space-x-2 mt-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{formatEventDate(event)} • {formatEventTime(event)}</span>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {event.location && (
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Location</h4>
              <div className="text-sm text-gray-600">
                {renderClickableContent(event.location)}
              </div>
            </div>
          )}
          
          {event.description && (
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Description</h4>
              <div className="text-sm text-gray-600 whitespace-pre-wrap">
                {renderClickableContent(event.description)}
              </div>
            </div>
          )}
          
          {event.htmlLink && (
            <div>
              <a
                href={event.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
              >
                View in Google Calendar
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            Close
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EventDetailModal;