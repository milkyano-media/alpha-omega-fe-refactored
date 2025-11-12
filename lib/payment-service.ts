/**
 * Payment Service
 * Handles all payment-related API calls to the backend
 */

import apiClient from './api-client';

export interface CreatePaymentIntentRequest {
  amount: number; // in cents
  currency?: string;
  metadata?: Record<string, any>;
  paymentMethodId?: string;
}

export interface CreatePaymentIntentResponse {
  paymentIntentId: string;
  clientSecret: string;
  status: string;
  amount: number;
  currency: string;
}

export interface PaymentIntentDetails {
  id: string;
  status: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  receipt_url: string | null;
  charge_id: string | null;
  metadata: Record<string, any>;
}

class PaymentService {
  /**
   * Create a Payment Intent for booking deposit
   */
  static async createPaymentIntent(
    data: CreatePaymentIntentRequest
  ): Promise<CreatePaymentIntentResponse> {
    const response = await apiClient.post('/payments/create-intent', data);
    return response.data.data;
  }

  /**
   * Get Payment Intent details
   */
  static async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentDetails> {
    const response = await apiClient.get(`/payments/${paymentIntentId}`);
    return response.data.data;
  }

  /**
   * Get user's saved payment methods
   */
  static async getSavedPaymentMethods(): Promise<any[]> {
    const response = await apiClient.get('/payments/methods');
    return response.data.data;
  }

  /**
   * Save a payment method for future use
   */
  static async savePaymentMethod(
    paymentMethodId: string,
    setAsDefault: boolean = false
  ): Promise<any> {
    const response = await apiClient.post('/payments/methods', {
      paymentMethodId,
      setAsDefault
    });
    return response.data.data;
  }

  /**
   * Remove a saved payment method
   */
  static async removeSavedPaymentMethod(id: number): Promise<void> {
    await apiClient.delete(`/payments/methods/${id}`);
  }

  /**
   * Get receipt URL for a payment
   */
  static async getReceiptUrl(paymentIntentId: string): Promise<string | null> {
    const response = await apiClient.get(`/payments/${paymentIntentId}/receipt`);
    return response.data.data?.receipt_url || null;
  }
}

export default PaymentService;
