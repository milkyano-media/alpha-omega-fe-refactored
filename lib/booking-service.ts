// lib/booking-service.ts
import { API } from './api-client';

// Self-managed booking interfaces (no Square dependencies)
export interface SelfManagedBookingRequest {
  service_id: number;
  team_member_id: number;
  start_at: string;
  customer_note?: string;
  deposit_paid_cents?: number;
  payment_status?: 'unpaid' | 'deposit_paid' | 'fully_paid';
  payment_data?: any;
  booking_source?: 'website' | 'admin' | 'phone' | 'walk_in';
  idempotencyKey: string;
}

export interface SelfManagedAppointmentSegment {
  service_id: number;
  team_member_id: number;
  duration_minutes: number;
  start_at: string;
}

export interface SelfManagedSegmentBookingRequest {
  start_at: string;
  appointment_segments: SelfManagedAppointmentSegment[];
  customer_note?: string;
  idempotencyKey: string;
  payment_info?: {
    paymentId: string;
    amount: string;
    currency: string;
    receiptUrl?: string;
  };
}

export interface AvailabilitySearchRequest {
  start_date: string;
  end_date: string;
  service_id: number;
  team_member_ids?: number[];
  timezone?: string;
}

export interface AvailabilitySlot {
  startAt: string;
  durationMinutes: number;
}

export interface TeamMemberAvailability {
  startAt: string;
  endAt: string;
  teamMemberId: string;
  teamMemberName: string;
  availabilities: AvailabilitySlot[];
}

export interface SelfManagedAvailabilityResponse {
  availability: TeamMemberAvailability[];
}

export interface UpdateBookingRequest {
  start_at: string;
  version: number;
}

// Updated interfaces (removed Square dependencies)
export interface TeamMember {
  id: number;
  first_name: string;
  last_name: string;
  status: string;
  email_address?: string;
  is_owner?: boolean;
  profile_image_url?: string;
  specialties?: string[];
  square_up_id?: string;
  phone_number?: string;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  price_amount: number;
  price_currency: string;
  duration: number;
  duration_minutes?: number; // Some APIs return this instead of duration
  variation_name?: string;
  is_available?: boolean;
  base_price_cents?: number; // Alternative price field
  // Many-to-many relationship with TeamMembers
  teamMembers?: TeamMember[];
}

// Updated TimeSlot interface (compatible with existing UI)
export interface TimeSlot {
  start_at: string;
  location_id: string;
  formatted_time?: string;
  appointment_segments: {
    duration_minutes: number;
    service_id: number;
    team_member_id: string;
    service_variation_version: number;
  }[];
}

export interface AvailabilityResponse {
  availabilities_by_date: Record<string, TimeSlot[]>;
  errors: any[];
}

export interface BookingResponse {
  data: {
    id: number;
    service_name: string;
    start_at: string;
    end_at: string;
    status: string;
  };
  status_code: number;
  message: string;
}

export interface SingleBookingResponse {
  success: boolean;
  booking?: BookingResponse;
  error?: string;
}

export class BookingService {
  /**
   * Get all services
   */
  async getAllServices(): Promise<Service[]> {
    try {
      const response = await API.get('/services');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching services:', error);
      throw new Error(error.message || "Failed to fetch services");
    }
  }

