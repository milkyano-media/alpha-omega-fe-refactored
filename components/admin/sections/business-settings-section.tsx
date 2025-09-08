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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Removed unused Separator import
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { Plus, Edit, Trash2, Save, Settings, Globe, Lock, Building, Clock, Users, CreditCard } from "lucide-react";
import BusinessSettingsService, { BusinessSetting, BusinessSettingsByCategory } from "@/lib/business-settings-service";

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

const COMMON_SETTINGS_BY_CATEGORY = {
  general: [
    { key: 'business_name', label: 'Business Name', type: 'text', description: 'The name of your business' },
    { key: 'business_description', label: 'Business Description', type: 'textarea', description: 'A brief description of your business' },
    { key: 'business_tagline', label: 'Business Tagline', type: 'text', description: 'A catchy tagline for your business' },
    { key: 'timezone', label: 'Timezone', type: 'text', description: 'Business timezone (e.g., Australia/Sydney)' }
  ],
  contact: [
    { key: 'business_phone', label: 'Business Phone', type: 'text', description: 'Main business phone number' },
    { key: 'business_email', label: 'Business Email', type: 'email', description: 'Main business email address' },
    { key: 'business_address', label: 'Business Address', type: 'textarea', description: 'Full business address' },
    { key: 'business_hours', label: 'Business Hours', type: 'json', description: 'Operating hours by day' },
    { key: 'social_media', label: 'Social Media', type: 'json', description: 'Social media links and handles' }
  ],
  booking: [
    { key: 'booking_advance_limit', label: 'Advance Booking Limit (days)', type: 'number', description: 'How far in advance customers can book' },
    { key: 'booking_min_notice', label: 'Minimum Notice (hours)', type: 'number', description: 'Minimum notice required for bookings' },
    { key: 'booking_max_per_day', label: 'Max Bookings Per Day', type: 'number', description: 'Maximum bookings per customer per day' },
    { key: 'deposit_required', label: 'Deposit Required', type: 'boolean', description: 'Whether deposits are required for bookings' },
    { key: 'deposit_percentage', label: 'Deposit Percentage', type: 'number', description: 'Percentage of service price required as deposit' },
    { key: 'cancellation_policy', label: 'Cancellation Policy', type: 'textarea', description: 'Booking cancellation policy' }
  ],
  team: [
    { key: 'max_team_members', label: 'Max Team Members', type: 'number', description: 'Maximum number of team members' },
    { key: 'auto_assign_bookings', label: 'Auto Assign Bookings', type: 'boolean', description: 'Automatically assign bookings to available team members' },
    { key: 'team_member_public_profiles', label: 'Public Team Profiles', type: 'boolean', description: 'Allow team member profiles to be public' }
  ],
  payment: [
    { key: 'currency', label: 'Currency', type: 'text', description: 'Business currency code (e.g., AUD, USD)' },
    { key: 'tax_rate', label: 'Tax Rate (%)', type: 'number', description: 'Tax rate percentage' },
    { key: 'payment_methods', label: 'Payment Methods', type: 'json', description: 'Accepted payment methods' },
    { key: 'refund_policy', label: 'Refund Policy', type: 'textarea', description: 'Refund and return policy' }
  ]
};

