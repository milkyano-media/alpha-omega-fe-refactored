"use client"

import { OverviewSection } from "./sections/overview-section"
import { ServicesSection } from "./sections/services-section"
import { PricingSection } from "./sections/pricing-section"
import BusinessSettingsSection from "./sections/business-settings-section"
import { ImagesSection } from "./sections/images-section"
// Import other sections as we create them
// import { BookingsSection } from "./sections/bookings-section"
// import { TeamSection } from "./sections/team-section"
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

      {/* Services Section */}
      <ServicesSection 
        activeSection={activeSection} 
        onSectionChange={onSectionChange} 
      />

      {/* Pricing Section */}
      <PricingSection 
        activeSection={activeSection} 
        onSectionChange={onSectionChange} 
      />

      {/* Business Settings Section */}
      <BusinessSettingsSection 
        activeSection={activeSection}
      />

      {/* Images Section */}
      <ImagesSection 
        activeSection={activeSection} 
        onSectionChange={onSectionChange} 
      />

      {/* Placeholder for other sections - will be implemented in subsequent tasks */}
      {activeSection === "bookings" && (
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-medium">Bookings & Payments</h3>
          <p className="text-sm text-muted-foreground">Coming soon - migrating existing functionality</p>
        </div>
      )}

      {activeSection === "team" && (
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-medium">Team Members</h3>
          <p className="text-sm text-muted-foreground">Coming soon - team member management</p>
        </div>
      )}



      {activeSection === "refunds" && (
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-medium">Refund Requests</h3>
          <p className="text-sm text-muted-foreground">Coming soon - migrating existing refund functionality</p>
        </div>
      )}
    </div>
  )
}