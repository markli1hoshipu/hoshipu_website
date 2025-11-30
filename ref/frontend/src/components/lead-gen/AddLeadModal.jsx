import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building, User, Mail, Phone, Globe, MapPin, Briefcase, Hash, Tag, FileText, AlertCircle } from 'lucide-react';
import { Button } from '../ui/primitives/button';
import toast from 'react-hot-toast';
import { useLeadContext } from '../../contexts/LeadContext';
import leadsApiService from '../../services/leadsApi';

const AddLeadModal = ({ isOpen, onClose }) => {
  // Form state
  const [formData, setFormData] = useState({
    // Required fields
    company: '',
    
    // Optional fields - matching backend schema exactly
    name: '',
    contact_name: '',
    position: '',
    location: '',
    industry: '',
    company_size: '',
    revenue: '',
    employees_count: '',
    email: '',
    phone: '',
    website: '',
    linkedin_url: '',
    status: 'new_lead', // Default status
    source: 'manual_entry',
    tags: [],
    notes: '',
    assigned_to: '',
  });

  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTag, setCurrentTag] = useState('');

  // Get context
  const { loadLeads } = useLeadContext();

  // Industry options
  const industryOptions = [
    'Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing',
    'Education', 'Real Estate', 'Hospitality', 'Transportation',
    'Energy', 'Agriculture', 'Media', 'Legal', 'Consulting', 'Other'
  ];

  // Company size options
  const companySizeOptions = [
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '500+', label: '500+ employees' }
  ];

  // Revenue options
  const revenueOptions = [
    { value: '<1M', label: 'Less than $1M' },
    { value: '1-10M', label: '$1M - $10M' },
    { value: '10-50M', label: '$10M - $50M' },
    { value: '50-100M', label: '$50M - $100M' },
    { value: '100M+', label: '$100M+' }
  ];

  // Status options
  const statusOptions = [
    { value: 'new', label: 'New Lead', color: 'bg-blue-100 text-blue-800' },
    { value: 'cold', label: 'Cold', color: 'bg-gray-100 text-gray-800' },
    { value: 'warm', label: 'Warm', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'hot', label: 'Hot Lead', color: 'bg-orange-100 text-orange-800' },
    { value: 'qualified', label: 'Qualified', color: 'bg-green-100 text-green-800' },
    { value: 'contacted', label: 'Contacted', color: 'bg-purple-100 text-purple-800' },
    { value: 'converted', label: 'Converted', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800' }
  ];

  // Source options
  const sourceOptions = [
    { value: 'manual_entry', label: 'Manual Entry' },
    { value: 'csv_upload', label: 'CSV Upload' },
    { value: 'web_scraping', label: 'Web Scraping' },
    { value: 'api_import', label: 'API Import' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'yellowpages', label: 'Yellow Pages' }
  ];

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset form after animation completes
      const timer = setTimeout(() => {
        setFormData({
          company: '',
          name: '',
          contact_name: '',
          position: '',
          location: '',
          industry: '',
          company_size: '',
          revenue: '',
          employees_count: '',
          email: '',
          phone: '',
          website: '',
          linkedin_url: '',
          status: 'new_lead',
          source: 'manual_entry',
          tags: [],
          notes: '',
          assigned_to: '',
        });
        setErrors({});
        setCurrentTag('');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle tag addition
  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  // Handle tag removal
  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Handle tag input key press
  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Required fields - ONLY company is required per backend schema
    if (!formData.company.trim()) {
      newErrors.company = 'Company name is required';
    } else if (formData.company.trim().length < 2) {
      newErrors.company = 'Company name must be at least 2 characters';
    }

    // Optional field validations
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Optional field validations
    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.website && !formData.website.match(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/)) {
      newErrors.website = 'Please enter a valid website URL';
    }

    if (formData.linkedin_url && !formData.linkedin_url.includes('linkedin.com')) {
      newErrors.linkedin_url = 'Please enter a valid LinkedIn URL';
    }

    if (formData.employees_count && formData.employees_count < 0) {
      newErrors.employees_count = 'Employee count must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare lead data matching backend schema exactly
      const leadData = {
        // Required field
        company: formData.company.trim(),
        
        // Optional fields - match backend schema
        name: formData.name.trim() || null,
        contact_name: formData.contact_name.trim() || formData.name.trim() || null,
        position: formData.position.trim() || null,
        location: formData.location.trim() || null, // Backend defaults to "Unknown"
        industry: formData.industry || null,
        company_size: formData.company_size || null,
        revenue: formData.revenue || null,
        employees_count: formData.employees_count ? parseInt(formData.employees_count) : null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        website: formData.website.trim() || null,
        linkedin_url: formData.linkedin_url.trim() || null,
        status: formData.status || 'new_lead',
        source: formData.source || 'manual_entry',
        tags: formData.tags,
        notes: formData.notes.trim() || null,
        assigned_to: formData.assigned_to.trim() || null,
      };

      // Create lead via API
      const newLead = await leadsApiService.createLead(leadData);

      // Refresh leads list
      await loadLeads(true);

      // Show success message
      toast.success(`Lead "${formData.company}" added successfully!`);

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error creating lead:', error);
      toast.error(error.message || 'Failed to create lead. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isSubmitting, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Building className="w-6 h-6 text-blue-600" />
                  Add New Lead
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
              {/* Required Fields Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Required Information
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {/* Company Name - Only required field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.company ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter company name"
                      />
                    </div>
                    {errors.company && (
                      <p className="mt-1 text-sm text-red-600">{errors.company}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contact Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  {/* Position */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position/Title
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        name="position"
                        value={formData.position}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="CEO, Manager, etc."
                      />
                    </div>
                  </div>

                  {/* Email - Now optional */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="contact@company.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                    )}
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.website ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="https://example.com"
                      />
                    </div>
                    {errors.website && (
                      <p className="mt-1 text-sm text-red-600">{errors.website}</p>
                    )}
                  </div>

                  {/* LinkedIn */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      LinkedIn URL
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        name="linkedin_url"
                        value={formData.linkedin_url}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.linkedin_url ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="https://linkedin.com/company/..."
                      />
                    </div>
                    {errors.linkedin_url && (
                      <p className="mt-1 text-sm text-red-600">{errors.linkedin_url}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Company Details Section */}
              <div className="mb-6 clear-both">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Building className="w-5 h-5 text-purple-600" />
                  Company Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-auto">
                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location/Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="City, State, Country"
                      />
                    </div>
                  </div>

                  {/* Industry */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Industry
                    </label>
                    <select
                      name="industry"
                      value={formData.industry}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Industry</option>
                      {industryOptions.map(industry => (
                        <option key={industry} value={industry}>{industry}</option>
                      ))}
                    </select>
                  </div>

                  {/* Company Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Size
                    </label>
                    <select
                      name="company_size"
                      value={formData.company_size}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Size</option>
                      {companySizeOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Revenue */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Revenue Range
                    </label>
                    <select
                      name="revenue"
                      value={formData.revenue}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Revenue</option>
                      {revenueOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Employee Count */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employee Count
                    </label>
                    <input
                      type="number"
                      name="employees_count"
                      value={formData.employees_count}
                      onChange={handleInputChange}
                      min="0"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.employees_count ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Number of employees"
                    />
                    {errors.employees_count && (
                      <p className="mt-1 text-sm text-red-600">{errors.employees_count}</p>
                    )}
                  </div>

                  {/* Assigned To */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned To
                    </label>
                    <input
                      type="text"
                      name="assigned_to"
                      value={formData.assigned_to}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Assign to team member"
                    />
                  </div>
                </div>
              </div>

              {/* Lead Management Section */}
              <div className="mb-6 clear-both">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-green-600" />
                  Lead Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-auto">
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lead Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Source */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lead Source
                    </label>
                    <select
                      name="source"
                      value={formData.source}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {sourceOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Tags */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={handleTagKeyPress}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add tags (press Enter)"
                    />
                    <Button
                      type="button"
                      onClick={handleAddTag}
                      variant="outline"
                      size="sm"
                    >
                      <Tag className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 hover:text-blue-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes about this lead..."
                  />
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Add Lead'
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddLeadModal;