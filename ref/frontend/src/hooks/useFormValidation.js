import { useState, useCallback } from 'react'

// Common validation rules
export const validationRules = {
  required: (value, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`
    }
    return null
  },

  email: (value) => {
    if (!value) return null // Let required rule handle empty values
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address (example@company.com)'
    }
    return null
  },

  phone: (value) => {
    if (!value) return null
    const phoneRegex = /^[+]?[1-9]?[\d\s\-()]{10,15}$/
    if (!phoneRegex.test(value.replace(/\s/g, ''))) {
      return 'Please enter a valid phone number'
    }
    return null
  },

  minLength: (min) => (value, fieldName = 'This field') => {
    if (!value) return null
    if (value.length < min) {
      return `${fieldName} must be at least ${min} characters long`
    }
    return null
  },

  maxLength: (max) => (value, fieldName = 'This field') => {
    if (!value) return null
    if (value.length > max) {
      return `${fieldName} must be no more than ${max} characters long`
    }
    return null
  },

  pattern: (regex, message) => (value) => {
    if (!value) return null
    if (!regex.test(value)) {
      return message
    }
    return null
  },

  custom: (validatorFn) => (value, fieldName) => {
    return validatorFn(value, fieldName)
  }
}

// Standard error messages for consistent UX
export const standardMessages = {
  required: (fieldName) => `${fieldName} is required to continue`,
  email: 'Please enter a valid email address (example@company.com)',
  phone: 'Please enter a valid phone number',
  passwordWeak: 'Password should be at least 8 characters with numbers or symbols',
  passwordMatch: 'Passwords do not match',
  generic: 'Please check this field and try again',
  serverError: 'Something went wrong. Please try again or contact support.'
}

// Custom hook for form validation
export const useFormValidation = (initialData = {}, validationSchema = {}) => {
  const [data, setData] = useState(initialData)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update a single field
  const updateField = useCallback((field, value) => {
    setData(prev => ({ ...prev, [field]: value }))
    
    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors(prev => {
        const { [field]: _removed, ...rest } = prev
        return rest
      })
    }
  }, [errors])

  // Mark a field as touched (for on-blur validation)
  const touchField = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }, [])

  // Validate a single field
  const validateField = useCallback((field, value = data[field]) => {
    const fieldSchema = validationSchema[field]
    if (!fieldSchema) return null

    // Run through validation rules for this field
    for (const rule of fieldSchema) {
      const error = rule(value, field)
      if (error) return error
    }
    return null
  }, [data, validationSchema])

  // Validate all fields
  const validateForm = useCallback(() => {
    const newErrors = {}
    let isValid = true

    Object.keys(validationSchema).forEach(field => {
      const error = validateField(field, data[field])
      if (error) {
        newErrors[field] = error
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }, [data, validateField, validationSchema])

  // Handle field blur (for immediate validation feedback)
  const handleBlur = useCallback((field) => {
    touchField(field)
    const error = validateField(field)
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }))
    }
  }, [touchField, validateField])

  // Handle field change
  const handleChange = useCallback((field, value) => {
    updateField(field, value)
  }, [updateField])

  // Submit handler with validation
  const handleSubmit = useCallback(async (onSubmit) => {
    setIsSubmitting(true)
    
    try {
      const isValid = validateForm()
      if (!isValid) {
        // Mark all fields as touched to show errors
        const allTouched = Object.keys(validationSchema).reduce((acc, field) => {
          acc[field] = true
          return acc
        }, {})
        setTouched(allTouched)
        return false
      }

      // Call the submit function
      await onSubmit(data)
      return true
    } catch (error) {
      // Handle submission errors
      if (typeof error === 'object' && error.fieldErrors) {
        setErrors(error.fieldErrors)
      } else {
        setErrors({ _form: error.message || standardMessages.serverError })
      }
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [data, validateForm, validationSchema])

  // Reset form
  const reset = useCallback((newData = initialData) => {
    setData(newData)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
  }, [initialData])

  // Set server errors (from API responses)
  const setServerErrors = useCallback((serverErrors) => {
    setErrors(prev => ({ ...prev, ...serverErrors }))
  }, [])

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  // Get field props for easy component binding
  const getFieldProps = useCallback((field, options = {}) => {
    const { validateOnBlur = true } = options
    
    return {
      name: field,
      value: data[field] || '',
      error: touched[field] ? errors[field] : undefined,
      onChange: (e) => {
        const value = e.target ? e.target.value : e
        handleChange(field, value)
      },
      onBlur: validateOnBlur ? () => handleBlur(field) : undefined,
      disabled: isSubmitting
    }
  }, [data, errors, touched, handleChange, handleBlur, isSubmitting])

  return {
    // Data
    data,
    errors,
    touched,
    isSubmitting,
    
    // Actions
    updateField,
    handleChange,
    handleBlur,
    handleSubmit,
    validateField,
    validateForm,
    reset,
    setServerErrors,
    clearErrors,
    
    // Utilities
    getFieldProps,
    isValid: Object.keys(errors).length === 0,
    isDirty: JSON.stringify(data) !== JSON.stringify(initialData)
  }
}