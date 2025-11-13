'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { VerificationGuard } from '@/components/verification-guard';
import BookingService from '@/lib/booking-service';

interface BookingData {
  id: number;
  booking_reference: string;
  user_id: number;
  team_member_id: number;
  service_name: string;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  price_cents: number;
  deposit_paid_cents: number;
  status: string;
  customer_note?: string;
  payment_status?: string;
  booking_data?: {
    appointmentSegments?: Array<{
      service_name: string;
      team_member_name: string;
      duration_minutes: number;
      price_cents: number;
    }>;
  };
  user?: {
    id: number;
    name: string;
    email: string;
    phone_number: string;
  };
  team_member?: {
    id: number;
    name: string;
    phone?: string;
  };
}

export default function ThankYou() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [barberPhone, setBarberPhone] = useState<string | null>(null);
  const [barberPhoneError, setBarberPhoneError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Get the booking details from localStorage
    const lastBookingStr = localStorage.getItem('lastBooking');
    if (lastBookingStr) {
      try {
        const booking = JSON.parse(lastBookingStr) as BookingData;
        setBookingData(booking);
        console.log('📋 Loaded booking data:', booking);

        // Check if phone is already in booking data (optimization)
        if (booking.team_member?.phone) {
          console.log('✅ Barber phone already available in booking data');
          setBarberPhone(booking.team_member.phone);
        } else if (booking.team_member?.id) {
          // Fetch barber details to get phone number (fallback)
          console.log('🔄 Barber phone not in booking data, fetching from API...');
          fetchBarberPhone(booking.team_member.id);
        }
      } catch (err) {
        console.error('Error parsing booking details:', err);
      }
    }

    setLoading(false);

    // Clean up localStorage on unmount
    return () => {
      localStorage.removeItem('lastBooking');
    };
  }, [isAuthenticated, router]);

  const fetchBarberPhone = async (teamMemberId: number) => {
    try {
      console.log('🔍 Fetching team members to get barber phone...');
      setBarberPhoneError(null); // Clear any previous errors

      const barbers = await BookingService.getTeamMembers();
      console.log('📋 Total barbers fetched:', barbers.length);

      const barber = barbers.find((b) => b.id === teamMemberId);
      console.log('👤 Found barber:', barber ? `${barber.first_name} ${barber.last_name}` : 'NOT FOUND');

      if (barber) {
        console.log('📞 Barber phone_number field:', barber.phone_number);
        if (barber.phone_number) {
          setBarberPhone(barber.phone_number);
          console.log('✅ Barber phone set successfully');
        } else {
          console.warn('⚠️ Barber found but phone_number field is empty');
          setBarberPhoneError('Contact information not available for this barber. Please call our shop directly.');
        }
      } else {
        console.warn('⚠️ Barber not found with ID:', teamMemberId);
        setBarberPhoneError('Unable to load barber contact information.');
      }
    } catch (error) {
      console.error('❌ Failed to fetch barber phone:', error);
      setBarberPhoneError('Failed to load contact information. Please try again later.');
    }
  };

  const handleWhatsAppClick = () => {
    if (!barberPhone || !bookingData) {
      alert('Barber contact information not available');
      return;
    }

    const formattedDate = new Date(bookingData.start_at).toLocaleString(
      'en-AU',
      {
        timeZone: 'Australia/Melbourne',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
    );

    const formattedTime = new Date(bookingData.start_at).toLocaleString(
      'en-AU',
      {
        timeZone: 'Australia/Melbourne',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }
    );

    const message = `Hi ${bookingData.team_member?.name || 'there'}! I have a booking on ${formattedDate} at ${formattedTime} for ${bookingData.service_name}. Booking reference: ${bookingData.booking_reference || bookingData.id}`;

    // Format phone number for WhatsApp (remove spaces, dashes, brackets)
    const cleanPhone = barberPhone.replace(/[\s\-\(\)]/g, '');

    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCancelBooking = () => {
    setShowCancelModal(true);
    setCancelError(null);
  };

  const confirmCancel = async () => {
    if (!bookingData) return;

    try {
      setCancelling(true);
      setCancelError(null);
      const response = await BookingService.cancelSelfManagedBooking(
        bookingData.id,
        'Cancelled by customer via thank you page'
      );

      if (response.success) {
        // Close modal and redirect
        setShowCancelModal(false);
        router.push('/');
      } else {
        setCancelError(response.message || 'Failed to cancel booking. Please contact us.');
      }
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      setCancelError(error.message || 'Failed to cancel booking. Please try again or contact us.');
    } finally {
      setCancelling(false);
    }
  };

  const handleReschedule = async () => {
    if (!bookingData) return;

    try {
      console.log('🔄 Starting reschedule flow for booking:', bookingData.id);

      // Save booking ID for reschedule mode
      localStorage.setItem('rescheduleBookingId', bookingData.id.toString());

      // Save barber ID for appointment page
      if (bookingData.team_member_id) {
        localStorage.setItem('selectedBarberId', bookingData.team_member_id.toString());
        console.log('💾 Saved barber ID:', bookingData.team_member_id);
      }

      // Reconstruct services array for appointment page
      // If multi-service booking, get from appointmentSegments
      if (bookingData.booking_data?.appointmentSegments && bookingData.booking_data.appointmentSegments.length > 0) {
        console.log('📦 Multi-service booking detected');

        // Fetch all services to match by name
        const allServices = await BookingService.getAllServices();
        const selectedServices = bookingData.booking_data.appointmentSegments
          .map(segment => allServices.find(s => s.name === segment.service_name))
          .filter(Boolean); // Remove any undefined matches

        if (selectedServices.length > 0) {
          localStorage.setItem('selectedServices', JSON.stringify(selectedServices));
          console.log('💾 Saved services:', selectedServices.map(s => s?.name));
        }
      } else {
        // Single service booking - fetch service by name
        console.log('📦 Single service booking:', bookingData.service_name);
        const allServices = await BookingService.getAllServices();
        const service = allServices.find(s => s.name === bookingData.service_name);

        if (service) {
          localStorage.setItem('selectedServices', JSON.stringify([service]));
          console.log('💾 Saved service:', service.name);
        }
      }

      // Redirect to appointment page to select new time
      console.log('➡️ Redirecting to appointment page');
      router.push('/book/appointment');
    } catch (error) {
      console.error('❌ Error preparing reschedule:', error);
      alert('Failed to initiate reschedule. Please try again.');
    }
  };

  if (loading) {
    return (
      <VerificationGuard requireVerification={true}>
        <main className='flex flex-col gap-20 mt-30'>
          <section className='container mx-auto flex flex-col items-center justify-center text-center py-20 px-4'>
            <div className='text-lg'>Loading...</div>
          </section>
        </main>
      </VerificationGuard>
    );
  }

  if (!bookingData) {
    return (
      <VerificationGuard requireVerification={true}>
        <main className='flex flex-col gap-20 mt-30'>
          <section className='container mx-auto flex flex-col items-center justify-center text-center py-20 px-4'>
            <div className='w-full max-w-md bg-white rounded-lg shadow-lg p-8'>
              <h1 className='text-2xl font-bold mb-4'>No Booking Found</h1>
              <p className='text-gray-600 mb-6'>
                We couldn't find your booking details. Please check your email
                for confirmation.
              </p>
              <Button onClick={() => router.push('/')} className='w-full'>
                Return to Home
              </Button>
            </div>
          </section>
        </main>
      </VerificationGuard>
    );
  }

  const formattedDate = new Date(bookingData.start_at).toLocaleString('en-AU', {
    timeZone: 'Australia/Melbourne',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = new Date(bookingData.start_at).toLocaleString('en-AU', {
    timeZone: 'Australia/Melbourne',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const totalPrice = bookingData.price_cents / 100;
  const depositPaid = bookingData.deposit_paid_cents / 100;
  const balanceDue = totalPrice - depositPaid;

  // Calculate GST breakdown (10% Australian GST)
  // Total price includes GST, so we need to extract it
  const subtotal = totalPrice / 1.10;
  const gst = totalPrice - subtotal;

  const isMultiService = bookingData.booking_data?.appointmentSegments && bookingData.booking_data.appointmentSegments.length > 1;

  return (
    <VerificationGuard requireVerification={true}>
      <main className='flex flex-col gap-20 mt-30'>
        <section className='container mx-auto flex flex-col items-center justify-center text-center py-20 px-4'>
          <div className='w-full max-w-2xl bg-white rounded-lg shadow-lg p-8'>
            {/* Success Icon */}
            <div className='w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='h-10 w-10 text-green-600'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M5 13l4 4L19 7'
                />
              </svg>
            </div>

            <h1 className='text-3xl font-bold mb-4'>Booking Confirmed!</h1>

            <p className='text-lg mb-6'>
              Thank you, {user?.first_name}! Your appointment has been successfully
              booked and confirmed. You will receive a confirmation email shortly.
            </p>

            {/* Booking Details */}
            <div className='mb-6 bg-gray-50 p-6 rounded-lg border border-gray-200 text-left space-y-4'>
              <h2 className='font-bold text-xl mb-4 text-center border-b pb-2'>
                Appointment Details
              </h2>

              {/* Booking Reference */}
              <div className='grid grid-cols-2 gap-2'>
                <p className='text-gray-600 font-medium'>Booking Reference:</p>
                <p className='font-bold text-blue-600'>
                  {bookingData.booking_reference || `#${bookingData.id}`}
                </p>
              </div>

              {/* Barber */}
              <div className='grid grid-cols-2 gap-2'>
                <p className='text-gray-600 font-medium'>Barber:</p>
                <p className='font-semibold'>{bookingData.team_member?.name || 'N/A'}</p>
              </div>

              {/* Service(s) */}
              <div>
                <p className='text-gray-600 font-medium mb-2'>
                  Service{isMultiService ? 's' : ''}:
                </p>
                {isMultiService && bookingData.booking_data?.appointmentSegments ? (
                  <div className='bg-white p-3 rounded border space-y-2'>
                    {bookingData.booking_data.appointmentSegments.map((segment, index) => (
                      <div
                        key={index}
                        className='flex justify-between items-center py-2 border-b last:border-0'
                      >
                        <div>
                          <p className='font-medium'>{segment.service_name}</p>
                          <p className='text-sm text-gray-600'>
                            with {segment.team_member_name} ({segment.duration_minutes} min)
                          </p>
                        </div>
                        <p className='font-semibold'>${(segment.price_cents / 100).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='font-semibold'>{bookingData.service_name}</p>
                )}
              </div>

              {/* Date & Time */}
              <div className='grid grid-cols-2 gap-2'>
                <p className='text-gray-600 font-medium'>Date:</p>
                <p className='font-semibold'>{formattedDate}</p>
              </div>

              <div className='grid grid-cols-2 gap-2'>
                <p className='text-gray-600 font-medium'>Time:</p>
                <p className='font-semibold'>{formattedTime}</p>
              </div>

              <div className='grid grid-cols-2 gap-2'>
                <p className='text-gray-600 font-medium'>Duration:</p>
                <p className='font-semibold'>{bookingData.duration_minutes} minutes</p>
              </div>

              {/* Pricing */}
              <div className='border-t pt-3 space-y-2'>
                <div className='grid grid-cols-2 gap-2'>
                  <p className='text-gray-600'>Subtotal:</p>
                  <p className='font-semibold'>${subtotal.toFixed(2)} AUD</p>
                </div>

                <div className='grid grid-cols-2 gap-2'>
                  <p className='text-gray-600'>GST (10%):</p>
                  <p className='font-semibold'>${gst.toFixed(2)} AUD</p>
                </div>

                <div className='grid grid-cols-2 gap-2 border-t pt-2'>
                  <p className='text-gray-600 font-medium'>Total Price:</p>
                  <p className='font-bold'>${totalPrice.toFixed(2)} AUD</p>
                </div>

                <div className='grid grid-cols-2 gap-2 border-t pt-2'>
                  <p className='text-gray-600'>Deposit Paid:</p>
                  <p className={`font-semibold ${depositPaid > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                    ${depositPaid.toFixed(2)} AUD
                  </p>
                </div>

                <div className='grid grid-cols-2 gap-2'>
                  <p className='text-gray-600'>Balance Due:</p>
                  <p className={`font-bold ${balanceDue > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                    ${balanceDue.toFixed(2)} AUD
                  </p>
                </div>

                <div className='grid grid-cols-2 gap-2 border-t pt-2'>
                  <p className='text-gray-600'>Payment Status:</p>
                  <p className='font-medium capitalize'>
                    {bookingData.payment_status?.replace(/_/g, ' ') || 'Unknown'}
                  </p>
                </div>
              </div>

              {/* Customer Note */}
              {bookingData.customer_note && (
                <div className='border-t pt-3'>
                  <p className='text-gray-600 font-medium mb-1'>Your Notes:</p>
                  <p className='text-sm bg-white p-3 rounded border'>
                    {bookingData.customer_note}
                  </p>
                </div>
              )}

              {/* Location */}
              <div className='border-t pt-3'>
                <p className='text-gray-600 font-medium mb-2'>Location:</p>
                <p className='font-semibold'>Alpha Omega Men's Grooming</p>
                <p className='text-sm text-gray-600 mb-3'>55 Portman St, Oakleigh VIC 3166, Australia</p>

                {/* Google Maps Embed */}
                <div className='w-full h-64 rounded-lg overflow-hidden border border-gray-300'>
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3149.8293752674567!2d144.98789!3d-37.8492257!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6ad669bda829d063%3A0x6d3ec8704124bfc5!2sAlpha%20Omega%20Men's%20Grooming!5e0!3m2!1sen!2sau!4v1234567890"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Alpha Omega Men's Grooming Location"
                  ></iframe>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className='space-y-3 mb-6'>
              {/* WhatsApp Button or Error Message */}
              {barberPhoneError ? (
                <div className='p-4 bg-yellow-50 border border-yellow-200 rounded-lg'>
                  <div className='flex items-start'>
                    <svg
                      className='h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0'
                      xmlns='http://www.w3.org/2000/svg'
                      viewBox='0 0 20 20'
                      fill='currentColor'
                    >
                      <path
                        fillRule='evenodd'
                        d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                        clipRule='evenodd'
                      />
                    </svg>
                    <div>
                      <p className='text-sm font-medium text-yellow-800'>{barberPhoneError}</p>
                      <p className='text-xs text-yellow-700 mt-1'>
                        You can still contact us at: <a href='tel:+61395632211' className='font-semibold underline'>03 9563 2211</a>
                      </p>
                    </div>
                  </div>
                </div>
              ) : barberPhone ? (
                <Button
                  onClick={handleWhatsAppClick}
                  className='w-full bg-green-600 hover:bg-green-700 text-white'
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-5 w-5 mr-2'
                    fill='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path d='M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z' />
                  </svg>
                  Contact {bookingData.team_member?.name || 'Barber'} via WhatsApp
                </Button>
              ) : null}

              {/* Reschedule Button */}
              <Button
                onClick={handleReschedule}
                variant='outline'
                className='w-full border-blue-600 text-blue-600 hover:bg-blue-50'
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-5 w-5 mr-2'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                  />
                </svg>
                Reschedule Appointment
              </Button>

              {/* Cancel Button */}
              <Button
                onClick={handleCancelBooking}
                variant='outline'
                className='w-full border-red-600 text-red-600 hover:bg-red-50'
                disabled={cancelling}
              >
                {cancelling ? (
                  <div className='flex items-center justify-center'>
                    <div className='w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2'></div>
                    Cancelling...
                  </div>
                ) : (
                  <>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      className='h-5 w-5 mr-2'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                    Cancel Booking
                  </>
                )}
              </Button>
            </div>

            {/* Important Information */}
            <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left'>
              <h3 className='font-semibold text-yellow-900 mb-2'>
                ⚠️ Important Information:
              </h3>
              <ul className='text-sm text-yellow-800 space-y-1 list-disc list-inside'>
                <li>Please arrive 10 minutes before your scheduled time</li>
                <li>Cancellations must be made at least 24 hours in advance</li>
                {balanceDue > 0 && (
                  <li>
                    Please pay the remaining balance of ${balanceDue.toFixed(2)} AUD at the
                    barbershop
                  </li>
                )}
                <li>You will receive a confirmation email shortly</li>
              </ul>
            </div>

            {/* Additional Actions */}
            <div className='flex flex-col sm:flex-row gap-3'>
              <Button
                onClick={() => router.push('/book/services')}
                variant='outline'
                className='flex-1'
              >
                Book Another Appointment
              </Button>

              <Button onClick={() => router.push('/')} className='flex-1 bg-gray-900 hover:bg-gray-800'>
                Return to Home
              </Button>
            </div>
          </div>
        </section>

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50'>
            <div className='bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200'>
              {/* Icon */}
              <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                <svg
                  className='w-8 h-8 text-red-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.952-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z'
                  />
                </svg>
              </div>

              {/* Title */}
              <h3 className='text-xl font-bold text-gray-900 text-center mb-2'>
                Cancel Appointment?
              </h3>

              {/* Description */}
              <p className='text-gray-600 text-center mb-4'>
                Are you sure you want to cancel this booking? This action cannot be undone.
              </p>

              {/* Important Notice */}
              <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4'>
                <p className='text-sm text-yellow-800'>
                  <strong>Note:</strong> Cancellations must be made at least 24 hours in advance.
                </p>
              </div>

              {/* Error Message */}
              {cancelError && (
                <div className='bg-red-50 border border-red-200 rounded-lg p-3 mb-4'>
                  <div className='flex items-start'>
                    <svg
                      className='h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0'
                      fill='currentColor'
                      viewBox='0 0 20 20'
                    >
                      <path
                        fillRule='evenodd'
                        d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                        clipRule='evenodd'
                      />
                    </svg>
                    <p className='text-sm text-red-700'>{cancelError}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className='flex gap-3'>
                <Button
                  onClick={() => setShowCancelModal(false)}
                  variant='outline'
                  className='flex-1'
                  disabled={cancelling}
                >
                  Go Back
                </Button>
                <Button
                  onClick={confirmCancel}
                  className='flex-1 bg-red-600 hover:bg-red-700 text-white'
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <div className='flex items-center justify-center'>
                      <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2'></div>
                      Cancelling...
                    </div>
                  ) : (
                    'Yes, Cancel Booking'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </VerificationGuard>
  );
}
