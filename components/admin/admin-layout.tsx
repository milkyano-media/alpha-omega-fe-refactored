"use client"

import React, { useState } from "react"
// Removed unused card imports
import { SidebarNav } from "@/components/ui/sidebar-nav"
import { Separator } from "@/components/ui/separator"

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [activeSection, setActiveSection] = useState("overview")

  const handleNavigation = (section: string) => {
    setActiveSection(section)
  }

  return (
    <div className="space-y-6 p-10 pb-16 mt-10">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Admin Dashboard</h2>
        <p className="text-muted-foreground">
          Manage your business settings, services, team members, and more.
        </p>
      </div>
      <Separator className="my-6" />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="lg:w-1/5">
          <SidebarNav
            activeSection={activeSection}
            onNavigate={handleNavigation}
            className="w-full"
          />
        </aside>
        <div className="flex-1 ">
          {React.cloneElement(children as React.ReactElement<any>, { 
            activeSection, 
            onSectionChange: setActiveSection 
          })}
        </div>
      </div>
    </div>
  )
}