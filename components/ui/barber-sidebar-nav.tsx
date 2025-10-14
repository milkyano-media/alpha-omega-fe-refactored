"use client"

import { cn } from "@/lib/utils"
import {
  Calendar,
  Clock,
  Home,
  TrendingUp,
  User
} from "lucide-react"

interface BarberSidebarNavProps {
  className?: string
  onNavigate?: (section: string) => void
  activeSection?: string
  isMobile?: boolean
}

const navItems = [
  {
    title: "My Overview",
    section: "overview",
    icon: Home,
  },
  {
    title: "My Bookings",
    section: "bookings",
    icon: Calendar,
  },
  {
    title: "My Schedule",
    section: "schedule",
    icon: Clock,
  },
  {
    title: "My Performance",
    section: "performance",
    icon: TrendingUp,
  },
  {
    title: "My Profile",
    section: "profile",
    icon: User,
  },
]

export function BarberSidebarNav({ className, onNavigate, activeSection = "overview", isMobile = false, ...props }: BarberSidebarNavProps) {
  return (
    <nav
      className={cn(
        "flex",
        isMobile
          ? "flex-col space-y-2" // Always vertical on mobile
          : "space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1", // Horizontal on small screens, vertical on large
        className
      )}
      {...props}
    >
      {navItems.map((item) => (
        <button
          key={item.section}
          onClick={() => onNavigate?.(item.section)}
          className={cn(
            "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors w-full justify-start",
            activeSection === item.section
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground",
            isMobile && "py-3" // Larger touch targets on mobile
          )}
        >
          <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className={cn(
            "truncate",
            !isMobile && "hidden sm:inline" // Hide text on very small screens for desktop nav
          )}>
            {item.title}
          </span>
        </button>
      ))}
    </nav>
  )
}
