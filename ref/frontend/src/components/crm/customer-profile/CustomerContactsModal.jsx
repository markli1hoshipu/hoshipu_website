import React, { useState, useEffect } from 'react';
import { X, Users, Plus, Mail, Phone, User, FileText, Edit3, Trash2, Check, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../../ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/primitives/dialog';

/**
 * CustomerContactsModal - Enhanced with shadcn Dialog primitive
 *
 * Now uses shadcn's Dialog for better accessibility and consistency.
 * Supports both old (isOpen/onClose) and new (open/onOpenChange) prop names for backward compatibility.
 *
 * @param {boolean} open - Whether the modal is visible (new prop name)
 * @param {boolean} isOpen - Legacy prop name (backward compatibility)
 * @param {function} onOpenChange - Callback when modal state changes (new prop name)
 * @param {function} onClose - Legacy callback (backward compatibility)
 * @param {object} customer - Customer object
 * @param {array} contacts - Array of contacts
 * @param {function} onContactsUpdate - Callback when contacts are updated
 * @param {function} authFetch - Authentication fetch function
 */
const CustomerContactsModal = ({
  open,
  isOpen, // Legacy prop
  onOpenChange,
  onClose, // Legacy prop
  customer,
  contacts,
  onContactsUpdate,
  authFetch
}) => {
  // Support both new (open) and legacy (isOpen) prop names
  const modalOpen = open !== undefined ? open : isOpen;

  // Support both new (onOpenChange) and legacy (onClose) callbacks
  const handleOpenChange = (newOpen) => {
    if (!newOpen && !isSavingContact) {
      if (onOpenChange) {
        onOpenChange(newOpen);
      } else if (onClose) {
        onClose();
      }
    }
  };

  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

  const [localContacts, setLocalContacts] = useState([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactFormData, setContactFormData] = useState({
    name: '',
    email: '',
    phone: '',
    title: '',
    notes: ''
  });
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');

  // Sync local contacts with prop
  useEffect(() => {
    if (contacts) {
      setLocalContacts(contacts);
    }
  }, [contacts]);

  // Reset form when modal closes
  useEffect(() => {
    if (!modalOpen) {
      setShowContactForm(false);
      setEditingContact(null);
      setContactFormData({ name: '', email: '', phone: '', title: '', notes: '' });
      setContactError('');
      setContactSuccess('');
    }
  }, [modalOpen]);

  // Open contact form for adding
  const handleAddContactClick = () => {
    setEditingContact(null);
    setContactFormData({ name: '', email: '', phone: '', title: '', notes: '' });
    setShowContactForm(true);
    setContactError('');
  };

  // Open contact form for editing
  const handleEditContactClick = (contact) => {
    setEditingContact(contact);
    setContactFormData({
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      title: contact.title || '',
      notes: contact.notes || ''
    });
    setShowContactForm(true);
    setContactError('');
  };

  // Cancel contact form
  const handleCancelContactForm = () => {
    setShowContactForm(false);
    setEditingContact(null);
    setContactFormData({ name: '', email: '', phone: '', title: '', notes: '' });
    setContactError('');
  };

  // Save contact (add or update)
  const handleSaveContact = async () => {
    try {
      setIsSavingContact(true);
      setContactError('');

      // Validate
      if (!contactFormData.name.trim()) {
        setContactError('Contact name is required');
        return;
      }
      if (!contactFormData.email.trim()) {
        setContactError('Contact email is required');
        return;
      }

      const payload = {
        name: contactFormData.name.trim(),
        email: contactFormData.email.trim(),
        phone: contactFormData.phone.trim(),
        title: contactFormData.title.trim(),
        notes: contactFormData.notes.trim(),
        is_primary: false
      };

      let response;
      if (editingContact) {
        // Update existing contact
        response = await authFetch(
          `${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/contacts/${editingContact.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );
      } else {
        // Add new contact
        response = await authFetch(
          `${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/contacts`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save contact');
      }

      const result = await response.json();
      console.log('📇 Contact save result:', result);
      console.log('📇 Contact object:', result.contact);

      // Update local contacts state
      let updatedContacts;
      if (editingContact) {
        updatedContacts = localContacts.map(c => c.id === editingContact.id ? result.contact : c);
        setLocalContacts(updatedContacts);
        setContactSuccess('Contact updated successfully!');
      } else {
        updatedContacts = [...localContacts, result.contact];
        setLocalContacts(updatedContacts);
        setContactSuccess('Contact added successfully!');
      }

      // Notify parent with updated contacts (parent should update context without full refresh)
      if (onContactsUpdate) {
        onContactsUpdate(updatedContacts);
      }

      // Close form
      handleCancelContactForm();

      // Clear success message after 3 seconds
      setTimeout(() => setContactSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving contact:', error);
      setContactError(error.message || 'Failed to save contact');
    } finally {
      setIsSavingContact(false);
    }
  };

  // Delete contact
  const handleDeleteContact = async (contact) => {
    console.log('🗑️ Attempting to delete contact:', contact);
    console.log('🗑️ Contact ID:', contact.id);

    if (!confirm(`Are you sure you want to delete contact "${contact.name}"?`)) {
      return;
    }

    try {
      setContactError('');

      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/contacts/${contact.id}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete contact');
      }

      // Update local contacts state
      const updatedContacts = localContacts.filter(c => c.id !== contact.id);
      setLocalContacts(updatedContacts);
      setContactSuccess('Contact deleted successfully!');

      // Notify parent with updated contacts (parent should update context without full refresh)
      if (onContactsUpdate) {
        onContactsUpdate(updatedContacts);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setContactSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting contact:', error);
      setContactError(error.message || 'Failed to delete contact');
    }
  };

  // Set contact as primary
  const handleSetPrimaryContact = async (contact) => {
    try {
      setContactError('');

      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/contacts/${contact.id}/set-primary`,
        {
          method: 'PUT'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to set primary contact');
      }

      // Update local contacts state
      const updatedContacts = localContacts.map(c => ({
        ...c,
        is_primary: c.id === contact.id
      }));
      setLocalContacts(updatedContacts);
      setContactSuccess(`${contact.name} set as primary contact!`);

      // Notify parent with updated contacts (parent should update context without full refresh)
      if (onContactsUpdate) {
        onContactsUpdate(updatedContacts);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setContactSuccess(''), 3000);
    } catch (error) {
      console.error('Error setting primary contact:', error);
      setContactError(error.message || 'Failed to set primary contact');
    }
  };

  return (
    <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[80vh] flex flex-col"
        onClose={() => handleOpenChange(false)}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle>Contacts</DialogTitle>
              <p className="text-sm text-gray-500">{customer.company}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Success/Error Messages */}
          {contactSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">{contactSuccess}</span>
            </div>
          )}

          {contactError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">{contactError}</span>
            </div>
          )}

            {/* Add Contact Button */}
            {!showContactForm && (
              <Button
                onClick={handleAddContactClick}
                className="mb-4 bg-pink-600 hover:bg-pink-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            )}

          {/* Contact Form */}
          {showContactForm && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold mb-4">
                  {editingContact ? 'Edit Contact' : 'Add New Contact'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={contactFormData.name}
                      onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Enter contact name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={contactFormData.email}
                      onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={contactFormData.phone}
                      onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={contactFormData.title}
                      onChange={(e) => setContactFormData({ ...contactFormData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Enter job title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={contactFormData.notes}
                      onChange={(e) => setContactFormData({ ...contactFormData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Additional notes"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={handleCancelContactForm} disabled={isSavingContact}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveContact}
                      disabled={isSavingContact}
                      className="bg-pink-600 hover:bg-pink-700 text-white"
                    >
                      {isSavingContact ? 'Saving...' : editingContact ? 'Update Contact' : 'Add Contact'}
                    </Button>
                  </div>
              </div>
            </div>
          )}

          {/* Contacts List */}
          <div className="space-y-3">
            {localContacts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No contacts added yet</p>
              </div>
            ) : (
              localContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-pink-300 transition-colors"
                >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                          {contact.is_primary && (
                            <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-xs font-medium rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          {contact.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>{contact.email}</span>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                          {contact.title && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>{contact.title}</span>
                            </div>
                          )}
                          {contact.notes && (
                            <div className="flex items-start gap-2 mt-2">
                              <FileText className="w-4 h-4 mt-0.5" />
                              <span className="text-gray-500">{contact.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {!contact.is_primary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetPrimaryContact(contact)}
                            title="Set as primary"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditContactClick(contact)}
                          title="Edit contact"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContact(contact)}
                          title="Delete contact"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerContactsModal;

