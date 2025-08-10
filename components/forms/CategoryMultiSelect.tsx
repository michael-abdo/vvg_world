"use client"

import * as React from "react"
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select"

// Predefined category options - matching the categories used in pain points
const CATEGORY_OPTIONS: MultiSelectOption[] = [
  { value: "Safety", label: "Safety" },
  { value: "Efficiency", label: "Efficiency" },
  { value: "Cost Savings", label: "Cost Savings" },
  { value: "Quality", label: "Quality" },
  { value: "Product", label: "Product" },
  { value: "Process", label: "Process" },
  { value: "Culture", label: "Culture" },
  { value: "Tech", label: "Tech" },
  { value: "Other", label: "Other" },
]

interface CategoryMultiSelectProps {
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  maxSelected?: number
}

export const CategoryMultiSelect = React.forwardRef<
  HTMLButtonElement,
  CategoryMultiSelectProps
>(({ 
  selected, 
  onChange, 
  placeholder = "Select categories...",
  maxSelected = 3, // Reasonable limit for categories
  ...props 
}, ref) => {
  return (
    <MultiSelect
      ref={ref}
      options={CATEGORY_OPTIONS}
      selected={selected}
      onChange={onChange}
      placeholder={placeholder}
      maxSelected={maxSelected}
      searchable={true}
      {...props}
    />
  )
})

CategoryMultiSelect.displayName = "CategoryMultiSelect"

// Export the category options for use elsewhere if needed
export { CATEGORY_OPTIONS }