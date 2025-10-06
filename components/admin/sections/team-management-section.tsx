"use client"

import React, { useEffect, useState } from "react"
import { API } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Search, RefreshCw, Users, UserPlus, Phone, Mail, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Filter, Key, Copy } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import toast from "react-hot-toast"
import { getErrorMessage } from "@/lib/error-utils"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { FormImageUpload } from "@/components/ui/form-image-upload"
import { FormGalleryUpload } from "@/components/ui/form-gallery-upload"
import { WorkingHoursPicker } from "@/components/ui/time-picker"
import PhoneInput from "react-phone-number-input"
import { isPossiblePhoneNumber } from "react-phone-number-input"
import "react-phone-number-input/style.css"

// Types
interface TeamMember {
  id: number
  first_name: string
  last_name: string
  display_name?: string
  email?: string
  phone?: string
  bio?: string
  specialties: string[]
  years_experience?: number
  certifications: string[]
  status: 'active' | 'inactive' | 'on_leave'
  is_owner: boolean
  can_manage_bookings: boolean
  is_public: boolean
  working_hours: Record<string, { start: string; end: string } | null>
  hourly_rate_cents?: number
  profile_image_url?: string
  gallery_images: string[]
  social_links: Record<string, string>
  hire_date?: string
  emergency_contact: Record<string, string>
  notes?: string
  display_order: number
  created_at: string
  updated_at: string
  servicePricing?: ServicePricing[]
}

interface ServicePricing {
  id: number
  service_id: number
  team_member_id: number
  price_cents: number
  duration_override?: number
  is_available: boolean
  special_notes?: string
  effective_from: string
  effective_until?: string
  service?: {
    id: number
    name: string
    base_price_cents: number
    duration_minutes: number
  }
}

interface Service {
  id: number
  name: string
  description?: string
  base_price_cents: number
  duration_minutes: number
  category_id: number
  is_active: boolean
}

// Validation schemas
const teamMemberBasicSchema = z.object({
  first_name: z.string()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "First name can only contain letters, spaces, hyphens, and apostrophes"),
  last_name: z.string()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Last name can only contain letters, spaces, hyphens, and apostrophes"),
  display_name: z.string()
    .max(150, "Display name must be less than 150 characters")
    .optional()
    .or(z.literal("")),
  email: z.union([
    z.string().email("Please enter a valid email address"),
    z.literal("")
  ]).optional(),
  phone: z.union([
    z.string()
      .refine((value) => !value || value.startsWith("+ ") || value.startsWith("+"), {
        message: "Phone number must start with a country code (e.g., +61)",
      })
      .refine(
        (value) => {
          if (!value) return true; // Optional field
          try {
            const cleaned = value.replace(/\s+/g, "");
            if (cleaned.length < 8) return false;
            return /^\+[1-9]\d{6,14}$/.test(cleaned) || isPossiblePhoneNumber(value);
          } catch (error) {
            return false;
          }
        },
        {
          message: "Please enter a valid phone number with country code",
        }
      ),
    z.literal("")
  ]).optional(),
  bio: z.string()
    .max(1000, "Bio must be less than 1000 characters")
    .optional()
    .or(z.literal("")),
  hire_date: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date (YYYY-MM-DD)"),
    z.literal("")
  ]).optional(),
  password: z.union([
    z.string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be less than 100 characters")
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
    z.literal("")
  ]).optional()
})

const teamMemberProfessionalSchema = z.object({
  specialties: z.array(z.string())
    .max(10, "Maximum 10 specialties allowed")
    .optional(),
  years_experience: z.number()
    .min(0, "Years of experience cannot be negative")
    .max(50, "Years of experience seems too high (max 50)")
    .optional(),
  certifications: z.array(z.string())
    .max(15, "Maximum 15 certifications allowed")
    .optional(),
  hourly_rate_cents: z.number()
    .min(0, "Hourly rate cannot be negative")
    .max(50000, "Hourly rate seems too high (max $500)")
    .optional(),
  profile_image_url: z.string()
    .url("Please provide a valid image URL")
    .optional()
    .or(z.literal("")),
  gallery_images: z.array(z.string().url("Please provide valid image URLs"))
    .max(20, "Maximum 20 gallery images allowed")
    .optional()
})

const teamMemberSettingsSchema = z.object({
  status: z.enum(['active', 'inactive', 'on_leave'], {
    errorMap: () => ({ message: "Please select a valid status" })
  }),
  is_owner: z.boolean(),
  can_manage_bookings: z.boolean(),
  is_public: z.boolean(),
  display_order: z.number()
    .min(0, "Display order cannot be negative")
    .max(999, "Display order too high (max 999)"),
  working_hours: z.record(z.object({
    start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter valid time format (HH:MM)"),
    end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter valid time format (HH:MM)")
  }).refine(data => {
    const startMinutes = parseInt(data.start.split(':')[0]) * 60 + parseInt(data.start.split(':')[1])
    const endMinutes = parseInt(data.end.split(':')[0]) * 60 + parseInt(data.end.split(':')[1])
    return endMinutes > startMinutes
  }, {
    message: "End time must be after start time"
  }).nullable()).optional(),
  social_links: z.object({
    instagram: z.union([
      z.string().url("Please provide a valid Instagram URL").refine(url => 
        url.includes('instagram.com'), 
        "URL must be a valid Instagram profile link"
      ),
      z.literal("")
    ]).optional(),
    facebook: z.union([
      z.string().url("Please provide a valid Facebook URL").refine(url => 
        url.includes('facebook.com'), 
        "URL must be a valid Facebook profile link"
      ),
      z.literal("")
    ]).optional(),
    twitter: z.union([
      z.string().url("Please provide a valid Twitter URL").refine(url => 
        url.includes('twitter.com') || url.includes('x.com'), 
        "URL must be a valid Twitter/X profile link"
      ),
      z.literal("")
    ]).optional(),
    website: z.union([
      z.string().url("Please provide a valid website URL"),
      z.literal("")
    ]).optional()
  }).optional(),
  emergency_contact: z.object({
    name: z.union([
      z.string()
        .min(1, "Emergency contact name is required")
        .max(100, "Name must be less than 100 characters")
        .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
      z.literal("")
    ]).optional(),
    relationship: z.union([
      z.string()
        .min(1, "Relationship is required")
        .max(50, "Relationship must be less than 50 characters"),
      z.literal("")
    ]).optional(),
    phone: z.union([
      z.string()
        .min(1, "Emergency contact phone is required")
        .refine((value) => value.startsWith("+ ") || value.startsWith("+"), {
          message: "Phone number must start with a country code (e.g., +61)",
        })
        .refine(
          (value) => {
            try {
              const cleaned = value.replace(/\s+/g, "");
              if (cleaned.length < 8) return false;
              return /^\+[1-9]\d{6,14}$/.test(cleaned) || isPossiblePhoneNumber(value);
            } catch (error) {
              return false;
            }
          },
          {
            message: "Please enter a valid phone number with country code",
          }
        ),
      z.literal("")
    ]).optional(),
    email: z.union([
      z.string().email("Please enter a valid email address"),
      z.literal("")
    ]).optional()
  }).refine(data => {
    // If any emergency contact field is filled (and relationship is not "none"), name, relationship, and phone become required
    const hasAnyField = data?.name || (data?.relationship && data.relationship !== "none") || data?.phone || data?.email
    if (hasAnyField) {
      return data?.name && data.name.trim() !== "" &&
             data?.relationship && data.relationship.trim() !== "" && data.relationship !== "none" &&
             data?.phone && data.phone.trim() !== ""
    }
    return true
  }, {
    message: "If providing emergency contact, name, relationship, and phone are required",
    path: ["name"]
  }).optional(),
  notes: z.string()
    .max(2000, "Notes must be less than 2000 characters")
    .optional()
    .or(z.literal(""))
})