  /**
   * Get services for a specific team member
   */
  async getServicesByTeamMember(teamMemberId: number): Promise<Service[]> {
    try {
      const response = await API.get(`/services/team-member/${teamMemberId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching services for team member:', error);
      throw new Error(error.message || "Failed to fetch services");
    }
  }

  /**
   * Get team members who offer a specific service
   */
  async getBarbersForService(serviceId: number): Promise<TeamMember[]> {
    try {
      const response = await API.get(`/services/${serviceId}/barbers`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching barbers for service:', error);
      throw new Error(error.message || "Failed to fetch barbers");
    }
  }

  /**
   * Get all team members
   */
  async getTeamMembers(): Promise<TeamMember[]> {
    try {
      const response = await API.get('/team-members');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching team members:', error);
      throw new Error(error.message || "Failed to fetch team members");
    }
  }

  /**
   * Search for available time slots using self-managed system
   */
  async searchAvailability(
    serviceIdOrRequest: number | AvailabilitySearchRequest,
    startDate?: Date,
    endDate?: Date,
    teamMemberIds?: number[]
  ): Promise<AvailabilityResponse> {
    // Handle both calling patterns
    let searchRequest: AvailabilitySearchRequest;

    if (typeof serviceIdOrRequest === 'object') {
      // Called with object parameter
      searchRequest = serviceIdOrRequest;
    } else {
      // Called with individual parameters
      searchRequest = {
        service_id: serviceIdOrRequest,
        start_date: startDate ? startDate.toISOString() : new Date().toISOString(),
        end_date: endDate ? endDate.toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        team_member_ids: teamMemberIds,
        timezone: 'Australia/Melbourne'
      };
    }
    try {
      console.log('🔍 Searching self-managed availability with:', searchRequest);

      // Convert searchRequest to query params for GET request
      const params = new URLSearchParams();

      // Add required parameters with null checks
      if (searchRequest.start_date) {
        params.append('start_date', searchRequest.start_date.split('T')[0]);
      } else {
        params.append('start_date', new Date().toISOString().split('T')[0]);
      }

      if (searchRequest.end_date) {
        params.append('end_date', searchRequest.end_date.split('T')[0]);
      } else {
        params.append('end_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      }

      if (searchRequest.service_id !== undefined && searchRequest.service_id !== null) {
        params.append('service_id', searchRequest.service_id.toString());
      }

      if (searchRequest.timezone) {
        params.append('timezone', searchRequest.timezone);
      }

      if (searchRequest.team_member_ids && searchRequest.team_member_ids.length > 0) {
        params.append('team_member_ids', searchRequest.team_member_ids.join(','));
      }

      console.log('📡 Making API call with params:', params.toString());

      const response = await API.get(`/availability/search?${params.toString()}`);

      console.log('✅ Self-managed availability response:', response.data);

      // Check if data is nested or direct
      if (response.data && response.data.data && response.data.data.availability) {
        // Convert from self-managed format to existing UI-compatible format
        return this.convertSelfManagedToSquareFormat(response.data.data, searchRequest.service_id);
      } else if (response.data && response.data.availability) {
        // Convert from self-managed format to existing UI-compatible format (if not nested)
        return this.convertSelfManagedToSquareFormat(response.data, searchRequest.service_id);
      } else {
        // Already in expected format
        return response.data;
      }
    } catch (error: any) {
      console.error('Error searching self-managed availability:', error);
      throw new Error(error.message || "Failed to search availability");
    }
  }

  /**
   * Convert self-managed availability format to UI-compatible format
   * This ensures existing DateTimeSelector component continues to work
   */
  convertSelfManagedToSquareFormat(selfManagedResponse: SelfManagedAvailabilityResponse, serviceId: number): AvailabilityResponse {
    const availabilities_by_date: Record<string, TimeSlot[]> = {};

    console.log('🔄 Converting self-managed availability:', selfManagedResponse);

    if (selfManagedResponse?.availability) {
      selfManagedResponse.availability.forEach((teamMemberAvail: TeamMemberAvailability) => {
        const { startAt: date, teamMemberId, teamMemberName, availabilities } = teamMemberAvail;

        // Convert date to YYYY-MM-DD format for grouping (preserve timezone)
        // Use the date as-is from backend without timezone conversion
        const dateKey = date.split('T')[0];

        if (!availabilities_by_date[dateKey]) {
          availabilities_by_date[dateKey] = [];
        }

        availabilities.forEach((slot: AvailabilitySlot) => {
          // Convert to UI-compatible TimeSlot format
          const timeSlot: TimeSlot = {
            start_at: slot.startAt,
            location_id: 'alpha-omega-barber-shop', // Self-managed location ID
            formatted_time: new Date(slot.startAt).toLocaleTimeString('en-AU', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'Australia/Melbourne'
            }),
            appointment_segments: [{
              duration_minutes: slot.durationMinutes,
              service_id: serviceId, // Use the correct service ID passed as parameter
              team_member_id: teamMemberId,
              service_variation_version: 1
            }]
          };

          // Check if this time slot already exists to avoid duplicates
          const existingSlot = availabilities_by_date[dateKey].find(
            (existing: TimeSlot) => existing.start_at === timeSlot.start_at
          );

          if (!existingSlot) {
            availabilities_by_date[dateKey].push(timeSlot);
          }
        });
      });
    }

    const result = { availabilities_by_date, errors: [] };
    console.log('✅ Converted to UI format:', result);
    console.log('🔍 Date keys created:', Object.keys(availabilities_by_date));
    console.log('🔍 Sample availability data:', availabilities_by_date);
    return result;
  }

  /**
   * Create single booking with multiple appointment segments (self-managed)
   */
  async createBookingWithSegments(bookingData: SelfManagedSegmentBookingRequest): Promise<SingleBookingResponse> {
    try {
      console.log('📝 Creating self-managed booking with segments:', bookingData);
      const response = await API.post('/bookings/self-managed/segments', bookingData);

      console.log('✅ Self-managed booking created:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating self-managed booking:', error);
      throw new Error(error.message || "Failed to create booking");
    }
  }

  /**
   * Create booking without payment (for testing and non-payment bookings)
   */
  async createBookingWithoutPayment(bookingData: SelfManagedBookingRequest): Promise<BookingResponse> {
    try {
      console.log('📝 Creating booking without payment:', bookingData);
      const response = await API.post('/bookings', {
        ...bookingData,
        payment_status: 'unpaid',
        booking_source: 'website'
      });

      console.log('✅ Booking created without payment:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating booking without payment:', error);
      throw new Error(error.message || "Failed to create booking");
    }
  }

  /**
   * Cancel a self-managed booking
   */
  async cancelSelfManagedBooking(bookingId: number, reason?: string): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(`🗑️ Cancelling self-managed booking ${bookingId}...`);
      const response = await API.post(`/bookings/${bookingId}/cancel-self-managed`, {
        reason: reason || 'Cancelled by customer'
      });

      console.log('✅ Booking cancelled:', response.data);
      return { success: true, ...response.data };
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to cancel booking'
      };
    }
  }

  /**
   * Update booking
   */
  async updateBooking(bookingId: number, updateData: UpdateBookingRequest): Promise<BookingResponse> {
    try {
      const response = await API.put(`/bookings/${bookingId}`, updateData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating booking:', error);
      throw new Error(error.message || "Failed to update booking");
    }
  }

  /**
   * Get booking details
   */
  async getBooking(bookingId: number): Promise<BookingResponse> {
    try {
      const response = await API.get(`/bookings/${bookingId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching booking:', error);
      throw new Error(error.message || "Failed to fetch booking");
    }
  }

  /**
   * Delete booking
   */
  async deleteBooking(bookingId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await API.delete(`/bookings/${bookingId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting booking:', error);
      throw new Error(error.message || "Failed to delete booking");
    }
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(): Promise<any[]> {
    try {
      const response = await API.get('/bookings/user');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching user bookings:', error);
      throw new Error(error.message || "Failed to fetch bookings");
    }
  }
}

// Export default instance
export default new BookingService();