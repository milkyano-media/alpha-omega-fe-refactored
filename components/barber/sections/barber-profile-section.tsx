"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { User, Edit, Save, X, Phone, Mail, Briefcase } from "lucide-react"
import { API } from "@/lib/api-client"
import toast from "react-hot-toast"

interface TeamMemberProfile {
  id: number
  first_name: string
  last_name: string
  display_name: string
  email: string
  phone: string
  bio: string
  specialties: string[]
  years_experience: number
  social_links: {
    instagram?: string
    facebook?: string
    twitter?: string
    website?: string
  }
}

interface BarberProfileSectionProps {
  activeSection?: string
  onSectionChange?: (section: string) => void
}

export function BarberProfileSection({ activeSection }: BarberProfileSectionProps) {
  const [profile, setProfile] = useState<TeamMemberProfile | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    display_name: "",
    email: "",
    phone: "",
    bio: "",
    specialties: [] as string[],
    years_experience: 0,
    social_links: {
      instagram: "",
      facebook: "",
      twitter: "",
      website: ""
    }
  })

  useEffect(() => {
    if (activeSection === "profile") {
      fetchProfile()
    }
  }, [activeSection])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await API.get('/team-members/me')
      console.log('Profile response:', response.data)

      const profileData = response.data?.data || response.data

      if (profileData) {
        setProfile(profileData)
        setFormData({
          first_name: profileData.first_name || "",
          last_name: profileData.last_name || "",
          display_name: profileData.display_name || "",
          email: profileData.email || "",
          phone: profileData.phone || "",
          bio: profileData.bio || "",
          specialties: profileData.specialties || [],
          years_experience: profileData.years_experience || 0,
          social_links: profileData.social_links || {
            instagram: "",
            facebook: "",
            twitter: "",
            website: ""
          }
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    try {
      setSaving(true)

      const response = await API.put('/team-members/me', formData)

      if (response.data) {
        toast.success('Profile updated successfully')
        setEditMode(false)
        fetchProfile() // Refresh profile data
      }
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      // Reset form data to original profile
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        display_name: profile.display_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
        specialties: profile.specialties || [],
        years_experience: profile.years_experience || 0,
        social_links: {
          instagram: profile.social_links?.instagram || "",
          facebook: profile.social_links?.facebook || "",
          twitter: profile.social_links?.twitter || "",
          website: profile.social_links?.website || ""
        }
      })
    }
    setEditMode(false)
  }

  if (activeSection !== "profile") {
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            Loading profile...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              My Profile
            </CardTitle>
            {!editMode ? (
              <Button onClick={() => setEditMode(true)} variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleCancel} variant="outline" size="sm" disabled={saving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} size="sm" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    disabled={!editMode}
                    className={!editMode ? 'bg-gray-50' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    disabled={!editMode}
                    className={!editMode ? 'bg-gray-50' : ''}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    disabled={!editMode}
                    className={!editMode ? 'bg-gray-50' : ''}
                    placeholder="How you want to be shown to customers"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="flex gap-2">
                    <Mail className="h-4 w-4 text-gray-400 mt-3" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={!editMode}
                      className={!editMode ? 'bg-gray-50' : ''}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <div className="flex gap-2">
                    <Phone className="h-4 w-4 text-gray-400 mt-3" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!editMode}
                      className={!editMode ? 'bg-gray-50' : ''}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Professional Information
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    disabled={!editMode}
                    className={!editMode ? 'bg-gray-50' : ''}
                    rows={4}
                    placeholder="Tell customers about yourself and your experience..."
                  />
                </div>
                <div>
                  <Label htmlFor="years_experience">Years of Experience</Label>
                  <Input
                    id="years_experience"
                    type="number"
                    value={formData.years_experience}
                    onChange={(e) => setFormData({ ...formData, years_experience: parseInt(e.target.value) || 0 })}
                    disabled={!editMode}
                    className={!editMode ? 'bg-gray-50' : ''}
                  />
                </div>
                <div>
                  <Label>Specialties</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.specialties.length > 0 ? (
                      formData.specialties.map((specialty, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {specialty}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No specialties listed</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Contact admin to update specialties
                  </p>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Social Media</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={formData.social_links.instagram || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      social_links: { ...formData.social_links, instagram: e.target.value }
                    })}
                    disabled={!editMode}
                    className={!editMode ? 'bg-gray-50' : ''}
                    placeholder="https://instagram.com/yourusername"
                  />
                </div>
                <div>
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={formData.social_links.facebook || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      social_links: { ...formData.social_links, facebook: e.target.value }
                    })}
                    disabled={!editMode}
                    className={!editMode ? 'bg-gray-50' : ''}
                    placeholder="https://facebook.com/yourusername"
                  />
                </div>
                <div>
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input
                    id="twitter"
                    value={formData.social_links.twitter || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      social_links: { ...formData.social_links, twitter: e.target.value }
                    })}
                    disabled={!editMode}
                    className={!editMode ? 'bg-gray-50' : ''}
                    placeholder="https://twitter.com/yourusername"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.social_links.website || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      social_links: { ...formData.social_links, website: e.target.value }
                    })}
                    disabled={!editMode}
                    className={!editMode ? 'bg-gray-50' : ''}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