const servicePricingSchema = z.object({
  service_id: z.number()
    .min(1, "Please select a service"),
  price_cents: z.number()
    .min(0, "Price cannot be negative")
    .max(100000, "Price seems too high (max $1000)"),
  duration_override: z.union([
    z.number()
      .min(1, "Duration must be at least 1 minute")
      .max(1440, "Duration cannot exceed 24 hours (1440 minutes)"),
    z.null(),
    z.undefined()
  ]).optional(),
  is_available: z.boolean(),
  special_notes: z.string()
    .max(500, "Special notes must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  effective_from: z.string()
    .min(1, "Effective from date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date (YYYY-MM-DD)"),
  effective_until: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date (YYYY-MM-DD)"),
    z.literal("")
  ]).optional()
}).refine(data => {
  if (data.effective_until && data.effective_until !== "") {
    return new Date(data.effective_until) > new Date(data.effective_from)
  }
  return true
}, {
  message: "End date must be after start date",
  path: ["effective_until"]
})

type TeamMemberBasicData = z.infer<typeof teamMemberBasicSchema>
type TeamMemberProfessionalData = z.infer<typeof teamMemberProfessionalSchema>
type TeamMemberSettingsData = z.infer<typeof teamMemberSettingsSchema>
type ServicePricingData = z.infer<typeof servicePricingSchema>

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

interface TeamManagementSectionProps {
  activeSection: string
  onSectionChange?: (section: string) => void
}

