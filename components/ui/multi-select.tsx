"use client"

import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils-simple"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface MultiSelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  maxSelected?: number
  searchable?: boolean
}

export const MultiSelect = React.forwardRef<
  HTMLButtonElement,
  MultiSelectProps
>(({ 
  options, 
  selected, 
  onChange, 
  placeholder = "Select options...", 
  className,
  disabled = false,
  maxSelected,
  searchable = true,
  ...props 
}, ref) => {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (optionValue: string) => {
    const newSelected = selected.includes(optionValue)
      ? selected.filter((value) => value !== optionValue)
      : [...selected, optionValue]
    
    onChange(newSelected)
  }

  const handleRemove = (optionValue: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onChange(selected.filter((value) => value !== optionValue))
  }

  const selectedOptions = options.filter(option => selected.includes(option.value))
  const isMaxSelected = maxSelected ? selected.length >= maxSelected : false

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-left font-normal h-auto min-h-10 p-3",
            !selected.length && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          {...props}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selected.length === 0 ? (
              <span>{placeholder}</span>
            ) : (
              selectedOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant="secondary"
                  className="flex items-center gap-1 text-xs"
                >
                  {option.label}
                  <button
                    type="button"
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleRemove(option.value, e as any)
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => handleRemove(option.value, e)}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    <span className="sr-only">Remove {option.label}</span>
                  </button>
                </Badge>
              ))
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          {searchable && <CommandInput placeholder="Search options..." />}
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value)
                const isDisabled = option.disabled || (isMaxSelected && !isSelected)
                
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      if (!isDisabled) {
                        handleSelect(option.value)
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer",
                      isDisabled && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={isDisabled}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})

MultiSelect.displayName = "MultiSelect"