"use client"

import * as React from "react"
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select"

// Predefined department options - matching the departments used in the settings
const DEPARTMENT_OPTIONS: MultiSelectOption[] = [
  { value: "All", label: "All Departments" },
  { value: "Engineering", label: "Engineering" },
  { value: "Product", label: "Product" },
  { value: "Marketing", label: "Marketing" },
  { value: "Sales", label: "Sales" },
  { value: "HR", label: "HR" },
  { value: "Operations", label: "Operations" },
  { value: "Finance", label: "Finance" },
  { value: "Design", label: "Design" },
  { value: "DevOps", label: "DevOps" },
]

interface DepartmentMultiSelectProps {
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  maxSelected?: number
}

export const DepartmentMultiSelect = React.forwardRef<
  HTMLButtonElement,
  DepartmentMultiSelectProps
>(({ 
  selected, 
  onChange, 
  placeholder = "Select departments...",
  maxSelected = 5, // Reasonable limit for departments
  ...props 
}, ref) => {
  return (
    <MultiSelect
      ref={ref}
      options={DEPARTMENT_OPTIONS}
      selected={selected}
      onChange={onChange}
      placeholder={placeholder}
      maxSelected={maxSelected}
      searchable={true}
      {...props}
    />
  )
})

DepartmentMultiSelect.displayName = "DepartmentMultiSelect"

// Export the department options for use elsewhere if needed
export { DEPARTMENT_OPTIONS }