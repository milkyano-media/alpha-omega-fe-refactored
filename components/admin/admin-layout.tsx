"use client"

import React, { useState } from "react"
// Removed unused card imports
import { SidebarNav } from "@/components/ui/sidebar-nav"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [activeSection, setActiveSection] = useState("overview")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleNavigation = (section: string) => {
    setActiveSection(section)
    setIsMobileMenuOpen(false) // Close mobile menu on navigation
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold">Admin Dashboard</h2>
            <p className="text-xs text-muted-foreground">Manage your business</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Navigation Sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-background border-r shadow-lg transform transition-transform duration-200 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Navigation</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          <SidebarNav
            activeSection={activeSection}
            onNavigate={handleNavigation}
            className="w-full"
            isMobile={true}
          />
        </div>
      </div>

      <div className="lg:p-10 lg:pb-16">
        {/* Desktop Header - adjusted for main navbar */}
        <div className="hidden lg:block space-y-0.5 mb-6 mt-8">
          <h2 className="text-2xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Manage your business settings, services, team members, and more.
          </p>
        </div>
        <Separator className="hidden lg:block my-6" />

        <div className="flex flex-col lg:flex-row lg:space-x-12 lg:space-y-0">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block lg:w-1/5">
            <SidebarNav
              activeSection={activeSection}
              onNavigate={handleNavigation}
              className="w-full sticky top-24"
            />
          </aside>

          {/* Main Content */}
          <div className="flex-1 lg:p-0 min-w-0"> {/* min-w-0 prevents flex child overflow */}
            {/* Mobile content wrapper with proper top spacing */}
            <div className="lg:hidden pt-4 pb-4 px-4">
              <div className="max-w-full overflow-x-hidden"> {/* Prevent horizontal scroll on mobile */}
                {React.cloneElement(children as React.ReactElement<any>, {
                  activeSection,
                  onSectionChange: setActiveSection
                })}
              </div>
            </div>
            {/* Desktop content wrapper */}
            <div className="hidden lg:block">
              <div className="max-w-full overflow-x-hidden"> {/* Prevent horizontal scroll on mobile */}
                {React.cloneElement(children as React.ReactElement<any>, {
                  activeSection,
                  onSectionChange: setActiveSection
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}