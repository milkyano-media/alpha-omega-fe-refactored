"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Clock, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value?: string // Format: "HH:MM"
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TimePicker({ 
  value, 
  onChange, 
  placeholder = "Select time",
  disabled = false,
  className 
}: TimePickerProps) {
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange?.(newValue)
  }

  const formatDisplayTime = (time: string) => {
    if (!time) return ""
    const [h, m] = time.split(':')
    const hour24 = parseInt(h)
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    return `${hour12}:${m} ${ampm}`
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-2 flex-1">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <Input
          type="time"
          value={value || ""}
          onChange={handleTimeChange}
          disabled={disabled}
          className="w-auto"
          placeholder={placeholder}
        />
        {value && (
          <span className="text-xs text-muted-foreground">
            {formatDisplayTime(value)}
          </span>
        )}
      </div>
    </div>
  )
}

interface WorkingHoursPickerProps {
  value?: { start: string; end: string } | null
  onChange?: (value: { start: string; end: string } | null) => void
  disabled?: boolean
  className?: string
}

export function WorkingHoursPicker({ 
  value, 
  onChange, 
  disabled = false, 
  className 
}: WorkingHoursPickerProps) {
  const handleStartChange = (start: string) => {
    onChange?.({ 
      start, 
      end: value?.end || "17:00" 
    })
  }

  const handleEndChange = (end: string) => {
    onChange?.({ 
      start: value?.start || "09:00", 
      end 
    })
  }

  const handleClear = () => {
    onChange?.(null)
  }

  const handleSetDefault = () => {
    onChange?.({ start: "09:00", end: "17:00" })
  }

  if (!value || value === undefined || value === null) {
    // Show single button to set working hours
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSetDefault}
          disabled={disabled}
          className="text-muted-foreground"
        >
          <Clock className="h-4 w-4 mr-2" />
          Set working hours
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-2 flex-1">
        <TimePicker
          value={value.start}
          onChange={handleStartChange}
          placeholder="Start time"
          disabled={disabled}
          className="flex-1"
        />
        <span className="text-muted-foreground text-sm">to</span>
        <TimePicker
          value={value.end}
          onChange={handleEndChange}
          placeholder="End time"
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={disabled}
          className="px-2 h-8"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}