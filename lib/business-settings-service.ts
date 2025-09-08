import apiClient from './api-client';

export interface BusinessSetting {
  id?: number;
  key: string;
  value: any;
  description?: string;
  category: string;
  is_public: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BusinessSettingsByCategory {
  [key: string]: {
    value: any;
    description?: string;
    is_public: boolean;
  };
}

class BusinessSettingsService {
  // Get all business settings (admin only)
  async getAllBusinessSettings(): Promise<BusinessSetting[]> {
    const response = await apiClient.get('/business-settings');
    return response.data.data;
  }

  // Get public business settings (accessible to frontend)
  async getPublicBusinessSettings(): Promise<Record<string, any>> {
    const response = await apiClient.get('/business-settings/public');
    return response.data.data;
  }

  // Get business settings by category (admin only)
  async getBusinessSettingsByCategory(category: string): Promise<BusinessSettingsByCategory> {
    const response = await apiClient.get(`/business-settings/category/${category}`);
    return response.data.data;
  }

  // Get specific business setting by key (admin only)
  async getBusinessSettingByKey(key: string): Promise<BusinessSetting> {
    const response = await apiClient.get(`/business-settings/${key}`);
    return response.data.data;
  }

  // Create or update business setting (admin only)
  async upsertBusinessSetting(setting: {
    key: string;
    value: any;
    description?: string;
    category?: string;
    is_public?: boolean;
  }): Promise<BusinessSetting> {
    const response = await apiClient.post('/business-settings', setting);
    return response.data.data;
  }

  // Delete business setting (admin only)
  async deleteBusinessSetting(key: string): Promise<void> {
    await apiClient.delete(`/business-settings/${key}`);
  }

  // Bulk update business settings (admin only)
  async bulkUpdateBusinessSettings(settings: Array<{
    key: string;
    value: any;
    description?: string;
    category?: string;
    is_public?: boolean;
  }>): Promise<BusinessSetting[]> {
    const response = await apiClient.put('/business-settings/bulk', { settings });
    return response.data.data;
  }
}

export default new BusinessSettingsService();