"use client"

// Removed unused Next.js navigation imports
import { cn } from "@/lib/utils"
import {
  Calendar,
  CreditCard,
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
    title: "Services",
    section: "services", 
    icon: Wrench,
  },
  {
    title: "Service Pricing",
    section: "pricing",
    icon: CreditCard,
  },
  {
    title: "Team Members",
    section: "team",
    icon: Users,
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

export function SidebarNav({ className, onNavigate, activeSection = "overview", ...props }: SidebarNavProps) {
  return (
    <nav
      className={cn(
        "flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1",
        className
      )}
      {...props}
    >
      {navItems.map((item) => (
        <button
          key={item.section}
          onClick={() => onNavigate?.(item.section)}
          className={cn(
            "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
            activeSection === item.section
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground"
          )}
        >
          <item.icon className="mr-2 h-4 w-4" />
          {item.title}
        </button>
      ))}
    </nav>
  )
}