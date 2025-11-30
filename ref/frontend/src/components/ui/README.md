# Shared Components System

This directory contains standardized, reusable UI components to ensure consistency across the Prelude Platform frontend application.

## 🎯 Problem Solved

Before this refactor, the codebase had chaotic UI element usage with:
- Mix of `<button>` HTML elements with custom inline styles vs standardized `Button` components
- Inconsistent table implementations with varying styling approaches
- Raw form elements (`<input>`, `<label>`, `<select>`) with different validation and styling patterns
- Hardcoded colors and inconsistent hover states across components

## 📁 Structure

```
shared/
├── buttons/          # Button components and variants
├── tables/           # Table components for data display
├── forms/            # Form input components  
├── layout/           # Layout and container components
├── typography/       # Text and heading components
└── index.js          # Unified exports
```

## 🧩 Components

### Buttons (`/buttons`)

**IconButton**
- Standardized button with icon support
- Consistent sizing and hover states
- Usage: `<IconButton icon={Edit} variant="ghost" size="sm" onClick={handleEdit} />`

**ActionButton** 
- Color-coded action buttons (primary, success, danger, etc.)
- Usage: `<ActionButton color="success" fullWidth>Save Changes</ActionButton>`

**Button** (from UI library)
- Base button component with variants
- Usage: `<Button variant="outline" size="lg">Click Me</Button>`

### Tables (`/tables`)

**Table**
- Wrapper component with optional striping, borders, hover states
- Usage: `<Table striped hover bordered={false}>`

**TableHeader**
- Consistent header styling with gray background
- Usage: `<TableHeader><TableRow>...</TableRow></TableHeader>`

**TableRow** 
- Row component with variant support (default, success, danger, warning)
- Usage: `<TableRow variant="success">...</TableRow>`

**TableCell**
- Cell component supporting both `<th>` and `<td>` with alignment options
- Usage: `<TableCell header align="center">Name</TableCell>`

### Forms (`/forms`)

**FormField**
- Complete form field with label, input, and error display
- Automatic required field indicators
- Usage: `<FormField label="Email" type="email" required error={errors.email} />`

**FormGroup**
- Groups multiple form fields with consistent spacing
- Supports inline layout option
- Usage: `<FormGroup inline><FormField.../><FormField.../></FormGroup>`

**FormSection**
- Sections forms with title and description
- Usage: `<FormSection title="Contact Info" description="Basic contact details">`

### Layout (`/layout`)

**Container**
- Responsive container with size variants (sm, default, lg, full)
- Usage: `<Container size="lg">content</Container>`

**Card**
- Card wrapper with configurable padding, shadow, and border
- Usage: `<Card padding="lg" shadow="sm" border={false}>`

## 🚀 Usage

### Import Components

```javascript
// Primitive UI component imports
import { Button } from './primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from './primitives/card';
import { Input } from './primitives/input';
import { Label } from './primitives/label';

// Layout and structure components
import { Container } from './layout/Container';
import { Section } from './layout/Section';

// Form components
import { FormField, FormGroup } from './forms/FormField';
```

### Example: Converting Legacy Button

**Before:**
```jsx
<button className="text-blue-600 hover:text-blue-800 text-sm">
  <Plus className="w-4 h-4" /> Add Item
</button>
```

**After:**
```jsx
<IconButton 
  icon={Plus} 
  variant="ghost" 
  className="text-blue-600 hover:text-blue-800"
>
  Add Item
</IconButton>
```

### Example: Converting Legacy Table

**Before:**
```jsx
<table className="w-full">
  <thead className="bg-gray-50 border-b">
    <tr>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
        Name
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">{item.name}</td>
    </tr>
  </tbody>
</table>
```

**After:**
```jsx
<Table hover>
  <TableHeader>
    <TableRow>
      <TableCell header>Name</TableCell>
    </TableRow>
  </TableHeader>
  <tbody>
    <TableRow>
      <TableCell>{item.name}</TableCell>
    </TableRow>
  </tbody>
</Table>
```

### Example: Converting Legacy Form

**Before:**
```jsx
<label className="text-sm font-medium text-gray-700">
  Name
  <input 
    type="text"
    className="mt-1 border rounded px-3 py-2 w-full"
    required
  />
</label>
```

**After:**
```jsx
<FormField 
  label="Name" 
  type="text" 
  required 
/>
```

## ✅ Benefits

1. **Consistency** - All UI elements follow the same design patterns
2. **Maintainability** - Changes to styling can be made in one place
3. **Accessibility** - Components include proper ARIA attributes and focus management
4. **Developer Experience** - Easy-to-use props and clear component APIs
5. **Theme Support** - Components respect the theme system and color variables
6. **Performance** - Optimized re-rendering and proper React patterns

## 🔧 Migration Guide

To migrate existing components:

1. **Import shared components** at the top of your file
2. **Replace HTML elements** with corresponding shared components
3. **Remove custom styling** that's now handled by the shared components
4. **Update props** to use the component APIs instead of raw attributes
5. **Test functionality** to ensure behavior is preserved

## 🎨 Theming

All shared components work with the existing theme system:
- Use CSS variables for colors (`--primary`, `--secondary`, etc.)
- Respect dark/light mode preferences
- Follow the established spacing and typography scales

## 📋 Component Checklist

When creating new components, ensure they:
- [ ] Accept standard React props (`className`, `children`, etc.)
- [ ] Use `forwardRef` for proper ref forwarding  
- [ ] Include TypeScript types (when applicable)
- [ ] Have sensible default props
- [ ] Support theme customization
- [ ] Include proper accessibility attributes
- [ ] Follow the established naming conventions

---

This shared component system ensures a consistent, maintainable, and scalable UI across the entire Prelude Platform application.