export default function BusinessSettingsSection({ activeSection }: BusinessSettingsSectionProps) {
  const [settings, setSettings] = useState<Record<string, BusinessSettingsByCategory>>({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('general');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<BusinessSetting | null>(null);

  // New setting form state
  const [newSetting, setNewSetting] = useState({
    key: '',
    value: '',
    description: '',
    category: 'general',
    is_public: false,
    type: 'text'
  });

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeSection === 'settings') {
      loadSettings();
    }
  }, [activeSection]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const categoryPromises = SETTING_CATEGORIES.map(async (category) => {
        try {
          const categorySettings = await BusinessSettingsService.getBusinessSettingsByCategory(category.key);
          return { category: category.key, settings: categorySettings };
        } catch (error) {
          console.error(`Error loading settings for category ${category.key}:`, error);
          return { category: category.key, settings: {} };
        }
      });

      const results = await Promise.all(categoryPromises);
      const settingsByCategory = results.reduce((acc, { category, settings: categorySettings }) => {
        acc[category] = categorySettings;
        return acc;
      }, {} as Record<string, BusinessSettingsByCategory>);

      setSettings(settingsByCategory);
    } catch (error) {
      console.error('Error loading business settings:', error);
      toast.error(getErrorMessage(error, "Failed to load business settings"));
    } finally {
      setLoading(false);
    }
  };

  // Validation function
  const validateSetting = (setting: typeof newSetting): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    // Key validation
    if (!setting.key.trim()) {
      errors.key = 'Setting key is required';
    } else if (setting.key.length < 2) {
      errors.key = 'Setting key must be at least 2 characters';
    } else if (setting.key.length > 100) {
      errors.key = 'Setting key must be less than 100 characters';
    } else if (!/^[a-z0-9_]+$/.test(setting.key)) {
      errors.key = 'Setting key can only contain lowercase letters, numbers, and underscores';
    }
    
    // Value validation
    if (!setting.value.trim()) {
      errors.value = 'Setting value is required';
    } else {
      // Type-specific validation
      if (setting.type === 'number') {
        const num = parseFloat(setting.value);
        if (isNaN(num)) {
          errors.value = 'Value must be a valid number';
        } else if (num < 0) {
          errors.value = 'Number must be 0 or greater';
        }
      } else if (setting.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(setting.value)) {
          errors.value = 'Value must be a valid email address';
        }
      } else if (setting.type === 'json') {
        try {
          JSON.parse(setting.value);
        } catch {
          errors.value = 'Value must be valid JSON';
        }
      } else if (setting.type === 'text' && setting.value.length > 1000) {
        errors.value = 'Text value must be less than 1000 characters';
      } else if (setting.type === 'textarea' && setting.value.length > 5000) {
        errors.value = 'Textarea value must be less than 5000 characters';
      }
    }
    
    // Description validation
    if (setting.description && setting.description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }
    
    return errors;
  };

  const handleCreateSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const errors = validateSetting(newSetting);
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }
    
    try {
      let processedValue: string | number | boolean | object = newSetting.value;

      // Process value based on type
      if (newSetting.type === 'json') {
        try {
          processedValue = JSON.parse(newSetting.value);
        } catch {
          toast.error("Please enter valid JSON format");
          return;
        }
      } else if (newSetting.type === 'number') {
        processedValue = parseFloat(newSetting.value);
        if (isNaN(processedValue)) {
          toast.error("Please enter a valid number");
          return;
        }
      } else if (newSetting.type === 'boolean') {
        processedValue = newSetting.value === 'true';
      }

      await BusinessSettingsService.upsertBusinessSetting({
        key: newSetting.key,
        value: processedValue,
        description: newSetting.description,
        category: newSetting.category,
        is_public: newSetting.is_public
      });

      toast.success(`Setting "${newSetting.key}" has been created successfully`);

      setIsCreateDialogOpen(false);
      setNewSetting({
        key: '',
        value: '',
        description: '',
        category: 'general',
        is_public: false,
        type: 'text'
      });
      setValidationErrors({});
      loadSettings();
    } catch (error) {
      console.error('Error creating setting:', error);
      toast.error(getErrorMessage(error, "Failed to create setting"));
    }
  };

  const handleEditSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSetting) return;

    try {
      await BusinessSettingsService.upsertBusinessSetting({
        key: editingSetting.key,
        value: editingSetting.value,
        description: editingSetting.description,
        category: editingSetting.category,
        is_public: editingSetting.is_public
      });

      toast.success(`Setting "${editingSetting.key}" has been updated successfully`);

      setIsEditDialogOpen(false);
      setEditingSetting(null);
      loadSettings();
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error(getErrorMessage(error, "Failed to update setting"));
    }
  };

  const handleDeleteSetting = async (key: string) => {
    try {
      await BusinessSettingsService.deleteBusinessSetting(key);
      toast.success(`Setting "${key}" has been deleted successfully`);
      loadSettings();
    } catch (error) {
      console.error('Error deleting setting:', error);
      toast.error(getErrorMessage(error, "Failed to delete setting"));
    }
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const renderSettingValue = (value: any): React.ReactNode => {
    if (typeof value === 'boolean') {
      return <Badge variant={value ? 'default' : 'secondary'}>{value ? 'True' : 'False'}</Badge>;
    }
    if (typeof value === 'object') {
      return <code className="text-sm bg-muted p-1 rounded">{JSON.stringify(value)}</code>;
    }
    if (String(value).length > 50) {
      return <span className="truncate block max-w-xs">{String(value)}</span>;
    }
    return String(value);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Business Settings</h2>
          <p className="text-muted-foreground">Configure your business settings and preferences</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Setting
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreateSetting}>
              <DialogHeader>
                <DialogTitle>Create Business Setting</DialogTitle>
                <DialogDescription>
                  Add a new business setting to configure your application.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="setting-key">Setting Key *</Label>
                  <Input
                    id="setting-key"
                    value={newSetting.key}
                    onChange={(e) => {
                      setNewSetting({ ...newSetting, key: e.target.value });
                      if (validationErrors.key) {
                        setValidationErrors({ ...validationErrors, key: '' });
                      }
                    }}
                    placeholder="e.g., business_name"
                    className={validationErrors.key ? "border-red-500" : ""}
                    required
                  />
                  {validationErrors.key && (
                    <p className="text-sm text-red-500">{validationErrors.key}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setting-category">Category</Label>
                  <Select
                    value={newSetting.category}
                    onValueChange={(value) => setNewSetting({ ...newSetting, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SETTING_CATEGORIES.map((category) => (
                        <SelectItem key={category.key} value={category.key}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setting-type">Value Type</Label>
                  <Select
                    value={newSetting.type}
                    onValueChange={(value) => setNewSetting({ ...newSetting, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="textarea">Textarea</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setting-value">Value *</Label>
                  {newSetting.type === 'textarea' ? (
                    <Textarea
                      id="setting-value"
                      value={newSetting.value}
                      onChange={(e) => {
                        setNewSetting({ ...newSetting, value: e.target.value });
                        if (validationErrors.value) {
                          setValidationErrors({ ...validationErrors, value: '' });
                        }
                      }}
                      placeholder="Enter setting value"
                      className={validationErrors.value ? "border-red-500" : ""}
                      maxLength={5000}
                      required
                    />
                  ) : newSetting.type === 'boolean' ? (
                    <Select
                      value={newSetting.value}
                      onValueChange={(value) => {
                        setNewSetting({ ...newSetting, value });
                        if (validationErrors.value) {
                          setValidationErrors({ ...validationErrors, value: '' });
                        }
                      }}
                    >
                      <SelectTrigger className={validationErrors.value ? "border-red-500" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">True</SelectItem>
                        <SelectItem value="false">False</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="setting-value"
                      type={newSetting.type === 'number' ? 'number' : newSetting.type === 'email' ? 'email' : 'text'}
                      value={newSetting.value}
                      onChange={(e) => {
                        setNewSetting({ ...newSetting, value: e.target.value });
                        if (validationErrors.value) {
                          setValidationErrors({ ...validationErrors, value: '' });
                        }
                      }}
                      placeholder={newSetting.type === 'json' ? '{"key": "value"}' : "Enter setting value"}
                      className={validationErrors.value ? "border-red-500" : ""}
                      maxLength={newSetting.type === 'text' ? 1000 : undefined}
                      required
                    />
                  )}
                  {validationErrors.value && (
                    <p className="text-sm text-red-500">{validationErrors.value}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setting-description">Description</Label>
                  <Textarea
                    id="setting-description"
                    value={newSetting.description}
                    onChange={(e) => {
                      setNewSetting({ ...newSetting, description: e.target.value });
                      if (validationErrors.description) {
                        setValidationErrors({ ...validationErrors, description: '' });
                      }
                    }}
                    placeholder="Describe what this setting does (max 500 characters)"
                    className={validationErrors.description ? "border-red-500" : ""}
                    maxLength={500}
                  />
                  {validationErrors.description && (
                    <p className="text-sm text-red-500">{validationErrors.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="setting-public"
                    checked={newSetting.is_public}
                    onCheckedChange={(checked) => setNewSetting({ ...newSetting, is_public: checked })}
                  />
                  <Label htmlFor="setting-public" className="flex items-center space-x-2">
                    {newSetting.is_public ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    <span>Public Setting</span>
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  setValidationErrors({});
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  Create Setting
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
                {settings[category.key] && Object.keys(settings[category.key]).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(settings[category.key]).map(([key, setting]) => (
                      <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{key}</h4>
                            {setting.is_public ? (
                              <Badge variant="secondary">
                                <Globe className="h-3 w-3 mr-1" />
                                Public
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <Lock className="h-3 w-3 mr-1" />
                                Private
                              </Badge>
                            )}
                          </div>
                          {setting.description && (
                            <p className="text-sm text-muted-foreground mt-1">{setting.description}</p>
                          )}
                          <div className="mt-2">
                            <strong>Value:</strong> {renderSettingValue(setting.value)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingSetting({
                                key,
                                value: setting.value,
                                description: setting.description || '',
                                category: category.key,
                                is_public: setting.is_public
                              });
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSetting(key)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Settings Found</h3>
                    <p className="text-muted-foreground mb-4">
                      No settings configured for {category.label.toLowerCase()} yet.
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Common {category.label.toLowerCase()} settings:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {COMMON_SETTINGS_BY_CATEGORY[category.key as keyof typeof COMMON_SETTINGS_BY_CATEGORY]?.map((commonSetting) => (
                          <Badge key={commonSetting.key} variant="outline" className="text-xs">
                            {commonSetting.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          {editingSetting && (
            <form onSubmit={handleEditSetting}>
              <DialogHeader>
                <DialogTitle>Edit Setting: {editingSetting.key}</DialogTitle>
                <DialogDescription>
                  Update the value and configuration for this setting.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-value">Value</Label>
                  {typeof editingSetting.value === 'object' ? (
                    <Textarea
                      id="edit-value"
                      value={formatValue(editingSetting.value)}
                      onChange={(e) => {
                        try {
                          const parsedValue = JSON.parse(e.target.value);
                          setEditingSetting({ ...editingSetting, value: parsedValue });
                        } catch {
                          setEditingSetting({ ...editingSetting, value: e.target.value });
                        }
                      }}
                      className="font-mono text-sm"
                      rows={5}
                    />
                  ) : typeof editingSetting.value === 'boolean' ? (
                    <Select
                      value={String(editingSetting.value)}
                      onValueChange={(value) => setEditingSetting({ ...editingSetting, value: value === 'true' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">True</SelectItem>
                        <SelectItem value="false">False</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="edit-value"
                      value={String(editingSetting.value)}
                      onChange={(e) => setEditingSetting({ ...editingSetting, value: e.target.value })}
                      required
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingSetting.description}
                    onChange={(e) => setEditingSetting({ ...editingSetting, description: e.target.value })}
                    placeholder="Describe what this setting does"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-public"
                    checked={editingSetting.is_public}
                    onCheckedChange={(checked) => setEditingSetting({ ...editingSetting, is_public: checked })}
                  />
                  <Label htmlFor="edit-public" className="flex items-center space-x-2">
                    {editingSetting.is_public ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    <span>Public Setting</span>
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  Update Setting
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}