"use client"

// Removed unused Next.js navigation imports
import { cn } from "@/lib/utils"
import {
  Calendar,
  Clock,
  FileText,
  Home,
  Images,
  Settings,
  Users,
  Wrench
} from "lucide-react"

interface SidebarNavProps {
  className?: string
  onNavigate?: (section: string) => void
  activeSection?: string
  isMobile?: boolean
}

const navItems = [
  {
    title: "Overview",
    section: "overview",
    icon: Home,
  },
  {
    title: "Bookings & Payments",
    section: "bookings",
    icon: Calendar,
  },
  {
    title: "Services Management",
    section: "services-management", 
    icon: Wrench,
  },
  {
    title: "Team Members",
    section: "team",
    icon: Users,
  },
  {
    title: "Schedule Management",
    section: "schedule",
    icon: Clock,
  },
  {
    title: "Image Gallery",
    section: "images",
    icon: Images,
  },
  {
    title: "Business Settings",
    section: "settings",
    icon: Settings,
  },
  {
    title: "Refund Requests",
    section: "refunds",
    icon: FileText,
  },
]

export function SidebarNav({ className, onNavigate, activeSection = "overview", isMobile = false, ...props }: SidebarNavProps) {
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