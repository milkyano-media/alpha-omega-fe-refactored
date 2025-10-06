"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { Save, Settings, Globe, Lock, Building, Clock, Users, CreditCard, Loader2, Plus, X, Clock as ClockIcon, Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import BusinessSettingsService, { BusinessSettingsByCategory } from "@/lib/business-settings-service";
import { API } from "@/lib/api-client";

interface BusinessSettingsSectionProps {
  activeSection: string;
}

const SETTING_CATEGORIES = [
  {
    key: 'general',
    label: 'General',
    icon: Settings,
    description: 'Basic business information and settings'
  },
  {
    key: 'contact',
    label: 'Contact Info',
    icon: Building,
    description: 'Business contact information and location'
  },
  {
    key: 'booking',
    label: 'Booking',
    icon: Clock,
    description: 'Booking rules, limits, and configurations'
  },
  {
    key: 'team',
    label: 'Team',
    icon: Users,
    description: 'Team member and staffing settings'
  },
  {
    key: 'payment',
    label: 'Payment',
    icon: CreditCard,
    description: 'Payment processing and pricing settings'
  }
];

// Predefined settings that users can modify (no dynamic creation allowed)
const PREDEFINED_SETTINGS = {
  general: [
    { key: 'business_name', label: 'Business Name', type: 'text', description: 'The name of your business', is_public: true, defaultValue: 'Alpha Omega Barber Shop', placeholder: 'Enter your business name' },
    { key: 'business_description', label: 'Business Description', type: 'textarea', description: 'A brief description of your business', is_public: true, defaultValue: 'Premium men\'s grooming services', placeholder: 'Describe your business' },
    { key: 'business_tagline', label: 'Business Tagline', type: 'text', description: 'A catchy tagline for your business', is_public: true, defaultValue: 'Where Tradition Meets Style', placeholder: 'Enter your business tagline' },
    { key: 'logo_url', label: 'Desktop Logo', type: 'logo_image', description: 'Business logo for desktop devices (recommended: 200x60px)', is_public: true, defaultValue: '', placeholder: 'Upload desktop logo', logoType: 'desktop_logo' },
    { key: 'mobile_logo_url', label: 'Mobile Logo', type: 'logo_image', description: 'Business logo for mobile devices (recommended: 120x40px)', is_public: true, defaultValue: '', placeholder: 'Upload mobile logo', logoType: 'mobile_logo' },
    { key: 'timezone', label: 'Timezone', type: 'text', description: 'Business timezone (e.g., Australia/Sydney)', is_public: false, defaultValue: 'Australia/Sydney', placeholder: 'Australia/Sydney' }
  ],
  contact: [
    { key: 'business_phone', label: 'Business Phone', type: 'text', description: 'Main business phone number', is_public: true, defaultValue: '+61 2 9876 5432', placeholder: '+61 2 9876 5432' },
    { key: 'business_email', label: 'Business Email', type: 'email', description: 'Main business email address', is_public: true, defaultValue: 'info@alphaomegabarber.com.au', placeholder: 'info@yourbusiness.com' },
    { key: 'business_address', label: 'Business Address', type: 'textarea', description: 'Full business address', is_public: true, defaultValue: '123 Collins Street\nMelbourne VIC 3000', placeholder: 'Enter your full business address' },
    { key: 'business_hours', label: 'Business Hours', type: 'json', description: 'Operating hours by day', is_public: true, defaultValue: '{"monday":"9:00 AM - 7:00 PM","tuesday":"9:00 AM - 7:00 PM","wednesday":"9:00 AM - 7:00 PM","thursday":"9:00 AM - 8:00 PM","friday":"9:00 AM - 8:00 PM","saturday":"8:00 AM - 6:00 PM","sunday":"10:00 AM - 5:00 PM"}', placeholder: 'JSON format for hours' },
    { key: 'social_media', label: 'Social Media', type: 'json', description: 'Social media links and handles', is_public: true, defaultValue: '{"instagram":"@alphaomegabarber","facebook":"facebook.com/alphaomegabarber","tiktok":"@alphaomegacuts"}', placeholder: 'JSON format for social links' }
  ],
  booking: [
    { key: 'booking_advance_limit', label: 'Advance Booking Limit', type: 'number', description: 'How far in advance customers can book (days)', is_public: false, defaultValue: '30', placeholder: '30' },
    { key: 'booking_min_notice', label: 'Minimum Notice', type: 'number', description: 'Minimum notice required for bookings (hours)', is_public: false, defaultValue: '4', placeholder: '4' },
    { key: 'booking_max_per_day', label: 'Max Bookings Per Day', type: 'number', description: 'Maximum bookings per customer per day', is_public: false, defaultValue: '2', placeholder: '2' },
    { key: 'deposit_required', label: 'Deposit Required', type: 'boolean', description: 'Whether deposits are required for bookings', is_public: true, defaultValue: 'true', placeholder: '' },
    { key: 'deposit_percentage', label: 'Deposit Percentage', type: 'number', description: 'Percentage of service price required as deposit', is_public: true, defaultValue: '25', placeholder: '25' },
    { key: 'cancellation_policy', label: 'Cancellation Policy', type: 'textarea', description: 'Booking cancellation policy', is_public: true, defaultValue: 'Cancellations must be made at least 24 hours in advance for full refund.', placeholder: 'Describe your cancellation policy' }
  ],
  team: [
    { key: 'max_team_members', label: 'Max Team Members', type: 'number', description: 'Maximum number of team members', is_public: false, defaultValue: '8', placeholder: '8' },
    { key: 'auto_assign_bookings', label: 'Auto Assign Bookings', type: 'boolean', description: 'Automatically assign bookings to available team members', is_public: false, defaultValue: 'false', placeholder: '' },
    { key: 'team_member_public_profiles', label: 'Public Team Profiles', type: 'boolean', description: 'Allow team member profiles to be public', is_public: false, defaultValue: 'true', placeholder: '' }
  ],
  payment: [
    { key: 'currency', label: 'Currency', type: 'text', description: 'Business currency code (e.g., AUD, USD)', is_public: true, defaultValue: 'AUD', placeholder: 'AUD' },
    { key: 'tax_rate', label: 'Tax Rate', type: 'number', description: 'Tax rate percentage', is_public: false, defaultValue: '10', placeholder: '10' },
    { key: 'payment_methods', label: 'Payment Methods', type: 'json', description: 'Accepted payment methods', is_public: true, defaultValue: '["card","cash","apple_pay","google_pay"]', placeholder: 'JSON array of payment methods' },
    { key: 'refund_policy', label: 'Refund Policy', type: 'textarea', description: 'Refund and return policy', is_public: true, defaultValue: 'Full refunds available within 24 hours of service completion.', placeholder: 'Describe your refund policy' }
  ]
};

