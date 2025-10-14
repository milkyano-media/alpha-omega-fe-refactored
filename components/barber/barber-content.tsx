"use client"

import { BarberOverviewSection } from "./sections/barber-overview-section"
import { BarberBookingsSection } from "./sections/barber-bookings-section"
import { BarberScheduleSection } from "./sections/barber-schedule-section"
import { BarberPerformanceSection } from "./sections/barber-performance-section"
import { BarberProfileSection } from "./sections/barber-profile-section"

interface BarberContentProps {
  activeSection?: string
  onSectionChange?: (section: string) => void
}

export function BarberContent({ activeSection = "overview", onSectionChange }: BarberContentProps) {
  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <BarberOverviewSection
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />

      {/* Bookings Section - Reuse admin calendar component */}
      <BarberBookingsSection
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />

      {/* Schedule Section */}
      <BarberScheduleSection
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />

      {/* Performance Section */}
      <BarberPerformanceSection
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />

      {/* Profile Section */}
      <BarberProfileSection
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />
    </div>
  )
}
