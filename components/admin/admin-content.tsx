"use client"

import { OverviewSection } from "./sections/overview-section"
import { ServicesManagementSection } from "./sections/services-management-section"
import { TeamManagementSection } from "./sections/team-management-section"
import BusinessSettingsSection from "./sections/business-settings-section"
import { ImagesSection } from "./sections/images-section"
import { ScheduleManagementSection } from "./sections/schedule-management-section"
import { BookingsSection } from "./sections/bookings-section"
// Import other sections as we create them
// import { RefundsSection } from "./sections/refunds-section"

interface AdminContentProps {
  activeSection?: string
  onSectionChange?: (section: string) => void
}

export function AdminContent({ activeSection = "overview", onSectionChange }: AdminContentProps) {
  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <OverviewSection 
        activeSection={activeSection} 
        onSectionChange={onSectionChange} 
      />

      {/* Unified Services Management Section */}
      <ServicesManagementSection 
        activeSection={activeSection} 
        onSectionChange={onSectionChange} 
      />

      {/* Team Management Section */}
      <TeamManagementSection 
        activeSection={activeSection} 
        onSectionChange={onSectionChange} 
      />

      {/* Business Settings Section */}
      <BusinessSettingsSection
        activeSection={activeSection}
      />

      {/* Schedule Management Section */}
      <ScheduleManagementSection
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />

      {/* Images Section */}
      <ImagesSection
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />

      {/* Bookings Section */}
      <BookingsSection
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />




      {activeSection === "refunds" && (
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-medium">Refund Requests</h3>
          <p className="text-sm text-muted-foreground">Coming soon - migrating existing refund functionality</p>
        </div>
      )}
    </div>
  )
}