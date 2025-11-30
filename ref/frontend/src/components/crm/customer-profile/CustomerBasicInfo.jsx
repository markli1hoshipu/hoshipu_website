import React, { useState } from 'react';
import { Building, Mail, Phone, MapPin, User, Users, RefreshCw } from 'lucide-react';
import EditableField from '../shared/EditableField';
import StatusBadge from '../shared/StatusBadge';

/**
 * Customer Basic Information Section
 * Displays and allows editing of customer basic details
 */
const CustomerBasicInfo = ({
  customer,
  employees = [],
  onFieldUpdate,
  noteSuccess,
  noteError
}) => {
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

  // Editable fields state
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [isSavingField, setIsSavingField] = useState(false);

  // Helper function to get assigned employee name
  const getAssignedEmployeeName = () => {
    if (customer?.assignedEmployeeName) {
      return customer.assignedEmployeeName;
    }
    return 'Not Assigned';
  };

  // Handle field editing
  const handleFieldClick = (fieldName, currentValue) => {
    console.log(`[Edit] Starting to edit field: ${fieldName}, current value:`, currentValue);
    setEditingField(fieldName);
    setEditingValue(currentValue || '');
  };

  const handleFieldCancel = () => {
    console.log(`[Edit] Cancelled editing field: ${editingField}`);
    setEditingField(null);
    setEditingValue('');
  };

  const handleFieldSave = async (fieldName) => {
    if (!customer?.id) {
      console.error('[Edit] No customer ID found, cannot save');
      return;
    }

    console.log(`[Edit] Saving field: ${fieldName}`);
    setIsSavingField(true);

    try {
      // Map frontend field names to backend field names
      const fieldMapping = {
        'company': 'company',
        'industry': 'industry',
        'location': 'location',
        'email': 'email',
        'phone': 'phone',
        'primaryContact': 'primaryContact',
        'assignedEmployee': 'assignedEmployeeId'
      };

      const backendField = fieldMapping[fieldName];
      if (!backendField) {
        console.error('[Edit] Unknown field:', fieldName);
        return;
      }

      // Process the value based on field type
      let processedValue = editingValue;
      if (fieldName === 'assignedEmployee') {
        processedValue = parseInt(editingValue) || null;
      }

      const payload = { [backendField]: processedValue };

      // Call parent update handler
      await onFieldUpdate(customer.id, payload, fieldName, editingValue);

      // Clear editing state
      setEditingField(null);
      setEditingValue('');
    } catch (error) {
      console.error('[Edit] Error updating field:', error);
    } finally {
      setIsSavingField(false);
    }
  };

  // Get employee options for dropdown
  const getEmployeeOptions = () => {
    const options = [{ value: '', label: 'Not Assigned' }];
    if (employees && employees.length > 0) {
      employees.forEach(emp => {
        options.push({
          value: emp.employee_id?.toString() || emp.id?.toString(),
          label: emp.name || `Employee ${emp.employee_id || emp.id}`
        });
      });
    }
    return options;
  };

  return (
    <div className="space-y-6">
      {/* Status and Churn Risk */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-500 mb-1 block">Status</label>
          <StatusBadge status={customer.status} type="customer" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500 mb-1 block">Churn Risk</label>
          <StatusBadge status={customer.churnRisk} type="churn" />
        </div>
      </div>

      {/* Company */}
      <div>
        <label className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
          <Building className="w-4 h-4" />
          Company
        </label>
        <EditableField
          fieldName="company"
          displayValue={customer.company}
          placeholder="Enter company name"
          isEditing={editingField === 'company'}
          editingValue={editingValue}
          isSaving={isSavingField}
          onStartEdit={handleFieldClick}
          onValueChange={setEditingValue}
          onSave={() => handleFieldSave('company')}
          onCancel={handleFieldCancel}
        />
      </div>

      {/* Industry */}
      <div>
        <label className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
          <Building className="w-4 h-4" />
          Industry
        </label>
        <EditableField
          fieldName="industry"
          displayValue={customer.industry}
          placeholder="Enter industry"
          isEditing={editingField === 'industry'}
          editingValue={editingValue}
          isSaving={isSavingField}
          onStartEdit={handleFieldClick}
          onValueChange={setEditingValue}
          onSave={() => handleFieldSave('industry')}
          onCancel={handleFieldCancel}
        />
      </div>

      {/* Location */}
      <div>
        <label className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Location
        </label>
        <EditableField
          fieldName="location"
          displayValue={customer.location}
          placeholder="Enter location"
          isEditing={editingField === 'location'}
          editingValue={editingValue}
          isSaving={isSavingField}
          onStartEdit={handleFieldClick}
          onValueChange={setEditingValue}
          onSave={() => handleFieldSave('location')}
          onCancel={handleFieldCancel}
        />
      </div>

      {/* Email */}
      <div>
        <label className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Email
        </label>
        <EditableField
          fieldName="email"
          displayValue={customer.email}
          placeholder="Enter email"
          isEditing={editingField === 'email'}
          editingValue={editingValue}
          isSaving={isSavingField}
          onStartEdit={handleFieldClick}
          onValueChange={setEditingValue}
          onSave={() => handleFieldSave('email')}
          onCancel={handleFieldCancel}
        />
      </div>

      {/* Phone */}
      <div>
        <label className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Phone
        </label>
        <EditableField
          fieldName="phone"
          displayValue={customer.phone}
          placeholder="Enter phone number"
          isEditing={editingField === 'phone'}
          editingValue={editingValue}
          isSaving={isSavingField}
          onStartEdit={handleFieldClick}
          onValueChange={setEditingValue}
          onSave={() => handleFieldSave('phone')}
          onCancel={handleFieldCancel}
        />
      </div>

      {/* Primary Contact */}
      <div>
        <label className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
          <User className="w-4 h-4" />
          Primary Contact
        </label>
        <EditableField
          fieldName="primaryContact"
          displayValue={customer.primaryContact}
          placeholder="Enter primary contact name"
          isEditing={editingField === 'primaryContact'}
          editingValue={editingValue}
          isSaving={isSavingField}
          onStartEdit={handleFieldClick}
          onValueChange={setEditingValue}
          onSave={() => handleFieldSave('primaryContact')}
          onCancel={handleFieldCancel}
        />
      </div>

      {/* Assigned Employee */}
      <div>
        <label className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Assigned Employee
        </label>
        <EditableField
          fieldName="assignedEmployee"
          displayValue={getAssignedEmployeeName()}
          actualValue={customer.assignedEmployeeId?.toString() || ''}
          placeholder="Not Assigned"
          isEditing={editingField === 'assignedEmployee'}
          editingValue={editingValue}
          isSaving={isSavingField}
          isSelect={true}
          options={getEmployeeOptions()}
          onStartEdit={handleFieldClick}
          onValueChange={setEditingValue}
          onSave={() => handleFieldSave('assignedEmployee')}
          onCancel={handleFieldCancel}
        />
      </div>

      {/* Interaction Count and Engagement Level */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
        <div>
          <label className="text-sm font-medium text-gray-500 mb-1 block">Total Interactions</label>
          <p className="text-lg font-semibold text-gray-900">{customer.interactionCount || 0}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500 mb-1 block">Engagement Level</label>
          <p className="text-lg font-semibold text-gray-900 capitalize">{customer.engagementLevel || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerBasicInfo;