export function TeamManagementSection({ activeSection }: TeamManagementSectionProps) {
  // State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Pagination, sorting, and filtering state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sortField, setSortField] = useState<keyof TeamMember>('first_name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [roleFilter, setRoleFilter] = useState("all") // all, owner, manager, staff
  const [experienceFilter, setExperienceFilter] = useState("all") // all, 0-2, 3-5, 5+
  
  // Form states
  const basicForm = useForm<TeamMemberBasicData>({
    resolver: zodResolver(teamMemberBasicSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      display_name: "",
      email: "",
      phone: "",
      bio: "",
      hire_date: "",
      password: ""
    },
    mode: "all"
  })

  const professionalForm = useForm<TeamMemberProfessionalData>({
    resolver: zodResolver(teamMemberProfessionalSchema),
    defaultValues: {
      specialties: [],
      years_experience: 0,
      certifications: [],
      hourly_rate_cents: 0,
      profile_image_url: "",
      gallery_images: []
    },
    mode: "all"
  })

  const settingsForm = useForm<TeamMemberSettingsData>({
    resolver: zodResolver(teamMemberSettingsSchema),
    defaultValues: {
      status: 'active',
      is_owner: false,
      can_manage_bookings: false,
      is_public: true,
      display_order: 0,
      working_hours: {},
      social_links: {
        instagram: "",
        facebook: "",
        twitter: "",
        website: ""
      },
      emergency_contact: {
        name: "",
        relationship: "",
        phone: "",
        email: ""
      },
      notes: ""
    },
    mode: "all"
  })

  const [memberServices, setMemberServices] = useState<ServicePricingData[]>([])
  const [newSpecialty, setNewSpecialty] = useState("")
  const [newCertification, setNewCertification] = useState("")

  // Utility functions
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  const generateRandomPassword = () => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    const special = '!@#$%^&*'

    // Ensure at least one of each type
    let password = ''
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += special[Math.floor(Math.random() * special.length)]

    // Fill the rest with random characters
    const allChars = lowercase + uppercase + numbers + special
    for (let i = password.length; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  const showFormValidationErrors = (form: any, formName: string) => {
    const errors = form.formState.errors
    if (Object.keys(errors).length > 0) {
      const errorMessages = extractErrorMessages(errors)
      toast.error(`${formName} validation errors:\n${errorMessages.join('\n')}`)
      return true
    }
    return false
  }

  const extractErrorMessages = (errors: any, prefix = ''): string[] => {
    const messages: string[] = []
    
    for (const [key, value] of Object.entries(errors)) {
      const fieldName = prefix ? `${prefix}.${key}` : key
      
      if (value && typeof value === 'object' && 'message' in value) {
        // Direct error message
        messages.push(`${fieldName}: ${(value as any).message}`)
      } else if (value && typeof value === 'object' && !('message' in value)) {
        // Nested object with errors
        messages.push(...extractErrorMessages(value, fieldName))
      }
    }
    
    return messages
  }

  // const validateCurrentFormStep = () => {
  //   switch (currentStep) {
  //     case 0:
  //       return !showFormValidationErrors(basicForm, "Basic Information")
  //     case 1:
  //       return !showFormValidationErrors(professionalForm, "Professional Information")
  //     case 2:
  //       return !showFormValidationErrors(settingsForm, "Settings")
  //     default:
  //       return true
  //   }
  // }

  // const validateAllForms = async () => {
  //   const basicValid = await basicForm.trigger()
  //   const professionalValid = await professionalForm.trigger()
  //   const settingsValid = await settingsForm.trigger()

  //   let allValid = true
  //   const errors: string[] = []

  //   if (!basicValid) {
  //     showFormValidationErrors(basicForm, "Basic Information")
  //     errors.push("Basic Information has errors")
  //     allValid = false
  //   }

  //   if (!professionalValid) {
  //     showFormValidationErrors(professionalForm, "Professional Information")
  //     errors.push("Professional Information has errors")
  //     allValid = false
  //   }

  //   if (!settingsValid) {
  //     showFormValidationErrors(settingsForm, "Settings")
  //     errors.push("Settings have errors")
  //     allValid = false
  //   }

  //   if (!allValid) {
  //     toast.error(`Please fix validation errors in:\n${errors.join('\n')}`)
  //   }

  //   return allValid
  // }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'inactive': return 'secondary'
      case 'on_leave': return 'outline'
      default: return 'secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active'
      case 'inactive': return 'Inactive'
      case 'on_leave': return 'On Leave'
      default: return status
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  // Helper function to normalize team member data
  const normalizeTeamMemberData = (member: any): TeamMember => {
    // Helper function to safely handle null/undefined values
    const safeString = (value: any): string => {
      if (value === null || value === undefined) return ""
      return String(value)
    }
    
    // Helper function to safely handle JSON fields
    const safeJsonArray = (value: any): any[] => {
      if (Array.isArray(value)) return value
      if (value === null || value === undefined) return []
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return []
        }
      }
      return []
    }
    
    // Helper function to safely handle JSON objects
    const safeJsonObject = (value: any): Record<string, any> => {
      if (value && typeof value === 'object' && !Array.isArray(value)) return value
      if (value === null || value === undefined) return {}
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {}
        } catch {
          return {}
        }
      }
      return {}
    }
    
    console.log('Raw member data in normalizer:', member)
    
    const normalized = {
      id: member.id,
      first_name: safeString(member.first_name),
      last_name: safeString(member.last_name),
      display_name: safeString(member.display_name),
      email: safeString(member.email),
      phone: safeString(member.phone),
      bio: safeString(member.bio),
      specialties: safeJsonArray(member.specialties),
      years_experience: typeof member.years_experience === 'number' ? member.years_experience : 0,
      certifications: safeJsonArray(member.certifications),
      status: member.status || 'active',
      is_owner: Boolean(member.is_owner),
      can_manage_bookings: Boolean(member.can_manage_bookings),
      is_public: Boolean(member.is_public),
      working_hours: safeJsonObject(member.working_hours),
      hourly_rate_cents: typeof member.hourly_rate_cents === 'number' ? member.hourly_rate_cents : 0,
      profile_image_url: safeString(member.profile_image_url),
      gallery_images: safeJsonArray(member.gallery_images),
      social_links: safeJsonObject(member.social_links),
      hire_date: safeString(member.hire_date),
      emergency_contact: safeJsonObject(member.emergency_contact),
      notes: safeString(member.notes),
      display_order: typeof member.display_order === 'number' ? member.display_order : 0,
      created_at: member.created_at || "",
      updated_at: member.updated_at || "",
      servicePricing: Array.isArray(member.servicePricing) ? member.servicePricing : []
    }
    
    console.log('Normalized member data:', normalized)
    return normalized
  }

  // Data fetching
  const fetchTeamMembers = async () => {
    try {
      const response = await API.get('/team-members')
      const data = response?.data?.data || response?.data || []
      const normalizedMembers = Array.isArray(data) ? data.map(normalizeTeamMemberData) : []
      setTeamMembers(normalizedMembers)
    } catch (error) {
      console.error('Error fetching team members:', error)
      toast.error('Failed to fetch team members')
    }
  }

  const fetchServices = async () => {
    try {
      const response = await API.get('/services')
      const data = response?.data?.data || response?.data || []
      setServices(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching services:', error)
      toast.error('Failed to fetch services')
    }
  }

  const fetchAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchTeamMembers(),
        fetchServices()
      ])
    } finally {
      setLoading(false)
    }
  }

  // Effects
  useEffect(() => {
    if (activeSection === "team") {
      fetchAllData()
    }
  }, [activeSection])

  // Form handlers
  const handleAddTeamMember = () => {
    setEditingMember(null)
    setCurrentStep(0)
    resetAllForms()
    setIsDialogOpen(true)
  }

  const handleEditTeamMember = (member: TeamMember) => {
    console.log('Editing team member:', member) // Debug log
    
    // Normalize the member data to ensure all fields are properly formatted
    const normalizedMember = normalizeTeamMemberData(member)
    console.log('Normalized team member:', normalizedMember) // Debug log
    
    setEditingMember(normalizedMember)
    setCurrentStep(0)
    
    // Populate basic form with normalized member data
    const basicData = {
      first_name: normalizedMember.first_name || "",
      last_name: normalizedMember.last_name || "",
      display_name: normalizedMember.display_name || "",
      email: normalizedMember.email || "",
      phone: normalizedMember.phone || "",
      bio: normalizedMember.bio || "",
      hire_date: normalizedMember.hire_date ? normalizedMember.hire_date.split('T')[0] : "",
      password: "" // Never populate password field for security
    }
    console.log('=== BASIC FORM DEBUG ===')
    console.log('Raw member data from backend:', member) // Debug log
    console.log('Normalized member data:', normalizedMember) // Debug log
    console.log('Basic form data to populate:', basicData) // Debug log
    basicForm.reset(basicData)
    console.log('Form values after reset:', basicForm.getValues()) // Debug log

    // Populate professional form with normalized member data
    const professionalData = {
      specialties: normalizedMember.specialties || [],
      years_experience: normalizedMember.years_experience || 0,
      certifications: normalizedMember.certifications || [],
      hourly_rate_cents: normalizedMember.hourly_rate_cents ? normalizedMember.hourly_rate_cents / 100 : 0, // Convert cents to dollars
      profile_image_url: normalizedMember.profile_image_url || "",
      gallery_images: normalizedMember.gallery_images || []
    }
    console.log('=== PROFESSIONAL FORM DEBUG ===')
    console.log('Professional form data to populate:', professionalData) // Debug log
    console.log('Specialties type:', typeof normalizedMember.specialties, 'Value:', normalizedMember.specialties)
    console.log('Certifications type:', typeof normalizedMember.certifications, 'Value:', normalizedMember.certifications)
    professionalForm.reset(professionalData)
    console.log('Professional form values after reset:', professionalForm.getValues()) // Debug log

    // Populate settings form with normalized member data
    const settingsData = {
      status: normalizedMember.status || 'active',
      is_owner: Boolean(normalizedMember.is_owner),
      can_manage_bookings: Boolean(normalizedMember.can_manage_bookings),
      is_public: Boolean(normalizedMember.is_public),
      display_order: normalizedMember.display_order || 0,
      working_hours: normalizedMember.working_hours || {},
      social_links: {
        instagram: normalizedMember.social_links?.instagram || "",
        facebook: normalizedMember.social_links?.facebook || "",
        twitter: normalizedMember.social_links?.twitter || "",
        website: normalizedMember.social_links?.website || ""
      },
      emergency_contact: {
        name: normalizedMember.emergency_contact?.name || "",
        relationship: normalizedMember.emergency_contact?.relationship || "",
        phone: normalizedMember.emergency_contact?.phone || "",
        email: normalizedMember.emergency_contact?.email || ""
      },
      notes: normalizedMember.notes || ""
    }
    console.log('Settings form data:', settingsData) // Debug log
    settingsForm.reset(settingsData)

    // Load existing service pricing by fetching from API
    const loadMemberServices = async () => {
      try {
        console.log('🔍 Fetching services for team member:', member.id)
        const response = await API.get(`/team-members/${member.id}/services`)
        
        console.log('🔍 Raw API response:', response)
        console.log('🔍 Response data structure:', response.data)
        
        // Handle different response structures
        const memberWithServices = response.data.data || response.data
        console.log('🔍 Member with services:', memberWithServices)
        
        if (memberWithServices && memberWithServices.servicePricing && Array.isArray(memberWithServices.servicePricing)) {
          const serviceData = memberWithServices.servicePricing.map((sp: any) => ({
            service_id: sp.service_id || 0,
            price_cents: sp.price_cents ? (typeof sp.price_cents === 'number' ? sp.price_cents / 100 : 0) : 0,
            duration_override: sp.duration_override,
            is_available: Boolean(sp.is_available),
            special_notes: sp.special_notes || "",
            effective_from: sp.effective_from ? sp.effective_from.split('T')[0] : new Date().toISOString().split('T')[0],
            effective_until: sp.effective_until ? sp.effective_until.split('T')[0] : ""
          }))
          console.log('✅ Service pricing data loaded:', serviceData)
          setMemberServices(serviceData)
        } else {
          console.log('⚠️ No service pricing data found for member', memberWithServices)
          setMemberServices([])
        }
      } catch (error: any) {
        console.error('❌ Error fetching member services:', error)
        console.error('❌ Error details:', error.response || error.message)
        toast.error('Failed to load member services')
        setMemberServices([])
      }
    }
    
    // Load services asynchronously
    loadMemberServices()

    // Force form re-render after a small delay to ensure values are set
    setTimeout(() => {
      basicForm.trigger()
      professionalForm.trigger()
      settingsForm.trigger()
    }, 100)

    setIsDialogOpen(true)
  }

  const handleDeleteTeamMember = async (member: TeamMember) => {
    if (!confirm(`Are you sure you want to delete ${member.first_name} ${member.last_name}?`)) {
      return
    }

    try {
      await API.delete(`/team-members/${member.id}`)
      toast.success("Team member deleted")
      fetchTeamMembers()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const resetAllForms = () => {
    basicForm.reset()
    professionalForm.reset()
    settingsForm.reset()
    setMemberServices([])
    setNewSpecialty("")
    setNewCertification("")
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingMember(null)
    setCurrentStep(0)
    resetAllForms()
  }

  const handleNextStep = async () => {
    try {
      // Trigger form validation and check for errors
      // let currentForm: any
      let isValid = false

      switch (currentStep) {
        case 0: // Basic Information
          // currentForm = basicForm
          isValid = await basicForm.trigger()

          // For new team members, password is required
          if (!editingMember) {
            const passwordValue = basicForm.getValues('password')
            if (!passwordValue || passwordValue.trim() === '') {
              toast.error('Password is required when creating a new team member')
              return
            }
          }

          if (!isValid) {
            showFormValidationErrors(basicForm, "Basic Information")
            return
          }
          break
        
        case 1: // Professional Information
          // currentForm = professionalForm
          isValid = await professionalForm.trigger()
          if (!isValid) {
            showFormValidationErrors(professionalForm, "Professional Information")
            return
          }
          break
        
        case 2: // Settings
          // currentForm = settingsForm
          isValid = await settingsForm.trigger()
          if (!isValid) {
            showFormValidationErrors(settingsForm, "Settings")
            return
          }
          break
        
        case 3: // Services (optional step)
          // Validate service pricing if any exist
          if (memberServices.length > 0) {
            for (const [index, service] of memberServices.entries()) {
              try {
                await servicePricingSchema.parseAsync(service)
              } catch (serviceError) {
                if (serviceError instanceof z.ZodError) {
                  const errorMessages = serviceError.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
                  toast.error(`Service ${index + 1} validation error: ${errorMessages}`)
                  return
                }
              }
            }
          }
          break
      }
      
      // If validation passes, move to next step
      setCurrentStep(prev => Math.min(prev + 1, 3))
      
    } catch (error) {
      console.error('Validation error:', error)
      toast.error("Please fix all form errors before proceeding")
    }
  }

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const onSubmitFinal = async () => {
    try {
      // Final validation of all forms using React Hook Form trigger
      const basicValid = await basicForm.trigger()
      const professionalValid = await professionalForm.trigger()
      const settingsValid = await settingsForm.trigger()

      if (!basicValid) {
        showFormValidationErrors(basicForm, "Basic Information")
        setCurrentStep(0) // Go back to the step with errors
        return
      }

      if (!professionalValid) {
        showFormValidationErrors(professionalForm, "Professional Information")
        setCurrentStep(1) // Go back to the step with errors
        return
      }

      if (!settingsValid) {
        showFormValidationErrors(settingsForm, "Settings")
        setCurrentStep(2) // Go back to the step with errors
        return
      }

      const basicData = basicForm.getValues()
      const professionalData = professionalForm.getValues()
      const settingsData = settingsForm.getValues()

      // Validate service pricing if any
      if (memberServices.length > 0) {
        for (const service of memberServices) {
          await servicePricingSchema.parseAsync(service)
        }
      }

      const teamMemberData = {
        ...basicData,
        ...professionalData,
        ...settingsData,
        hourly_rate_cents: professionalData.hourly_rate_cents ? Math.round(professionalData.hourly_rate_cents * 100) : undefined,
        hire_date: basicData.hire_date || undefined
      }

      let teamMemberId: number

      if (editingMember) {
        try {
          await API.put(`/team-members/${editingMember.id}`, teamMemberData)
          teamMemberId = editingMember.id
          toast.success("Team member updated successfully")
        } catch (updateError) {
          console.error('Update error:', updateError)
          throw new Error(`Failed to update team member: ${getErrorMessage(updateError)}`)
        }
      } else {
        try {
          const response = await API.post('/team-members', teamMemberData)
          const createdMember = response?.data?.data || response?.data
          
          if (!createdMember?.id) {
            throw new Error('Invalid response: Team member ID not found')
          }
          
          teamMemberId = createdMember.id
          toast.success("Team member created successfully")
        } catch (createError) {
          console.error('Create error:', createError)
          throw new Error(`Failed to create team member: ${getErrorMessage(createError)}`)
        }
      }

      // Handle service pricing
      if (memberServices.length > 0) {
        const servicePricingErrors: string[] = []
        
        for (const serviceData of memberServices) {
          try {
            const pricingData = {
              ...serviceData,
              team_member_id: teamMemberId,
              price_cents: Math.round(serviceData.price_cents * 100),
              effective_until: serviceData.effective_until || null
            }

            await API.post('/service-pricing', pricingData)
          } catch (pricingError) {
            console.error('Service pricing error:', pricingError)
            servicePricingErrors.push(`Service ${serviceData.service_id}: ${getErrorMessage(pricingError)}`)
          }
        }
        
        if (servicePricingErrors.length > 0) {
          toast.error(`Service pricing errors:\n${servicePricingErrors.join('\n')}`)
        }
      }

      handleCloseDialog()
      await fetchTeamMembers()
      
    } catch (error: any) {
      console.error('Form submission error:', error)
      
      if (error instanceof z.ZodError) {
        // Handle validation errors
        const errorMessages = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join('\n')
        toast.error(`Validation failed:\n${errorMessages}`)
      } else if (error.response) {
        // Handle API response errors
        const apiError = error.response.data
        if (apiError?.message) {
          toast.error(`API Error: ${apiError.message}`)
        } else if (apiError?.errors) {
          // Handle validation errors from backend
          const backendErrors = Array.isArray(apiError.errors) 
            ? apiError.errors.join('\n')
            : Object.entries(apiError.errors).map(([field, msg]) => `${field}: ${msg}`).join('\n')
          toast.error(`Validation Error:\n${backendErrors}`)
        } else {
          toast.error(`Server Error (${error.response.status}): ${error.response.statusText}`)
        }
      } else if (error.request) {
        // Handle network errors
        toast.error("Network error: Please check your internet connection and try again")
      } else {
        // Handle other errors
        toast.error(error.message || "An unexpected error occurred")
      }
    }
  }

  // Specialty management
  const addSpecialty = async () => {
    const trimmedSpecialty = newSpecialty.trim()
    
    if (!trimmedSpecialty) {
      toast.error("Please enter a specialty")
      return
    }
    
    if (trimmedSpecialty.length > 50) {
      toast.error("Specialty name must be less than 50 characters")
      return
    }
    
    const currentSpecialties = professionalForm.getValues().specialties || []
    
    if (currentSpecialties.length >= 10) {
      toast.error("Maximum 10 specialties allowed")
      return
    }
    
    if (currentSpecialties.includes(trimmedSpecialty)) {
      toast.error("This specialty already exists")
      return
    }
    
    professionalForm.setValue('specialties', [...currentSpecialties, trimmedSpecialty])
    setNewSpecialty("")
    
    // Trigger validation after adding
    await professionalForm.trigger('specialties')
    toast.success("Specialty added successfully")
  }

  const removeSpecialty = async (specialty: string) => {
    const currentSpecialties = professionalForm.getValues().specialties || []
    professionalForm.setValue('specialties', currentSpecialties.filter(s => s !== specialty))
    
    // Trigger validation after removing
    await professionalForm.trigger('specialties')
    toast.success("Specialty removed successfully")
  }

  // Certification management
  const addCertification = async () => {
    const trimmedCertification = newCertification.trim()
    
    if (!trimmedCertification) {
      toast.error("Please enter a certification")
      return
    }
    
    if (trimmedCertification.length > 100) {
      toast.error("Certification name must be less than 100 characters")
      return
    }
    
    const currentCertifications = professionalForm.getValues().certifications || []
    
    if (currentCertifications.length >= 15) {
      toast.error("Maximum 15 certifications allowed")
      return
    }
    
    if (currentCertifications.includes(trimmedCertification)) {
      toast.error("This certification already exists")
      return
    }
    
    professionalForm.setValue('certifications', [...currentCertifications, trimmedCertification])
    setNewCertification("")
    
    // Trigger validation after adding
    await professionalForm.trigger('certifications')
    toast.success("Certification added successfully")
  }

  const removeCertification = async (certification: string) => {
    const currentCertifications = professionalForm.getValues().certifications || []
    professionalForm.setValue('certifications', currentCertifications.filter(c => c !== certification))
    
    // Trigger validation after removing
    await professionalForm.trigger('certifications')
    toast.success("Certification removed successfully")
  }

  // Service pricing management
  const addServicePricing = () => {
    if (memberServices.length >= 20) {
      toast.error("Maximum 20 service pricing entries allowed")
      return
    }
    
    const newService: ServicePricingData = {
      service_id: 0,
      price_cents: 0,
      duration_override: undefined,
      is_available: true,
      special_notes: "",
      effective_from: new Date().toISOString().split('T')[0],
      effective_until: ""
    }
    setMemberServices([...memberServices, newService])
    toast.success("Service pricing entry added")
  }

  const updateServicePricing = (index: number, field: keyof ServicePricingData, value: any) => {
    try {
      // Basic validation for specific fields
      if (field === 'price_cents' && (value < 0 || value > 1000)) {
        toast.error("Price must be between $0 and $1000")
        return
      }
      
      if (field === 'duration_override' && value !== undefined && (value < 1 || value > 1440)) {
        toast.error("Duration must be between 1 and 1440 minutes")
        return
      }
      
      if (field === 'service_id') {
        // Check for duplicate services
        const existingServiceIds = memberServices.map((service, i) => i === index ? 0 : service.service_id)
        if (existingServiceIds.includes(value)) {
          toast.error("This service is already configured")
          return
        }
      }
      
      const updated = [...memberServices]
      updated[index] = { ...updated[index], [field]: value }
      setMemberServices(updated)
      
    } catch {
      toast.error("Invalid value entered")
    }
  }

  const removeServicePricing = (index: number) => {
    setMemberServices(memberServices.filter((_, i) => i !== index))
    toast.success("Service pricing entry removed")
  }

  // Enhanced filtering, sorting, and pagination
  const handleSort = (field: keyof TeamMember) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1) // Reset to first page when sorting
  }

  const getSortIcon = (field: keyof TeamMember) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const filteredAndSortedTeamMembers = React.useMemo(() => {
    // Filter
    const filtered = teamMembers.filter(member => {
      // Search filter
      const matchesSearch = member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           member.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           member.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter
      
      // Role filter
      const matchesRole = roleFilter === 'all' || 
                         (roleFilter === 'owner' && member.is_owner) ||
                         (roleFilter === 'manager' && member.can_manage_bookings && !member.is_owner) ||
                         (roleFilter === 'staff' && !member.is_owner && !member.can_manage_bookings)
      
      // Experience filter
      const matchesExperience = experienceFilter === 'all' ||
                               (experienceFilter === '0-2' && (!member.years_experience || member.years_experience <= 2)) ||
                               (experienceFilter === '3-5' && member.years_experience && member.years_experience >= 3 && member.years_experience <= 5) ||
                               (experienceFilter === '5+' && member.years_experience && member.years_experience > 5)
      
      return matchesSearch && matchesStatus && matchesRole && matchesExperience
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      
      // Handle different data types
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal as string)?.toLowerCase() || ''
      } else if (typeof aVal === 'number') {
        aVal = aVal || 0
        bVal = (bVal as number) || 0
      } else if (Array.isArray(aVal)) {
        aVal = aVal.length
        bVal = (bVal as any[])?.length || 0
      } else {
        aVal = aVal ? 1 : 0
        bVal = bVal ? 1 : 0
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    return filtered
  }, [teamMembers, searchTerm, statusFilter, roleFilter, experienceFilter, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTeamMembers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTeamMembers = filteredAndSortedTeamMembers.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const resetFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setRoleFilter("all")
    setExperienceFilter("all")
    setSortField('first_name')
    setSortDirection('asc')
    setCurrentPage(1)
  }

  if (activeSection !== "team") {
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-col space-y-4 pb-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Members
        </CardTitle>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Button onClick={fetchTeamMembers} variant="outline" size="sm" className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleAddTeamMember} className="w-full sm:w-auto">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Team Member
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Enhanced Filters */}
        <div className="space-y-4 mb-6">
          {/* Search and quick filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search team members by name, email, or specialty..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Button variant="outline" onClick={resetFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
          </div>
          
          {/* Filter dropdowns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={experienceFilter} onValueChange={setExperienceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Experience</SelectItem>
                <SelectItem value="0-2">0-2 years</SelectItem>
                <SelectItem value="3-5">3-5 years</SelectItem>
                <SelectItem value="5+">5+ years</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={itemsPerPage.toString()} onValueChange={(value) => {
              setItemsPerPage(Number(value))
              setCurrentPage(1)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 per page</SelectItem>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Results summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {Math.min(startIndex + 1, filteredAndSortedTeamMembers.length)} to {Math.min(endIndex, filteredAndSortedTeamMembers.length)} of {filteredAndSortedTeamMembers.length} team members
            </span>
            {(searchTerm || statusFilter !== 'all' || roleFilter !== 'all' || experienceFilter !== 'all') && (
              <span className="text-blue-600">
                Filters applied
              </span>
            )}
          </div>
        </div>

        {/* Team Members Table */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('first_name')}>
                    <div className="flex items-center gap-2">
                      Team Member
                      {getSortIcon('first_name')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('email')}>
                    <div className="flex items-center gap-2">
                      Contact
                      {getSortIcon('email')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('specialties')}>
                    <div className="flex items-center gap-2">
                      Specialties
                      {getSortIcon('specialties')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('years_experience')}>
                    <div className="flex items-center gap-2">
                      Experience
                      {getSortIcon('years_experience')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-2">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('is_owner')}>
                    <div className="flex items-center gap-2">
                      Role
                      {getSortIcon('is_owner')}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTeamMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {filteredAndSortedTeamMembers.length === 0 && teamMembers.length > 0
                        ? "No team members match your current filters."
                        : "No team members found. Click \"Add Team Member\" to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTeamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.profile_image_url || undefined} />
                            <AvatarFallback>
                              {getInitials(member.first_name, member.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {member.display_name || `${member.first_name} ${member.last_name}`}
                            </div>
                            {member.bio && (
                              <div className="text-sm text-muted-foreground truncate max-w-xs">
                                {member.bio}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {member.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              {member.email}
                            </div>
                          )}
                          {member.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {member.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.specialties?.slice(0, 2).map((specialty) => (
                            <Badge key={specialty} variant="secondary" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                          {member.specialties && member.specialties.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{member.specialties.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.years_experience ? `${member.years_experience} years` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(member.status)}>
                          {getStatusLabel(member.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {member.is_owner && (
                            <Badge variant="default" className="text-xs">Owner</Badge>
                          )}
                          {member.can_manage_bookings && (
                            <Badge variant="outline" className="text-xs">Manager</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditTeamMember(member)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteTeamMember(member)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && filteredAndSortedTeamMembers.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        )}

        {/* Multi-step Team Member Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="!max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingMember ? "Edit Team Member" : "Add New Team Member"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto">
              <Tabs value={currentStep.toString()} onValueChange={(value) => setCurrentStep(parseInt(value))} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6 h-auto">
                  <TabsTrigger value="0" className="text-xs sm:text-sm whitespace-nowrap px-2 py-3">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-medium">Step 1</span>
                      <span className="hidden sm:inline">Basic Info</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="1" disabled={currentStep < 1} className="text-xs sm:text-sm whitespace-nowrap px-2 py-3">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-medium">Step 2</span>
                      <span className="hidden sm:inline">Professional</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="2" disabled={currentStep < 2} className="text-xs sm:text-sm whitespace-nowrap px-2 py-3">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-medium">Step 3</span>
                      <span className="hidden sm:inline">Settings</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="3" disabled={currentStep < 3} className="text-xs sm:text-sm whitespace-nowrap px-2 py-3">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-medium">Step 4</span>
                      <span className="hidden sm:inline">Services</span>
                    </div>
                  </TabsTrigger>
                </TabsList>

                {/* Step 1: Basic Information */}
                <TabsContent value="0" className="space-y-6">
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                    <p className="text-sm text-muted-foreground">Enter the team member&apos;s personal and contact details.</p>
                  </div>
                  <Form {...basicForm}>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={basicForm.control}
                          name="first_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name *</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={basicForm.control}
                          name="last_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name *</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={basicForm.control}
                        name="display_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Public display name (optional)" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={basicForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={basicForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <div className="phone-input-container">
                                  <PhoneInput
                                    defaultCountry="AU"
                                    international
                                    value={field.value || ""}
                                    onChange={(value) => {
                                      field.onChange(value || "");
                                    }}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                    placeholder="+61 412 123 456"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={basicForm.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bio</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Professional biography" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={basicForm.control}
                        name="hire_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hire Date</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={basicForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {editingMember ? 'Change Login Password (Optional)' : 'Login Password *'}
                            </FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input
                                  {...field}
                                  type="text"
                                  placeholder={editingMember ? "Leave empty to keep current password" : "Enter password or generate"}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    const newPassword = generateRandomPassword()
                                    basicForm.setValue('password', newPassword)
                                    toast.success('Password generated!')
                                  }}
                                >
                                  <Key className="h-4 w-4 mr-2" />
                                  Generate
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    if (field.value) {
                                      navigator.clipboard.writeText(field.value)
                                      toast.success('Password copied to clipboard!')
                                    } else {
                                      toast.error('No password to copy')
                                    }
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                            {editingMember ? (
                              <p className="text-xs text-muted-foreground mt-1">
                                Leave empty to keep the existing password. Enter a new password to update the user account.
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-1">
                                This password will be used to create a user account with role &quot;barber&quot; for this team member.
                              </p>
                            )}
                          </FormItem>
                        )}
                      />
                    </div>
                  </Form>
                </TabsContent>

                {/* Step 2: Professional Details */}
                <TabsContent value="1" className="space-y-6">
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold">Professional Details</h3>
                    <p className="text-sm text-muted-foreground">Add specialties, experience, and professional qualifications.</p>
                  </div>
                  <Form {...professionalForm}>
                    <div className="space-y-6">
                      {/* Specialties */}
                      <div className="space-y-3">
                        <Label>Specialties</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a specialty..."
                            value={newSpecialty}
                            onChange={(e) => setNewSpecialty(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                          />
                          <Button type="button" onClick={addSpecialty} variant="outline">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {professionalForm.watch('specialties')?.map((specialty) => (
                            <Badge key={specialty} variant="secondary" className="cursor-pointer" onClick={() => removeSpecialty(specialty)}>
                              {specialty} ×
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Certifications */}
                      <div className="space-y-3">
                        <Label>Certifications</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a certification..."
                            value={newCertification}
                            onChange={(e) => setNewCertification(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                          />
                          <Button type="button" onClick={addCertification} variant="outline">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {professionalForm.watch('certifications')?.map((cert) => (
                            <Badge key={cert} variant="outline" className="cursor-pointer" onClick={() => removeCertification(cert)}>
                              {cert} ×
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={professionalForm.control}
                          name="years_experience"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Years of Experience</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  min="0"
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={professionalForm.control}
                          name="hourly_rate_cents"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Hourly Rate ($)</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  step="0.01"
                                  min="0"
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Images */}
                      <div className="space-y-4">
                        <FormField
                          control={professionalForm.control}
                          name="profile_image_url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Profile Image</FormLabel>
                              <FormControl>
                                <FormImageUpload
                                  value={field.value}
                                  onChange={field.onChange}
                                  uploadType="profile"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={professionalForm.control}
                          name="gallery_images"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Portfolio Gallery</FormLabel>
                              <FormControl>
                                <FormGalleryUpload
                                  value={field.value}
                                  onChange={field.onChange}
                                  uploadType="portfolio"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </Form>
                </TabsContent>

                {/* Step 3: Settings & Schedule */}
                <TabsContent value="2" className="space-y-6">
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold">Settings & Schedule</h3>
                    <p className="text-sm text-muted-foreground">Configure permissions, working hours, and additional settings.</p>
                  </div>
                  <Form {...settingsForm}>
                    <div className="space-y-6">
                      {/* Status & Permissions */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Status & Permissions</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={settingsForm.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status</FormLabel>
                                <FormControl>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="inactive">Inactive</SelectItem>
                                      <SelectItem value="on_leave">On Leave</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={settingsForm.control}
                            name="display_order"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Display Order</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    min="0"
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="space-y-3">
                          <FormField
                            control={settingsForm.control}
                            name="is_owner"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  Business Owner
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={settingsForm.control}
                            name="can_manage_bookings"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  Can Manage Bookings
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={settingsForm.control}
                            name="is_public"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  Show on Public Website
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Working Hours */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Working Hours</h4>
                        <div className="space-y-2">
                          {DAYS_OF_WEEK.map(day => {
                            const WorkingHoursForDay = () => {
                              const dayValue = useWatch({
                                control: settingsForm.control,
                                name: `working_hours.${day}`
                              })
                              
                              return (
                                <WorkingHoursPicker
                                  value={dayValue}
                                  onChange={(value) => {
                                    const currentHours = settingsForm.getValues().working_hours || {}
                                    const newHours = {
                                      ...currentHours,
                                      [day]: value
                                    }
                                    settingsForm.setValue('working_hours', newHours, { 
                                      shouldDirty: true,
                                      shouldTouch: true,
                                      shouldValidate: true 
                                    })
                                  }}
                                  className="flex-1"
                                />
                              )
                            }
                            
                            return (
                              <div key={day} className="flex items-center gap-3">
                                <div className="w-20 text-sm capitalize">{day}</div>
                                <WorkingHoursForDay />
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Social Links */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Social Media Links</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={settingsForm.control}
                            name="social_links.instagram"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Instagram URL</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="https://instagram.com/username"
                                    type="url"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={settingsForm.control}
                            name="social_links.facebook"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Facebook URL</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="https://facebook.com/username"
                                    type="url"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={settingsForm.control}
                            name="social_links.twitter"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Twitter/X URL</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="https://twitter.com/username"
                                    type="url"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={settingsForm.control}
                            name="social_links.website"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Personal Website</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="https://yourwebsite.com"
                                    type="url"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Emergency Contact */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium">Emergency Contact</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            If providing emergency contact information, name, relationship, and phone are required.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={settingsForm.control}
                            name="emergency_contact.name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Contact Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="John Doe"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={settingsForm.control}
                            name="emergency_contact.relationship"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Relationship</FormLabel>
                                <FormControl>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select relationship" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      <SelectItem value="spouse">Spouse</SelectItem>
                                      <SelectItem value="parent">Parent</SelectItem>
                                      <SelectItem value="sibling">Sibling</SelectItem>
                                      <SelectItem value="child">Child</SelectItem>
                                      <SelectItem value="friend">Friend</SelectItem>
                                      <SelectItem value="partner">Partner</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={settingsForm.control}
                            name="emergency_contact.phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <div className="phone-input-container">
                                    <PhoneInput
                                      defaultCountry="AU"
                                      international
                                      value={field.value || ""}
                                      onChange={(value) => {
                                        field.onChange(value || "");
                                      }}
                                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                      placeholder="+61 412 123 456"
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={settingsForm.control}
                            name="emergency_contact.email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="emergency@contact.com"
                                    type="email"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      <FormField
                        control={settingsForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Admin Notes</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Internal notes about this team member" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </Form>
                </TabsContent>

                {/* Step 4: Services & Pricing */}
                <TabsContent value="3" className="space-y-6">
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold">Services & Pricing</h3>
                    <p className="text-sm text-muted-foreground">Assign services and set custom pricing for this team member.</p>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Service Pricing</h4>
                      <Button type="button" onClick={addServicePricing} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Service
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {memberServices.map((serviceData, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium">Service {index + 1}</h5>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeServicePricing(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Service</Label>
                              <Select 
                                value={serviceData.service_id.toString()} 
                                onValueChange={(value) => updateServicePricing(index, 'service_id', parseInt(value))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select service" />
                                </SelectTrigger>
                                <SelectContent>
                                  {services.map(service => (
                                    <SelectItem key={service.id} value={service.id.toString()}>
                                      {service.name} ({formatPrice(service.base_price_cents)})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>Your Price ($)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={serviceData.price_cents}
                                onChange={(e) => updateServicePricing(index, 'price_cents', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Duration Override (min)</Label>
                              <Input
                                type="number"
                                value={serviceData.duration_override || ""}
                                onChange={(e) => updateServicePricing(index, 'duration_override', e.target.value ? parseInt(e.target.value) : undefined)}
                                placeholder="Leave empty for default"
                              />
                            </div>

                            <div className="flex items-center space-x-2 pt-6">
                              <Checkbox
                                checked={serviceData.is_available}
                                onCheckedChange={(checked) => updateServicePricing(index, 'is_available', checked)}
                              />
                              <Label>Available for booking</Label>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Effective From</Label>
                              <Input
                                type="date"
                                value={serviceData.effective_from}
                                onChange={(e) => updateServicePricing(index, 'effective_from', e.target.value)}
                              />
                            </div>

                            <div>
                              <Label>Effective Until (optional)</Label>
                              <Input
                                type="date"
                                value={serviceData.effective_until}
                                onChange={(e) => updateServicePricing(index, 'effective_until', e.target.value)}
                              />
                            </div>
                          </div>

                          <div>
                            <Label>Special Notes</Label>
                            <Textarea
                              value={serviceData.special_notes}
                              onChange={(e) => updateServicePricing(index, 'special_notes', e.target.value)}
                              placeholder="Any special notes for this service..."
                            />
                          </div>
                        </div>
                      ))}

                      {memberServices.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No services assigned yet. Click &quot;Add Service&quot; to get started.
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Dialog Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 0 ? handleCloseDialog : handlePrevStep}
              >
                {currentStep === 0 ? 'Cancel' : (
                  <>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </>
                )}
              </Button>

              <Button
                type="button"
                onClick={currentStep === 3 ? onSubmitFinal : handleNextStep}
              >
                {currentStep === 3 ? (editingMember ? 'Update Team Member' : 'Create Team Member') : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}