export default function BusinessSettingsSection({ activeSection }: BusinessSettingsSectionProps) {
  const [settings, setSettings] = useState<Record<string, BusinessSettingsByCategory>>({});
  const [formValues, setFormValues] = useState<Record<string, Record<string, any>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('general');
  const [uploadingStates, setUploadingStates] = useState<Record<string, boolean>>({});
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeSection === 'settings') {
      loadSettings();
    }
  }, [activeSection]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // Load all defined categories plus the branding category for branding images
      const categoriesToLoad = [...SETTING_CATEGORIES.map(cat => cat.key), 'branding'];
      const categoryPromises = categoriesToLoad.map(async (categoryKey) => {
        try {
          const categorySettings = await BusinessSettingsService.getBusinessSettingsByCategory(categoryKey);
          return { category: categoryKey, settings: categorySettings };
        } catch (error) {
          console.error(`Error loading settings for category ${categoryKey}:`, error);
          return { category: categoryKey, settings: {} };
        }
      });

      const results = await Promise.all(categoryPromises);
      const settingsByCategory = results.reduce((acc, { category, settings: categorySettings }) => {
        acc[category] = categorySettings;
        return acc;
      }, {} as Record<string, BusinessSettingsByCategory>);

      setSettings(settingsByCategory);

      // Initialize form values with current settings or defaults
      const initialFormValues: Record<string, Record<string, any>> = {};
      SETTING_CATEGORIES.forEach(category => {
        initialFormValues[category.key] = {};
        PREDEFINED_SETTINGS[category.key as keyof typeof PREDEFINED_SETTINGS].forEach(setting => {
          const existingSetting = settingsByCategory[category.key]?.[setting.key];

          if (existingSetting) {
            if (setting.type === 'json' && typeof existingSetting.value === 'object') {
              initialFormValues[category.key][setting.key] = JSON.stringify(existingSetting.value, null, 2);
            } else if (setting.type === 'boolean') {
              // Ensure boolean values are properly converted
              initialFormValues[category.key][setting.key] = Boolean(existingSetting.value);
            } else {
              initialFormValues[category.key][setting.key] = existingSetting.value;
            }
          } else {
            // Handle default values properly for different types
            if (setting.type === 'boolean') {
              initialFormValues[category.key][setting.key] = setting.defaultValue === 'true';
            } else {
              initialFormValues[category.key][setting.key] = setting.defaultValue;
            }
          }
        });
      });

      // CRITICAL FIX: Also initialize branding category form values (needed for mobile logo display)
      // The branding category contains mobile_logo_url but wasn't being initialized
      if (settingsByCategory['branding']) {
        initialFormValues['branding'] = {};

        // Initialize form values for all branding settings
        Object.entries(settingsByCategory['branding']).forEach(([key, setting]) => {
          if (setting && typeof setting === 'object' && 'value' in setting) {
            initialFormValues['branding'][key] = setting.value;
            console.log(`🔧 [BRANDING INIT] ${key} = "${setting.value}"`);
          }
        });
      }

      setFormValues(initialFormValues);
    } catch (error) {
      console.error('Error loading business settings:', error);
      toast.error(getErrorMessage(error, "Failed to load business settings"));
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent, category: string) => {
    e.preventDefault();
    setSaving(true);

    try {
      const categorySettings = PREDEFINED_SETTINGS[category as keyof typeof PREDEFINED_SETTINGS];
      const updates = [];

      for (const setting of categorySettings) {
        let processedValue = formValues[category]?.[setting.key];

        // Skip any file uploads during save - they should already be converted to URLs in the upload handler
        if ((setting.type === 'image' || setting.type === 'branding_image' || setting.type === 'logo_image') && processedValue instanceof File) {
          console.warn(`File object found for ${setting.key} during save - this indicates the upload handler didn't process it`);
          toast.error(`${setting.label} upload failed - please try uploading again`);
          setSaving(false);
          return;
        }

        // Handle undefined/null values
        if (processedValue === undefined || processedValue === null) {
          if (setting.type === 'boolean') {
            processedValue = setting.defaultValue === 'true';
          } else {
            processedValue = setting.defaultValue;
          }
        }

        // Process value based on type
        if (setting.type === 'json') {
          try {
            processedValue = typeof processedValue === 'string'
              ? JSON.parse(processedValue)
              : processedValue;
          } catch {
            toast.error(`Invalid JSON format for ${setting.label}`);
            setSaving(false);
            return;
          }
        } else if (setting.type === 'number') {
          processedValue = parseFloat(String(processedValue));
          if (isNaN(processedValue)) {
            toast.error(`Invalid number format for ${setting.label}`);
            setSaving(false);
            return;
          }
        } else if (setting.type === 'boolean') {
          processedValue = Boolean(processedValue);
        }

        // For branding images, save to 'branding' category with underscore-based key (backend validation requires lowercase, numbers, underscores only)
        if (setting.type === 'branding_image' && 'brandingType' in setting) {
          const brandingKey = `branding_${setting.brandingType}_url`;
          console.log(`[SAVE DEBUG] Branding image: setting.key=${setting.key}, brandingType=${setting.brandingType}, generated key=${brandingKey}`);

          // Validate key format before adding to updates (backend requires ^[a-z0-9_]+$)
          if (!/^[a-z0-9_]+$/.test(brandingKey)) {
            console.warn(`⚠️ Skipping invalid branding key: ${brandingKey} (contains invalid characters)`);
          } else {
            updates.push({
              key: brandingKey,
              value: processedValue,
              description: setting.description,
              category: 'branding',
              is_public: setting.is_public
            });
          }
        } else if (setting.type === 'logo_image') {
          // Logo images are uploaded directly to business settings by the API, so we don't need to include them in bulk save
          // The upload handler already saved them to the database
          console.log(`[SAVE DEBUG] Skipping logo image ${setting.key} - already saved by upload API`);
        } else {
          // Special debugging for mobile logo
          if (setting.key === 'mobile_logo_url') {
            console.log(`🔍 [MOBILE LOGO DEBUG] Processing mobile_logo_url:`);
            console.log(`  - Original form value: ${formValues[category]?.[setting.key]}`);
            console.log(`  - Processed value: ${processedValue}`);
            console.log(`  - Category: ${category}`);
          }

          // Validate key format before adding to updates (backend requires ^[a-z0-9_]+$)
          if (!/^[a-z0-9_]+$/.test(setting.key)) {
            console.warn(`⚠️ Skipping invalid key: ${setting.key} (contains invalid characters)`);
          } else {
            updates.push({
              key: setting.key,
              value: processedValue,
              description: setting.description,
              category: category,
              is_public: setting.is_public
            });
          }
        }
      }

      // Debug: Log what we're sending
      console.log('Bulk update payload:', updates);

      // Bulk update all settings for this category
      await BusinessSettingsService.bulkUpdateBusinessSettings(updates);

      // Delete image files that were marked for deletion
      const deletePromises: Promise<void>[] = [];
      categorySettings.forEach(setting => {
        if (setting.type === 'branding_image' || setting.type === 'image') {
          const uploadKey = `${category}-${setting.key}`;
          const urlToDelete = uploadedImages[`${uploadKey}-to-delete`];

          if (urlToDelete && urlToDelete.includes('/uploads/')) {
            const deletePromise = (async () => {
              try {
                // Extract filename from URL
                const urlParts = urlToDelete.split('/');
                const filename = urlParts[urlParts.length - 1];
                const type = urlToDelete.includes('/branding/') ? 'branding' : 'profile';

                await API.delete(`/images/${filename}?type=${type}`);
                console.log(`Successfully deleted image file: ${filename}`);
              } catch (error) {
                console.warn(`Could not delete image file from server:`, error);
                // Don't fail the save operation if file deletion fails
              }
            })();
            deletePromises.push(deletePromise);
          }
        }
      });

      // Wait for all file deletions to complete (but don't fail if they error)
      if (deletePromises.length > 0) {
        await Promise.allSettled(deletePromises);
      }

      // Clear uploaded images state after successful save
      setUploadedImages(prev => {
        const newState = { ...prev };
        categorySettings.forEach(setting => {
          if (setting.type === 'branding_image' || setting.type === 'image') {
            const uploadKey = `${category}-${setting.key}`;
            delete newState[uploadKey];
            delete newState[`${uploadKey}-to-delete`]; // Also clear deletion markers
          }
        });
        return newState;
      });

      toast.success(`${SETTING_CATEGORIES.find(cat => cat.key === category)?.label} settings saved successfully`);
      loadSettings(); // Reload to get updated values
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(getErrorMessage(error, "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (category: string, key: string, value: any) => {
    setFormValues(prev => {
      const updated = {
        ...prev,
        [category]: {
          ...prev[category],
          [key]: value
        }
      };

      // Debug mobile logo changes
      if (key === 'mobile_logo_url') {
        console.log(`🔍 [FORM STATE] Updated mobile_logo_url to: "${value}"`);
        console.log(`🔍 [FORM STATE] Full general category after update:`, updated[category]);
      }

      return updated;
    });
  };

  // Helper components for special JSON fields
  const renderBusinessHoursField = (category: string, setting: any) => {
    const currentValue = formValues[category]?.[setting.key] || setting.defaultValue;
    let hoursData: Record<string, string> = {};

    try {
      hoursData = typeof currentValue === 'string' ? JSON.parse(currentValue) : currentValue;
    } catch {
      hoursData = {
        monday: "9:00 AM - 7:00 PM",
        tuesday: "9:00 AM - 7:00 PM",
        wednesday: "9:00 AM - 7:00 PM",
        thursday: "9:00 AM - 8:00 PM",
        friday: "9:00 AM - 8:00 PM",
        saturday: "8:00 AM - 6:00 PM",
        sunday: "10:00 AM - 5:00 PM"
      };
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const handleHourChange = (day: string, value: string) => {
      const newHours = { ...hoursData, [day]: value };
      handleInputChange(category, setting.key, JSON.stringify(newHours));
    };

    return (
      <div key={setting.key} className="space-y-4">
        <div>
          <Label className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            {setting.label}
            {setting.is_public ? (
              <Badge variant="secondary" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                Public
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Private
              </Badge>
            )}
          </Label>
          <p className="text-sm text-muted-foreground">{setting.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg bg-gray-50/50">
          {days.map((day) => (
            <div key={day} className="flex items-center gap-3">
              <Label className="w-20 text-sm capitalize font-medium">
                {day}
              </Label>
              <Input
                value={hoursData[day] || ""}
                onChange={(e) => handleHourChange(day, e.target.value)}
                placeholder="9:00 AM - 5:00 PM"
                className="flex-1"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSocialMediaField = (category: string, setting: any) => {
    const currentValue = formValues[category]?.[setting.key] || setting.defaultValue;
    let socialData: Record<string, string> = {};

    try {
      socialData = typeof currentValue === 'string' ? JSON.parse(currentValue) : currentValue;
    } catch {
      socialData = {};
    }

    const socialPlatforms = [
      { key: 'instagram', label: 'Instagram', placeholder: '@yourbusiness' },
      { key: 'facebook', label: 'Facebook', placeholder: 'facebook.com/yourbusiness' },
      { key: 'tiktok', label: 'TikTok', placeholder: '@yourbusiness' },
      { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/yourbusiness' },
      { key: 'twitter', label: 'Twitter/X', placeholder: '@yourbusiness' },
      { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/company/yourbusiness' }
    ];

    const handleSocialChange = (platform: string, value: string) => {
      const newSocial = { ...socialData };
      if (value.trim()) {
        newSocial[platform] = value;
      } else {
        delete newSocial[platform];
      }
      handleInputChange(category, setting.key, JSON.stringify(newSocial));
    };

    return (
      <div key={setting.key} className="space-y-4">
        <div>
          <Label className="flex items-center gap-2">
            {setting.label}
            {setting.is_public ? (
              <Badge variant="secondary" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                Public
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Private
              </Badge>
            )}
          </Label>
          <p className="text-sm text-muted-foreground">{setting.description}</p>
        </div>

        <div className="space-y-3 p-4 border rounded-lg bg-gray-50/50">
          {socialPlatforms.map((platform) => (
            <div key={platform.key} className="flex items-center gap-3">
              <Label className="w-20 text-sm font-medium">
                {platform.label}
              </Label>
              <Input
                value={socialData[platform.key] || ""}
                onChange={(e) => handleSocialChange(platform.key, e.target.value)}
                placeholder={platform.placeholder}
                className="flex-1"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPaymentMethodsField = (category: string, setting: any) => {
    const currentValue = formValues[category]?.[setting.key] || setting.defaultValue;
    let methodsArray: string[] = [];

    try {
      methodsArray = typeof currentValue === 'string' ? JSON.parse(currentValue) : currentValue;
      if (!Array.isArray(methodsArray)) {
        methodsArray = [];
      }
    } catch {
      methodsArray = [];
    }

    const availablePaymentMethods = [
      { key: 'card', label: 'Credit/Debit Card', description: 'Visa, Mastercard, Amex' },
      { key: 'cash', label: 'Cash', description: 'Cash payments' },
      { key: 'apple_pay', label: 'Apple Pay', description: 'Apple Pay digital wallet' },
      { key: 'google_pay', label: 'Google Pay', description: 'Google Pay digital wallet' },
      { key: 'paypal', label: 'PayPal', description: 'PayPal payments' },
      { key: 'bank_transfer', label: 'Bank Transfer', description: 'Direct bank transfers' },
      { key: 'eftpos', label: 'EFTPOS', description: 'Australian EFTPOS' }
    ];

    const handlePaymentMethodToggle = (method: string, checked: boolean) => {
      let newMethods = [...methodsArray];
      if (checked) {
        if (!newMethods.includes(method)) {
          newMethods.push(method);
        }
      } else {
        newMethods = newMethods.filter(m => m !== method);
      }
      handleInputChange(category, setting.key, JSON.stringify(newMethods));
    };

    return (
      <div key={setting.key} className="space-y-4">
        <div>
          <Label className="flex items-center gap-2">
            {setting.label}
            {setting.is_public ? (
              <Badge variant="secondary" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                Public
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Private
              </Badge>
            )}
          </Label>
          <p className="text-sm text-muted-foreground">{setting.description}</p>
        </div>

        <div className="space-y-3 p-4 border rounded-lg bg-gray-50/50">
          {availablePaymentMethods.map((method) => (
            <div key={method.key} className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="font-medium">{method.label}</Label>
                <p className="text-sm text-muted-foreground">{method.description}</p>
              </div>
              <Switch
                checked={methodsArray.includes(method.key)}
                onCheckedChange={(checked) => handlePaymentMethodToggle(method.key, checked)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderImageUploadField = (category: string, setting: any) => {
    const uploadKey = `${category}-${setting.key}`;

    // Check if we have a recently uploaded image for this field
    const uploadedImageUrl = uploadedImages[uploadKey];

    // Get current value from form or from saved settings
    const savedValue = formValues[category]?.[setting.key] || settings[category]?.[setting.key]?.value || setting.defaultValue;
    const rawValue = uploadedImageUrl || savedValue;

    // Debug logging for mobile logo
    if (setting.key === 'mobile_logo_url') {
      console.log(`🔍 [MOBILE LOGO] Display Debug:`, {
        category,
        key: setting.key,
        formValue: formValues[category]?.[setting.key],
        settingValue: settings[category]?.[setting.key]?.value,
        settingExists: !!settings[category]?.[setting.key],
        defaultValue: setting.defaultValue,
        uploadedImageUrl,
        savedValue,
        rawValue,
        brandingCategory: settings['branding'],
        allFormValues: formValues
      });
    }

    // Convert relative URLs to absolute URLs pointing to the backend
    const currentValue = rawValue && rawValue.startsWith('/')
      ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001'}${rawValue}`
      : rawValue;

    const fieldId = `${category}-${setting.key}`;
    const uploading = uploadingStates[uploadKey] || false;

    const setUploading = (state: boolean) => {
      setUploadingStates(prev => ({
        ...prev,
        [uploadKey]: state
      }));
    };

    const handleRegularImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image file must be less than 5MB');
        return;
      }
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append('profile_image', file);

        const response = await API.post('/images/profile', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        console.log('Profile upload response:', response.data);

        // Handle different possible response structures
        let imageUrl = null;
        if (response.data?.data?.url) {
          imageUrl = response.data.data.url;
        } else if (response.data?.url) {
          imageUrl = response.data.url;
        } else if (response.data?.imageUrl) {
          imageUrl = response.data.imageUrl;
        } else if (response.data?.data?.imageUrl) {
          imageUrl = response.data.data.imageUrl;
        }

        if (imageUrl) {
          // Always convert to relative URL for consistent storage
          const relativeImageUrl = imageUrl.startsWith('http')
            ? new URL(imageUrl).pathname
            : imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;

          const fullImageUrl = relativeImageUrl.startsWith('/')
            ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001'}${relativeImageUrl}`
            : relativeImageUrl;

          // Store the full URL for immediate preview
          setUploadedImages(prev => ({
            ...prev,
            [uploadKey]: fullImageUrl
          }));

          // Store the RELATIVE URL in form values for saving to business settings later (for consistency with branding images)
          console.log(`🔍 [MOBILE LOGO UPLOAD] Setting form value: ${category}.${setting.key} = "${relativeImageUrl}"`);
          handleInputChange(category, setting.key, relativeImageUrl);

          toast.success(`${setting.label} uploaded - click Save to apply`);
        } else {
          console.error('Upload response structure:', response.data);
          throw new Error('Upload failed: No URL found in response');
        }
      } catch (error) {
        console.error('Upload failed:', error);
        toast.error(getErrorMessage(error, 'Failed to upload image'));
      } finally {
        setUploading(false);
      }
    };

    const handleRemoveImage = () => {
      // Store the URL that will be deleted when saving
      if (currentValue && currentValue.includes('/uploads/')) {
        // Store the URL to be deleted later during save
        setUploadedImages(prev => ({
          ...prev,
          [`${uploadKey}-to-delete`]: currentValue
        }));
      }

      // Clear the uploaded image preview
      setUploadedImages(prev => {
        const newState = { ...prev };
        delete newState[uploadKey];
        return newState;
      });

      // Clear the form value
      handleInputChange(category, setting.key, '');

      toast.success(`${setting.label} removed - click Save to apply`);
    };

    return (
      <div key={setting.key} className="space-y-3">
        <div>
          <Label htmlFor={fieldId} className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            {setting.label}
            {setting.is_public ? (
              <Badge variant="secondary" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                Public
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Private
              </Badge>
            )}
          </Label>
          <p className="text-sm text-muted-foreground">{setting.description}</p>
        </div>

        <div className="space-y-3">
          {/* Current Image Preview */}
          {currentValue && (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50/50">
              <div className="flex-shrink-0">
                <img
                  src={currentValue}
                  alt={setting.label}
                  className="h-12 w-auto max-w-[120px] object-contain rounded border"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Current {setting.label}</p>
                <p className="text-xs text-muted-foreground truncate">{currentValue}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRemoveImage}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex items-center gap-3">
            <Input
              id={fieldId}
              type="file"
              accept="image/*"
              onChange={handleRegularImageUpload}
              disabled={uploading}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById(fieldId)?.click()}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {currentValue ? `Replace ${setting.label}` : `Upload ${setting.label}`}
                </>
              )}
            </Button>
          </div>

          {/* Upload Guidelines */}
          <div className="text-xs text-muted-foreground">
            <p>• Supported formats: PNG, JPG, JPEG, WebP</p>
            <p>• Maximum file size: 5MB</p>
            <p>• {setting.description.includes('desktop') ? 'Recommended size: 200x60px' : 'Recommended size: 120x40px'}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderLogoImageField = (category: string, setting: any) => {
    const uploadKey = `${category}-${setting.key}`;
    const logoType = setting.logoType; // 'desktop_logo' or 'mobile_logo'

    // Check if we have a recently uploaded image for this field
    const uploadedImageUrl = uploadedImages[uploadKey];

    // Get current value from form or from saved settings
    const savedValue = formValues[category]?.[setting.key] || settings[category]?.[setting.key]?.value || setting.defaultValue;
    const rawValue = uploadedImageUrl || savedValue;

    // Convert relative URLs to absolute URLs pointing to the backend
    const currentValue = rawValue && rawValue.startsWith('/')
      ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001'}${rawValue}`
      : rawValue;

    const fieldId = `${category}-${setting.key}`;
    const uploading = uploadingStates[uploadKey] || false;

    const setUploading = (state: boolean) => {
      setUploadingStates(prev => ({
        ...prev,
        [uploadKey]: state
      }));
    };

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image file must be less than 5MB');
        return;
      }
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append('profile_image', file);
        formData.append('type', logoType);

        console.log(`🔍 [LOGO UPLOAD] Uploading ${setting.label} with type: ${logoType}`);

        const response = await API.post('/images/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        console.log('Logo upload response:', response.data);
        console.log('Logo upload full response structure:', {
          status: response.status,
          data: response.data,
          dataKeys: Object.keys(response.data || {}),
          hasData: !!response.data?.data,
          hasDirectUrl: !!response.data?.url,
          dataType: typeof response.data?.data
        });

        // Handle different possible response structures
        let imageUrl = null;
        if (response.data?.data?.url) {
          imageUrl = response.data.data.url;
          console.log('📍 Found imageUrl in response.data.data.url:', imageUrl);
        } else if (response.data?.url) {
          imageUrl = response.data.url;
          console.log('📍 Found imageUrl in response.data.url:', imageUrl);
        } else if (response.data?.data && typeof response.data.data === 'object' && response.data.data.url) {
          imageUrl = response.data.data.url;
          console.log('📍 Found imageUrl in response.data.data.url (nested object):', imageUrl);
        }

        if (imageUrl) {
          // Convert to relative URL for consistent storage
          const relativeImageUrl = imageUrl.startsWith('http')
            ? new URL(imageUrl).pathname
            : imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;

          const fullImageUrl = relativeImageUrl.startsWith('/')
            ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001'}${relativeImageUrl}`
            : relativeImageUrl;

          // Store the full URL for immediate preview
          setUploadedImages(prev => ({
            ...prev,
            [uploadKey]: fullImageUrl
          }));

          // Store the RELATIVE URL in form values for saving to business settings later
          console.log(`🔍 [LOGO UPLOAD] Setting form value: ${category}.${setting.key} = "${relativeImageUrl}"`);
          handleInputChange(category, setting.key, relativeImageUrl);

          toast.success(`${setting.label} uploaded and saved successfully!`);
        } else {
          console.error('Upload response structure:', response.data);
          throw new Error('Upload failed: No URL found in response');
        }
      } catch (error) {
        console.error('Logo upload failed:', error);
        toast.error(getErrorMessage(error, 'Failed to upload logo'));
      } finally {
        setUploading(false);
      }
    };

    const handleRemoveImage = async () => {
      try {
        // Since logo images are saved immediately to the database, we need to clear the database value
        console.log(`🔍 [LOGO REMOVE] Removing ${setting.label} (${logoType})`);

        // Call the logo API to clear the database value
        const response = await API.delete(`/images/logo?type=${logoType}`);

        console.log('Logo remove response:', response.data);

        // Clear the UI state
        setUploadedImages(prev => {
          const { [uploadKey]: removed, ...rest } = prev;
          return rest;
        });
        handleInputChange(category, setting.key, '');

        toast.success(`${setting.label} removed successfully!`);
      } catch (error) {
        console.error('Logo remove failed:', error);
        toast.error(getErrorMessage(error, 'Failed to remove logo'));
      }
    };

    return (
      <div key={setting.key} className="space-y-2">
        <Label htmlFor={fieldId} className="flex items-center gap-2">
          {setting.label}
          {setting.is_public ? (
            <Badge variant="secondary" className="text-xs">
              <Globe className="h-3 w-3 mr-1" />
              Public
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              <Lock className="h-3 w-3 mr-1" />
              Private
            </Badge>
          )}
        </Label>
        <p className="text-sm text-muted-foreground">{setting.description}</p>

        <div className="space-y-4">
          {/* Image Preview */}
          {currentValue && (
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
              <img
                src={currentValue}
                alt={setting.label}
                className="w-16 h-16 object-contain rounded"
                onError={() => {
                  console.warn(`Failed to load image: ${currentValue}`);
                  setUploadedImages(prev => {
                    const { [uploadKey]: removed, ...rest } = prev;
                    return rest;
                  });
                }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{setting.label}</p>
                <p className="text-xs text-muted-foreground">{setting.description}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveImage}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => document.getElementById(fieldId)?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {currentValue ? 'Replace' : 'Upload'} {setting.label}
                </>
              )}
            </Button>
            <input
              id={fieldId}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              disabled={uploading}
            />
          </div>

          {/* Upload Guidelines */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Supported formats: JPEG, PNG, GIF, WebP</p>
            <p>• Maximum file size: 5MB</p>
            <p>• {setting.description.includes('desktop') ? 'Recommended size: 200x60px' : 'Recommended size: 120x40px'}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderBrandingImageField = (category: string, setting: any) => {
    // For branding images, we need to check multiple possible key formats:
    // 1. Upload endpoint saves with: "branding.brandingType_url" (dot format)
    // 2. Business settings saves with: "branding_brandingType_url" (underscore format)
    // 3. Legacy format: just "brandingType_url"
    const backendKey = `${setting.brandingType}_url`;
    const dotFormatKey = `branding.${backendKey}`; // Format used by image upload endpoint
    const underscoreFormatKey = `branding_${backendKey}`; // Format used by business settings (validation compliant)
    const uploadKey = `${category}-${setting.key}`;

    // Check if we have a recently uploaded image for this field
    const uploadedImageUrl = uploadedImages[uploadKey];

    // Check if this image is marked for deletion
    const markedForDeletion = uploadedImages[`${uploadKey}-to-delete`];

    // Get current value from form or from saved settings
    // Try all possible key formats to ensure we find the logo
    const formValue = formValues[category]?.[setting.key];
    const backendValue = settings['branding']?.[backendKey]?.value;
    const dotFormatValue = settings['branding']?.[dotFormatKey]?.value;
    const underscoreFormatValue = settings['branding']?.[underscoreFormatKey]?.value;
    const savedValue = formValue || backendValue || dotFormatValue || underscoreFormatValue || setting.defaultValue;
    const rawValue = markedForDeletion ? '' : (uploadedImageUrl || savedValue);

    console.log(`[BRANDING DEBUG] ${setting.key}:`, {
      markedForDeletion,
      uploadedImageUrl,
      formValue,
      backendKey,
      backendValue,
      dotFormatKey,
      dotFormatValue,
      underscoreFormatKey,
      underscoreFormatValue,
      savedValue,
      rawValue,
      brandingSettings: settings['branding']
    });

    // Convert relative URLs to absolute URLs pointing to the backend
    const currentValue = rawValue && rawValue.startsWith('/')
      ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001'}${rawValue}`
      : rawValue;

    const fieldId = `${category}-${setting.key}`;
    const uploading = uploadingStates[uploadKey] || false;


    const setUploading = (state: boolean) => {
      setUploadingStates(prev => ({
        ...prev,
        [uploadKey]: state
      }));
    };

    const handleBrandingImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image file must be less than 5MB');
        return;
      }
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append('branding_image', file);
        formData.append('type', setting.brandingType);

        const response = await API.post('/images/branding', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data?.imageUrl) {
          const imageUrl = response.data.imageUrl;
          const fullImageUrl = imageUrl.startsWith('/')
            ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001'}${imageUrl}`
            : imageUrl;

          // Store the uploaded image URL for immediate preview
          setUploadedImages(prev => ({
            ...prev,
            [uploadKey]: fullImageUrl
          }));

          // Store the URL (not file) in form values for preview and saving
          handleInputChange(category, setting.key, fullImageUrl);

          toast.success(`${setting.label} uploaded - click Save to apply`);
        } else {
          console.error('Upload response:', response.data);
          throw new Error(`Upload failed: ${response.data?.message || 'No imageUrl returned'}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(getErrorMessage(error, 'Failed to upload branding image'));
      } finally {
        setUploading(false);
      }
    };

    const handleRemoveImage = () => {
      // Store the URL that will be deleted when saving
      if (currentValue && currentValue.includes('/uploads/')) {
        // Store the URL to be deleted later during save
        setUploadedImages(prev => ({
          ...prev,
          [`${uploadKey}-to-delete`]: currentValue
        }));
      }

      // Clear the uploaded image preview
      setUploadedImages(prev => {
        const newState = { ...prev };
        delete newState[uploadKey];
        return newState;
      });

      // Clear the form value
      handleInputChange(category, setting.key, '');

      toast.success(`${setting.label} removed - click Save to apply`);
    };

    return (
      <div key={setting.key} className="space-y-3">
        <div>
          <Label htmlFor={fieldId} className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            {setting.label}
            {setting.is_public ? (
              <Badge variant="secondary" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                Public
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Private
              </Badge>
            )}
          </Label>
          <p className="text-sm text-muted-foreground">{setting.description}</p>
        </div>

        <div className="space-y-3">
          {/* Current Image Preview */}
          {currentValue && (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50/50">
              <div className="flex-shrink-0">
                <img
                  src={currentValue}
                  alt={setting.label}
                  className="h-12 w-auto max-w-[120px] object-contain rounded border"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Current {setting.label}</p>
                <p className="text-xs text-muted-foreground truncate">{currentValue}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRemoveImage}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex gap-2">
            <input
              id={fieldId}
              type="file"
              accept="image/*"
              onChange={handleBrandingImageUpload}
              disabled={uploading}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById(fieldId)?.click()}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {currentValue ? `Replace ${setting.label}` : `Upload ${setting.label}`}
                </>
              )}
            </Button>
          </div>

          {/* Upload Guidelines */}
          <div className="text-xs text-muted-foreground">
            <p>• Supported formats: PNG, JPG, JPEG, WebP</p>
            <p>• Maximum file size: 5MB</p>
            <p>• Recommended size: 200x60px</p>
          </div>
        </div>
      </div>
    );
  };

  const renderFormField = (category: string, setting: any) => {
    // Fix fallback logic for boolean values
    let currentValue = formValues[category]?.[setting.key];
    if (currentValue === undefined || currentValue === null) {
      if (setting.type === 'boolean') {
        currentValue = setting.defaultValue === 'true';
      } else {
        currentValue = setting.defaultValue;
      }
    }

    const fieldId = `${category}-${setting.key}`;

    // Special UI for specific field types
    if (setting.type === 'image') {
        return renderImageUploadField(category, setting);
    }

    if (setting.type === 'branding_image') {
        return renderBrandingImageField(category, setting);
    }

    if (setting.type === 'logo_image') {
        return renderLogoImageField(category, setting);
    }

    if (setting.key === 'business_hours') {
      return renderBusinessHoursField(category, setting);
    }

    if (setting.key === 'social_media') {
      return renderSocialMediaField(category, setting);
    }

    if (setting.key === 'payment_methods') {
      return renderPaymentMethodsField(category, setting);
    }

    if (setting.type === 'boolean') {
      // Get the stored value from form state
      const storedValue = formValues[category]?.[setting.key];

      // Determine if switch should be checked
      let isChecked = false;
      if (storedValue !== undefined && storedValue !== null) {
        isChecked = Boolean(storedValue);
      } else {
        isChecked = setting.defaultValue === 'true' || setting.defaultValue === true;
      }


      return (
        <div key={setting.key} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor={fieldId} className="flex items-center gap-2">
                {setting.label}
                {setting.is_public ? (
                  <Badge variant="secondary" className="text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    Public
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Private
                  </Badge>
                )}
              </Label>
              <p className="text-sm text-muted-foreground">{setting.description}</p>
            </div>
            <Switch
              id={fieldId}
              checked={isChecked}
              onCheckedChange={(checked) => handleInputChange(category, setting.key, checked)}
            />
          </div>
        </div>
      );
    }

    if (setting.type === 'textarea') {
      return (
        <div key={setting.key} className="space-y-2">
          <Label htmlFor={fieldId} className="flex items-center gap-2">
            {setting.label}
            {setting.is_public ? (
              <Badge variant="secondary" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                Public
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Private
              </Badge>
            )}
          </Label>
          <p className="text-sm text-muted-foreground">{setting.description}</p>
          <Textarea
            id={fieldId}
            value={currentValue}
            onChange={(e) => handleInputChange(category, setting.key, e.target.value)}
            placeholder={setting.placeholder}
            rows={3}
          />
        </div>
      );
    }

    // Fallback for other JSON fields (show as formatted JSON)
    if (setting.type === 'json') {
      return (
        <div key={setting.key} className="space-y-2">
          <Label htmlFor={fieldId} className="flex items-center gap-2">
            {setting.label}
            {setting.is_public ? (
              <Badge variant="secondary" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                Public
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Private
              </Badge>
            )}
          </Label>
          <p className="text-sm text-muted-foreground">{setting.description}</p>
          <Textarea
            id={fieldId}
            value={currentValue}
            onChange={(e) => handleInputChange(category, setting.key, e.target.value)}
            placeholder={setting.placeholder}
            className="font-mono text-sm"
            rows={4}
          />
        </div>
      );
    }

    return (
      <div key={setting.key} className="space-y-2">
        <Label htmlFor={fieldId} className="flex items-center gap-2">
          {setting.label}
          {setting.is_public ? (
            <Badge variant="secondary" className="text-xs">
              <Globe className="h-3 w-3 mr-1" />
              Public
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              <Lock className="h-3 w-3 mr-1" />
              Private
            </Badge>
          )}
        </Label>
        <p className="text-sm text-muted-foreground">{setting.description}</p>
        <Input
          id={fieldId}
          type={setting.type === 'number' ? 'number' : setting.type === 'email' ? 'email' : 'text'}
          value={currentValue}
          onChange={(e) => handleInputChange(category, setting.key, e.target.value)}
          placeholder={setting.placeholder}
        />
      </div>
    );
  };

  if (activeSection !== 'settings') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Business Settings</h2>
        <p className="text-muted-foreground">Configure your business settings and preferences</p>
      </div>

      {/* Settings Categories */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid w-full grid-cols-5">
          {SETTING_CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger key={category.key} value={category.key} className="flex items-center space-x-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{category.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {SETTING_CATEGORIES.map((category) => (
          <TabsContent key={category.key} value={category.key} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <category.icon className="h-5 w-5" />
                  <span>{category.label} Settings</span>
                </CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => handleFormSubmit(e, category.key)} className="space-y-6">
                  {PREDEFINED_SETTINGS[category.key as keyof typeof PREDEFINED_SETTINGS].map((setting) =>
                    renderFormField(category.key, setting)
                  )}

                  <div className="flex justify-end pt-4 border-t">
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save {category.label} Settings
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}