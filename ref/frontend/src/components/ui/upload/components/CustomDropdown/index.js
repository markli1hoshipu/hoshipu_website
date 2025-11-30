/**
 * CustomDropdown Component System
 * MondayCRM-inspired dropdown for column mapping with ignore functionality
 */
export { default as CustomDropdown } from './CustomDropdown';
export { default as DropdownTrigger } from './DropdownTrigger';
export { default as DropdownMenu } from './DropdownMenu';
export { default as DropdownOption } from './DropdownOption';
export { default as DropdownGroup } from './DropdownGroup';
export { default as DropdownSearch } from './DropdownSearch';

// Export icon utilities
export {
  OPTION_TYPES,
  OPTION_GROUPS,
  getOptionConfig,
  determineOptionType,
  groupOptions
} from './icons';

// Export the main component as default
export { default } from './CustomDropdown';